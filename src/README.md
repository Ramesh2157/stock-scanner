# Quant Backtesting Engine — SMA-44 Crossover Strategy

A production-grade Node.js (ES Module) screener and backtester for NSE stocks.

## Strategy

| # | Condition |
|---|-----------|
| 1 | Today's close > 44-day SMA |
| 2 | Yesterday's close ≤ Yesterday's 44-day SMA (fresh crossover) |
| 3 | Today's close > Today's open (bullish candle) |
| 4 | SMA-44 today > SMA-44 sixty days ago (uptrend confirmed) |
| 5 | Market Cap > ₹2,000 crore |

**Trade Management**
- Entry  : Close price on signal day
- Stop   : 5% below entry
- Target : 10% above entry
- Time   : Exit after 10 trading days (whichever hits first)
- One position at a time — no overlap

---

## Project Structure

```
quant-screener/
├── index.mjs            ← Main entry (live Yahoo Finance data)
├── demo.mjs             ← Offline demo with synthetic data
└── src/
    ├── config.mjs       ← All strategy & engine parameters
    ├── dataFetcher.mjs  ← Yahoo Finance data layer
    ├── indicators.mjs   ← SMA calculation (technicalindicators)
    ├── screener.mjs     ← 5-condition signal engine
    ├── backtester.mjs   ← Event-driven backtest loop
    ├── metrics.mjs      ← Performance metric calculations
    └── reporter.mjs     ← Console report + sparkline + trade log
```

---

## Setup

```bash
npm install
```

## Run

```bash
# Live data from Yahoo Finance (requires internet)
node index.mjs

# Offline demo with synthetic data (no internet needed)
node demo.mjs
```

---

## Configuration (`src/config.mjs`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `SMA_PERIOD` | 44 | SMA lookback window |
| `SMA_TREND_LOOKBACK` | 60 | Days back to compare SMA for uptrend |
| `MIN_MARKET_CAP_CRORE` | 2000 | Minimum market cap filter |
| `STOP_LOSS_PCT` | 0.05 | 5% stop loss |
| `TARGET_PCT` | 0.10 | 10% profit target |
| `TIME_EXIT_DAYS` | 10 | Max holding period (trading days) |
| `INITIAL_CAPITAL` | 1,000,000 | Starting capital for equity curve |

---

## Output Metrics

- Total trades, win rate, wins/losses
- Average return, average win, average loss
- **Profit Factor** = gross wins / gross losses
- **Max Drawdown** from equity curve peak
- **Approx Sharpe** (per-trade return / std dev)
- Exit breakdown (STOP / TARGET / TIME)
- ASCII equity sparkline
- Full trade log

---

## Dependencies

- [`yahoo-finance2`](https://www.npmjs.com/package/yahoo-finance2) — Historical OHLCV data
- [`technicalindicators`](https://www.npmjs.com/package/technicalindicators) — SMA calculation

---

## Adding Symbols

Edit `SYMBOLS` array in `src/config.mjs`:

```js
export const SYMBOLS = [
  'RELIANCE.NS',
  'TCS.NS',
  'INFY.NS',
  // add more NSE symbols with .NS suffix
];
```
