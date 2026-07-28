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
import type { PaymentFailedPayload } from '../types'

const PRIMARY = '#FF5C1A'
const SECONDARY = '#39BDF8'
const DARK_BG = '#1a1a1a'
const DARK_TEXT = '#e5e5e5'
const LIGHT_BG = '#ffffff'
const LIGHT_TEXT = '#1a1a1a'
const MUTED = '#6b7280'
const CARD_BG = '#f9fafb'
const CARD_BORDER = '#e5e7eb'

export default function PaymentFailedEmail({
  customerName,
  orderNumber,
  amount,
  retryUrl,
}: PaymentFailedPayload) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{`
          @media (prefers-color-scheme: dark) {
            .email-bg { background-color: ${DARK_BG} !important; }
            .email-text { color: ${DARK_TEXT} !important; }
            .email-muted { color: #9ca3af !important; }
            .email-card { background-color: #262626 !important; border-color: #333 !important; }
            .email-hr { border-color: #333 !important; }
          }
        `}</style>
      </Head>
      <Preview>Payment failed for order {orderNumber} — please retry</Preview>
      <Body className="email-bg" style={{ backgroundColor: '#f3f4f6', margin: 0, padding: '24px 0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: LIGHT_BG, borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <EmailHeader />
          <Hr style={{ borderColor: CARD_BORDER, margin: '0 32px' }} className="email-hr" />

          {/* Status badge */}
          <Section style={{ textAlign: 'center', padding: '0 32px 16px' }}>
            <Text
              style={{
                display: 'inline-block',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                padding: '6px 14px',
                borderRadius: 20,
                margin: 0,
              }}
            >
              Payment Failed
            </Text>
          </Section>

          <Section style={{ padding: '0 32px 24px' }}>
            <Text style={{ fontSize: 22, fontWeight: 700, color: LIGHT_TEXT, margin: '0 0 12px', lineHeight: 1.3 }} className="email-text">
              Hi {customerName},
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 1.6, color: MUTED, margin: '0 0 12px' }} className="email-muted">
              We couldn't process your payment of <strong style={{ color: LIGHT_TEXT }} className="email-text">{amount}</strong> for order <strong style={{ color: LIGHT_TEXT }} className="email-text">{orderNumber}</strong>. Don't worry — your order is saved. You can retry payment within 24 hours.
            </Text>
          </Section>

          {/* Order summary card */}
          <Section style={{ padding: '0 32px 24px' }}>
            <Section style={{ padding: 16, backgroundColor: CARD_BG, borderRadius: 10, border: `1px solid ${CARD_BORDER}` }} className="email-card">
              <Text style={{ fontSize: 14, color: MUTED, margin: '0 0 4px' }} className="email-muted">Order Number</Text>
              <Text style={{ fontSize: 15, fontWeight: 600, color: LIGHT_TEXT, margin: '0 0 12px' }} className="email-text">{orderNumber}</Text>
              <Text style={{ fontSize: 14, color: MUTED, margin: '0 0 4px' }} className="email-muted">Amount Due</Text>
              <Text style={{ fontSize: 15, fontWeight: 600, color: LIGHT_TEXT, margin: 0 }} className="email-text">{amount}</Text>
            </Section>
          </Section>

          <Section style={{ textAlign: 'center', padding: '0 32px 24px' }}>
            <Button href={retryUrl} style={{ backgroundColor: PRIMARY, color: '#fff', padding: '14px 24px', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
              Retry Payment
            </Button>
          </Section>

          <Hr style={{ borderColor: CARD_BORDER, margin: '0 32px' }} className="email-hr" />

          <Section style={{ padding: '16px 32px 32px', textAlign: 'center' }}>
            <Text style={{ fontSize: 13, lineHeight: 1.5, color: MUTED, margin: '0 0 8px' }} className="email-muted">
              Need help? <Link href="mailto:support@flux3d.in" style={{ color: SECONDARY }}>support@flux3d.in</Link>
            </Text>
            <Text style={{ fontSize: 13, lineHeight: 1.5, color: MUTED, margin: 0 }} className="email-muted">
              Flux3D — Precision 3D Printing
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
