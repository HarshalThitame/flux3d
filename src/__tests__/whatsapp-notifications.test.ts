import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendWhatsAppTemplate = vi.hoisted(() => vi.fn())
const sendWhatsAppText = vi.hoisted(() => vi.fn())
const enqueueTemplateSend = vi.hoisted(() => vi.fn())
const completeOutboxSend = vi.hoisted(() => vi.fn())
const loadOutboxRow = vi.hoisted(() => vi.fn())
const createAdminSupabaseClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/whatsapp/messages', () => ({
  sendWhatsAppTemplate,
  sendWhatsAppText,
}))

vi.mock('@/lib/whatsapp/outbox', () => ({
  enqueueTemplateSend,
  completeOutboxSend,
  loadOutboxRow,
}))

vi.mock('@/lib/admin/server', () => ({
  createAdminSupabaseClient,
}))

function supabaseWithOrderPhone(phone: string | null) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({
      data: phone != null ? { phone } : null,
    }),
    insert: () => builder,
    update: () => builder,
  }
  return { from: () => builder }
}

async function loadNotifications() {
  return await import('@/lib/whatsapp/notifications')
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  delete process.env.WHATSAPP_ORDERING_ENABLED
  process.env.WHATSAPP_TEMPLATE_ORDER_SHIPPED = 'flux3d_order_shipped'
  process.env.WHATSAPP_TEMPLATE_ORDER_DELIVERED = 'flux3d_order_delivered'
  process.env.WHATSAPP_TEMPLATE_ORDER_CONFIRMATION = 'flux3d_order_confirmation'
  process.env.WHATSAPP_TEMPLATE_PAYMENT_LINK = 'flux3d_payment_link'
  process.env.WHATSAPP_TEMPLATE_CONNECTED = 'flux3d_account_linked'
  // Safe async defaults so internal `.catch()` chaining never hits undefined.
  enqueueTemplateSend.mockResolvedValue({ outcome: 'queued' })
  loadOutboxRow.mockResolvedValue(null)
  completeOutboxSend.mockResolvedValue(undefined)
  sendWhatsAppTemplate.mockResolvedValue({ ok: true })
  sendWhatsAppText.mockResolvedValue({ ok: true })
})

describe('notifyWhatsAppOrderShipped', () => {
  it('queues the approved template with correct name, language, params and dedupe key', async () => {
    enqueueTemplateSend.mockResolvedValue({ outcome: 'queued' })
    const mod = await loadNotifications()

    const ok = await mod.notifyWhatsAppOrderShipped({
      phone: '9623023477',
      orderNumber: 'ORD-1',
      courierName: 'Delhivery',
      trackingNumber: 'TRK9',
      userId: 'u1',
    })

    expect(ok).toBe(true)
    expect(enqueueTemplateSend).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'order_shipped:ORD-1:TRK9',
        templateName: 'flux3d_order_shipped',
        phone: '919623023477',
        triggerEvent: 'order_shipped',
        userId: 'u1',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'ORD-1' },
              { type: 'text', text: 'Delhivery' },
              { type: 'text', text: 'TRK9' },
            ],
          },
        ],
      })
    )
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })

  it('dedupes repeat triggers without sending again', async () => {
    enqueueTemplateSend.mockResolvedValue({ outcome: 'duplicate' })
    const mod = await loadNotifications()

    const ok = await mod.notifyWhatsAppOrderShipped({
      phone: '9623023477',
      orderNumber: 'ORD-1',
      courierName: 'Delhivery',
      trackingNumber: 'TRK9',
    })

    expect(ok).toBe(true)
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })
})

describe('notifyWhatsAppOrderDelivered', () => {
  it('maps {{1}} to the order number with a per-order dedupe key', async () => {
    enqueueTemplateSend.mockResolvedValue({ outcome: 'queued' })
    const mod = await loadNotifications()

    const ok = await mod.notifyWhatsAppOrderDelivered({ phone: '9623023477', orderNumber: 'ORD-2' })

    expect(ok).toBe(true)
    expect(enqueueTemplateSend).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'order_delivered:ORD-2',
        templateName: 'flux3d_order_delivered',
        components: [
          { type: 'body', parameters: [{ type: 'text', text: 'ORD-2' }] },
        ],
      })
    )
  })
})

