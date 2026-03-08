import supabase from "../database/supaBaseClient.mjs";


export async function storeCandles(symbolRow, candles) {

  const rows = candles.map(c => ({
    symbol_id: symbolRow.id,
    date: c.date,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume
  }));

  const { error } = await supabase
    .from("candle_history")
    .upsert(rows, { onConflict: "symbol_id,date" });

  if (error) console.log(error);
}