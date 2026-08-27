import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { productsToCsv } from "@/lib/shop/import-export";

type ExportProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  long_description: string | null;
  long_description_blocks?: unknown;
  tags: string[] | null;
  occasion_tags: string[] | null;
  thumbnail_url: string | null;
  image_urls: string[] | null;
  image_alt: Record<string, string> | null;
  model_url: string | null;
  base_price: number;
  is_customizable: boolean | null;
  customization_label: string | null;
  is_featured: boolean | null;
  is_active: boolean | null;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  category_name: string | null;
  variants?: unknown[];
  skus?: unknown[];
};

export async function GET(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") === "csv" ? "csv" : "json";
    const categoryId = searchParams.get("category_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const supabase = createAdminSupabaseClient();

    let query = supabase
      .from("shelf_products")
      .select("*, category:shelf_categories(name)")
      .order("created_at", { ascending: false });

    if (categoryId) query = query.eq("category_id", categoryId);
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

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((row) => row.id);
    const [variantsResult, skusResult] = await Promise.all([
      ids.length > 0
        ? supabase
            .from("shelf_variant_options")
            .select("*")
            .in("product_id", ids)
            .order("display_order", { ascending: true })
        : Promise.resolve({ data: [] as unknown[], error: null }),
      ids.length > 0
        ? supabase
            .from("shelf_skus")
            .select("*")
            .in("product_id", ids)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as unknown[], error: null }),
    ]);
    if (variantsResult.error) throw new Error(variantsResult.error.message);
    if (skusResult.error) throw new Error(skusResult.error.message);

    const variantsByProduct = new Map<string, unknown[]>();
    for (const variant of (variantsResult.data ?? []) as Array<{
      product_id: string;
    }>) {
      const list = variantsByProduct.get(variant.product_id) ?? [];
      list.push(variant);
      variantsByProduct.set(variant.product_id, list);
    }
    const skusByProduct = new Map<string, unknown[]>();
    for (const sku of (skusResult.data ?? []) as Array<{
      product_id: string;
    }>) {
      const list = skusByProduct.get(sku.product_id) ?? [];
      list.push(sku);
      skusByProduct.set(sku.product_id, list);
    }

    const products: ExportProduct[] = (rows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      long_description: row.long_description,
      long_description_blocks: row.long_description_blocks ?? [],
      tags: row.tags ?? [],
      occasion_tags: row.occasion_tags ?? [],
      thumbnail_url: row.thumbnail_url,
      image_urls: row.image_urls ?? [],
      image_alt: row.image_alt ?? {},
      model_url: row.model_url,
      base_price: Number(row.base_price ?? 0),
      is_customizable: row.is_customizable,
      customization_label: row.customization_label,
      is_featured: row.is_featured,
      is_active: row.is_active,
      meta_title: row.meta_title,
      meta_description: row.meta_description,
      published_at: row.published_at,
      category_name: row.category?.name ?? null,
      variants: variantsByProduct.get(row.id) ?? [],
      skus: skusByProduct.get(row.id) ?? [],
    }));

    const filename = `3d-shop-products-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      const csv = productsToCsv(products);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    return NextResponse.json(
      {
        products,
        exportedAt: new Date().toISOString(),
        count: products.length,
      },
      {
        headers: {
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      },
    );
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
