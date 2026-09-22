import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/testimonials
 * Returns all reviews (any status) for admin moderation.
 * Service-role client bypasses RLS that limits anon to approved-only.
 */
export async function GET() {
  try {
    await requireAdminUser();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("reviews")
      .select(
        "id, order_type, order_id, customer_name, customer_email, rating, title, body, status, is_verified_purchase, created_at, image_urls",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ reviews: data ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Admin testimonials fetch error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/testimonials
 * Update testimonial status: { id, status: 'approved'|'rejected'|'pending' }
 */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdminUser();
    const { id, status } = (await req.json()) as { id: string; status: string };

    if (!id || !["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("reviews")
      .update({ status })
      .eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
