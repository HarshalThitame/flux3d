const META_API_VERSION = 'v22.0'
const META_GRAPH_BASE = `https://graph.facebook.com/${META_API_VERSION}`

export function getMetaApiHeaders() {
  const token = process.env.META_SYSTEM_USER_TOKEN
  if (!token) throw new Error('Missing META_SYSTEM_USER_TOKEN')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export function getMetaCatalogId() {
  const id = process.env.META_CATALOG_ID
  if (!id) throw new Error('Missing META_CATALOG_ID')
  return id
}

export function getMetaPixelId() {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID
  if (!id) throw new Error('Missing NEXT_PUBLIC_META_PIXEL_ID')
  return id
}

export function getMetaBusinessId() {
  return process.env.META_BUSINESS_ID ?? null
}

export function getMetaAdAccountId() {
  const id = process.env.META_AD_ACCOUNT_ID
  if (!id) throw new Error('Missing META_AD_ACCOUNT_ID')
  return id
}

export function getMetaApiVersion() {
  return META_API_VERSION
}

export function getMetaGraphBase() {
  return META_GRAPH_BASE
}
