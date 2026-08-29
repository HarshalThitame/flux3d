import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    "postgresql://postgres:Extreme$9623023477@db.jqgaebdtuasenyojvbsi.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    const productId = "5e89a871-2e16-4f2c-b67d-ab32e1058ef1";

    // Check all objects in this product's folder
    console.log("--- All storage.objects for this product ---");
    const { rows: allObjects } = await client.query(
      `
      SELECT name, bucket_id, created_at, updated_at
      FROM storage.objects
      WHERE bucket_id = 'shop-images' 
        AND (name LIKE $1 OR name LIKE $2);
    `,
      [`shop/products/${productId}/%`, `shop/products/${productId}-%`],
    );

    for (const obj of allObjects) {
      console.log(`  ${obj.name} (created: ${obj.created_at})`);
    }
    console.log(`Total: ${allObjects.length} objects\n`);

    // Check shelf_media_assets for this product
    console.log("--- shelf_media_assets entries ---");
    const { rows: mediaAssets } = await client.query(
      `
      SELECT * FROM shelf_media_assets 
      WHERE storage_path LIKE $1 OR public_url LIKE $2;
    `,
      [`shop/products/${productId}/%`, `%${productId}%`],
    );

    for (const asset of mediaAssets) {
      console.log(`  ${asset.storage_path} → ${asset.public_url}`);
    }
    console.log(`Total: ${mediaAssets.length} assets\n`);

    // Check if objects exist with similar timestamp patterns
    console.log("--- Objects with similar timestamps ---");
    const timestamps = [
      "1787933911350",
      "1787933910110",
      "1787933906170",
      "1787933902509",
      "1787933912267",
    ];
    for (const ts of timestamps) {
      const { rows } = await client.query(
        `
        SELECT name FROM storage.objects 
        WHERE bucket_id = 'shop-images' AND name LIKE $1;
      `,
        [`%${ts}%`],
      );

      if (rows.length === 0) {
        console.log(`  ❌ Timestamp ${ts}: NOT FOUND anywhere`);
      } else {
        for (const row of rows) {
          console.log(`  ✅ ${row.name}`);
        }
      }
    }

    // Check all objects in any product folder for reference
    console.log("\n--- Sample of existing product images ---");
    const { rows: sampleObjects } = await client.query(`
      SELECT name FROM storage.objects 
      WHERE bucket_id = 'shop-images' 
        AND name LIKE 'shop/products/%'
        AND name NOT LIKE '%/qr/%'
      LIMIT 10;
    `);

    for (const obj of sampleObjects) {
      console.log(`  ${obj.name}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
