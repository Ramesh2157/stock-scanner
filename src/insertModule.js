import supabase from "./database/supaBaseClient.mjs";

/**
 * Insert a single record into a table.
 * @param {string} table - The name of the table to insert into.
 * @param {Object} data - The record to insert.
 * @returns {Promise<Object>} The inserted record.
 */
export async function insertOne(table, data) {
  const { data: inserted, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Insert failed on table "${table}": ${error.message}`);
  }

  return inserted;
}

/**
 * Insert multiple records into a table.
 * @param {string} table - The name of the table to insert into.
 * @param {Object[]} rows - Array of records to insert.
 * @returns {Promise<Object[]>} The inserted records.
 */
export async function insertMany(table, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("rows must be a non-empty array.");
  }

  const { data: inserted, error } = await supabase
    .from(table)
    .insert(rows)
    .select();

  if (error) {
    throw new Error(`Bulk insert failed on table "${table}": ${error.message}`);
  }

  return inserted;
}

// --- Usage Examples (remove in production) ---

// Insert a single user
// const user = await insertOne("users", { name: "Alice", email: "alice@example.com" });

// Insert multiple users
// const users = await insertMany("users", [
//   { name: "Bob", email: "bob@example.com" },
//   { name: "Carol", email: "carol@example.com" },
// ]);