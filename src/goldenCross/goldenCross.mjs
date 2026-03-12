/**
 * goldenCross.mjs — EMA 50 × EMA 200 Golden Cross Scanner
 * ─────────────────────────────────────────────────────────────────────────────
 * Run:   node goldenCross.mjs
 *
 * ✏️  Edit GOLDEN_SYMBOLS.symbolsNS below — same format as index.mjs / dcf.mjs.
 *
 * Entry Trigger System:
 *   After every Golden Cross, TWO triggers run in parallel.
 *   Whichever fires first is shown as the ENTRY.
 *
 *   AGGRESSIVE   — fires on first bar after GC with:
 *                  MACD cross · higher-high breakout · bullish engulfing/hammer
 *                  (falls back to next-open if none fire within window)
 *   CONSERVATIVE — waits for pullback to EMA-50, then needs:
 *                  bullish candle OR positive MACD histogram
 *
 * Output:
 *   • Console: full report per symbol + ranked summary table
 *   • gc_signals.json: all signals sorted by actionability
 */

import { fetchOHLCV }           from '../../src/stockData/dataFetcher.mjs';
import { runGoldenCross }       from './goldenCrossEngine.mjs';
import { buildSignalRecord,
         saveSignals }          from '../../src/goldenCross/goldenCrossSignals.mjs';
import { GOLDEN_SYMBOLS,
         GOLDEN_CONFIG }        from '../../goldenCrossConfig.mjs';

// ─── ✏️  Your stock list ─────────────────────────────────────────────────────

const SYMBOLS = GOLDEN_SYMBOLS;   // ← or: { symbolsNS: ['RELIANCE.NS', ...] }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep  = ms   => new Promise(r => setTimeout(r, ms));
const inr    = v    => v != null ? `₹${Number(v).toFixed(2)}` : 'N/A';
const col    = (s, w) => String(s ?? '—').slice(0, w - 1).padEnd(w);
const colR   = (s, w) => String(s ?? '—').slice(0, w - 1).padStart(w);
const dateS  = d    => d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? '').slice(0, 10);
const HDR    = '═'.repeat(90);
const SEP    = '─'.repeat(90);
const THIN   = '·'.repeat(90);

// ─── Per-symbol console output ────────────────────────────────────────────────

