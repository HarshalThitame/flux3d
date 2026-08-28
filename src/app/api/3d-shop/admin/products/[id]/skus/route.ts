import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { invalidateShopDataCache } from "@/lib/shop/public-data";
import { stableStringify } from "@/lib/shop/admin-types";

type SkuPayload = {
  id?: string;
  sku_code?: string;
  variant_combination?: Record<string, string | boolean>;
  price?: number | string;
  compare_at_price?: number | string | null;
  cost_price?: number | string | null;
  status?: string | null;
  stock_quantity?: number | string;
  low_stock_threshold?: number | string | null;
  weight_grams?: number | string | null;
  variant_image_url?: string | null;
  model_url?: string | null;
  is_available?: boolean;
  barcode?: string | null;
  qr_url?: string | null;
};

function normalizeSkuPatch(body: SkuPayload) {
  return {
    ...(Number.isFinite(Number(body.price))
      ? { price: Number(body.price) }
      : {}),
    compare_at_price:
      body.compare_at_price === null ||
      body.compare_at_price === undefined ||
      body.compare_at_price === ""
        ? null
        : Number(body.compare_at_price),
    cost_price:
      body.cost_price === null ||
      body.cost_price === undefined ||
      body.cost_price === ""
        ? null
        : Number(body.cost_price),
    status:
      typeof body.status === "string" && body.status.trim()
        ? body.status.trim()
        : null,
    ...(Number.isFinite(Number(body.stock_quantity))
      ? { stock_quantity: Number(body.stock_quantity) }
      : {}),
    low_stock_threshold:
      body.low_stock_threshold === null ||
      body.low_stock_threshold === undefined
        ? 5
        : Number(body.low_stock_threshold),
    weight_grams:
      body.weight_grams === null ||
      body.weight_grams === undefined ||
      body.weight_grams === ""
        ? null
        : Number(body.weight_grams),
    variant_image_url:
      typeof body.variant_image_url === "string"
        ? body.variant_image_url.trim() || null
        : (body.variant_image_url ?? null),
    model_url:
      typeof body.model_url === "string"
        ? body.model_url.trim() || null
        : (body.model_url ?? null),
    ...(typeof body.is_available === "boolean"
      ? { is_available: body.is_available }
      : {}),
    barcode:
      typeof body.barcode === "string"
        ? body.barcode.trim() || null
        : (body.barcode ?? null),
    qr_url:
      typeof body.qr_url === "string"
        ? body.qr_url.trim() || null
        : (body.qr_url ?? null),
  };
}

async function updateProductBasePrice(productId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("shelf_skus")
    .select("price")
    .eq("product_id", productId)
    .eq("is_available", true)
    .order("price", { ascending: true })
    .limit(1);

  if (error) throw new Error(error.message);
  const minPrice = data?.[0]?.price;
  if (typeof minPrice !== "number") return;

  const { error: updateError } = await supabase
    .from("shelf_products")
    .update({ base_price: minPrice })
    .eq("id", productId);

  if (updateError) throw new Error(updateError.message);
}

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
      .from("shelf_skus")
      .select("*")
      .eq("product_id", id)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ skus: data ?? [] });
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
    const body = (await request.json()) as { skus?: SkuPayload[] };
    const incoming = Array.isArray(body.skus) ? body.skus : [];

    if (incoming.length === 0) {
      return NextResponse.json(
        { error: "At least one SKU is required." },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();
    const { data: existing, error: existingError } = await supabase
      .from("shelf_skus")
      .select("variant_combination")
      .eq("product_id", id);

    if (existingError) throw new Error(existingError.message);

    const existingKeys = new Set(
      (existing ?? []).map((sku) =>
        stableStringify(
          (sku.variant_combination ?? {}) as Record<string, unknown>,
        ),
      ),
    );

    const rows = incoming
      .filter((sku) => {
        const key = stableStringify(
          (sku.variant_combination ?? {}) as Record<string, unknown>,
        );
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      })
      .map((sku, index) => ({
        product_id: id,
        ...(typeof sku.id === "string" ? { id: sku.id } : {}),
        sku_code:
          sku.sku_code ||
          `SHOP-${id.slice(0, 8).toUpperCase()}-${Date.now()}-${index + 1}`,
        variant_combination: sku.variant_combination ?? {},
        price: Number.isFinite(Number(sku.price)) ? Number(sku.price) : 0,
        compare_at_price: sku.compare_at_price ?? null,
        stock_quantity: Number.isFinite(Number(sku.stock_quantity))
          ? Number(sku.stock_quantity)
          : 0,
        low_stock_threshold: Number.isFinite(Number(sku.low_stock_threshold))
          ? Number(sku.low_stock_threshold)
          : 5,
        weight_grams: sku.weight_grams ?? null,
        variant_image_url: sku.variant_image_url ?? null,
        model_url:
          typeof sku.model_url === "string"
            ? sku.model_url.trim() || null
            : null,
        is_available: sku.is_available ?? true,
        cost_price: sku.cost_price ?? null,
        status:
          typeof sku.status === "string" && sku.status.trim()
            ? sku.status.trim()
            : null,
        barcode:
          typeof sku.barcode === "string" ? sku.barcode.trim() || null : null,
        qr_url:
          typeof sku.qr_url === "string" ? sku.qr_url.trim() || null : null,
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from("shelf_skus").insert(rows);
      if (error) throw new Error(error.message);
      await updateProductBasePrice(id);
      invalidateShopDataCache();
    }

    const { data: skus, error: skusError } = await supabase
      .from("shelf_skus")
      .select("*")
      .eq("product_id", id)
      .order("created_at", { ascending: true });

    if (skusError) throw new Error(skusError.message);
    return NextResponse.json(
      {
        skus: skus ?? [],
        inserted: rows.length,
        skipped: incoming.length - rows.length,
      },
      { status: 201 },
    );
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
    const body = (await request.json()) as SkuPayload;
    if (!body.id)
      return NextResponse.json(
        { error: "SKU id is required." },
        { status: 400 },
      );

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("shelf_skus")
      .update(normalizeSkuPatch(body))
      .eq("product_id", id)
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    await updateProductBasePrice(id);
    invalidateShopDataCache();
    return NextResponse.json({ sku: data });
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
    const skuId = searchParams.get("id");
    if (!skuId)
      return NextResponse.json(
        { error: "SKU id is required." },
        { status: 400 },
      );

    const supabase = createAdminSupabaseClient();

    const { data: checkData, error: checkError } = await supabase.rpc(
      "can_delete_sku",
      {
        p_sku_id: skuId,
      },
    );
    if (checkError) throw new Error(checkError.message);

    const check = Array.isArray(checkData) ? checkData[0] : undefined;
    if (check && check.can_delete === false) {
      return NextResponse.json(
        {
          error:
            check.reason ||
            "This SKU cannot be deleted because it is tied to orders.",
        },
        { status: 409 },
      );
    }

    const { error } = await supabase
      .from("shelf_skus")
      .delete()
      .eq("product_id", id)
      .eq("id", skuId);
    if (error) throw new Error(error.message);
    await updateProductBasePrice(id);
    invalidateShopDataCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
