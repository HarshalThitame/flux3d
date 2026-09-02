import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { invalidateShopDataCache } from "@/lib/shop/public-data";

type CategoryPayload = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  banner_image_url?: string | null;
  parent_category_id?: string | null;
  display_order?: number | null;
  is_active?: boolean;
  orders?: { id: string; display_order: number }[];
};

function normalizeCategoryPayload(body: CategoryPayload) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";

  if (!name) throw new Error("Category name is required.");
  if (!slug) throw new Error("Category slug is required.");

  return {
    name,
    slug,
    description:
      typeof body.description === "string"
        ? body.description.trim() || null
        : null,
    banner_image_url:
      typeof body.banner_image_url === "string"
        ? body.banner_image_url.trim() || null
        : null,
    parent_category_id: body.parent_category_id || null,
    display_order: Number.isFinite(Number(body.display_order))
      ? Number(body.display_order)
      : 0,
    is_active: body.is_active ?? true,
  };
}

export async function GET() {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const supabase = createAdminSupabaseClient();
    const [
      { data: categories, error },
      { data: products, error: productsError },
    ] = await Promise.all([
      supabase
        .from("shelf_categories")
        .select("*")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("shelf_products")
        .select("id, category_id")
        .eq("is_archived", false),
    ]);

    if (error) throw new Error(error.message);
    if (productsError) throw new Error(productsError.message);

    const productCounts = new Map<string, number>();
    for (const product of products ?? []) {
      if (!product.category_id) continue;
      productCounts.set(
        product.category_id,
        (productCounts.get(product.category_id) ?? 0) + 1,
      );
    }

    const names = new Map(
      (categories ?? []).map((category) => [category.id, category.name]),
    );
    const data = (categories ?? []).map((category) => ({
      ...category,
      parent_name: category.parent_category_id
        ? (names.get(category.parent_category_id) ?? null)
        : null,
      product_count: productCounts.get(category.id) ?? 0,
    }));

    return NextResponse.json({ categories: data });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as CategoryPayload;
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("shelf_categories")
      .insert(normalizeCategoryPayload(body))
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    invalidateShopDataCache();
    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as CategoryPayload;
    const supabase = createAdminSupabaseClient();

    if (Array.isArray(body.orders)) {
      await Promise.all(
        body.orders.map(async (item) => {
          const { error } = await supabase
            .from("shelf_categories")
            .update({ display_order: item.display_order })
            .eq("id", item.id);
          if (error) throw new Error(error.message);
        }),
      );
      invalidateShopDataCache();
      return NextResponse.json({ ok: true });
    }

    if (!body.id) {
      return NextResponse.json(
        { error: "Category id is required." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("shelf_categories")
      .update(normalizeCategoryPayload(body))
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    invalidateShopDataCache();
    return NextResponse.json({ category: data });
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

    if (!id) {
      return NextResponse.json(
        { error: "Category id is required." },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();
    const { count, error: countError } = await supabase
      .from("shelf_products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id)
      .eq("is_archived", false);

    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Cannot delete a category with linked products." },
        { status: 409 },
      );
    }

    const { error } = await supabase
      .from("shelf_categories")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    invalidateShopDataCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
