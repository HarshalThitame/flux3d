import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

const ALLOWED_SIZES = [192, 512] as const
type AllowedSize = (typeof ALLOWED_SIZES)[number]

export const contentType = 'image/png'
// Icon content is static — cache hard at the edge.
export const revalidate = false
export const dynamic = 'force-static'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: rawSize } = await params
  const parsed = Number.parseInt(rawSize, 10)
  const size: AllowedSize = ALLOWED_SIZES.includes(parsed as AllowedSize) ? (parsed as AllowedSize) : 192

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)',
          color: '#ffffff',
          fontSize: Math.round(size * 0.42),
          fontWeight: 800,
          letterSpacing: '-0.04em',
        }}
      >
        F3D
      </div>
    ),
    { width: size, height: size },
  )
}
