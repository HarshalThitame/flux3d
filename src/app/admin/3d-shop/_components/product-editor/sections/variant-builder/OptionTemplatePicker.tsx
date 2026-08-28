"use client";

import { useState } from "react";
import { Box, Lamp, Printer, Puzzle, Sparkles } from "lucide-react";

type OptionTemplate = {
  name: string;
  type: string;
  values: string[];
  metadata?: Record<
    string,
    { hex_color?: string; description?: string; price_modifier?: number }
  >;
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
    id: "decor-lighting",
    label: "Decor & Lighting",
    icon: <Lamp className="h-4 w-4" />,
    description: "Material · Colour · Size · Finish · Bulb",
    options: [
      {
        name: "Material",
        type: "swatch_color",
        values: ["PLA", "PETG", "Resin", "Wood Fill"],
        metadata: {
          PLA: {
            hex_color: "#4A9E8E",
            description: "Eco-friendly staple, crisp detail",
            price_modifier: 0,
          },
          PETG: {
            hex_color: "#3E8CC4",
            description: "Heat & moisture resistant — lamp-safe",
            price_modifier: 150,
          },
          Resin: {
            hex_color: "#B76E79",
            description: "Premium glossy resin, ultra-fine detail",
            price_modifier: 300,
          },
          "Wood Fill": {
            hex_color: "#A9745A",
            description: "Natural wood-textured composite",
            price_modifier: 200,
          },
        },
      },
      {
        name: "Colour",
        type: "swatch_color",
        values: ["Ivory", "Charcoal", "Sage", "Terracotta", "Midnight Blue"],
        metadata: {
          Ivory: { hex_color: "#FFFFF0", description: "Warm neutral base" },
          Charcoal: { hex_color: "#36454F", description: "Bold, modern depth" },
          Sage: { hex_color: "#9CAF88", description: "Soft botanical tone" },
          Terracotta: {
            hex_color: "#C06C44",
            description: "Earthy hand-made feel",
          },
          "Midnight Blue": {
            hex_color: "#1F3A5F",
            description: "Deep, calming statement",
          },
        },
      },
      {
        name: "Size",
        type: "dropdown",
        values: ["Small", "Medium", "Large", "XL"],
      },
      {
        name: "Finish",
        type: "button",
        values: ["Raw", "Sanded", "Painted"],
        metadata: {
          Raw: {
            description: "Straight off the build plate",
            price_modifier: 0,
          },
          Sanded: {
            description: "Hand-smoothed surface",
            price_modifier: 200,
          },
          Painted: {
            description: "Primed & spray-painted to spec",
            price_modifier: 500,
          },
        },
      },
      {
        name: "Bulb Type",
        type: "dropdown",
        values: ["E27", "E14", "USB LED", "None"],
        metadata: {
          None: { description: "Decor piece, no socket" },
        },
      },
    ],
  },
  {
    id: "organizer",
    label: "Organizer",
    icon: <Box className="h-4 w-4" />,
    description: "Material · Colour · Size · Infill · Finish",
    options: [
      {
        name: "Material",
        type: "swatch_color",
        values: ["PLA", "ABS", "PETG", "TPU"],
        metadata: {
          PLA: { hex_color: "#4A9E8E", description: "Eco-friendly staple" },
          ABS: {
            hex_color: "#E8A33D",
            description: "Tough & heat resistant",
            price_modifier: 150,
          },
          PETG: {
            hex_color: "#3E8CC4",
            description: "Durable, food-safe friendly",
            price_modifier: 100,
          },
          TPU: {
            hex_color: "#7B68EE",
            description: "Flexible grip surfaces",
            price_modifier: 250,
          },
        },
      },
      {
        name: "Colour",
        type: "swatch_color",
        values: ["White", "Black", "Grey", "Sand", "Olive"],
        metadata: {
          White: { hex_color: "#FFFFFF", description: "Clean, minimal" },
          Black: { hex_color: "#1A1A1A", description: "Studio contrast" },
          Grey: { hex_color: "#8C8C8C", description: "Understated neutral" },
          Sand: { hex_color: "#D8C3A5", description: "Warm natural tone" },
          Olive: { hex_color: "#708238", description: "Muted earthy green" },
        },
      },
      {
        name: "Size",
        type: "dropdown",
        values: ["Small", "Medium", "Large"],
      },
      {
        name: "Infill",
        type: "dropdown",
        values: ["20%", "50%", "100%"],
        metadata: {
          "20%": { description: "Light & fast to print", price_modifier: 0 },
          "50%": { description: "Balanced strength", price_modifier: 150 },
          "100%": {
            description: "Fully solid, maximum rigidity",
            price_modifier: 400,
          },
        },
      },
      {
        name: "Finish",
        type: "button",
        values: ["Raw", "Sanded"],
        metadata: {
          Raw: {
            description: "Straight off the build plate",
            price_modifier: 0,
          },
          Sanded: {
            description: "Hand-smoothed surface",
            price_modifier: 150,
          },
        },
      },
    ],
  },
  {
    id: "toy-figurine",
    label: "Toy & Figurine",
    icon: <Puzzle className="h-4 w-4" />,
    description: "Material · Colour · Size · Finish · Movement",
    options: [
      {
        name: "Material",
        type: "swatch_color",
        values: ["PLA", "Resin", "TPU"],
        metadata: {
          PLA: {
            hex_color: "#4A9E8E",
            description: "Kid-safe, vivid colours",
            price_modifier: 0,
          },
          Resin: {
            hex_color: "#B76E79",
            description: "Museum-grade fine detail",
            price_modifier: 500,
          },
          TPU: {
            hex_color: "#7B68EE",
            description: "Soft & flexible for squish toys",
            price_modifier: 300,
          },
        },
      },
      {
        name: "Colour",
        type: "swatch_color",
        values: ["Crimson", "Azure", "Violet", "Neon Green", "Rainbow"],
        metadata: {
          Crimson: { hex_color: "#DC143C", description: "Playful, bold red" },
          Azure: { hex_color: "#007FFF", description: "Bright sky blue" },
          Violet: { hex_color: "#8F00FF", description: "Royal pop of purple" },
          "Neon Green": {
            hex_color: "#39FF14",
            description: "Glow-in-the-dark energy",
          },
          Rainbow: { hex_color: "#FF6B6B", description: "Multi-colour blend" },
        },
      },
      {
        name: "Size",
        type: "dropdown",
        values: ["Small", "Medium", "Large", "XL"],
      },
      {
        name: "Finish",
        type: "button",
        values: ["Raw", "Painted", "Varnished"],
        metadata: {
          Raw: {
            description: "Straight off the build plate",
            price_modifier: 0,
          },
          Painted: {
            description: "Hand-painted detail & eyes",
            price_modifier: 400,
          },
          Varnished: {
            description: "Sealed, shiny protective coat",
            price_modifier: 250,
          },
        },
      },
      {
        name: "Movement",
        type: "button",
        values: ["Fixed", "Articulated"],
        metadata: {
          Fixed: { description: "One solid piece", price_modifier: 0 },
          Articulated: {
            description: "Movable joints & limbs",
            price_modifier: 200,
          },
        },
      },
    ],
  },
  {
    id: "custom-print",
    label: "Custom Print",
    icon: <Printer className="h-4 w-4" />,
    description: "Material · Colour · Layer Height · Infill · Finish",
    options: [
      {
        name: "Material",
        type: "swatch_color",
        values: ["PLA", "PETG", "ABS", "Nylon", "Carbon Fiber"],
        metadata: {
          PLA: {
            hex_color: "#4A9E8E",
            description: "Eco-friendly staple, crisp detail",
            price_modifier: 0,
          },
          PETG: {
            hex_color: "#3E8CC4",
            description: "Durable & moisture resistant",
            price_modifier: 150,
          },
          ABS: {
            hex_color: "#E8A33D",
            description: "Tough, acetone-smoothable",
            price_modifier: 250,
          },
          Nylon: {
            hex_color: "#D3D3D3",
            description: "Engineering-grade strength",
            price_modifier: 600,
          },
          "Carbon Fiber": {
            hex_color: "#2C2C2C",
            description: "Ultra-rigid, matte weave finish",
            price_modifier: 800,
          },
        },
      },
      {
        name: "Colour",
        type: "swatch_color",
        values: ["White", "Black", "Grey", "Red", "Blue"],
        metadata: {
          White: { hex_color: "#FFFFFF", description: "Clean, paintable base" },
          Black: { hex_color: "#1A1A1A", description: "Sleek, dark neutral" },
          Grey: { hex_color: "#8C8C8C", description: "Prototype standard" },
          Red: { hex_color: "#E53935", description: "High-visibility pop" },
          Blue: { hex_color: "#1E5AA8", description: "Cool, dependable tone" },
        },
      },
      {
        name: "Layer Height",
        type: "dropdown",
        values: ["0.12mm", "0.20mm", "0.28mm"],
        metadata: {
          "0.12mm": {
            description: "Fine — smooth surfaces",
            price_modifier: 300,
          },
          "0.20mm": {
            description: "Standard — best balance",
            price_modifier: 0,
          },
          "0.28mm": {
            description: "Draft — fast & strong",
            price_modifier: -100,
          },
        },
      },
      {
        name: "Infill",
        type: "dropdown",
        values: ["10%", "20%", "50%", "100%"],
        metadata: {
          "10%": {
            description: "Hollow — light display pieces",
            price_modifier: 0,
          },
          "20%": { description: "Light but sturdy", price_modifier: 50 },
          "50%": { description: "Balanced strength", price_modifier: 200 },
          "100%": {
            description: "Fully solid, maximum rigidity",
            price_modifier: 450,
          },
        },
      },
      {
        name: "Finish",
        type: "button",
        values: ["Raw", "Sanded", "Painted"],
        metadata: {
          Raw: {
            description: "Straight off the build plate",
            price_modifier: 0,
          },
          Sanded: {
            description: "Hand-smoothed surface",
            price_modifier: 200,
          },
          Painted: {
            description: "Primed & painted to spec",
            price_modifier: 500,
          },
        },
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
        Curated 3D Print Templates
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
