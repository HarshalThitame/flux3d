import { getAdminCustomersData } from '@/lib/admin/queries'
import { CUSTOMER_PAGE_SIZE } from '@/hooks/useAdminCustomers'
import CustomersClient from './CustomersClient'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const { customers, total } = await getAdminCustomersData(1, CUSTOMER_PAGE_SIZE)
  return <CustomersClient initialCustomers={customers} initialTotal={total} />
}
