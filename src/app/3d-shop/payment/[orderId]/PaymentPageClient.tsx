'use client'

import type { ReactNode } from 'react'
import { useShopCartStore } from '@/stores/shopCartStore'
import RazorpayCheckoutClient from '@/components/payments/RazorpayCheckoutClient'

type PaymentTheme = {
  accent: string
  accentFaint: string
  accentBorder: string
  accentText: string
  buttonBg: string
  buttonHoverBg: string
  buttonShadow: string
  containerBorder: string
  containerBg: string
  containerRadius: string
}

export default function PaymentPageClient({
  orderId,
  createOrderEndpoint,
  verifyEndpoint,
  statusEndpoint,
  successHref,
  orderNumber,
  amountPaise,
  currency,
  title,
  subtitle,
  supportEmail,
  supportPhone,
  customer,
  orderSummary,
  themeColor,
  theme,
  authHeaders,
}: {
  orderId: string
  createOrderEndpoint: string
  verifyEndpoint: string
  statusEndpoint: string
  successHref: string
  orderNumber: string
  amountPaise: number
  currency: string
  title: string
  subtitle: string
  supportEmail: string
  supportPhone: string
  customer: { name: string; email: string; contact: string }
  orderSummary: ReactNode
  themeColor?: string
  theme?: Partial<PaymentTheme>
  /** Extra headers (e.g. guest order access token) forwarded to the payment APIs. */
  authHeaders?: Record<string, string>
}) {
  const clearCart = useShopCartStore((state) => state.clearCart)

  return (
    <RazorpayCheckoutClient
      internalOrderType="shop_order"
      internalOrderId={orderId}
      createOrderEndpoint={createOrderEndpoint}
      verifyEndpoint={verifyEndpoint}
      statusEndpoint={statusEndpoint}
      successHref={successHref}
      orderNumber={orderNumber}
      amountPaise={amountPaise}
      currency={currency}
      title={title}
      subtitle={subtitle}
      supportEmail={supportEmail}
      supportPhone={supportPhone}
      customer={customer}
      orderSummary={orderSummary}
      onSuccessAction={clearCart}
      themeColor={themeColor}
      theme={theme}
      authHeaders={authHeaders}
    />
  )
}
