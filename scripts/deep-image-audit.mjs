import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    "postgresql://postgres:Extreme$9623023477@db.jqgaebdtuasenyojvbsi.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

const PRODUCT_ID = "e6bf5680-8131-478b-bf0a-5eb18085f52c";

const MISSING_FILES = [
  "1788038934794-diagonal-wave-planters-1.webp",
  "1788038979905-vertical-rib-color-labels.webp",
  "1788038663946-white-planter-sunlight.jpg",
  "1788038858445-diagonal-wave-color-labels.webp",
];

async function main() {
  const client = await pool.connect();
  try {
    // 1. All storage objects for this product
    const { rows: allObjs } = await client.query(
      `SELECT name, created_at FROM storage.objects
       WHERE bucket_id = 'shop-images' AND name LIKE $1
       ORDER BY created_at;`,
      [`shop/products/${PRODUCT_ID}%`],
    );
    console.log("\n=== ACTUAL FILES IN STORAGE ===");
    allObjs.forEach((r) => console.log(" -", r.name, "@", r.created_at));

    // 2. Check if the 4 missing files were ever stored (maybe they were deleted)
    console.log("\n=== LOOKING FOR MISSING FILES IN storage.objects ===");
    for (const fname of MISSING_FILES) {
      const { rows } = await client.query(
        `SELECT name, created_at FROM storage.objects WHERE bucket_id = 'shop-images' AND name LIKE $1;`,
        [`%${fname}%`],
      );
      if (rows.length === 0) {
        console.log(`NEVER EXISTED in storage: ${fname}`);
      } else {
        console.log(`FOUND in storage: ${fname}`, rows);
      }
    }

    // 3. shelf_sku_images that reference missing files - with timestamps
    console.log("\n=== shelf_sku_images referencing MISSING files ===");
    for (const fname of MISSING_FILES) {
      const { rows } = await client.query(
        `SELECT si.id, si.image_url, si.created_at as si_created, sk.sku_code
         FROM shelf_sku_images si
         JOIN shelf_skus sk ON sk.id = si.sku_id
         WHERE si.image_url LIKE $1
         LIMIT 5;`,
        [`%${fname}%`],
      );
      if (rows.length > 0) {
        console.log(`\n  DB rows for "${fname}":`);
        rows.forEach((r) =>
          console.log(
            `    sku=${r.sku_code} si_created=${r.si_created} url=${r.image_url.slice(-60)}`,
          ),
        );
      }
    }

    // 4. shelf_variant_option_images that reference missing files
    console.log(
      "\n=== shelf_variant_option_images referencing MISSING files ===",
    );
    for (const fname of MISSING_FILES) {
      const { rows } = await client.query(
        `SELECT v.id, v.option_name, v.option_value, v.image_url, v.created_at
         FROM shelf_variant_option_images v
         WHERE v.product_id = $1 AND v.image_url LIKE $2
         LIMIT 5;`,
        [PRODUCT_ID, `%${fname}%`],
      );
      if (rows.length > 0) {
        console.log(`\n  DB rows for "${fname}":`);
        rows.forEach((r) =>
          console.log(
            `    ${r.option_name}:${r.option_value} created=${r.created_at} url=${r.image_url.slice(-60)}`,
          ),
        );
      }
    }

    // 5. The upload API path saves images to shop/products/{productId}/{timestamp}-{filename}
    // But the actual files are missing. Check if images were uploaded via the WRONG path or
    // if a "bulk assign" JSON POST was used (which assigns existing URLs from gallery pool without verifying)
    console.log(
      "\n=== TIMELINE: When were DB records created vs when storage was uploaded? ===",
    );
    const { rows: skuImgTimeline } = await client.query(
      `SELECT si.created_at as db_created, si.image_url, sk.sku_code
       FROM shelf_sku_images si
       JOIN shelf_skus sk ON sk.id = si.sku_id
       JOIN shelf_products p ON p.id = sk.product_id
       WHERE p.id = $1
       ORDER BY si.created_at;`,
      [PRODUCT_ID],
    );
    console.log("\n  shelf_sku_images creation timeline:");
    skuImgTimeline.forEach((r) => {
      const fname = r.image_url.split("/").pop();
      const storageExists = allObjs.some((o) => o.name.endsWith(fname));
      console.log(
        `  ${r.db_created} sku=${r.sku_code} file=${fname} storageExists=${storageExists}`,
      );
    });

    // 6. Check the variant_option_images table for the JSON "bulk assign" path
    // The POST /variant-images with JSON body just ASSIGNS URLs from the gallery pool
    // without verifying if those files actually exist in storage
    console.log("\n=== shelf_variant_option_images creation timeline ===");
    const { rows: varImgTimeline } = await client.query(
      `SELECT created_at, option_name, option_value, image_url
       FROM shelf_variant_option_images
       WHERE product_id = $1
       ORDER BY created_at;`,
      [PRODUCT_ID],
    );
    varImgTimeline.forEach((r) => {
      const fname = r.image_url.split("/").pop();
      const storageExists = allObjs.some((o) => o.name.endsWith(fname));
      console.log(
        `  ${r.created_at} ${r.option_name}:${r.option_value} file=${fname} storageExists=${storageExists}`,
      );
    });

    // 7. Find if there's a media-pool.ts that tracks available URLs and check if it validates
    // Check the admin upload API route path
    const { rows: adminUploadLog } = await client.query(
      `SELECT name, created_at FROM storage.objects
       WHERE bucket_id = 'shop-images'
         AND name LIKE '%e6bf5680%'
         AND (name LIKE '%-diagonal-wave%' OR name LIKE '%-vertical-rib%' OR name LIKE '%-white-planter%')
       ORDER BY created_at;`,
    );
    console.log(
      "\n=== Storage objects matching the missing filenames (by keyword) ===",
    );
    adminUploadLog.forEach((r) => console.log(" -", r.name, "@", r.created_at));
  } finally {
    client.release();
    pool.end();
  }
}

main().catch(console.error);
