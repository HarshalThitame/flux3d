import type { Metadata } from 'next'
import ShippingPolicyClient from '../shipping-policy/ShippingPolicyClient'

export function generateMetadata(): Metadata {
  return {
    title: 'Shipping & Delivery Policy',
    description: 'Read how Flux3D handles production timelines, shipping methods, delivery coverage, tracking, and damaged shipment support.',
    alternates: { canonical: '/service-delivery-policy' },
    openGraph: {
      title: 'Shipping & Delivery Policy',
      description: 'Read how Flux3D handles production timelines, shipping methods, delivery coverage, tracking, and damaged shipment support.',
      url: 'https://flux3d.in/service-delivery-policy',
      type: 'website',
    },
    twitter: {
      title: 'Shipping & Delivery Policy',
      description: 'Read how Flux3D handles production timelines, shipping methods, delivery coverage, tracking, and damaged shipment support.',
    },
  }
}

export default function ServiceDeliveryPolicyPage() {
  return <ShippingPolicyClient />
}
