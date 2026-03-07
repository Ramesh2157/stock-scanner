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

// Example
const symbol = "RELIANCE.NS"; // NSE format
const data = await getStockDetails(symbol);
const fetchFundamental = await fetchFundamentals(symbol);

console.log(data, fetchFundamental);