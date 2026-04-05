/**
 * macdScanner.mjs — MACD + RSI + Bollinger Band Weekly Scanner
 * ─────────────────────────────────────────────────────────────────────────────
 * Run:   node macdScanner.mjs
 *
 * Strategy (weekly candles):
 *   CORE — all three required for a signal:
 *     ✅ MACD cross up  — blue line crosses above red from below this week
 *     ✅ Volume ≥ 1.5×  — buying volume above 20-week average
 *     ✅ RSI ≥ 60       — momentum confirmed
 *
 *   BB SCORE (0–4) — each condition adds 1 point:
 *     1pt  Price above BB middle band    (uptrend confirmation)
 *     1pt  Bounced off middle band       (support held)
 *     1pt  Squeeze firing               (volatility contracting → breakout setup)
 *     1pt  Close above upper band       (strong breakout)
 *
 *   GRADE: 4=STRONG 🔥  3=GOOD ✅  2=MODERATE ⚡  1=WEAK ⚠️
 *
 * ✏️  Edit MACD_SYMBOLS in src/macdScannerConfig.mjs to change the stock list.
 */

import { runMACDScan }                   from './macdScannerEngine.mjs';
import { MACD_SYMBOLS, MACD_CONFIG }     from './macdScannerConfig.mjs';


import YahooFinance from "yahoo-finance2";
import { getAllStockList } from './src/Services/stockSymbols.mjs';

const yahooFinance = new YahooFinance();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep  = ms  => new Promise(r => setTimeout(r, ms));
const f2     = v   => v != null ? parseFloat(Number(v).toFixed(2)) : null;
const inr    = v   => v != null ? `₹${Number(v).toFixed(2)}` : 'N/A';
const col    = (s, w) => String(s ?? '—').slice(0, w - 1).padEnd(w);
const colR   = (s, w) => String(s ?? '—').slice(0, w - 1).padStart(w);
const ds     = d   => d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? '').slice(0, 10);

const HDR  = '═'.repeat(90);
const SEP  = '─'.repeat(90);
const THIN = '·'.repeat(90);

// ─── Weekly OHLCV fetcher ─────────────────────────────────────────────────────

async function fetchWeeklyOHLCV(symbol, lookbackDays = 1500) {
  const toDate   = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - lookbackDays);

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await yahooFinance.chart(symbol, {
        period1  : fromDate,
        period2  : toDate,
        interval : '1wk',             // ← weekly candles
      });

      if (!result?.quotes || result.quotes.length === 0)
        throw new Error(`No weekly data returned for ${symbol}`);

      return result.quotes
        .filter(q => q.date != null && q.open != null && q.close != null && q.volume != null)
        .map(q => ({
          date  : new Date(q.date),
          open  : q.open,
          high  : q.high  ?? q.close,
          low   : q.low   ?? q.close,
          close : q.close,
          volume: q.volume,
        }))
        .sort((a, b) => a.date - b.date);

    } catch (err) {
      const is429  = err.message?.includes('429') || err.message?.includes('Too Many');
      const isLast = attempt === MAX_RETRIES;
      const wait   = 5000 * attempt;
      if (isLast) throw err;
      const label  = is429 ? 'Rate limited' : 'Error';
      console.warn(`  ⏳ [${symbol}] ${label} — retry ${attempt + 1}/${MAX_RETRIES} in ${wait / 1000}s...`);
      // await sleep(wait);
    }
  }
}

// ─── Per-symbol console output ────────────────────────────────────────────────

