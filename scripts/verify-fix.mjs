import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    "postgresql://postgres:Extreme$9623023477@db.jqgaebdtuasenyojvbsi.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("=== Verification After Fix ===\n");

    const productId = "5e89a871-2e16-4f2c-b67d-ab32e1058ef1";

    // Check product state
    const { rows: products } = await client.query(
      `
      SELECT name, slug, thumbnail_url, image_urls
      FROM shelf_products WHERE id = $1;
    `,
      [productId],
    );

    console.log("Product after fix:");
    console.log(`  Name: ${products[0].name}`);
    console.log(`  Slug: ${products[0].slug}`);
    console.log(`  Thumbnail: ${products[0].thumbnail_url || "(null)"}`);
    console.log(`  Image URLs: ${JSON.stringify(products[0].image_urls)}`);

    // Check all products for broken URLs
    console.log("\n--- Final audit: All active products ---");
    const { rows: allProducts } = await client.query(`
      SELECT id, slug, thumbnail_url, image_urls
      FROM shelf_products
      WHERE is_active = true AND is_archived = false;
    `);

    let brokenCount = 0;
    for (const p of allProducts) {
      const urls = [p.thumbnail_url, ...(p.image_urls || [])].filter(Boolean);
      for (const url of urls) {
        const match = url.match(
          /\/storage\/v1\/object\/public\/shop-images\/(.+)$/,
        );
        if (!match) continue;

        const { rows } = await client.query(
          `
          SELECT 1 FROM storage.objects
          WHERE bucket_id = 'shop-images' AND name = $1;
        `,
          [decodeURIComponent(match[1])],
        );

        if (rows.length === 0) {
          brokenCount++;
          console.log(`  ❌ [${p.slug}] Missing: ${match[1]}`);
        }
      }
    }

    if (brokenCount === 0) {
      console.log("✅ No broken image URLs found across all active products");
    } else {
      console.log(`❌ ${brokenCount} broken image URLs found`);
    }

    // Check media assets
    const { rows: assets } = await client.query(
      `
      SELECT COUNT(*) as count FROM shelf_media_assets
      WHERE storage_path LIKE $1;
    `,
      [`shop/products/${productId}/%`],
    );
    console.log(`\nOrphaned media assets for this product: ${assets[0].count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
