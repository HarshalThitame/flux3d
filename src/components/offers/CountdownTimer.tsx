'use client'

import { useEffect, useState } from 'react'

type CountdownProps = {
  targetDate: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  light?: boolean
}

function getTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export default function CountdownTimer({ targetDate, className = '', size = 'md', light = false }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate))
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  if (!timeLeft) return null

  const sizeClasses = size === 'sm' ? 'text-xs gap-1' : size === 'lg' ? 'text-lg gap-3' : 'text-sm gap-2'
  const numClasses = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-3xl' : 'text-xl'
  const labelClasses = size === 'sm' ? 'text-[8px]' : size === 'lg' ? 'text-xs' : 'text-[10px]'

  return (
    <div className={`inline-flex items-center ${sizeClasses} ${className}`}>
      {[
        { value: timeLeft.days, label: 'Days' },
        { value: timeLeft.hours, label: 'Hrs' },
        { value: timeLeft.minutes, label: 'Min' },
        { value: timeLeft.seconds, label: 'Sec' },
      ].map((unit, i) => (
        <div key={unit.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <span className={`font-bold ${numClasses} tabular-nums ${light ? 'text-white' : 'text-[#7C5CFF]'}`}>
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className={`uppercase tracking-wider ${labelClasses} ${light ? 'text-white/70' : 'text-[#6F7192]'}`}>
              {unit.label}
            </span>
          </div>
          {i < 3 && <span className={`font-bold ${numClasses} ${light ? 'text-white' : 'text-[#7C5CFF]'} mx-1 sm:mx-1.5`}>:</span>}
        </div>
      ))}
    </div>
  )
}
