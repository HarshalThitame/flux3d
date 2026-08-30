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

async function uploadVariantImage(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  file: File,
  productId: string,
) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, GIF, and SVG images are allowed.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image must be smaller than 8MB.");
  }

  const safeProductId = productId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const path = `shop/products/${safeProductId}/variant-images/${Date.now()}-${sanitizeFilename(file.name)}`;
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
      .from("shelf_variant_option_images")
      .select("*")
      .eq("product_id", id)
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
          option_name: string;
          option_value: string;
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
        (image) =>
          String(image.option_name || "").trim() !== "" &&
          String(image.option_value || "").trim() !== "" &&
          String(image.image_url || "").trim() !== "",
      );
      if (validImages.length === 0) {
        return NextResponse.json(
          {
            error:
              "Each image entry needs a non-empty option_name, option_value and image_url.",
          },
          { status: 400 },
        );
      }
      const supabase = createAdminSupabaseClient();

      // Guard: reject any URL whose storage object no longer exists.
      // This prevents assigning previously-deleted image URLs, which would create
      // dangling DB references that return HTTP 400 on the storefront.
      // We use a HEAD request to the public URL — it's definitive (200 = exists,
      // anything else = gone), whereas supabase.storage.list() with `search` only
      // does prefix matching and can produce false negatives.
      for (const img of validImages) {
        const rawUrl = String(img.image_url || "").trim();
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
            // Network error — don't block the assignment; storage may be temporarily unavailable
          }
        }
      }

      const { data, error } = await supabase
        .from("shelf_variant_option_images")
        .insert(
          validImages.map((image, index) => ({
            product_id: id,
            option_name: String(image.option_name || "").trim(),
            option_value: String(image.option_value || "").trim(),
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
    const optionName = String(formData.get("option_name") || "").trim();
    const optionValue = String(formData.get("option_value") || "").trim();
    const altText = String(formData.get("alt_text") || "").trim();
    if (!file)
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (!optionName || !optionValue) {
      return NextResponse.json(
        { error: "option_name and option_value are required." },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();
    const publicUrl = await uploadVariantImage(supabase, file, id);

    const { count: existingCount } = await supabase
      .from("shelf_variant_option_images")
      .select("id", { count: "exact", head: true })
      .eq("product_id", id)
      .eq("option_name", optionName)
      .eq("option_value", optionValue);

    const { data, error } = await supabase
      .from("shelf_variant_option_images")
      .insert({
        product_id: id,
        option_name: optionName,
        option_value: optionValue,
        image_url: publicUrl,
        alt_text: altText || null,
        display_order: existingCount ?? 0,
        is_primary: false,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const { data: siblings, error: siblingError } = await supabase
      .from("shelf_variant_option_images")
      .select("id")
      .eq("product_id", id)
      .eq("option_name", optionName)
      .eq("option_value", optionValue)
      .eq("is_primary", true)
      .limit(1);

    if (siblingError) throw new Error(siblingError.message);

    if (siblings?.length === 0) {
      const { error: primaryError } = await supabase
        .from("shelf_variant_option_images")
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
      const { data: current, error: readError } = await supabase
        .from("shelf_variant_option_images")
        .select("product_id, option_name, option_value")
        .eq("id", body.image_id)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      if (current) {
        const { error: clearError } = await supabase
          .from("shelf_variant_option_images")
          .update({ is_primary: false })
          .eq("product_id", current.product_id)
          .eq("option_name", current.option_name)
          .eq("option_value", current.option_value);
        if (clearError) throw new Error(clearError.message);
      }
    }

    const { data, error } = await supabase
      .from("shelf_variant_option_images")
      .update(updates)
      .eq("product_id", id)
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
      .from("shelf_variant_option_images")
      .select("image_url")
      .eq("product_id", id)
      .eq("id", imageId)
      .maybeSingle();

    const { error } = await supabase
      .from("shelf_variant_option_images")
      .delete()
      .eq("product_id", id)
      .eq("id", imageId);

    if (error) throw new Error(error.message);

    if (existing?.image_url) {
      const { deleteShopImageAsset } =
        await import("@/lib/shop/storage-cleanup");
      await deleteShopImageAsset(existing.image_url);
    }
    invalidateShopDataCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
