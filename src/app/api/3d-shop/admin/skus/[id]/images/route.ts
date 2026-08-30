import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { invalidateShopDataCache } from "@/lib/shop/public-data";

const SHOP_BUCKET = "shop-images";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function sanitizeFilename(name: string) {
  const fallback = "image";
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || fallback;
}

async function uploadSkuImage(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  file: File,
  productId: string,
  skuId: string,
) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, GIF, and SVG images are allowed.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image must be smaller than 8MB.");
  }

  const safeProductId = productId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const safeSkuId = skuId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const path = `shop/products/${safeProductId}/sku-images/${safeSkuId}/${Date.now()}-${sanitizeFilename(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(SHOP_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    if (uploadError.message.toLowerCase().includes("bucket")) {
      const { error: bucketError } = await supabase.storage.createBucket(
        SHOP_BUCKET,
        {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
        },
      );
      if (bucketError)
        throw new Error(`Storage setup failed: ${bucketError.message}`);

      const { error: retryError } = await supabase.storage
        .from(SHOP_BUCKET)
        .upload(path, buffer, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: false,
        });
      if (retryError) throw new Error(`Upload failed: ${retryError.message}`);
    } else {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
  }

  const { data } = supabase.storage.from(SHOP_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function resolveProductId(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  skuId: string,
) {
  const { data, error } = await supabase
    .from("shelf_skus")
    .select("product_id")
    .eq("id", skuId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("SKU not found.");
  return data.product_id;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("shelf_sku_images")
      .select("*")
      .eq("sku_id", id)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ images: data ?? [] });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        images?: {
          image_url: string;
          alt_text?: string | null;
          display_order?: number;
          is_primary?: boolean;
        }[];
      };
      const images = Array.isArray(body.images) ? body.images : [];
      if (images.length === 0) {
        return NextResponse.json(
          { error: "At least one image entry is required." },
          { status: 400 },
        );
      }
      const validImages = images.filter(
        (image) => String(image.image_url || "").trim() !== "",
      );
      if (validImages.length === 0) {
        return NextResponse.json(
          { error: "Each image entry needs a non-empty image_url." },
          { status: 400 },
        );
      }
      const supabase = createAdminSupabaseClient();

      // Guard: verify the image URL is actually reachable in storage.
      // We use a HEAD request on the public URL — it's exact (no pagination
      // or prefix-search issues) and avoids the storage.list() false-negative
      // bug where a freshly-uploaded file is not yet visible in folder listings.
      for (const img of validImages) {
        const rawUrl = String(img.image_url || "").trim();
        // Only validate URLs that point at our own Supabase storage bucket
        if (rawUrl.includes("/storage/v1/object/public/shop-images/")) {
          try {
            const headRes = await fetch(rawUrl, { method: "HEAD" });
            if (!headRes.ok) {
              return NextResponse.json(
                {
                  error: `Image file no longer exists in storage: ${rawUrl}. Please re-upload the image.`,
                },
                { status: 422 },
              );
            }
          } catch {
            // Network errors (e.g. DNS issues in CI) — fail open so a transient
            // connectivity hiccup never blocks a legitimate admin action.
          }
        }
      }

      const { data, error } = await supabase
        .from("shelf_sku_images")
        .insert(
          validImages.map((image, index) => ({
            sku_id: id,
            image_url: String(image.image_url || "").trim(),
            alt_text: image.alt_text || null,
            display_order: Number(image.display_order) || index,
            is_primary: Boolean(image.is_primary),
          })),
        )
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw new Error(error.message);
      invalidateShopDataCache();
      return NextResponse.json({ images: data ?? [] }, { status: 201 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const altText = String(formData.get("alt_text") || "").trim();
    const displayOrder = Number(formData.get("display_order")) || 0;
    if (!file)
      return NextResponse.json({ error: "No file provided." }, { status: 400 });

    const supabase = createAdminSupabaseClient();
    const productId = await resolveProductId(supabase, id);
    const publicUrl = await uploadSkuImage(supabase, file, productId, id);

    const { data, error } = await supabase
      .from("shelf_sku_images")
      .insert({
        sku_id: id,
        image_url: publicUrl,
        alt_text: altText || null,
        display_order: displayOrder,
        is_primary: false,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const { data: siblings, error: siblingError } = await supabase
      .from("shelf_sku_images")
      .select("id")
      .eq("sku_id", id)
      .eq("is_primary", true)
      .limit(1);
    if (siblingError) throw new Error(siblingError.message);

    if (siblings?.length === 0) {
      const { error: primaryError } = await supabase
        .from("shelf_sku_images")
        .update({ is_primary: true })
        .eq("id", data.id);
      if (primaryError) throw new Error(primaryError.message);
      data.is_primary = true;
    }

    invalidateShopDataCache();
    return NextResponse.json({ image: data }, { status: 201 });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      image_id?: string;
      alt_text?: string;
      display_order?: number;
      is_primary?: boolean;
    };
    if (!body.image_id)
      return NextResponse.json(
        { error: "image_id is required." },
        { status: 400 },
      );

    const supabase = createAdminSupabaseClient();
    const updates: {
      alt_text?: string | null;
      display_order?: number;
      is_primary?: boolean;
    } = {};
    if (typeof body.alt_text === "string")
      updates.alt_text = body.alt_text.trim() || null;
    if (body.display_order !== undefined)
      updates.display_order = Number(body.display_order) || 0;
    if (typeof body.is_primary === "boolean")
      updates.is_primary = body.is_primary;

    if (body.is_primary === true) {
      const { error: clearError } = await supabase
        .from("shelf_sku_images")
        .update({ is_primary: false })
        .eq("sku_id", id);
      if (clearError) throw new Error(clearError.message);
    }

    const { data, error } = await supabase
      .from("shelf_sku_images")
      .update(updates)
      .eq("sku_id", id)
      .eq("id", body.image_id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    invalidateShopDataCache();
    return NextResponse.json({ image: data });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("id");
    if (!imageId)
      return NextResponse.json(
        { error: "image id is required." },
        { status: 400 },
      );

    const supabase = createAdminSupabaseClient();
    // Capture the storage URL before the row is gone.
    const { data: existing } = await supabase
      .from("shelf_sku_images")
      .select("image_url")
      .eq("sku_id", id)
      .eq("id", imageId)
      .maybeSingle();

    const { error } = await supabase
      .from("shelf_sku_images")
      .delete()
      .eq("sku_id", id)
      .eq("id", imageId);

    if (error) throw new Error(error.message);

    invalidateShopDataCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
