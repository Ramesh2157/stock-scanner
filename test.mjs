
// // v2 (broken)
import YahooFinance from 'yahoo-finance2';
// yahooFinance.chart(...)

// v3 (fixed)
// import { YahooFinance } from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
// yahooFinance.chart(...)

const data = await yahooFinance.chart("RELIANCE.NS", {
  interval: "1d",
  range: "1mo"
});

console.log(data.quotes);