function printResult(symbol, result, idx, total) {
  const { metrics, filteredMetrics, liveSignal, trades, goldenCrosses } = result;
  const sig = liveSignal;
  const ind = sig.indicators;

  console.log('\n' + HDR);
  console.log(`  ${sig.emoji}  ${symbol}   [${idx}/${total}]`);
  console.log(HDR);
  console.log(`  STATUS  : ${sig.emoji} ${sig.status}`);
  console.log(`  MESSAGE : ${sig.message}`);

  // ── Indicators ────────────────────────────────────────────────
  console.log('\n  ' + THIN);
  console.log('  INDICATORS (current bar)');
  console.log('  ' + THIN);
  const row = (label, val) => console.log(`  ${label.padEnd(20)}: ${val ?? 'N/A'}`);
  row('Price',          inr(ind.price));
  row('EMA-50',         inr(ind.ema50));
  row('EMA-200',        inr(ind.ema200));
  row('EMA Gap',        ind.gapPct != null ? (ind.gapPct > 0 ? '+' : '') + ind.gapPct + '%' : 'N/A');
  row('RSI-14',         ind.rsi);
  row('Vol / AvgVol',   ind.volRatio != null ? ind.volRatio + '×' : 'N/A');
  row('MACD Line',      ind.macdLine);
  row('MACD Signal',    ind.macdSignal);
  row('MACD Histogram', ind.macdHist != null ? (ind.macdHist > 0 ? '+' : '') + ind.macdHist : 'N/A');
  row('MACD Cross↑',    ind.macdCrossUp ? '✅ YES' : 'no');
  row('Candle Pattern', ind.candlePattern ?? '—');
  row('Higher High',    ind.higherHigh   ? '✅ YES' : 'no');
  row('EMA-50 Slope',   ind.ema50SlopePct  != null ? (ind.ema50SlopePct  > 0 ? '+' : '') + ind.ema50SlopePct  + '%' : 'N/A');
  row('EMA-200 Slope',  ind.ema200SlopePct != null ? (ind.ema200SlopePct > 0 ? '+' : '') + ind.ema200SlopePct + '%' : 'N/A');

  // ── Entry Signal Block ────────────────────────────────────────
  const es = sig.entrySignal;
  if (es) {
    console.log('\n  ' + THIN);
    console.log('  ENTRY SIGNAL');
    console.log('  ' + THIN);

    if (es.triggered) {
      console.log(`  🎯 ENTRY TRIGGERED  →  ${es.winner} wins  →  Enter at ${es.entryAt}`);
      console.log();

      if (es.aggressive) {
        const ok = es.winner === 'AGGRESSIVE';
        console.log(`  ${ok ? '✅ WINNER' : '  '} AGGRESSIVE TRIGGER`);
        console.log(`          Reasons  : ${es.aggressive.reasons.join(' + ')}`);
      }
      if (es.conservative) {
        const ok = es.winner === 'CONSERVATIVE';
        console.log(`  ${ok ? '✅ WINNER' : '  '} CONSERVATIVE TRIGGER`);
        console.log(`          Reasons  : ${es.conservative.reasons.join(' + ')}`);
        if (es.conservative.pullbackPct)
          console.log(`          Pullback : ${es.conservative.pullbackPct} from EMA-50`);
      }

    } else {
      console.log('  ⏳ Waiting for entry trigger...');
      console.log();
      if (es.aggressive) {
        console.log('  AGGRESSIVE (next to fire):');
        console.log(`       Watch for : ${es.aggressive.watchFor?.join(' | ')}`);
        console.log(`       MACD now  : ${es.aggressive.macdStatus ?? '—'}`);
      }
      if (es.conservative) {
        console.log('  CONSERVATIVE (pullback):');
        console.log(`       In pullback zone : ${es.conservative.inPullback ? '✅ YES' : 'no'}`);
        console.log(`       Distance to EMA-50: ${es.conservative.distToEMA50 ?? '—'}`);
        console.log(`       Watch for : ${es.conservative.watchFor?.join(' | ')}`);
      }
    }
  }

  // ── Trade Setup ───────────────────────────────────────────────
  if (sig.tradeSetup) {
    const ts = sig.tradeSetup;
    console.log('\n  ' + THIN);
    console.log('  TRADE SETUP');
    console.log('  ' + THIN);
    console.log(`  ${'Entry Price'.padEnd(20)}: ${inr(ts.entryPrice)}`);
    console.log(`  ${'Stop Loss'.padEnd(20)}: ${inr(ts.stopLoss)}  (${ts.riskPct} — just below EMA-200)`);
    console.log(`  ${'Target'.padEnd(20)}: ${inr(ts.target)}  (+${ts.rewardPct})`);
    console.log(`  ${'Trailing Stop'.padEnd(20)}: ${inr(ts.trailingStop)}  (8% from trade high)`);
    console.log(`  ${'Risk Amount'.padEnd(20)}: ₹${ts.riskAmt} / share`);
    console.log(`  ${'Reward Amount'.padEnd(20)}: ₹${ts.rewardAmt} / share`);
    console.log(`  ${'Risk : Reward'.padEnd(20)}: ${ts.riskReward}`);
  }

  // ── Last Golden Cross entry triggers ─────────────────────────
  const lastGC = goldenCrosses.at(-1);
  if (lastGC) {
    const et = lastGC.entryTriggers;
    console.log('\n  ' + THIN);
    console.log(`  LAST GOLDEN CROSS — ${dateS(lastGC.date)}  @  ${inr(lastGC.price)}`);
    console.log('  ' + THIN);
    console.log(`  EMA-50: ${inr(lastGC.ema50)}  EMA-200: ${inr(lastGC.ema200)}  RSI: ${lastGC.rsi ?? 'N/A'}  Filters: ${lastGC.allFiltersPass ? '✅ ALL PASS' : '⚠️ partial'}`);
    console.log();

    // Aggressive trigger
    const ta = et.triggerA;
    const taFired = !ta.reasons.includes('NEXT_OPEN_FALLBACK');
    console.log(`  AGGRESSIVE  ${ta === et.winner ? '← WINNER' : ''}`);
    console.log(`    Fired     : ${taFired ? '✅ YES' : '⬜ fallback (no confirmation)'}`);
    console.log(`    Reasons   : ${ta.reasons.join(' + ')}`);
    console.log(`    Trigger   : ${dateS(ta.triggerDate)}  |  Entry: ${dateS(ta.entryDate)}  @  ${inr(ta.entryPrice)}  (${ta.barsAfterGC} bar(s) after GC)`);
    if (taFired) {
      console.log(`    MACD      : Line ${ta.macdLine ?? '—'}  Sig ${ta.macdSignal ?? '—'}  Hist ${ta.macdHist ?? '—'}  Cross↑: ${ta.macdCrossUp ? 'YES' : 'no'}`);
      if (ta.candlePattern) console.log(`    Candle    : ${ta.candlePattern}`);
      if (ta.higherHigh)    console.log(`    Higher High: ✅`);
    }
    console.log();

    // Conservative trigger
    const tb = et.triggerB;
    const tbFired = tb.entryPrice != null;
    console.log(`  CONSERVATIVE  ${tb === et.winner ? '← WINNER' : ''}`);
    if (tbFired) {
      console.log(`    Fired     : ✅ YES`);
      console.log(`    Reasons   : ${tb.reasons.join(' + ')}`);
      console.log(`    Trigger   : ${dateS(tb.triggerDate)}  |  Entry: ${dateS(tb.entryDate)}  @  ${inr(tb.entryPrice)}  (${tb.barsAfterGC} bar(s) after GC)`);
      console.log(`    Pullback  : ${tb.pullbackPct ?? '—'}% from EMA-50 (${inr(tb.ema50AtEntry)})`);
      if (tb.candlePattern) console.log(`    Candle    : ${tb.candlePattern}`);
    } else {
      console.log(`    Fired     : ⬜ NO — ${tb.reasons[0]}`);
    }
    console.log();

    // Winner summary
    const w = et.winner;
    console.log(`  ★ WINNER ENTRY: ${w.type}  →  ${dateS(w.entryDate)} @ ${inr(w.entryPrice)}`);
  }

  // ── Backtest ──────────────────────────────────────────────────
  console.log('\n  ' + THIN);
  console.log('  BACKTEST — ALL GOLDEN CROSS TRADES');
  console.log('  ' + THIN);
  printMetrics(metrics);

  if (filteredMetrics.total > 0) {
    console.log();
    console.log('  BACKTEST — FILTERED (all 4 confirmations passed)');
    printMetrics(filteredMetrics);
  }

  // ── Trade log ─────────────────────────────────────────────────
  const closed = trades.filter(t => t.exitReason !== 'OPEN');
  if (closed.length > 0) {
    console.log('\n  ' + THIN);
    console.log('  TRADE LOG  (last 10)');
    console.log('  ' + THIN);
    console.log('  ' +
      col('GC Date', 13) + col('Entry', 13) + col('Type', 14) +
      col('Entry ₹', 11) + col('Exit ₹', 11) + col('Hold', 7) +
      col('Return', 10) + col('Exit', 13) + 'Entry Reasons'
    );
    console.log('  ' + '─'.repeat(95));
    for (const t of closed.slice(-10)) {
      const sign  = t.returnPct >= 0 ? '+' : '';
      const entry = t.entryReasons?.join('+') ?? '—';
      console.log('  ' +
        col(dateS(t.gcDate),    13) +
        col(dateS(t.entryDate), 13) +
        col(t.entryType,        14) +
        colR(inr(t.entryPrice), 11) +
        colR(inr(t.exitPrice),  11) +
        colR(t.holdDays + 'd',   7) +
        colR(`${sign}${t.returnPct}%`, 10) +
        col(t.exitReason,       13) +
        entry.slice(0, 30)
      );
    }
  }

  console.log('\n' + HDR + '\n');
}

