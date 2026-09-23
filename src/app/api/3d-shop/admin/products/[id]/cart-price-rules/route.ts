import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { logAdminAction } from "@/lib/admin/auditLog";
import { invalidateShopDataCache } from "@/lib/shop/public-data";

type Payload = {
  id?: string;
  name?: string;
  adjustment_type?: "percentage" | "fixed_amount";
  direction?: "increase" | "decrease";
  adjustment_value?: number | string;
  min_unit_price?: number | string;
  priority?: number | string;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
};

function dateValue(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime()))
    throw new Error("A rule schedule date is invalid.");
  return new Date(value).toISOString();
}

function normalize(body: Payload, partial = false) {
  const record = body as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const adjustmentType = body.adjustment_type;
  const direction = body.direction;
  const value = Number(body.adjustment_value);
  const minimum = Number(body.min_unit_price);
  const priority = Number(body.priority);
  if (!partial) {
    if (!name) throw new Error("Rule name is required.");
    if (adjustmentType !== "percentage" && adjustmentType !== "fixed_amount")
      throw new Error("Adjustment type is invalid.");
    if (direction !== "increase" && direction !== "decrease")
      throw new Error("Adjustment direction is invalid.");
    if (!Number.isFinite(value) || value <= 0)
      throw new Error("Adjustment value must be greater than zero.");
    if (!Number.isFinite(minimum) || minimum < 0)
      throw new Error("Minimum unit price must be zero or greater.");
    if (!Number.isInteger(priority) || priority < 0)
      throw new Error("Priority must be a non-negative whole number.");
  }
  const next: Record<string, unknown> = {};
  if (record.name !== undefined) next.name = name;
  if (record.adjustment_type !== undefined)
    next.adjustment_type = adjustmentType;
  if (record.direction !== undefined) next.direction = direction;
  if (record.adjustment_value !== undefined) next.adjustment_value = value;
  if (record.min_unit_price !== undefined) next.min_unit_price = minimum;
  if (record.priority !== undefined) next.priority = priority;
  if (record.starts_at !== undefined)
    next.starts_at = dateValue(body.starts_at);
  if (record.ends_at !== undefined) next.ends_at = dateValue(body.ends_at);
  if (record.is_active !== undefined) next.is_active = Boolean(body.is_active);
  const starts = (next.starts_at as string | null | undefined) ?? null;
  const ends = (next.ends_at as string | null | undefined) ?? null;
  if (starts && ends && new Date(ends) <= new Date(starts))
    throw new Error("End time must be after the start time.");
  return next;
}

async function audit(
  userId: string,
  action: string,
  ruleId: string,
  oldValue?: unknown,
  newValue?: unknown,
) {
  await logAdminAction({
    admin_id: userId,
    action,
    target_type: "product_cart_price_rule",
    target_id: ruleId,
    old_value: oldValue,
    new_value: newValue,
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await context.params;
    const { data, error } = await createAdminSupabaseClient()
      .from("shelf_product_cart_price_rules")
      .select("*")
      .eq("product_id", id)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ rules: data ?? [] });
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
    const values = normalize((await request.json()) as Payload);
    const { data, error } = await createAdminSupabaseClient()
      .from("shelf_product_cart_price_rules")
      .insert({ product_id: id, created_by: auth.user.id, ...values })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await audit(auth.user.id, "created", data.id, undefined, data);
    invalidateShopDataCache();
    return NextResponse.json({ rule: data }, { status: 201 });
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
    const { id: productId } = await context.params;
    const body = (await request.json()) as Payload;
    if (!body.id)
      return NextResponse.json(
        { error: "Rule id is required." },
        { status: 400 },
      );
    const supabase = createAdminSupabaseClient();
    const { data: oldRule, error: oldError } = await supabase
      .from("shelf_product_cart_price_rules")
      .select("*")
      .eq("id", body.id)
      .eq("product_id", productId)
      .single();
    if (oldError) throw new Error(oldError.message);
    const { data, error } = await supabase
      .from("shelf_product_cart_price_rules")
      .update(normalize(body, true))
      .eq("id", body.id)
      .eq("product_id", productId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await audit(auth.user.id, "updated", data.id, oldRule, data);
    invalidateShopDataCache();
    return NextResponse.json({ rule: data });
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
    const { id: productId } = await context.params;
    const ruleId = new URL(request.url).searchParams.get("id");
    if (!ruleId)
      return NextResponse.json(
        { error: "Rule id is required." },
        { status: 400 },
      );
    const supabase = createAdminSupabaseClient();
    const { data: oldRule, error: oldError } = await supabase
      .from("shelf_product_cart_price_rules")
      .select("*")
      .eq("id", ruleId)
      .eq("product_id", productId)
      .single();
    if (oldError) throw new Error(oldError.message);
    const { error } = await supabase
      .from("shelf_product_cart_price_rules")
      .delete()
      .eq("id", ruleId)
      .eq("product_id", productId);
    if (error) throw new Error(error.message);
    await audit(auth.user.id, "deleted", ruleId, oldRule);
    invalidateShopDataCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
