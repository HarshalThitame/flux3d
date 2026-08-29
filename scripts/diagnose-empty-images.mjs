import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    "postgresql://postgres:Extreme$9623023477@db.jqgaebdtuasenyojvbsi.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("--- Products with NO images (blank PDP) ---\n");

    const { rows } = await client.query(`
      SELECT id, name, slug, thumbnail_url, image_urls
      FROM shelf_products
      WHERE is_active = true AND is_archived = false
        AND (thumbnail_url IS NULL OR thumbnail_url = '')
        AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL OR array_length(image_urls, 1) = 0);
    `);

    if (rows.length === 0) {
      console.log("✅ All active products have at least one image.");
    } else {
      console.log(`⚠️ ${rows.length} active products have NO images:\n`);
      for (const p of rows) {
        console.log(`  - ${p.name} (slug: ${p.slug})`);
      }
    }

    console.log("\n--- Products with thumbnail but no gallery images ---\n");
    const { rows: thumbOnly } = await client.query(`
      SELECT id, name, slug, thumbnail_url, image_urls
      FROM shelf_products
      WHERE is_active = true AND is_archived = false
        AND thumbnail_url IS NOT NULL AND thumbnail_url != ''
        AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL OR array_length(image_urls, 1) = 0);
    `);
    console.log(
      `ℹ️ ${thumbOnly.length} products have only a thumbnail (no additional gallery images).`,
    );

    console.log("\n--- Total active products ---\n");
    const { rows: total } = await client.query(`
      SELECT COUNT(*) as count FROM shelf_products WHERE is_active = true AND is_archived = false;
    `);
    console.log(`Total active products: ${total[0].count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
