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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      tier_name: string;
      price: number | string;
    };
    if (
      !SKU_TIER_NAMES.includes(
        body.tier_name as (typeof SKU_TIER_NAMES)[number],
      )
    ) {
      return NextResponse.json(
        { error: `tier_name must be one of ${SKU_TIER_NAMES.join(", ")}.` },
        { status: 400 },
      );
    }
    if (!Number.isFinite(Number(body.price))) {
      return NextResponse.json(
        { error: "price must be a valid number." },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("shelf_sku_tier_prices")
      .upsert(
        {
          sku_id: id,
          tier_name: body.tier_name,
          price: Number(body.price),
        },
        { onConflict: "sku_id,tier_name" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ tier_price: data });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      id: string;
      tier_name?: string;
      price?: number | string;
    };
    if (!body.id) {
      return NextResponse.json(
        { error: "tier_price id is required." },
        { status: 400 },
      );
    }
    if (body.tier_name !== undefined) {
      if (
        !SKU_TIER_NAMES.includes(
          body.tier_name as (typeof SKU_TIER_NAMES)[number],
        )
      ) {
        return NextResponse.json(
          { error: `tier_name must be one of ${SKU_TIER_NAMES.join(", ")}.` },
          { status: 400 },
        );
      }
    }
    if (body.price !== undefined && !Number.isFinite(Number(body.price))) {
      return NextResponse.json(
        { error: "price must be a valid number." },
        { status: 400 },
      );
    }

    const patch: Record<string, unknown> = {};
    if (body.tier_name !== undefined) patch.tier_name = body.tier_name;
    if (body.price !== undefined) patch.price = Number(body.price);

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("shelf_sku_tier_prices")
      .update(patch)
      .eq("id", body.id)
      .eq("sku_id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ tier_price: data });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const tierPriceId = searchParams.get("id");
    if (!tierPriceId) {
      return NextResponse.json(
        { error: "tier_price id query param is required." },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("shelf_sku_tier_prices")
      .delete()
      .eq("id", tierPriceId)
      .eq("sku_id", id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
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

    // Atomic upsert on (sku_id, tier_name), then remove any rows for this SKU
    // that are no longer in the submitted set. No delete-then-insert window,
    // so tier prices can never be lost if a subsequent step fails.
    if (normalized.length > 0) {
      const { error: upsertError } = await supabase
        .from("shelf_sku_tier_prices")
        .upsert(normalized, { onConflict: "sku_id,tier_name" });
      if (upsertError) throw new Error(upsertError.message);
    }

    const submittedNames = normalized.map((tier) => tier.tier_name);
    if (submittedNames.length > 0) {
      const { error: cleanupError } = await supabase
        .from("shelf_sku_tier_prices")
        .delete()
        .eq("sku_id", id)
        .not("tier_name", "in", submittedNames);
      if (cleanupError) throw new Error(cleanupError.message);
    } else {
      const { error: clearError } = await supabase
        .from("shelf_sku_tier_prices")
        .delete()
        .eq("sku_id", id);
      if (clearError) throw new Error(clearError.message);
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
