import { parseOrderCartItems, type OrderInteraction } from './order-flow'

export type ParsedWhatsAppMessage = {
  text: string | undefined
  mediaInfo: string | null
  interaction: OrderInteraction | null
}

type MetaMessage = Record<string, unknown>

function getNested(message: MetaMessage | null | undefined, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, message)
}

export function parseWhatsAppMessage(message: MetaMessage | undefined | null): ParsedWhatsAppMessage {
  const msgType = message?.type

  let text: string | undefined
  let mediaInfo: string | null = null
  let interaction: OrderInteraction | null = null

  if (msgType === 'text') {
    text = (getNested(message, 'text.body') as string | undefined) ?? undefined
  } else if (msgType === 'image') {
    text = (getNested(message, 'image.caption') as string | undefined) ?? undefined
    mediaInfo = `[Image ID: ${String(getNested(message, 'image.id') ?? 'unknown')}]`
  } else if (msgType === 'document') {
    text = (getNested(message, 'document.caption') as string | undefined) ?? undefined
    mediaInfo = `[Document: ${String(getNested(message, 'document.filename') ?? 'unknown')}]`
  } else if (msgType === 'audio' || msgType === 'video' || msgType === 'sticker') {
    mediaInfo = `[${msgType}]`
  } else if (msgType === 'interactive') {
    const interactive = getNested(message, 'interactive') as Record<string, unknown> | undefined
    const interactiveType = interactive?.type
    if (interactiveType === 'list_reply') {
      interaction = {
        kind: 'list',
        id: String(getNested(message, 'interactive.list_reply.id') ?? ''),
        title: String(getNested(message, 'interactive.list_reply.title') ?? ''),
      }
      text = interaction.title || text
    } else if (interactiveType === 'button_reply') {
      interaction = {
        kind: 'button',
        id: String(getNested(message, 'interactive.button_reply.id') ?? ''),
        title: String(getNested(message, 'interactive.button_reply.title') ?? ''),
      }
      text = interaction.title || text
    } else if (interactiveType === 'product') {
      const retailerId = String(getNested(message, 'interactive.product.product_retailer_id') ?? '')
      if (retailerId) {
        interaction = { kind: 'product', id: retailerId, title: 'Product' }
        text = text || `[product:${retailerId}]`
      }
    }
  } else if (msgType === 'order') {
    const items = parseOrderCartItems(getNested(message, 'order.product_items'))
    if (items.length > 0) {
      interaction = { kind: 'order', items }
      text = text || `[order cart: ${items.length} item(s)]`
    }
  }

  return { text, mediaInfo, interaction }
}
