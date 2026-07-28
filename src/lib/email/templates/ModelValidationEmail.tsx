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
import type { ModelValidationPayload } from '../types'

const PRIMARY = '#FF5C1A'
const SECONDARY = '#39BDF8'
const SUCCESS = '#22c55e'
const DANGER = '#ef4444'

export default function ModelValidationEmail({
  customerName,
  orderNumber,
  emailType,
  issues,
  adminQuoteUrl,
}: ModelValidationPayload) {
  const passed = emailType === 'model_validation_pass'
  const statusColor = passed ? SUCCESS : DANGER
  const previewText = passed
    ? `Your 3D model for order ${orderNumber} passed validation.`
    : `Action needed: 3D model issue for order ${orderNumber}.`

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
      <Preview>{previewText}</Preview>
      <Body className="email-bg" style={{ backgroundColor: '#f3f4f6', margin: 0, padding: '24px 0', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 12, padding: 32 }}>
          <Text style={{ fontSize: 20, fontWeight: 800, color: PRIMARY, textAlign: 'center', letterSpacing: 2 }}>FLUX3D</Text>
          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
          <Text style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }} className="email-text">Hi {customerName},</Text>

          {passed ? (
            <>
              <Text style={{ fontSize: 15, lineHeight: 1.6, color: '#6b7280' }} className="email-muted">
                Great news! Your 3D model for order <strong>{orderNumber}</strong> has passed our validation checks and is approved for printing.
              </Text>
              <Section style={{ backgroundColor: '#f0fdf4', borderRadius: 10, padding: 16, border: `1px solid ${SUCCESS}`, margin: '16px 0' }}>
                <Text style={{ fontSize: 15, fontWeight: 600, color: SUCCESS, margin: 0, textAlign: 'center' }}>✓ Model Approved</Text>
              </Section>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 15, lineHeight: 1.6, color: '#6b7280' }} className="email-muted">
                We found issues with the 3D model for order <strong>{orderNumber}</strong> that need to be fixed before we can proceed with printing.
              </Text>
              <Section style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 16, border: `1px solid ${DANGER}`, margin: '16px 0' }}>
                <Text style={{ fontSize: 15, fontWeight: 600, color: DANGER, margin: '0 0 8px' }}>Issues Found:</Text>
                {issues?.map((issue, idx) => (
                  <Text key={idx} style={{ fontSize: 14, color: '#6b7280', margin: '4px 0' }} className="email-muted">
                    • {issue}
                  </Text>
                ))}
              </Section>
            </>
          )}

          {adminQuoteUrl && !passed && (
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Button href={adminQuoteUrl} style={{ backgroundColor: PRIMARY, color: '#fff', padding: '14px 24px', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                Upload Revised Model
              </Button>
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