function printResult(symbol, result, idx, total) {
  const { signalFired, coreConditions: cc, bbScore, bbGrade, bbConditions,
          bbDetails, indicators: ind, recentSignals } = result;

  const topEmoji = signalFired
    ? (bbScore >= 3 ? '🔥' : bbScore === 2 ? '⚡' : '✅')
    : '—';

  console.log('\n' + HDR);
  console.log(`  ${topEmoji}  ${symbol}   [${idx}/${total}]`);
  console.log(HDR);

  const row = (label, val) => console.log(`  ${label.padEnd(24)}: ${val ?? 'N/A'}`);

  // ── Signal status ─────────────────────────────────────────────
  console.log(`\n  SIGNAL : ${signalFired ? '🟢 FIRED' : '🔘 NOT MET'}   BB Grade: ${bbGrade.emoji} ${bbGrade.label} (${bbScore}/4)`);
  console.log(`  Week   : ${ds(ind.date)}   Close: ${inr(ind.close)}`);

  // ── Core conditions ───────────────────────────────────────────
  console.log('\n  ' + THIN);
  console.log('  CORE CONDITIONS  (all 3 required)');
  console.log('  ' + THIN);
  row('MACD Cross Up',   cc.macdCrossUp ? '✅ YES — blue crossed above red' : '❌ NO');
  row('RSI ≥ 60',        cc.rsiPass
    ? `✅ YES — RSI ${ind.rsi}`
    : `❌ NO  — RSI ${ind.rsi ?? 'N/A'} (need ≥ 60)`);
  row('Volume ≥ 1.5× avg', cc.volPass
    ? `✅ YES — ${ind.volRatio}× avg (${Number(ind.volume).toLocaleString()})`
    : `❌ NO  — ${ind.volRatio != null ? ind.volRatio + '×' : 'N/A'} avg`);

  // ── MACD detail ───────────────────────────────────────────────
  console.log('\n  ' + THIN);
  console.log('  MACD  (12 / 26 / 9  —  weekly)');
  console.log('  ' + THIN);
  row('MACD line (blue)', ind.macdLine);
  row('Signal line (red)', ind.macdSignal);
  row('Histogram',        ind.macdHist != null
    ? (ind.macdHist > 0 ? '+' : '') + ind.macdHist + (ind.macdHist > 0 ? '  (bullish)' : '  (bearish)')
    : 'N/A');

  // ── RSI ───────────────────────────────────────────────────────
  console.log('\n  ' + THIN);
  console.log('  RSI  (14  —  weekly)');
  console.log('  ' + THIN);
  row('RSI', `${ind.rsi ?? 'N/A'}${ind.rsi != null ? (ind.rsi >= 60 ? '  ✅' : ind.rsi >= 50 ? '  (approaching)' : '  ❌') : ''}`);

  // ── Volume ────────────────────────────────────────────────────
  console.log('\n  ' + THIN);
  console.log('  VOLUME  (vs 20-week average)');
  console.log('  ' + THIN);
  row('This week volume', ind.volume != null ? Number(ind.volume).toLocaleString() : 'N/A');
  row('20-week avg vol',  ind.volAvg  != null ? Number(ind.volAvg).toLocaleString()  : 'N/A');
  row('Ratio',            ind.volRatio != null ? `${ind.volRatio}×${ind.volRatio >= 1.5 ? '  ✅' : '  ❌'}` : 'N/A');

  // ── Bollinger Bands ───────────────────────────────────────────
  console.log('\n  ' + THIN);
  console.log(`  BOLLINGER BANDS  (20, ±2σ  —  weekly)   Score: ${bbScore}/4  →  ${bbGrade.emoji} ${bbGrade.label}`);
  console.log('  ' + THIN);
  row('Upper band',       inr(bbDetails.upper));
  row('Middle band (SMA)', inr(bbDetails.middle));
  row('Lower band',       inr(bbDetails.lower));
  row('%B',               bbDetails.pctB != null ? bbDetails.pctB + '%' : 'N/A');
  row('Bandwidth',        bbDetails.bandwidth != null ? bbDetails.bandwidth + '%' : 'N/A');

  console.log();
  const bbRows = [
    ['Above middle band',   bbConditions.includes('ABOVE_MID'),      'close > SMA-20'],
    ['Middle band bounce',  bbConditions.includes('MID_BOUNCE'),      'prev ≤ mid, now >'],
    ['Squeeze firing',      bbConditions.includes('SQUEEZE'),         'BW contracting'],
    ['Upper band breakout', bbConditions.includes('UPPER_BREAKOUT'),  'close > upper'],
  ];
  for (const [label, met, note] of bbRows) {
    console.log(`  ${met ? '  ✅' : '  ⬜'}  ${label.padEnd(22)} ${note}`);
  }

  // ── Recent signals (history) ──────────────────────────────────
  if (recentSignals.length > 0) {
    console.log('\n  ' + THIN);
    console.log('  RECENT SIGNALS THIS WINDOW  (last 5 bars)');
    console.log('  ' + THIN);
    for (const h of recentSignals) {
      const g = { label: ['','WEAK','MODERATE','GOOD','STRONG'][h.bbScore] ?? '', emoji: ['—','⚠️','⚡','✅','🔥'][h.bbScore] ?? '' };
      const isThisBar = h.barIndex === result._lastBarIndex;
      console.log(`  ${h.bbGrade === 'STRONG' ? '🔥' : '✅'}  ${ds(h.date)}  close: ${inr(h.close)}  RSI: ${h.rsi}  Vol: ${h.volRatio}×  BB: ${h.bbScore}/4 ${g.emoji} ${h.bbGrade}${isThisBar ? '  ← THIS WEEK' : ''}`);
    }
  }

  console.log('\n' + HDR + '\n');
}

