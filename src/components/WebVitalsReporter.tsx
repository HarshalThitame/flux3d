'use client'

import { useReportWebVitals } from 'next/web-vitals'

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0]

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

const reportWebVitals: ReportWebVitalsCallback = (metric) => {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[web-vitals]', metric)
  }

  if (typeof window === 'undefined') return

  window.dataLayer = window.dataLayer ?? []
  const gtag =
    window.gtag ??
    ((...args: unknown[]) => {
      window.dataLayer?.push(args)
    })

  gtag('event', metric.name, {
    event_category: 'Web Vitals',
    event_label: metric.id,
    metric_delta: metric.delta,
    metric_navigation_type: metric.navigationType,
    metric_rating: metric.rating,
    non_interaction: true,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
  })
}

export default function WebVitalsReporter() {
  useReportWebVitals(reportWebVitals)

  return null
}
