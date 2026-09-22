/* eslint-disable */
// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 120; // 2 minutes cache

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createAdminClient();

    const [{ data: testimonials, error }, { count }, { data: allRatings }] =
      await Promise.all([
        supabase
          .from("reviews")
          .select(
            "id, rating, title, body, customer_name, is_verified_purchase, created_at, image_urls, order_type",
          )
          .eq("status", "approved")
          .order("rating", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("reviews")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved"),
        supabase.from("reviews").select("rating").eq("status", "approved"),
      ]);

    if (error) throw error;

    const avg_rating =
      allRatings && allRatings.length > 0
        ? Math.round(
            (allRatings.reduce(
              (sum: number, r: { rating: number }) => sum + r.rating,
              0,
            ) /
              allRatings.length) *
              10,
          ) / 10
        : 0;

    return NextResponse.json(
      { testimonials, count: count ?? 0, avg_rating },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      },
    );
  } catch (err: any) {
    console.error("Fetch testimonials error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
