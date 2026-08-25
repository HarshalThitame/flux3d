import { listAllShopProducts } from '@/lib/shop/public-data'
import { absoluteUrl, siteUrl } from '@/lib/site'
import type { ShopPublicProduct } from '@/lib/shop/public-types'

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>'
const MAX_TITLE_LENGTH = 150
const MAX_DESCRIPTION_LENGTH = 5000
const MAX_ADDITIONAL_IMAGES = 10

const xmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&apos;',
  '"': '&quot;',
}

function escapeXml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => xmlEscapes[char])
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1).trimEnd()}…`
}

function cleanText(value: string | null | undefined) {
  if (!value) return ''
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getAvailability(product: ShopPublicProduct) {
  if (product.stock_status === 'pre_order') return 'preorder'
  if (product.stock_status === 'out_of_stock' || product.stock_status === 'unavailable') {
    return 'out of stock'
  }
  return 'in stock'
}

function makeFeedItem(product: ShopPublicProduct) {
  const link = absoluteUrl(`/3d-shop/product/${product.slug}`)
  const image = product.thumbnail_url || product.image_urls[0] || null
  const additionalImages = product.image_urls
    .filter((url) => url && url !== image)
    .slice(0, MAX_ADDITIONAL_IMAGES)

  const lines = [
    '    <item>',
    `      <g:id>${escapeXml(product.id)}</g:id>`,
    `      <g:title>${escapeXml(truncate(cleanText(product.name) || product.slug, MAX_TITLE_LENGTH))}</g:title>`,
    `      <g:description>${escapeXml(
      truncate(
        cleanText(product.meta_description) || cleanText(product.description) || cleanText(product.long_description) || product.name,
        MAX_DESCRIPTION_LENGTH,
      ),
    )}</g:description>`,
    `      <g:link>${escapeXml(link)}</g:link>`,
    image ? `      <g:image_link>${escapeXml(new URL(image, siteUrl).toString())}</g:image_link>` : null,
    ...additionalImages.map(
      (url) => `      <g:additional_image_link>${escapeXml(new URL(url, siteUrl).toString())}</g:additional_image_link>`,
    ),
    '      <g:condition>new</g:condition>',
    `      <g:availability>${getAvailability(product)}</g:availability>`,
    `      <g:price>${product.display_price.toFixed(2)} INR</g:price>`,
    '      <g:brand>Flux3D</g:brand>',
    '      <g:identifier_exists>no</g:identifier_exists>',
    product.category_name
      ? `      <g:product_type>${escapeXml(product.category_name)}</g:product_type>`
      : null,
    `      <pubDate>${new Date(product.updated_at || product.created_at || Date.now()).toUTCString()}</pubDate>`,
    '    </item>',
  ]

  return lines.filter(Boolean).join('\n')
}

export async function GET() {
  let items: string[] = []

  try {
    const products = await listAllShopProducts()
    items = products
      .filter((product) => product.slug && (product.thumbnail_url || product.image_urls.length > 0))
      .map(makeFeedItem)
  } catch (error) {
    console.error('[google-shopping-feed] Failed to load products:', error)
  }

  const xml = [
    XML_DECLARATION,
    '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">',
    '  <channel>',
    `    <title>Flux3D Products</title>`,
    `    <link>${escapeXml(siteUrl)}</link>`,
    `    <description>Ready-made 3D printed products from Flux3D.</description>`,
    ...items,
    '  </channel>',
    '</rss>',
  ].join('\n')

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