describe('notifyWhatsAppOrderConfirmed', () => {
  it('reads order phone and queues confirmation with formatted amount', async () => {
    createAdminSupabaseClient.mockReturnValue(supabaseWithOrderPhone('9623023477'))
    enqueueTemplateSend.mockResolvedValue({ outcome: 'queued' })
    const mod = await loadNotifications()

    const ok = await mod.notifyWhatsAppOrderConfirmed({
      orderId: 'oid-1',
      orderNumber: 'ORD-3',
      amountPaise: 149900,
    })

    expect(ok).toBe(true)
    expect(enqueueTemplateSend).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'order_confirmed:oid-1',
        templateName: 'flux3d_order_confirmation',
        phone: '919623023477',
        triggerEvent: 'order_confirmed',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'ORD-3' },
              { type: 'text', text: '₹1,499.00' },
            ],
          },
        ],
      })
    )
  })

  it('falls back to session text when the template cannot be delivered', async () => {
    createAdminSupabaseClient.mockReturnValue(supabaseWithOrderPhone('9623023477'))
    enqueueTemplateSend.mockResolvedValue({ outcome: 'fallback' })
    loadOutboxRow.mockResolvedValue(null)
    sendWhatsAppTemplate.mockResolvedValue({ ok: false, status: 400, error: 'template send failed' })
    sendWhatsAppText.mockResolvedValue({ ok: true, messageId: 'wamid.fallback' })
    const mod = await loadNotifications()

    const ok = await mod.notifyWhatsAppOrderConfirmed({
      orderId: 'oid-2',
      orderNumber: 'ORD-4',
      amountPaise: 50000,
    })

    expect(ok).toBe(true)
    expect(sendWhatsAppTemplate).toHaveBeenCalledWith(
      '919623023477',
      expect.objectContaining({ name: 'flux3d_order_confirmation', language: 'en_IN' })
    )
    expect(sendWhatsAppText).toHaveBeenCalledWith('919623023477', expect.stringContaining('CHA-CHING'))
  })

  it('skips entirely when the order has no phone', async () => {
    createAdminSupabaseClient.mockReturnValue(supabaseWithOrderPhone(null))
    const mod = await loadNotifications()

    const ok = await mod.notifyWhatsAppOrderConfirmed({
      orderId: 'oid-3',
      orderNumber: 'ORD-5',
      amountPaise: 100,
    })

    expect(ok).toBe(false)
    expect(enqueueTemplateSend).not.toHaveBeenCalled()
    expect(sendWhatsAppText).not.toHaveBeenCalled()
  })
})

describe('notifyWhatsAppPaymentLink', () => {
  it('sends without a lifecycle dedupe key (re-sends are legitimate)', async () => {
    enqueueTemplateSend.mockResolvedValue({ outcome: 'queued' })
    const mod = await loadNotifications()

    const ok = await mod.notifyWhatsAppPaymentLink({
      phone: '9623023477',
      orderNumber: 'ORD-9',
      paymentLink: 'https://rzp.io/i/abc',
    })

    expect(ok).toBe(true)
    const arg = enqueueTemplateSend.mock.calls[0][0]
    expect(arg.templateName).toBe('flux3d_payment_link')
    expect(arg.triggerEvent).toBe('payment_link')
    expect(typeof arg.idempotencyKey).toBe('string')
    expect(arg.idempotencyKey).not.toBe('payment_link:ORD-9')
    expect(arg.components).toEqual([
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'ORD-9' },
          { type: 'text', text: 'https://rzp.io/i/abc' },
        ],
      },
    ])
  })
})

describe('notifyWhatsAppConnected', () => {
  it('falls back to the playful session text when the template is unconfigured', async () => {
    delete process.env.WHATSAPP_TEMPLATE_CONNECTED
    sendWhatsAppText.mockResolvedValue({ ok: true })
    const mod = await loadNotifications()

    const ok = await mod.notifyWhatsAppConnected({
      phone: '9623023477',
      customerName: 'Rutik',
      orderCount: 3,
    })

    expect(ok).toBe(true)
    expect(enqueueTemplateSend).not.toHaveBeenCalled()
    expect(sendWhatsAppText).toHaveBeenCalledOnce()
  })
})

describe('inline fallback path', () => {
  it('sends directly and closes the outbox row when QStash is down', async () => {
    enqueueTemplateSend.mockResolvedValue({ outcome: 'fallback', outboxId: 'ob-1' })
    loadOutboxRow.mockResolvedValue({
      id: 'ob-1',
      template_name: 'flux3d_order_shipped',
      phone: '919623023477',
      components: [],
      log_text: 'log',
      trigger_event: 'order_shipped',
      user_id: null,
      status: 'queued',
      attempts: 0,
      meta_message_id: null,
    })
    sendWhatsAppTemplate.mockResolvedValue({ ok: true, messageId: 'wamid.inline' })
    const mod = await loadNotifications()

    const ok = await mod.notifyWhatsAppOrderShipped({
      phone: '9623023477',
      orderNumber: 'ORD-10',
      courierName: 'FedEx',
      trackingNumber: 'TRK10',
    })

    expect(ok).toBe(true)
    expect(sendWhatsAppTemplate).toHaveBeenCalledWith(
      '919623023477',
      expect.objectContaining({ name: 'flux3d_order_shipped', language: 'en_IN' })
    )
    expect(completeOutboxSend).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ob-1' }),
      { ok: true, messageId: 'wamid.inline' }
    )
  })
})

describe('ordering gate', () => {
  it('silently skips every notification when ordering is disabled', async () => {
    process.env.WHATSAPP_ORDERING_ENABLED = 'false'
    const mod = await loadNotifications()

    expect(await mod.notifyWhatsAppOrderShipped({ phone: '9', orderNumber: 'X', courierName: 'c', trackingNumber: 't' })).toBe(false)
    expect(await mod.notifyWhatsAppOrderDelivered({ phone: '9', orderNumber: 'X' })).toBe(false)
    expect(await mod.notifyWhatsAppPaymentLink({ phone: '9', orderNumber: 'X', paymentLink: 'u' })).toBe(false)

    expect(enqueueTemplateSend).not.toHaveBeenCalled()
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })
})
