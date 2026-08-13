import type { WhatsAppIntent } from '@/lib/whatsapp-rag'

/**
 * Regex-based WhatsApp intent detection. Mirrors the intent categories used
 * by the structured-data pipeline (see WhatsAppIntent in whatsapp-rag).
 */
export function detectWhatsAppIntent(messageText: string): WhatsAppIntent {
  const text = messageText.toLowerCase()

  if (/(price|pricing|quote|quotation|cost|estimate|amount)/i.test(text)) return 'pricing'
  if (/(ship|shipping|delivery|courier|dispatch|tracking|pincode|pin code)/i.test(text)) return 'shipping'
  if (/(order status|status of my order|where is my order|my order|order number|invoice)/i.test(text)) return 'order'
  if (/(material|pla\+?|abs|petg|asa|tpu|resin|filament|finish|colour|color)/i.test(text)) return 'materials'
  if (/(contact|call|phone|whatsapp number|support|hours|working hours)/i.test(text)) return 'contact'
  if (/(link|connect|account|save to account|connect account)/i.test(text)) return 'link_account'
  if (/(hello|hi|hey|good morning|good afternoon|good evening)/i.test(text)) return 'greeting'

  return 'general'
}