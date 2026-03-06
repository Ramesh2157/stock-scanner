/**
 * indicators.mjs — Technical indicator calculations.
 *
 * Uses a self-contained SMA implementation that matches the
 * technicalindicators API exactly (SMA.calculate({ period, values })).
 *
 * Why not import from technicalindicators directly?
 * The package is CommonJS internally. Deep-path ESM imports like
 * `technicalindicators/indicators/moving_averages/SMA.js` fail in
 * Node ESM mode. The top-level import works but pulls in the entire
 * bundle (~300KB). For a single indicator (SMA) a clean native
 * implementation is faster, dependency-free, and avoids the issue.
 *
 * If you need RSI, MACD, Bollinger Bands etc. from technicalindicators,
 * use the top-level named import shown at the bottom of this file.
 */

// ── Native SMA — identical output to technicalindicators SMA.calculate() ──

/**
 * Calculate SMA values for an array of prices.
 *
 * Returns an array whose length = prices.length - period + 1.
 * Element [0] is the SMA of prices[0..period-1].
 * Element [n] is the SMA of prices[n..n+period-1].
 *
 * Uses an O(n) sliding-window accumulator for efficiency.
 *
 * @param {number[]} prices - Closing prices (oldest → newest)
 * @param {number}   period - SMA period (e.g. 44)
 * @returns {number[]}
 */
export function calcSMA(prices, period) {
  if (prices.length < period) return [];

  const result = [];
  let   sum    = 0;

  // Seed the first window
  for (let i = 0; i < period; i++) sum += prices[i];
  result.push(sum / period);

  // Slide the window one bar at a time
  for (let i = period; i < prices.length; i++) {
    sum += prices[i] - prices[i - period];
    result.push(sum / period);
  }

  return result;
}

/**
 * Build a full-length aligned SMA array padded with null at the front,
 * so that smaAligned[i] corresponds exactly to candle[i].
 *
 * Example: 100 prices, period 44 → 44 nulls + 57 SMA values (length 100 ✓)
 *
 * @param {number[]} prices
 * @param {number}   period
 * @returns {(number|null)[]}
 */
export function buildAlignedSMA(prices, period) {
  const raw     = calcSMA(prices, period);
  const padding = prices.length - raw.length;   // = period - 1 nulls
  return [...Array(padding).fill(null), ...raw];
}

// ── Optional: use technicalindicators for other indicators ──────────────────
//
// The package's top-level export works fine in ESM via dynamic import:
//
//   const ti = await import('technicalindicators');
//   const rsiValues = ti.RSI.calculate({ period: 14, values: closes });
//
// Or with a static import at the top of the file that needs it:
//   import * as ti from 'technicalindicators';
// ────────────────────────────────────────────────────────────────────────────
