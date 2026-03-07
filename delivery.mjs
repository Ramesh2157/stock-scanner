/**
 * delivery.mjs — NSE Delivery Swing Scanner Entry Point
 * ------------------------------------------------------
 * Scans the stocks in DELIVERY_STOCKS (src/config.mjs) using
 * daily candles and finds 15-20 day swing trade setups based on
 * EMA20/EMA50 trend, pullback to support, and volume confirmation.
 *
 * Run:  node delivery.mjs
 *
 * Edit the stock list and parameters in src/config.mjs
 * under the DELIVERY_STOCKS / DELIVERY_CONFIG sections.
 */

import { runDeliveryScan } from './src/deliveryScanner.mjs';

runDeliveryScan().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
