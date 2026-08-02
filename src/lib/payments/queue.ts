import { getQStashClient } from '@/lib/email/qstash'

/**
 * Enqueue a payment webhook event for background processing via QStash,
 * mirroring the WhatsApp webhook pattern. Returns true if queued.
 * Never throws — callers fall back to synchronous processing when false.
 */
export async function enqueuePaymentWebhookProcessing(eventId: string): Promise<boolean> {
  try {
    const qstash = getQStashClient()
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://flux3d.in').replace(/\/+$/, '')
    await Promise.race([
      qstash.publishJSON({
        url: `${baseUrl}/api/payments/process`,
        body: { eventId },
        retries: 5,
        timeout: 120,
        headers: { 'X-Payment-Event': eventId },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('QStash enqueue timeout (4s)')), 4000)),
    ])
    return true
  } catch (error) {
    console.error('[payments] QStash enqueue failed:', error)
    return false
  }
}
