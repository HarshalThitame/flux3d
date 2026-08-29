import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    "postgresql://postgres:Extreme$9623023477@db.jqgaebdtuasenyojvbsi.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("=== Fixing Business Settings ===\n");

    // Check current settings
    const { rows: before } = await client.query(`
      SELECT logo_url, favicon_url, og_image_url, twitter_image_url
      FROM business_settings
      LIMIT 1;
    `);

    console.log("Before fix:");
    console.log(`  Logo: ${before[0].logo_url || "(null)"}`);
    console.log(`  Favicon: ${before[0].favicon_url || "(null)"}`);
    console.log(`  OG: ${before[0].og_image_url || "(null)"}`);
    console.log(`  Twitter: ${before[0].twitter_image_url || "(null)"}`);

    // Update to use local assets
    await client.query(`
      UPDATE business_settings
      SET logo_url = '/logo.webp',
          favicon_url = '/favicon.ico',
          og_image_url = NULL,
          twitter_image_url = NULL;
    `);

    console.log("\n✅ Updated to local assets");

    // Verify
    const { rows: after } = await client.query(`
      SELECT logo_url, favicon_url, og_image_url, twitter_image_url
      FROM business_settings
      LIMIT 1;
    `);

    console.log("\nAfter fix:");
    console.log(`  Logo: ${after[0].logo_url || "(null)"}`);
    console.log(`  Favicon: ${after[0].favicon_url || "(null)"}`);
    console.log(`  OG: ${after[0].og_image_url || "(null)"}`);
    console.log(`  Twitter: ${after[0].twitter_image_url || "(null)"}`);

    console.log("\n🎉 Business settings fixed! Logo will use local /logo.webp");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
