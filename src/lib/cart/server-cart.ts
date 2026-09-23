"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type CartType = "shop" | "quote";

const ACTIVE_STATUS = "active";

export type ServerCartLine = {
  id: string;
  user_id: string;
  cart_type: CartType;
  sku_id: string | null;
  product_id: string | null;
  quantity: number;
  material: string | null;
  weight_grams: number | null;
  estimated_cost: number | null;
  express_delivery: boolean;
  gift_packaging: boolean;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NewServerCartLine = {
  user_id: string;
  cart_type: CartType;
  sku_id?: string | null;
  product_id?: string | null;
  quantity: number;
  material?: string | null;
  weight_grams?: number | null;
  estimated_cost?: number | null;
  express_delivery?: boolean;
  gift_packaging?: boolean;
  payload?: Record<string, unknown>;
};

export type ServerCartLinePatch = {
  quantity?: number;
  payload?: Record<string, unknown>;
  estimated_cost?: number | null;
  weight_grams?: number | null;
};

export type LiveSkuSnapshot = {
  skuId: string;
  productId: string;
  skuCode: string;
  variantCombination: Record<string, string | boolean>;
  price: number;
  basePrice: number;
  compareAtPrice: number | null;
  stockQuantity: number;
  isAvailable: boolean;
  weightGrams: number;
  variantImageUrl: string | null;
  productName: string;
  productSlug: string;
  thumbnailUrl: string | null;
};

export async function getAuthUserId(): Promise<string | null> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function loadServerCart(
  userId: string,
  cartType: CartType,
): Promise<ServerCartLine[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId)
    .eq("cart_type", cartType)
    .eq("status", ACTIVE_STATUS)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ServerCartLine[];
}

export async function insertServerCartLine(
  line: NewServerCartLine,
): Promise<ServerCartLine> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("cart_items")
    .insert(line)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as ServerCartLine;
}

export async function updateServerCartLine(
  id: string,
  patch: ServerCartLinePatch,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("cart_items")
    .update(patch)
    .eq("id", id)
    .eq("status", ACTIVE_STATUS);

  if (error) throw new Error(error.message);
}

export async function deleteServerCartLine(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", id)
    .eq("status", ACTIVE_STATUS);

  if (error) throw new Error(error.message);
}

export async function clearServerCart(cartType: CartType): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_type", cartType)
    .eq("status", ACTIVE_STATUS);

  if (error) throw new Error(error.message);
}

export async function fetchLiveShopSkus(
  skuIds: string[],
): Promise<Map<string, LiveSkuSnapshot>> {
  const result = new Map<string, LiveSkuSnapshot>();
  if (skuIds.length === 0) return result;

  const response = await fetch(
    `/api/3d-shop/pricing/skus?ids=${encodeURIComponent(skuIds.join(","))}`,
  );
  const payload = (await response.json().catch(() => ({}))) as {
    skus?: LiveSkuSnapshot[];
    error?: string;
  };
  if (!response.ok)
    throw new Error(payload.error || "Unable to load live SKU prices.");
  for (const sku of payload.skus ?? []) result.set(sku.skuId, sku);

  return result;
}
