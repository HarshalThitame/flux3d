import { Client } from "pg";
import { convertRichHtmlToBlocks } from "../src/lib/shop/html-to-blocks";
import { descriptionBlocksSchema } from "../src/lib/shop/blocks";

const CONN = process.env.SUPABASE_DB_URL;
if (!CONN) {
  console.error(
    "Set SUPABASE_DB_URL to the Supabase postgres connection string.",
  );
  process.exit(1);
}

async function main() {
  const client = new Client({
    connectionString: CONN,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows } = await client.query(
    `SELECT id, long_description, long_description_blocks
     FROM public.shelf_products
     WHERE long_description IS NOT NULL AND long_description <> ''
       AND (long_description_blocks IS NULL OR jsonb_array_length(long_description_blocks) = 0)`,
  );

  console.log(
    `Found ${rows.length} product(s) with a classic long_description but no luxury blocks.`,
  );

  let converted = 0;
  let skipped = 0;
  for (const row of rows) {
    const blocks = convertRichHtmlToBlocks(
      row.long_description ?? "",
      row.name,
    );
    if (blocks.length === 0) {
      skipped += 1;
      continue;
    }
    const parsed = descriptionBlocksSchema.safeParse(blocks);
    if (!parsed.success) {
      skipped += 1;
      console.error(
        `  SKIP ${row.id}: invalid blocks (${parsed.error.issues[0]?.message})`,
      );
      continue;
    }
    await client.query(
      `UPDATE public.shelf_products
       SET long_description_blocks = $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(parsed.data), row.id],
    );
    converted += 1;
  }

  console.log(`Converted ${converted}, skipped ${skipped}.`);
  await client.end();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
