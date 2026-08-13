import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseWhatsAppMessage } from '@/lib/whatsapp/message-parser'

describe('parseWhatsAppMessage — flow (nfm_reply)', () => {
  it('parses a completed flow response into a flow_response interaction', () => {
    const msg = {
      type: 'interactive',
      interactive: {
        type: 'nfm_reply',
        nfm_reply: {
          name: 'flow',
          response_json: JSON.stringify({
            flow_token: 'tok-123',
            full_name: 'Rutik Thitame',
            line1: '12 Lakeview',
            line2: 'Apt 3',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
          }),
        },
      },
    }
    const result = parseWhatsAppMessage(msg)
    expect(result.interaction).toEqual({
      kind: 'flow_response',
      data: {
        flow_token: 'tok-123',
        full_name: 'Rutik Thitame',
        line1: '12 Lakeview',
        line2: 'Apt 3',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    })
    expect(result.text).toBe('[flow response]')
  })

  it('treats a flow response with missing response_json as a flow_response with empty data', () => {
    const msg = {
      type: 'interactive',
      interactive: { type: 'nfm_reply', nfm_reply: { name: 'flow', response_json: '' } },
    }
    const result = parseWhatsAppMessage(msg)
    expect(result.interaction?.kind).toBe('flow_response')
    if (result.interaction?.kind === 'flow_response') {
      expect(result.interaction.data).toEqual({})
    }
  })

  it('records a parse_error when response_json is malformed', () => {
    const msg = {
      type: 'interactive',
      interactive: { type: 'nfm_reply', nfm_reply: { name: 'flow', response_json: 'not-json{' } },
    }
    const result = parseWhatsAppMessage(msg)
    expect(result.interaction?.kind).toBe('flow_response')
    if (result.interaction?.kind === 'flow_response') {
      expect(result.interaction.data.parse_error).toBeDefined()
    }
  })

  it('does not treat non-flow nfm_reply as a flow_response interaction', () => {
    const msg = {
      type: 'interactive',
      interactive: { type: 'nfm_reply', nfm_reply: { name: 'other_form', response_json: '{}' } },
    }
    const result = parseWhatsAppMessage(msg)
    expect(result.interaction).toBeNull()
  })
})

describe('sendWhatsAppFlow — Graph API payload shape', () => {
  let payloads: Array<Record<string, unknown>>

  beforeEach(() => {
    payloads = []
    const mockFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      payloads.push(JSON.parse(String(init?.body)))
      return { ok: true, status: 200, json: async () => ({}), text: async () => '' } as Response
    })
    vi.stubGlobal('fetch', mockFetch)
    vi.stubGlobal('process', {
      ...process,
      env: {
        ...process.env,
        WHATSAPP_PHONE_NUMBER_ID: '1099569106574377',
        WHATSAPP_ACCESS_TOKEN: 'token',
      },
    })
  })

  it('builds a flow interactive message with flow_message_version 3', async () => {
    const { sendWhatsAppFlow } = await import('@/lib/whatsapp/messages')
    await sendWhatsAppFlow('9199623023480', {
      flowId: 'flow_abc',
      flowToken: 'tok-123',
      cta: 'Fill Address',
    })
    const body = payloads[0]
    expect(body).toMatchObject({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '9199623023480',
      type: 'interactive',
    })
    const interactive = body.interactive as Record<string, unknown>
    expect(interactive.type).toBe('flow')
    const action = interactive.action as Record<string, unknown>
    const parameters = action.parameters as Record<string, unknown>
    expect(parameters.flow_message_version).toBe('3')
    expect(parameters.flow_id).toBe('flow_abc')
    expect(parameters.flow_cta).toBe('Fill Address')
    expect(parameters.flow_token).toBe('tok-123')
    expect(parameters.mode).toBe('published')
  })

  it('uses the default body text when none provided', async () => {
    const { sendWhatsAppFlow } = await import('@/lib/whatsapp/messages')
    await sendWhatsAppFlow('9199623023480', {
      flowId: 'flow_abc',
      flowToken: 'tok-123',
      cta: 'Fill Address',
    })
    const body = payloads[0]
    const interactive = body.interactive as Record<string, unknown>
    expect((interactive.body as Record<string, unknown>).text).toBe('Tap below to continue.')
  })
})

describe('parseWhatsAppMessage — media & message id', () => {
  it('extracts image metadata and the Meta message id', () => {
    const result = parseWhatsAppMessage({
      id: 'wamid.IMAGE123',
      type: 'image',
      image: { id: 'media-abc', mime_type: 'image/png' },
    })
    expect(result.mediaType).toBe('image')
    expect(result.mediaId).toBe('media-abc')
    expect(result.mediaMimeType).toBe('image/png')
    expect(result.metaMessageId).toBe('wamid.IMAGE123')
  })

  it('classifies 3D model documents as stl', () => {
    const result = parseWhatsAppMessage({
      id: 'wamid.DOC123',
      type: 'document',
      document: { id: 'media-doc', mime_type: 'model/stl', filename: 'part.stl' },
    })
    expect(result.mediaType).toBe('stl')
    expect(result.mediaFilename).toBe('part.stl')
  })

  it('exposes the Meta message id for plain text messages', () => {
    const result = parseWhatsAppMessage({
      id: 'wamid.TEXT123',
      type: 'text',
      text: { body: 'hello' },
    })
    expect(result.metaMessageId).toBe('wamid.TEXT123')
    expect(result.mediaType).toBeNull()
  })
})
