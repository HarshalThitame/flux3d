import { createAdminSupabaseClient } from "@/lib/admin/server";
import {
  createRazorpayPaymentLink,
  getRazorpayConfig,
} from "@/lib/payments/razorpay";
import { upsertPaymentAttempt } from "@/lib/payments/repository";
import { makeReceipt } from "@/lib/payments/razorpay";
import { reportError } from "@/lib/error-handling";

export type WhatsappPaymentLinkResult = {
  shortUrl: string;
  paymentAttemptId: string;
};

export async function createWhatsappPaymentLink(params: {
  orderId: string;
  orderNumber: string;
  userId: string;
  amountPaise: number;
  customerName: string;
  customerPhone: string;
}): Promise<WhatsappPaymentLinkResult | null> {
  const config = getRazorpayConfig();
  if (!config?.paymentsEnabled) {
    reportError(
      new Error("Razorpay not configured"),
      "WhatsApp payment-link skipped: Razorpay unavailable",
      {
        level: "warn",
        module: "whatsapp",
      },
    );
    return null;
  }

  if (!Number.isFinite(params.amountPaise) || params.amountPaise <= 0) {
    throw new Error(`Invalid amountPaise: ${params.amountPaise}`);
  }

  const supabase = createAdminSupabaseClient();

  const receipt = makeReceipt("SHOPWA", 1);
  const idempotencyKey = `whatsapp:${params.orderId}:shop_order:1:${params.amountPaise}`;

  const attempt = await upsertPaymentAttempt({
    internal_order_type: "shop_order",
    internal_order_id: params.orderId,
    customer_id: params.userId,
    provider: "razorpay",
    payment_purpose: "shop_order",
    provider_order_id: null,
    provider_payment_id: null,
    amount_paise: params.amountPaise,
    currency: "INR",
    status: "created",
    attempt_number: 1,
    idempotency_key: idempotencyKey,
    receipt,
    failure_code: null,
    failure_description: null,
    payment_method: null,
    captured_at: null,
    failed_at: null,
    metadata: { source: "whatsapp", order_number: params.orderNumber },
  });

  let link;
  try {
    link = await createRazorpayPaymentLink({
      amountPaise: params.amountPaise,
      currency: "INR",
      customer: {
        name: params.customerName.slice(0, 80),
        contact: params.customerPhone.replace(/\D/g, "").slice(-10),
      },
      referenceId: `SHOPWA-${params.orderNumber.replace(/[^A-Za-z0-9-]/g, "").slice(-14)}`,
      description: `Flux3D order ${params.orderNumber}`,
      notes: {
        internal_order_id: params.orderId,
        internal_order_type: "shop_order",
        payment_attempt_id: attempt.id,
        order_number: params.orderNumber,
        source: "whatsapp",
      },
    });
  } catch (err) {
    reportError(err, "Razorpay payment-link creation failed", {
      level: "error",
      module: "whatsapp",
      tags: { orderId: params.orderId },
      metadata: {
        amountPaise: params.amountPaise,
        orderNumber: params.orderNumber,
      },
    });
    throw new Error(
      `Razorpay payment-link creation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Link the Razorpay order id so the existing payment webhook can resolve this attempt.
  try {
    await supabase
      .from("payment_attempts")
      .update({
        provider_order_id: link.order_id,
        status: "pending",
        metadata: {
          ...attempt.metadata,
          payment_link_id: link.id,
          payment_link: link,
        },
      })
      .eq("id", attempt.id);
  } catch (err) {
    reportError(
      err,
      "Failed to link payment attempt after Razorpay link creation",
      {
        level: "warn",
        module: "whatsapp",
        tags: { attemptId: attempt.id },
      },
    );
  }

  try {
    await supabase
      .from("shelf_orders")
      .update({
        payment_attempt_id: attempt.id,
        provider_order_id: link.order_id,
        payment_provider: "razorpay",
        payment_status: "pending",
      })
      .eq("id", params.orderId);
  } catch (err) {
    reportError(
      err,
      "Failed to link order payment fields after Razorpay link creation",
      {
        level: "warn",
        module: "whatsapp",
        tags: { orderId: params.orderId },
      },
    );
  }

  return { shortUrl: link.short_url, paymentAttemptId: attempt.id };
}
