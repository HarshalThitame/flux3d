import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { suggestSkuPattern } from "@/lib/shop/ai-variants";

export async function POST(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as {
      product_name?: string;
      category?: string;
      option_names?: string[];
    };
    if (!body.product_name?.trim())
      return NextResponse.json(
        { error: "product_name is required." },
        { status: 400 },
      );

    const pattern = await suggestSkuPattern({
      product_name: body.product_name,
      category: body.category,
      option_names: body.option_names ?? [],
    });
    return NextResponse.json({ pattern });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
