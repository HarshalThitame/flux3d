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
import type { OrderShippedPayload } from '../types'

const PRIMARY_COLOR = '#FF5C1A'
const SECONDARY_COLOR = '#39BDF8'
const DARK_BG = '#1a1a1a'
const DARK_TEXT = '#e5e5e5'
const LIGHT_BG = '#ffffff'
const LIGHT_TEXT = '#1a1a1a'
const MUTED = '#6b7280'

export default function OrderShippedEmail({
  customerName,
  orderNumber,
  items,
  trackingNumber,
  courierName,
  trackingUrl,
  estimatedDelivery,
}: OrderShippedPayload) {
  const previewText = `Your Flux3D order ${orderNumber} has shipped via ${courierName}. Track it now.`

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
      <Preview>{previewText}</Preview>
      <Body className="email-bg" style={bodyStyle}>
        <Container style={containerStyle}>
          <EmailHeader />
          <Hr style={hrStyle} className="email-hr" />

          {/* Main greeting */}
          <Section style={sectionStyle}>
            <Text style={headingStyle} className="email-text">
              Your order is on the way, {customerName}!
            </Text>
            <Text style={paragraphStyle} className="email-muted">
              Great news — order <strong style={{ color: PRIMARY_COLOR }}>{orderNumber}</strong> has left our
              production facility and is now with <strong>{courierName}</strong>.
            </Text>
          </Section>

          {/* Tracking CTA */}
          <Section style={ctaSectionStyle}>
            <Button
              href={trackingUrl}
              style={ctaButtonStyle}
            >
              Track Your Shipment
            </Button>
          </Section>

          {/* Courier card */}
          <Section style={cardStyle} className="email-card">
            <Row>
              <Column style={cardColumnStyle}>
                <Text style={cardLabelStyle} className="email-muted">Courier</Text>
                <Text style={cardValueStyle} className="email-text">{courierName}</Text>
              </Column>
              <Column style={cardColumnStyle}>
                <Text style={cardLabelStyle} className="email-muted">Tracking #</Text>
                <Text style={cardValueStyle} className="email-text">{trackingNumber}</Text>
              </Column>
            </Row>
            {estimatedDelivery && (
              <Row>
                <Column style={cardColumnStyle}>
                  <Text style={cardLabelStyle} className="email-muted">Estimated Delivery</Text>
                  <Text style={cardValueStyle} className="email-text">{estimatedDelivery}</Text>
                </Column>
              </Row>
            )}
          </Section>

          <Hr style={hrStyle} className="email-hr" />

          {/* Order summary */}
          <Section style={sectionStyle}>
            <Text style={subheadingStyle} className="email-text">Order Summary</Text>
            {items.map((item, idx) => (
              <Row key={idx} style={itemRowStyle}>
                <Column style={itemTextColumnStyle}>
                  <Text style={itemNameStyle} className="email-text">
                    {item.name}
                  </Text>
                  <Text style={itemMetaStyle} className="email-muted">
                    {item.material && `${item.material}`}
                    {item.material && item.color ? ' · ' : ''}
                    {item.color && `${item.color}`}
                    {' · '}Qty: {item.quantity}
                  </Text>
                </Column>
                {item.imageUrl && (
                  <Column style={itemImageColumnStyle}>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      width={64}
                      height={64}
                      style={thumbnailStyle}
                    />
                  </Column>
                )}
              </Row>
            ))}
          </Section>

          <Hr style={hrStyle} className="email-hr" />

          {/* Support footer */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle} className="email-muted">
              Need help with your delivery?{' '}
              <Link href="mailto:support@flux3d.in" style={linkStyle}>
                Contact our support team
              </Link>
              {' '}or reply to this email.
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
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
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
  borderTop: '1px solid #e5e7eb',
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

const ctaSectionStyle: React.CSSProperties = {
  padding: '0 32px 24px',
  textAlign: 'center',
}

const ctaButtonStyle: React.CSSProperties = {
  backgroundColor: PRIMARY_COLOR,
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 600,
  textDecoration: 'none',
  borderRadius: 8,
  display: 'inline-block',
  padding: '14px 24px',
}

const cardStyle: React.CSSProperties = {
  margin: '0 32px 24px',
  padding: 20,
  backgroundColor: '#f9fafb',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
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

const itemRowStyle: React.CSSProperties = {
  marginBottom: 12,
}

const itemTextColumnStyle: React.CSSProperties = {
  width: '80%',
  verticalAlign: 'middle',
}

const itemImageColumnStyle: React.CSSProperties = {
  width: '20%',
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

const thumbnailStyle: React.CSSProperties = {
  borderRadius: 6,
  objectFit: 'cover',
  display: 'block',
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
  color: SECONDARY_COLOR,
  textDecoration: 'underline',
}
