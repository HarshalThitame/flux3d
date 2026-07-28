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
import type { PaymentReceiptPayload } from '../types'

const PRIMARY = '#FF5C1A'
const SECONDARY = '#39BDF8'

export default function PaymentReceiptEmail({
  customerName,
  orderNumber,
  amount,
  paymentMethod,
  receiptUrl,
}: PaymentReceiptPayload) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <style>{`
          @media (prefers-color-scheme: dark) {
            .email-bg { background-color: #1a1a1a !important; }
            .email-text { color: #e5e5e5 !important; }
            .email-muted { color: #9ca3af !important; }
            .email-card { background-color: #262626 !important; border-color: #333 !important; }
          }
        `}</style>
      </Head>
      <Preview>Payment receipt for order {orderNumber} — ₹{amount}</Preview>
      <Body className="email-bg" style={{ backgroundColor: '#f3f4f6', margin: 0, padding: '24px 0', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 12, padding: 32 }}>
          <Text style={{ fontSize: 20, fontWeight: 800, color: PRIMARY, textAlign: 'center', letterSpacing: 2 }}>FLUX3D</Text>
          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
          <Text style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }} className="email-text">Hi {customerName},</Text>
          <Text style={{ fontSize: 15, lineHeight: 1.6, color: '#6b7280' }} className="email-muted">
            We've received your payment for order <strong>{orderNumber}</strong>. Your receipt is below.
          </Text>

          <Section style={{ backgroundColor: '#f9fafb', borderRadius: 10, padding: 20, border: '1px solid #e5e7eb', margin: '16px 0' }} className="email-card">
            <Text style={{ fontSize: 14, color: '#6b7280', margin: '4px 0' }} className="email-muted">Amount Paid: <strong style={{ color: '#1a1a1a' }} className="email-text">{amount}</strong></Text>
            <Text style={{ fontSize: 14, color: '#6b7280', margin: '4px 0' }} className="email-muted">Payment Method: <strong style={{ color: '#1a1a1a' }} className="email-text">{paymentMethod}</strong></Text>
            <Text style={{ fontSize: 14, color: '#6b7280', margin: '4px 0' }} className="email-muted">Order: <strong style={{ color: '#1a1a1a' }} className="email-text">{orderNumber}</strong></Text>
          </Section>

          {receiptUrl && (
            <Text style={{ fontSize: 15, textAlign: 'center', margin: '16px 0' }}>
              <Link href={receiptUrl} style={{ color: SECONDARY, textDecoration: 'underline' }}>Download PDF Receipt</Link>
            </Text>
          )}

          <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }} className="email-muted">
            Questions? <Link href="mailto:support@flux3d.in" style={{ color: SECONDARY }}>support@flux3d.in</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
