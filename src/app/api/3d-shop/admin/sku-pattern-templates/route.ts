import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";

type TemplatePayload = {
  id?: string;
  name?: string;
  pattern?: string;
  category_id?: string | null;
  is_default?: boolean;
};

function normalizeTemplatePayload(
  body: TemplatePayload,
  partial = false,
): Record<string, unknown> {
  if (!partial) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const pattern = typeof body.pattern === "string" ? body.pattern.trim() : "";
    if (!name) throw new Error("Template name is required.");
    if (!pattern.includes("{"))
      throw new Error("Pattern must contain at least one token like {SLUG}.");

    return {
      name,
      pattern,
      category_id: body.category_id || null,
      is_default: body.is_default ?? false,
    };
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) throw new Error("Template name cannot be empty.");
    patch.name = name;
  }
  if (typeof body.pattern === "string") {
    const pattern = body.pattern.trim();
    if (!pattern.includes("{"))
      throw new Error("Pattern must contain at least one token like {SLUG}.");
    patch.pattern = pattern;
  }
  if (body.category_id !== undefined)
    patch.category_id = body.category_id || null;
  if (body.is_default !== undefined) patch.is_default = body.is_default;
  return patch;
}

export async function GET() {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("shelf_sku_pattern_templates")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ templates: data ?? [] });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as TemplatePayload;
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("shelf_sku_pattern_templates")
      .insert(normalizeTemplatePayload(body))
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ template: data }, { status: 201 });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as TemplatePayload;
    if (!body.id)
      return NextResponse.json(
        { error: "Template id is required." },
        { status: 400 },
      );

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("shelf_sku_pattern_templates")
      .update(normalizeTemplatePayload(body, true))
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ template: data });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { error: "Template id is required." },
        { status: 400 },
      );

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("shelf_sku_pattern_templates")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
