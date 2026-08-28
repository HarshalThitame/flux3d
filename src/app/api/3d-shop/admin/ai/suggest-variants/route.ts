import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { suggestVariantOptions } from "@/lib/shop/ai-variants";

export async function POST(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as {
      product_name?: string;
      description?: string;
      category?: string;
      existing_names?: string[];
    };
    if (!body.product_name?.trim())
      return NextResponse.json(
        { error: "product_name is required." },
        { status: 400 },
      );

    const options = await suggestVariantOptions({
      product_name: body.product_name,
      description: body.description,
      category: body.category,
      existing_names: body.existing_names,
    });
    return NextResponse.json({ options });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
