import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { generateImageAlt, type AiImageAltInput } from "@/lib/shop/ai";

export async function POST(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as AiImageAltInput;
    if (!body.product_name?.trim()) {
      return NextResponse.json(
        { error: "Missing product name for alt text generation." },
        { status: 400 },
      );
    }
    if (!body.image_url?.trim()) {
      return NextResponse.json(
        { error: "Missing image URL for alt text generation." },
        { status: 400 },
      );
    }

    const result = await generateImageAlt(body);
    return NextResponse.json(result);
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
