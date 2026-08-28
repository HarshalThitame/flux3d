import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/meta/config", () => ({
  getMetaApiHeaders: () => ({
    Authorization: "Bearer test-token",
    "Content-Type": "application/json",
  }),
  getMetaAdAccountId: () => "act_123456",
  getMetaGraphBase: () => "https://graph.facebook.com/v22.0",
  getMetaCatalogId: () => "catalog-123",
  getMetaPixelId: () => "pixel-123",
  getMetaApiVersion: () => "v22.0",
}));

vi.mock("@/lib/logger", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn((table: string) => {
        if (table === "shelf_products") {
          const builder: Record<string, ReturnType<typeof vi.fn>> = {
            select: vi.fn(() => builder),
            eq: vi.fn(() => builder),
            ilike: vi.fn(() => builder),
            order: vi.fn(() => builder),
            limit: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: "prod-1",
                    name: "Test Vase",
                    slug: "test-vase",
                    thumbnail_url: "https://example.com/vase.jpg",
                    base_price: 500,
                    shelf_skus: [
                      {
                        sku_code: "SKU-1",
                        price: 600,
                        variant_image_url: "https://example.com/vase-red.jpg",
                        is_available: true,
                      },
                    ],
                  },
                ],
                error: null,
              }),
            ),
          };
          return builder;
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({ data: null, error: null }),
              ),
            })),
          })),
        };
      }),
    }),
  ),
}));

import {
  createCampaign,
  createAdSet,
  createCarouselCreative,
  createAd,
  createPausedCarouselCampaign,
  createPausedDPARetargetingCampaign,
  updateCampaignStatus,
  updateCampaignBudget,
  updateCampaignName,
  deleteCampaign,
  getCampaignInsights,
  listCampaigns,
  fetchNewArrivalProductsForAd,
  type CarouselCard,
} from "@/lib/meta/marketing-api";

function makeJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function makeErrorResponse(message: string, status = 400) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: { message } }),
  } as Response;
}

