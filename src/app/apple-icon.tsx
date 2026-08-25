import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
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
          fontSize: 84,
          fontWeight: 800,
          letterSpacing: '-0.04em',
        }}
      >
        F3D
      </div>
    ),
    size,
  )
}