// ─── Summary table ────────────────────────────────────────────────────────────

function printSummary(allResults) {
  console.log('\n' + HDR);
  console.log('  MACD + RSI + BB WEEKLY SCANNER — SUMMARY');
  console.log(HDR);

  // Sort: fired + highest BB score first
  allResults.sort((a, b) => {
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    const aFired = a.result?.signalFired ? 1 : 0;
    const bFired = b.result?.signalFired ? 1 : 0;
    if (aFired !== bFired) return bFired - aFired;
    return (b.result?.bbScore ?? 0) - (a.result?.bbScore ?? 0);
  });

  console.log('\n  ' +
    col('Symbol',      14) +
    col('Signal',      10) +
    col('BB Grade',    13) +
    colR('Close ₹',   10) +
    colR('RSI',         7) +
    colR('Vol×',        7) +
    colR('MACD',        9) +
    colR('Hist',        9) +
    colR('%B',          7) +
    'BB Conditions'
  );
  console.log('  ' + SEP);

  const fired   = [];
  const waiting = [];
  const errors  = [];

  for (const { symbol, result: r } of allResults) {
    if (r?.error) {
      console.log('  ' + col(symbol, 14) + 'ERROR: ' + (r.error ?? '').slice(0, 60));
      errors.push(symbol);
      continue;
    }

    const ind = r.indicators;
    const sig = r.signalFired ? '🟢 FIRED' : '🔘 —';
    const g   = r.bbGrade;
    const bbStr = r.bbConditions.map(c => ({
      ABOVE_MID      : 'mid↑',
      MID_BOUNCE     : 'bounce',
      SQUEEZE        : 'sqz',
      UPPER_BREAKOUT : 'UB!',
    }[c] ?? c)).join(' ');

    console.log('  ' +
      col(symbol.replace('.NS', ''), 14) +
      col(sig,                        10) +
      col(`${g.emoji} ${g.label}`,    13) +
      colR(inr(ind.close),            10) +
      colR(ind.rsi ?? '—',             7) +
      colR(ind.volRatio != null ? ind.volRatio + '×' : '—', 7) +
      colR(ind.macdLine ?? '—',        9) +
      colR(ind.macdHist != null ? (ind.macdHist > 0 ? '+' : '') + ind.macdHist : '—', 9) +
      colR(ind.bbPctB != null ? ind.bbPctB + '%' : '—', 7) +
      (bbStr || '—')
    );

    if (r.signalFired) fired.push({ symbol, r }); else waiting.push(symbol);
  }

  // ── Shortlist ─────────────────────────────────────────────────
  console.log('\n  ' + SEP);

  if (fired.length) {
    const byGrade = [4,3,2,1,0].map(score => {
      const syms = fired.filter(f => f.r.bbScore === score).map(f => f.symbol.replace('.NS',''));
      if (!syms.length) return null;
      const g = bbGradeLabel(score);
      return `  ${g.emoji} ${g.label} (BB ${score}/4) : ${syms.join('  |  ')}`;
    }).filter(Boolean);
    console.log('  🟢 SIGNALS FIRED:');
    byGrade.forEach(l => console.log(l));
  } else {
    console.log('  🔘 No signals fired this week.');
  }

  if (waiting.length)
    console.log(`\n  Waiting  : ${waiting.join('  |  ')}`);
  if (errors.length)
    console.log(`  Errors   : ${errors.join(', ')}`);

  console.log('\n  Disclaimer: For educational purposes only. Not financial advice.');
  console.log(HDR + '\n');
}

