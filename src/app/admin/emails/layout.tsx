import { requireAdminUser } from '@/lib/admin/server'
import EmailTabs from '@/components/admin/emails/EmailTabs'

export default async function EmailsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminUser()

  return (
    <div>
      <EmailTabs />
      {children}
    </div>
  )
}
