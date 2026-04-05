/**
 * sma44Tracker.mjs — 10-Day Outcome Tracker for SMA-44 Signals
 * ─────────────────────────────────────────────────────────────────────────────
 * You filtered stocks by the SMA-44 strategy on a specific date.
 * This script tells you what happened over the next 10 trading days:
 *
 *   • Entry price       — close on your signal date
 *   • SMA-44 on entry   — value of the 44-day SMA on that date
 *   • Stop Loss price   — entry × (1 − 5%)
 *   • Target price      — entry × (1 + 10%)
 *   • Day-10 close      — actual closing price 10 trading days later
 *   • Day-10 % change   — vs entry price
 *   • SMA-44 on day 10  — is price still above SMA?
 *   • Was stop hit?     — did price touch SL before day 10?
 *   • Was target hit?   — did price touch target before day 10?
 *   • Which hit first?  — STOP / TARGET / NEITHER (time exit)
 *   • Outcome           — WIN / LOSS / OPEN (if day 10 hasn't arrived yet)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ✏️  EDIT THIS LIST — add your signal date + symbol pairs below
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { fetchOHLCV } from "./src/stockData/dataFetcher.mjs";
import { CONFIG }               from "./config.mjs";
import { getAllFilterStocks } from "./src/Services/filterStocks.js";

// ═══════════════════════════════════════════════════════════════════════════════
//  ✏️  YOUR SIGNALS — edit this array
//
//  Format:  { symbol: 'SYMBOL.NS', date: 'YYYY-MM-DD' }
//  date     = the date your SMA-44 signal fired (your entry date)


//  symbol   = NSE ticker with .NS suffix
// ═══════════════════════════════════════════════════════════════════════════════

// const SIGNALS = [
//   { symbol: 'RELIANCE.NS',   date: '2024-11-01' },
//   { symbol: 'TCS.NS',        date: '2024-11-01' },
//   { symbol: 'HDFCBANK.NS',   date: '2024-10-15' },
//   { symbol: 'INFY.NS',       date: '2024-10-15' },
//   { symbol: 'ICICIBANK.NS',  date: '2024-11-05' },
//   { symbol: 'HINDALCO.NS',   date: '2024-11-05' },
//   // add more rows here...
// ];

const SIGNALS = await getAllFilterStocks()

// ─── Strategy parameters (from config.mjs — do not change) ───────────────────

const SMA_PERIOD   = CONFIG.SMA_PERIOD;      // 44
const STOP_PCT     = CONFIG.STOP_LOSS_PCT;   // 0.05  = 5%
const TARGET_PCT   = CONFIG.TARGET_PCT;      // 0.10  = 10%
const EXIT_DAYS    = CONFIG.TIME_EXIT_DAYS;  // 10

const DELAY_MS     = CONFIG.DELAY_BETWEEN_SYMBOLS_MS ?? 3000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep  = ms => new Promise(r => setTimeout(r, ms));
const inr    = v  => v != null ? `₹${Number(v).toFixed(2)}` : 'N/A';
const pctStr = v  => v != null ? (v >= 0 ? '+' : '') + v.toFixed(2) + '%' : 'N/A';
const ds     = d  => d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? '').slice(0, 10);
const col    = (s, w) => String(s ?? '—').slice(0, w - 1).padEnd(w);
const colR   = (s, w) => String(s ?? '—').slice(0, w - 1).padStart(w);

const HDR  = '═'.repeat(88);
const SEP  = '─'.repeat(88);
const THIN = '·'.repeat(88);

// ─── SMA calculator (same as indicators.mjs) ─────────────────────────────────

function calcSMA(prices, period) {
  if (prices.length < period) return [];
  const result = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i];
  result.push(sum / period);
  for (let i = period; i < prices.length; i++) {
    sum += prices[i] - prices[i - period];
    result.push(sum / period);
  }
  return result;
}

// Build aligned SMA: sma[i] corresponds to candle[i], null during warm-up
function buildAlignedSMA(prices, period) {
  const raw     = calcSMA(prices, period);
  const padding = prices.length - raw.length;
  return [...Array(padding).fill(null), ...raw];
}

// ─── Core analysis ────────────────────────────────────────────────────────────

/**
 * Given OHLCV history + a signal date, compute the 10-day outcome.
 *
 * @param {Array}  ohlcv      — full sorted candle array (oldest→newest)
 * @param {string} signalDate — 'YYYY-MM-DD' — the date your signal fired
 * @returns {Object}
 */
