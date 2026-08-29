import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    "postgresql://postgres:Extreme$9623023477@db.jqgaebdtuasenyojvbsi.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    const activeProductId = "0aef7929-a9ff-4b4a-81ce-90262fc07e4b";
    const slug =
      "leaf-rattan-pendant-light-pinecone-hanging-lamp-for-cafe-home";

    console.log(`=== Fixing active product: ${slug} ===\n`);

    // Check if this product has ANY valid images in its OWN folder
    const { rows: ownImages } = await client.query(
      `
      SELECT name FROM storage.objects
      WHERE bucket_id = 'shop-images'
        AND name LIKE $1
        AND name NOT LIKE '%/qr/%';
    `,
      [`shop/products/${activeProductId}/%`],
    );

    console.log(`Own images found: ${ownImages.length}`);
    for (const img of ownImages) {
      console.log(`  ${img.name}`);
    }

    // Also check if it references images from the archived product
    const { rows: product } = await client.query(
      `
      SELECT thumbnail_url, image_urls FROM shelf_products WHERE id = $1;
    `,
      [activeProductId],
    );

    console.log("\nCurrent image URLs:");
    console.log(`  Thumbnail: ${product[0].thumbnail_url}`);
    console.log(`  Gallery: ${JSON.stringify(product[0].image_urls)}`);

    // Clear broken URLs
    console.log("\nClearing broken image URLs...");
    await client.query(
      `
      UPDATE shelf_products
      SET thumbnail_url = NULL,
          image_urls = '{}'
      WHERE id = $1;
    `,
      [activeProductId],
    );

    console.log("✅ Cleared broken image URLs from active product");
    console.log(
      "\n⚠️  ACTION REQUIRED: Re-upload images via admin panel for this product",
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
