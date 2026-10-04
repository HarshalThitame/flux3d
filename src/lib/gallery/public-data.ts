import { unstable_cache, revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { GalleryItem } from "@/lib/gallery/types";

const GALLERY_TAG = "gallery-items";
const GALLERY_REVALIDATE_SECONDS = 300;

function getPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadPublishedGalleryItems(): Promise<GalleryItem[]> {
  const supabase = getPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("gallery_items")
    .select(
      "id,title,description,image_url,alt_text,category,materials,status,is_featured,display_order,created_at,updated_at",
    )
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) throw new Error(error.message);
  return (data ?? []) as GalleryItem[];
}

const getCachedPublishedGalleryItems = unstable_cache(
  loadPublishedGalleryItems,
  ["gallery-items"],
  { tags: [GALLERY_TAG], revalidate: GALLERY_REVALIDATE_SECONDS },
);

export function getPublishedGalleryItems() {
  return getCachedPublishedGalleryItems();
}

export function invalidateGalleryCache() {
  try {
    revalidateTag(GALLERY_TAG, "max");
  } catch {
    // Mutations outside a request context simply fall back to the short TTL.
  }
}
