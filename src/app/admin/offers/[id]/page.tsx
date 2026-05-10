'use client'

import { use } from 'react'
import OfferFormPage from '@/components/admin/offers/OfferFormPage'

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <OfferFormPage offerId={id} />
}
