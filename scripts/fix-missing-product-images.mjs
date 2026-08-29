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

    console.log(`=== Fixing missing images for: ${slug} ===\n`);

    // Check if ANY images exist for this product in storage (excluding QR)
    const { rows: existingImages } = await client.query(
      `
      SELECT name FROM storage.objects
      WHERE bucket_id = 'shop-images'
        AND name LIKE $1
        AND name NOT LIKE '%/qr/%';
    `,
      [`shop/products/${productId}/%`],
    );

    if (existingImages.length > 0) {
      console.log(`Found ${existingImages.length} existing images:`);
      for (const img of existingImages) {
        console.log(`  ${img.name}`);
      }

      // Build public URLs
      const baseUrl =
        "https://jqgaebdtuasenyojvbsi.supabase.co/storage/v1/object/public/shop-images";
      const thumbnailPath = existingImages[0].name;
      const thumbnailUrl = `${baseUrl}/${thumbnailPath}`;
      const imageUrls = existingImages
        .slice(1)
        .map((img) => `${baseUrl}/${img.name}`);

      console.log("\nUpdating product with existing images...");
      await client.query(
        `
        UPDATE shelf_products
        SET thumbnail_url = $1,
            image_urls = $2
        WHERE id = $3;
      `,
        [thumbnailUrl, imageUrls, productId],
      );

      console.log(`✅ Updated ${slug} with ${existingImages.length} images`);
    } else {
      console.log("❌ No valid images found in storage for this product");
      console.log("Options:");
      console.log("  1. Re-upload images via admin panel");
      console.log("  2. Set product as inactive until images are fixed");
      console.log("  3. Use placeholder images");

      // Option: Clear broken URLs
      console.log("\nClearing broken image URLs from product record...");
      await client.query(
        `
        UPDATE shelf_products
        SET thumbnail_url = NULL,
            image_urls = '{}'
        WHERE id = $1;
      `,
        [productId],
      );
      console.log(
        "✅ Cleared broken image URLs (product will show placeholder)",
      );
    }

    // Also clean up shelf_media_assets for objects that don't exist
    console.log("\n--- Cleaning up orphaned media assets ---");
    const { rows: orphanedAssets } = await client.query(
      `
      SELECT id, storage_path, public_url FROM shelf_media_assets
      WHERE storage_path LIKE $1;
    `,
      [`shop/products/${productId}/%`],
    );

    let cleanedCount = 0;
    for (const asset of orphanedAssets) {
      const { rows: exists } = await client.query(
        `
        SELECT 1 FROM storage.objects
        WHERE bucket_id = 'shop-images' AND name = $1;
      `,
        [asset.storage_path],
      );

      if (exists.length === 0) {
        await client.query(
          `
          DELETE FROM shelf_media_assets WHERE id = $1;
        `,
          [asset.id],
        );
        cleanedCount++;
      }
    }
    console.log(`✅ Removed ${cleanedCount} orphaned media asset records`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
