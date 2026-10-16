"use client";

import { useProductEditor } from "../editor-context";
import { Section, Toggle, inputClass } from "../ui";

export function CustomizationSection() {
  const { product, updateProduct, skus } = useProductEditor();
  const invitation = product.invitation_config;

  return (
    <Section
      title="Customization"
      description="Allow optional or required personalization such as engraving or names."
    >
      <Toggle
        checked={product.is_customizable}
        onChange={(checked) => updateProduct("is_customizable", checked)}
        label="Enable Customization"
        description="Adds a customer text field on the storefront."
      />
      {product.is_customizable && (
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label
                className="mb-1.5 block text-xs font-medium text-[#6F7192]"
                htmlFor="customization-label"
              >
                Customization Label
              </label>
              <input
                id="customization-label"
                value={product.customization_label}
                onChange={(event) =>
                  updateProduct("customization_label", event.target.value)
                }
                placeholder="Enter name for engraving"
                className={inputClass}
              />
            </div>

            <Toggle
              checked={product.customization_is_required}
              onChange={(checked) =>
                updateProduct("customization_is_required", checked)
              }
              label="Is Required?"
              description="Customer must enter text to add to cart."
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="mb-1.5 block text-xs font-medium text-[#6F7192]"
                  htmlFor="customization-min"
                >
                  Min Characters
                </label>
                <input
                  id="customization-min"
                  type="number"
                  min="0"
                  value={product.customization_min_length}
                  onChange={(event) =>
                    updateProduct(
                      "customization_min_length",
                      parseInt(event.target.value) || 0,
                    )
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block text-xs font-medium text-[#6F7192]"
                  htmlFor="customization-max"
                >
                  Max Characters
                </label>
                <input
                  id="customization-max"
                  type="number"
                  min="1"
                  value={product.customization_max_length}
                  onChange={(event) =>
                    updateProduct(
                      "customization_max_length",
                      parseInt(event.target.value) || 1,
                    )
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">
              Preview
            </div>
            <label className="mt-3 block text-sm font-medium text-[#0F1B3D]">
              {product.customization_label || "Enter name for engraving"}
              {product.customization_is_required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <input
              disabled
              placeholder="Customer text appears here"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#6F7192]"
            />
            <div className="mt-1 text-xs text-[#6F7192]">
              {product.customization_min_length}-
              {product.customization_max_length} characters allowed
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-gray-100 pt-5">
        <Toggle
          checked={invitation.enabled}
          onChange={(enabled) =>
            updateProduct("invitation_config", { ...invitation, enabled })
          }
          label="Enable Invitation Studio"
          description="Adds guided wedding/invitation details, a paid sample CTA, and WhatsApp consultation to this product."
        />
        {invitation.enabled && (
          <div className="mt-4 grid gap-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 lg:grid-cols-3">
            <label className="block text-xs font-medium text-[#6F7192]">
              Minimum final cards
              <input
                type="number"
                min="1"
                value={invitation.minFinalQuantity}
                onChange={(event) =>
                  updateProduct("invitation_config", {
                    ...invitation,
                    minFinalQuantity: Math.max(
                      1,
                      Number(event.target.value) || 1,
                    ),
                  })
                }
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <label className="block text-xs font-medium text-[#6F7192]">
              Sample credit validity (days)
              <input
                type="number"
                min="1"
                max="365"
                value={invitation.creditExpiryDays}
                onChange={(event) =>
                  updateProduct("invitation_config", {
                    ...invitation,
                    creditExpiryDays: Math.min(
                      365,
                      Math.max(1, Number(event.target.value) || 1),
                    ),
                  })
                }
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <div className="lg:col-span-3 rounded-xl border border-amber-200 bg-white/80 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#0F1B3D]">
                    Variant sample mapping
                  </p>
                  <p className="mt-0.5 text-xs text-[#6F7192]">
                    Each sample is credited only toward its matching final-card
                    SKU. Blank overrides inherit the defaults above.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateProduct("invitation_config", {
                      ...invitation,
                      sampleSkuId: null,
                      sampleVariants: [
                        ...invitation.sampleVariants,
                        {
                          finalSkuId: skus[0]?.id ?? "",
                          sampleSkuId: skus[1]?.id ?? skus[0]?.id ?? "",
                          minFinalQuantity: null,
                          creditExpiryDays: null,
                        },
                      ],
                    })
                  }
                  disabled={skus.length < 2}
                  className="rounded-lg bg-[#0F1B3D] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add mapping
                </button>
              </div>
              {invitation.sampleVariants.length === 0 ? (
                <p className="mt-3 text-xs text-amber-800">
                  No dedicated mappings yet. Add one for each final size (Small,
                  Medium, Large).
                  {invitation.sampleSkuId
                    ? " This product is currently using the legacy sample fallback."
                    : ""}
                </p>
              ) : null}
              <div className="mt-3 space-y-2">
                {invitation.sampleVariants.map((mapping, index) => {
                  const updateMapping = (patch: Partial<typeof mapping>) =>
                    updateProduct("invitation_config", {
                      ...invitation,
                      sampleSkuId: null,
                      sampleVariants: invitation.sampleVariants.map(
                        (entry, entryIndex) =>
                          entryIndex === index ? { ...entry, ...patch } : entry,
                      ),
                    });
                  return (
                    <div
                      key={`${mapping.finalSkuId}-${index}`}
                      className="grid gap-2 rounded-lg border border-gray-100 p-2 md:grid-cols-[1fr_1fr_130px_130px_auto]"
                    >
                      <select
                        value={mapping.finalSkuId}
                        onChange={(event) =>
                          updateMapping({ finalSkuId: event.target.value })
                        }
                        className={inputClass}
                      >
                        <option value="">Final SKU</option>
                        {skus.map((sku) => (
                          <option key={sku.id} value={sku.id}>
                            {sku.sku_code} · ₹{sku.price}
                          </option>
                        ))}
                      </select>
                      <select
                        value={mapping.sampleSkuId}
                        onChange={(event) =>
                          updateMapping({ sampleSkuId: event.target.value })
                        }
                        className={inputClass}
                      >
                        <option value="">Sample SKU</option>
                        {skus.map((sku) => (
                          <option key={sku.id} value={sku.id}>
                            {sku.sku_code} · ₹{sku.price}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        placeholder="Min default"
                        value={mapping.minFinalQuantity ?? ""}
                        onChange={(event) =>
                          updateMapping({
                            minFinalQuantity: event.target.value
                              ? Math.max(1, Number(event.target.value))
                              : null,
                          })
                        }
                        className={inputClass}
                        aria-label="Minimum final cards override"
                      />
                      <input
                        type="number"
                        min="1"
                        max="365"
                        placeholder="Days default"
                        value={mapping.creditExpiryDays ?? ""}
                        onChange={(event) =>
                          updateMapping({
                            creditExpiryDays: event.target.value
                              ? Math.min(
                                  365,
                                  Math.max(1, Number(event.target.value)),
                                )
                              : null,
                          })
                        }
                        className={inputClass}
                        aria-label="Credit expiry override"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateProduct("invitation_config", {
                            ...invitation,
                            sampleVariants: invitation.sampleVariants.filter(
                              (_, entryIndex) => entryIndex !== index,
                            ),
                          })
                        }
                        className="px-2 text-xs font-semibold text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
