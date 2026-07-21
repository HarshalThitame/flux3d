import nodemailer from 'nodemailer'
import type { BusinessSettings } from '@/lib/admin/business-settings'

export type EmailPayload = {
  to: string
  subject: string
  text?: string
  html?: string
  from?: string
}

let cachedTransport: nodemailer.Transporter | null = null

function buildTransport(settings: BusinessSettings) {
  if (!settings.smtpHost || !settings.smtpPort) return null
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth: settings.smtpUsername && settings.smtpPassword
      ? { user: settings.smtpUsername, pass: settings.smtpPassword }
      : undefined,
  })
}

export async function getTransport(settings: BusinessSettings) {
  if (cachedTransport) return cachedTransport
  cachedTransport = buildTransport(settings)
  return cachedTransport
}

export function clearTransportCache() {
  cachedTransport = null
}

export async function sendEmail(settings: BusinessSettings, payload: EmailPayload) {
  const transport = await getTransport(settings)
  if (!transport) {
    console.warn('[email] SMTP not configured — email not sent')
    return { sent: false, reason: 'smtp_not_configured' }
  }

  try {
    const info = await transport.sendMail({
      from: payload.from || `"${settings.smtpSenderName || settings.businessName || 'Flux3D'}" <${settings.smtpSenderEmail || settings.primaryEmail || 'noreply@flux3d.in'}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    })
    return { sent: true, messageId: info.messageId }
  } catch (error) {
    console.error('[email] Failed to send:', error)
    return { sent: false, reason: error instanceof Error ? error.message : 'unknown_error' }
  }
}

export async function sendOrderConfirmation(settings: BusinessSettings, params: {
  to: string
  orderNumber: string
  customerName: string
  total: string
  items: string
}) {
  const subject = `Order ${params.orderNumber} confirmed — ${settings.businessName || 'Flux3D'}`
  const text = [
    `Hi ${params.customerName},`,
    `Your order ${params.orderNumber} has been confirmed.`,
    `Total: ${params.total}`,
    `Items: ${params.items}`,
    '',
    `Thanks for choosing ${settings.businessName || 'Flux3D'}.`,
    settings.websiteUrl ? `\n${settings.websiteUrl}` : '',
  ].filter(Boolean).join('\n')

  return sendEmail(settings, { to: params.to, subject, text })
}

export async function sendContactNotification(settings: BusinessSettings, params: {
  name: string
  email: string
  phone: string
  message: string
}) {
  const supportEmail = settings.supportEmail || settings.primaryEmail || ''
  if (!supportEmail) return { sent: false, reason: 'no_support_email' }

  const subject = `New contact form submission from ${params.name}`
  const text = [
    `Name: ${params.name}`,
    `Email: ${params.email}`,
    `Phone: ${params.phone}`,
    `Message: ${params.message}`,
  ].join('\n')

  return sendEmail(settings, { to: supportEmail, subject, text })
}
