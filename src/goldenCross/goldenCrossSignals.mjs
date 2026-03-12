/**
 * goldenCrossSignals.mjs — Save Golden Cross entry signals to gc_signals.json
 * ─────────────────────────────────────────────────────────────────────────────
 * Schema saved per symbol:
 * {
 *   symbol, scanDate, status, emoji,
 *   entrySignal: { triggered, winner, entryAt, aggressive, conservative },
 *   tradeSetup : { entryPrice, stopLoss, target, trailingStop, riskReward, ... },
 *   indicators : { price, ema50, ema200, gapPct, rsi, macdLine, macdHist, ... },
 *   metrics    : { winRate, avgReturn, profitFactor, ... },
 *   lastGoldenCross: { date, price, ema50, ema200, allFiltersPass },
 *   lastTrade      : { entryDate, entryPrice, entryType, returnPct, exitReason },
 * }
 */

import fs   from 'fs';
import path from 'path';

const dateStr = d => {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt) ? String(d) : dt.toISOString().slice(0, 10);
};

/**
 * Build the flat signal record for one symbol's result.
 */
export function buildSignalRecord(symbol, result) {
  const sig  = result.liveSignal;
  const ind  = sig?.indicators ?? {};
  const ts   = sig?.tradeSetup;
  const es   = sig?.entrySignal;
  const m    = result.metrics;
  const gc   = result.goldenCrosses?.slice(-1)[0] ?? null;
  const lt   = result.trades?.slice(-1)[0] ?? null;

  return {
    symbol,
    scanDate          : new Date().toISOString().slice(0, 10),
    scanTime          : new Date().toISOString(),

    // Status
    status            : sig?.status ?? 'ERROR',
    emoji             : sig?.emoji  ?? '—',
    message           : sig?.message ?? '',
    actionable        : sig?.actionable ?? false,

    // Entry signal
    entryTriggered    : es?.triggered ?? false,
    entryWinner       : es?.winner ?? null,
    entryAt           : es?.triggered ? es.entryAt : null,
    aggressiveReasons : es?.aggressive?.reasons ?? [],
    conservativeReasons: es?.conservative?.reasons ?? [],

    // Trade setup
    entryPrice        : ts?.entryPrice  ?? null,
    stopLoss          : ts?.stopLoss    ?? null,
    target            : ts?.target      ?? null,
    trailingStop      : ts?.trailingStop ?? null,
    riskAmt           : ts?.riskAmt     ?? null,
    rewardAmt         : ts?.rewardAmt   ?? null,
    riskPct           : ts?.riskPct     ?? null,
    rewardPct         : ts?.rewardPct   ?? null,
    riskReward        : ts?.riskReward  ?? null,

    // Indicators
    price             : ind.price      ?? null,
    ema50             : ind.ema50      ?? null,
    ema200            : ind.ema200     ?? null,
    gapPct            : ind.gapPct     ?? null,
    rsi               : ind.rsi        ?? null,
    volRatio          : ind.volRatio   ?? null,
    macdLine          : ind.macdLine   ?? null,
    macdSignal        : ind.macdSignal ?? null,
    macdHist          : ind.macdHist   ?? null,
    macdCrossUp       : ind.macdCrossUp ?? false,
    candlePattern     : ind.candlePattern ?? null,
    higherHigh        : ind.higherHigh ?? false,
    ema50SlopePct     : ind.ema50SlopePct  ?? null,
    ema200SlopePct    : ind.ema200SlopePct ?? null,

    // Backtest summary
    totalTrades       : m?.total       ?? 0,
    winRate           : m?.winRate     ?? 'N/A',
    avgReturn         : m?.avgReturn   ?? 'N/A',
    avgWin            : m?.avgWin      ?? 'N/A',
    avgLoss           : m?.avgLoss     ?? 'N/A',
    profitFactor      : m?.profitFactor ?? 'N/A',
    compoundReturn    : m?.compoundReturn ?? 'N/A',
    aggressiveStats   : m?.byEntryType?.AGGRESSIVE   ?? null,
    conservativeStats : m?.byEntryType?.CONSERVATIVE ?? null,

    // Last Golden Cross
    lastGCDate        : gc ? dateStr(gc.date)  : null,
    lastGCPrice       : gc?.price              ?? null,
    lastGCEma50       : gc?.ema50              ?? null,
    lastGCEma200      : gc?.ema200             ?? null,
    lastGCFiltersPass : gc?.allFiltersPass      ?? null,
    lastGCWinnerType  : gc?.entryTriggers?.winner?.type ?? null,
    lastGCEntryPrice  : gc?.entryTriggers?.winner?.entryPrice ?? null,
    lastGCEntryReasons: gc?.entryTriggers?.winner?.reasons    ?? [],

    // Last closed trade
    lastTradeEntry    : lt ? dateStr(lt.entryDate) : null,
    lastTradeExit     : lt ? dateStr(lt.exitDate)  : null,
    lastTradeReturn   : lt?.returnPct   ?? null,
    lastTradeExitReason: lt?.exitReason ?? null,
    lastTradeType     : lt?.entryType   ?? null,
    lastTradeHoldDays : lt?.holdDays    ?? null,
  };
}

/**
 * Save array of signal records to JSON file.
 * Sorted: actionable + triggered first, then by status priority.
 *
 * @param {Array}  records   - array of buildSignalRecord() outputs
 * @param {string} filePath  - output path, e.g. 'gc_signals.json'
 */
export function saveSignals(records, filePath = 'gc_signals.json') {
  const ORDER = { GOLDEN_CROSS:0, IN_UPTREND:1, WATCH:2, BEARISH:3, DEATH_CROSS:4, INSUFFICIENT_DATA:5 };

  const sorted = [...records].sort((a, b) => {
    // Triggered entries always float to top
    const aTop = a.entryTriggered ? -1 : 0;
    const bTop = b.entryTriggered ? -1 : 0;
    if (aTop !== bTop) return aTop - bTop;
    return (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9);
  });

  const output = {
    meta: {
      generatedAt   : new Date().toISOString(),
      totalSymbols  : records.length,
      triggered     : records.filter(r => r.entryTriggered).length,
      goldenCross   : records.filter(r => r.status === 'GOLDEN_CROSS').length,
      inUptrend     : records.filter(r => r.status === 'IN_UPTREND').length,
      watch         : records.filter(r => r.status === 'WATCH').length,
      bearish       : records.filter(r => r.status === 'BEARISH').length,
      deathCross    : records.filter(r => r.status === 'DEATH_CROSS').length,
    },
    signals: sorted,
  };

  const absPath = path.resolve(filePath);
  fs.writeFileSync(absPath, JSON.stringify(output, null, 2), 'utf-8');
  return absPath;
}
