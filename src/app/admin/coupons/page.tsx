import { redirect } from 'next/navigation'

export default function CouponsRedirectPage() {
  redirect('/admin/promotions?tab=coupons')
}