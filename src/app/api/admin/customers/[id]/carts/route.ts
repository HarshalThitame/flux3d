import { NextResponse } from "next/server";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { requireAdminPermission } from "@/lib/admin/permissions";
import { rateLimitResponse } from "@/lib/rate-limit";

type CartPayload = Record<string, unknown>;

type CartLine = {
  id: string;
  quantity: number;
  estimatedCost: number;
  createdAt: string | null;
  updatedAt: string | null;
};

type CartSummary = {
  lineCount: number;
  quantityTotal: number;
  estimatedSubtotal: number;
};

function isRecord(value: unknown): value is CartPayload {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readQuantity(value: unknown): number {
  return Math.max(1, Math.floor(readNumber(value) ?? 1));
}

function readCost(value: unknown): number {
  return Number((readNumber(value) ?? 0).toFixed(2));
}

function readDimensions(value: unknown) {
  if (!isRecord(value)) return null;

  const x = readNumber(value.x);
  const y = readNumber(value.y);
  const z = readNumber(value.z);
  if (x === null || y === null || z === null) return null;

  return { x, y, z };
}

function createSummary(lines: CartLine[]): CartSummary {
  return {
    lineCount: lines.length,
    quantityTotal: lines.reduce((total, line) => total + line.quantity, 0),
    estimatedSubtotal: Number(
      lines.reduce((total, line) => total + line.estimatedCost, 0).toFixed(2),
    ),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminPermission("customers.view");
  if ('response' in auth) return auth.response;

  const rateLimit = await rateLimitResponse(request, {
    prefix: "admin_customer_carts_get",
    windowSeconds: 60,
    maxRequests: 120,
    userId: auth.user.id,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  try {
    const { id: userId } = await context.params;
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("cart_items")
      .select(
        "id, cart_type, quantity, material, weight_grams, estimated_cost, payload, created_at, updated_at",
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .in("cart_type", ["shop", "quote"])
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    const shopItems: Array<
      CartLine & {
        productName: string;
        thumbnail: string | null;
        skuCode: string | null;
        variantLabel: string | null;
        customizationText: string | null;
      }
    > = [];
    const quoteItems: Array<
      CartLine & {
        name: string;
        quoteId: string | null;
        quoteVersionId: string | null;
        material: string | null;
        color: string | null;
        infill: number | null;
        layerHeight: number | null;
        supports: boolean | null;
        weightGrams: number | null;
        estimatedHours: number | null;
        dimensions: { x: number; y: number; z: number } | null;
      }
    > = [];

    for (const row of data ?? []) {
      const payload = isRecord(row.payload) ? row.payload : {};
      const line: CartLine = {
        id: String(row.id),
        quantity: readQuantity(row.quantity),
        estimatedCost: readCost(row.estimated_cost),
        createdAt: readString(row.created_at),
        updatedAt: readString(row.updated_at),
      };

      if (row.cart_type === "shop") {
        shopItems.push({
          ...line,
          productName: readString(payload.productName) ?? "Unnamed product",
          thumbnail: readString(payload.thumbnail),
          skuCode: readString(payload.skuCode),
          variantLabel: readString(payload.variantLabel),
          customizationText: readString(payload.customizationText),
        });
        continue;
      }

      if (row.cart_type === "quote") {
        const fileName = readString(payload.fileName);
        quoteItems.push({
          ...line,
          name: readString(payload.name) ?? fileName ?? "Untitled print",
          quoteId: readString(payload.quoteId),
          quoteVersionId: readString(payload.quoteVersionId),
          material: readString(row.material) ?? readString(payload.material),
          color: readString(payload.color),
          infill: readNumber(payload.infill),
          layerHeight: readNumber(payload.layerHeight),
          supports: readBoolean(payload.supports),
          weightGrams: readNumber(row.weight_grams) ?? readNumber(payload.weight),
          estimatedHours: readNumber(payload.estimatedTime),
          dimensions: readDimensions(payload.dimensions),
        });
      }
    }

    return NextResponse.json({
      carts: {
        shopCart: { summary: createSummary(shopItems), items: shopItems },
        quoteCart: { summary: createSummary(quoteItems), items: quoteItems },
      },
    });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
