"use client";

import { useMemo, useState } from "react";
import type { DraftVariant } from "../../types";

function swatchBackground(value: string) {
  if (
    value.startsWith("#") ||
    value.startsWith("rgb") ||
    value.startsWith("hsl")
  )
    return value;
  return value.toLowerCase();
}

/**
 * A miniature, luxury-styled preview of how the variant options will render
 * on the public product page. Updates live as the admin edits values.
 */
export function VariantLivePreview({ variants }: { variants: DraftVariant[] }) {
  const [selection, setSelection] = useState<Record<string, string>>({});
  const discrete = useMemo(
    () =>
      variants.filter((v) => !["toggle", "text_input"].includes(v.option_type)),
    [variants],
  );

  if (discrete.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#C9A24B]/20 bg-gradient-to-b from-[#0B1220] to-[#121A2E] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C9A24B] shadow-[0_0_8px_rgba(201,162,75,0.9)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C9A24B]">
            Live Product Preview
          </span>
        </div>
        <span className="text-[10px] text-white/40">Configure Your Piece</span>
      </div>

      <div className="space-y-5">
        {discrete.map((option) => {
          const values = option.values ?? [];
          const selected = selection[option.option_name];
          return (
            <div key={option.id} className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <div className="text-xs font-semibold text-white/90">
                  Choose {option.option_name}
                </div>
                {selected ? (
                  <div className="text-xs text-[#C9A24B]">{selected}</div>
                ) : (
                  <div className="text-xs text-white/35">Select</div>
                )}
              </div>

              {option.option_type === "swatch_color" ? (
                <div className="flex flex-wrap gap-2.5">
                  {values.map((value) => {
                    const meta = option.value_metadata?.[value];
                    const active = selected === value;
                    const isSelected = active;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setSelection((s) => ({
                            ...s,
                            [option.option_name]: value,
                          }))
                        }
                        className={`relative h-12 w-12 overflow-hidden rounded-full border-2 transition ${
                          isSelected
                            ? "border-[#C9A24B] ring-2 ring-[#C9A24B]/25"
                            : "border-white/15 hover:border-white/40"
                        }`}
                        title={meta?.description ?? value}
                      >
                        {meta?.swatch_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={meta.swatch_image_url}
                            alt={value}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span
                            className="block h-full w-full"
                            style={{ background: swatchBackground(value) }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : option.option_type === "dropdown" ? (
                <select
                  value={selected ?? ""}
                  onChange={(event) =>
                    setSelection((s) => ({
                      ...s,
                      [option.option_name]: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs text-white outline-none"
                >
                  <option value="" className="text-black">
                    Select {option.option_name}
                  </option>
                  {values.map((value) => (
                    <option key={value} value={value} className="text-black">
                      {value}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {values.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setSelection((s) => ({
                          ...s,
                          [option.option_name]: value,
                        }))
                      }
                      className={`min-h-[38px] rounded-xl border px-4 text-xs font-semibold transition ${
                        selected === value
                          ? "border-[#C9A24B] bg-[#C9A24B]/15 text-[#E8CF8B]"
                          : "border-white/15 bg-white/5 text-white/70 hover:border-[#C9A24B]/60"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/50">Configuration</span>
          <span className="font-semibold text-white">
            {Object.keys(selection).length > 0
              ? Object.entries(selection)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(" · ")
              : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