function printMetrics(m) {
  if (m.total === 0) { console.log('  No trades.'); return; }
  console.log(`  Trades: ${m.total}  (closed: ${m.closed}  open: ${m.open})  |  Win Rate: ${m.winRate}  (${m.wins}W / ${m.losses}L)`);
  console.log(`  Avg Return: ${m.avgReturn}   Avg Win: ${m.avgWin}   Avg Loss: ${m.avgLoss}   Hold: ${m.avgHoldDays}`);
  console.log(`  Best: ${m.bestTrade}   Worst: ${m.worstTrade}   PF: ${m.profitFactor}   Compound: ${m.compoundReturn}`);
  const eb = m.exitBreakdown;
  console.log(`  Exits: ${Object.entries(eb).map(([k,v])=>`${k}:${v}`).join('  |  ')}`);

  const bt = m.byEntryType;
  if (bt.AGGRESSIVE || bt.CONSERVATIVE) {
    const fa = bt.AGGRESSIVE;
    const fc = bt.CONSERVATIVE;
    if (fa) console.log(`  AGGRESSIVE:    ${fa.count} trades  WR: ${fa.winRate}  Avg: ${fa.avgRet}`);
    if (fc) console.log(`  CONSERVATIVE:  ${fc.count} trades  WR: ${fc.winRate}  Avg: ${fc.avgRet}`);
  }
}

