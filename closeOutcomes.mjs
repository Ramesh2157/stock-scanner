/**
 * closeOutcomes.mjs — Auto-close SMA-44 Trades in filter_stocks
 * ─────────────────────────────────────────────────────────────────────────────
 * Run daily (or any time).  Reads ONLY open trades (result IS NULL) from
 * filter_stocks, checks the 10-day window in Yahoo Finance, and writes the
 * outcome back to the same row.
 *
 * A trade is closed when the FIRST of these conditions is met:
 *   SL hit    — intra-bar LOW  touches stop_loss    → result = 'LOSS'
 *   Target hit — intra-bar HIGH touches target       → result = 'WIN'
 *   Day 10    — 10 trading days elapsed              → result = 'WIN' or 'LOSS'
 *                                                       based on day-10 close
 *
 * Columns written on close (requires migration add_outcome_columns.sql):
 *   result       — 'WIN' or 'LOSS'
 *   exit_reason  — 'TARGET HIT' | 'STOP HIT' | 'TIME EXIT'
 *   exit_price   — price at which trade closed
 *   exit_date    — date that condition was met
 *   pnl_pct      — % return vs entry
 *   day10_close  — closing price on trading day 10
 *
 * Rows where result IS NOT NULL are skipped — safe to run any time.
 *
 * Run:   node closeOutcomes.mjs
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Before first run — execute in Supabase SQL Editor:
 *   ALTER TABLE filter_stocks
 *     ADD COLUMN IF NOT EXISTS result      TEXT,
 *     ADD COLUMN IF NOT EXISTS exit_reason TEXT,
 *     ADD COLUMN IF NOT EXISTS exit_price  NUMERIC,
 *     ADD COLUMN IF NOT EXISTS exit_date   DATE,
 *     ADD COLUMN IF NOT EXISTS pnl_pct     NUMERIC,
 *     ADD COLUMN IF NOT EXISTS day10_close NUMERIC;
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CONFIG } from './config.mjs';
import supabase from './src/database/supaBaseClient.mjs';
import { fetchOHLCV } from './src/stockData/dataFetcher.mjs';

// ─── Constants ────────────────────────────────────────────────────────────────

const SMA_PERIOD = CONFIG.SMA_PERIOD;       // 44
const EXIT_DAYS  = CONFIG.TIME_EXIT_DAYS;   // 10
const DELAY_MS   = CONFIG.DELAY_BETWEEN_SYMBOLS_MS ?? 3000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep  = ms  => new Promise(r => setTimeout(r, ms));
const ds     = d   => d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? '').slice(0, 10);
const f2     = v   => parseFloat(Number(v).toFixed(2));
const pctFmt = v   => v != null ? (v >= 0 ? '+' : '') + Number(v).toFixed(2) + '%' : 'N/A';
const inr    = v   => v != null ? `₹${Number(v).toFixed(2)}` : 'N/A';
const col    = (s, w) => String(s ?? '—').slice(0, w - 1).padEnd(w);
const colR   = (s, w) => String(s ?? '—').slice(0, w - 1).padStart(w);

const HDR  = '═'.repeat(88);
const SEP  = '─'.repeat(88);

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

// ─── Supabase: load only open trades (result IS NULL) ─────────────────────────

async function loadOpenTrades() {
  const pageSize = 1000;
  let rows = [];
  let from = 0;

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
        stock_symbols ( symbol_name )
      `)
      // .is('result', null)                          // ← only open trades
      .order('date',      { ascending: true })
      .order('symbol_id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Supabase fetch error: ${error.message}`);

    rows = rows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows.map(row => ({
    id          : row.id,
    symbol_id   : row.symbol_id,
    symbol_name : row.stock_symbols?.symbol_name ?? `ID_${row.symbol_id}`,
    symbolNS    : `${row.stock_symbols?.symbol_name ?? row.symbol_id}.NS`,
    date        : row.date,
    entry       : row.entry      != null ? Number(row.entry)      : null,
    stop_loss   : row.stop_loss  != null ? Number(row.stop_loss)  : null,
    target      : row.target     != null ? Number(row.target)     : null,
  }));
}

// ─── Supabase: write result back to one row ───────────────────────────────────

async function closeTradeInDB(id, update) {
  const { error } = await supabase
    .from('filter_stocks')
    .update({
      result      : update.result,
      exit_reason : update.exit_reason,
      exit_price  : update.exit_price,
      exit_date   : update.exit_date,
      pnl_pct     : update.pnl_pct,
      day10_close : update.day10_close,
    })
    .eq('id', id);

  if (error) throw new Error(`Supabase update error (id=${id}): ${error.message}`);
}

// ─── Core: evaluate one trade against OHLCV ───────────────────────────────────

/**
 * Returns { closed, update, status } where:
 *   closed — true if a condition was met (write to DB)
 *   update — the object to write  { result, exit_reason, exit_price, exit_date, pnl_pct, day10_close }
 *   status — human-readable line for console
 */
