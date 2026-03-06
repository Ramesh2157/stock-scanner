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

import { fetchOHLCV } from "./src/dataFetcher.mjs";
import { runScreener } from "./src/screener.mjs";
import { getStockDetails } from "./src/getDetails.mjs";
import { runBacktest } from "./src/backtester.mjs";
import { printReport, printLiveSignal } from "./src/reporter.mjs";
import { getLiveSignal } from "./src/liveSignal.mjs";
import { CONFIG } from "./src/config.mjs";
// import { SYMBOLS }               from './src/config.mjs';

import fs from "fs";
import { pushStockDetails } from "./src/push.mjs";
import { sendTelegramMessage } from "./src/telegramAlert.mjs";
import { insertMany, insertOne } from "./src/insertModule.js";

const SYMBOLS = JSON.parse(fs.readFileSync("./assests/nifty500.json", "utf-8"));

// const SYMBOLS = JSON.parse(
//   fs.readFileSync("./assests/allstock.json", "utf-8")
// );

// ── Main orchestrator ─────────────────────────────────────────
async function main() {
  console.log("═".repeat(60));
  console.log("  QUANT BACKTESTING ENGINE — SMA-44 Strategy");
  console.log("═".repeat(60));
  // console.log(`  Symbols : ${SYMBOLS.symbolsNS.join(', ')}`);
  console.log(`  SL      : ${CONFIG.STOP_LOSS_PCT * 100}%`);
  console.log(`  Target  : ${CONFIG.TARGET_PCT * 100}%`);
  console.log(`  Time SL : ${CONFIG.TIME_EXIT_DAYS} trading days`);
  console.log("═".repeat(60) + "\n");

  // ── Summary table for live signals (printed at end) ─────────
  const liveTable = [];
      const symbols = {
        stock_name: "trial",
        exchange_type: "NSE",
        symbol_name: "test",
      };
            const symbolsMany = [{
        stock_name: "trial",
        exchange_type: "NSE",
        symbol_name: "test",
      },
    {
        stock_name: "trial2",
        exchange_type: "NSE",
        symbol_name: "test",
      },{
        stock_name: "trial3",
        exchange_type: "NSE",
        symbol_name: "test",
      }];
      // await insertOne("stock_symbols",symbols);
      await insertMany("stock_symbols",symbolsMany);
      return
  for (const symbol of SYMBOLS.symbolsNS) {
    try {

      // 1. Fetch historical OHLCV data
      const ohlcv = await fetchOHLCV(symbol, CONFIG.LOOKBACK_DAYS);

      const liveSignal = getLiveSignal(ohlcv);

      if (liveSignal.status != "ENTRY_NOW") {
        continue;
      }
      const details = await getStockDetails(symbol);

      console.log(`\n▶ Processing: ${symbol}`);
      if (!ohlcv || ohlcv.length < CONFIG.SMA_PERIOD + 60) {
        console.warn(`  ⚠  Insufficient data for ${symbol} — skipping.`);
        continue;
      }
      console.log(`  ✓ Fetched ${ohlcv.length} candles`);

      // 2. Run screener (historical signals for backtest)
      const signals = runScreener(ohlcv);
      const signalCount = signals.filter((s) => s.signal).length;
      console.log(`  ✓ Screener found ${signalCount} historical entry signals`);

      // 3. Backtest
      const result = runBacktest(ohlcv, signals);
      console.log(
        `  ✓ Backtest complete — ${result.trades.length} trades executed`,
      );

      // 4. Performance report
      printReport(symbol, result);

      // 5. Live next-entry signal on SMA-44 support

      printLiveSignal(symbol, liveSignal);

      // Collect for final summary table
      liveTable.push({
        symbol,
        name: details.name,
        trade: liveSignal.trade,
        status: liveSignal.status,
        sma44: liveSignal.latest?.sma44,
        close: liveSignal.latest?.close,
        open: liveSignal.latest?.open,
        dist: liveSignal.latest?.distFromSMA,
      });
    } catch (err) {
      console.error(`  ✗ Error processing ${symbol}: ${err.message}`);
      if (CONFIG.DEBUG) console.error(err.stack);
    }
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
        "Dist",
    );
    console.log("  " + "─".repeat(58));
    let screenerResults = [];
    // [{
    //   Date: "Date" ,
    //   name: "Name",
    //         symbol: "Symbol",
    //         status:"Status",
    //         close: "Close" ,
    //         sma44:"sma44" ,
    //         dist:"Dist"
    // }]
    for (const row of liveTable) {
      const badge =
        {
          ENTRY_NOW: "🟢 ENTRY NOW  ",
          NEAR_SUPPORT: "🟡 NEAR SUPPRT",
          WAIT: "⚪ WAIT       ",
          BELOW_SMA: "🔴 BELOW SMA  ",
        }[row.status] ?? row.status.padEnd(14);

      console.log(
        "  " +
          row.name?.padEnd(16) +
          "  " +
          row.symbol?.padEnd(16) +
          badge.padEnd(18) +
          String(row.close ?? "-").padEnd(10) +
          String(row.sma44 ?? "-").padEnd(10) +
          (row.dist ?? "-"),
      );
      const stock = {
        name: row.name,
        symbol: row.symbol,
        status: badge,
        open: row.open ?? "-",
        close: row.close ?? "-",
        sma44: row.sma44 ?? "-",
        dist: row.dist ?? "-",
        riskReward: row.trade?.riskReward,
        entryAtValue: row.trade?.entryAtValue,
        stopLossValue: row.trade?.stopLossValue,
        targetValue: row.trade?.targetValue,
      };
      screenerResults.push(stock);
      // sendTelegramMessage(stock)
    }

    // pushStockDetails(screenerResults)

    console.log("═".repeat(60));
  }

  console.log("\n  Engine run complete.\n");
}

main();
