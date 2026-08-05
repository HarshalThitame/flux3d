import StockWorkspace from '@/app/admin/3d-shop/stock/StockWorkspace'

export const metadata = {
  title: '3D Shop Stock | Flux3D Admin',
  description: 'Manage 3D Shop SKU inventory, stock movements, reservations, and low-stock alerts.',
}

export default function AdminStockPage() {
  return <StockWorkspace />
}
