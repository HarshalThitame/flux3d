'use client'

const steps = [
  {
    num: '01',
    title: 'Share Your Idea',
    description: 'Send us a design file, sketch, or just a clear brief. We accept standard 3D formats and early-stage concepts.',
    icon: '📤'
  },
  {
    num: '02',
    title: 'We Quote & Confirm',
    description: 'You receive a clear estimate, material recommendation, and realistic timeline before anything goes into production.',
    icon: '🔍'
  },
  {
    num: '03',
    title: 'We Print & Deliver',
    description: 'Your part is printed, checked, packed, and dispatched with a workflow built around consistency and speed.',
    icon: '📦'
  }
]

export default function ProcessSteps() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-[#7C5CFF] uppercase tracking-[3px] mb-4">Process</p>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] tracking-[-1px] leading-[1.1]">
            How It Works <span className="text-[#6F7192]">Simple As 3 Steps</span>
          </h2>
          <p className="text-[#6F7192] mt-4 max-w-[500px] mx-auto">
            A clear, fast process built to remove friction and get your part moving without confusion.
          </p>
        </div>

        {/* Steps - Desktop horizontal, mobile vertical */}
        <div className="relative">
          {/* Connection line - desktop only */}
          <div className="hidden md:block absolute top-16 left-[16.5%] right-[16.5%] h-[1px] bg-gradient-to-r from-[#7C5CFF] via-[rgba(124, 92, 255,0.3)] to-[#7C5CFF]" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative text-center md:pt-8">
                {/* Step number circle */}
                <div className="relative z-10 inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FFFFFF] border-2 border-[#7C5CFF] mb-6 shadow-lg shadow-[rgba(124, 92, 255,0.2)]">
                  <span className="text-2xl">{step.icon}</span>
                </div>

                {/* Number badge */}
                <div className="absolute top-0 right-0 md:-top-2 md:-right-2 w-8 h-8 rounded-full bg-[#7C5CFF] flex items-center justify-center text-xs font-bold text-white font-[var(--font-syne)]">
                  {step.num}
                </div>

                {/* Content */}
                <h3 className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[#6F7192] leading-[1.6]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
