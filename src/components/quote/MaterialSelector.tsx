'use client'

import type { QuoteMaterial } from '@/lib/quote/types'
import { getMaterialById } from '@/lib/quote/materials'

type MaterialSelectorProps = {
  selectedMaterialId: string
  selectedColor: string
  materials: QuoteMaterial[]
  onMaterialChange: (materialId: string) => void
  onColorChange: (name: string) => void
}

export default function MaterialSelector({
  selectedMaterialId,
  selectedColor,
  materials,
  onMaterialChange,
  onColorChange,
}: MaterialSelectorProps) {
  const activeMaterial = getMaterialById(selectedMaterialId, materials)

  if (materials.length === 0) {
    return (
      <div className="rounded-[22px] border border-[#7C5CFF]/10 bg-[var(--bg-elevated)] p-4 text-center text-sm text-[#6F7192]">
        No materials available. Please add materials in the admin panel.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-[#0F1B3D]">Material Selection</div>
        <div className="mt-1 text-sm text-[#6F7192]">
          Pick the printing material that best matches strength, finish, and production goals.
        </div>
      </div>

      <div className="grid gap-3">
        {materials.map((material) => (
          <button
            key={material.id}
            type="button"
            onClick={() => onMaterialChange(material.id)}
            className={`rounded-[22px] border p-4 text-left transition-all ${
              selectedMaterialId === material.id
                ? 'border-[#7C5CFF]/40 bg-[var(--brand-faint)] shadow-[0_12px_44px_rgba(124, 92, 255,0.12)]'
                : 'border-[#7C5CFF]/10 bg-white hover:border-[#7C5CFF]/10 hover:bg-[var(--bg-soft)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7C5CFF]/10 text-lg text-[#7C5CFF]">
                <span>{material.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-[#0F1B3D]">{material.name}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[#7C5CFF]">
                    ×{material.multiplier.toFixed(2)}
                  </div>
                </div>
                <div className="mt-2 text-sm leading-6 text-[#6F7192]">{material.summary}</div>
                <div className="mt-3 text-xs text-[#a7b0cc]">{material.recommendedFor}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-[24px] border border-[#7C5CFF]/10 bg-[var(--bg-elevated)] p-4">
        <div className="text-sm font-medium text-[#0F1B3D]">Color Selection</div>
        <div className="mt-3 flex flex-wrap gap-3">
          {activeMaterial.colors.map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => onColorChange(color.name)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                selectedColor === color.name
                  ? 'border-[#7C5CFF]/50 bg-[#7C5CFF]/10 text-[var(--brand-primary)]'
                  : 'border-[#7C5CFF]/10 bg-white text-[var(--text-secondary)] hover:text-[#0F1B3D]'
              }`}
            >
              {color.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
