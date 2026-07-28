import React from 'react'
import { Img, Text, Section } from '@react-email/components'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flux3d.in'

export default function EmailHeader() {
  return (
    <Section style={{ textAlign: 'center', padding: '24px 0 16px' }}>
      <Img
        src={`${SITE_URL}/logo.png`}
        alt="Flux3D"
        width={120}
        style={{ margin: '0 auto', display: 'block' }}
      />
      <Text
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#FF5C1A',
          textAlign: 'center',
          letterSpacing: 3,
          margin: '8px 0 0',
          textTransform: 'uppercase',
        }}
      >
        FLUX3D
      </Text>
    </Section>
  )
}
