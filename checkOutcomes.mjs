/**
 * checkOutcomes.mjs — 10-Day Outcome Checker (Supabase → Yahoo Finance)
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads every row from filter_stocks (which already has entry, stop_loss,
 * target, date) and checks what actually happened over the next 10 trading
 * days using live Yahoo Finance price data.
 *
 * For each row it reports:
 *   • Entry price, stop_loss, target   — exactly as stored in your DB
 *   • SMA-44 on signal date            — calculated from price history
 *   • Was stop hit? Which day?         — checked on intra-bar low
 *   • Was target hit? Which day?       — checked on intra-bar high
 *   • Which hit first?                 — STOP / TARGET / NEITHER
 *   • Day-10 close + % change          — actual price 10 trading days later
 *   • SMA-44 on day 10                 — still above SMA?
 *   • Final outcome + P&L              — WIN / LOSS / OPEN
 *
 * Run:   node checkOutcomes.mjs
 *
 * No DB writes — console output only.
 */

import { CONFIG } from './config.mjs';
import supabase from './src/database/supaBaseClient.mjs';
import { fetchOHLCV } from './src/stockData/dataFetcher.mjs';

// ─── Strategy constants ───────────────────────────────────────────────────────

const SMA_PERIOD = CONFIG.SMA_PERIOD;      // 44
const EXIT_DAYS  = CONFIG.TIME_EXIT_DAYS;  // 10
const DELAY_MS   = CONFIG.DELAY_BETWEEN_SYMBOLS_MS ?? 3000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep  = ms => new Promise(r => setTimeout(r, ms));
const inr    = v  => v  != null ? `₹${Number(v).toFixed(2)}`                    : 'N/A';
const pctFmt = v  => v  != null ? (v >= 0 ? '+' : '') + Number(v).toFixed(2) + '%' : 'N/A';
const ds     = d  => d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? '').slice(0, 10);
const col    = (s, w) => String(s ?? '—').slice(0, w - 1).padEnd(w);
const colR   = (s, w) => String(s ?? '—').slice(0, w - 1).padStart(w);

const HDR  = '═'.repeat(92);
const SEP  = '─'.repeat(92);
const THIN = '·'.repeat(92);

// ─── SMA ─────────────────────────────────────────────────────────────────────

function buildAlignedSMA(prices, period) {
  if (prices.length < period) return new Array(prices.length).fill(null);
  const result = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i];
  result.push(sum / period);
  for (let i = period; i < prices.length; i++) {
    sum += prices[i] - prices[i - period];
    result.push(sum / period);
  }
  const padding = prices.length - result.length;
  return [...Array(padding).fill(null), ...result];
}

// ─── Supabase fetch ───────────────────────────────────────────────────────────

/**
 * Fetch ALL rows from filter_stocks joined with stock_symbols.
 * Returns array of:
 *   { symbol_id, symbol_name, symbolNS, date, entry, stop_loss, target, ... }
 */
