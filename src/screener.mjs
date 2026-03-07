/**
 * screener.mjs — Signal generation engine.
 *
 * Evaluates all 5 strategy conditions on every bar and
 * returns a signal-annotated array aligned with the candle array.
 *
 * STRATEGY CONDITIONS:
 *  1. Today's close > 44-day SMA
 *  2. Yesterday's close <= Yesterday's 44-day SMA  (fresh crossover)
 *  3. Today's close > Today's open                 (bullish candle)
 *  4. 44 SMA today > 44 SMA 60 days ago            (uptrend)
 *  5. Market Cap > 2000 crore                      (checked externally; passed in)
 */

import { buildAlignedSMA } from './indicators.mjs';
import { CONFIG }          from '../config.mjs';

/**
 * Run the screener over the full OHLCV dataset.
 *
 * @param {Array}   ohlcv          - Candle array (oldest → newest)
 * @param {boolean} marketCapOk    - Has market cap filter already passed?
 * @returns {Array<{
 *   index   : number,
 *   date    : Date,
 *   signal  : boolean,
 *   close   : number,
 *   sma     : number|null,
 *   reasons : string[],       // which conditions failed (for debug)
 * }>}
 */
export function runScreener(ohlcv, marketCapOk = true) {
  const { SMA_PERIOD, SMA_TREND_LOOKBACK } = CONFIG;

  // Extract close prices for SMA calculation
  const closes = ohlcv.map(c => c.close);

  // Build aligned SMA array (null for first SMA_PERIOD-1 bars)
  const smaArr = buildAlignedSMA(closes, SMA_PERIOD);

  const results = [];

  for (let i = 0; i < ohlcv.length; i++) {
    const today     = ohlcv[i];
    const yesterday = ohlcv[i - 1];  // undefined for i=0

    const smaToday     = smaArr[i];
    const smaYesterday = i > 0 ? smaArr[i - 1] : null;
    const smaTrendRef  = i >= SMA_TREND_LOOKBACK ? smaArr[i - SMA_TREND_LOOKBACK] : null;

    // Evaluate each condition independently for transparency
    const c1 = smaToday     != null && today.close > smaToday;
    const c2 = smaYesterday != null && yesterday  != null &&
               yesterday.close <= smaYesterday;
    const c3 = today.close > today.open;
    const c4 = smaToday != null && smaTrendRef != null &&
               smaToday > smaTrendRef;
    const c5 = marketCapOk;   // pre-validated by caller

    const signal  = c1 && c2 && c3 && c4 && c5;
    const reasons = [];
    if (!c1) reasons.push('C1:close<=SMA');
    if (!c2) reasons.push('C2:no-crossover');
    if (!c3) reasons.push('C3:bearish-candle');
    if (!c4) reasons.push('C4:downtrend');
    if (!c5) reasons.push('C5:mktcap');

    results.push({
      index    : i,
      date     : today.date,
      signal,
      close    : today.close,
      open     : today.open,
      sma      : smaToday,
      smaTrend : smaTrendRef,
      reasons,
    });
  }

  return results;
}
