import { requireAdminUser } from '@/lib/admin/server'
import TemplateEditor from '@/components/admin/emails/TemplateEditor'

export const dynamic = 'force-dynamic'

export default async function NewTemplatePage() {
  await requireAdminUser()
  return <TemplateEditor />
}
