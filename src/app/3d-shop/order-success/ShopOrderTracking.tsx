'use client'

import { useEffect } from 'react'
import { trackMetaEvent, trackPixelEvent, generateEventId } from '@/lib/meta/event-utils'

export default function ShopOrderTracking({ orderNumber, itemIds, contents, value }: { orderNumber: string; itemIds: string[]; contents: Array<{ id: string; quantity: number; item_price?: number }>; value: number }) {
  useEffect(() => {
    const eventId = generateEventId()
    trackPixelEvent({
      eventName: 'Purchase',
      eventId,
      customData: { value, currency: 'INR', content_ids: itemIds, content_type: 'product', order_id: orderNumber },
    })
    trackMetaEvent('Purchase', {
      content_ids: itemIds,
      content_type: 'product',
      contents,
      value,
      currency: 'INR',
      order_id: orderNumber,
      num_items: contents.reduce((s, c) => s + c.quantity, 0),
    }).catch(() => {})
  }, [])
  return null
}