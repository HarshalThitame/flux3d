'use client'

import { motion } from 'framer-motion'
import { Check, Palette, Package2 } from 'lucide-react'
import { getMaterialById } from '@/lib/quote/materials'
import type { QuoteMaterial } from '@/lib/quote/types'

type MaterialPanelProps =
  | {
      variant: 'material'
      materials: QuoteMaterial[]
      selectedMaterialId: string
      onMaterialChange: (materialId: string) => void
    }
  | {
      variant: 'color'
      materials: QuoteMaterial[]
      selectedMaterialId: string
      selectedColor: string
      onColorChange: (name: string) => void
    }

function PanelShell({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      className="flex h-full flex-col rounded-[24px] border border-[#7C5CFF]/10 bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] transition-all duration-300 hover:border-[#7C5CFF]/20 hover:shadow-[var(--shadow-md)]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
        <div className="rounded-2xl border border-[#7C5CFF]/10 bg-[var(--brand-faint)] p-2 text-[var(--brand-primary)]">
          {icon}
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </motion.section>
  )
}

export default function MaterialPanel(props: MaterialPanelProps) {
  if (props.variant === 'material') {
    return (
      <PanelShell
        icon={<Package2 className="h-4 w-4" />}
        title="Material Selection"
        description="Pick the material that matches the finish, strength, and performance your part deserves."
      >
        <div className="grid gap-3">
          {props.materials.map((material) => {
            const isActive = material.id === props.selectedMaterialId

            return (
              <motion.button
                key={material.id}
                type="button"
                onClick={() => props.onMaterialChange(material.id)}
                whileHover={{ x: 4, scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                className={`rounded-[20px] border p-3 text-left transition-all duration-200 ${
                  isActive
                    ? 'border-[#7C5CFF]/35 bg-[var(--brand-faint)] shadow-[0_10px_36px_rgba(124, 92, 255,0.1)]'
                    : 'border-[#7C5CFF]/10 bg-white hover:border-[#7C5CFF]/10 hover:bg-[var(--bg-soft)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7C5CFF]/10 text-lg text-[#7C5CFF]">
                    <span>{material.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{material.name}</span>
                      {isActive ? <Check className="h-4 w-4 text-[#7C5CFF]" /> : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{material.summary}</p>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </PanelShell>
    )
  }

  const activeMaterial = getMaterialById(props.selectedMaterialId, props.materials)

  return (
    <PanelShell
      icon={<Palette className="h-4 w-4" />}
      title="Color Selection"
      description={`Choose a finish that makes your ${activeMaterial.name} print feel presentation-ready.`}
    >
      <div className="flex flex-wrap gap-2">
        {activeMaterial.colors.map((color) => {
          const isActive = color.name === props.selectedColor

          return (
            <motion.button
              key={color.name}
              type="button"
              onClick={() => props.onColorChange(color.name)}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`rounded-[18px] border px-4 py-3 text-left transition-all duration-200 ${
                isActive
                  ? 'border-[#7C5CFF]/40 bg-[var(--brand-faint)]'
                  : 'border-[#7C5CFF]/10 bg-white hover:border-[#7C5CFF]/10 hover:bg-[var(--bg-soft)]'
              }`}
            >
              <span className="text-sm font-medium text-[var(--text-primary)]">{color.name}</span>
              {isActive ? <Check className="ml-2 inline h-4 w-4 text-[#7C5CFF]" /> : null}
            </motion.button>
          )
        })}
      </div>
    </PanelShell>
  )
}
