import { redirect } from 'next/navigation'

export default async function AdminShopProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/admin/3d-shop/products/${id}/edit`)
}
