import { redirect } from 'next/navigation'

type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams
  const filter = typeof params.filter === 'string' ? `?filter=${encodeURIComponent(params.filter)}` : ''

  redirect(`/my-orders${filter}`)
}
