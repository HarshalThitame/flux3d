import { beforeEach, describe, expect, it, vi } from 'vitest'

const chatCompletionsCreate = vi.fn()

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: chatCompletionsCreate,
      },
    }
  },
}))

describe('classifyIntent', () => {
  beforeEach(() => {
    chatCompletionsCreate.mockReset()
    process.env.OPENAI_API_KEY = 'test-key'
  })

  it('classifies pricing inquiry', async () => {
    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ intent: 'pricing', keywords: ['PLA', 'cost'] }) } }],
      model: 'gpt-4o-mini',
    })
    const { classifyIntent } = await import('@/lib/whatsapp-intent-classifier')
    const result = await classifyIntent('How much does PLA cost?')
    expect(result.intent).toBe('pricing')
    expect(result.keywords).toContain('PLA')
    expect(result.keywords).toContain('cost')
  })

  it('classifies material inquiry', async () => {
    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ intent: 'materials', keywords: ['PETG', 'filament'] }) } }],
      model: 'gpt-4o-mini',
    })
    const { classifyIntent } = await import('@/lib/whatsapp-intent-classifier')
    const result = await classifyIntent('Do you have PETG filament?')
    expect(result.intent).toBe('materials')
    expect(result.keywords).toEqual(['PETG', 'filament'])
  })

  it('classifies order status inquiry', async () => {
    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ intent: 'order', keywords: ['12345'] }) } }],
      model: 'gpt-4o-mini',
    })
    const { classifyIntent } = await import('@/lib/whatsapp-intent-classifier')
    const result = await classifyIntent('Where is my order #12345?')
    expect(result.intent).toBe('order')
    expect(result.keywords).toContain('12345')
  })

  it('classifies greeting', async () => {
    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ intent: 'greeting', keywords: [] }) } }],
      model: 'gpt-4o-mini',
    })
    const { classifyIntent } = await import('@/lib/whatsapp-intent-classifier')
    const result = await classifyIntent('Hello!')
    expect(result.intent).toBe('greeting')
  })

  it('classifies out_of_scope', async () => {
    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ intent: 'out_of_scope', keywords: [] }) } }],
      model: 'gpt-4o-mini',
    })
    const { classifyIntent } = await import('@/lib/whatsapp-intent-classifier')
    const result = await classifyIntent('What is the weather today?')
    expect(result.intent).toBe('out_of_scope')
  })

  it('classifies general inquiry', async () => {
    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ intent: 'general', keywords: ['3D printing', 'process'] }) } }],
      model: 'gpt-4o-mini',
    })
    const { classifyIntent } = await import('@/lib/whatsapp-intent-classifier')
    const result = await classifyIntent('How does 3D printing work?')
    expect(result.intent).toBe('general')
    expect(result.keywords).toContain('3D printing')
  })

  it('falls back to general when OpenAI key is missing', async () => {
    delete process.env.OPENAI_API_KEY
    const { classifyIntent } = await import('@/lib/whatsapp-intent-classifier')
    const result = await classifyIntent('How much does PLA cost?')
    expect(result.intent).toBe('general')
    expect(result.keywords).toEqual([])
  })

  it('handles invalid JSON from GPT gracefully', async () => {
    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: '{ invalid json' } }],
      model: 'gpt-4o-mini',
    })
    const { classifyIntent } = await import('@/lib/whatsapp-intent-classifier')
    const result = await classifyIntent('How much?')
    expect(result.intent).toBe('general')
    expect(result.keywords).toEqual([])
  })

  it('handles empty response from GPT gracefully', async () => {
    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: '' } }],
      model: 'gpt-4o-mini',
    })
    const { classifyIntent } = await import('@/lib/whatsapp-intent-classifier')
    const result = await classifyIntent('How much?')
    expect(result.intent).toBe('general')
    expect(result.keywords).toEqual([])
  })

  it('handles GPT returning unknown intent value', async () => {
    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ intent: 'unknown_intent', keywords: [] }) } }],
      model: 'gpt-4o-mini',
    })
    const { classifyIntent } = await import('@/lib/whatsapp-intent-classifier')
    const result = await classifyIntent('Some random question')
    expect(result.intent).toBe('general')
  })

  it('filters non-string keywords', async () => {
    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ intent: 'pricing', keywords: ['PLA', 123, null, true] }) } }],
      model: 'gpt-4o-mini',
    })
    const { classifyIntent } = await import('@/lib/whatsapp-intent-classifier')
    const result = await classifyIntent('PLA price')
    expect(result.keywords).toEqual(['PLA'])
  })

  it('uses WHATSAPP_CLASSIFIER_MODEL env var', async () => {
    process.env.WHATSAPP_CLASSIFIER_MODEL = 'custom-model'
    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ intent: 'greeting', keywords: [] }) } }],
      model: 'custom-model',
    })
    const { classifyIntent } = await import('@/lib/whatsapp-intent-classifier')
    await classifyIntent('Hi')
    expect(chatCompletionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'custom-model' }),
    )
  })
})