function evaluateTrade(ohlcv, signal) {
  const { date: signalDate, entry, stop_loss, target } = signal;

  // Guard: missing prices
  if (entry == null || stop_loss == null || target == null) {
    return { closed: false, update: null, status: '⚠️  missing entry/SL/target — skipped' };
  }

  const closes = ohlcv.map(c => c.close);
  const sma44  = buildAlignedSMA(closes, SMA_PERIOD);

  // Find signal date in OHLCV
  let signalIdx = ohlcv.findIndex(c => ds(c.date) === signalDate);
  if (signalIdx === -1) {
    const t = new Date(signalDate);
    signalIdx = ohlcv.findIndex(c => c.date >= t);
  }
  if (signalIdx === -1) {
    return { closed: false, update: null, status: `⚠️  date ${signalDate} not in price history — skipped` };
  }

  // How many trading days have elapsed since entry?
  const barsAvailable = ohlcv.length - 1 - signalIdx;
  const barsToCheck   = Math.min(barsAvailable, EXIT_DAYS);
  const lastIdx       = signalIdx + barsToCheck;
  const day10Reached  = barsAvailable >= EXIT_DAYS;

  let stopHitIdx = null, stopHitDate = null;
  let tgtHitIdx  = null, tgtHitDate  = null;

  for (let i = signalIdx + 1; i <= lastIdx; i++) {
    const bar = ohlcv[i];
    if (tgtHitIdx  === null && bar.high >= target)    { tgtHitIdx  = i; tgtHitDate  = bar.date; }
    if (stopHitIdx === null && bar.low  <= stop_loss) { stopHitIdx = i; stopHitDate = bar.date; }
  }

  // Which condition hit first?
  let firstHit = 'NEITHER';
  if (stopHitIdx !== null && tgtHitIdx !== null) {
    firstHit = stopHitIdx <= tgtHitIdx ? 'STOP_FIRST' : 'TARGET_FIRST';
  } else if (stopHitIdx !== null) { firstHit = 'STOP_ONLY';   }
  else if   (tgtHitIdx  !== null) { firstHit = 'TARGET_ONLY'; }

  const day10Bar   = ohlcv[lastIdx];
  const day10Close = f2(day10Bar.close);

  // ── Decision: is the trade ready to close? ───────────────────────────────
  //   • SL hit        → always close immediately
  //   • Target hit    → always close immediately
  //   • Day 10 reached (and neither SL nor target) → close at day-10 close
  //   • None of above → still OPEN, do nothing

  const slHit  = firstHit === 'STOP_FIRST'   || firstHit === 'STOP_ONLY';
  const tgtHit = firstHit === 'TARGET_FIRST' || firstHit === 'TARGET_ONLY';
  const shouldClose = slHit || tgtHit || day10Reached;

  if (!shouldClose) {
    const daysGone = barsAvailable;
    return {
      closed : false,
      update : null,
      status : `⏳ OPEN  — day ${daysGone}/${EXIT_DAYS}  |  price: ${inr(day10Close)}  |  SL: ${inr(stop_loss)}  |  Tgt: ${inr(target)}`,
    };
  }

  // ── Build the update record ───────────────────────────────────────────────
  let exitPrice, exitDate, exitReason, result;

  if (tgtHit) {
    exitPrice  = f2(target);
    exitDate   = ds(tgtHitDate);
    exitReason = 'TARGET HIT';
    result     = 'WIN';
  } else if (slHit) {
    exitPrice  = f2(stop_loss);
    exitDate   = ds(stopHitDate);
    exitReason = 'STOP HIT';
    result     = 'LOSS';
  } else {
    // Day-10 time exit
    exitPrice  = day10Close;
    exitDate   = ds(day10Bar.date);
    exitReason = 'TIME EXIT';
    result     = day10Close >= entry ? 'WIN' : 'LOSS';
  }

  const pnl_pct = f2((exitPrice - entry) / entry * 100);

  const update = {
    result,
    exit_reason : exitReason,
    exit_price  : exitPrice,
    exit_date   : exitDate,
    pnl_pct,
    day10_close : day10Close,
  };

  const emoji = result === 'WIN' ? '✅' : '❌';
  const status = `${emoji} ${result.padEnd(4)}  ${exitReason.padEnd(11)}  exit: ${inr(exitPrice)}  pnl: ${pctFmt(pnl_pct)}  (${exitDate})`;

  return { closed: true, update, status };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + HDR);
  console.log('  SMA-44 TRADE CLOSER  —  filter_stocks (result IS NULL) → close conditions');
  console.log(HDR);
  console.log(`  Conditions : SL hit (low ≤ stop_loss)  |  Target hit (high ≥ target)  |  Day ${EXIT_DAYS}`);
  console.log(`  Skips      : rows where result IS NOT NULL (already closed)`);
  console.log(`  Writes     : result, exit_reason, exit_price, exit_date, pnl_pct, day10_close`);
  console.log(HDR);

  // 1. Load open trades
  console.log('\n  Loading open trades from Supabase...');
  let trades;
  try {
    trades = await loadOpenTrades();
  } catch (err) {
    console.error(`\n  ❌ ${err.message}`);
    process.exit(1);
  }

  if (trades.length === 0) {
    console.log('  ✅ No open trades found — nothing to close.\n');
    return;
  }

  // Group by symbol → fetch OHLCV once per symbol
  const bySymbol = new Map();
  for (const t of trades) {
    if (!bySymbol.has(t.symbolNS)) bySymbol.set(t.symbolNS, []);
    bySymbol.get(t.symbolNS).push(t);
  }

  console.log(`  Found ${trades.length} open trade(s) across ${bySymbol.size} symbol(s).\n`);

  // Summary counters
  let nClosed = 0, nWin = 0, nLoss = 0, nStillOpen = 0, nError = 0;
  const closedRows = [];   // for summary table

  let symIdx = 0;

  for (const [symbolNS, symTrades] of bySymbol) {
    symIdx++;

    // if (symIdx > 1) {
    //   process.stdout.write(`  ⏳ Waiting ${DELAY_MS / 1000}s...\r`);
    //   await sleep(DELAY_MS);
    //   process.stdout.write(' '.repeat(40) + '\r');
    // }

    process.stdout.write(`  ⏳ Fetching [${symIdx}/${bySymbol.size}] ${symbolNS}...\r`);

    let ohlcv;
    try {
      ohlcv = await fetchOHLCV(symbolNS, 800);
      process.stdout.write(' '.repeat(55) + '\r');
    } catch (err) {
      process.stdout.write(' '.repeat(55) + '\r');
      console.log(`  ✗ ${symbolNS}: ${err.message}`);
      nError += symTrades.length;
      continue;
    }

    if (!ohlcv || ohlcv.length < SMA_PERIOD + EXIT_DAYS + 5) {
      console.log(`  ✗ ${symbolNS}: insufficient data (${ohlcv?.length ?? 0} candles)`);
      nError += symTrades.length;
      continue;
    }

    // Evaluate each open trade for this symbol
    for (const trade of symTrades) {
      const { closed, update, status } = evaluateTrade(ohlcv, trade);

      // Console line per trade
      const label = `${trade.symbol_name.padEnd(14)} ${trade.date}`;
      console.log(`  ${label}  ${status}`);

      if (!closed) {
        nStillOpen++;
        continue;
      }

      // Write to DB
      try {
        await closeTradeInDB(trade.id, update);
        nClosed++;
        if (update.result === 'WIN') nWin++; else nLoss++;
        closedRows.push({ trade, update });
      } catch (err) {
        console.log(`  ❌ DB write failed for ${trade.symbol_name} (${trade.date}): ${err.message}`);
        nError++;
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + HDR);
  console.log('  RESULTS');
  console.log(HDR);
  console.log(`  Closed   : ${nClosed}  (✅ ${nWin} WIN  |  ❌ ${nLoss} LOSS)`);
  console.log(`  Still open: ${nStillOpen}  (day 10 not yet reached)`);
  console.log(`  Errors   : ${nError}`);

  if (closedRows.length > 0) {
    console.log('\n  ' + SEP);
    console.log('  CLOSED TRADES');
    console.log('  ' + SEP);
    console.log('  ' +
      col('Symbol',    14) + col('Signal Date', 13) +
      colR('Entry ₹',  10) + colR('Exit ₹',  10) +
      col('Reason',    13) + col('Exit Date', 13) +
      colR('P&L%',      9) + 'Result'
    );
    console.log('  ' + SEP);

    for (const { trade, update } of closedRows) {
      const emoji = update.result === 'WIN' ? '✅' : '❌';
      console.log('  ' +
        col(trade.symbol_name,     14) +
        col(trade.date,            13) +
        colR(inr(trade.entry),     10) +
        colR(inr(update.exit_price), 10) +
        col(update.exit_reason,    13) +
        col(update.exit_date,      13) +
        colR(pctFmt(update.pnl_pct), 9) +
        `${emoji} ${update.result}`
      );
    }

    // Aggregate stats
    if (nClosed > 0) {
      const avgPnl  = closedRows.reduce((s, r) => s + r.update.pnl_pct, 0) / nClosed;
      const winRate = ((nWin / nClosed) * 100).toFixed(1);
      const byReason = closedRows.reduce((acc, r) => {
        acc[r.update.exit_reason] = (acc[r.update.exit_reason] ?? 0) + 1;
        return acc;
      }, {});
      console.log('\n  ' + SEP);
      console.log(`  Win rate  : ${winRate}%  (${nWin}W / ${nLoss}L)`);
      console.log(`  Avg P&L   : ${pctFmt(avgPnl)}`);
      console.log(`  By reason : ${Object.entries(byReason).map(([k, v]) => `${k}: ${v}`).join('  |  ')}`);
    }
  }

  console.log('\n' + HDR + '\n');
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
