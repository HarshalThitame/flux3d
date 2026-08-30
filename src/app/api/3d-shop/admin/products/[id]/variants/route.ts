import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import type { VariantValueMetadata } from "@/lib/shop/admin-types";
import { variantOptionSchema } from "@/lib/shop/product-schema";

type VariantPayload = {
  id?: string;
  option_name?: string;
  option_type?:
    "swatch_color" | "button" | "dropdown" | "toggle" | "text_input";
  values?: string[];
  value_metadata?: Record<string, VariantValueMetadata>;
  display_order?: number;
  is_required?: boolean;
  affects_images?: boolean | null;
  image_priority?: number | null;
  orders?: { id: string; display_order: number }[];
};

const VALID_OPTION_TYPES = [
  "swatch_color",
  "button",
  "dropdown",
  "toggle",
  "text_input",
] as const;

function normalizeVariantPayload(
  body: VariantPayload,
  productId: string,
  partial = false,
): Record<string, unknown> {
  if (!partial) {
    const optionName =
      typeof body.option_name === "string" ? body.option_name.trim() : "";
    const optionType = body.option_type;
    if (!optionName) throw new Error("Option name is required.");
    if (!optionType || !VALID_OPTION_TYPES.includes(optionType)) {
      throw new Error("Option type is invalid.");
    }

    return {
      product_id: productId,
      option_name: optionName,
      option_type: optionType,
      values: Array.isArray(body.values)
        ? body.values.map((value) => String(value).trim()).filter(Boolean)
        : [],
      value_metadata: body.value_metadata ?? {},
      display_order: Number.isFinite(Number(body.display_order))
        ? Number(body.display_order)
        : 0,
      is_required: body.is_required ?? true,
      affects_images: body.affects_images ?? false,
      image_priority: body.image_priority ?? null,
    };
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.option_name === "string") {
    const optionName = body.option_name.trim();
    if (!optionName) throw new Error("Option name cannot be empty.");
    patch.option_name = optionName;
  }
  if (body.option_type !== undefined) {
    if (!VALID_OPTION_TYPES.includes(body.option_type)) {
      throw new Error("Option type is invalid.");
    }
    patch.option_type = body.option_type;
  }
  if (body.values !== undefined) {
    patch.values = body.values
      .map((value) => String(value).trim())
      .filter(Boolean);
  }
  if (body.value_metadata !== undefined)
    patch.value_metadata = body.value_metadata;
  if (body.display_order !== undefined) {
    patch.display_order = Number.isFinite(Number(body.display_order))
      ? Number(body.display_order)
      : 0;
  }
  if (body.is_required !== undefined) patch.is_required = body.is_required;
  if (body.affects_images !== undefined)
    patch.affects_images = body.affects_images;
  if (body.image_priority !== undefined)
    patch.image_priority = body.image_priority;
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
      .from("shelf_variant_options")
      .select("*")
      .eq("product_id", id)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ variants: data ?? [] });
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
    const body = (await request.json()) as VariantPayload;
    const validated = variantOptionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message ?? "Invalid variant." },
        { status: 400 },
      );
    }
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("shelf_variant_options")
      .insert({
        ...normalizeVariantPayload(body, id),
        ...(typeof body.id === "string" ? { id: body.id } : {}),
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ variant: data }, { status: 201 });
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
    const body = (await request.json()) as VariantPayload;
    const supabase = createAdminSupabaseClient();

    if (Array.isArray(body.orders)) {
      for (const item of body.orders) {
        if (
          !item ||
          typeof item !== "object" ||
          typeof item.id !== "string" ||
          !item.id.trim()
        ) {
          return NextResponse.json(
            { error: "Each order item requires a non-empty variant id." },
            { status: 400 },
          );
        }
        if (!Number.isFinite(item.display_order)) {
          return NextResponse.json(
            { error: "Each order item requires a numeric display_order." },
            { status: 400 },
          );
        }
      }
      await Promise.all(
        body.orders.map(async (item) => {
          const { error } = await supabase
            .from("shelf_variant_options")
            .update({ display_order: Math.trunc(item.display_order) })
            .eq("product_id", id)
            .eq("id", item.id);
          if (error) throw new Error(error.message);
        }),
      );
      return NextResponse.json({ ok: true });
    }

    if (!body.id)
      return NextResponse.json(
        { error: "Variant option id is required." },
        { status: 400 },
      );

    const { data, error } = await supabase
      .from("shelf_variant_options")
      .update(normalizeVariantPayload(body, id, true))
      .eq("product_id", id)
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ variant: data });
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
    const variantId = searchParams.get("id");
    if (!variantId)
      return NextResponse.json(
        { error: "Variant option id is required." },
        { status: 400 },
      );

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("shelf_variant_options")
      .delete()
      .eq("product_id", id)
      .eq("id", variantId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
