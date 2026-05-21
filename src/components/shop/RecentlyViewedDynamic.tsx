'use client'

import dynamic from 'next/dynamic'

const RecentlyViewedRow = dynamic(() => import('@/components/shop/RecentlyViewedRow'), {
  ssr: false,
})

export default function RecentlyViewedDynamic() {
  return <RecentlyViewedRow />
}
