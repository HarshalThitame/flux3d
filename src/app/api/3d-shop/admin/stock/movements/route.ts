import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import type { StockMovementRow } from "@/lib/shop/stock";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const REASONS = [
  "order_placed",
  "order_cancelled",
  "order_returned",
  "reservation_expired",
  "manual_adjust",
  "restock",
  "release",
  "system",
];

type RawMovement = {
  id: string;
  sku_id: string;
  product_id: string;
  quantity_delta: number;
  previous_quantity: number;
  new_quantity: number;
  reason_type: StockMovementRow["reason_type"];
  reference_id: string | null;
  actor_id: string | null;
  note: string | null;
  created_at: string;
  sku: { sku_code: string } | null;
  product: { name: string | null; thumbnail_url: string | null } | null;
};

export async function GET(request: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get("reason");
    const skuId = searchParams.get("sku_id");
    const search = searchParams.get("search");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

    const supabase = createAdminSupabaseClient();

    let query = supabase.from("stock_movements").select(
      `
        id,
        sku_id,
        product_id,
        quantity_delta,
        previous_quantity,
        new_quantity,
        reason_type,
        reference_id,
        actor_id,
        note,
        created_at,
        sku:shelf_skus(sku_code),
        product:shelf_products(name, thumbnail_url)
      `,
      { count: "exact" },
    );

    if (reason && REASONS.includes(reason))
      query = query.eq("reason_type", reason);
    if (skuId) query = query.eq("sku_id", skuId);
    if (from) query = query.gte("created_at", new Date(from).toISOString());
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      query = query.lte("created_at", end.toISOString());
    }
    if (search) {
      query = query.or(
        `sku.sku_code.ilike.%${search}%,product.name.ilike.%${search}%`,
      );
    }

    query = query.order("created_at", { ascending: false });

    const { data, error, count } = await query.range(
      (page - 1) * PAGE_SIZE,
      page * PAGE_SIZE - 1,
    );
    if (error) throw new Error(error.message);

    const raw = (data ?? []) as unknown as RawMovement[];

    // Batch-resolve actor names: stock_movements.actor_id references auth.users(id),
    // not profiles(id), so PostgREST cannot infer the join. Query profiles separately.
    const actorIds = [
      ...new Set(raw.map((m) => m.actor_id).filter(Boolean)),
    ] as string[];
    const actorNameMap = new Map<string, string | null>();
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds);
      for (const p of profiles ?? []) {
        if (p.id)
          actorNameMap.set(p.id, (p.full_name as string | null) ?? null);
      }
    }

    const movements: StockMovementRow[] = raw.map((movement) => ({
      id: movement.id,
      sku_id: movement.sku_id,
      product_id: movement.product_id,
      quantity_delta: movement.quantity_delta,
      previous_quantity: movement.previous_quantity,
      new_quantity: movement.new_quantity,
      reason_type: movement.reason_type,
      reference_id: movement.reference_id,
      actor_id: movement.actor_id,
      actor_name: movement.actor_id
        ? (actorNameMap.get(movement.actor_id) ?? null)
        : null,
      note: movement.note,
      created_at: movement.created_at,
      sku_code: movement.sku?.sku_code ?? null,
      product_name: movement.product?.name ?? null,
      product_thumbnail: movement.product?.thumbnail_url ?? null,
    }));

    return NextResponse.json({
      movements,
      total: count ?? movements.length,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
