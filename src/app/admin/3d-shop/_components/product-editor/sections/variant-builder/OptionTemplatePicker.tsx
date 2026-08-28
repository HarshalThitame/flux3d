"use client";

import { useState } from "react";
import { Gem, Shirt, Sofa, Smartphone, Sparkles } from "lucide-react";

type OptionTemplate = {
  name: string;
  type: string;
  values: string[];
  metadata?: Record<string, { hex_color?: string; description?: string }>;
};

type TemplateDef = {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  options: OptionTemplate[];
};

const TEMPLATES: TemplateDef[] = [
  {
    id: "jewelry",
    label: "Jewellery",
    icon: <Gem className="h-4 w-4" />,
    description: "Metal · Gemstone · Ring Size · Engraving",
    options: [
      {
        name: "Metal",
        type: "swatch_color",
        values: ["Gold", "Rose Gold", "Silver", "Platinum"],
        metadata: {
          Gold: {
            hex_color: "#D4AF37",
            description: "18K gold, radiant and timeless",
          },
          "Rose Gold": {
            hex_color: "#B76E79",
            description: "Warm blush-tone gold",
          },
          Silver: {
            hex_color: "#C0C0C0",
            description: "Bright polished sterling",
          },
          Platinum: {
            hex_color: "#E5E4E2",
            description: "Rare and durable platinum",
          },
        },
      },
      {
        name: "Gemstone",
        type: "swatch_color",
        values: ["Diamond", "Sapphire", "Emerald", "Ruby"],
        metadata: {
          Diamond: {
            hex_color: "#E6F2FF",
            description: "Flawless brilliant-cut",
          },
          Sapphire: { hex_color: "#0F52BA", description: "Deep royal blue" },
          Emerald: { hex_color: "#50C878", description: "Vivid natural green" },
          Ruby: { hex_color: "#E0115F", description: "Rich pigeon-blood red" },
        },
      },
      {
        name: "Ring Size",
        type: "dropdown",
        values: ["5", "6", "7", "8", "9", "10", "11", "12"],
      },
      { name: "Engraving", type: "text_input", values: [] },
    ],
  },
  {
    id: "furniture",
    label: "Furniture",
    icon: <Sofa className="h-4 w-4" />,
    description: "Material · Finish · Leg Style",
    options: [
      {
        name: "Material",
        type: "swatch_color",
        values: ["Solid Oak", "Walnut", "Italian Leather", "Velvet"],
        metadata: {
          "Solid Oak": {
            hex_color: "#CDA27D",
            description: "FSC-certified European oak",
          },
          Walnut: {
            hex_color: "#6B4423",
            description: "Dark rich American walnut",
          },
          "Italian Leather": {
            hex_color: "#8B4513",
            description: "Full-grain hand-finished",
          },
          Velvet: { hex_color: "#4B3B6E", description: "Plush Belgian velvet" },
        },
      },
      {
        name: "Finish",
        type: "button",
        values: ["Matte", "Gloss", "Brushed", "Cerused"],
      },
      {
        name: "Leg Style",
        type: "button",
        values: ["Tapered", "Splayed", "Hairpin", "Turned"],
      },
    ],
  },
  {
    id: "apparel",
    label: "Apparel",
    icon: <Shirt className="h-4 w-4" />,
    description: "Size · Colour · Fit · Fabric",
    options: [
      {
        name: "Size",
        type: "dropdown",
        values: ["XS", "S", "M", "L", "XL", "XXL"],
      },
      {
        name: "Colour",
        type: "swatch_color",
        values: ["Ivory", "Charcoal", "Sage", "Bordeaux"],
        metadata: {
          Ivory: { hex_color: "#FFFFF0" },
          Charcoal: { hex_color: "#36454F" },
          Sage: { hex_color: "#9CAF88" },
          Bordeaux: { hex_color: "#5C0029" },
        },
      },
      { name: "Fit", type: "button", values: ["Slim", "Regular", "Relaxed"] },
      {
        name: "Fabric",
        type: "button",
        values: ["Cotton", "Linen", "Silk", "Cashmere"],
      },
    ],
  },
  {
    id: "electronics",
    label: "Gadgets",
    icon: <Smartphone className="h-4 w-4" />,
    description: "Colour · Storage · Finish",
    options: [
      {
        name: "Colour",
        type: "swatch_color",
        values: ["Obsidian", "Arctic Silver", "Sage Green"],
        metadata: {
          Obsidian: { hex_color: "#1F1F1F" },
          "Arctic Silver": { hex_color: "#C9D1D9" },
          "Sage Green": { hex_color: "#A3B18A" },
        },
      },
      {
        name: "Storage",
        type: "button",
        values: ["128GB", "256GB", "512GB", "1TB"],
      },
      {
        name: "Finish",
        type: "button",
        values: ["Brushed Aluminium", "Piano Gloss", "Titanium"],
      },
    ],
  },
];

export function OptionTemplatePicker({
  onApply,
}: {
  onApply: (template: TemplateDef) => Promise<void> | void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function apply(template: TemplateDef) {
    setBusyId(template.id);
    try {
      await onApply(template);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-[#C9A24B]/15 bg-gradient-to-b from-[#FAF7EF] to-white p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#B8860B]">
        <Sparkles className="h-3.5 w-3.5" />
        Curated Templates
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => void apply(template)}
            disabled={busyId !== null}
            className="group flex items-center gap-3 rounded-xl border border-[#C9A24B]/20 bg-white p-3 text-left transition hover:border-[#C9A24B]/50 hover:shadow-[0_4px_16px_rgba(201,162,75,0.15)] disabled:opacity-50"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#F4EDDC] text-[#B8860B] transition group-hover:bg-[#C9A24B] group-hover:text-white">
              {template.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[#0F1B3D]">
                {template.label}
              </span>
              <span className="block truncate text-xs text-[#6F7192]">
                {template.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