async function loadAllSignals() {
  const pageSize = 1000;
  let signals = [];
  let from = 0;

  // Fetch filter_stocks with all trade columns
  while (true) {
    const { data, error } = await supabase
      .from('filter_stocks')
      .select(`
        id,
        symbol_id,
        date,
        entry,
        stop_loss,
        target,
        open,
        close,
        sma44,
        dist,
        risk_reward,
        status,
        stock_symbols ( symbol_name )
      `)
      .order('date', { ascending: true })
      .order('symbol_id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Supabase error: ${error.message}`);

    signals = signals.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  // Flatten the joined symbol_name
  return signals.map(row => ({
    id          : row.id,
    symbol_id   : row.symbol_id,
    symbol_name : row.stock_symbols?.symbol_name ?? `ID_${row.symbol_id}`,
    symbolNS    : `${row.stock_symbols?.symbol_name ?? row.symbol_id}.NS`,
    date        : row.date,                          // 'YYYY-MM-DD'
    entry       : row.entry   != null ? Number(row.entry)     : null,
    stop_loss   : row.stop_loss != null ? Number(row.stop_loss) : null,
    target      : row.target  != null ? Number(row.target)    : null,
    open        : row.open    != null ? Number(row.open)      : null,
    close       : row.close   != null ? Number(row.close)     : null,
    sma44stored : row.sma44   != null ? Number(row.sma44)     : null,
    dist        : row.dist,
    risk_reward : row.risk_reward,
    status      : row.status,
  }));
}

// ─── Core outcome analysis ────────────────────────────────────────────────────

/**
 * Given OHLCV history and a signal row (with entry/stop_loss/target already set),
 * compute exactly what happened over the next EXIT_DAYS trading days.
 *
 * Uses the STORED entry/stop_loss/target from the DB — not recalculated.
 * SMA-44 is still calculated from price history for the "still in trend?" check.
 */
function analyzeOutcome(ohlcv, signal) {
  const { date: signalDate, entry, stop_loss, target } = signal;

  if (entry == null || stop_loss == null || target == null) {
    return { error: 'Missing entry / stop_loss / target in DB row' };
  }

  const closes = ohlcv.map(c => c.close);
  const sma44  = buildAlignedSMA(closes, SMA_PERIOD);

  // Find the candle that matches the signal date
  let signalIdx = ohlcv.findIndex(c => ds(c.date) === signalDate);

  if (signalIdx === -1) {
    // Weekend / holiday — use the next available trading day
    const targetDate = new Date(signalDate);
    signalIdx = ohlcv.findIndex(c => c.date >= targetDate);
    if (signalIdx === -1) {
      return { error: `Signal date ${signalDate} not found — data may be too recent or sparse.` };
    }
  }

  const entryBar    = ohlcv[signalIdx];
  const smaOnEntry  = sma44[signalIdx];

  // Scan forward EXIT_DAYS bars
  const lastIdx = Math.min(signalIdx + EXIT_DAYS, ohlcv.length - 1);
  const isOpen  = lastIdx < signalIdx + EXIT_DAYS;  // day 10 hasn't arrived yet

  let stopHitIdx = null, stopHitDate = null;
  let tgtHitIdx  = null, tgtHitDate  = null;

  for (let i = signalIdx + 1; i <= lastIdx; i++) {
    const bar = ohlcv[i];

    // Target: checked on intra-bar HIGH
    if (tgtHitIdx === null && bar.high >= target) {
      tgtHitIdx  = i;
      tgtHitDate = bar.date;
    }
    // Stop: checked on intra-bar LOW
    if (stopHitIdx === null && bar.low <= stop_loss) {
      stopHitIdx  = i;
      stopHitDate = bar.date;
    }
  }

  // Which hit first?
  let firstHit = 'NEITHER';
  if (stopHitIdx !== null && tgtHitIdx !== null) {
    firstHit = stopHitIdx <= tgtHitIdx ? 'STOP_FIRST' : 'TARGET_FIRST';
  } else if (stopHitIdx !== null) {
    firstHit = 'STOP_ONLY';
  } else if (tgtHitIdx !== null) {
    firstHit = 'TARGET_ONLY';
  }

  // Day-10 bar
  const day10Bar   = ohlcv[lastIdx];
  const day10Close = day10Bar.close;
  const smaOnDay10 = sma44[lastIdx];
  const day10ChgPct = (day10Close - entry) / entry * 100;

  // Actual exit
  let exitPrice, exitDate, exitReason;
  if (firstHit === 'TARGET_FIRST' || firstHit === 'TARGET_ONLY') {
    exitPrice  = target;
    exitDate   = tgtHitDate;
    exitReason = 'TARGET HIT';
  } else if (firstHit === 'STOP_FIRST' || firstHit === 'STOP_ONLY') {
    exitPrice  = stop_loss;
    exitDate   = stopHitDate;
    exitReason = 'STOP HIT';
  } else {
    exitPrice  = day10Close;
    exitDate   = day10Bar.date;
    exitReason = isOpen ? 'STILL OPEN' : 'TIME EXIT (day 10)';
  }

  const pnlPct = (exitPrice - entry) / entry * 100;

  // Outcome label
  let outcome;
  if (isOpen) {
    outcome = 'OPEN';
  } else if (firstHit === 'TARGET_FIRST' || firstHit === 'TARGET_ONLY') {
    outcome = 'WIN  ✅ (target)';
  } else if (firstHit === 'STOP_FIRST'   || firstHit === 'STOP_ONLY') {
    outcome = 'LOSS ❌ (stop)';
  } else {
    outcome = day10Close > entry ? 'WIN  ✅ (time exit)' : 'LOSS ❌ (time exit)';
  }

  return {
    signalDate,
    entryDate       : ds(entryBar.date),
    entry,
    stop_loss,
    target,
    smaOnEntry      : smaOnEntry  != null ? parseFloat(smaOnEntry.toFixed(2))  : null,
    priceAboveSMAEntry : smaOnEntry != null ? entryBar.close >= smaOnEntry : null,

    stopHit         : stopHitIdx !== null,
    stopHitDay      : stopHitIdx !== null ? stopHitIdx - signalIdx : null,
    stopHitDate     : stopHitDate ? ds(stopHitDate) : null,

    targetHit       : tgtHitIdx !== null,
    targetHitDay    : tgtHitIdx  !== null ? tgtHitIdx - signalIdx  : null,
    targetHitDate   : tgtHitDate  ? ds(tgtHitDate)  : null,

    firstHit,

    day10Date       : ds(day10Bar.date),
    day10Close      : parseFloat(day10Close.toFixed(2)),
    day10ChgPct     : parseFloat(day10ChgPct.toFixed(2)),
    smaOnDay10      : smaOnDay10 != null ? parseFloat(smaOnDay10.toFixed(2)) : null,
    priceAboveSMADay10 : smaOnDay10 != null ? day10Close >= smaOnDay10 : null,

    exitPrice       : parseFloat(exitPrice.toFixed(2)),
    exitDate        : ds(exitDate),
    exitReason,
    pnlPct          : parseFloat(pnlPct.toFixed(2)),
    outcome,
    isOpen,
  };
}

// ─── Per-symbol console printer ───────────────────────────────────────────────

function printDetail(signal, r) {
  const emoji = r.isOpen ? '⏳' : r.outcome.startsWith('WIN') ? '✅' : '❌';

  console.log('\n' + HDR);
  console.log(`  ${emoji}  ${signal.symbol_name}  (${signal.symbolNS})  —  Signal date: ${signal.date}`);
  console.log(HDR);

  const row = (label, val) => console.log(`  ${label.padEnd(28)}: ${val}`);

  // Stored values from DB
  console.log('\n  FROM DATABASE');
  console.log('  ' + THIN);
  row('Entry price (stored)',   inr(signal.entry));
  row('Stop loss (stored)',     inr(signal.stop_loss));
  row('Target (stored)',        inr(signal.target));
  row('Open on signal day',     inr(signal.open));
  row('Close on signal day',    inr(signal.close));
  row('SMA-44 (stored)',        signal.sma44stored != null ? inr(signal.sma44stored) : 'N/A');
  row('Risk / Reward',          signal.risk_reward ?? 'N/A');
  row('Signal status',          signal.status      ?? 'N/A');

  // SMA check on entry
  console.log('\n  SMA-44 CHECK (recalculated)');
  console.log('  ' + THIN);
  row('SMA-44 on entry date',   inr(r.smaOnEntry));
  row('Price ≥ SMA-44',        r.priceAboveSMAEntry != null
    ? (r.priceAboveSMAEntry ? '✅ YES — in uptrend' : '❌ NO — below SMA') : 'N/A');

  // 10-day scan
  console.log('\n  10-DAY WINDOW');
  console.log('  ' + THIN);

  if (r.stopHit) {
    row('🔴 Stop loss hit',      `Day ${r.stopHitDay}  (${r.stopHitDate})  @  ${inr(r.stop_loss)}`);
  } else {
    row('Stop loss hit',         '⬜ Not triggered');
  }

  if (r.targetHit) {
    row('🎯 Target hit',         `Day ${r.targetHitDay}  (${r.targetHitDate})  @  ${inr(r.target)}`);
  } else {
    row('Target hit',            '⬜ Not triggered');
  }

  const firstHitLabel = {
    TARGET_FIRST : '🎯 Target hit first',
    TARGET_ONLY  : '🎯 Target only (stop not hit)',
    STOP_FIRST   : '🔴 Stop hit first',
    STOP_ONLY    : '🔴 Stop only (target not hit)',
    NEITHER      : '— Neither  →  time exit on day 10',
  }[r.firstHit];
  row('Which hit first',         firstHitLabel ?? r.firstHit);

  // Day-10
  console.log('\n  DAY 10');
  console.log('  ' + THIN);
  row('Day-10 date',             r.day10Date + (r.isOpen ? '  ⏳ not reached yet' : ''));
  row('Day-10 close',            inr(r.day10Close));
  row('Day-10 vs entry',         pctFmt(r.day10ChgPct));
  row('SMA-44 on day 10',        inr(r.smaOnDay10));
  row('Price ≥ SMA-44 day 10',  r.priceAboveSMADay10 != null
    ? (r.priceAboveSMADay10 ? '✅ YES — still in uptrend' : '❌ NO — broke below SMA') : 'N/A');

  // Actual exit
  console.log('\n  ACTUAL EXIT');
  console.log('  ' + THIN);
  row('Exit date',               r.exitDate);
  row('Exit price',              inr(r.exitPrice));
  row('Exit reason',             r.exitReason);
  row('P&L %',                   pctFmt(r.pnlPct));

  console.log('\n  ' + SEP);
  console.log(`  OUTCOME : ${r.outcome}   |   P&L : ${pctFmt(r.pnlPct)}   |   Exit : ${r.exitReason}`);
  console.log('  ' + SEP);
}

// ─── Summary table ────────────────────────────────────────────────────────────

function printSummary(rows) {
  console.log('\n' + HDR);
  console.log('  SMA-44 OUTCOME CHECKER — SUMMARY  (all filter_stocks rows)');
  console.log(HDR);

  // Header
  console.log('\n  ' +
    col('Symbol',      14) +
    col('Date',        13) +
    colR('Entry ₹',   10) +
    colR('SL ₹',       9) +
    colR('Tgt ₹',      9) +
    colR('D10 Close',  11) +
    colR('D10 Chg%',  10) +
    col('Stop?',        8) +
    col('Tgt?',         8) +
    col('First Hit',   14) +
    colR('P&L%',        8) +
    'Outcome'
  );
  console.log('  ' + SEP);

  const closed = [];
  const open   = [];
  const errors = [];

  for (const { signal, result: r } of rows) {
    if (r.error) {
      console.log('  ' + col(signal.symbol_name, 14) + col(signal.date, 13) +
        'ERROR: ' + r.error.slice(0, 50));
      errors.push({ signal, r });
      continue;
    }

    const firstHitShort = {
      TARGET_FIRST : '🎯 tgt 1st',
      TARGET_ONLY  : '🎯 tgt only',
      STOP_FIRST   : '🔴 stp 1st',
      STOP_ONLY    : '🔴 stp only',
      NEITHER      : '— neither',
    }[r.firstHit] ?? r.firstHit;

    console.log('  ' +
      col(signal.symbol_name,     14) +
      col(r.signalDate,           13) +
      colR(inr(r.entry),          10) +
      colR(inr(r.stop_loss),       9) +
      colR(inr(r.target),          9) +
      colR(inr(r.day10Close),     11) +
      colR(pctFmt(r.day10ChgPct), 10) +
      col(r.stopHit   ? `✅ d${r.stopHitDay}`  : '—',  8) +
      col(r.targetHit ? `✅ d${r.targetHitDay}` : '—',  8) +
      col(firstHitShort,          14) +
      colR(pctFmt(r.pnlPct),       8) +
      r.outcome
    );

    if (r.isOpen) open.push(r); else closed.push(r);
  }

  // ── Aggregate stats ──────────────────────────────────────────
  if (closed.length > 0) {
    const wins      = closed.filter(r => r.outcome.startsWith('WIN'));
    const losses    = closed.filter(r => r.outcome.startsWith('LOSS'));
    const avgPnl    = closed.reduce((s, r) => s + r.pnlPct,  0) / closed.length;
    const avgWin    = wins.length   ? wins.reduce((s,r)=>s+r.pnlPct,0)   / wins.length   : null;
    const avgLoss   = losses.length ? losses.reduce((s,r)=>s+r.pnlPct,0) / losses.length : null;

    const tgtFirst  = closed.filter(r => r.firstHit==='TARGET_FIRST'||r.firstHit==='TARGET_ONLY').length;
    const stpFirst  = closed.filter(r => r.firstHit==='STOP_FIRST'  ||r.firstHit==='STOP_ONLY'  ).length;
    const timeExit  = closed.filter(r => r.firstHit==='NEITHER').length;

    // Win rate by exit type
    const tgtWins   = closed.filter(r => (r.firstHit==='TARGET_FIRST'||r.firstHit==='TARGET_ONLY') && r.outcome.startsWith('WIN')).length;
    const stpLosses = closed.filter(r => (r.firstHit==='STOP_FIRST'  ||r.firstHit==='STOP_ONLY')   && r.outcome.startsWith('LOSS')).length;
    const timeWins  = closed.filter(r => r.firstHit==='NEITHER' && r.outcome.startsWith('WIN')).length;

    console.log('\n  ' + SEP);
    console.log(`  TOTAL      : ${rows.length}  |  Closed: ${closed.length}  |  Open: ${open.length}  |  Errors: ${errors.length}`);
    console.log(`  WIN RATE   : ${((wins.length/closed.length)*100).toFixed(1)}%  (${wins.length} wins / ${losses.length} losses)`);
    console.log(`  AVG P&L    : ${pctFmt(avgPnl)}   Avg Win: ${pctFmt(avgWin)}   Avg Loss: ${pctFmt(avgLoss)}`);
    console.log(`  ── Exit breakdown ─────────────────────────────────────`);
    console.log(`  Target hit : ${tgtFirst}  (${tgtFirst ? ((tgtWins/tgtFirst)*100).toFixed(0) : 0}% win)`);
    console.log(`  Stop hit   : ${stpFirst}  (${stpFirst ? ((stpLosses/stpFirst)*100).toFixed(0) : 0}% loss)`);
    console.log(`  Time exit  : ${timeExit}  (${timeExit ? ((timeWins/timeExit)*100).toFixed(0) : 0}% win at day-10 close)`);

    // Best and worst
    if (closed.length > 0) {
      const best  = closed.reduce((a, b) => a.pnlPct > b.pnlPct ? a : b);
      const worst = closed.reduce((a, b) => a.pnlPct < b.pnlPct ? a : b);
      console.log(`  ── Best / Worst ───────────────────────────────────────`);
      // Find symbol for best/worst
      const bestRow  = rows.find(row => !row.result.error && row.result === best);
      const worstRow = rows.find(row => !row.result.error && row.result === worst);
      console.log(`  Best  : ${bestRow?.signal.symbol_name ?? '?'}  ${pctFmt(best.pnlPct)}  (${best.exitReason})`);
      console.log(`  Worst : ${worstRow?.signal.symbol_name ?? '?'}  ${pctFmt(worst.pnlPct)}  (${worst.exitReason})`);
    }
  }

  if (open.length > 0) {
    console.log(`\n  ⏳ STILL OPEN (day 10 not yet reached): ${open.length} trade(s)`);
  }

  console.log('\n  Disclaimer: For educational purposes only. Not financial advice.');
  console.log(HDR + '\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + HDR);
  console.log('  SMA-44 OUTCOME CHECKER  —  Supabase filter_stocks → Yahoo Finance');
  console.log(HDR);
  console.log('  Loading signals from Supabase...');

  // 1. Load all signals from DB
  let signals;
  try {
    signals = await loadAllSignals();
  } catch (err) {
    console.error(`\n  ❌ Failed to load from Supabase: ${err.message}`);
    process.exit(1);
  }

  if (signals.length === 0) {
    console.log('  ⚠️  No rows found in filter_stocks. Nothing to check.');
    return;
  }

  // Group by symbol so we fetch OHLCV once per symbol (not once per row)
  // One symbol may appear on multiple signal dates
  const bySymbol = new Map();
  for (const sig of signals) {
    if (!bySymbol.has(sig.symbolNS)) bySymbol.set(sig.symbolNS, []);
    bySymbol.get(sig.symbolNS).push(sig);
  }

  console.log(`  Loaded ${signals.length} signal row(s) across ${bySymbol.size} unique symbol(s).`);
  console.log(`  SMA-${SMA_PERIOD} period  |  Exit window: ${EXIT_DAYS} trading days`);
  console.log(`  Entry / SL / Target: using values stored in DB (not recalculated)`);
  console.log(HDR + '\n');

  const allRows = [];  // { signal, result }
  let symIdx = 0;

  for (const [symbolNS, symSignals] of bySymbol) {
    symIdx++;

    // if (symIdx > 1) {
    //   process.stdout.write(`  ⏳ Waiting ${DELAY_MS / 1000}s (rate limit)...\r`);
    //   await sleep(DELAY_MS);
    //   process.stdout.write(' '.repeat(45) + '\r');
    // }

    process.stdout.write(`  ⏳ Fetching [${symIdx}/${bySymbol.size}] ${symbolNS}...\r`);

    let ohlcv;
    try {
      ohlcv = await fetchOHLCV(symbolNS, 800);
      process.stdout.write(' '.repeat(55) + '\r');
    } catch (err) {
      process.stdout.write(' '.repeat(55) + '\r');
      console.log(`  ✗ ${symbolNS}: ${err.message}`);
      // Record error for all signal rows of this symbol
      for (const sig of symSignals) {
        allRows.push({ signal: sig, result: { error: err.message } });
      }
      continue;
    }

    if (!ohlcv || ohlcv.length < SMA_PERIOD + EXIT_DAYS + 5) {
      const msg = `Insufficient OHLCV data (${ohlcv?.length ?? 0} candles)`;
      console.log(`  ✗ ${symbolNS}: ${msg}`);
      for (const sig of symSignals) {
        allRows.push({ signal: sig, result: { error: msg } });
      }
      continue;
    }

    // Analyze each signal date for this symbol
    for (const sig of symSignals) {
      const result = analyzeOutcome(ohlcv, sig);
      printDetail(sig, result);
      allRows.push({ signal: sig, result });
    }
  }

  // Summary table at the end
  printSummary(allRows);
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
