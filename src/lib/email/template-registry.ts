import React from 'react'
import { render } from '@react-email/render'
import type { EmailJobPayload } from './types'

// Import all templates
import OrderShippedEmail from './templates/OrderShippedEmail'
import WelcomeEmail from './templates/WelcomeEmail'
import EmailVerificationEmail from './templates/EmailVerificationEmail'
import PasswordResetEmail from './templates/PasswordResetEmail'
import OrderPlacedEmail from './templates/OrderPlacedEmail'
import PaymentReceiptEmail from './templates/PaymentReceiptEmail'
import PaymentFailedEmail from './templates/PaymentFailedEmail'
import RefundIssuedEmail from './templates/RefundIssuedEmail'
import ModelValidationEmail from './templates/ModelValidationEmail'
import ProductionStartedEmail from './templates/ProductionStartedEmail'
import DeliveryConfirmationEmail from './templates/DeliveryConfirmationEmail'
import ContactNotificationEmail from './templates/ContactNotificationEmail'

export type EmailTemplateComponent = (props: any) => React.ReactElement

const TEMPLATE_MAP: Record<string, EmailTemplateComponent> = {
  welcome: WelcomeEmail,
  email_verification: EmailVerificationEmail,
  password_reset: PasswordResetEmail,
  order_placed_customer: OrderPlacedEmail,
  order_placed_admin: OrderPlacedEmail,
  order_shipped: OrderShippedEmail,
  payment_receipt: PaymentReceiptEmail,
  payment_failed: PaymentFailedEmail,
  refund_issued: RefundIssuedEmail,
  model_validation_pass: ModelValidationEmail,
  model_validation_fail: ModelValidationEmail,
  production_started: ProductionStartedEmail,
  delivery_confirmation: DeliveryConfirmationEmail,
  contact_notification: ContactNotificationEmail,
}

export function getTemplate(type: EmailJobPayload['emailType']): EmailTemplateComponent | null {
  return TEMPLATE_MAP[type] ?? null
}

/**
 * Render a React Email template to an HTML string.
 */
export async function renderTemplate(
  type: EmailJobPayload['emailType'],
  props: unknown
): Promise<string> {
  const Template = getTemplate(type)
  if (!Template) {
    throw new Error(`[email] No template registered for type: ${type}`)
  }

  const element = React.createElement(Template as React.ComponentType<any>, props as any)
  const html = await render(element as React.ReactElement)
  return html
}
