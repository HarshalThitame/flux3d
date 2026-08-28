"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useProductEditor } from "../editor-context";
import { Section } from "../ui";
import type {
  PricingRuleType,
  ShopSkuPricingRule,
  SkuPricingRuleCondition,
} from "@/lib/shop/admin-types";
import { pricingRuleLabel } from "@/lib/shop/sku-engine";

const RULE_TYPES: { key: PricingRuleType; label: string }[] = [
  { key: "fixed_add", label: "Fixed add (+₹)" },
  { key: "percent_add", label: "Percent add (+%)" },
  { key: "fixed_override", label: "Fixed override (=₹)" },
  { key: "multiply", label: "Multiply (×)" },
];

export function PricingRulesEngine() {
  const {
    variants,
    product,
    pricingRules,
    addPricingRule,
    updatePricingRule,
    deletePricingRule,
    setToast,
  } = useProductEditor();

  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState<PricingRuleType>("fixed_add");
  const [value, setValue] = useState("");
  const [priority, setPriority] = useState("10");
  const [conditionName, setConditionName] = useState("");
  const [conditionValue, setConditionValue] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const discreteOptions = useMemo(
    () =>
      variants
        .filter(
          (variant) => !["toggle", "text_input"].includes(variant.option_type),
        )
        .map((variant) => ({
          name: variant.option_name,
          values: variant.values ?? [],
        })),
    [variants],
  );

  async function handleAdd() {
    if (!name.trim()) {
      setToast({ type: "error", message: "Give the rule a name." });
      return;
    }
    if (!Number.isFinite(Number(value))) {
      setToast({ type: "error", message: "Enter a valid rule value." });
      return;
    }
    const conditions: SkuPricingRuleCondition = {};
    if (conditionName && conditionValue) {
      conditions[conditionName] = conditionValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    await addPricingRule({
      name: name.trim(),
      rule_type: ruleType,
      conditions,
      value: Number(value),
      priority: Number(priority) || 0,
      is_active: true,
    });
    setName("");
    setValue("");
    setPriority("10");
    setConditionValue("");
  }

  async function runAiRules() {
    setAiBusy(true);
    try {
      const response = await fetch(
        "/api/3d-shop/admin/ai/suggest-pricing-rules",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_name: product.name,
            base_price: product.base_price,
            options: variants
              .filter(
                (variant) =>
                  !["toggle", "text_input"].includes(variant.option_type),
              )
              .map((variant) => ({
                name: variant.option_name,
                values: variant.values ?? [],
                metadata: variant.value_metadata ?? undefined,
              })),
          }),
        },
      );
      const data = (await response.json()) as {
        rules?: Omit<
          ShopSkuPricingRule,
          "id" | "product_id" | "created_at" | "updated_at"
        >[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || "AI could not suggest rules.");
      const rules = data.rules ?? [];
      for (const rule of rules) await addPricingRule(rule);
      setToast({
        type: "success",
        message: `Applied ${rules.length} AI-suggested pricing rule${rules.length === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to suggest rules. Add an OPENAI_API_KEY to enable AI.",
      });
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <Section
      title="Pricing Rules"
      description="Enterprise rule engine — the highest-priority matching rule sets each SKU's price automatically."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {pricingRules.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#C9A24B]/30 bg-[#FAF7EF] p-6 text-center text-xs text-[#6F7192]">
              No pricing rules yet. Rules make premium materials cost more
              automatically — e.g.{" "}
              <span className="font-semibold">Gold +15%</span> or{" "}
              <span className="font-semibold">Leather +₹5,000</span>.
            </div>
          )}
          {pricingRules.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#C9A24B]/15 bg-white p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
            >
              <button
                type="button"
                onClick={() =>
                  updatePricingRule(rule.id, { is_active: !rule.is_active })
                }
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${rule.is_active ? "bg-[#B8860B]" : "bg-gray-200"}`}
                aria-pressed={rule.is_active}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${rule.is_active ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[#0F1B3D]">
                  {rule.name}
                </div>
                <div className="mt-0.5 text-xs text-[#6F7192]">
                  {Object.keys(rule.conditions).length > 0
                    ? Object.entries(rule.conditions)
                        .map(
                          ([key, val]) =>
                            `${key}: ${Array.isArray(val) ? val.join(", ") : val}`,
                        )
                        .join(" · ")
                    : "Applies to all combinations"}
                </div>
              </div>
              <span className="rounded-lg bg-[#F4EDDC] px-2.5 py-1 font-mono text-xs font-bold text-[#B8860B]">
                {pricingRuleLabel(rule.rule_type, rule.value)}
              </span>
              <span className="text-xs text-[#6F7192]">P{rule.priority}</span>
              <button
                type="button"
                onClick={() => void deletePricingRule(rule.id)}
                className="rounded-lg p-2 text-[#6F7192] transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => void runAiRules()}
            disabled={aiBusy || variants.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#C9A24B]/30 px-4 py-2.5 text-sm font-semibold text-[#B8860B] transition hover:bg-[#C9A24B]/10 disabled:opacity-40"
          >
            {aiBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Suggest Rules with AI
          </button>

          <div className="rounded-2xl border border-[#C9A24B]/20 bg-gradient-to-b from-[#FAF7EF] to-white p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B8860B]">
              <Plus className="h-3.5 w-3.5" />
              New Rule
            </div>
            <div className="space-y-2.5">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Rule name — e.g. Gold premium"
                className="w-full rounded-xl border border-[#C9A24B]/20 bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#C9A24B]/50"
              />
              <select
                value={ruleType}
                onChange={(event) =>
                  setRuleType(event.target.value as PricingRuleType)
                }
                className="w-full rounded-xl border border-[#C9A24B]/20 bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none"
              >
                {RULE_TYPES.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.label}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  type="number"
                  placeholder="Value"
                  className="w-full rounded-xl border border-[#C9A24B]/20 bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none"
                />
                <input
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  type="number"
                  placeholder="Priority"
                  className="w-full rounded-xl border border-[#C9A24B]/20 bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={conditionName}
                  onChange={(event) => {
                    setConditionName(event.target.value);
                    setConditionValue("");
                  }}
                  className="w-full rounded-xl border border-[#C9A24B]/20 bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none"
                >
                  <option value="">All options</option>
                  {discreteOptions.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <input
                  value={conditionValue}
                  onChange={(event) => setConditionValue(event.target.value)}
                  placeholder="Values (comma-separated)"
                  className="w-full rounded-xl border border-[#C9A24B]/20 bg-white px-3 py-2 text-sm text-[#0F1B3D] outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleAdd()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F1B3D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1B2A54]"
              >
                <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                Add Rule
              </button>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
