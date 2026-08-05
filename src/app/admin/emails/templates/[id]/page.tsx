import { redirect } from 'next/navigation'

export default async function EmailTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/admin/emails/templates/${id}/edit`)
}
