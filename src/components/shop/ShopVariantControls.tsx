"use client";

import { motion } from "framer-motion";
import type { ShopVariantOption } from "@/lib/shop/admin-types";
import type { ShopSelectedOptions } from "@/lib/shop/selection";

function swatchBackground(value: string) {
  if (
    value.startsWith("#") ||
    value.startsWith("rgb") ||
    value.startsWith("hsl")
  )
    return value;
  return value.toLowerCase();
}

function formatDelta(modifier: number | null | undefined) {
  if (!modifier || !Number.isFinite(modifier)) return null;
  const sign = modifier > 0 ? "+" : "";
  return `${sign}₹${modifier.toLocaleString("en-IN")}`;
}

/**
 * Cinematic, luxury variant selector. Uses rich swatch images when available,
 * surfaces each value's micro-story and shows price deltas on hover.
 */
export default function ShopVariantControls({
  options,
  selected,
  onChangeAction,
}: {
  options: ShopVariantOption[];
  selected: ShopSelectedOptions;
  onChangeAction: (name: string, value: string | boolean) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-6">
      {options.map((option) => {
        const values = option.values ?? [];
        const selectedValue = selected[option.option_name];
        const selectedMeta =
          typeof selectedValue === "string"
            ? option.value_metadata?.[selectedValue]
            : undefined;

        return (
          <div key={option.id} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div className="font-[var(--shop-font-heading)] text-sm font-semibold uppercase tracking-[0.18em] text-[var(--shop-text-primary)]">
                Choose {option.option_name}
              </div>
              {selectedValue ? (
                <div className="text-sm font-medium text-[var(--shop-gold)]">
                  {String(selectedValue)}
                </div>
              ) : (
                <div className="text-xs text-[var(--shop-text-muted)]">
                  Select
                </div>
              )}
            </div>

            {option.option_type === "swatch_color" ? (
              <div className="flex flex-wrap gap-3">
                {values.map((value) => {
                  const meta = option.value_metadata?.[value] ?? {};
                  const active = selectedValue === value;
                  const hasImage = Boolean(meta.swatch_image_url);
                  const delta = formatDelta(meta.price_modifier);
                  return (
                    <motion.button
                      key={value}
                      type="button"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.96 }}
                      aria-label={value}
                      title={meta.description ?? value}
                      onClick={() => onChangeAction(option.option_name, value)}
                      className={`group relative h-14 w-14 overflow-hidden rounded-full border-2 transition ${
                        active
                          ? "border-[var(--shop-gold)] ring-4 ring-[var(--shop-gold)]/25 shadow-[0_0_18px_rgba(201,162,75,0.45)]"
                          : "border-[var(--shop-border-light)] hover:border-[var(--shop-gold)]/60"
                      }`}
                    >
                      {hasImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={meta.swatch_image_url as string}
                          alt={value}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-125"
                        />
                      ) : (
                        <span
                          className="block h-full w-full transition duration-300 group-hover:scale-110"
                          style={{
                            background:
                              meta.hex_color || swatchBackground(value),
                          }}
                        />
                      )}
                      {delta && active && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--shop-text-primary)] px-1.5 py-0.5 text-[9px] font-bold text-white">
                          {delta}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ) : option.option_type === "dropdown" ? (
              <select
                value={typeof selectedValue === "string" ? selectedValue : ""}
                onChange={(event) =>
                  onChangeAction(option.option_name, event.target.value)
                }
                className="min-h-[48px] w-full rounded-xl border border-[var(--shop-border-light)] bg-white px-3 text-sm text-[var(--shop-text-primary)] outline-none transition focus:border-[var(--shop-gold)]"
              >
                <option value="">Select {option.option_name}</option>
                {values.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            ) : option.option_type === "toggle" ? (
              <button
                type="button"
                aria-pressed={Boolean(selectedValue)}
                onClick={() =>
                  onChangeAction(option.option_name, !selectedValue)
                }
                className={`relative h-10 w-[56px] rounded-full transition ${selectedValue ? "bg-[var(--shop-gold)]" : "bg-[var(--shop-border-medium)]"}`}
              >
                <span
                  className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow-sm transition ${selectedValue ? "translate-x-[20px]" : "translate-x-1"}`}
                />
              </button>
            ) : option.option_type === "text_input" ? (
              <input
                value={typeof selectedValue === "string" ? selectedValue : ""}
                onChange={(event) =>
                  onChangeAction(
                    option.option_name,
                    event.target.value.slice(0, 50),
                  )
                }
                placeholder={`Personalise your ${option.option_name.toLowerCase()}`}
                className="min-h-[48px] w-full rounded-xl border border-[var(--shop-border-light)] bg-white px-3 text-sm text-[var(--shop-text-primary)] outline-none transition focus:border-[var(--shop-gold)]"
              />
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {values.map((value) => {
                  const meta = option.value_metadata?.[value] ?? {};
                  const active = selectedValue === value;
                  const hasImage = Boolean(meta.swatch_image_url);
                  const delta = formatDelta(meta.price_modifier);
                  return (
                    <motion.button
                      key={value}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onChangeAction(option.option_name, value)}
                      title={meta.description ?? value}
                      className={`group relative min-h-[48px] overflow-hidden rounded-xl border-2 px-4 text-sm font-semibold transition ${
                        active
                          ? "border-[var(--shop-gold)] bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]"
                          : "border-[var(--shop-border-light)] bg-white text-[var(--shop-text-secondary)] hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
                      }`}
                    >
                      {hasImage && (
                        <span className="mr-2 inline-block h-5 w-5 -translate-y-px overflow-hidden rounded-full align-middle ring-1 ring-black/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={meta.swatch_image_url as string}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </span>
                      )}
                      {value}
                      {delta && (
                        <span className="ml-2 text-[11px] font-bold opacity-70">
                          {delta}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
            {selectedMeta?.description && (
              <motion.p
                key={String(selectedValue)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="text-xs leading-relaxed text-[var(--shop-text-muted)]"
              >
                {selectedMeta.description}
              </motion.p>
            )}
          </div>
        );
      })}
    </div>
  );
}
