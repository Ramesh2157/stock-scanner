import supabase from "../database/supaBaseClient.mjs";

export async function storeFilterStocks(stocks) {

  const rows = stocks.map(s => ({
   symbol_id: s.symbol_id,
    date:  new Date().toISOString().split("T")[0],
    status:s.status,
    open : s.open,
    close: s.close,
    sma44:s.sma44,
    dist:s.dist,
    risk_reward: s.riskReward,
    entry: s.entryAtValue, 
    stop_loss: s.stopLossValue,
    target: s.targetValue
  }));
console.log(rows);

  const { error } = await supabase
    .from("filter_stocks")
    .upsert(rows, { onConflict: "symbol_id,date" });

  if (error) console.log(error);
}