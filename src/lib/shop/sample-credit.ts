import "server-only";

import { createAdminSupabaseClient } from "@/lib/admin/server";

/**
 * Issues one credit for a paid Invitation Studio sample. The database function
 * locks the order and makes the operation idempotent for checkout and webhook
 * retries.
 */
export async function issueInvitationSampleCredit(orderId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("issue_invitation_sample_credit", {
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message);
  const result =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return {
    issued: result.issued === true,
    code: typeof result.code === "string" ? result.code : null,
  };
}

/** Captures previously reserved automatic credits once the payment is final. */
export async function captureInvitationSampleCredits(orderId: string) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc("capture_invitation_sample_credits", {
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message);
}
