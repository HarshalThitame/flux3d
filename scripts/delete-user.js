/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg");

const connectionString =
  process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Error: DATABASE_URL missing. Set it in .env.local");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function safeDelete(table, column, id) {
  try {
    const res = await client.query(
      `DELETE FROM ${table} WHERE ${column} = $1`,
      [id],
    );
    if (res.rowCount > 0)
      console.log(`  ✓ ${table}: ${res.rowCount} rows deleted`);
  } catch (err) {
    console.log(`  ⊘ ${table}: ${err.message}`);
  }
}

async function main() {
  await client.connect();

  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node delete-user.js <email>");
    process.exit(1);
  }

  const { rows } = await client.query(
    `SELECT id, email FROM auth.users WHERE email = $1`,
    [email],
  );

  if (rows.length === 0) {
    console.log("User not found");
    await client.end();
    return;
  }

  const id = rows[0].id;
  console.log(`Deleting ${email} (id: ${id})...`);

  await safeDelete("auth.identities", "user_id", id);
  await safeDelete("auth.sessions", "user_id", id);
  await safeDelete("auth.refresh_tokens", "user_id", id);
  await safeDelete("auth.mfa_factors", "user_id", id);
  await safeDelete("auth.one_time_tokens", "user_id", id);
  await safeDelete("auth.flow_state", "user_id", id);
  await safeDelete("auth.webauthn_challenges", "user_id", id);
  await safeDelete("auth.webauthn_credentials", "user_id", id);

  await client.query("SET session_replication_role = 'replica'");
  await client.query("BEGIN");
  try {
    const res = await client.query("DELETE FROM auth.users WHERE id = $1", [
      id,
    ]);
    console.log(`  ✓ auth.users: ${res.rowCount} deleted`);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.query("SET session_replication_role = 'origin'");
  }

  console.log("Done");
  await client.end();
}

main().catch(async (err) => {
  console.error("Error:", err.message);
  try {
    await client.query("ROLLBACK");
  } catch {}
  try {
    await client.query("SET session_replication_role = 'origin'");
  } catch {}
  try {
    await client.end();
  } catch {}
});
