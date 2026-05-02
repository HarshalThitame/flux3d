'use client'

import { getMaterialById, quoteMaterials } from '@/lib/quote/materials'

type MaterialSelectorProps = {
  selectedMaterialId: string
  selectedColorHex: string
  materials: QuoteMaterial[]
  onMaterialChange: (materialId: string) => void
  onColorChange: (hex: string) => void
}

export default function MaterialSelector({
  selectedMaterialId,
  selectedColorHex,
  materials,
  onMaterialChange,
  onColorChange,
}: MaterialSelectorProps) {
  const activeMaterial = getMaterialById(selectedMaterialId, materials)

  if (materials.length === 0) {
    return (
      <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-center text-sm text-[#7a82a0]">
        No materials available. Please add materials in the admin panel.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-white">Material Selection</div>
        <div className="mt-1 text-sm text-[#7a82a0]">
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
                ? 'border-[#FF8A57]/40 bg-[#11182b] shadow-[0_12px_44px_rgba(255,92,26,0.12)]'
                : 'border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF5C1A]/10 text-lg text-[#FF8A57]">
                <span>{material.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-white">{material.name}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[#FF8A57]">
                    ×{material.multiplier.toFixed(2)}
                  </div>
                </div>
                <div className="mt-2 text-sm leading-6 text-[#7a82a0]">{material.summary}</div>
                <div className="mt-3 text-xs text-[#a7b0cc]">{material.recommendedFor}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
        <div className="text-sm font-medium text-white">Color Selection</div>
        <div className="mt-3 flex flex-wrap gap-3">
          {activeMaterial.colors.map((color) => (
            <button
              key={color.hex}
              type="button"
              onClick={() => onColorChange(color.hex)}
              className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
                selectedColorHex === color.hex
                  ? 'border-[#FF8A57]/50 bg-[#FF5C1A]/10 text-white'
                  : 'border-white/10 bg-white/[0.03] text-[#b4bdd8] hover:text-white'
              }`}
            >
              <span
                className="h-4 w-4 rounded-full border border-white/12"
                style={{ backgroundColor: color.hex }}
              />
              {color.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

