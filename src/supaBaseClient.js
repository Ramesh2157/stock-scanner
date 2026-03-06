import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
console.log(SUPABASE_URL);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY are required."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;