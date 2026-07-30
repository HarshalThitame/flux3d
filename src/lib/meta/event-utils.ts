type TrackEventOptions = {
  eventName: string
  eventId: string
  customData?: Record<string, unknown>
}

export function generateEventId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function trackPixelEvent({ eventName, eventId, customData }: TrackEventOptions) {
  if (typeof window === 'undefined') return
  const fbq = (window as unknown as Record<string, unknown>).fbq as
    | ((command: string, event: string, data?: Record<string, unknown>, options?: Record<string, unknown>) => void)
    | undefined
  if (!fbq) return
  fbq('track', eventName, customData, { eventID: eventId })
}

export async function trackMetaEvent(
  eventName: string,
  customData?: Record<string, unknown>,
  userData?: Record<string, string[]>,
) {
  const eventId = generateEventId()

  trackPixelEvent({ eventName, eventId, customData })

  try {
    await fetch('/api/meta/capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          {
            event_name: eventName,
            event_id: eventId,
            event_time: Math.floor(Date.now() / 1000),
            event_source_url: typeof window !== 'undefined' ? window.location.href : undefined,
            action_source: 'website',
            user_data: {
              client_ip_address: undefined,
              client_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
              ...userData,
            },
            custom_data: customData as Record<string, unknown>,
          },
        ],
      }),
    })
  } catch {
    // CAPI failure is non-blocking
  }

  return eventId
}

export function getFbp(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(/_fbp=([^;]+)/)
  return match ? match[1] : undefined
}

export function getFbc(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(/_fbc=([^;]+)/)
  return match ? match[1] : undefined
}
