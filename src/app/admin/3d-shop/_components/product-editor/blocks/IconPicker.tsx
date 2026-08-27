"use client";

import { useState } from "react";
import { Check, ChevronDown, Search, Sparkles } from "lucide-react";
import * as Icons from "lucide-react";

const LUCIDE_ICON_NAMES = [
  "Gem",
  "Sparkles",
  "Cpu",
  "Zap",
  "ShieldCheck",
  "Truck",
  "Package",
  "Palette",
  "Layers",
  "Hand",
  "Box",
  "Gift",
  "Heart",
  "Star",
  "Flame",
  "Droplets",
  "Leaf",
  "Sun",
  "Moon",
  "Bolt",
  "Wrench",
  "Brush",
  "Eye",
  "Lock",
  "Key",
  "Globe",
  "Phone",
  "Monitor",
  "Mouse",
  "BatteryCharging",
  "Cloud",
  "Ruler",
  "Weight",
  "Compass",
  "MapPin",
  "Clock",
  "Calendar",
  "Award",
  "Trophy",
  "Crown",
  "Diamond",
  "Infinity",
  "Anchor",
  "Compass",
  "Crosshair",
  "Headset",
  "Gamepad2",
  "ChefHat",
  "Coffee",
  "Beer",
  "Wine",
  "ShoppingBag",
  "ShoppingCart",
  "TrendingUp",
  "Target",
  "Microscope",
  "TestTube",
  "Syringe",
  "Pill",
  "Stethoscope",
  "Car",
  "Bike",
  "Plane",
  "Rocket",
  "Satellite",
  "Battery",
  "Plug",
  "PlugZap",
  "Usb",
  "Cable",
  "Wifi",
  "Signal",
  "Antenna",
  "RefreshCcw",
  "RotateCcw",
  "Settings2",
  "SlidersHorizontal",
  "Filter",
  "Fingerprint",
  "Scan",
  "QrCode",
  "Barcode",
  "AudioLines",
  "Music",
  "Film",
  "Camera",
  "Video",
  "Image",
  "BookOpen",
  "Library",
  "FileText",
  "ClipboardList",
  "ListChecks",
  "CheckCircle2",
  "CircleCheck",
  "ThumbsUp",
  "ThumbsDown",
  "MessageCircle",
  "MessagesSquare",
  "Users",
  "UserRound",
  "Baby",
  "Dog",
  "Cat",
  "TreePine",
  "Flower2",
  "Sparkle",
  "Wand2",
  "WandSparkles",
  "Paintbrush",
  "Eraser",
  "Scissors",
  "Hammer",
  "Pickaxe",
  "Lightbulb",
  "Lamp",
  "Sofa",
  "Armchair",
  "BedDouble",
  "Utensils",
  "ForkKnife",
  "GlassWater",
  "Milk",
  "EggFried",
  "Sandwich",
  "Cookie",
  "Cake",
  "IceCreamBowl",
  "Popcorn",
];

function iconComponent(
  name: string,
): React.ComponentType<{ className?: string }> | null {
  const IconComponent = (
    Icons as unknown as Record<
      string,
      React.ComponentType<{ className?: string }> | undefined
    >
  )[name];
  return IconComponent ?? null;
}

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = iconComponent(value);
  const filtered = LUCIDE_ICON_NAMES.filter((name) =>
    name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/40"
      >
        <span className="flex items-center gap-2">
          {selected ? (
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#6d28d9]/10 text-[#6d28d9]">
              {(() => {
                const Icon = selected;
                return <Icon className="h-4 w-4" />;
              })()}
            </span>
          ) : (
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gray-200 text-[#6F7192]">
              <Sparkles className="h-4 w-4" />
            </span>
          )}
          <span>{value || "Select icon"}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#6F7192] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search icons..."
              className="w-full rounded-lg border border-[#6d28d9]/10 bg-gray-50 py-2 pl-9 pr-3 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/40"
            />
          </div>
          <div className="mt-3 grid max-h-56 grid-cols-6 gap-1 overflow-y-auto">
            {filtered.map((name) => {
              const Icon = iconComponent(name);
              if (!Icon) return null;
              const isSelected = value === name;
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`relative grid h-10 w-full place-items-center rounded-lg border transition ${
                    isSelected
                      ? "border-[#6d28d9]/40 bg-[#6d28d9]/10 text-[#6d28d9]"
                      : "border-transparent text-[#6F7192] hover:bg-gray-100 hover:text-[#0F1B3D]"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {isSelected && (
                    <Check className="absolute right-0.5 top-0.5 h-3 w-3 text-[#6d28d9]" />
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-6 py-4 text-center text-xs text-[#6F7192]">
                No icons found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
