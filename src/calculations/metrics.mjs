/**
 * metrics.mjs — Performance metric calculations.
 *
 * Pure functions — no side-effects, easy to unit-test.
 */

/**
 * Calculate all performance metrics from a trades array + equity curve.
 *
 * @param {import('./backtester.mjs').Trade[]} trades
 * @param {number[]} equityCurve
 * @param {number}   initialCapital
 * @returns {Object} metrics
 */
export function calcMetrics(trades, equityCurve, initialCapital) {
  if (trades.length === 0) {
    return {
      totalTrades  : 0,
      wins         : 0,
      losses       : 0,
      winRate      : 0,
      avgReturn    : 0,
      avgWin       : 0,
      avgLoss      : 0,
      profitFactor : 0,
      maxDrawdown  : 0,
      finalCapital : initialCapital,
      totalReturn  : 0,
      sharpeApprox : 0,
      exitBreakdown: {},
    };
  }

  // ── Win / Loss separation ────────────────────────────────
  const wins   = trades.filter(t => t.returnPct > 0);
  const losses = trades.filter(t => t.returnPct <= 0);

  // ── Basic stats ──────────────────────────────────────────
  const totalTrades = trades.length;
  const winRate     = wins.length / totalTrades;

  const avgReturn = mean(trades.map(t => t.returnPct));
  const avgWin    = wins.length   > 0 ? mean(wins.map(t => t.returnPct))   : 0;
  const avgLoss   = losses.length > 0 ? mean(losses.map(t => t.returnPct)) : 0;

  // ── Profit Factor = sum(wins) / |sum(losses)| ────────────
  const grossProfit = wins.reduce((s, t)   => s + t.returnPct, 0);
  const grossLoss   = losses.reduce((s, t) => s + Math.abs(t.returnPct), 0);
  const profitFactor = grossLoss === 0 ? Infinity : grossProfit / grossLoss;

  // ── Max Drawdown from equity curve ──────────────────────
  let peak        = equityCurve[0];
  let maxDrawdown = 0;
  for (const equity of equityCurve) {
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // ── Total return ─────────────────────────────────────────
  const finalCapital = equityCurve[equityCurve.length - 1];
  const totalReturn  = (finalCapital - initialCapital) / initialCapital;

  // ── Approximate Sharpe (using per-trade returns) ─────────
  const returns   = trades.map(t => t.returnPct);
  const stdDev    = standardDeviation(returns);
  const sharpeApprox = stdDev === 0 ? 0 : avgReturn / stdDev;

  // ── Exit reason breakdown ────────────────────────────────
  const exitBreakdown = trades.reduce((acc, t) => {
    acc[t.exitReason] = (acc[t.exitReason] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalTrades,
    wins       : wins.length,
    losses     : losses.length,
    winRate,
    avgReturn,
    avgWin,
    avgLoss,
    profitFactor,
    maxDrawdown,
    finalCapital,
    totalReturn,
    sharpeApprox,
    exitBreakdown,
  };
}

// ── Statistical helpers ───────────────────────────────────────

function mean(arr) {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}

function standardDeviation(arr) {
  if (arr.length < 2) return 0;
  const m   = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}
