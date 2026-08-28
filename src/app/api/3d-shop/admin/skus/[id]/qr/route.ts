import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { invalidateShopDataCache } from "@/lib/shop/public-data";

const SHOP_BUCKET = "shop-images";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const supabase = createAdminSupabaseClient();

    const { data: sku, error: skuError } = await supabase
      .from("shelf_skus")
      .select("id, product_id, sku_code")
      .eq("id", id)
      .single();
    if (skuError || !sku) throw new Error("SKU not found.");

    const { data: product, error: productError } = await supabase
      .from("shelf_products")
      .select("slug")
      .eq("id", sku.product_id)
      .single();
    if (productError || !product) throw new Error("Product not found.");

    const origin = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
    const baseUrl = origin
      ? `https://${origin.replace(/^https?:\/\//, "")}`
      : "";
    const pageUrl = `${baseUrl}/3d-shop/product/${product.slug}`;
    const payload = `${pageUrl}?sku=${encodeURIComponent(sku.sku_code)}`;

    const png = await QRCode.toBuffer(payload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 512,
      color: {
        dark: "#0F1B3D",
        light: "#FFFFFF",
      },
    });

    const safeProductId = sku.product_id.replace(/[^a-zA-Z0-9_-]/g, "-");
    const path = `shop/products/${safeProductId}/qr/${sku.sku_code.replace(/[^a-zA-Z0-9_-]/g, "-")}-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from(SHOP_BUCKET)
      .upload(path, new Uint8Array(png), {
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: true,
      });
    if (uploadError)
      throw new Error(`QR upload failed: ${uploadError.message}`);

    const { data } = supabase.storage.from(SHOP_BUCKET).getPublicUrl(path);
    const qrUrl = data.publicUrl;

    const { data: updated, error: updateError } = await supabase
      .from("shelf_skus")
      .update({ qr_url: qrUrl, barcode: sku.sku_code })
      .eq("id", id)
      .select("*")
      .single();
    if (updateError) throw new Error(updateError.message);

    invalidateShopDataCache();
    return NextResponse.json({ sku: updated, qr_url: qrUrl });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const supabase = createAdminSupabaseClient();

    const { data: sku, error: skuError } = await supabase
      .from("shelf_skus")
      .select("id, qr_url")
      .eq("id", id)
      .single();
    if (skuError || !sku) throw new Error("SKU not found.");

    if (sku.qr_url) {
      const path = sku.qr_url.split(`/${SHOP_BUCKET}/`)[1];
      if (path) {
        await supabase.storage.from(SHOP_BUCKET).remove([path]);
      }
    }

    const { error: updateError } = await supabase
      .from("shelf_skus")
      .update({ qr_url: null })
      .eq("id", id);
    if (updateError) throw new Error(updateError.message);

    invalidateShopDataCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
