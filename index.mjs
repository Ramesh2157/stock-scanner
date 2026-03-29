/**
 * ============================================================
 * QUANT BACKTESTING ENGINE — Main Entry Point
 * ============================================================
 * Strategy: SMA-44 Crossover with Uptrend Filter
 * Live Signal: Next entry on SMA-44 support with bullish candle
 *
 * Run:  node index.mjs
 * ============================================================
 */

import { fetchOHLCV }                    from "./src/stockData/dataFetcher.mjs";
import { runScreener }                   from "./src/screener.mjs";
import { getStockDetails }               from "./src/getDetails.mjs";
import { runBacktest }                   from "./src/calculations/backtester.mjs";
import { printReport, printLiveSignal }  from "./src/reporter.mjs";
import { getLiveSignal }                 from "./src/liveSignal.mjs";
import { CONFIG, SYMBOLS }               from "./config.mjs";

import fs                                from "fs";
import { pushStockDetails }              from "./src/googleSheet/push.mjs";
import { sendTelegramMessage }           from "./src/Alerts/telegramAlert.mjs";
import { insertMany, insertOne }         from "./src/insertModule.js";
import { getAllStockList } from "./src/Services/stockSymbols.mjs";
import { storeCandles } from "./src/Services/candleHistory.js";
import { storeFilterStocks } from "./src/Services/filterStocks.js";
import { storeBackTestData } from "./src/Services/backtestData.js";
import { exitIfMarketClosed } from "./src/stockData/isMarketOpen.mjs";

// const SYMBOLS_LIST = JSON.parse(fs.readFileSync("./assests/nifty500.json", "utf-8"));
// const SYMBOLS_LIST = JSON.parse(fs.readFileSync("./assests/allstock.json", "utf-8"));

