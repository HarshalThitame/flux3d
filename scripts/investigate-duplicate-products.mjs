import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    "postgresql://postgres:Extreme$9623023477@db.jqgaebdtuasenyojvbsi.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('=== Products matching "leaf-rattan" ===\n');

    const { rows } = await client.query(`
      SELECT id, name, slug, thumbnail_url, image_urls, is_active, is_archived
      FROM shelf_products
      WHERE slug LIKE '%leaf-rattan%' OR name ILIKE '%leaf rattan%';
    `);

    for (const p of rows) {
      console.log(`ID: ${p.id}`);
      console.log(`Name: ${p.name}`);
      console.log(`Slug: ${p.slug}`);
      console.log(`Active: ${p.is_active}, Archived: ${p.is_archived}`);
      console.log(`Thumbnail: ${p.thumbnail_url || "(null)"}`);
      console.log(`Images: ${JSON.stringify(p.image_urls)}`);
      console.log("---");
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
