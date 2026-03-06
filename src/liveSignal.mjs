/**
 * liveSignal.mjs — Next Entry Scanner on 44 SMA Support
 *
 * After backtesting, this module inspects the MOST RECENT bars to answer:
 * "Is the stock currently pulling back to / sitting on the 44 SMA
 *  and showing a bullish candle? → Ready to enter NOW?"
 *
 * ENTRY CONDITIONS (SMA Support Bounce):
 *  A. Price is near the 44 SMA (within SMA_PROXIMITY_PCT %)
 *     — i.e. stock pulled back TO the SMA, not crossed below it
 *  B. Low of the bar touched or approached the 44 SMA (wicked into support)
 *  C. Close > Open  → bullish candle (buyers defended the SMA)
 *  D. Close > SMA   → closed ABOVE support, not below
 *  E. 44 SMA today  > 44 SMA 60 days ago  → still in uptrend
 *
 * STATUS values returned:
 *  'ENTRY_NOW'    — All conditions met on the latest bar. Buy at open tomorrow.
 *  'NEAR_SUPPORT' — Price approaching SMA, not yet touching. Watch closely.
 *  'WAIT'         — Price far from SMA. No setup forming yet.
 *  'BELOW_SMA'    — Price broke below SMA. No long entry.
 */

import { buildAlignedSMA } from './indicators.mjs';
import { CONFIG }           from './config.mjs';

// How close (%) the low must come to the SMA to count as "touching support"
const SMA_PROXIMITY_PCT = 0.015;   // within 1.5% of SMA = near support
const SMA_TOUCH_PCT     = 0.005;   // within 0.5% of SMA = touching support

/**
 * Analyse the latest bars to determine if a SMA-support bounce entry is forming.
 *
 * @param {Array}  ohlcv - Full candle array (oldest → newest)
 * @returns {Object}     - Live signal analysis object
 */
