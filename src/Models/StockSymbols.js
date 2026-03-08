import supabase from "../database/supaBaseClient";
const tableName="stock_symbol"

export async function getAllStockList() {

  const { data: symbols } = await supabase
    .from(tableName)
    .select("id, symbol_name");

    const result = symbols.map(s=>{
        const stock = {
            ...s,
            symbolsNS: `${s.symbol_name}.NS`;
        }
        return stock
    })

}
