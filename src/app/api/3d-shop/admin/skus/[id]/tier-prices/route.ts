import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { SKU_TIER_NAMES } from "@/lib/shop/admin-types";

type TierPayload = {
  tier_prices: { tier_name: string; price: number | string }[];
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("shelf_sku_tier_prices")
      .select("*")
      .eq("sku_id", id)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ tier_prices: data ?? [] });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as TierPayload;
    if (!Array.isArray(body.tier_prices))
      return NextResponse.json(
        { error: "tier_prices array is required." },
        { status: 400 },
      );

    const supabase = createAdminSupabaseClient();

    // Prune any tier rows for SKUs that are no longer listed.
    const { error: pruneError } = await supabase
      .from("shelf_sku_tier_prices")
      .delete()
      .eq("sku_id", id)
      .not("tier_name", "in", `(${SKU_TIER_NAMES.join(",")})`);
    if (pruneError) throw new Error(pruneError.message);

    const normalized = body.tier_prices
      .filter((tier) =>
        SKU_TIER_NAMES.includes(
          tier.tier_name as (typeof SKU_TIER_NAMES)[number],
        ),
      )
      .map((tier) => ({
        sku_id: id,
        tier_name: tier.tier_name as (typeof SKU_TIER_NAMES)[number],
        price: Number.isFinite(Number(tier.price)) ? Number(tier.price) : 0,
      }));

    // Upsert via delete + insert to keep behavior simple and atomic enough.
    const { error: deleteError } = await supabase
      .from("shelf_sku_tier_prices")
      .delete()
      .eq("sku_id", id);
    if (deleteError) throw new Error(deleteError.message);

    if (normalized.length > 0) {
      const { error: insertError } = await supabase
        .from("shelf_sku_tier_prices")
        .insert(normalized);
      if (insertError) throw new Error(insertError.message);
    }

    const { data, error } = await supabase
      .from("shelf_sku_tier_prices")
      .select("*")
      .eq("sku_id", id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return NextResponse.json({ tier_prices: data ?? [] });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
