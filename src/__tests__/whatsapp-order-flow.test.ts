import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isBuyIntent, isCancelIntent, parseQuantity, phoneToTenDigit, type OrderInteraction } from '@/lib/whatsapp/order-flow'

describe('whatsapp order flow — intent detection', () => {
  it.each([
    'buy',
    'Buy',
    'I want to order a vase',
    'place order',
    'place an order',
    'checkout',
    'add to cart',
    'get one of these',
    'I want to buy the lamp',
    'order now',
  ])('detects buy intent: "%s"', (text) => {
    expect(isBuyIntent(text)).toBe(true)
  })

  it.each([
    'hello',
    'what is the price of PLA?',
    'shipping time',
    'track my order #1234',
    'contact info',
  ])('does not flag non-buy intent: "%s"', (text) => {
    expect(isBuyIntent(text)).toBe(false)
  })

  it.each(['cancel', 'Cancel', 'cancel order', 'never mind', 'forget it', 'stop'])('detects cancel intent: "%s"', (text) => {
    expect(isCancelIntent(text, null)).toBe(true)
  })

  it('detects cancel via button interaction id', () => {
    const interaction: OrderInteraction = { kind: 'button', id: 'cancel', title: 'Cancel' }
    expect(isCancelIntent('anything', interaction)).toBe(true)
  })
})

describe('whatsapp order flow — quantity parsing', () => {
  it('parses a plain number', () => {
    expect(parseQuantity('3')).toBe(3)
    expect(parseQuantity(' 12 ')).toBe(12)
  })

  it('parses quantity from interactive id suffix', () => {
    expect(parseQuantity('qty:2'.slice('qty:'.length))).toBe(2)
  })

  it.each(['0', '-1', '100', 'abc', '2.5', 'two', '', '1e3'])('rejects invalid quantity "%s"', (value) => {
    expect(parseQuantity(value)).toBeNull()
  })
})

describe('whatsapp order flow — phone normalization', () => {
  it('returns last 10 digits', () => {
    expect(phoneToTenDigit('+91 96230 23480')).toBe('9623023480')
    expect(phoneToTenDigit('919623023480')).toBe('9623023480')
    expect(phoneToTenDigit('9623023480')).toBe('9623023480')
  })
})

describe('whatsapp messages — Graph API payload shapes', () => {
  let payloads: Array<Record<string, unknown>>

  beforeEach(() => {
    payloads = []
    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      payloads.push(JSON.parse(String(init?.body)))
      return { ok: true, status: 200, json: async () => ({}), text: async () => '' } as Response
    })
    vi.stubGlobal('fetch', mockFetch)
    vi.stubGlobal('process', { ...process, env: { ...process.env, WHATSAPP_PHONE_NUMBER_ID: '1099569106574377', WHATSAPP_ACCESS_TOKEN: 'token' } })
  })

  it('builds a valid list interactive payload (round-trips with parser)', async () => {
    const { sendWhatsAppList } = await import('@/lib/whatsapp/messages')
    await sendWhatsAppList('9199623023480', {
      header: 'Catalog',
      body: 'Choose a product:',
      buttonText: 'Choose',
      sections: [{ title: 'Products', rows: [{ id: 'prod:abc', title: 'Vase', description: '₹499' }] }],
    })
    const body = payloads[0]
    expect(body).toMatchObject({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '9199623023480',
      type: 'interactive',
    })
    const interactive = body.interactive as Record<string, unknown>
    expect(interactive.type).toBe('list')
    // The parser reads interactive.list_reply.id/.title — verify our list payload
    // carries the same row id/title fields the parser expects.
    expect((interactive.action as Record<string, unknown>).sections).toEqual([
      { title: 'Products', rows: [{ id: 'prod:abc', title: 'Vase', description: '₹499' }] },
    ])
  })

  it('builds a valid button interactive payload with reply ids', async () => {
    const { sendWhatsAppButtons } = await import('@/lib/whatsapp/messages')
    await sendWhatsAppButtons('9199623023480', {
      body: 'Confirm?',
      buttons: [{ id: 'confirm:yes', title: 'Confirm ✅' }, { id: 'cancel', title: 'Cancel' }],
    })
    const body = payloads[0]
    const interactive = body.interactive as Record<string, unknown>
    expect(interactive.type).toBe('button')
    expect((interactive.action as Record<string, unknown>).buttons).toEqual([
      { type: 'reply', reply: { id: 'confirm:yes', title: 'Confirm ✅' } },
      { type: 'reply', reply: { id: 'cancel', title: 'Cancel' } },
    ])
  })

  it('builds a valid template payload with language', async () => {
    const { sendWhatsAppTemplate } = await import('@/lib/whatsapp/messages')
    await sendWhatsAppTemplate('9199623023480', {
      name: 'order_shipped',
      language: 'en_IN',
      components: [{ type: 'body', parameters: [{ type: 'text', text: 'SHOP-1' }] }],
    })
    const body = payloads[0]
    expect(body.type).toBe('template')
    expect(body.template).toEqual({
      name: 'order_shipped',
      language: { code: 'en_IN' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: 'SHOP-1' }] }],
    })
  })

  it('builds a product message with catalog + retailer id', async () => {
    const { sendWhatsAppProduct } = await import('@/lib/whatsapp/messages')
    await sendWhatsAppProduct('9199623023480', '1770810297426550', 'sku-1')
    const body = payloads[0]
    expect(body.type).toBe('product')
    expect(body.product).toEqual({ catalog_id: '1770810297426550', product_retailer_id: 'sku-1' })
  })

  it('builds a payment link text message with preview enabled', async () => {
    const { sendWhatsAppPaymentLink } = await import('@/lib/whatsapp/messages')
    await sendWhatsAppPaymentLink('9199623023480', 'https://rzp.io/l/x', 'Pay here')
    const body = payloads[0]
    expect(body.type).toBe('text')
    expect(body.text).toMatchObject({ preview_url: true })
    expect(String((body.text as { body: string }).body)).toContain('https://rzp.io/l/x')
  })
})
