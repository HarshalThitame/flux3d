import { getAdminUsersData } from '@/lib/admin/queries'
import CustomersClient from './CustomersClient'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const customers = await getAdminUsersData()
  return <CustomersClient initialCustomers={customers} />
}
