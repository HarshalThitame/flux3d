import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/server";
import { generateTestimonialLink } from "@/lib/testimonials/generate-link";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { id: string };

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const auth = await requireAdminUser();
    const { id: orderId } = await params;

    const supabase = await createAdminClient();

    // Fetch OMS order with customer data
    const { data: order, error: orderError } = await supabase
      .from("oms_orders")
      .select(
        `
        id,
        customers (
          full_name,
          email,
          phone
        )
      `,
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    type CustomerData = {
      full_name?: string | null;
      email?: string | null;
      phone?: string | null;
    };
    const cust = (order as { customers?: CustomerData | null }).customers ?? {};

    const result = await generateTestimonialLink({
      orderId,
      orderType: "custom_order",
      createdByAdminId: auth.user.id,
      customerName: cust.full_name ?? null,
      customerEmail: cust.email ?? null,
      customerPhone: cust.phone ?? null,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("OMS testimonial link error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