export function getLiveSignal(ohlcv) {
  const { SMA_PERIOD, SMA_TREND_LOOKBACK } = CONFIG;

  const closes  = ohlcv.map(c => c.close);
  const smaArr  = buildAlignedSMA(closes, SMA_PERIOD);

  // Work from the latest bar backwards
  const last    = ohlcv.length - 1;
  const today   = ohlcv[last];
  const yest    = ohlcv[last - 1];

  const smaToday    = smaArr[last];
  const smaYest     = last > 0 ? smaArr[last - 1] : null;
  const smaTrendRef = last >= SMA_TREND_LOOKBACK ? smaArr[last - SMA_TREND_LOOKBACK] : null;

  // Can't compute without enough data
  if (smaToday == null) {
    return { status: 'INSUFFICIENT_DATA', message: 'Need more bars to compute SMA-44.' };
  }

  // ── Measure distance from SMA ───────────────────────────────
  const distClose = (today.close - smaToday) / smaToday;  // +above, -below
  const distLow   = (today.low   - smaToday) / smaToday;  // how close low got

  // ── Evaluate each condition ─────────────────────────────────
  const isBullish    = today.close > today.open;               // C
  const closedAbove  = today.close > smaToday;                 // D
  const lowTouched   = Math.abs(distLow)   <= SMA_TOUCH_PCT;   // B strict
  const lowNear      = Math.abs(distLow)   <= SMA_PROXIMITY_PCT; // B loose
  const closeNear    = Math.abs(distClose) <= SMA_PROXIMITY_PCT; // A
  const inUptrend    = smaTrendRef != null && smaToday > smaTrendRef; // E

  // ── Determine SMA slope (rising / flat / falling) ───────────
  const smaSlope = smaYest != null
    ? ((smaToday - smaYest) / smaYest * 100).toFixed(3)
    : null;

  // ── Yesterday's candle context ──────────────────────────────
  const yesterdayBearish = yest && yest.close < yest.open;
  const yesterdayNearSMA = yest && smaYest != null &&
    Math.abs((yest.low - smaYest) / smaYest) <= SMA_PROXIMITY_PCT;

  // ── Multi-bar confluence: did we pull back for 2+ bars? ──────
  // Look at the last 5 bars — count bars where close < smaArr value
  let pullbackBars = 0;
  for (let i = last - 4; i < last; i++) {
    if (i >= 0 && smaArr[i] != null && ohlcv[i].close < smaArr[i]) pullbackBars++;
  }
  const hadPullback = pullbackBars >= 1;

  // ── Suggested entry, stop, target ──────────────────────────
  const suggestedEntry  = today.close;
  const suggestedStop   = parseFloat((smaToday * (1 - CONFIG.STOP_LOSS_PCT)).toFixed(2));
  const suggestedTarget = parseFloat((suggestedEntry * (1 + CONFIG.TARGET_PCT)).toFixed(2));
  const riskReward      = ((suggestedTarget - suggestedEntry) /
                           (suggestedEntry  - suggestedStop)).toFixed(2);

  // ── STATUS logic ────────────────────────────────────────────
  let status, message, actionable;

  if (!inUptrend) {
    status     = 'WAIT';
    message    = '44 SMA is falling (downtrend). Skip — no longs against trend.';
    actionable = false;
  } else if (!closedAbove) {
    status     = 'BELOW_SMA';
    message    = `Price closed BELOW 44 SMA (${smaToday.toFixed(2)}). Wait for reclaim.`;
    actionable = false;
  } else if (closedAbove && lowTouched && isBullish && inUptrend) {
    status     = 'ENTRY_NOW';
    message    = '✅ SMA support bounce confirmed. Bullish candle on SMA touch. Enter at tomorrow\'s open.';
    actionable = true;
  } else if (closedAbove && lowNear && isBullish && inUptrend) {
    status     = 'ENTRY_NOW';
    message    = '✅ Price near SMA support with bullish close. Strong setup — enter at tomorrow\'s open.';
    actionable = true;
  } else if (closedAbove && (closeNear || yesterdayNearSMA) && inUptrend) {
    status     = 'NEAR_SUPPORT';
    message    = '👀 Price approaching 44 SMA support. Watch for bullish candle tomorrow to confirm.';
    actionable = false;
  } else if (hadPullback && closedAbove && inUptrend) {
    status     = 'NEAR_SUPPORT';
    message    = '👀 Multi-bar pullback detected. Waiting for price to reach SMA and form bullish candle.';
    actionable = false;
  } else {
    status     = 'WAIT';
    message    = `Price is ${(distClose * 100).toFixed(1)}% above SMA. Too extended — wait for pullback to SMA.`;
    actionable = false;
  }

  return {
    status,
    message,
    actionable,
    latest: {
      date      : today.date,
      open      : parseFloat(today.open.toFixed(2)),
      high      : today.high,
      low       : today.low,
      close     : parseFloat(today.close.toFixed(2)),
      sma44     : parseFloat(smaToday.toFixed(2)),
      smaSlope  : smaSlope ? `${smaSlope}%` : 'N/A',
      distFromSMA: `${(distClose * 100).toFixed(2)}%`,
      isBullish,
      inUptrend,
    },
    trade: actionable ? {
      entryAt : `₹${suggestedEntry.toFixed(2)} (tomorrow open)`,
      stopLoss: `₹${suggestedStop}  (${(CONFIG.STOP_LOSS_PCT * 100)}% below SMA)`,
      target  : `₹${suggestedTarget} (+${(CONFIG.TARGET_PCT * 100)}%)`,
      riskReward: `1 : ${riskReward}`,
      entryAtValue : parseFloat(suggestedEntry.toFixed(2)),
      stopLossValue: parseFloat(suggestedStop.toFixed(2)),
      targetValue  : parseFloat(suggestedTarget.toFixed(2)),
    } : null,
  };
}
