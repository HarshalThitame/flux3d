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
  Row,
  Column,
  Preview,
} from '@react-email/components'
import EmailHeader from './components/EmailHeader'
import type { PaymentReceiptPayload } from '../types'

const PRIMARY = '#FF5C1A'
const SECONDARY = '#39BDF8'
const DARK_BG = '#1a1a1a'
const DARK_TEXT = '#e5e5e5'
const LIGHT_BG = '#ffffff'
const LIGHT_TEXT = '#1a1a1a'
const MUTED = '#6b7280'
const CARD_BG = '#f9fafb'
const CARD_BORDER = '#e5e7eb'

export default function PaymentReceiptEmail({
  customerName,
  orderNumber,
  orderDate,
  orderUrl,
  items,
  pricing,
  payment,
  shippingAddress,
}: PaymentReceiptPayload) {
  const previewText = `Payment confirmed for order ${orderNumber} — ${payment.amount}`

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
            .email-table-header { background-color: #262626 !important; }
            .email-table-row { border-color: #333 !important; }
          }
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body className="email-bg" style={bodyStyle}>
        <Container style={containerStyle}>
          <EmailHeader />
          <Hr style={hrStyle} className="email-hr" />

          {/* Status badge */}
          <Section style={{ textAlign: 'center', padding: '0 32px 16px' }}>
            <Text
              style={{
                display: 'inline-block',
                backgroundColor: '#dcfce7',
                color: '#166534',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                padding: '6px 14px',
                borderRadius: 20,
                margin: 0,
              }}
            >
              Payment Confirmed
            </Text>
          </Section>

          {/* Greeting */}
          <Section style={sectionStyle}>
            <Text style={headingStyle} className="email-text">
              Thank you, {customerName}!
            </Text>
            <Text style={paragraphStyle} className="email-muted">
              We have successfully received your payment for order{' '}
              <strong style={{ color: PRIMARY }}>{orderNumber}</strong>. Your order
              is now confirmed and will be processed shortly.
            </Text>
          </Section>

          {/* Order summary card */}
          <Section style={cardStyle} className="email-card">
            <Row>
              <Column style={cardColumnStyle}>
                <Text style={cardLabelStyle} className="email-muted">Order Number</Text>
                <Text style={cardValueStyle} className="email-text">{orderNumber}</Text>
              </Column>
              <Column style={cardColumnStyle}>
                <Text style={cardLabelStyle} className="email-muted">Order Date</Text>
                <Text style={cardValueStyle} className="email-text">{orderDate}</Text>
              </Column>
            </Row>
          </Section>

          {/* CTA */}
          <Section style={{ textAlign: 'center', padding: '0 32px 24px' }}>
            <Button href={orderUrl} style={ctaButtonStyle}>
              View Order Details
            </Button>
          </Section>

          <Hr style={hrStyle} className="email-hr" />

          {/* Line items */}
          <Section style={sectionStyle}>
            <Text style={subheadingStyle} className="email-text">Order Summary</Text>
            {items.map((item, idx) => (
              <Row key={idx} style={itemRowStyle}>
                <Column style={itemTextColumnStyle}>
                  <Text style={itemNameStyle} className="email-text">
                    {item.name}
                  </Text>
                  <Text style={itemMetaStyle} className="email-muted">
                    {item.variant && `${item.variant}`}
                    {item.variant && (item.material || item.color) ? ' · ' : ''}
                    {item.material && `${item.material}`}
                    {item.material && item.color ? ' · ' : ''}
                    {item.color && `${item.color}`}
                    {' · '}Qty: {item.quantity}
                  </Text>
                </Column>
                <Column style={itemPriceColumnStyle}>
                  <Text style={itemPriceStyle} className="email-text">
                    {item.totalPrice}
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>

          {/* Pricing breakdown */}
          <Section style={{ padding: '0 32px 24px' }}>
            <Section style={summaryCardStyle} className="email-card">
              <Row style={summaryRowStyle}>
                <Column>
                  <Text style={summaryLabelStyle} className="email-muted">Subtotal</Text>
                </Column>
                <Column style={{ textAlign: 'right' }}>
                  <Text style={summaryValueStyle} className="email-text">{pricing.subtotal}</Text>
                </Column>
              </Row>
              {pricing.discount && pricing.discount !== '₹0.00' && (
                <Row style={summaryRowStyle}>
                  <Column>
                    <Text style={summaryLabelStyle} className="email-muted">Discount</Text>
                  </Column>
                  <Column style={{ textAlign: 'right' }}>
                    <Text style={{ ...summaryValueStyle, color: '#16a34a' }}>{pricing.discount}</Text>
                  </Column>
                </Row>
              )}
              <Row style={summaryRowStyle}>
                <Column>
                  <Text style={summaryLabelStyle} className="email-muted">Shipping</Text>
                </Column>
                <Column style={{ textAlign: 'right' }}>
                  <Text style={summaryValueStyle} className="email-text">{pricing.shipping}</Text>
                </Column>
              </Row>
              <Row style={summaryRowStyle}>
                <Column>
                  <Text style={summaryLabelStyle} className="email-muted">Tax (GST)</Text>
                </Column>
                <Column style={{ textAlign: 'right' }}>
                  <Text style={summaryValueStyle} className="email-text">{pricing.tax}</Text>
                </Column>
              </Row>
              <Hr style={{ ...hrStyle, margin: '12px 0', borderColor: CARD_BORDER }} className="email-hr" />
              <Row>
                <Column>
                  <Text style={{ ...summaryLabelStyle, fontWeight: 700 }} className="email-text">Grand Total</Text>
                </Column>
                <Column style={{ textAlign: 'right' }}>
                  <Text style={{ ...summaryValueStyle, fontWeight: 700, color: PRIMARY }}>{pricing.grandTotal}</Text>
                </Column>
              </Row>
            </Section>
          </Section>

          <Hr style={hrStyle} className="email-hr" />

          {/* Payment details */}
          <Section style={sectionStyle}>
            <Text style={subheadingStyle} className="email-text">Payment Details</Text>
            <Section style={cardStyle} className="email-card">
              <Row>
                <Column style={cardColumnStyle}>
                  <Text style={cardLabelStyle} className="email-muted">Payment Method</Text>
                  <Text style={cardValueStyle} className="email-text">{payment.method}</Text>
                </Column>
                <Column style={cardColumnStyle}>
                  <Text style={cardLabelStyle} className="email-muted">Transaction ID</Text>
                  <Text style={cardValueStyle} className="email-text">{payment.paymentId}</Text>
                </Column>
              </Row>
              <Row style={{ marginTop: 12 }}>
                <Column style={cardColumnStyle}>
                  <Text style={cardLabelStyle} className="email-muted">Amount Paid</Text>
                  <Text style={cardValueStyle} className="email-text">{payment.amount}</Text>
                </Column>
                <Column style={cardColumnStyle}>
                  <Text style={cardLabelStyle} className="email-muted">Status</Text>
                  <Text style={cardValueStyle} className="email-text">{payment.status}</Text>
                </Column>
              </Row>
              <Row style={{ marginTop: 12 }}>
                <Column style={cardColumnStyle}>
                  <Text style={cardLabelStyle} className="email-muted">Payment Date</Text>
                  <Text style={cardValueStyle} className="email-text">{payment.date}</Text>
                </Column>
              </Row>
            </Section>
          </Section>

          {/* Shipping address */}
          <Section style={sectionStyle}>
            <Text style={subheadingStyle} className="email-text">Shipping Address</Text>
            <Section style={cardStyle} className="email-card">
              <Text style={addressNameStyle} className="email-text">
                {shippingAddress.name}
              </Text>
              <Text style={addressLineStyle} className="email-muted">
                {shippingAddress.phone}
              </Text>
              <Text style={addressLineStyle} className="email-muted">
                {shippingAddress.line1}
                {shippingAddress.line2 && `, ${shippingAddress.line2}`}
              </Text>
              <Text style={addressLineStyle} className="email-muted">
                {shippingAddress.city}, {shippingAddress.state} — {shippingAddress.pincode}
              </Text>
            </Section>
          </Section>

          <Hr style={hrStyle} className="email-hr" />

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle} className="email-muted">
              Questions about your order?{' '}
              <Link href="mailto:support@flux3d.in" style={linkStyle}>
                Contact our support team
              </Link>{' '}
              or reply to this email.
            </Text>
            <Text style={footerTextStyle} className="email-muted">
              Flux3D — Precision 3D Printing
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const bodyStyle: React.CSSProperties = {
  backgroundColor: '#f3f4f6',
  margin: 0,
  padding: '24px 0',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}

const containerStyle: React.CSSProperties = {
  maxWidth: 600,
  margin: '0 auto',
  backgroundColor: LIGHT_BG,
  borderRadius: 12,
  overflow: 'hidden',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
}

const hrStyle: React.CSSProperties = {
  border: 'none',
  borderTop: `1px solid ${CARD_BORDER}`,
  margin: '0 32px',
}

const sectionStyle: React.CSSProperties = {
  padding: '24px 32px',
}

const headingStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: LIGHT_TEXT,
  margin: '0 0 12px',
  lineHeight: 1.3,
}

const subheadingStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: LIGHT_TEXT,
  margin: '0 0 16px',
}

const paragraphStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: MUTED,
  margin: '0 0 12px',
}

const cardStyle: React.CSSProperties = {
  margin: '0 32px 24px',
  padding: 20,
  backgroundColor: CARD_BG,
  borderRadius: 10,
  border: `1px solid ${CARD_BORDER}`,
}

const cardColumnStyle: React.CSSProperties = {
  width: '50%',
  verticalAlign: 'top',
}

const cardLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  color: MUTED,
  margin: '0 0 4px',
}

const cardValueStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: LIGHT_TEXT,
  margin: 0,
  wordBreak: 'break-all',
}

const ctaButtonStyle: React.CSSProperties = {
  backgroundColor: PRIMARY,
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 600,
  textDecoration: 'none',
  borderRadius: 8,
  display: 'inline-block',
  padding: '14px 24px',
}

const itemRowStyle: React.CSSProperties = {
  marginBottom: 12,
  borderBottom: `1px solid ${CARD_BORDER}`,
  paddingBottom: 12,
}

const itemTextColumnStyle: React.CSSProperties = {
  width: '75%',
  verticalAlign: 'middle',
}

const itemPriceColumnStyle: React.CSSProperties = {
  width: '25%',
  textAlign: 'right',
  verticalAlign: 'middle',
}

const itemNameStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: LIGHT_TEXT,
  margin: '0 0 4px',
}

const itemMetaStyle: React.CSSProperties = {
  fontSize: 13,
  color: MUTED,
  margin: 0,
}

const itemPriceStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: LIGHT_TEXT,
  margin: 0,
}

const summaryCardStyle: React.CSSProperties = {
  padding: 16,
  backgroundColor: CARD_BG,
  borderRadius: 10,
  border: `1px solid ${CARD_BORDER}`,
}

const summaryRowStyle: React.CSSProperties = {
  marginBottom: 8,
}

const summaryLabelStyle: React.CSSProperties = {
  fontSize: 14,
  color: MUTED,
  margin: 0,
}

const summaryValueStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: LIGHT_TEXT,
  margin: 0,
}

const addressNameStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: LIGHT_TEXT,
  margin: '0 0 4px',
}

const addressLineStyle: React.CSSProperties = {
  fontSize: 14,
  color: MUTED,
  margin: '0 0 2px',
}

const footerStyle: React.CSSProperties = {
  padding: '16px 32px 32px',
  textAlign: 'center',
}

const footerTextStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  color: MUTED,
  margin: '0 0 8px',
}

const linkStyle: React.CSSProperties = {
  color: SECONDARY,
  textDecoration: 'underline',
}
