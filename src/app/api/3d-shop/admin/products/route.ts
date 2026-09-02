import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { invalidateShopDataCache } from "@/lib/shop/public-data";

type ProductPayload = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  long_description?: string | null;
  long_description_blocks?: unknown;
  category_id?: string | null;
  product_categories?: { category_id: string; is_primary: boolean }[] | null;
  tags?: string[];
  occasion_tags?: string[];
  thumbnail_url?: string | null;
  landscape_image_url?: string | null;
  image_urls?: string[] | null;
  image_alt?: Record<string, string> | null;
  default_dimensions?: Record<string, unknown> | null;
  model_url?: string | null;
  usdz_url?: string | null;
  hotspots?: unknown;
  hero_video_url?: string | null;
  base_price?: number;
  sku_pattern?: string | null;
  is_customizable?: boolean;
  customization_label?: string | null;
  customization_is_required?: boolean;
  customization_min_length?: number;
  customization_max_length?: number;
  is_featured?: boolean;
  is_active?: boolean;
  is_archived?: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
  published_at?: string | null;
};

type SkuRow = {
  id: string;
  stock_quantity: number;
  low_stock_threshold: number | null;
  is_available: boolean | null;
};

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

const HOTSPOT_LIMIT = 12;

function normalizeHotspots(value: unknown) {
  if (!Array.isArray(value)) return [];
  const hotspots: {
    id: string;
    position: [number, number, number];
    label: string;
    description: string | null;
  }[] = [];
  for (const entry of value.slice(0, HOTSPOT_LIMIT)) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;
    const position = Array.isArray(raw.position)
      ? raw.position.map(Number)
      : [];
    if (
      position.length !== 3 ||
      position.some((axis) => !Number.isFinite(axis)) ||
      typeof raw.id !== "string" ||
      !raw.id.trim() ||
      typeof raw.label !== "string" ||
      !raw.label.trim()
    )
      continue;
    hotspots.push({
      id: raw.id.trim(),
      position: position as [number, number, number],
      label: raw.label.trim().slice(0, 80),
      description:
        typeof raw.description === "string" && raw.description.trim()
          ? raw.description.trim().slice(0, 300)
          : null,
    });
  }
  return hotspots;
}

function normalizeProductPayload(body: ProductPayload, partial = false) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";

  if (!partial && !name) throw new Error("Product name is required.");
  if (!partial && !slug) throw new Error("Product slug is required.");

  const full: Record<string, unknown> = {
    ...(name || !partial ? { name } : {}),
    ...(slug || !partial ? { slug } : {}),
    description:
      typeof body.description === "string"
        ? body.description.trim() || null
        : (body.description ?? null),
    long_description:
      typeof body.long_description === "string"
        ? body.long_description
        : (body.long_description ?? null),
    long_description_blocks: Array.isArray(body.long_description_blocks)
      ? body.long_description_blocks
      : [],
    category_id: body.category_id || null,
    tags: normalizeStringArray(body.tags),
    occasion_tags: normalizeStringArray(body.occasion_tags),
    thumbnail_url:
      typeof body.thumbnail_url === "string"
        ? body.thumbnail_url.trim() || null
        : (body.thumbnail_url ?? null),
    landscape_image_url:
      typeof body.landscape_image_url === "string"
        ? body.landscape_image_url.trim() || null
        : (body.landscape_image_url ?? null),
    image_urls: normalizeStringArray(body.image_urls),
    image_alt:
      body.image_alt && typeof body.image_alt === "object"
        ? Object.fromEntries(
            Object.entries(body.image_alt)
              .filter(([key]) => typeof key === "string" && key.trim())
              .map(([key, value]) => [
                key,
                typeof value === "string" ? value.trim() : "",
              ])
              .filter(([, value]) => value),
          )
        : {},
    default_dimensions:
      body.default_dimensions && typeof body.default_dimensions === "object"
        ? body.default_dimensions
        : null,
    model_url:
      typeof body.model_url === "string"
        ? body.model_url.trim() || null
        : (body.model_url ?? null),
    usdz_url:
      typeof body.usdz_url === "string"
        ? body.usdz_url.trim() || null
        : (body.usdz_url ?? null),
    hotspots: normalizeHotspots(body.hotspots),
    hero_video_url:
      typeof body.hero_video_url === "string"
        ? body.hero_video_url.trim() || null
        : (body.hero_video_url ?? null),
    base_price: Number.isFinite(Number(body.base_price))
      ? Number(body.base_price)
      : 0,
    sku_pattern:
      typeof body.sku_pattern === "string"
        ? body.sku_pattern.trim() || null
        : (body.sku_pattern ?? null),
    is_customizable: body.is_customizable ?? false,
    customization_label:
      typeof body.customization_label === "string"
        ? body.customization_label.trim() || null
        : (body.customization_label ?? null),
    customization_is_required: body.customization_is_required ?? false,
    customization_min_length: body.customization_min_length ?? 0,
    customization_max_length: body.customization_max_length ?? null,
    is_featured: body.is_featured ?? false,
    is_active: body.is_active ?? true,
    is_archived: body.is_archived ?? false,
    meta_title:
      typeof body.meta_title === "string"
        ? body.meta_title.trim() || null
        : (body.meta_title ?? null),
    meta_description:
      typeof body.meta_description === "string"
        ? body.meta_description.trim() || null
        : (body.meta_description ?? null),
    published_at: normalizePublishedAt(body.published_at),
  };

  if (!partial) return full;

  const bodyRecord = body as unknown as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(full).filter(([key]) => bodyRecord[key] !== undefined),
  );
}

