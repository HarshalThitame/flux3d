import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'My Orders | Flux3D',
  robots: {
    index: false,
    follow: false,
  },
}

type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams
  const filter = typeof params.filter === 'string' ? `?filter=${encodeURIComponent(params.filter)}` : ''

  redirect(`/my-orders${filter}`)
}
