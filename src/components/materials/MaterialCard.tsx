'use client'

type MaterialSpec = {
  id: string
  name: string
  tag: string
  icon: string
  description: string
  color?: string
  gradient?: string
  properties: {
    strength: string
    flexibility: string
    tempResistance: string
    difficulty: string
  }
  useCases: string[]
  pros: string[]
  cons: string[]
  settings?: {
    nozzle: string
    bed: string
    speed: string
  }
}

type MaterialCardProps = {
  material: MaterialSpec
  isActive: boolean
  onOpen: (material: MaterialSpec, element: HTMLButtonElement) => void
  isMobile: boolean
}

export default function MaterialCard({
  material,
  isActive,
  onOpen,
  isMobile,
}: MaterialCardProps) {
  return (
    <button
      type="button"
      onClick={(event) => onOpen(material, event.currentTarget)}
      className={`group relative overflow-hidden rounded-[24px] border p-5 text-left transition-all duration-300 ${
        isActive
          ? 'border-[#6d28d9]/70 bg-[#FFFFFF] shadow-[0_12px_42px_rgba(109, 40, 217,0.18)]'
          : 'border-[#6d28d9]/10 bg-[#FFFFFF] hover:-translate-y-1 hover:border-[#6d28d9]/50 hover:bg-[#FFFFFF]'
      }`}
      aria-expanded={isActive}
      aria-label={`${material.name} material details`}
    >
      <div
        className="absolute inset-x-4 top-0 h-16 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-75"
        style={{ background: material.gradient ?? material.color ?? '#6d28d9' }}
      />

      <div className="relative flex items-center gap-3">
        <div
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#6d28d9]/10 shadow-[inset_0_1px_0_rgba(109, 40, 217,0.5)] transition-transform duration-300 group-hover:scale-[1.06]"
          style={{ background: material.gradient ?? material.color ?? '#14192c' }}
        >
          <span className="relative z-10 text-lg">{material.icon}</span>
          <div className="absolute inset-[7px] rounded-xl bg-[rgba(4,6,12,0.24)]" />
        </div>

        <div className="min-w-0">
          <div className="font-[var(--font-syne)] text-base font-bold text-[#070b1d]">
            {material.name}
          </div>
          <div className="mt-1 inline-flex rounded-full border border-[#6d28d9]/10 bg-[#6d28d9]/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[#6d28d9]">
            {material.tag}
          </div>
        </div>
      </div>

      <p className="relative mt-4 line-clamp-3 text-sm leading-6 text-[#4B5563]">
        {material.description}
      </p>

      <div className="relative mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[#cfd6ee]">
          <span className="h-2 w-2 rounded-full bg-[#6af7b4] shadow-[0_0_12px_rgba(106,247,180,0.6)]" />
          Best for {material.useCases[0]}
        </div>
        <span className="text-[#6d28d9]">{isMobile ? 'Tap to open' : 'Click to open'}</span>
      </div>
    </button>
  )
}
