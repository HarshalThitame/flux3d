import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { buildSkuRows, type SkuGenerationInput } from "@/lib/shop/sku-engine";

/**
 * Pure preview endpoint: given product identity, variant options and pricing
 * rules, returns the full set of SKU draft rows (codes + prices) WITHOUT
 * writing anything. Used by the Combination Matrix before generating.
 */
export async function POST(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as SkuGenerationInput;
    if (!body?.product?.slug) {
      return NextResponse.json(
        { error: "product.slug is required." },
        { status: 400 },
      );
    }
    const rows = buildSkuRows(body);
    return NextResponse.json({ rows, count: rows.length });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
