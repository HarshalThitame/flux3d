import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/server";
import { generateTestimonialLink } from "@/lib/testimonials/generate-link";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { orderId: string };

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    await requireAdminUser();
    const { orderId } = await params;

    const supabase = await createAdminClient();

    // Fetch the shop order with customer profile data
    const { data: order, error: orderError } = await supabase
      .from("shelf_orders")
      .select(
        `
        id,
        user_id,
        shipping_address,
        guest_contact,
        items:shelf_order_items(
          product:shelf_products(title)
        )
      `,
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Resolve customer data — profile first, fall back to shipping address / guest contact
    let customerName: string | null = null;
    let customerEmail: string | null = null;
    let customerPhone: string | null = null;

    if (order.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone_number")
        .eq("id", order.user_id)
        .maybeSingle();

      customerName =
        (profile as { full_name?: string | null } | null)?.full_name ?? null;
      customerEmail =
        (profile as { email?: string | null } | null)?.email ?? null;
      customerPhone =
        (profile as { phone_number?: string | null } | null)?.phone_number ??
        null;
    }

    // Fall back to shipping address fields
    const addr = (order.shipping_address ?? {}) as Record<string, unknown>;
    const guest = (order.guest_contact ?? {}) as Record<string, unknown>;

    if (!customerName && addr.name) customerName = String(addr.name);
    if (!customerEmail && guest.email) customerEmail = String(guest.email);
    if (!customerPhone && addr.phone) customerPhone = String(addr.phone);

    // Get first product name
    const items =
      (order as { items?: Array<{ product?: { title?: string } }> }).items ??
      [];
    const productName = items[0]?.product?.title ?? null;

    const result = await generateTestimonialLink({
      orderId,
      orderType: "shop",
      customerName,
      customerEmail,
      customerPhone,
      productName,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Shop testimonial link error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
