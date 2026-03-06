/**
 * demo.mjs — Offline demo using synthetic OHLCV data.
 *
 * Runs the full backtest pipeline without network access.
 * Useful for CI, local development, and strategy validation.
 *
 * Run:  node demo.mjs
 */

import { runScreener }  from './src/screener.mjs';
import { runBacktest }  from './src/backtester.mjs';
import { printReport }  from './src/reporter.mjs';
import { CONFIG }       from './src/config.mjs';

// ── Synthetic data generator ──────────────────────────────────
/**
 * Generates a realistic random-walk OHLCV dataset.
 * Injects deliberate SMA crossover signals to ensure testability.
 *
 * @param {number} bars - Number of trading days
 * @returns {Array}     - OHLCV candle array
 */
function generateSyntheticOHLCV(bars = 500) {
  const candles = [];
  let   price   = 2000;              // starting price (like a mid-cap NSE stock)
  const start   = new Date('2022-01-03');

  // Phase manager: alternate bear/bull cycles to create real crossovers
  let   trendDir   = 1;
  let   phaseLen   = 0;
  let   phaseCount = 0;

  for (let i = 0; i < bars; i++) {
    // Shift trend every ~60-80 bars
    if (phaseLen <= 0) {
      trendDir   = phaseCount % 3 === 2 ? -1 : 1;  // every 3rd phase is a dip
      phaseLen   = 50 + Math.floor(Math.random() * 40);
      phaseCount++;
    }
    phaseLen--;

    // Daily drift: trend-biased random walk
    const drift  = trendDir * 0.0008;
    const noise  = (Math.random() - 0.5) * 0.025;
    const change = drift + noise;

    const close  = parseFloat((price * (1 + change)).toFixed(2));
    const spread = price * 0.012;
    const high   = parseFloat((Math.max(close, price) + Math.random() * spread).toFixed(2));
    const low    = parseFloat((Math.min(close, price) - Math.random() * spread).toFixed(2));
    // Make ~60% of candles bullish
    const bullish = Math.random() < 0.60;
    const open    = parseFloat((bullish
      ? low + Math.random() * (close - low)
      : close + Math.random() * (high - close)
    ).toFixed(2));

    // Advance date by 1 trading day (skip weekends)
    const date = new Date(start);
    date.setDate(start.getDate() + i + Math.floor(i / 5) * 2);

    candles.push({ date, open, high, low, close, volume: Math.floor(Math.random() * 1e6) });
    price = close;
  }

  return candles;
}

// ── Main ──────────────────────────────────────────────────────
async function runDemo() {
  console.log('═'.repeat(60));
  console.log('  DEMO MODE — Synthetic OHLCV Data');
  console.log('  (No network required)');
  console.log('═'.repeat(60));

  const symbols = ['DEMO_STOCK_A', 'DEMO_STOCK_B'];

  for (const symbol of symbols) {
    const ohlcv = generateSyntheticOHLCV(500);
    console.log(`\n▶ ${symbol}: Generated ${ohlcv.length} synthetic candles`);

    // Market cap check (synthetic — always passes)
    const marketCapOk = true;

    const signals = runScreener(ohlcv, marketCapOk);
    const signalCount = signals.filter(s => s.signal).length;
    console.log(`  ✓ Screener found ${signalCount} entry signals`);

    const result = runBacktest(ohlcv, signals);
    console.log(`  ✓ Backtest complete — ${result.trades.length} trades`);

    printReport(symbol, result);
  }

  console.log('═'.repeat(60));
  console.log('  Demo complete. Run `node index.mjs` for live Yahoo data.');
  console.log('═'.repeat(60));
}

runDemo();
