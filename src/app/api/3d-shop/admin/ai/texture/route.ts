import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { getShopAiClient } from "@/lib/shop/ai";
import { generateTextureSwatch } from "@/lib/shop/ai-variants";

const SHOP_BUCKET = "shop-images";

export async function POST(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json()) as {
      value?: string;
      option_name?: string;
    };
    const value = (body.value ?? "").trim();
    const optionName = (body.option_name ?? "Material").trim();
    if (!value)
      return NextResponse.json(
        { error: "value is required." },
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

    const generated = await generateTextureSwatch({
      value,
      option_name: optionName,
    });
    if (!generated)
      return NextResponse.json(
        { error: "Texture generation returned no image." },
        { status: 502 },
      );

    const buffer = Buffer.from(generated.b64, "base64");
    const path = `shop/textures/${Date.now()}-${value
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()}.png`;

    const supabase = createAdminSupabaseClient();
    const { error: uploadError } = await supabase.storage
      .from(SHOP_BUCKET)
      .upload(path, buffer, {
        contentType: generated.mime,
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadError)
      throw new Error(`Texture upload failed: ${uploadError.message}`);

    const { data } = supabase.storage.from(SHOP_BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
