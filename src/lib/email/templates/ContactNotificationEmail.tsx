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
import type { ContactNotificationPayload } from '../types'

const PRIMARY = '#FF5C1A'
const SECONDARY = '#39BDF8'

export default function ContactNotificationEmail({
  senderName,
  senderEmail,
  senderPhone,
  message,
}: ContactNotificationPayload) {
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
      <Preview>New contact form submission from {senderName}</Preview>
      <Body className="email-bg" style={{ backgroundColor: '#f3f4f6', margin: 0, padding: '24px 0', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 12, padding: 32 }}>
          <Text style={{ fontSize: 20, fontWeight: 800, color: PRIMARY, textAlign: 'center', letterSpacing: 2 }}>FLUX3D</Text>
          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
          <Text style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }} className="email-text">New Contact Form Submission</Text>

          <Section style={{ backgroundColor: '#f9fafb', borderRadius: 10, padding: 20, border: '1px solid #e5e7eb', margin: '16px 0' }} className="email-card">
            <Text style={{ fontSize: 14, color: '#6b7280', margin: '4px 0' }} className="email-muted"><strong style={{ color: '#1a1a1a' }} className="email-text">Name:</strong> {senderName}</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', margin: '4px 0' }} className="email-muted"><strong style={{ color: '#1a1a1a' }} className="email-text">Email:</strong> {senderEmail}</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', margin: '4px 0' }} className="email-muted"><strong style={{ color: '#1a1a1a' }} className="email-text">Phone:</strong> {senderPhone}</Text>
            <Hr style={{ borderColor: '#e5e7eb', margin: '12px 0' }} />
            <Text style={{ fontSize: 14, color: '#6b7280', margin: '4px 0' }} className="email-muted">{message}</Text>
          </Section>

          <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }} className="email-muted">
            Reply to <Link href={`mailto:${senderEmail}`} style={{ color: SECONDARY }}>{senderEmail}</Link> to respond.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