describe("marketing-api", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // ─── Campaign ─────────────────────────────────────────────────────────────

  describe("createCampaign", () => {
    it("creates a campaign and returns the id", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ id: "camp-1" }));

      const result = await createCampaign({
        name: "Test Campaign",
        objective: "OUTCOME_SALES",
        status: "PAUSED",
      });

      expect(result.id).toBe("camp-1");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0] as unknown[];
      expect(call[0]).toContain("/act_123456/campaigns");
      expect(call[1]).toMatchObject({ method: "POST" });
    });

    it("throws on Meta API error", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse("Invalid parameter", 400));

      await expect(
        createCampaign({
          name: "Test",
          objective: "OUTCOME_SALES",
          status: "PAUSED",
        }),
      ).rejects.toThrow("Invalid parameter");
    });
  });

  describe("listCampaigns", () => {
    it("returns campaign list from Meta", async () => {
      mockFetch.mockResolvedValue(
        makeJsonResponse({
          data: [
            {
              id: "camp-1",
              name: "Campaign 1",
              objective: "OUTCOME_SALES",
              status: "ACTIVE",
              effective_status: "ACTIVE",
              created_time: "2024-01-01",
              updated_time: "2024-01-02",
            },
          ],
        }),
      );

      const result = await listCampaigns();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("camp-1");
    });

    it("returns empty array when Meta returns no data", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({}));
      const result = await listCampaigns();
      expect(result).toEqual([]);
    });
  });

  // ─── Ad Set ───────────────────────────────────────────────────────────────

  describe("createAdSet", () => {
    it("creates an ad set with targeting", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ id: "as-1" }));

      const result = await createAdSet({
        campaignId: "camp-1",
        name: "Test AdSet",
        dailyBudgetPaise: 15000,
        pixelId: "pixel-123",
        targeting: { geo_locations: { countries: ["IN"] } },
      });

      expect(result.id).toBe("as-1");
    });
  });

  // ─── Creative ─────────────────────────────────────────────────────────────

  describe("createCarouselCreative", () => {
    it("creates a carousel creative with cards", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ id: "cr-1" }));

      const cards: CarouselCard[] = [
        {
          link: "https://flux3d.in/1",
          picture: "https://img/1.jpg",
          name: "Product 1",
          description: "₹100",
        },
      ];

      const result = await createCarouselCreative({
        name: "Test Creative",
        pageId: "page-1",
        link: "https://flux3d.in",
        message: "Shop now",
        cards,
      });

      expect(result.id).toBe("cr-1");
    });
  });

  // ─── Ad ───────────────────────────────────────────────────────────────────

  describe("createAd", () => {
    it("creates an ad linking creative to ad set", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ id: "ad-1" }));

      const result = await createAd({
        adsetId: "as-1",
        name: "Test Ad",
        creativeId: "cr-1",
        status: "PAUSED",
      });

      expect(result.id).toBe("ad-1");
    });
  });

  // ─── Orchestration ────────────────────────────────────────────────────────

  describe("createPausedCarouselCampaign", () => {
    it("orchestrates campaign → adset → creative → ad creation", async () => {
      const responses = [
        makeJsonResponse({ id: "camp-1" }),
        makeJsonResponse({ id: "as-1" }),
        makeJsonResponse({ id: "cr-1" }),
        makeJsonResponse({ id: "ad-1" }),
      ];
      let i = 0;
      mockFetch.mockImplementation(() => Promise.resolve(responses[i++]));

      const cards: CarouselCard[] = [
        {
          link: "https://flux3d.in/1",
          picture: "https://img/1.jpg",
          name: "Product 1",
          description: "₹100",
        },
      ];

      const result = await createPausedCarouselCampaign({
        campaignName: "Test Carousel",
        adSetName: "Test AdSet",
        adName: "Test Ad",
        creativeName: "Test Creative",
        dailyBudgetPaise: 15000,
        pageId: "page-1",
        siteUrl: "https://flux3d.in",
        message: "Shop now",
        cards,
      });

      expect(result.campaignId).toBe("camp-1");
      expect(result.adSetId).toBe("as-1");
      expect(result.creativeId).toBe("cr-1");
      expect(result.adId).toBe("ad-1");
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it("throws when creative creation fails", async () => {
      const responses = [
        makeJsonResponse({ id: "camp-1" }),
        makeJsonResponse({ id: "as-1" }),
        makeErrorResponse("Creative error", 500),
      ];
      let i = 0;
      mockFetch.mockImplementation(() => Promise.resolve(responses[i++]));

      const cards: CarouselCard[] = [
        {
          link: "https://flux3d.in/1",
          picture: "https://img/1.jpg",
          name: "Product 1",
          description: "₹100",
        },
      ];

      await expect(
        createPausedCarouselCampaign({
          campaignName: "Test",
          adSetName: "Test",
          adName: "Test",
          creativeName: "Test",
          dailyBudgetPaise: 15000,
          pageId: "page-1",
          siteUrl: "https://flux3d.in",
          message: "Shop",
          cards,
        }),
      ).rejects.toThrow();
    });
  });

  describe("createPausedDPARetargetingCampaign", () => {
    it("creates a DPA retargeting campaign", async () => {
      const responses = [
        makeJsonResponse({ data: [{ id: "ps-dpa-1", name: "All Products" }] }),
        makeJsonResponse({ id: "camp-dpa-1" }),
        makeJsonResponse({ id: "as-dpa-1" }),
        makeJsonResponse({ id: "cr-dpa-1" }),
        makeJsonResponse({ id: "ad-dpa-1" }),
      ];
      let i = 0;
      mockFetch.mockImplementation(() => Promise.resolve(responses[i++]));

      const result = await createPausedDPARetargetingCampaign({
        campaignName: "DPA Test",
        adSetName: "DPA AdSet",
        adName: "DPA Ad",
        creativeName: "DPA Creative",
        dailyBudgetPaise: 7500,
        pageId: "page-1",
        siteUrl: "https://flux3d.in",
        message: "Come back",
      });

      expect(result.campaignId).toBe("camp-dpa-1");
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });
  });

  // ─── Updates ──────────────────────────────────────────────────────────────

  describe("updateCampaignStatus", () => {
    it("posts status update to Meta", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ success: true }));

      await updateCampaignStatus("camp-1", "ACTIVE");
      const call = mockFetch.mock.calls[0] as unknown[];
      expect(call[0]).toContain("/camp-1");
      expect(call[1]).toMatchObject({
        method: "POST",
        body: JSON.stringify({ status: "ACTIVE" }),
      });
    });
  });

  describe("updateCampaignBudget", () => {
    it("posts budget update to Meta", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ success: true }));

      await updateCampaignBudget("camp-1", 20000);
      const call = mockFetch.mock.calls[0] as unknown[];
      expect(call[1]).toMatchObject({
        method: "POST",
        body: JSON.stringify({ daily_budget: 20000 }),
      });
    });
  });

  describe("updateCampaignName", () => {
    it("posts name update to Meta", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ success: true }));

      await updateCampaignName("camp-1", "New Name");
      const call = mockFetch.mock.calls[0] as unknown[];
      expect(call[1]).toMatchObject({
        method: "POST",
        body: JSON.stringify({ name: "New Name" }),
      });
    });
  });

  describe("deleteCampaign", () => {
    it("deletes a campaign via Meta API", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({ success: true }));

      await deleteCampaign("camp-1");
      const call = mockFetch.mock.calls[0] as unknown[];
      expect(call[1]).toMatchObject({ method: "DELETE" });
    });
  });

  // ─── Insights ─────────────────────────────────────────────────────────────

  describe("getCampaignInsights", () => {
    it("returns insights for given campaign IDs", async () => {
      mockFetch.mockResolvedValue(
        makeJsonResponse({
          data: [
            {
              campaign_id: "camp-1",
              campaign_name: "Test",
              spend: "100",
              impressions: "1000",
              clicks: "50",
              ctr: "5",
              cpc: "2",
              conversions: "2",
              cost_per_conversion: "50",
            },
          ],
        }),
      );

      const result = await getCampaignInsights(["camp-1"], "last_7d");
      expect(result).toHaveLength(1);
      expect(result[0].spend).toBe("100");
    });

    it("returns empty array when no data", async () => {
      mockFetch.mockResolvedValue(makeJsonResponse({}));
      const result = await getCampaignInsights(["camp-1"]);
      expect(result).toEqual([]);
    });
  });

  // ─── Product fetcher ────────────────────────────────────────────────────────

  describe("fetchNewArrivalProductsForAd", () => {
    it("returns product cards with SKUs", async () => {
      const { createServerClient } = await import("@/lib/supabase/server");
      const supabase = await createServerClient();

      const result = await fetchNewArrivalProductsForAd(
        supabase,
        "Home Decor",
        10,
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        skuCode: "SKU-1",
        name: "Test Vase",
        price: 600,
        categoryName: "Home Decor",
      });
    });
  });

  // ─── Retry logic ──────────────────────────────────────────────────────────

  describe("retry behavior", () => {
    it("retries up to 3 times on 500 errors and then throws", async () => {
      mockFetch
        .mockResolvedValueOnce(makeErrorResponse("Internal error", 500))
        .mockResolvedValueOnce(makeErrorResponse("Internal error", 500))
        .mockResolvedValueOnce(makeErrorResponse("Internal error", 500));

      await expect(listCampaigns()).rejects.toThrow("Internal error");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("retries on 429 and succeeds on second attempt", async () => {
      mockFetch
        .mockResolvedValueOnce(makeErrorResponse("Rate limited", 429))
        .mockResolvedValueOnce(
          makeJsonResponse({
            data: [
              {
                id: "camp-1",
                name: "Test",
                objective: "SALES",
                status: "ACTIVE",
                effective_status: "ACTIVE",
                created_time: "2024-01-01",
                updated_time: "2024-01-02",
              },
            ],
          }),
        );

      const result = await listCampaigns();
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Error extraction ───────────────────────────────────────────────────────

  describe("error extraction", () => {
    it("extracts error_user_msg when present", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: { error_user_msg: "Please use a valid page ID." },
          }),
      } as Response);

      await expect(listCampaigns()).rejects.toThrow(
        "Please use a valid page ID.",
      );
    });

    it("falls back to full JSON when no message field exists", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ unexpected: "format" }),
      } as Response);

      await expect(listCampaigns()).rejects.toThrow('{"unexpected":"format"}');
    });
  });
});
