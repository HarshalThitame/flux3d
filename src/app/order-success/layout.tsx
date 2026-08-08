import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Order Placed | Flux3D',
  description: 'Your Flux3D order has been placed successfully.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function OrderSuccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
