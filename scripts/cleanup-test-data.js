#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * FLUX3D Production Cleanup Script
 * Deletes all test/user-generated data while preserving system config.
 * Keeps only: flux3d@gmail.com and jaimeen.makavana@gmail.com
 *
 * Usage:
 *   node scripts/cleanup-test-data.js "postgresql://postgres:PASSWORD@db.jqgaebdtuasenyojvbsi.supabase.co:5432/postgres"
 */

require("dotenv").config({ path: "/home/rutik-thitame/flux3d/.env.local" });

const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const KEEP_EMAILS = ["flux3d@gmail.com", "jaimeen.makavana@gmail.com"];

const PRESERVE_TABLES = [
  "app_secrets",
  "authors",
  "blog_categories",
  "business_settings",
  "email_automation_rules",
  "email_branding",
  "email_settings",
  "email_template_versions",
  "email_templates",
  "materials",
  "printers",
  "shelf_categories",
  "shipping_rules",
  "shiprocket_settings",
  "whatsapp_knowledge_chunks",
  "whatsapp_quick_replies",
];

if (!DATABASE_URL) {
  console.error(
    "Error: DATABASE_URL not provided.\nUsage: node cleanup-test-data.js <connection_string>",
  );
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local",
  );
  process.exit(1);
}

const pgClient = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  query_timeout: 120000,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getPublicTables() {
  const res = await pgClient.query(
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name != ALL($1)
    ORDER BY table_name
  `,
    [PRESERVE_TABLES],
  );
  return res.rows.map((r) => r.table_name);
}

async function getTableCounts(tables) {
  const counts = {};
  for (const table of tables) {
    try {
      const res = await pgClient.query(`SELECT COUNT(*) FROM ${table}`);
      counts[table] = parseInt(res.rows[0].count, 10);
    } catch (err) {
      counts[table] = `N/A (${err.message})`;
    }
  }
  return counts;
}

async function cleanupDatabase(tablesToDelete) {
  console.log("\n=== Phase 1: Cleaning database tables ===\n");

  await pgClient.query("SET session_replication_role = 'replica'");
  await pgClient.query("BEGIN");

  try {
    for (const table of tablesToDelete) {
      if (table === "profiles") {
        const res = await pgClient.query(
          `DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users WHERE email = ANY($1))`,
          [KEEP_EMAILS],
        );
        console.log(`  ✓ ${table}: ${res.rowCount} rows deleted`);
      } else {
        const res = await pgClient.query(`DELETE FROM ${table}`);
        console.log(`  ✓ ${table}: ${res.rowCount} rows deleted`);
      }
    }

    await pgClient.query("COMMIT");
    console.log("\n✓ Database tables cleaned successfully");
  } catch (err) {
    await pgClient.query("ROLLBACK");
    throw err;
  } finally {
    await pgClient.query("SET session_replication_role = 'origin'");
  }
}

async function cleanupAuthUsers() {
  console.log("\n=== Phase 2: Cleaning auth.users ===\n");

  const { rows: usersToDelete } = await pgClient.query(
    `SELECT id, email FROM auth.users WHERE email != ALL($1)`,
    [KEEP_EMAILS],
  );

  if (usersToDelete.length === 0) {
    console.log("  No auth users to delete.");
    return;
  }

  console.log(`  Found ${usersToDelete.length} auth users to delete...`);

  let deleted = 0;
  let failed = 0;

  for (const user of usersToDelete) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`  ✗ Failed: ${user.email} — ${error.message}`);
      failed++;
    } else {
      console.log(`  ✓ Deleted: ${user.email}`);
      deleted++;
    }
  }

  console.log(
    `\n✓ Auth cleanup complete. ${deleted} deleted, ${failed} failed.`,
  );
}

async function getStorageBuckets() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error(`  Warning: Could not list buckets: ${error.message}`);
    return [];
  }
  return buckets || [];
}

async function emptyBucket(bucketName) {
  async function listAndDelete(prefix = "") {
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list(prefix, { limit: 1000, offset: 0 });

    if (error) {
      if (error.message.includes("Bucket not found")) {
        console.log(`  ⊘ Bucket '${bucketName}' not found, skipping.`);
        return 0;
      }
      throw new Error(`Storage list failed: ${error.message}`);
    }

    if (!files || files.length === 0) return 0;

    let deletedCount = 0;
    const filesToDelete = [];
    const folders = [];

    for (const file of files) {
      const path = prefix ? `${prefix}/${file.name}` : file.name;
      if (file.id === null) {
        folders.push(path);
      } else {
        filesToDelete.push(path);
      }
    }

    for (let i = 0; i < filesToDelete.length; i += 100) {
      const batch = filesToDelete.slice(i, i + 100);
      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove(batch);
      if (deleteError) {
        console.error(
          `  ✗ Failed to delete batch in '${bucketName}': ${deleteError.message}`,
        );
      } else {
        deletedCount += batch.length;
      }
    }

    for (const folder of folders) {
      const count = await listAndDelete(folder);
      deletedCount += count;
    }

    return deletedCount;
  }

  return await listAndDelete();
}

async function cleanupStorage() {
  console.log("\n=== Phase 3: Cleaning Supabase Storage ===\n");

  const buckets = await getStorageBuckets();
  if (buckets.length === 0) {
    console.log("  No buckets found.");
    return;
  }

  let grandTotal = 0;
  for (const bucket of buckets) {
    console.log(`  Emptying bucket: ${bucket.name}...`);
    const count = await emptyBucket(bucket.name);
    console.log(`    ✓ ${count} file(s) deleted from '${bucket.name}'`);
    grandTotal += count;
  }

  console.log(`\n✓ Storage cleanup complete. ${grandTotal} file(s) deleted.`);
}

async function main() {
  console.log("🧹 FLUX3D Production Cleanup");
  console.log("============================");
  console.log(`Preserve emails: ${KEEP_EMAILS.join(", ")}`);
  console.log(`Preserve tables: ${PRESERVE_TABLES.join(", ")}`);

  await pgClient.connect();

  const tablesToDelete = await getPublicTables();
  console.log(`\nTables to clean: ${tablesToDelete.length}`);

  console.log("\n--- Current row counts ---");
  const counts = await getTableCounts(tablesToDelete);
  let totalRows = 0;
  for (const [table, count] of Object.entries(counts)) {
    const num = typeof count === "number" ? count : 0;
    totalRows += num;
    console.log(`  ${table}: ${count}`);
  }
  console.log(`  TOTAL: ~${totalRows} rows`);

  const { rows: authCount } = await pgClient.query(
    `SELECT COUNT(*) FROM auth.users WHERE email != ALL($1)`,
    [KEEP_EMAILS],
  );
  console.log(`\nAuth users to delete: ${authCount[0].count}`);

  console.log("\n⚠️  Proceeding with cleanup in 3 seconds...");
  await new Promise((r) => setTimeout(r, 3000));

  await cleanupDatabase(tablesToDelete);
  await cleanupAuthUsers();
  await cleanupStorage();

  console.log("\n🎉 All cleanup phases completed successfully!");
  await pgClient.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("\n❌ Cleanup failed:", err.message);
  try {
    await pgClient.query("ROLLBACK");
  } catch {}
  try {
    await pgClient.query("SET session_replication_role = 'origin'");
  } catch {}
  try {
    await pgClient.end();
  } catch {}
  process.exit(1);
});
