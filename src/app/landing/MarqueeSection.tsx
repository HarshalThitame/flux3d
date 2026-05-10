'use client'

const marqueeItems = [
  'IIT Bombay Students', 'Manufacturing Units', 'Dental Clinics', 'Architecture Firms',
  'YouTubers & Creators', 'Corporate HR Teams', 'Robotics Clubs', 'Interior Designers',
  'Medical Colleges', 'Gaming Enthusiasts', 'Pune Startups', 'Bangalore Engineers'
]

export default function MarqueeSection() {
  return (
    <div className="relative w-full overflow-hidden bg-[#FFFFFF] border-y border-[rgba(124, 92, 255,0.4)] py-4">
      <div className="flex items-center gap-2 px-6 mb-2">
        <span className="text-xs text-[#4a5070] uppercase tracking-wider">Trusted by</span>
        <div className="flex-1 h-px bg-[rgba(124, 92, 255,0.4)]" />
      </div>
      <div className="marquee-track flex whitespace-nowrap">
        {[...marqueeItems, ...marqueeItems].map((item, i) => (
          <div key={i} className="mx-6 text-sm text-[#6F7192] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFF]" />
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}