// ── Rate-limit helper ─────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Main orchestrator ─────────────────────────────────────────
async function main() {
   await exitIfMarketClosed(); 

  console.log("═".repeat(60));
  console.log("  QUANT BACKTESTING ENGINE — SMA-44 Strategy");
  console.log("═".repeat(60));
  console.log(`  SL      : ${CONFIG.STOP_LOSS_PCT * 100}%`);
  console.log(`  Target  : ${CONFIG.TARGET_PCT * 100}%`);
  console.log(`  Time SL : ${CONFIG.TIME_EXIT_DAYS} trading days`);
  console.log(`  Delay   : ${CONFIG.DELAY_BETWEEN_SYMBOLS_MS / 1000}s between symbols (rate-limit guard)`);
  console.log("═".repeat(60) + "\n");

  const SYMBOLS = await getAllStockList()

  // ── Summary table for live signals (printed at end) ─────────
  const liveTable = [];
  let backTestData = [];

  for (let i = 0; i < SYMBOLS.symbolsNS.length; i++) {
    const symbol = SYMBOLS.symbolsNS[i];

    // ── Polite gap between symbols to avoid 429 bursts ────────
    // Skip delay for the very first symbol
    if (i > 0) {
      process.stdout.write(
        `  ⏳ Waiting ${CONFIG.DELAY_BETWEEN_SYMBOLS_MS / 1000}s before next symbol...\r`
      );
      await sleep(CONFIG.DELAY_BETWEEN_SYMBOLS_MS);
      process.stdout.write(" ".repeat(55) + "\r"); // clear the line
    }

    try {
      // 1. Fetch historical OHLCV data
      const ohlcv = await fetchOHLCV(symbol, CONFIG.LOOKBACK_DAYS);

      // 2. Check live signal FIRST — skip non-entry symbols early
      //    (avoids calling getStockDetails for every symbol)
      const liveSignal = getLiveSignal(ohlcv);

      if (liveSignal.status !== "ENTRY_NOW") {
        console.log(`  ↷  [${i + 1}/${SYMBOLS.symbolsNS.length}] ${symbol} — ${liveSignal.status} (skipped)`);
        continue;
      }

      const symbolRow = SYMBOLS.result.find((s)=>s.symbolNS === symbol)

      await storeCandles(symbolRow,ohlcv)
      // 3. Entry signal found — fetch details and run full analysis
      console.log(`\n▶ [${i + 1}/${SYMBOLS.symbolsNS.length}] Processing: ${symbol}`);
      if (!ohlcv || ohlcv.length < CONFIG.SMA_PERIOD + 60) {
        console.warn(`  ⚠  Insufficient data for ${symbol} — skipping.`);
        continue;
      }
      console.log(`  ✓ Fetched ${ohlcv.length} candles`);

      const details = await getStockDetails(symbol);

      // 4. Run screener (historical signals for backtest)
      const signals     = runScreener(ohlcv);
      const signalCount = signals.filter((s) => s.signal).length;
      console.log(`  ✓ Screener found ${signalCount} historical entry signals`);

      // 5. Backtest
      const result = runBacktest(ohlcv, signals);
      console.log(`  ✓ Backtest complete — ${result.trades.length} trades executed`);

      // 6. Performance report
      printReport(symbol, result);

      const backTestDataTrade =  result.trades.map(t => ({
        symbol_id:symbolRow.id,
        entry_date: t.entryDate.toISOString().split("T")[0],
        exit_date: t.exitDate.toISOString().split("T")[0],
        entry_price :t.entryPrice.toFixed(2),
        exit_price: t.exitPrice.toFixed(2),
        return : (t.returnPct * 100).toFixed(2) + '%',
        exit_reason:t.exitReason
      }));

      backTestData = [...backTestData,...backTestDataTrade]

      // 7. Live next-entry signal
      printLiveSignal(symbol, liveSignal);

      // 8. Collect for final summary table

      liveTable.push({
        symbolRow,
        symbol,
        name          : details.name,
        trade         : liveSignal.trade,
        status        : liveSignal.status,
        sma44         : liveSignal.latest?.sma44,
        close         : liveSignal.latest?.close,
        open          : liveSignal.latest?.open,
        dist          : liveSignal.latest?.distFromSMA,
      });

    } catch (err) {
      console.log(err);
      console.error(`  ✗ Error processing ${symbol}: ${err.message}`);
      if (CONFIG.DEBUG) console.error(err.stack);
    }
  }

  // ── Final back test data table ─────────────────────────  
  if (backTestData.length > 0) {
    await storeBackTestData(backTestData)
  }
  // ── Final live-signal summary table ─────────────────────────
  if (liveTable.length > 0) {
    console.log("\n" + "═".repeat(60));
    console.log("  📊 LIVE SIGNAL SUMMARY TABLE");
    console.log("═".repeat(60));
    console.log(
      "  " +
        "Name".padEnd(16) +
        "Symbol".padEnd(16) +
        "Status".padEnd(18) +
        "Close".padEnd(10) +
        "SMA-44".padEnd(10) +
        "Dist"
    );
    console.log("  " + "─".repeat(58));

    let screenerResults = [];

    for (const row of liveTable) {      
      const badge =
        {
          ENTRY_NOW    : "🟢 ENTRY NOW  ",
          NEAR_SUPPORT : "🟡 NEAR SUPPRT",
          WAIT         : "⚪ WAIT       ",
          BELOW_SMA    : "🔴 BELOW SMA  ",
        }[row.status] ?? row.status.padEnd(14);

      console.log(
        "  " +
          row.name?.padEnd(16) +
          "  " +
          row.symbol?.padEnd(16) +
          badge.padEnd(18) +
          String(row.close ?? "-").padEnd(10) +
          String(row.sma44 ?? "-").padEnd(10) +
          (row.dist ?? "-")
      );

      const stock = {
        name          : row.name,
        symbol        : row.symbol,
        symbol_id     : row.symbolRow.id,
        status        : badge,
        open          : row.open          ?? "-",
        close         : row.close         ?? "-",
        sma44         : row.sma44         ?? "-",
        dist          : row.dist          ?? "-",
        riskReward    : row.trade?.riskReward,
        entryAtValue  : row.trade?.entryAtValue,
        stopLossValue : row.trade?.stopLossValue,
        targetValue   : row.trade?.targetValue,
      };
      screenerResults.push(stock);
      sendTelegramMessage(stock)
    }
    await storeFilterStocks(screenerResults)
    
    await pushStockDetails(screenerResults)

    console.log("═".repeat(60));
  }

  console.log("\n  Engine run complete.\n");
}

import cron from "node-cron";

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '40 15 * * *';

console.log("Using cron:", CRON_SCHEDULE);

cron.schedule(CRON_SCHEDULE, () => {
  console.log(`Running task at ${new Date().toISOString()}`);
  main();
});

import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('App running');
  main();
});

app.listen(3000, () => {
  console.log('Server started');
});