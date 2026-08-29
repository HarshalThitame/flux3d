import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    "postgresql://postgres:Extreme$9623023477@db.jqgaebdtuasenyojvbsi.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("=== Fixing Branding Images ===\n");

    // Check branding bucket
    const { rows: buckets } = await client.query(`
      SELECT * FROM storage.buckets WHERE id = 'branding';
    `);

    if (buckets.length === 0) {
      console.log("❌ branding bucket does not exist");
    } else {
      console.log("✅ branding bucket exists:", buckets[0]);
    }

    // Check business settings for logo/favicon URLs
    const { rows: settings } = await client.query(`
      SELECT logo_url, favicon_url, og_image_url, twitter_image_url
      FROM business_settings
      LIMIT 1;
    `);

    if (settings.length === 0) {
      console.log("❌ No business settings found");
      return;
    }

    console.log("\nCurrent branding URLs:");
    console.log(`  Logo: ${settings[0].logo_url || "(null)"}`);
    console.log(`  Favicon: ${settings[0].favicon_url || "(null)"}`);
    console.log(`  OG Image: ${settings[0].og_image_url || "(null)"}`);
    console.log(
      `  Twitter Image: ${settings[0].twitter_image_url || "(null)"}`,
    );

    // Check if these objects exist in storage
    const urls = [
      { key: "logo", url: settings[0].logo_url },
      { key: "favicon", url: settings[0].favicon_url },
      { key: "og_image", url: settings[0].og_image_url },
      { key: "twitter_image", url: settings[0].twitter_image_url },
    ];

    console.log("\n--- Storage object verification ---");
    for (const { key, url } of urls) {
      if (!url) {
        console.log(`  ℹ️ ${key}: no URL set`);
        continue;
      }

      // Extract bucket and path from URL
      const match = url.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/);
      if (!match) {
        console.log(`  ❌ ${key}: Invalid URL format - ${url}`);
        continue;
      }

      const [, bucketId, objectPath] = match;

      const { rows } = await client.query(
        `
        SELECT name FROM storage.objects
        WHERE bucket_id = $1 AND name = $2;
      `,
        [bucketId, decodeURIComponent(objectPath)],
      );

      if (rows.length === 0) {
        console.log(
          `  ❌ ${key}: OBJECT NOT FOUND in ${bucketId}/${decodeURIComponent(objectPath)}`,
        );
      } else {
        console.log(`  ✅ ${key}: Found`);
      }

      // Test HTTP access
      try {
        const response = await fetch(url, { method: "HEAD" });
        console.log(`     HTTP: ${response.status} ${response.statusText}`);
      } catch (err) {
        console.log(`     HTTP: Error - ${err.message}`);
      }
    }

    // Check all objects in branding bucket
    console.log("\n--- All objects in branding bucket ---");
    const { rows: brandingObjects } = await client.query(`
      SELECT name FROM storage.objects
      WHERE bucket_id = 'branding'
      ORDER BY name;
    `);

    if (brandingObjects.length === 0) {
      console.log("  No objects found in branding bucket");
    } else {
      for (const obj of brandingObjects) {
        console.log(`  ${obj.name}`);
      }
    }

    console.log(`\nTotal branding objects: ${brandingObjects.length}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
