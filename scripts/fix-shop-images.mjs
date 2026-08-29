import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    "postgresql://postgres:Extreme$9623023477@db.jqgaebdtuasenyojvbsi.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

function isValidUrl(url) {
  if (!url || !url.trim()) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("--- Running shop-images bucket migration ---");

    // Create bucket
    await client.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'shop-images',
        'shop-images',
        true,
        52428800,
        ARRAY[
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'image/svg+xml',
          'application/octet-stream',
          'model/stl',
          'model/3mf'
        ]
      )
      ON CONFLICT (id) DO UPDATE SET
        public = true,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;
    `);
    console.log("✅ shop-images bucket created/updated");

    // Create policies (ignore if they already exist)
    const policies = [
      {
        name: "Public can view shop images",
        action: "SELECT",
        check: "USING (bucket_id = 'shop-images')",
      },
      {
        name: "Authenticated can upload shop images",
        action: "INSERT",
        check: "WITH CHECK (bucket_id = 'shop-images')",
      },
      {
        name: "Service role can manage shop images",
        action: "ALL",
        check: "USING (bucket_id = 'shop-images')",
      },
    ];

    for (const policy of policies) {
      try {
        await client.query(`
          CREATE POLICY "${policy.name}"
            ON storage.objects
            FOR ${policy.action}
            ${policy.check};
        `);
        console.log(`✅ Policy created: ${policy.name}`);
      } catch (err) {
        if (err.message.includes("already exists")) {
          console.log(`ℹ️ Policy already exists: ${policy.name}`);
        } else {
          console.warn(`⚠️ Policy error: ${err.message}`);
        }
      }
    }

    // Verify bucket
    const { rows } = await client.query(
      `SELECT * FROM storage.buckets WHERE id = 'shop-images';`,
    );
    console.log("Bucket status:", rows[0]);
  } finally {
    client.release();
  }
}

async function checkInvalidImageUrls() {
  const client = await pool.connect();
  try {
    console.log("\n--- Checking invalid image URLs in shelf_products ---");

    const { rows: products } = await client.query(`
      SELECT id, name, slug, thumbnail_url, image_urls
      FROM shelf_products
      WHERE is_active = true AND is_archived = false;
    `);

    let invalidCount = 0;
    let fixedCount = 0;
    const invalidProducts = [];

    for (const product of products) {
      const invalidThumbnail =
        product.thumbnail_url && !isValidUrl(product.thumbnail_url);
      const invalidImageUrls = (product.image_urls || []).filter(
        (url) => !isValidUrl(url),
      );

      if (invalidThumbnail || invalidImageUrls.length > 0) {
        invalidCount++;
        invalidProducts.push({
          id: product.id,
          slug: product.slug,
          name: product.name,
          invalidThumbnail: invalidThumbnail ? product.thumbnail_url : null,
          invalidImageUrls,
        });

        // Fix: remove invalid thumbnail, filter invalid image_urls
        const newThumbnail = invalidThumbnail ? null : product.thumbnail_url;
        const newImageUrls = (product.image_urls || []).filter((url) =>
          isValidUrl(url),
        );

        await client.query(
          `
          UPDATE shelf_products
          SET thumbnail_url = $1,
              image_urls = $2
          WHERE id = $3;
        `,
          [newThumbnail, newImageUrls, product.id],
        );

        fixedCount++;
        console.log(`🔧 Fixed ${product.slug}:`, {
          thumbnail: invalidThumbnail
            ? `removed "${product.thumbnail_url}"`
            : "OK",
          imageUrls:
            invalidImageUrls.length > 0
              ? `removed ${invalidImageUrls.length} invalid`
              : "OK",
        });
      }
    }

    console.log(
      `\n📊 Summary: ${invalidCount} products had invalid URLs, ${fixedCount} fixed.`,
    );

    if (invalidProducts.length > 0) {
      console.log("\n❌ Invalid URLs found (now fixed):");
      for (const p of invalidProducts) {
        if (p.invalidThumbnail)
          console.log(`  [${p.slug}] thumbnail: "${p.invalidThumbnail}"`);
        for (const url of p.invalidImageUrls)
          console.log(`  [${p.slug}] image_urls: "${url}"`);
      }
    } else {
      console.log("\n✅ All product image URLs are valid.");
    }
  } finally {
    client.release();
  }
}

async function checkVariantAndSkuImages() {
  const client = await pool.connect();
  try {
    console.log(
      "\n--- Checking invalid image URLs in variant_option_images and sku_images ---",
    );

    // Check variant option images
    const { rows: variantImages } = await client.query(`
      SELECT v.id, v.product_id, p.slug, v.option_name, v.option_value, v.image_url
      FROM shelf_variant_option_images v
      JOIN shelf_products p ON p.id = v.product_id
      WHERE v.image_url IS NOT NULL AND v.image_url != '';
    `);

    let invalidVariantImages = 0;
    for (const row of variantImages) {
      if (!isValidUrl(row.image_url)) {
        invalidVariantImages++;
        console.log(
          `  [${row.slug}] variant image invalid: "${row.image_url}" (${row.option_name}: ${row.option_value})`,
        );
      }
    }

    // Check SKU images (join via shelf_skus to get product_id)
    const { rows: skuImages } = await client.query(`
      SELECT s.id, sk.product_id, p.slug, s.sku_id, s.image_url
      FROM shelf_sku_images s
      JOIN shelf_skus sk ON sk.id = s.sku_id
      JOIN shelf_products p ON p.id = sk.product_id
      WHERE s.image_url IS NOT NULL AND s.image_url != '';
    `);

    let invalidSkuImages = 0;
    for (const row of skuImages) {
      if (!isValidUrl(row.image_url)) {
        invalidSkuImages++;
        console.log(
          `  [${row.slug}] SKU image invalid: "${row.image_url}" (sku_id: ${row.sku_id})`,
        );
      }
    }

    console.log(
      `\n📊 Variant images: ${invalidVariantImages} invalid / ${variantImages.length} total`,
    );
    console.log(
      `📊 SKU images: ${invalidSkuImages} invalid / ${skuImages.length} total`,
    );

    if (invalidVariantImages === 0 && invalidSkuImages === 0) {
      console.log("✅ All variant and SKU image URLs are valid.");
    }
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await runMigration();
    await checkInvalidImageUrls();
    await checkVariantAndSkuImages();
    console.log("\n🎉 All done!");
  } catch (err) {
    console.error("❌ Fatal error:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
