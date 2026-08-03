const API_VERSION = process.env.WHATSAPP_API_VERSION?.trim() || 'v22.0'

export type WhatsAppSendResult = {
  ok: boolean
  status?: number
  error?: string
}

function getWhatsAppCredentials() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) return null
  return { phoneNumberId, accessToken }
}

async function sendRaw(to: string, payload: Record<string, unknown>): Promise<WhatsAppSendResult> {
  const creds = getWhatsAppCredentials()
  if (!creds) return { ok: false, error: 'Missing WhatsApp API configuration.' }

  const url = `https://graph.facebook.com/${API_VERSION}/${creds.phoneNumberId}/messages`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        ...payload,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      return { ok: false, status: response.status, error: text.slice(0, 300) }
    }
    return { ok: true, status: response.status }
  } catch (fetchError) {
    return { ok: false, error: fetchError instanceof Error ? fetchError.message : 'Unknown error' }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function sendWhatsAppText(
  to: string,
  body: string,
  opts: { previewUrl?: boolean } = {}
): Promise<WhatsAppSendResult> {
  return sendRaw(to, {
    type: 'text',
    text: { preview_url: opts.previewUrl ?? false, body },
  })
}

export type WhatsAppListRow = { id: string; title: string; description?: string }
export type WhatsAppListSection = { title?: string; rows: WhatsAppListRow[] }

export async function sendWhatsAppList(
  to: string,
  params: {
    header?: string
    body: string
    footer?: string
    buttonText: string
    sections: WhatsAppListSection[]
  }
): Promise<WhatsAppSendResult> {
  return sendRaw(to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      ...(params.header ? { header: { type: 'text', text: params.header } } : {}),
      body: { text: params.body },
      ...(params.footer ? { footer: { text: params.footer } } : {}),
      action: {
        button: params.buttonText,
        sections: params.sections.map((section) => ({
          ...(section.title ? { title: section.title } : {}),
          rows: section.rows,
        })),
      },
    },
  })
}

export async function sendWhatsAppButtons(
  to: string,
  params: {
    header?: string
    body: string
    footer?: string
    buttons: Array<{ id: string; title: string }>
  }
): Promise<WhatsAppSendResult> {
  return sendRaw(to, {
    type: 'interactive',
    interactive: {
      type: 'button',
      ...(params.header ? { header: { type: 'text', text: params.header } } : {}),
      body: { text: params.body },
      ...(params.footer ? { footer: { text: params.footer } } : {}),
      action: {
        buttons: params.buttons.map((button) => ({
          type: 'reply',
          reply: { id: button.id, title: button.title },
        })),
      },
    },
  })
}

export async function sendWhatsAppProduct(
  to: string,
  catalogId: string,
  productRetailerId: string
): Promise<WhatsAppSendResult> {
  return sendRaw(to, {
    type: 'product',
    product: {
      catalog_id: catalogId,
      product_retailer_id: productRetailerId,
    },
  })
}

export type WhatsAppTemplateComponent =
  | { type: 'header'; parameters: Array<{ type: 'text'; text: string }> }
  | { type: 'body'; parameters: Array<{ type: 'text'; text: string }> }
  | { type: 'button'; sub_type: 'url' | 'quick_reply'; index: string; parameters: Array<{ type: 'text'; text: string }> }

export async function sendWhatsAppTemplate(
  to: string,
  params: {
    name: string
    language: string
    components?: WhatsAppTemplateComponent[]
  }
): Promise<WhatsAppSendResult> {
  return sendRaw(to, {
    type: 'template',
    template: {
      name: params.name,
      language: { code: params.language },
      ...(params.components && params.components.length ? { components: params.components } : {}),
    },
  })
}

export async function sendWhatsAppFlow(
  to: string,
  params: {
    flowId: string
    flowToken: string
    cta: string
    body?: string
  }
): Promise<WhatsAppSendResult> {
  return sendRaw(to, {
    type: 'interactive',
    interactive: {
      type: 'flow',
      body: { text: params.body ?? 'Tap below to continue.' },
      action: {
        name: 'flow',
        parameters: {
          flow_message_version: '3',
          flow_id: params.flowId,
          flow_cta: params.cta,
          flow_token: params.flowToken,
          mode: 'published',
        },
      },
    },
  })
}

export async function sendWhatsAppPaymentLink(
  to: string,
  shortUrl: string,
  message: string
): Promise<WhatsAppSendResult> {
  return sendRaw(to, {
    type: 'text',
    text: { preview_url: true, body: `${message}\n${shortUrl}` },
  })
}

const catalogItemIdCache = new Map<string, string>()

// Resolve a Meta catalog item id (from a tapped product message) to retailer_id (sku_code).
export async function mapCatalogItemToSku(catalogItemId: string): Promise<string | null> {
  if (catalogItemIdCache.has(catalogItemId)) {
    return catalogItemIdCache.get(catalogItemId) ?? null
  }

  const accessToken = process.env.META_SYSTEM_USER_TOKEN
  if (!accessToken) return null

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${catalogItemId}?fields=retailer_id`,
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal }
    ).finally(() => clearTimeout(timeoutId))

    if (!response.ok) return null
    const data = await response.json() as Record<string, unknown>
    const retailerId = typeof data.retailer_id === 'string' ? data.retailer_id : null
    if (retailerId) catalogItemIdCache.set(catalogItemId, retailerId)
    return retailerId
  } catch {
    return null
  }
}