function analyzeOutcome(ohlcv, signalDate) {
  const closes = ohlcv.map(c => c.close);
  const sma44  = buildAlignedSMA(closes, SMA_PERIOD);

  // Find the candle index for the signal date
  // Match on date string (handles timezone offset on Yahoo Finance dates)
  const signalIdx = ohlcv.findIndex(c => ds(c.date) === signalDate);

  if (signalIdx === -1) {
    // Signal date may be a weekend / holiday — find the next trading day
    const target = new Date(signalDate);
    const fallback = ohlcv.findIndex(c => c.date >= target);
    if (fallback === -1) return { error: `Signal date ${signalDate} not found in data (too recent or holiday).` };

    return analyzeOutcomeAtIndex(ohlcv, sma44, fallback, signalDate, `(nearest: ${ds(ohlcv[fallback].date)})`);
  }

  return analyzeOutcomeAtIndex(ohlcv, sma44, signalIdx, signalDate, '');
}

function analyzeOutcomeAtIndex(ohlcv, sma44, signalIdx, signalDate, note) {
  const entryBar   = ohlcv[signalIdx];
  const entryPrice = entryBar.close;
  const smaEntry   = sma44[signalIdx];

  const stopPrice   = entryPrice * (1 - STOP_PCT);
  const targetPrice = entryPrice * (1 + TARGET_PCT);

  // Scan the next EXIT_DAYS trading days (bars signalIdx+1 … signalIdx+EXIT_DAYS)
  const lastIdx = Math.min(signalIdx + EXIT_DAYS, ohlcv.length - 1);
  const isOpen  = lastIdx < signalIdx + EXIT_DAYS;   // day 10 hasn't arrived yet

  let stopHitIdx    = null;
  let targetHitIdx  = null;
  let stopHitDate   = null;
  let targetHitDate = null;
  let stopHitPrice  = null;
  let targetHitPrice = null;

  for (let i = signalIdx + 1; i <= lastIdx; i++) {
    const bar = ohlcv[i];

    // Check target hit (use intra-bar high)
    if (targetHitIdx === null && bar.high >= targetPrice) {
      targetHitIdx   = i;
      targetHitDate  = bar.date;
      targetHitPrice = targetPrice;   // actual trigger level
    }
    // Check stop hit (use intra-bar low)
    if (stopHitIdx === null && bar.low <= stopPrice) {
      stopHitIdx   = i;
      stopHitDate  = bar.date;
      stopHitPrice = stopPrice;
    }
  }

  // Determine which hit first
  let firstHit = 'NEITHER';
  if (stopHitIdx !== null && targetHitIdx !== null) {
    firstHit = stopHitIdx <= targetHitIdx ? 'STOP_FIRST' : 'TARGET_FIRST';
  } else if (stopHitIdx !== null) {
    firstHit = 'STOP_ONLY';
  } else if (targetHitIdx !== null) {
    firstHit = 'TARGET_ONLY';
  }

  // Day-10 bar (or latest available if still open)
  const day10Bar   = ohlcv[lastIdx];
  const day10Close = day10Bar.close;
  const sma10      = sma44[lastIdx];
  const day10Chg   = (day10Close - entryPrice) / entryPrice * 100;

  // Outcome determination
  let outcome;
  if (isOpen) {
    outcome = 'OPEN';
  } else if (firstHit === 'TARGET_FIRST' || firstHit === 'TARGET_ONLY') {
    outcome = 'WIN (target)';
  } else if (firstHit === 'STOP_FIRST' || firstHit === 'STOP_ONLY') {
    outcome = 'LOSS (stop)';
  } else {
    // Time exit — winner based on day-10 close
    outcome = day10Close > entryPrice ? 'WIN (time exit)' : 'LOSS (time exit)';
  }

  // Trade P&L based on actual exit
  let exitPrice, exitDate, exitReason;
  if (firstHit === 'TARGET_FIRST' || firstHit === 'TARGET_ONLY') {
    exitPrice  = targetHitPrice;
    exitDate   = targetHitDate;
    exitReason = 'TARGET HIT';
  } else if (firstHit === 'STOP_FIRST' || firstHit === 'STOP_ONLY') {
    exitPrice  = stopHitPrice;
    exitDate   = stopHitDate;
    exitReason = 'STOP HIT';
  } else {
    exitPrice  = day10Close;
    exitDate   = day10Bar.date;
    exitReason = isOpen ? 'STILL OPEN' : 'TIME EXIT (day 10)';
  }

  const actualPnlPct = (exitPrice - entryPrice) / entryPrice * 100;

  return {
    signalDate,
    signalDateNote  : note,
    entryDate       : ds(entryBar.date),
    entryPrice      : parseFloat(entryPrice.toFixed(2)),
    smaOnEntry      : smaEntry != null ? parseFloat(smaEntry.toFixed(2)) : null,
    priceAboveSMAEntry: smaEntry != null ? entryPrice > smaEntry : null,

    stopPrice       : parseFloat(stopPrice.toFixed(2)),
    targetPrice     : parseFloat(targetPrice.toFixed(2)),

    stopHit         : stopHitIdx !== null,
    stopHitDate     : stopHitDate ? ds(stopHitDate) : null,
    stopHitDay      : stopHitIdx !== null ? stopHitIdx - signalIdx : null,

    targetHit       : targetHitIdx !== null,
    targetHitDate   : targetHitDate ? ds(targetHitDate) : null,
    targetHitDay    : targetHitIdx !== null ? targetHitIdx - signalIdx : null,

    firstHit,

    day10Date       : ds(day10Bar.date),
    day10Close      : parseFloat(day10Close.toFixed(2)),
    day10ChangePct  : parseFloat(day10Chg.toFixed(2)),
    smaOnDay10      : sma10 != null ? parseFloat(sma10.toFixed(2)) : null,
    priceAboveSMADay10: sma10 != null ? day10Close > sma10 : null,

    exitPrice       : parseFloat(exitPrice.toFixed(2)),
    exitDate        : ds(exitDate),
    exitReason,
    actualPnlPct    : parseFloat(actualPnlPct.toFixed(2)),
    outcome,
    isOpen,
  };
}

