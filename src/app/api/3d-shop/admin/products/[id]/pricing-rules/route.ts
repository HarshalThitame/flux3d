import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";

type PricingRulePayload = {
  id?: string;
  name?: string;
  rule_type?: "fixed_add" | "percent_add" | "fixed_override" | "multiply";
  conditions?: Record<string, string | string[] | boolean>;
  value?: number | string;
  priority?: number | string;
  is_active?: boolean;
};

function normalizeRulePayload(
  body: PricingRulePayload,
  partial = false,
): Record<string, unknown> {
  if (!partial) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const ruleType = body.rule_type;
    if (!name) throw new Error("Rule name is required.");
    if (
      !ruleType ||
      !["fixed_add", "percent_add", "fixed_override", "multiply"].includes(
        ruleType,
      )
    ) {
      throw new Error("Rule type is invalid.");
    }
    return {
      name,
      rule_type: ruleType,
      conditions: body.conditions ?? {},
      value: Number.isFinite(Number(body.value)) ? Number(body.value) : 0,
      priority: Number.isFinite(Number(body.priority))
        ? Number(body.priority)
        : 0,
      is_active: body.is_active ?? true,
    };
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) throw new Error("Rule name cannot be empty.");
    patch.name = name;
  }
  if (body.rule_type !== undefined) {
    if (
      !["fixed_add", "percent_add", "fixed_override", "multiply"].includes(
        body.rule_type,
      )
    ) {
      throw new Error("Rule type is invalid.");
    }
    patch.rule_type = body.rule_type;
  }
  if (body.conditions !== undefined) patch.conditions = body.conditions;
  if (body.value !== undefined) {
    patch.value = Number.isFinite(Number(body.value)) ? Number(body.value) : 0;
  }
  if (body.priority !== undefined) {
    patch.priority = Number.isFinite(Number(body.priority))
      ? Number(body.priority)
      : 0;
  }
  if (body.is_active !== undefined) patch.is_active = body.is_active;
  return patch;
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
      .from("shelf_sku_pricing_rules")
      .select("*")
      .eq("product_id", id)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });

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
    const body = (await request.json()) as PricingRulePayload;
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("shelf_sku_pricing_rules")
      .insert({ product_id: id, ...normalizeRulePayload(body) })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
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
    const { id } = await context.params;
    const body = (await request.json()) as PricingRulePayload;
    if (!body.id)
      return NextResponse.json(
        { error: "Rule id is required." },
        { status: 400 },
      );

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("shelf_sku_pricing_rules")
      .update(normalizeRulePayload(body, true))
      .eq("product_id", id)
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
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
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("id");
    if (!ruleId)
      return NextResponse.json(
        { error: "Rule id is required." },
        { status: 400 },
      );

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("shelf_sku_pricing_rules")
      .delete()
      .eq("product_id", id)
      .eq("id", ruleId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
