/**
 * backtester.mjs — Event-driven backtesting engine.
 *
 * Rules:
 *  - Entry  : at the closing price on signal day
 *  - Stop   : entry × (1 - STOP_LOSS_PCT)
 *  - Target : entry × (1 + TARGET_PCT)
 *  - Time   : exit at close after TIME_EXIT_DAYS trading days
 *  - Only one open position at a time (no overlapping trades)
 *
 * Returns a BacktestResult object consumed by reporter.mjs.
 */

import { CONFIG } from '../../config.mjs';

// ── Types (JSDoc) ─────────────────────────────────────────────
/**
 * @typedef {Object} Trade
 * @property {Date}   entryDate
 * @property {number} entryPrice
 * @property {Date}   exitDate
 * @property {number} exitPrice
 * @property {string} exitReason  - 'TARGET' | 'STOP' | 'TIME'
 * @property {number} returnPct   - decimal e.g. 0.07 = 7%
 * @property {number} pnl         - absolute PnL in currency units
 */

/**
 * @typedef {Object} BacktestResult
 * @property {Trade[]}  trades
 * @property {number[]} equityCurve  - capital after each trade (index-aligned)
 * @property {number}   initialCapital
 */

/**
 * Run the backtest simulation.
 *
 * @param {Array}  ohlcv    - Candle array (oldest → newest)
 * @param {Array}  signals  - Output of runScreener()
 * @returns {BacktestResult}
 */
export function runBacktest(ohlcv, signals) {
  const {
    STOP_LOSS_PCT,
    TARGET_PCT,
    TIME_EXIT_DAYS,
    INITIAL_CAPITAL,
  } = CONFIG;

  const trades       = [];
  let   capital      = INITIAL_CAPITAL;
  const equityCurve  = [INITIAL_CAPITAL];  // starts at initial

  let   inTrade      = false;
  let   entryPrice   = 0;
  let   entryIndex   = -1;
  let   entryDate    = null;
  let   stopLevel    = 0;
  let   targetLevel  = 0;

  // Simulate bar by bar
  for (let i = 0; i < ohlcv.length; i++) {
    const bar = ohlcv[i];

    // ── Manage open position ─────────────────────────────────
    if (inTrade) {
      const barsHeld = i - entryIndex;

      // Check exit conditions in priority: Stop → Target → Time
      let exitPrice  = null;
      let exitReason = null;

      // Stop loss hit (use low of the bar as proxy for intra-day touch)
      if (bar.low <= stopLevel) {
        exitPrice  = stopLevel;   // assume execution at stop level
        exitReason = 'Stop loss hit';
      }
      // Target hit
      else if (bar.high >= targetLevel) {
        exitPrice  = targetLevel;
        exitReason = 'Target hit';
      }
      // Time-based exit (after TIME_EXIT_DAYS bars have elapsed)
      else if (barsHeld >= TIME_EXIT_DAYS) {
        exitPrice  = bar.close;
        exitReason = `${TIME_EXIT_DAYS} after exit.`;
      }

      if (exitPrice !== null) {
        // Close the trade
        const returnPct = (exitPrice - entryPrice) / entryPrice;
        const pnl       = capital * returnPct;  // fully invested for simplicity

        trades.push({
          entryDate,
          entryPrice,
          exitDate   : bar.date,
          exitPrice,
          exitReason,
          returnPct,
          pnl,
        });

        capital     += pnl;
        inTrade      = false;
        entryIndex   = -1;

        equityCurve.push(parseFloat(capital.toFixed(2)));
      }

      continue; // don't check for new entry while in trade (or same bar after exit)
    }

    // ── Check for new entry signal ───────────────────────────
    if (!inTrade && signals[i]?.signal) {
      entryPrice   = bar.close;
      entryDate    = bar.date;
      entryIndex   = i;
      stopLevel    = entryPrice * (1 - STOP_LOSS_PCT);
      targetLevel  = entryPrice * (1 + TARGET_PCT);
      inTrade      = true;
    }
  }

  // Force-close any open trade at end of data (mark-to-market)
  if (inTrade) {
    const lastBar   = ohlcv[ohlcv.length - 1];
    const returnPct = (lastBar.close - entryPrice) / entryPrice;
    const pnl       = capital * returnPct;

    trades.push({
      entryDate,
      entryPrice,
      exitDate   : lastBar.date,
      exitPrice  : lastBar.close,
      exitReason : 'End of data',     // End of data
      returnPct,
      pnl,
    });

    capital += pnl;
    equityCurve.push(parseFloat(capital.toFixed(2)));
  }

  return { trades, equityCurve, initialCapital: INITIAL_CAPITAL };
}