// ─── Console Printer ─────────────────────────────────────────────────────────

function printResult(symbol, r) {
  const isWin  = r.outcome?.startsWith('WIN');
  const isLoss = r.outcome?.startsWith('LOSS');
  const emoji  = r.isOpen ? '⏳' : isWin ? '✅' : isLoss ? '❌' : '—';

  console.log('\n' + HDR);
  console.log(`  ${emoji}  ${symbol}  —  Signal: ${r.signalDate}${r.signalDateNote ? '  ' + r.signalDateNote : ''}`);
  console.log(HDR);

  const row = (label, val) => console.log(`  ${label.padEnd(26)}: ${val}`);

  // Entry
  console.log('\n  ENTRY');
  console.log('  ' + THIN);
  row('Entry Date',            r.entryDate);
  row('Entry Price',           inr(r.entryPrice));
  row('SMA-44 on Entry',       inr(r.smaOnEntry));
  row('Price > SMA-44',        r.priceAboveSMAEntry ? '✅ YES' : '❌ NO');
  row('Stop Loss  (−5%)',      inr(r.stopPrice));
  row('Target     (+10%)',     inr(r.targetPrice));

  // 10-day window scan
  console.log('\n  10-DAY WINDOW');
  console.log('  ' + THIN);

  if (r.stopHit) {
    row('🔴 Stop Hit',         `Day ${r.stopHitDay}  (${r.stopHitDate})  @  ${inr(r.stopPrice)}`);
  } else {
    row('Stop Hit',            '⬜ Not triggered');
  }

  if (r.targetHit) {
    row('🎯 Target Hit',       `Day ${r.targetHitDay}  (${r.targetHitDate})  @  ${inr(r.targetPrice)}`);
  } else {
    row('Target Hit',          '⬜ Not triggered');
  }

  const firstHitMap = {
    TARGET_FIRST : '🎯 TARGET hit first',
    TARGET_ONLY  : '🎯 TARGET only (stop not hit)',
    STOP_FIRST   : '🔴 STOP hit first',
    STOP_ONLY    : '🔴 STOP only (target not hit)',
    NEITHER      : '— Neither (time exit)',
  };
  row('Which hit first',       firstHitMap[r.firstHit] ?? r.firstHit);

  // Day-10
  console.log('\n  DAY 10');
  console.log('  ' + THIN);
  row('Day-10 Date',           r.day10Date + (r.isOpen ? '  ⏳ (not reached yet)' : ''));
  row('Day-10 Close',          inr(r.day10Close));
  row('Day-10 vs Entry',       pctStr(r.day10ChangePct));
  row('SMA-44 on Day-10',      inr(r.smaOnDay10));
  row('Price > SMA-44 Day-10', r.priceAboveSMADay10 != null ? (r.priceAboveSMADay10 ? '✅ YES — still in uptrend' : '❌ NO — broke below SMA') : 'N/A');

  // Exit & Result
  console.log('\n  ACTUAL EXIT');
  console.log('  ' + THIN);
  row('Exit Date',             r.exitDate);
  row('Exit Price',            inr(r.exitPrice));
  row('Exit Reason',           r.exitReason);
  row('P&L %',                 pctStr(r.actualPnlPct));

  console.log('\n  ' + SEP);
  console.log(`  OUTCOME: ${emoji}  ${r.outcome}   |   P&L: ${pctStr(r.actualPnlPct)}`);
  console.log('  ' + SEP);
}

