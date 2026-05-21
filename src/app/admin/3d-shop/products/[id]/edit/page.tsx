import ShopProductEditor from '@/app/admin/3d-shop/_components/ShopProductEditor'

export default async function AdminShopEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ShopProductEditor mode="edit" productId={id} />
}
