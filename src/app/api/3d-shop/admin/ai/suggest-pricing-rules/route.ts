import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { getShopAiClient } from "@/lib/shop/ai";
import { suggestPricingRules } from "@/lib/shop/ai-variants";

export async function POST(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as {
      product_name?: string;
      base_price?: number;
      options?: {
        name: string;
        values: string[];
        metadata?: Record<string, { price_modifier?: number | null }>;
      }[];
    };
    if (!body.product_name?.trim())
      return NextResponse.json(
        { error: "product_name is required." },
        { status: 400 },
      );

    if (!getShopAiClient()) {
      return NextResponse.json(
        {
          error:
            "AI is not configured. Add OPENAI_API_KEY to your environment.",
        },
        { status: 503 },
      );
    }

    const rules = await suggestPricingRules({
      product_name: body.product_name,
      base_price: Number(body.base_price) || 0,
      options: body.options ?? [],
    });
    return NextResponse.json({ rules });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
