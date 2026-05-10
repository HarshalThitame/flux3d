'use client'

import { use } from 'react'
import CouponFormPage from '@/components/admin/offers/CouponFormPage'

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <CouponFormPage couponId={id} />
}
