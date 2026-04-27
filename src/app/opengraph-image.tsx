import { ImageResponse } from 'next/og'

export const alt = 'Flux3D Additive Innovation'
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
            'radial-gradient(circle at top, rgba(255,92,26,0.28), transparent 42%), linear-gradient(135deg, #050810 0%, #0d1120 58%, #111827 100%)',
          color: 'white',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 34,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#ff8c57',
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
              color: '#c6cbd9',
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
