import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'node:events'

const verifyMock = vi.hoisted(() => vi.fn())
const sendWhatsAppTemplate = vi.hoisted(() => vi.fn())
const loadOutboxRow = vi.hoisted(() => vi.fn())
const completeOutboxSend = vi.hoisted(() => vi.fn())

vi.mock('@upstash/qstash', () => ({
  Receiver: class {
    verify = verifyMock
  },
}))

vi.mock('@/lib/whatsapp/messages', () => ({
  sendWhatsAppTemplate,
}))

vi.mock('@/lib/whatsapp/outbox', () => ({
  loadOutboxRow,
  completeOutboxSend,
}))

function makeReq(body: string, headers: Record<string, string> = {}) {
  const req = new EventEmitter() as unknown as import('next/dist/shared/lib/utils').NextApiRequest & {
    headers: Record<string, string>
    url: string
    method: string
  }
  req.method = 'POST'
  req.headers = { host: 'flux3d.in', ...headers }
  req.url = '/api/whatsapp/notify'
  queueMicrotask(() => {
    req.emit('data', Buffer.from(body))
    req.emit('end')
  })
  return req
}

function makeRes() {
  const res = {
    statusCode: 0,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockResolvedValue(undefined),
  }
  return res
}

const QUEUED_ROW = {
  id: 'ob-1',
  template_name: 'flux3d_order_delivered',
  phone: '919623023477',
  components: [{ type: 'body', parameters: [{ type: 'text', text: 'ORD-1' }] }],
  log_text: 'Order #ORD-1 delivered',
  trigger_event: 'order_delivered',
  user_id: null,
  status: 'queued' as const,
  attempts: 0,
  meta_message_id: null,
}

async function callHandler(body: string, headers?: Record<string, string>) {
  const { default: handler } = await import('@/pages/api/whatsapp/notify')
  const req = makeReq(body, headers)
  const res = makeRes()
  await handler(req as never, res as never)
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.QSTASH_CURRENT_SIGNING_KEY = 'cur'
  process.env.QSTASH_NEXT_SIGNING_KEY = 'next'
  verifyMock.mockResolvedValue(true)
  loadOutboxRow.mockResolvedValue(null)
  completeOutboxSend.mockResolvedValue(undefined)
  sendWhatsAppTemplate.mockResolvedValue({ ok: true, messageId: 'wamid.ok' })
})

describe('/api/whatsapp/notify consumer', () => {
  it('rejects non-POST requests', async () => {
    const { default: handler } = await import('@/pages/api/whatsapp/notify')
    const req = new EventEmitter()
    ;(req as unknown as { method: string }).method = 'GET'
    const res = makeRes()
    await handler(req as never, res as never)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('returns 401 when the QStash signature is missing', async () => {
    const res = await callHandler(JSON.stringify({ outboxId: 'x' }))
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 401 when the signature fails verification', async () => {
    verifyMock.mockResolvedValue(false)
    const sig = 's'
    const res = await callHandler(JSON.stringify({ outboxId: 'x' }), { 'upstash-signature': sig })
    expect(res.status).toHaveBeenCalledWith(401)
    expect(loadOutboxRow).not.toHaveBeenCalled()
  })

  it('delivers a queued row and closes it as sent with the wamid', async () => {
    loadOutboxRow.mockResolvedValue(QUEUED_ROW)
    const body = JSON.stringify({ outboxId: 'ob-1' })
    const res = await callHandler(body, { 'upstash-signature': 'sig' })

    expect(res.status).toHaveBeenCalledWith(200)
    expect(sendWhatsAppTemplate).toHaveBeenCalledWith(
      '919623023477',
      expect.objectContaining({ name: 'flux3d_order_delivered', language: 'en_IN' })
    )
    expect(completeOutboxSend).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ob-1' }),
      { ok: true, messageId: 'wamid.ok' }
    )
  })

  it('skips rows that already have a wamid (double-delivery guard)', async () => {
    loadOutboxRow.mockResolvedValue({ ...QUEUED_ROW, meta_message_id: 'wamid.prev' })
    const res = await callHandler(JSON.stringify({ outboxId: 'ob-1' }), { 'upstash-signature': 'sig' })

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ skipped: 'already_sent' }))
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })

  it('skips non-queued rows', async () => {
    loadOutboxRow.mockResolvedValue({ ...QUEUED_ROW, status: 'sent' })
    const res = await callHandler(JSON.stringify({ outboxId: 'ob-1' }), { 'upstash-signature': 'sig' })

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ skipped: 'already_sent' }))
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled()
  })

  it('returns 500 on template failure so QStash retries, and records the failure', async () => {
    loadOutboxRow.mockResolvedValue(QUEUED_ROW)
    sendWhatsAppTemplate.mockResolvedValue({ ok: false, status: 500, error: 'graph down' })
    const res = await callHandler(JSON.stringify({ outboxId: 'ob-1' }), { 'upstash-signature': 'sig' })

    expect(res.status).toHaveBeenCalledWith(500)
    expect(completeOutboxSend).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ob-1' }),
      expect.objectContaining({ ok: false })
    )
  })
})
