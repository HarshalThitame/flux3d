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
    const slug =
      "leaf-rattan-pendant-light-pinecone-hanging-lamp-for-cafe-home";

    console.log(`--- Diagnosing product: ${slug} (${productId}) ---\n`);

    // Check product DB record
    const { rows: products } = await client.query(
      `
      SELECT thumbnail_url, image_urls FROM shelf_products WHERE id = $1;
    `,
      [productId],
    );

    if (products.length === 0) {
      console.log("❌ Product not found in database");
      return;
    }

    console.log("DB thumbnail_url:", products[0].thumbnail_url);
    console.log("DB image_urls:", products[0].image_urls);
    console.log("");

    // Check storage objects
    const allUrls = [
      products[0].thumbnail_url,
      ...(products[0].image_urls || []),
    ].filter(Boolean);

    for (const url of allUrls) {
      // Extract path from Supabase URL
      const match = url.match(
        /\/storage\/v1\/object\/public\/shop-images\/(.+)$/,
      );
      if (!match) {
        console.log(`❌ Invalid URL format: ${url}`);
        continue;
      }

      const objectPath = decodeURIComponent(match[1]);
      console.log(`Checking storage object: ${objectPath}`);

      const { rows } = await client.query(
        `
        SELECT name, bucket_id, created_at, updated_at, metadata, id
        FROM storage.objects
        WHERE bucket_id = 'shop-images' AND name = $1;
      `,
        [objectPath],
      );

      if (rows.length === 0) {
        console.log(`  ❌ OBJECT NOT FOUND in storage.objects`);
      } else {
        console.log(`  ✅ Found: ${JSON.stringify(rows[0])}`);
      }

      // Also try HTTP fetch
      try {
        const response = await fetch(url, { method: "HEAD" });
        console.log(`  HTTP status: ${response.status} ${response.statusText}`);
      } catch (err) {
        console.log(`  HTTP fetch error: ${err.message}`);
      }
      console.log("");
    }

    // List all objects in this product's folder
    console.log("--- All objects in product folder ---");
    const { rows: allObjects } = await client.query(
      `
      SELECT name, bucket_id, created_at
      FROM storage.objects
      WHERE bucket_id = 'shop-images' AND name LIKE $1;
    `,
      [`shop/products/${productId}/%`],
    );

    if (allObjects.length === 0) {
      console.log("No objects found in this product folder!");
    } else {
      for (const obj of allObjects) {
        console.log(`  ${obj.name}`);
      }
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
