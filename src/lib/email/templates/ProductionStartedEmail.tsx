import React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
  Preview,
} from '@react-email/components'
import type { ProductionStartedPayload } from '../types'

const PRIMARY = '#FF5C1A'
const SECONDARY = '#39BDF8'

export default function ProductionStartedEmail({
  customerName,
  orderNumber,
  printBedName,
  estimatedCompletionDate,
}: ProductionStartedPayload) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <style>{`
          @media (prefers-color-scheme: dark) {
            .email-bg { background-color: #1a1a1a !important; }
            .email-text { color: #e5e5e5 !important; }
            .email-muted { color: #9ca3af !important; }
          }
        `}</style>
      </Head>
      <Preview>Production started for order {orderNumber} on {printBedName || 'our print floor'}</Preview>
      <Body className="email-bg" style={{ backgroundColor: '#f3f4f6', margin: 0, padding: '24px 0', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 12, padding: 32 }}>
          <Text style={{ fontSize: 20, fontWeight: 800, color: PRIMARY, textAlign: 'center', letterSpacing: 2 }}>FLUX3D</Text>
          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
          <Text style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }} className="email-text">Hi {customerName},</Text>
          <Text style={{ fontSize: 15, lineHeight: 1.6, color: '#6b7280' }} className="email-muted">
            Your order <strong>{orderNumber}</strong> is now on the print floor{printBedName ? ` on ${printBedName}` : ''}. Our machines are warming up and your parts will be printed with precision.
          </Text>
          {estimatedCompletionDate && (
            <Section style={{ backgroundColor: '#f9fafb', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb', margin: '16px 0' }}>
              <Text style={{ fontSize: 14, color: '#6b7280', margin: 0, textAlign: 'center' }} className="email-muted">
                Estimated completion: <strong style={{ color: '#1a1a1a' }} className="email-text">{estimatedCompletionDate}</strong>
              </Text>
            </Section>
          )}
          <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }} className="email-muted">
            Questions? <Link href="mailto:support@flux3d.in" style={{ color: SECONDARY }}>support@flux3d.in</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
