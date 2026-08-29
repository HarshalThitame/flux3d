import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    "postgresql://postgres:Extreme$9623023477@db.jqgaebdtuasenyojvbsi.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

function extractStoragePath(url) {
  const match = url.match(/\/storage\/v1\/object\/public\/shop-images\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function main() {
  const client = await pool.connect();
  try {
    console.log("=== AUDIT: All product images vs storage.objects ===\n");

    // Get all active products
    const { rows: products } = await client.query(`
      SELECT id, name, slug, thumbnail_url, image_urls
      FROM shelf_products
      WHERE is_active = true AND is_archived = false;
    `);

    let missingProductImages = 0;
    let missingThumbnailImages = 0;

    for (const product of products) {
      const urls = [];
      if (product.thumbnail_url)
        urls.push({ type: "thumbnail", url: product.thumbnail_url });
      for (const url of product.image_urls || []) {
        urls.push({ type: "image_urls", url });
      }

      let productHasMissing = false;
      for (const { type, url } of urls) {
        const path = extractStoragePath(url);
        if (!path) continue;

        const { rows } = await client.query(
          `
          SELECT 1 FROM storage.objects WHERE bucket_id = 'shop-images' AND name = $1;
        `,
          [path],
        );

        if (rows.length === 0) {
          productHasMissing = true;
          if (type === "thumbnail") missingThumbnailImages++;
          console.log(`❌ [${product.slug}] ${type}: ${path}`);
        }
      }

      if (productHasMissing) missingProductImages++;
    }

    console.log(
      `\n📊 Product images: ${missingProductImages}/${products.length} products have missing images`,
    );
    console.log(`📊 Missing thumbnails: ${missingThumbnailImages}`);

    // Check variant option images
    console.log("\n--- Variant option images ---");
    const { rows: variantImages } = await client.query(`
      SELECT v.id, p.slug, v.option_name, v.option_value, v.image_url
      FROM shelf_variant_option_images v
      JOIN shelf_products p ON p.id = v.product_id
      WHERE p.is_active = true AND p.is_archived = false;
    `);

    let missingVariantImages = 0;
    for (const row of variantImages) {
      const path = extractStoragePath(row.image_url);
      if (!path) continue;

      const { rows } = await client.query(
        `
        SELECT 1 FROM storage.objects WHERE bucket_id = 'shop-images' AND name = $1;
      `,
        [path],
      );

      if (rows.length === 0) {
        missingVariantImages++;
        console.log(
          `❌ [${row.slug}] variant ${row.option_name}:${row.option_value}: ${path}`,
        );
      }
    }
    console.log(
      `📊 Variant images: ${missingVariantImages}/${variantImages.length} missing`,
    );

    // Check SKU images
    console.log("\n--- SKU images ---");
    const { rows: skuImages } = await client.query(`
      SELECT s.id, p.slug, sk.sku_code, s.image_url
      FROM shelf_sku_images s
      JOIN shelf_skus sk ON sk.id = s.sku_id
      JOIN shelf_products p ON p.id = sk.product_id
      WHERE p.is_active = true AND p.is_archived = false;
    `);

    let missingSkuImages = 0;
    for (const row of skuImages) {
      const path = extractStoragePath(row.image_url);
      if (!path) continue;

      const { rows } = await client.query(
        `
        SELECT 1 FROM storage.objects WHERE bucket_id = 'shop-images' AND name = $1;
      `,
        [path],
      );

      if (rows.length === 0) {
        missingSkuImages++;
        console.log(`❌ [${row.slug}] SKU ${row.sku_code}: ${path}`);
      }
    }
    console.log(
      `📊 SKU images: ${missingSkuImages}/${skuImages.length} missing`,
    );

    // Check SKU variant_image_url
    console.log("\n--- SKU variant_image_url ---");
    const { rows: skuVariantImages } = await client.query(`
      SELECT sk.id, p.slug, sk.sku_code, sk.variant_image_url
      FROM shelf_skus sk
      JOIN shelf_products p ON p.id = sk.product_id
      WHERE p.is_active = true AND p.is_archived = false
        AND sk.variant_image_url IS NOT NULL AND sk.variant_image_url != '';
    `);

    let missingSkuVariantImages = 0;
    for (const row of skuVariantImages) {
      const path = extractStoragePath(row.variant_image_url);
      if (!path) continue;

      const { rows } = await client.query(
        `
        SELECT 1 FROM storage.objects WHERE bucket_id = 'shop-images' AND name = $1;
      `,
        [path],
      );

      if (rows.length === 0) {
        missingSkuVariantImages++;
        console.log(
          `❌ [${row.slug}] SKU variant_image ${row.sku_code}: ${path}`,
        );
      }
    }
    console.log(
      `📊 SKU variant_image_url: ${missingSkuVariantImages}/${skuVariantImages.length} missing`,
    );

    console.log("\n=== SUMMARY ===");
    console.log(
      `Products with missing images: ${missingProductImages}/${products.length}`,
    );
    console.log(
      `Missing variant option images: ${missingVariantImages}/${variantImages.length}`,
    );
    console.log(`Missing SKU images: ${missingSkuImages}/${skuImages.length}`);
    console.log(
      `Missing SKU variant_image_url: ${missingSkuVariantImages}/${skuVariantImages.length}`,
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
