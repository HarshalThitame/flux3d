import { generateShopCopy } from "../src/lib/shop/ai";

const sampleInputs = [
  {
    name: "Aero X1 Drone Frame",
    category: "Drone Parts",
    tags: ["carbon fiber", "fpv", "racing"],
    description:
      "Lightweight and ultra-durable carbon fiber FPV drone frame for professional racing.",
    tone: "technical" as const,
  },
  {
    name: "Minimalist Geometry Planter",
    category: "Home Decor",
    tags: ["planter", "modern", "geometric", "succulent"],
    description:
      "A sleek, 3D-printed geometric planter perfect for succulents and modern desk setups.",
    tone: "minimal" as const,
  },
];

async function runTests() {
  console.log("Running AI Generation Tests...\n");

  for (const input of sampleInputs) {
    console.log(`Testing Product: ${input.name} (${input.tone} tone)`);

    console.log("  Generating luxury_blocks...");
    try {
      const blocks = (await generateShopCopy({
        kind: "luxury_blocks",
        ...input,
      })) as import("../src/lib/shop/blocks").DescriptionBlocks;

      console.log(
        `    Success! Generated ${Array.isArray(blocks) ? blocks.length : 0} valid blocks.`,
      );

      if (!Array.isArray(blocks) || blocks.length === 0) {
        console.error(
          "    ERROR: Output is not a valid array of blocks or is empty.",
        );
      } else {
        const hasHeading = blocks.some((b) => b.type === "heading");
        const hasParagraph = blocks.some((b) => b.type === "paragraph");
        console.log(
          `    Has heading: ${hasHeading}, Has paragraph: ${hasParagraph}`,
        );
      }
    } catch (err) {
      console.error("    ERROR generating luxury_blocks:", err);
    }

    console.log("  Generating inline_field...");
    try {
      const inline = await generateShopCopy({
        kind: "inline_field",
        field_context: "feature item description",
        draft_text: "very strong",
        ...input,
      });
      console.log(`    Success! Output: "${inline}"`);
    } catch (err) {
      console.error("    ERROR generating inline_field:", err);
    }

    console.log("\n-----------------------------------\n");
  }

  console.log("Tests completed.");
}

runTests().catch(console.error);
