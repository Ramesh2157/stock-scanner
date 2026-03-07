import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// const SUPABASE_URL = process.env.SUPABASE_URL;
// const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const SUPABASE_URL="https://uvohbkprysybjjpheema.supabase.co"
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2b2hia3ByeXN5YmpqcGhlZW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzI5NTIsImV4cCI6MjA4ODM0ODk1Mn0.IAakdaDarCc9c1JtekKNuwv-x2WD6KUqJJNbX0fizeo"
console.log(SUPABASE_URL);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY are required."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;