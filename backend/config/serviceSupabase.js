const { createClient } = require("@supabase/supabase-js");

/*
 * Service-role client for the student module.
 * Every student query is already filtered by the student id taken from the
 * verified login token, so students only ever reach their own rows. Using
 * the service key means row-level-security on admin-owned tables (skills,
 * companies, assessments, questions) does not hide data from students.
 * Never send this client or its key to the browser.
 */
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

module.exports = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
