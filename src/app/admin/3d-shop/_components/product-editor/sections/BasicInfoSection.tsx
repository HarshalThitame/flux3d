"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useProductEditor } from "../editor-context";
import {
  AiAssistButton,
  AiGenerateAllButton,
  AiToneSelector,
} from "../AiAssist";
import { FieldError, Section, TagInput, inputClass } from "../ui";
import { LongDescriptionSection } from "./LongDescriptionSection";
import { occasionTags } from "../types";

export function BasicInfoSection() {
  const {
    product,
    errors,
    updateProduct,
    markTouched,
    slugStatus,
    markSlugTouched,
    categories,
    aiPrompt,
    setAiPrompt,
    variantDimensions,
    variants,
    skus,
  } = useProductEditor();
  const [shortDescriptionFocused, setShortDescriptionFocused] = useState(false);

  const hasRichContext =
    variants.length > 0 || variantDimensions.length > 0 || skus.length > 0;

  return (
    <Section
      title="Basic Info"
      description="Core product details, copy, tags, and categorization."
    >
      <div className="rounded-2xl border border-[#6d28d9]/15 bg-gradient-to-r from-[#6d28d9]/5 to-[#7c3aed]/5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-[#0F1B3D]">
              AI Writing Assist
            </div>
            <div className="mt-0.5 text-xs text-[#6F7192]">
              {hasRichContext
                ? "Generates copy using your product name, variants, colors, dimensions, and SKU pricing."
                : "Generate descriptions, SEO copy, and tags from your product name and category."}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AiToneSelector />
            <AiGenerateAllButton />
          </div>
        </div>

        <div className="mt-3">
          <label
            htmlFor="ai-prompt"
            className="mb-1.5 block text-xs font-medium text-[#6F7192]"
          >
            AI Instructions (optional)
          </label>
          <textarea
            id="ai-prompt"
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            rows={2}
            placeholder="Tell the AI exactly what you want, e.g. Focus on sustainability and hand-finished quality, target interior designers, emphasise the matte finish and exact dimensions."
            className="w-full resize-none rounded-xl border border-[#6d28d9]/15 bg-white/80 px-3 py-2 text-xs text-[#0F1B3D] outline-none transition placeholder:text-[#a1a3c0] focus:border-[#6d28d9]/40"
          />
          <p className="mt-1 text-[11px] leading-4 text-[#6F7192]">
            Applied to every AI button below. Leave empty to use the smart
            default — copy is always generated from real variant and dimension
            data.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-[#6F7192]"
            htmlFor="product-name"
          >
            Name
          </label>
          <input
            id="product-name"
            value={product.name}
            onChange={(event) => updateProduct("name", event.target.value)}
            onBlur={() => markTouched("name")}
            placeholder="e.g. Dragon Crystal Figurine"
            className={`${inputClass} ${errors.name ? "border-rose-300 bg-rose-50/30" : ""}`}
          />
          <FieldError message={errors.name} />
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-[#6F7192]"
            htmlFor="product-slug"
          >
            Slug
          </label>
          <div className="flex items-center gap-2">
            <input
              id="product-slug"
              value={product.slug}
              onChange={(event) => {
                markSlugTouched();
                updateProduct(
                  "slug",
                  event.target.value
                    .replace(/[^a-z0-9]+/gi, "-")
                    .toLowerCase()
                    .replace(/^-+|-+$/g, ""),
                );
              }}
              onBlur={() => markTouched("slug")}
              placeholder="auto-generated"
              className={`${inputClass} ${errors.slug ? "border-rose-300 bg-rose-50/30" : ""}`}
            />
            {slugStatus === "checking" && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#6F7192]" />
            )}
            {slugStatus === "available" && (
              <span className="shrink-0 text-xs font-semibold text-emerald-700">
                Available
              </span>
            )}
            {slugStatus === "taken" && (
              <span className="shrink-0 text-xs font-semibold text-rose-600">
                Taken
              </span>
            )}
          </div>
          <FieldError message={errors.slug} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-[#6F7192]"
            htmlFor="product-category"
          >
            Primary Category
          </label>
          <select
            id="product-category"
            value={product.category_id || product.product_categories?.find(pc => pc.is_primary)?.category_id || ""}
            onChange={(event) => {
                const val = event.target.value;
                const secondary = product.product_categories?.filter(pc => !pc.is_primary).map(pc => pc.category_id) || [];
                const newCats = val ? [{ category_id: val, is_primary: true }] : [];
                newCats.push(...secondary.filter(id => id !== val).map(id => ({ category_id: id, is_primary: false })));
                updateProduct("category_id", val);
                updateProduct("product_categories", newCats);
            }}
            className={inputClass}
          >
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <div className="mt-4">
            <span className="mb-2 block text-xs font-medium text-[#6F7192]">Secondary Categories</span>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2 scrollbar-hide">
              <div className="grid gap-1">
                {categories.filter(c => c.id !== (product.category_id || product.product_categories?.find(pc => pc.is_primary)?.category_id)).map(category => (
                  <label key={category.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white text-sm text-[#0F1B3D] cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-[#6d28d9] focus:ring-[#6d28d9]"
                      checked={product.product_categories?.some(pc => !pc.is_primary && pc.category_id === category.id) || false}
                      onChange={(e) => {
                        const primaryId = product.category_id || product.product_categories?.find(pc => pc.is_primary)?.category_id;
                        let secondary = product.product_categories?.filter(pc => !pc.is_primary).map(pc => pc.category_id) || [];
                        if (e.target.checked) {
                            secondary.push(category.id);
                        } else {
                            secondary = secondary.filter(id => id !== category.id);
                        }
                        const newCats = primaryId ? [{ category_id: primaryId, is_primary: true }] : [];
                        newCats.push(...secondary.map(id => ({ category_id: id, is_primary: false })));
                        updateProduct("product_categories", newCats);
                      }}
                    />
                    {category.name}
                  </label>
                ))}
                {categories.length <= 1 && <div className="text-xs text-gray-400 p-2">No other categories available.</div>}
              </div>
            </div>
          </div>
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-[#6F7192]"
            htmlFor="product-price"
          >
            Base Price (₹)
          </label>
          <input
            id="product-price"
            type="number"
            min={0}
            step={1}
            value={product.base_price}
            onChange={(event) =>
              updateProduct("base_price", Number(event.target.value))
            }
            className={`${inputClass} ${errors.base_price ? "border-rose-300 bg-rose-50/30" : ""}`}
          />
          <FieldError message={errors.base_price} />
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label
            className="block text-xs font-medium text-[#6F7192]"
            htmlFor="product-description"
          >
            Short Description
          </label>
          <AiAssistButton
            kind="short_description"
            compact
            label="AI"
            title="Generate short description with AI"
          />
        </div>
        <textarea
          id="product-description"
          maxLength={200}
          rows={3}
          value={product.description}
          onFocus={() => setShortDescriptionFocused(true)}
          onBlur={() => setShortDescriptionFocused(false)}
          onChange={(event) => updateProduct("description", event.target.value)}
          placeholder="A short punchy summary shown in cards and listings."
          className={`${inputClass} resize-none ${errors.description ? "border-rose-300 bg-rose-50/30" : ""}`}
        />
        <div className="mt-1 flex items-center justify-between">
          <FieldError message={errors.description} />
          <span
            className={`ml-auto text-xs ${product.description.length > 200 ? "font-semibold text-rose-600" : "text-[#6F7192]"}`}
          >
            {shortDescriptionFocused ? `${product.description.length}/200` : ""}
          </span>
        </div>
      </div>

      <LongDescriptionSection />

      <div className="grid gap-5 lg:grid-cols-2">
        <TagInput
          label="Tags"
          value={product.tags}
          onChange={(value) => updateProduct("tags", value)}
          placeholder="Type tag and press Enter"
          action={
            <AiAssistButton
              kind="tags"
              compact
              label="AI"
              title="Suggest tags with AI"
            />
          }
        />
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-[#6F7192]">
              Occasion Tags
            </span>
            <AiAssistButton
              kind="occasion_tags"
              compact
              label="AI"
              title="Suggest occasion tags with AI"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {occasionTags.map((tag) => (
              <label
                key={tag}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D]"
              >
                <input
                  type="checkbox"
                  checked={product.occasion_tags.includes(tag)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...product.occasion_tags, tag]
                      : product.occasion_tags.filter((item) => item !== tag);
                    updateProduct("occasion_tags", next);
                  }}
                />
                {tag}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
