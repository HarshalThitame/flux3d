import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/server";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { generateTestimonialLink } from "@/lib/testimonials/generate-link";
import { getGuestContact } from "@/lib/shop/orders";

type Params = { orderId: string };

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    await requireAdminUser();
    const { orderId } = await params;
    const supabase = createAdminSupabaseClient();

    // Fetch the shop order — items are stored as a JSON column in shelf_orders
    const { data: order, error: orderError } = await supabase
      .from("shelf_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const row = order as Record<string, unknown>;

    // Resolve customer — profile first, then fallback to shipping/guest data
    let customerName: string | null = null;
    let customerEmail: string | null = null;
    let customerPhone: string | null = null;

    if (row.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone_number")
        .eq("id", String(row.user_id))
        .maybeSingle();

      const p = profile as ProfileRow | null;
      customerName = p?.full_name ?? null;
      customerEmail = p?.email ?? null;
      customerPhone = p?.phone_number ?? null;
    }

    // Fall back to shipping address / guest contact
    const addr =
      row.shipping_address && typeof row.shipping_address === "object"
        ? (row.shipping_address as Record<string, unknown>)
        : {};
    const guestContact = getGuestContact(row);

    if (!customerName && addr.name) customerName = String(addr.name);
    if (!customerEmail) customerEmail = guestContact.email;
    if (!customerPhone && addr.phone) customerPhone = String(addr.phone);

    // Get first product name from the items JSON column
    type ItemRow = { productName?: string };
    const items = Array.isArray(row.items) ? (row.items as ItemRow[]) : [];
    const productName = items[0]?.productName ?? null;

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
