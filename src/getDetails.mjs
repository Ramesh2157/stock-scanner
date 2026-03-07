import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

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

console.log(data);