import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseFromMock = vi.fn();
const requireAdminPermissionMock = vi.fn();
const rateLimitResponseMock = vi.fn();

function makeChainableBuilder(result: { data: unknown[] | null; error: { message: string } | null }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve(result)),
  };
  return builder;
}

vi.mock("@/lib/admin/server", () => ({
  createAdminSupabaseClient: () => ({ from: supabaseFromMock }),
}));

vi.mock("@/lib/admin/permissions", () => ({
  requireAdminPermission: (...args: unknown[]) => requireAdminPermissionMock(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitResponse: (...args: unknown[]) => rateLimitResponseMock(...args),
}));

vi.mock("@/lib/admin/api", () => ({
  getAdminApiErrorResponse: (error: Error) =>
    new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }),
}));

import { GET } from "@/app/api/admin/customers/[id]/carts/route";

describe("GET /api/admin/customers/[id]/carts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminPermissionMock.mockResolvedValue({ user: { id: "admin-1" } });
    rateLimitResponseMock.mockResolvedValue({ success: true });
  });

  it("returns active carts grouped by shop and quote with an allowlisted payload", async () => {
    const builder = makeChainableBuilder({
      data: [
        {
          id: "shop-line-1",
          cart_type: "shop",
          quantity: 2,
          estimated_cost: "1499.50",
          payload: {
            productName: "Desk Organizer",
            thumbnail: "https://example.com/organizer.webp",
            skuCode: "ORG-BLK",
            variantLabel: "Color: Black",
            customizationText: "Add initials",
            secret: "must not be returned",
          },
          created_at: "2026-10-01T08:00:00Z",
          updated_at: "2026-10-02T08:00:00Z",
        },
        {
          id: "quote-line-1",
          cart_type: "quote",
          quantity: 3,
          material: "PLA",
          weight_grams: "124.5",
          estimated_cost: 899,
          payload: {
            name: "bracket.stl",
            quoteId: "Q-100",
            quoteVersionId: "version-1",
            color: "Red",
            infill: 25,
            layerHeight: 0.2,
            supports: true,
            estimatedTime: 1.5,
            dimensions: { x: 45, y: 20, z: 12 },
            fileUrl: "private/path",
          },
          created_at: "2026-10-01T09:00:00Z",
          updated_at: "2026-10-03T08:00:00Z",
        },
      ],
      error: null,
    });
    supabaseFromMock.mockReturnValue(builder);

    const response = await GET(new Request("http://localhost/api/admin/customers/customer-1/carts"), {
      params: Promise.resolve({ id: "customer-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(requireAdminPermissionMock).toHaveBeenCalledWith("customers.view");
    expect(builder.eq).toHaveBeenNthCalledWith(1, "user_id", "customer-1");
    expect(builder.eq).toHaveBeenNthCalledWith(2, "status", "active");
    expect(builder.in).toHaveBeenCalledWith("cart_type", ["shop", "quote"]);
    expect(builder.order).toHaveBeenCalledWith("updated_at", { ascending: false });

    expect(body.carts.shopCart).toMatchObject({
      summary: { lineCount: 1, quantityTotal: 2, estimatedSubtotal: 1499.5 },
      items: [{
        id: "shop-line-1",
        productName: "Desk Organizer",
        skuCode: "ORG-BLK",
        customizationText: "Add initials",
      }],
    });
    expect(body.carts.quoteCart).toMatchObject({
      summary: { lineCount: 1, quantityTotal: 3, estimatedSubtotal: 899 },
      items: [{
        id: "quote-line-1",
        name: "bracket.stl",
        quoteId: "Q-100",
        material: "PLA",
        dimensions: { x: 45, y: 20, z: 12 },
      }],
    });
    expect(body.carts.shopCart.items[0]).not.toHaveProperty("secret");
    expect(body.carts.quoteCart.items[0]).not.toHaveProperty("fileUrl");
  });

  it("uses safe fallbacks for malformed optional payload data", async () => {
    const builder = makeChainableBuilder({
      data: [
        {
          id: "quote-line-1",
          cart_type: "quote",
          quantity: null,
          material: null,
          weight_grams: "not-a-number",
          estimated_cost: "not-a-number",
          payload: { name: "", infill: "bad", dimensions: { x: 1, y: "bad", z: 3 } },
          created_at: null,
          updated_at: null,
        },
      ],
      error: null,
    });
    supabaseFromMock.mockReturnValue(builder);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "customer-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.carts.quoteCart.items[0]).toMatchObject({
      name: "Untitled print",
      quantity: 1,
      estimatedCost: 0,
      material: null,
      weightGrams: null,
      dimensions: null,
    });
  });

  it("returns the authorization response without querying carts", async () => {
    requireAdminPermissionMock.mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "customer-1" }),
    });

    expect(response.status).toBe(403);
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it("returns a controlled error when the cart query fails", async () => {
    const builder = makeChainableBuilder({
      data: null,
      error: { message: "database unavailable" },
    });
    supabaseFromMock.mockReturnValue(builder);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "customer-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("database unavailable");
  });
});
