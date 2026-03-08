import supabase from "../database/supaBaseClient.mjs";


export async function storeBackTestData(data) {

  const { error } = await supabase
    .from("backtest_data")
    .upsert(data, { onConflict: "symbol_id,entry_date" });

  if (error) console.log(error);
}