// ─── Summary Table ────────────────────────────────────────────────────────────

function printSummary(results) {
  console.log('\n' + HDR);
  console.log('  SMA-44 TRACKER — SUMMARY  (all signals)');
  console.log(HDR);

  // Table header
  console.log('\n  ' +
    col('Symbol', 16) + col('Signal Date', 13) + col('Entry ₹', 11) +
    col('Stop ₹', 11) + col('Target ₹', 11) + col('D10 Close', 11) +
    col('D10 Chg%', 10) + col('Stop?', 7) + col('Tgt?', 7) +
    col('First Hit', 14) + col('Exit ₹', 10) + col('P&L%', 9) + 'Outcome'
  );
  console.log('  ' + SEP);

  const closed = [];
  const open   = [];

  for (const { symbol, result: r } of results) {
    if (r.error) {
      console.log('  ' + col(symbol, 16) + 'ERROR: ' + r.error.slice(0, 60));
      continue;
    }
    const isWin  = r.outcome?.startsWith('WIN');
    const isLoss = r.outcome?.startsWith('LOSS');
    const emoji  = r.isOpen ? '⏳' : isWin ? '✅' : '❌';

    const firstHitShort = {
      TARGET_FIRST: '🎯 first',
      TARGET_ONLY : '🎯 only',
      STOP_FIRST  : '🔴 first',
      STOP_ONLY   : '🔴 only',
      NEITHER     : '— neither',
    }[r.firstHit] ?? r.firstHit;

    console.log('  ' +
      col(symbol.replace('.NS', ''), 16) +
      col(r.signalDate, 13) +
      colR(inr(r.entryPrice),  11) +
      colR(inr(r.stopPrice),   11) +
      colR(inr(r.targetPrice), 11) +
      colR(inr(r.day10Close),  11) +
      colR(pctStr(r.day10ChangePct), 10) +
      col(r.stopHit   ? `✅ d${r.stopHitDay}`   : '—', 7) +
      col(r.targetHit ? `✅ d${r.targetHitDay}` : '—', 7) +
      col(firstHitShort, 14) +
      colR(inr(r.exitPrice), 10) +
      colR(pctStr(r.actualPnlPct), 9) +
      `${emoji} ${r.outcome}`
    );

    if (r.isOpen) open.push(r); else closed.push(r);
  }

  // ── Stats ────────────────────────────────────────────────────
  if (closed.length > 0) {
    const wins    = closed.filter(r => r.outcome?.startsWith('WIN'));
    const losses  = closed.filter(r => r.outcome?.startsWith('LOSS'));
    const avgPnl  = closed.reduce((s, r) => s + r.actualPnlPct, 0) / closed.length;
    const avgWin  = wins.length   ? wins.reduce((s,r)=>s+r.actualPnlPct,0)/wins.length   : 0;
    const avgLoss = losses.length ? losses.reduce((s,r)=>s+r.actualPnlPct,0)/losses.length : 0;

    const stopFirst   = closed.filter(r => r.firstHit === 'STOP_FIRST'   || r.firstHit === 'STOP_ONLY').length;
    const targetFirst = closed.filter(r => r.firstHit === 'TARGET_FIRST' || r.firstHit === 'TARGET_ONLY').length;
    const neither     = closed.filter(r => r.firstHit === 'NEITHER').length;

    console.log('\n  ' + SEP);
    console.log(`  CLOSED TRADES : ${closed.length}   Wins: ${wins.length}   Losses: ${losses.length}   Open: ${open.length}`);
    console.log(`  WIN RATE      : ${closed.length ? ((wins.length/closed.length)*100).toFixed(1)+'%' : 'N/A'}`);
    console.log(`  AVG P&L       : ${pctStr(avgPnl)}   Avg Win: ${pctStr(avgWin)}   Avg Loss: ${pctStr(avgLoss)}`);
    console.log(`  EXIT BREAKDOWN: Target hit: ${targetFirst}   Stop hit: ${stopFirst}   Time exit: ${neither}`);
  }

  if (open.length > 0) {
    console.log(`\n  ⏳ OPEN (day 10 not reached): ${open.length} trade(s)`);
  }

  console.log('\n  Disclaimer: For educational purposes only. Not financial advice.');
  console.log(HDR + '\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + HDR);
  console.log('  SMA-44 SIGNAL TRACKER — 10-Day Outcome Checker');
  console.log(HDR);
  console.log(`  Signals     : ${SIGNALS.result.length}`);
  console.log(`  SMA Period  : ${SMA_PERIOD}`);
  console.log(`  Stop Loss   : −${STOP_PCT * 100}%   Target: +${TARGET_PCT * 100}%   Window: ${EXIT_DAYS} trading days`);
  console.log(`  Logic       : stop/target checked on intra-bar high/low each day`);
  console.log(HDR + '\n');

  const allResults = [];

  for (let i = 0; i < SIGNALS.result.length; i++) {
    const { symbol, date } = SIGNALS.result[i];

    if (i > 0) {
      // process.stdout.write(`  ⏳ Waiting ${DELAY_MS/1000}s (rate limit)...\r`);
      // await sleep(DELAY_MS);
      process.stdout.write(' '.repeat(40) + '\r');
    }

    process.stdout.write(`  ⏳ Fetching [${i+1}/${SIGNALS.result.length}] ${symbol}...\r`);

    try {
      // Fetch enough history to cover SMA warm-up (44 bars) + signal date + 10 days after
      // Use 200 extra days to be safe
      const ohlcv  = await fetchOHLCV(symbol, 800);
      process.stdout.write(' '.repeat(55) + '\r');

      if (!ohlcv || ohlcv.length < SMA_PERIOD + EXIT_DAYS + 5) {
        const r = { error: `Insufficient data: ${ohlcv?.length ?? 0} candles` };
        console.log(`\n  ✗ ${symbol}: ${r.error}`);
        allResults.push({ symbol, result: r });
        continue;
      }

      const result = analyzeOutcome(ohlcv, date);

      if (result.error) {
        console.log(`\n  ✗ ${symbol} (${date}): ${result.error}`);
        allResults.push({ symbol, result });
        continue;
      }

      printResult(symbol, result);
      allResults.push({ symbol, result });

    } catch (err) {
      process.stdout.write(' '.repeat(55) + '\r');
      console.log(`\n  ✗ ${symbol}: ${err.message}`);
      allResults.push({ symbol, result: { error: err.message } });
    }
  }

  printSummary(allResults);
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
