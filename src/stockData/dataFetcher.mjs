/**
 * dataFetcher.mjs — Yahoo Finance data acquisition layer.
 *
 * Uses yahoo-finance2 v3+ which requires class instantiation:
 *   const yahooFinance = new YahooFinance();
 *
 * Each returned candle:
 * {
 *   date   : Date,
 *   open   : number,
 *   high   : number,
 *   low    : number,
 *   close  : number,
 *   volume : number,
 * }
 */

// import { YahooFinance } from 'yahoo-finance2';


import YahooFinance from "yahoo-finance2";

// const yahooFinance = new YahooFinance();
// v3 breaking change: must instantiate before calling any method
const yahooFinance = new YahooFinance();

/**
 * Fetch OHLCV history for a symbol.
 *
 * @param {string} symbol       - Yahoo Finance ticker, e.g. "RELIANCE.NS"
 * @param {number} lookbackDays - Calendar days to look back from today
 * @returns {Promise<Array>}    - Normalised candle array (asc date order)
 */
export async function fetchOHLCV(symbol, lookbackDays = 800) {
  const toDate   = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - lookbackDays);

  // chart() returns split/dividend-adjusted OHLCV
  const result = await yahooFinance.chart(symbol, {
    period1  : fromDate,
    period2  : toDate,
    interval : '1d',
  });

  if (!result?.quotes || result.quotes.length === 0) {
    throw new Error(`No data returned for symbol: ${symbol}`);
  }

  // Normalise — filter out any incomplete bars (e.g. partial trading day)
  const candles = result.quotes
    .filter(q =>
      q.date   != null &&
      q.open   != null &&
      q.high   != null &&
      q.low    != null &&
      q.close  != null &&
      q.volume != null
    )
    .map(q => ({
      date  : new Date(q.date),
      open  : q.open,
      high  : q.high,
      low   : q.low,
      close : q.close,
      volume: q.volume,
    }))
    // Ensure oldest-first order
    .sort((a, b) => a.date - b.date);

  return candles;
}

/**
 * Fetch fundamental metadata (marketCap) for a symbol.
 * Used to enforce market cap > 2000 crore filter.
 *
 * Falls back gracefully — if the call fails, marketCap is null
 * and the caller should decide whether to skip or proceed.
 *
 * @param {string} symbol
 * @returns {Promise<{ marketCap: number|null, name: string }>}
 */
export async function fetchFundamentals(symbol) {
  try {
    // quoteSummary with 'price' module is the v3-compatible way to get marketCap
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ['price'],
    });
    const price = summary?.price ?? {};
    return {
      summary,
      marketCap: price.marketCap ?? null,   // absolute INR for .NS symbols
      name      : price.longName ?? price.shortName ?? symbol,
    };
  } catch {
    return { marketCap: null, name: symbol };
  }
}

export  async function getStockDetails(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol);

    const result = {
      symbol: quote.symbol,
      name: quote.longName,
      currentPrice: quote.regularMarketPrice,
      open: quote.regularMarketOpen,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap,
      peRatio: quote.trailingPE,
      sector: quote.sector,
      exchange: quote.fullExchangeName
    };

    return result;

  } catch (error) {
    console.error("Error fetching stock:", error.message);
  }
}

export  async function allData(symbol) {
  try {
    const quoteCombineData = await yahooFinance.quoteCombine(symbol);
    // const autocData = await yahooFinance.autoc(symbol);
    // const chartData = await yahooFinance.chart(symbol);
    // const dailyGainersData = await yahooFinance.dailyGainers(symbol);
    // const dailyLosersData = await yahooFinance.dailyLosers(symbol);
    const fundamentalsTimeSeriesData = await yahooFinance.fundamentalsTimeSeries(symbol);
    const historicalData = await yahooFinance.historical(symbol);
    const insightsData = await yahooFinance.insights(symbol);
    const optionsData = await yahooFinance.options(symbol);
    const quoteData = await yahooFinance.quote(symbol);
    const quoteSummaryData = await yahooFinance.quoteSummary(symbol);
    const recommendationsBySymbolData = await yahooFinance.recommendationsBySymbol(symbol);
    const screenerData = await yahooFinance.screener(symbol);
    const searchData = await yahooFinance.search(symbol);
    const trendingSymbolsData = await yahooFinance.trendingSymbols(symbol);

    return{
      quoteCombineData,
      // autocData,
      // chartData,
      // dailyGainersData,
      // dailyLosersData,
      fundamentalsTimeSeriesData,
      historicalData,
      insightsData,
      optionsData,
      quoteData,
      quoteSummaryData,
      recommendationsBySymbolData,
      screenerData,
      searchData,
      trendingSymbolsData,
    }
  }
   catch (error) {
    console.log(error);
    
    console.error("Error fetching stock:", error.message);
  }
}

// Example
const symbol = "RELIANCE.NS"; // NSE format
// const data = await allData(symbol);

// console.log(data);
import fs from "fs";

async function inspectYahoo() {

  const functions = {

    quote: () => yahooFinance.quote(symbol),

    quoteSummary: () =>
      yahooFinance.quoteSummary(symbol, {
        modules: [
          "price",
          "summaryDetail",
          "financialData",
          "defaultKeyStatistics",
          "assetProfile"
        ]
      }),

    historical: () =>
      yahooFinance.historical(symbol, {
        period1: "2024-01-01",
        interval: "1d"
      }),

    chart: () =>
      yahooFinance.chart(symbol, {
        interval: "1d",
        range: "1mo"
      }),

    options: () =>
      yahooFinance.options(symbol),

    insights: () =>
      yahooFinance.insights(symbol),

    recommendationsBySymbol: () =>
      yahooFinance.recommendationsBySymbol(symbol),

    fundamentalsTimeSeries: () =>
      yahooFinance.fundamentalsTimeSeries(symbol, {
        type: "annualTotalRevenue"
      }),

    search: () =>
      yahooFinance.search("RELIANCE"),

    trendingSymbols: () =>
      yahooFinance.trendingSymbols("IN"),

    quoteCombine: () =>
      yahooFinance.quoteCombine(symbol)

  };

  // create folder for outputs
  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
  }

  for (const [name, fn] of Object.entries(functions)) {

    try {

      console.log("\n==============================");
      console.log("FUNCTION:", name);
      console.log("==============================");

      const data = await fn();

      // print in console
      console.dir(data, { depth: 4 });

      // save JSON file
      fs.writeFileSync(
        `./data/${name}.json`,
        JSON.stringify(data, null, 2)
      );

      console.log(`Saved: data/${name}.json`);

    } catch (err) {

      console.log(`Error in ${name}:`, err.message);

    }

  }

}

inspectYahoo();