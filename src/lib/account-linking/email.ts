import { enqueueEmail } from '@/lib/email/producer'
import type { EmailJobPayload } from '@/lib/email/types'

/**
 * Enqueue the account-link magic-link email.
 *
 * The confirm URL must already contain the raw `token` (single-use). This
 * function only touches the email layer; token creation is handled by
 * link-requests.ts.
 */
export async function enqueueAccountLinkEmail(params: {
  userId: string
  email: string
  customerName: string
  confirmUrl: string
  orderCount: number
}): Promise<{ logId: string; messageId?: string; blocked?: boolean; reason?: string }> {
  return enqueueEmail({
    emailType: 'account_link_confirmation',
    userId: params.userId,
    recipient: params.email,
    customerName: params.customerName,
    confirmUrl: params.confirmUrl,
    orderCount: params.orderCount,
  } as EmailJobPayload)
}
