import React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Link,
  Preview,
} from '@react-email/components'
import EmailHeader from './components/EmailHeader'
import type { DeliveryConfirmationPayload } from '../types'

const PRIMARY = '#FF5C1A'
const SECONDARY = '#39BDF8'

export default function DeliveryConfirmationEmail({
  customerName,
  orderNumber,
  reviewUrl,
}: DeliveryConfirmationPayload) {
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
      <Preview>Order {orderNumber} delivered — how did we do?</Preview>
      <Body className="email-bg" style={{ backgroundColor: '#f3f4f6', margin: 0, padding: '24px 0', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 12, padding: 32 }}>
          <EmailHeader />
          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
          <Text style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }} className="email-text">Hi {customerName},</Text>
          <Text style={{ fontSize: 15, lineHeight: 1.6, color: '#6b7280' }} className="email-muted">
            Your order <strong>{orderNumber}</strong> has been delivered. We hope you love your 3D-printed parts!
          </Text>
          {reviewUrl && (
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Button href={reviewUrl} style={{ backgroundColor: PRIMARY, color: '#fff', padding: '14px 24px', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                Leave a Review
              </Button>
            </Section>
          )}
          <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }} className="email-muted">
            Questions or issues with your order? <Link href="mailto:support@flux3d.in" style={{ color: SECONDARY }}>support@flux3d.in</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
