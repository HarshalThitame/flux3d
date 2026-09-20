"use client";

import { AlertCircle, ShoppingCart, Loader2 } from "lucide-react";
import type {
  QuoteMaterial,
  QuoteConfig,
  PriceBreakdown,
  SlicerResult,
} from "@/lib/quote/types";
import type { AppUserProfile } from "@/lib/auth/server";
import type { PricingSettingsInput } from "@/lib/quote/pricing-waterfall";
import {
  formatDurationMinutes,
  postProcessingOptions,
} from "@/lib/quote/pricing-engine";
import { layerHeightOptions } from "@/lib/quote/materials";

type RightSidebarProps = {
  materials: QuoteMaterial[];
  config: QuoteConfig;
  onConfigChange: (update: Partial<QuoteConfig>) => void;
  onMaterialChange: (materialId: string) => void;
  priceBreakdown: PriceBreakdown | null;
  slicerStatus: string | null;
  slicerError: string | null;
  slicerResult?: SlicerResult;
  onSlice: () => void;
  onAddToCart: () => void;
  onSaveQuote: () => void;
  isInCart: boolean;
  user: AppUserProfile | null;
  pricingSettings: PricingSettingsInput;
  quoteId: string;
  savingQuote: boolean;
};

export default function RightSidebar({
  materials,
  config,
  onConfigChange,
  onMaterialChange,
  priceBreakdown,
  slicerStatus,
  slicerError,
  slicerResult,
  onSlice,
  onAddToCart,
  onSaveQuote,
  isInCart,
  user,
  pricingSettings,
  quoteId,
  savingQuote,
}: RightSidebarProps) {
  const selectedMaterial =
    materials.find((m) => m.id === config.materialId) || materials[0];

  return (
    <div className="flex h-full w-[340px] flex-col overflow-y-auto border-l border-[#6d28d9]/10 bg-white p-5 shrink-0 shadow-sm">
      <div className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6F7192]">
          Material
        </h3>
        <select
          value={config.materialId}
          onChange={(e) => onMaterialChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#6d28d9] focus:ring-1 focus:ring-[#6d28d9]"
        >
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        {selectedMaterial &&
          selectedMaterial.colors &&
          selectedMaterial.colors.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-[11px] font-medium text-gray-500 uppercase">
                Color
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedMaterial.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => onConfigChange({ color: c.name })}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                      config.color === c.name
                        ? "bg-[#6d28d9] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
      </div>

      <div className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6F7192]">
          Print Settings
        </h3>

        <div className="space-y-4">
          {/* Layer Height */}
          <div>
            <label className="mb-1.5 flex text-xs font-medium text-gray-700">
              Layer Height
            </label>
            <div className="flex gap-2">
              {layerHeightOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onConfigChange({ layerHeight: opt.value })}
                  className={`flex-1 rounded-lg border py-1.5 text-xs transition-colors ${
                    config.layerHeight === opt.value
                      ? "border-[#6d28d9] bg-purple-50 text-purple-700 font-semibold"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.value}mm
                </button>
              ))}
            </div>
          </div>

          {/* Infill */}
          <div>
            <label className="mb-1.5 flex justify-between text-xs font-medium text-gray-700">
              <span>Infill Density</span>
              <span className="font-mono text-purple-600">
                {config.infill}%
              </span>
            </label>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={config.infill}
              onChange={(e) =>
                onConfigChange({ infill: Number(e.target.value) })
              }
              className="w-full accent-[#6d28d9]"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-1.5 flex text-xs font-medium text-gray-700">
              Quantity
            </label>
            <input
              type="number"
              min={1}
              max={999}
              value={config.quantity}
              onChange={(e) =>
                onConfigChange({ quantity: parseInt(e.target.value) || 1 })
              }
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#6d28d9] focus:ring-1 focus:ring-[#6d28d9]"
            />
          </div>

          {/* Post Processing */}
          <div>
            <label className="mb-1.5 flex text-xs font-medium text-gray-700">
              Post Processing
            </label>
            <select
              value={config.postProcessingLevel}
              onChange={(e) =>
                onConfigChange({
                  postProcessingLevel: e.target
                    .value as QuoteConfig["postProcessingLevel"],
                })
              }
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#6d28d9] focus:ring-1 focus:ring-[#6d28d9]"
            >
              {postProcessingOptions.map((opt) => (
                <option key={opt.level} value={opt.level}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100">
        {slicerError && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{slicerError}</span>
          </div>
        )}

        <div className="mb-4">
          <button
            type="button"
            onClick={onSlice}
            disabled={!!slicerStatus}
            className="w-full rounded-xl border border-[#6d28d9] bg-white py-2 text-sm font-semibold text-[#6d28d9] hover:bg-purple-50 disabled:opacity-50 transition-colors"
          >
            {slicerStatus ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {slicerStatus}
              </span>
            ) : (
              "Slice Plate"
            )}
          </button>
        </div>

        <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200">
          <div className="mb-3 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {priceBreakdown
                ? `₹${priceBreakdown.grandTotal.toLocaleString()}`
                : "₹0"}
            </div>
            {priceBreakdown && (
              <div className="mt-1 text-xs text-gray-500">
                {priceBreakdown.quantity} unit
                {priceBreakdown.quantity > 1 ? "s" : ""} ·{" "}
                {formatDurationMinutes(priceBreakdown.estimatedMinutes)}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onAddToCart}
            disabled={!priceBreakdown}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold shadow-sm transition-all ${
              isInCart
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-[#6d28d9] text-white hover:bg-[#5b21b6]"
            } disabled:opacity-50`}
          >
            <ShoppingCart className="h-4 w-4" />
            {isInCart ? "Update Cart" : "Add to Cart"}
          </button>

          {user && (
            <button
              type="button"
              onClick={onSaveQuote}
              disabled={savingQuote || !priceBreakdown}
              className="mt-2 w-full text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-50 text-center py-1"
            >
              {savingQuote ? "Saving..." : "Save Quote"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
