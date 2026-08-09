import { redirect } from 'next/navigation'

export default function OffersRedirectPage() {
  redirect('/admin/promotions?tab=offers')
}