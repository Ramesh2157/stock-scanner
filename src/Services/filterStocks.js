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

  const { error } = await supabase
    .from("filter_stocks")
    .upsert(rows, { onConflict: "symbol_id,date" });

  if (error) console.log(error);
}

export async function getAllFilterStocks() {
  const pageSize = 1000;
  const tableName = "filter_stocks";

  // ── Fetch stock_symbols ───────────────────────────────────────
  let allData = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("stock_symbols")
      .select("id, symbol_name")
      .order("id")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  // ── Fetch filter_stocks ───────────────────────────────────────
  // Bug 1 fix: reset `from` to 0 before the second loop
  let filterStocks = [];
  from = 0;                          // ← this was missing

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select("symbol_id, date, entry, stop_loss, target")
      .order("symbol_id")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    filterStocks = filterStocks.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  // ── Join in memory (symbol_id → date) ────────────────────────
  // Bug 2 fix: build a lookup map so each stock gets its signal date
  const signalMap = new Map(
    filterStocks.map(f => [f.symbol_id, f.date])
  );

  // ── Build result ─────────────────────────────────────────────
  const allStocks = allData.map(s => ({
    id        : s.id,
    symbol_name: s.symbol_name,
    symbol  : `${s.symbol_name}.NS`,
    hasSignal : signalMap.has(s.id),             // true/false
    date: signalMap.get(s.id) ?? null, 
  }));

  // symbolsNS — only stocks that appear in filter_stocks
  const symbolsNS = allStocks
    .filter(s => s.hasSignal)
    .map(s => s.symbolNS);

  const result = allStocks
    .filter(s => s.hasSignal)

  return { result, symbolsNS };
}