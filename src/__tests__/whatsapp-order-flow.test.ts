import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isBuyIntent,
  isCancelIntent,
  parseOrderCartItems,
  parseQuantity,
  phoneToTenDigit,
  firstNameOf,
  playfulGreeting,
  playfulInvalidInput,
  type OrderInteraction,
} from '@/lib/whatsapp/order-flow'
import { validateState } from '@/lib/whatsapp/address-validator'

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

describe('whatsapp order flow — catalog cart parsing (order messages)', () => {
  it('parses a valid cart with multiple items', () => {
    const items = parseOrderCartItems([
      { product_retailer_id: 'SKU-1', quantity: 2 },
      { product_retailer_id: 'SKU-2', quantity: 1 },
    ])
    expect(items).toEqual([
      { productRetailerId: 'SKU-1', quantity: 2 },
      { productRetailerId: 'SKU-2', quantity: 1 },
    ])
  })

  it('drops items with missing/empty retailer id', () => {
    const items = parseOrderCartItems([
      { product_retailer_id: '', quantity: 1 },
      { product_retailer_id: null, quantity: 1 },
      { quantity: 1 },
    ])
    expect(items).toEqual([])
  })

  it('drops items with non-positive or non-integer quantities', () => {
    const items = parseOrderCartItems([
      { product_retailer_id: 'SKU-1', quantity: 0 },
      { product_retailer_id: 'SKU-2', quantity: -3 },
      { product_retailer_id: 'SKU-3', quantity: 1.5 },
      { product_retailer_id: 'SKU-4', quantity: 'not-a-number' },
    ])
    expect(items).toEqual([])
  })

  it('drops malformed entries and keeps valid ones', () => {
    const items = parseOrderCartItems([
      null,
      'SKU-1',
      { product_retailer_id: 'SKU-1', quantity: 1 },
      { product_retailer_id: 'SKU-2', quantity: '3' },
    ])
    expect(items).toEqual([
      { productRetailerId: 'SKU-1', quantity: 1 },
      { productRetailerId: 'SKU-2', quantity: 3 },
    ])
  })

  it('returns empty array for non-array input', () => {
    expect(parseOrderCartItems(undefined)).toEqual([])
    expect(parseOrderCartItems({})).toEqual([])
    expect(parseOrderCartItems('cart')).toEqual([])
  })
})

describe('whatsapp order flow — phone normalization', () => {
  it('returns last 10 digits', () => {
    expect(phoneToTenDigit('+91 96230 23480')).toBe('9623023480')
    expect(phoneToTenDigit('919623023480')).toBe('9623023480')
    expect(phoneToTenDigit('9623023480')).toBe('9623023480')
  })
})

describe('whatsapp order flow — playful message helpers', () => {
  it('extracts the first name from a full name', () => {
    expect(firstNameOf('Harshal Thitame')).toBe('Harshal')
    expect(firstNameOf('Harshal')).toBe('Harshal')
    expect(firstNameOf('')).toBeNull()
    expect(firstNameOf(null)).toBeNull()
    expect(firstNameOf(undefined)).toBeNull()
  })

  it('builds a personalized greeting with the brand', () => {
    expect(playfulGreeting('Harshal', 'Flux3D')).toBe('👋 Heyy Harshal! Welcome to Flux3D ✨')
    expect(playfulGreeting(null, 'Flux3D')).toBe('👋 Heyy! Welcome to Flux3D ✨')
  })

  it('wraps a validation error playfully with the offending value', () => {
    const validation = validateState('422605')
    const message = playfulInvalidInput(validation, '422605')
    expect(message).toContain('Oops 🙈 "422605"')
    expect(message).toContain(validation.error)
  })

  it('asks for a missing value without quoting an empty string', () => {
    const message = playfulInvalidInput({ valid: false }, '   ')
    expect(message).not.toContain('"  "')
    expect(message).toContain('missing')
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

describe('sendAddressFlow — flow form fallback', () => {
  let payloads: Array<Record<string, unknown>>

  beforeEach(() => {
    payloads = []
    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      payloads.push(JSON.parse(String(init?.body)))
      return { ok: true, status: 200, json: async () => ({}), text: async () => '' } as Response
    })
    vi.stubGlobal('fetch', mockFetch)
  })

  it('sends the text delivery-name prompt when no flow id is configured', async () => {
    vi.stubEnv('WHATSAPP_ADDRESS_FLOW_ID', '')
    const logged: Array<{ kind: string; body: string }> = []
    const sendAndLog = (kind: string, body: string) => {
      logged.push({ kind, body })
      return Promise.resolve({ ok: true })
    }
    const { sendAddressFlow } = await import('@/lib/whatsapp/order-flow')
    await sendAddressFlow('9199623023480', sendAndLog)
    expect(payloads).toHaveLength(0)
    expect(logged.some((l) => l.kind === 'text' && l.body.toLowerCase().includes('full name'))).toBe(true)
  })

  it('sends the flow interactive message when a flow id is configured', async () => {
    vi.stubEnv('WHATSAPP_ADDRESS_FLOW_ID', 'flow_abc')
    vi.stubGlobal('process', {
      ...process,
      env: { ...process.env, WHATSAPP_PHONE_NUMBER_ID: '1099569106574377', WHATSAPP_ACCESS_TOKEN: 'tok' },
    })
    const sendAndLog = vi.fn(() => Promise.resolve({ ok: true }))
    const { sendAddressFlow } = await import('@/lib/whatsapp/order-flow')
    await sendAddressFlow('9199623023480', sendAndLog)
    expect(payloads).toHaveLength(1)
    expect(payloads[0].type).toBe('interactive')
    const params = (payloads[0].interactive as { action: { parameters: Record<string, unknown> } }).action.parameters
    expect(params.flow_message_version).toBe('3')
    expect(params.flow_id).toBe('flow_abc')
  })

  it('falls back to text when the flow send request fails', async () => {
    vi.stubEnv('WHATSAPP_ADDRESS_FLOW_ID', 'flow_abc')
    vi.stubGlobal('process', {
      ...process,
      env: { ...process.env, WHATSAPP_PHONE_NUMBER_ID: '1099569106574377', WHATSAPP_ACCESS_TOKEN: 'tok' },
    })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 400, text: async () => 'error' })))
    const logged: Array<{ kind: string; body: string }> = []
    const sendAndLog = (kind: string, body: string) => {
      logged.push({ kind, body })
      return Promise.resolve({ ok: true })
    }
    const { sendAddressFlow } = await import('@/lib/whatsapp/order-flow')
    await sendAddressFlow('9199623023480', sendAndLog)
    expect(logged.some((l) => l.kind === 'text' && l.body.toLowerCase().includes('full name'))).toBe(true)
  })
})
