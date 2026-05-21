import { ImageResponse } from 'next/og'

export const alt = 'Flux3D — Premium 3D Printing India'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          background:
            'radial-gradient(circle at top, rgba(109, 40, 217,0.22), transparent 42%), linear-gradient(135deg, #f8f6f2 0%, #faf9f7 58%, #ede9fe 100%)',
          color: '#1a1a1a',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 34,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#6d28d9',
          }}
        >
          Additive Innovation
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 110,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            Flux3D
          </div>
          <div
            style={{
              display: 'flex',
              maxWidth: '900px',
              fontSize: 38,
              lineHeight: 1.3,
              color: '#4b4b4b',
            }}
          >
            Precision 3D printing, rapid prototyping, and custom manufacturing support across India.
          </div>
        </div>
      </div>
    ),
    size
  )
}
