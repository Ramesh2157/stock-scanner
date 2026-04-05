



import YahooFinance from "yahoo-finance2";
import supabase from "../database/supaBaseClient.mjs";

const yahooFinance = new YahooFinance();

const tableName = "stock_symbols";

export async function getAllStockList() {

  // const { data, error } = await supabase
  //   .from(tableName)
  //   .select("id, symbol_name").range(0, 3000);

  // if (error) {
  //   console.error("Supabase error:", error.message);
  //   return [];
  // }

  const pageSize = 1000;
let allData = [];
let from = 0;

while (true) {

  const { data, error } = await supabase
    .from(tableName)
    .select("id, symbol_name")
    .order("id")
    .range(from, from + pageSize - 1);

  if (error) throw error;

  allData = allData.concat(data);

  if (data.length < pageSize) break;

  from += pageSize;
}


  const result = allData.map(s => ({
    id: s.id,
    symbol_name: s.symbol_name,
    symbolNS: `${s.symbol_name}.NS`
  }));
  const symbolsNS = allData.map(s => (
    `${s.symbol_name}.NS`
  )).slice(0,500);

  return {result, symbolsNS};
}