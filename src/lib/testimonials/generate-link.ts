import "server-only";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export interface GenerateLinkOptions {
  orderId: string;
  orderType: "shop" | "custom_order";
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  productName?: string | null;
  expiryDays?: number;
}

export interface GenerateLinkResult {
  token: string;
  url: string;
  whatsappUrl: string | null;
}

/**
 * Generates a secure testimonial link token, stores it in review_links with
 * customer prefill data, and returns a WhatsApp share URL if a phone is provided.
 *
 * The link is multi-use — it is never marked as used after submission.
 * The WhatsApp message body is configurable via business_settings.testimonial_whatsapp_template.
 */
export async function generateTestimonialLink(
  opts: GenerateLinkOptions,
): Promise<GenerateLinkResult> {
  const supabase = await createAdminClient();

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (opts.expiryDays ?? 90));

  const { error } = await supabase.from("review_links").insert({
    token,
    order_type: opts.orderType,
    order_id: opts.orderId,
    expires_at: expiresAt.toISOString(),
    customer_name: opts.customerName ?? null,
    customer_email: opts.customerEmail ?? null,
    customer_phone: opts.customerPhone ?? null,
    product_name: opts.productName ?? null,
    // is_used stays false — multi-use allowed
  });

  if (error) throw new Error(error.message);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const url = `${baseUrl}/review/${token}`;

  let whatsappUrl: string | null = null;
  if (opts.customerPhone) {
    // Fetch configurable template from business_settings
    const { data: settings } = await supabase
      .from("business_settings")
      .select("testimonial_whatsapp_template")
      .limit(1)
      .maybeSingle();

    const template =
      (settings as { testimonial_whatsapp_template?: string | null } | null)
        ?.testimonial_whatsapp_template ??
      `Hi {{name}}! 🙏 We're so glad you chose FLUX3D. Would love to hear your experience — share your testimonial here (takes 2 mins): {{url}}`;

    const message = template
      .replace(/\{\{name\}\}/g, opts.customerName ?? "there")
      .replace(/\{\{url\}\}/g, url);

    // Normalise phone: strip non-digits, prepend 91 if not already there
    const digits = opts.customerPhone.replace(/\D/g, "");
    const phoneWithCC = digits.startsWith("91") ? digits : `91${digits}`;
    whatsappUrl = `https://wa.me/${phoneWithCC}?text=${encodeURIComponent(message)}`;
  }

  return { token, url, whatsappUrl };
}
