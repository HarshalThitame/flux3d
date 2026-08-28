import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getShopAiClient, stripFences } from "@/lib/shop/ai";
import type {
  PricingRuleType,
  SkuPatternTemplate,
  VariantValueMetadata,
} from "@/lib/shop/admin-types";

const VARIANT_MODEL =
  process.env.SHOP_AI_VARIANT_MODEL?.trim() || "gpt-4.1-mini";

// ============================================================================
// AI Variant Intelligence — suggesters + texture generation for the AETHER
// luxury variant & SKU system. Every function degrades gracefully when no
// OPENAI_API_KEY is configured.
// ============================================================================

async function completeJson(
  client: OpenAI,
  messages: ChatCompletionMessageParam[],
  maxTokens = 1200,
): Promise<Record<string, unknown>> {
  const completion = await client.chat.completions.create({
    model: VARIANT_MODEL,
    messages,
    temperature: 0.5,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });
  const content = completion.choices[0]?.message?.content ?? "";
  return JSON.parse(stripFences(content)) as Record<string, unknown>;
}

export type AiSuggestedOption = {
  name: string;
  type: "swatch_color" | "button" | "dropdown" | "text_input" | "toggle";
  values: string[];
  description?: string;
};

export async function suggestVariantOptions(input: {
  product_name: string;
  description?: string;
  category?: string;
  existing_names?: string[];
}): Promise<AiSuggestedOption[]> {
  const client = getShopAiClient();
  if (!client) return [];

  const system =
    "You are a luxury merchandising director for a premium 3D-printed home decor, gadget and gifting house. " +
    "Design the optimal set of configurable product options (variants). Respond ONLY with JSON: " +
    '{"options":[{"name":"...","type":"swatch_color|button|dropdown|text_input|toggle","values":[...],' +
    '"description":"why this option matters for the customer"}]}. ' +
    "Prefer 2-4 high-value options. Values should be evocative, premium and realistic. " +
    "Use swatch_color for colour/material options and include hex colours as metadata is NOT required here.";

  const user = [
    `Product name: ${input.product_name}`,
    input.category ? `Category: ${input.category}` : null,
    input.description ? `Description: ${input.description}` : null,
    input.existing_names?.length
      ? `Existing options to consider extending (do not duplicate): ${input.existing_names.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const parsed = await completeJson(client, [
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const options = Array.isArray(parsed.options)
      ? (parsed.options as AiSuggestedOption[]).slice(0, 6)
      : [];
    return options.filter(
      (option) => option.name && Array.isArray(option.values),
    );
  } catch {
    return [];
  }
}

export async function suggestSkuPattern(input: {
  product_name: string;
  category?: string;
  option_names: string[];
}): Promise<string | null> {
  const client = getShopAiClient();
  if (!client) return null;

  const tokens = ["{SLUG}", "{INITIALS}"]
    .concat(
      input.option_names.map((name) => {
        const upper = name
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        return `{${upper}}`;
      }),
    )
    .filter((token) => token !== "{SLUG}");

  const system =
    "You design elegant, human-readable SKU codes for luxury products. " +
    `Respond ONLY with a JSON object: {"pattern":"..."} using ONLY these tokens: ${tokens.join(", ")}. ` +
    "Order tokens by what a buyer would say first (material/finish before size). Use hyphens, keep it under 24 chars. " +
    'Example: {"pattern":"{SLUG}-{MATERIAL}-{SIZE}"}.';

  try {
    const parsed = await completeJson(client, [
      { role: "system", content: system },
      {
        role: "user",
        content: `Product: ${input.product_name}${
          input.category ? `, Category: ${input.category}` : ""
        }. Options: ${input.option_names.join(", ")}`,
      },
    ]);
    const pattern = String(parsed.pattern ?? "").trim();
    return pattern.includes("{") ? pattern : null;
  } catch {
    return null;
  }
}

export type AiSuggestedPricingRule = {
  name: string;
  rule_type: PricingRuleType;
  conditions: Record<string, string | string[] | boolean>;
  value: number;
  priority: number;
};

export async function suggestPricingRules(input: {
  product_name: string;
  base_price: number;
  options: {
    name: string;
    values: string[];
    metadata?: Record<string, VariantValueMetadata>;
  }[];
}): Promise<AiSuggestedPricingRule[]> {
  const client = getShopAiClient();
  if (!client) return [];

  const optionContext = input.options
    .map((option) => {
      const premium = Object.entries(option.metadata ?? {})
        .filter(([, meta]) => meta.price_modifier != null)
        .map(([value, meta]) => `${value} (+₹${meta.price_modifier})`)
        .join(", ");
      return `${option.name}: [${option.values.join(", ")}]${premium ? ` — known modifiers ${premium}` : ""}`;
    })
    .join("\n");

  const system =
    "You are a pricing strategist for a luxury home/gifting brand in India. " +
    "Design pricing rules for SKU generation. Respond ONLY with JSON: " +
    '{"rules":[{"name":"...","rule_type":"fixed_add|percent_add|fixed_override|multiply","conditions":{"OPTION_NAME":"VALUE or [VALUES]"},"value":0,"priority":10}]}. ' +
    "The highest priority matching rule wins (do not stack). Use fixed_add for premium materials, percent_add for expensive upgrades. " +
    "Priorities: 10 default; use 20 for a rule that should beat others. Keep rules to 1-5. Values are in INR (₹).";

  try {
    const parsed = await completeJson(client, [
      { role: "system", content: system },
      {
        role: "user",
        content: `Product: ${input.product_name}, Base price: ₹${input.base_price}\nOptions:\n${optionContext}`,
      },
    ]);
    const rules = Array.isArray(parsed.rules)
      ? (parsed.rules as AiSuggestedPricingRule[]).slice(0, 5)
      : [];
    return rules.filter(
      (rule) =>
        rule.name &&
        ["fixed_add", "percent_add", "fixed_override", "multiply"].includes(
          rule.rule_type,
        ) &&
        Number.isFinite(Number(rule.value)),
    );
  } catch {
    return [];
  }
}

export async function generateValueDescriptions(input: {
  product_name: string;
  option_name: string;
  values: string[];
}): Promise<Record<string, { description: string }>> {
  const client = getShopAiClient();
  if (!client) return {};

  const system =
    "You write sumptuous, concise micro-descriptions (max 16 words each) for product option values in a luxury store. " +
    'Respond ONLY with JSON: {"descriptions":{"<value>":"<description>"}} for exactly these values.';

  try {
    const parsed = await completeJson(client, [
      { role: "system", content: system },
      {
        role: "user",
        content: `Product: ${input.product_name}, Option: ${input.option_name}, Values: ${input.values.join(", ")}`,
      },
    ]);
    const descriptions = (parsed.descriptions ?? {}) as Record<
      string,
      string | { description: string }
    >;
    const result: Record<string, { description: string }> = {};
    for (const value of input.values) {
      const entry = descriptions[value];
      const text =
        typeof entry === "string" ? entry : (entry?.description ?? "");
      if (text) result[value] = { description: String(text).trim() };
    }
    return result;
  } catch {
    return {};
  }
}

// ============================================================================
// AI Texture Generation
// ============================================================================

const TEXTURE_IMAGE_MODEL =
  process.env.SHOP_AI_IMAGE_MODEL?.trim() || "gpt-image-1";

export async function generateTextureSwatch(input: {
  value: string;
  option_name: string;
}): Promise<{ b64: string; mime: string } | null> {
  const client = getShopAiClient();
  if (!client) return null;

  const prompt =
    `Ultra-luxury material/texture swatch tile for "${input.value}" (${input.option_name}). ` +
    "Seamless close-up texture, premium studio lighting, elegant, refined, subtle grain, high-end product photography style, " +
    "square tile, no text, no borders, no objects.";

  const image = await client.images.generate({
    model: TEXTURE_IMAGE_MODEL,
    prompt,
    n: 1,
    size: "1024x1024",
  });
  const b64 = image.data?.[0]?.b64_json;
  if (!b64) return null;
  return { b64, mime: "image/png" };
}

export function parsePatternTemplate(row: {
  pattern: string;
  name: string;
  category_id: string | null;
  is_default: boolean;
}): SkuPatternTemplate {
  return {
    id: row.pattern + row.name,
    name: row.name,
    pattern: row.pattern,
    category_id: row.category_id,
    is_default: row.is_default,
    created_at: null,
  };
}
