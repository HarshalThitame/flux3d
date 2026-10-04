import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { invalidateGalleryCache } from "@/lib/gallery/public-data";
import type { GalleryStatus } from "@/lib/gallery/types";

const MAX_TEXT_LENGTH = 240;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_MATERIALS = 8;

type GalleryPayload = {
  id?: string;
  title?: unknown;
  description?: unknown;
  image_url?: unknown;
  alt_text?: unknown;
  category?: unknown;
  materials?: unknown;
  status?: unknown;
  is_featured?: unknown;
  display_order?: unknown;
};

function cleanText(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizePayload(body: GalleryPayload, partial = false) {
  const title = cleanText(body.title);
  const imageUrl = cleanText(body.image_url, 2000);
  const altText = cleanText(body.alt_text);
  const category = cleanText(body.category) || "Studio work";
  const status: GalleryStatus = body.status === "draft" ? "draft" : "published";
  const materials = Array.isArray(body.materials)
    ? body.materials
        .map((item) => cleanText(item, 80))
        .filter(Boolean)
        .slice(0, MAX_MATERIALS)
    : [];
  const displayOrder = Number(body.display_order);

  if (!partial && !title) throw new Error("A title is required.");
  if (!partial && !imageUrl) throw new Error("An image is required.");

  const normalized = {
    title,
    description: cleanText(body.description, MAX_DESCRIPTION_LENGTH) || null,
    image_url: imageUrl,
    alt_text: altText || title,
    category,
    materials,
    status,
    is_featured: body.is_featured === true,
    display_order: Number.isFinite(displayOrder) ? Math.max(0, Math.floor(displayOrder)) : 0,
  };

  if (!partial) return normalized;
  const record = body as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(normalized).filter(([key]) => record[key] !== undefined),
  );
}

export async function GET() {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { data, error } = await createAdminSupabaseClient()
      .from("gallery_items")
      .select("id,title,description,image_url,alt_text,category,materials,status,is_featured,display_order,created_at,updated_at")
      .order("is_featured", { ascending: false })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as GalleryPayload;
    const payload = normalizePayload(body);
    const { data, error } = await createAdminSupabaseClient()
      .from("gallery_items")
      .insert({ ...payload, created_by: auth.user.id })
      .select("id,title,description,image_url,alt_text,category,materials,status,is_featured,display_order,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);
    invalidateGalleryCache();
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as GalleryPayload;
    const id = cleanText(body.id, 80);
    if (!id) return NextResponse.json({ error: "Gallery item id is required." }, { status: 400 });
    const payload = normalizePayload(body, true);
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No gallery fields were provided." }, { status: 400 });
    }
    const { data, error } = await createAdminSupabaseClient()
      .from("gallery_items")
      .update(payload)
      .eq("id", id)
      .select("id,title,description,image_url,alt_text,category,materials,status,is_featured,display_order,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);
    invalidateGalleryCache();
    return NextResponse.json({ item: data });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const id = cleanText(new URL(request.url).searchParams.get("id"), 80);
    if (!id) return NextResponse.json({ error: "Gallery item id is required." }, { status: 400 });
    const { error } = await createAdminSupabaseClient().from("gallery_items").delete().eq("id", id);
    if (error) throw new Error(error.message);
    invalidateGalleryCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
