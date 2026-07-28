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
import type { OrderPlacedCustomerPayload, OrderPlacedAdminPayload } from '../types'

const PRIMARY = '#FF5C1A'
const SECONDARY = '#39BDF8'

type OrderPlacedEmailProps = OrderPlacedCustomerPayload | OrderPlacedAdminPayload

export default function OrderPlacedEmail(props: OrderPlacedEmailProps) {
  const isAdmin = props.emailType === 'order_placed_admin'
  const { orderNumber, customerName, total } = props

  const previewText = isAdmin
    ? `New order ${orderNumber} from ${customerName} — ₹${total}`
    : `Order ${orderNumber} confirmed. Total: ₹${total}`

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
      <Preview>{previewText}</Preview>
      <Body className="email-bg" style={{ backgroundColor: '#f3f4f6', margin: 0, padding: '24px 0', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 12, padding: 32 }}>
          <Text style={{ fontSize: 20, fontWeight: 800, color: PRIMARY, textAlign: 'center', letterSpacing: 2 }}>FLUX3D</Text>
          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

          <Text style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }} className="email-text">
            {isAdmin ? 'New order received' : `Thank you, ${customerName}!`}
          </Text>

          <Text style={{ fontSize: 15, lineHeight: 1.6, color: '#6b7280' }} className="email-muted">
            {isAdmin
              ? `A new order has been placed by ${customerName}.`
              : `Your order ${orderNumber} has been confirmed and is now being reviewed by our team.`}
          </Text>

          {/* Order summary card */}
          <Section style={{ backgroundColor: '#f9fafb', borderRadius: 10, padding: 20, border: '1px solid #e5e7eb', margin: '16px 0' }} className="email-card">
            <Row>
              <Column style={{ width: '50%' }}>
                <Text style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase' }} className="email-muted">Order #</Text>
                <Text style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: 0 }} className="email-text">{orderNumber}</Text>
              </Column>
              <Column style={{ width: '50%' }}>
                <Text style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase' }} className="email-muted">Total</Text>
                <Text style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: 0 }} className="email-text">{total}</Text>
              </Column>
            </Row>
            {!isAdmin && 'items' in props && (
              <>
                <Hr style={{ borderColor: '#e5e7eb', margin: '12px 0' }} />
                {props.items.map((item, idx) => (
                  <Text key={idx} style={{ fontSize: 14, color: '#6b7280', margin: '4px 0' }} className="email-muted">
                    {item.name} · Qty {item.quantity}
                  </Text>
                ))}
              </>
            )}
          </Section>

          {!isAdmin && 'orderUrl' in props && (
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Button href={props.orderUrl} style={{ backgroundColor: PRIMARY, color: '#fff', padding: '14px 24px', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                View Order Details
              </Button>
            </Section>
          )}

          {isAdmin && 'adminOrderUrl' in props && (
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Button href={props.adminOrderUrl} style={{ backgroundColor: PRIMARY, color: '#fff', padding: '14px 24px', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                Review in Admin
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
