import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { token: string };

/**
 * Public endpoint — no auth required.
 * The 32-byte hex token is the secret. Returns only safe prefill fields.
 * Phone number is intentionally NOT returned (server-only, used for WhatsApp only).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const { token } = await params;

    if (!token || token.length < 32) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    const { data: link, error } = await supabase
      .from("review_links")
      .select(
        "order_type, customer_name, customer_email, product_name, expires_at",
      )
      .eq("token", token)
      .maybeSingle();

    if (error || !link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const expired = new Date(link.expires_at) < new Date();

    return NextResponse.json({
      order_type: link.order_type,
      customer_name: link.customer_name ?? null,
      customer_email: link.customer_email ?? null,
      product_name: link.product_name ?? null,
      expired,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Testimonial prefill error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