function normalizePublishedAt(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getStockStatus(skus: SkuRow[] | null | undefined) {
  const availableSkus = (skus ?? []).filter(
    (sku) => sku.is_available !== false,
  );
  if (availableSkus.length === 0) return "No SKUs";
  if (availableSkus.every((sku) => sku.stock_quantity <= 0))
    return "Out of Stock";
  if (
    availableSkus.some(
      (sku) => sku.stock_quantity <= (sku.low_stock_threshold ?? 5),
    )
  )
    return "Some Low Stock";
  return "All In Stock";
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const slug = searchParams.get("slug");
    const excludeId = searchParams.get("exclude_id");
    const categoryId = searchParams.get("category_id");
    const isActive = searchParams.get("is_active");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const supabase = createAdminSupabaseClient();

    if (slug) {
      let query = supabase
        .from("shelf_products")
        .select("id")
        .eq("slug", slug)
        .limit(1);
      if (excludeId) query = query.neq("id", excludeId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return NextResponse.json({ available: (data ?? []).length === 0 });
    }

    if (id) {
      const { data, error } = await supabase
        .from("shelf_products")
        .select(
          "*, category:shelf_categories(name), product_categories:shelf_product_categories(category_id, is_primary, category:shelf_categories(name)), shelf_skus(id, stock_quantity, low_stock_threshold, is_available)",
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data)
        return NextResponse.json(
          { error: "Product not found." },
          { status: 404 },
        );

      const primaryCat =
        data.product_categories?.find(
          (pc: { is_primary?: boolean; category?: unknown }) => pc.is_primary,
        )?.category || data.category;
      const product = {
        ...data,
        category_name: primaryCat?.name ?? null,
        sku_count: data.shelf_skus?.length ?? 0,
        stock_status: getStockStatus(data.shelf_skus),
      };

      return NextResponse.json({ product });
    }

    let query = supabase
      .from("shelf_products")
      .select(
        "*, category:shelf_categories(name), product_categories:shelf_product_categories(category_id, is_primary, category:shelf_categories(name)), shelf_skus(id, stock_quantity, low_stock_threshold, is_available)",
      )
      .order("created_at", { ascending: false });

    if (categoryId) query = query.eq("category_id", categoryId);
    if (isActive === "true" || isActive === "false")
      query = query.eq("is_active", isActive === "true");
    if (status === "archived") {
      query = query.eq("is_archived", true);
    } else if (status === "draft") {
      query = query.eq("is_archived", false).eq("is_active", false);
    } else if (status === "active") {
      query = query.eq("is_archived", false).eq("is_active", true);
    } else {
      query = query.eq("is_archived", false);
    }
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const products = (data ?? []).map((product) => {
      const primaryCat =
        product.product_categories?.find(
          (pc: { is_primary?: boolean; category?: unknown }) => pc.is_primary,
        )?.category || product.category;
      return {
        ...product,
        category_name: primaryCat?.name ?? null,
        sku_count: product.shelf_skus?.length ?? 0,
        stock_status: getStockStatus(product.shelf_skus),
      };
    });

    return NextResponse.json({ products });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as ProductPayload;
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("shelf_products")
      .insert(normalizeProductPayload(body))
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    if (body.product_categories && body.product_categories.length > 0) {
      await supabase.from("shelf_product_categories").insert(
        body.product_categories.map((pc) => ({
          product_id: data.id,
          category_id: pc.category_id,
          is_primary: pc.is_primary,
        })),
      );
    } else if (body.category_id) {
      await supabase.from("shelf_product_categories").insert({
        product_id: data.id,
        category_id: body.category_id,
        is_primary: true,
      });
    }

    invalidateShopDataCache();
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as ProductPayload;
    if (!body.id)
      return NextResponse.json(
        { error: "Product id is required." },
        { status: 400 },
      );

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("shelf_products")
      .update(normalizeProductPayload(body, true))
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    if (body.product_categories !== undefined) {
      await supabase
        .from("shelf_product_categories")
        .delete()
        .eq("product_id", body.id);
      if (body.product_categories && body.product_categories.length > 0) {
        await supabase.from("shelf_product_categories").insert(
          body.product_categories.map((pc) => ({
            product_id: body.id,
            category_id: pc.category_id,
            is_primary: pc.is_primary,
          })),
        );
      }
    }

    invalidateShopDataCache();
    return NextResponse.json({ product: data });
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
        { error: "Product id is required." },
        { status: 400 },
      );

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("shelf_products")
      .update({ is_archived: true, is_active: false })
      .eq("id", id);

    if (error) throw new Error(error.message);
    invalidateShopDataCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
