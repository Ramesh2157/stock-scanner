import express from "express";
import axios from "axios";
import { parse } from "csv-parse/sync";

import { insertMany, insertOne } from "./insertModule.js";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

const app = express();
const PORT = 3000;

// NSE requires proper headers
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/",
  Connection: "keep-alive",
};

// Create axios instance
const nse = axios.create({
  baseURL: "https://www.nseindia.com",
  headers,
  timeout: 10000,
});

// Helper function to establish session
async function initializeSession() {
  try {
    await nse.get("/");
  } catch (err) {
    console.error("Session init failed:", err.message);
  }
}

// API Route
app.get("/api/nifty500", async (req, res) => {
  try {
    await initializeSession();

    const response = await nse.get(
      "/api/equity-stockIndices?index=NIFTY%20500"
    );

    const stocks = response.data?.data || [];

    const symbols = stocks.map((stock) => stock.symbol);
    const symbolsMany = [];
   for (const stock of stocks) {
     try {
      symbolsMany.push({
          stock_name : stock.meta.companyName,
          symbol_name : stock.meta.symbol,
          segment : stock.meta.segment,
          exchange_type : "NSE",
          industry_sector : stock.meta.industry
      })
       } catch (err) {
       console.error(`  ✗ Error fetch ${stock}: ${err.message}`);
       
     }
   }
 
      // const symbols = {
      //   stock_name: "trial",
      //   exchange_type: "NSE",
      //   symbol_name: "test",
      // };
    // symbolsMany = [{
    //     stock_name: "trial",
    //     exchange_type: "NSE",
    //     symbol_name: "test",
    //   },
    //  {
    //     stock_name: "trial2",
    //     exchange_type: "NSE",
    //     symbol_name: "test",
    //   },{
    //     stock_name: "trial3",
    //     exchange_type: "NSE",
    //     symbol_name: "test",
    //   }];
      // await insertOne("stock_symbols",symbols);
      await insertMany("stock_symbols",symbolsMany);
      return res.json({
      success: true,
      count: symbols.length,
      // symbols,
      // stocks
      stock:symbolsMany[0]
    });
  } catch (error) {
    console.error("Error fetching NIFTY 500:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch NIFTY 500 data",
    });
  }
});

app.get("/api/all-stocks", async (req, res) => {
  try {
    const response = await axios.get(
      "https://archives.nseindia.com/content/equities/EQUITY_L.csv",
      {
        responseType: "text",
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    // Parse CSV
    const records = parse(response.data, {
      columns: true,
      skip_empty_lines: true,
    });

    const stocks = records.map((row) => ({
      symbol: row.SYMBOL,
      name: row.NAME_OF_COMPANY,
      series: row.SERIES,
      isin: row.ISIN_NUMBER,
    }));
    const symbols = stocks.map((stock) => stock.symbol + '.NS');


//  const stocks = response.data?.data || [];

//     const rows = stocks.map((stock) => stock.symbol);
    const symbolsMany = [];
   for (const symbol of symbols) {
     try {
      const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ['price', 'assetProfile'],
    });
      symbolsMany.push({
          stock_name : summary.price.longName,
          symbol_name : symbol.split('.NS')[0],
          segment : summary.price.quoteType,
          exchange_type : summary.price.exchangeName,
          industry_sector : summary.assetProfile.sector
      })
       } catch (err) {
       console.error(`  ✗ Error fetch ${symbol}: ${err.message}`);
       
     }
   }

   console.log(symbolsMany);
   

// const { error } = await supabase
//     .from("candle_history")
//     .upsert(rows, { onConflict: "symbol_id,date" });
    res.json({
      success: true,
      // records
      symbolsMany
      // count: stocks.length,
      // data: stocks,
      // symbols
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// import puppeteer from "puppeteer";

// async function getChartinkList() {
//   const url = "https://chartink.com/screener/support-on-44-ma-1";
//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();

//   await page.goto(url, { waitUntil: "networkidle2" });

//   // Wait for the table of results to load
//   await page.waitForSelector("table");

//   // Extract stock symbols from table rows
//   const stocks = await page.evaluate(() => {
//     const rows = Array.from(document.querySelectorAll("table tbody tr"));
//     return rows.map(r => {
//       const symbolCell = r.querySelector("td:nth-child(1)");
//       return symbolCell ? symbolCell.innerText.trim() : null;
//     }).filter(Boolean);
//   });

//   await browser.close();
//   return stocks;
// }

// getChartinkList().then(list => {
//   console.log("Stocks:", list);
// });

// Health check
app.get("/", (req, res) => {
  res.send("NIFTY 500 API running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});