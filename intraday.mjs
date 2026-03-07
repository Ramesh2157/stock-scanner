/**
 * intraday.mjs — NSE Intraday Scanner Entry Point
 * ------------------------------------------------
 * Scans the stocks in INTRADAY_STOCKS (src/config.mjs) using
 * 5-minute candles and ranks them by LONG / SHORT / AVOID signal.
 *
 * Run:  node intraday.mjs
 *
 * Edit the stock list and parameters in src/config.mjs
 * under the INTRADAY_STOCKS / INTRADAY_CONFIG sections.
 */

import { runIntradayScan } from './src/intradayScanner.mjs';

runIntradayScan().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
