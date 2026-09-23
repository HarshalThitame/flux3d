import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import {
  groupRulesByProduct,
  resolveCartUnitPrice,
  type CartPriceRule,
} from "@/lib/shop/cart-price-rules";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ids = (new URL(request.url).searchParams.get("ids") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 100);
    if (!ids.length) return NextResponse.json({ skus: [] });
    const supabase = createAdminSupabaseClient();
    const { data: rows, error } = await supabase
      .from("shelf_skus")
      .select(
        "id,product_id,sku_code,variant_combination,price,compare_at_price,stock_quantity,is_available,weight_grams,variant_image_url,product:shelf_products!inner(id,name,slug,thumbnail_url,is_active,is_archived)",
      )
      .in("id", ids);
    if (error) throw new Error(error.message);
    const availableRows = (rows ?? [])
      .map((row) => ({
        ...row,
        resolvedProduct: Array.isArray(row.product)
          ? row.product[0]
          : row.product,
      }))
      .filter(
        (row) =>
          row.resolvedProduct?.is_active && !row.resolvedProduct?.is_archived,
      );
    const productIds = Array.from(
      new Set(availableRows.map((row) => row.product_id)),
    );
    const { data: ruleRows, error: ruleError } = productIds.length
      ? await supabase
          .from("shelf_product_cart_price_rules")
          .select("*")
          .in("product_id", productIds)
          .eq("is_active", true)
      : { data: [], error: null };
    if (ruleError) throw new Error(ruleError.message);
    const rules = groupRulesByProduct((ruleRows ?? []) as CartPriceRule[]);
    return NextResponse.json({
      skus: availableRows.map((row) => {
        const basePrice = Number(row.price ?? 0);
        const adjustment = resolveCartUnitPrice(
          basePrice,
          rules.get(row.product_id) ?? null,
        );
        const price = adjustment?.adjustedUnitPrice ?? basePrice;
        return {
          skuId: row.id,
          productId: row.product_id,
          skuCode: row.sku_code ?? "",
          variantCombination: row.variant_combination ?? {},
          price,
          basePrice,
          compareAtPrice:
            adjustment && price < basePrice
              ? Math.max(Number(row.compare_at_price ?? 0), basePrice)
              : row.compare_at_price == null
                ? null
                : Number(row.compare_at_price),
          priceAdjustment: adjustment,
          stockQuantity: Math.max(0, Number(row.stock_quantity ?? 0)),
          isAvailable: row.is_available !== false,
          weightGrams: Math.max(0, Number(row.weight_grams ?? 0)),
          variantImageUrl: row.variant_image_url ?? null,
          productName: row.resolvedProduct?.name ?? "",
          productSlug: row.resolvedProduct?.slug ?? "",
          thumbnailUrl: row.resolvedProduct?.thumbnail_url ?? null,
        };
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to resolve current prices.",
      },
      { status: 500 },
    );
  }
}