// ─── Summary Table ────────────────────────────────────────────────────────────

function printSummaryTable(allResults) {
  console.log('\n' + HDR);
  console.log('  GOLDEN CROSS SCANNER — SUMMARY TABLE');
  console.log(HDR);

  const ORDER = { GOLDEN_CROSS:0, IN_UPTREND:1, WATCH:2, BEARISH:3, DEATH_CROSS:4, INSUFFICIENT_DATA:5 };
  allResults.sort((a,b) => {
    const ta = a.signal?.entrySignal?.triggered ? -1 : 0;
    const tb = b.signal?.entrySignal?.triggered ? -1 : 0;
    if (ta !== tb) return ta - tb;
    return (ORDER[a.signal?.status]??9) - (ORDER[b.signal?.status]??9);
  });

  console.log('\n  ' +
    col('Symbol', 16) + col('Signal', 17) + col('Entry?', 10) +
    col('Price', 10) + col('EMA-50', 10) + col('EMA-200', 10) +
    col('Gap%', 8) + col('RSI', 7) + col('MACD Hist', 11) +
    col('WinRate', 9) + col('AvgRet', 9) + 'PF'
  );
  console.log('  ' + SEP);

  for (const r of allResults) {
    if (r.error) {
      console.log('  ' + col(r.symbol, 16) + 'ERROR: ' + r.error.slice(0,60));
      continue;
    }
    const sig  = r.signal;
    const ind  = sig?.indicators ?? {};
    const m    = r.metrics;
    const es   = sig?.entrySignal;
    const gapStr = ind.gapPct != null ? (ind.gapPct > 0 ? '+' : '') + ind.gapPct + '%' : 'N/A';
    const histStr = ind.macdHist != null ? (ind.macdHist > 0 ? '+' : '') + ind.macdHist : 'N/A';
    const entryStr = es?.triggered ? `✅ ${es.winner?.slice(0,4)}` : (sig?.actionable ? '⏳ wait' : '—');

    console.log('  ' +
      col(r.symbol.replace('.NS',''), 16) +
      col(`${sig?.emoji??''} ${sig?.status??'N/A'}`, 17) +
      col(entryStr, 10) +
      col(inr(ind.price), 10) +
      col(inr(ind.ema50), 10) +
      col(inr(ind.ema200), 10) +
      col(gapStr, 8) +
      col(ind.rsi ?? '—', 7) +
      col(histStr, 11) +
      col(m?.winRate  ?? 'N/A', 9) +
      col(m?.avgReturn ?? 'N/A', 9) +
      (m?.profitFactor ?? 'N/A')
    );
  }

  // Actionable groups
  console.log('\n  ' + SEP);
  const triggered = allResults.filter(r => r.signal?.entrySignal?.triggered);
  const golden    = allResults.filter(r => r.signal?.status === 'GOLDEN_CROSS' && !triggered.includes(r));
  const uptrend   = allResults.filter(r => r.signal?.status === 'IN_UPTREND'   && !triggered.includes(r));
  const watch     = allResults.filter(r => r.signal?.status === 'WATCH');
  const death     = allResults.filter(r => r.signal?.status === 'DEATH_CROSS');

  if (triggered.length)
    console.log(`  🎯 ENTRY NOW     : ${triggered.map(r=>r.symbol.replace('.NS','')).join('  |  ')}`);
  if (golden.length)
    console.log(`  🟢 GOLDEN CROSS  : ${golden.map(r=>r.symbol.replace('.NS','')).join('  |  ')}`);
  if (uptrend.length)
    console.log(`  🔵 IN UPTREND    : ${uptrend.map(r=>r.symbol.replace('.NS','')).join('  |  ')}`);
  if (watch.length)
    console.log(`  🟡 WATCH         : ${watch.map(r=>r.symbol.replace('.NS','')).join('  |  ')}`);
  if (death.length)
    console.log(`  🔴 DEATH CROSS   : ${death.map(r=>r.symbol.replace('.NS','')).join('  |  ')}`);

  console.log('\n  Disclaimer: For educational purposes only. Not financial advice.');
  console.log(HDR + '\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const symbols  = SYMBOLS.symbolsNS;
  const C        = GOLDEN_CONFIG;
  const outFile  = C.SIGNALS_FILE ?? 'gc_signals.json';

  console.log('\n' + HDR);
  console.log('  QUANT SCREENER — GOLDEN CROSS + ENTRY SIGNAL  (EMA-50 × EMA-200)');
  console.log(HDR);
  console.log(`  Symbols     : ${symbols.length}`);
  console.log(`  EMA         : Fast=${C.EMA_FAST}  Slow=${C.EMA_SLOW}`);
  console.log(`  MACD        : ${C.MACD_FAST}/${C.MACD_SLOW}/${C.MACD_SIGNAL}`);
  console.log(`  Entry A     : Aggressive  — MACD cross | Higher High | Candle pattern`);
  console.log(`  Entry B     : Conservative — Pullback to EMA-50 + candle/MACD confirm`);
  console.log(`  Winner      : Whichever fires first`);
  console.log(`  Exit        : Death Cross | EMA-50 break -${C.STOP_LOSS_PCT*100}% | Trail -${C.TRAILING_STOP_PCT*100}%`);
  console.log(`  Output      : Console + ${outFile}`);
  console.log(HDR + '\n');

  const allResults    = [];
  const signalRecords = [];
  const errors        = [];

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];

    if (i > 0) {
      process.stdout.write(`  ⏳ Waiting ${C.DELAY_BETWEEN_MS/1000}s...\r`);
      // await sleep(C.DELAY_BETWEEN_MS);
      process.stdout.write(' '.repeat(40) + '\r');
    }

    process.stdout.write(`  ⏳ Fetching [${i+1}/${symbols.length}] ${symbol}...\r`);

    try {
      const ohlcv  = await fetchOHLCV(symbol, C.LOOKBACK_DAYS);
      const result = runGoldenCross(ohlcv, C);

      if (result.error) {
        console.log(`\n  ✗ ${symbol}: ${result.error}`);
        errors.push({ symbol, error: result.error });
        allResults.push({ symbol, error: result.error });
        continue;
      }

      process.stdout.write(' '.repeat(55) + '\r');
      printResult(symbol, result, i + 1, symbols.length);

      const record = buildSignalRecord(symbol, result);
      signalRecords.push(record);
      allResults.push({ symbol, signal: result.liveSignal, metrics: result.metrics });

    } catch (err) {
      console.log(`\n  ✗ ${symbol}: ${err.message}`);
      errors.push({ symbol, error: err.message });
      allResults.push({ symbol, error: err.message });
    }
  }

  printSummaryTable(allResults);

  // ── Save JSON ──────────────────────────────────────────────────
  if (signalRecords.length > 0) {
    try {
      const saved = saveSignals(signalRecords, outFile);
      console.log(`  💾 Signals saved → ${saved}`);
      console.log(`     Triggered: ${signalRecords.filter(r=>r.entryTriggered).length}  |  Total: ${signalRecords.length}\n`);
    } catch (err) {
      console.error(`  ❌ Could not save JSON: ${err.message}`);
    }
  }

  if (errors.length)
    console.log(`  ❌ Errors (${errors.length}): ${errors.map(e=>e.symbol).join(', ')}\n`);
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
