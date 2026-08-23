import { describe, expect, it, vi } from 'vitest'
import { mapShiprocketStatus, trackingEventKey } from '@/lib/shiprocket/tracking-sync'

vi.mock('@/lib/admin/server', () => ({ createAdminSupabaseClient: vi.fn() }))
vi.mock('@/lib/email/triggers', () => ({
  sendDeliveryConfirmation: vi.fn(),
  sendOutForDelivery: vi.fn(),
}))
vi.mock('@/lib/whatsapp/notifications', () => ({ notifyWhatsAppOrderDelivered: vi.fn() }))
vi.mock('@/lib/site', () => ({ absoluteUrl: (path: string) => path }))

describe('mapShiprocketStatus', () => {
  it('maps delivered statuses', () => {
    expect(mapShiprocketStatus('Delivered')).toEqual({
      fulfilmentStatus: 'delivered',
      isDelivered: true,
      isRto: false,
    })
    expect(mapShiprocketStatus('RTO Delivered')).toMatchObject({
      fulfilmentStatus: 'delivered',
      isDelivered: true,
      isRto: true,
    })
  })

  it('maps out for delivery', () => {
    expect(mapShiprocketStatus('Out For Delivery').fulfilmentStatus).toBe('delivering')
    expect(mapShiprocketStatus('OUT_FOR_DELIVERY').fulfilmentStatus).toBe('delivering')
  })

  it('maps transit and pickup states to shipped', () => {
    for (const label of ['In Transit', 'Picked Up', 'Pickup Scheduled', 'Undelivered']) {
      expect(mapShiprocketStatus(label)).toMatchObject({ fulfilmentStatus: 'shipped', isDelivered: false })
    }
  })

  it('maps RTO (not yet delivered) to shipped', () => {
    expect(mapShiprocketStatus('RTO Initiated')).toMatchObject({
      fulfilmentStatus: 'shipped',
      isRto: true,
    })
  })

  it('returns null for unknown labels so nothing changes', () => {
    expect(mapShiprocketStatus('Something Random')).toMatchObject({
      fulfilmentStatus: null,
      isDelivered: false,
      isRto: false,
    })
    expect(mapShiprocketStatus('')).toMatchObject({ fulfilmentStatus: null })
  })
})

describe('trackingEventKey', () => {
  it('is stable regardless of casing or whitespace', () => {
    expect(trackingEventKey({ date: '2026-08-24 10:00', status: ' In Transit ', activity: 'Moved', location: 'Pune' })).toBe(
      trackingEventKey({ date: '2026-08-24 10:00', status: 'IN TRANSIT', activity: 'moved', location: 'pune' })
    )
  })

  it('differs when any component changes', () => {
    const base = { date: 'd', status: 's', activity: 'a', location: 'l' }
    expect(trackingEventKey(base)).not.toBe(trackingEventKey({ ...base, status: 'x' }))
  })
})
