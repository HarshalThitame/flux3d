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

const infillPresets = [
  { value: 10, label: "Hollow", description: "Prototype" },
  { value: 20, label: "Light", description: "Everyday" },
  { value: 40, label: "Standard", description: "Structural" },
  { value: 60, label: "Dense", description: "Load-bearing" },
  { value: 80, label: "Solid", description: "Max strength" },
] as const;

const speedPresets = [
  { value: "quality", label: "Quality", detail: "80 mm/s" },
  { value: "standard", label: "Standard", detail: "150 mm/s" },
  { value: "fast", label: "Fast", detail: "220 mm/s" },
] as const;

const tolerancePresets = [
  { value: "standard", label: "±0.3 mm", detail: "Standard" },
  { value: "fine", label: "±0.2 mm", detail: "Fine +10%" },
  { value: "precision", label: "±0.1 mm", detail: "Precision +25%" },
] as const;

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
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto p-5">
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
            <div className="grid grid-cols-2 gap-2">
              {layerHeightOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onConfigChange({ layerHeight: opt.value })}
                  title={opt.description}
                  className={`rounded-lg border px-2 py-2 text-left text-xs transition-colors ${
                    config.layerHeight === opt.value
                      ? "border-[#6d28d9] bg-purple-50 text-purple-700 font-semibold"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="block font-semibold">{opt.label}</span>
                  <span className="mt-0.5 block text-[10px] opacity-75">
                    {opt.description}
                  </span>
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
            <div className="grid grid-cols-5 gap-1">
              {infillPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onConfigChange({ infill: preset.value })}
                  className={`rounded-lg border px-1 py-2 text-center transition-colors ${
                    config.infill === preset.value
                      ? "border-[#6d28d9] bg-purple-50 text-purple-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="block text-[11px] font-semibold">{preset.value}%</span>
                  <span className="block text-[9px] leading-3">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex justify-between text-xs font-medium text-gray-700">
              <span>Scale</span>
              <span className="font-mono text-purple-600">{config.scaleFactor ?? 100}%</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={25}
                max={400}
                step={5}
                value={config.scaleFactor ?? 100}
                onChange={(event) => onConfigChange({ scaleFactor: Number(event.target.value) })}
                className="min-w-0 flex-1 accent-[#6d28d9]"
              />
              <button
                type="button"
                onClick={() => onConfigChange({ scaleFactor: 100 })}
                className="text-[11px] font-medium text-purple-700 hover:text-purple-900"
              >
                Reset
              </button>
            </div>
            {priceBreakdown && (
              <div className="mt-1.5 rounded-lg bg-gray-50 px-2 py-1.5 font-mono text-[10px] text-gray-600">
                {priceBreakdown.dimensionsMm.x.toFixed(1)} × {priceBreakdown.dimensionsMm.y.toFixed(1)} × {priceBreakdown.dimensionsMm.z.toFixed(1)} mm · {priceBreakdown.scaledVolumeCm3.toFixed(2)} cm³
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 flex justify-between text-xs font-medium text-gray-700">
              <span>Wall Count</span>
              <span className="font-mono text-purple-600">{config.wallCount ?? 3}</span>
            </label>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={config.wallCount ?? 3}
              onChange={(event) => onConfigChange({ wallCount: Number(event.target.value) })}
              className="w-full accent-[#6d28d9]"
            />
            <div className="flex justify-between text-[10px] text-gray-400"><span>1 Thin</span><span>4 Standard</span><span>8 Solid</span></div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">Print Speed</label>
            <div className="grid grid-cols-3 gap-1.5">
              {speedPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onConfigChange({ printSpeedPreset: preset.value })}
                  className={`rounded-lg border px-1 py-2 text-center text-[10px] transition-colors ${
                    (config.printSpeedPreset ?? "standard") === preset.value
                      ? "border-[#6d28d9] bg-purple-50 text-purple-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="block font-semibold">{preset.label}</span>
                  <span className="block opacity-75">{preset.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">Tolerance</label>
            <div className="grid grid-cols-3 gap-1.5">
              {tolerancePresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onConfigChange({ tolerancePreset: preset.value })}
                  className={`rounded-lg border px-1 py-2 text-center text-[10px] transition-colors ${
                    (config.tolerancePreset ?? "standard") === preset.value
                      ? "border-[#6d28d9] bg-purple-50 text-purple-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="block font-semibold">{preset.label}</span>
                  <span className="block opacity-75">{preset.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
            <span><span className="font-medium">Generate supports</span><span className="mt-0.5 block text-[10px] text-gray-500">Added to slicer calculations</span></span>
            <input
              type="checkbox"
              checked={config.supports}
              onChange={(event) => onConfigChange({ supports: event.target.checked })}
              className="h-4 w-4 accent-[#6d28d9]"
            />
          </label>

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
                <option key={opt.value} value={opt.value}>
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