function bbGradeLabel(score) {
  return [
    { label: 'NO BB', emoji: '—'  },
    { label: 'WEAK',  emoji: '⚠️' },
    { label: 'MOD',   emoji: '⚡' },
    { label: 'GOOD',  emoji: '✅' },
    { label: 'STRONG',emoji: '🔥' },
  ][score] ?? { label: '?', emoji: '?' };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const SYMBOLS = await getAllStockList()
async function main() {
  const symbols = MACD_SYMBOLS.symbolsNS;
  const C       = MACD_CONFIG;

  console.log('\n' + HDR);
  console.log('  MACD + RSI + BOLLINGER BAND WEEKLY SCANNER');
  console.log(HDR);
  console.log(`  Symbols    : ${symbols.length}`);
  console.log(`  Timeframe  : Weekly candles  (Yahoo Finance 1wk)`);
  console.log(`  MACD       : ${C.MACD_FAST} / ${C.MACD_SLOW} / ${C.MACD_SIGNAL}`);
  console.log(`  RSI        : ${C.RSI_PERIOD}-period  ≥ ${C.RSI_MIN}`);
  console.log(`  Volume     : ≥ ${C.VOL_THRESHOLD}× ${C.VOL_MA_PERIOD}-week average`);
  console.log(`  BB         : ${C.BB_PERIOD}-period ±${C.BB_STD}σ   squeeze lookback: ${C.BB_SQUEEZE_LOOKBACK} bars`);
  console.log(`  Delay      : ${C.DELAY_BETWEEN_MS / 1000}s between symbols`);
  console.log(HDR + '\n');

  const allResults = [];

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];

    // if (i > 0) {
    //   process.stdout.write(`  ⏳ Waiting ${C.DELAY_BETWEEN_MS / 1000}s...\r`);
    //   await sleep(C.DELAY_BETWEEN_MS);
    //   process.stdout.write(' '.repeat(40) + '\r');
    // }

    process.stdout.write(`  ⏳ Fetching [${i + 1}/${symbols.length}] ${symbol} (weekly)...\r`);

    try {
      const ohlcv = await fetchWeeklyOHLCV(symbol, C.LOOKBACK_DAYS);
      process.stdout.write(' '.repeat(60) + '\r');

      if (!ohlcv || ohlcv.length < 50) {
        const r = { error: `Insufficient weekly data: ${ohlcv?.length ?? 0} bars` };
        console.log(`  ✗ ${symbol}: ${r.error}`);
        allResults.push({ symbol, result: r });
        continue;
      }

      const result = runMACDScan(ohlcv, C);
      result._lastBarIndex = ohlcv.length - 1;

      if (result.error) {
        console.log(`  ✗ ${symbol}: ${result.error}`);
        allResults.push({ symbol, result });
        continue;
      }

      printResult(symbol, result, i + 1, symbols.length);
      allResults.push({ symbol, result });

    } catch (err) {
      process.stdout.write(' '.repeat(60) + '\r');
      console.log(`  ✗ ${symbol}: ${err.message}`);
      allResults.push({ symbol, result: { error: err.message } });
    }
  }

  printSummary(allResults);
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
