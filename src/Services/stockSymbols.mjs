



import YahooFinance from "yahoo-finance2";
import supabase from "../database/supaBaseClient.mjs";

const yahooFinance = new YahooFinance();

const tableName = "stock_symbols";

export async function getAllStockList() {

  const { data, error } = await supabase
    .from(tableName)
    .select("id, symbol_name");

  if (error) {
    console.error("Supabase error:", error.message);
    return [];
  }

  const result = data.map(s => ({
    id: s.id,
    symbol_name: s.symbol_name,
    symbolNS: `${s.symbol_name}.NS`
  }));

  return result;
}