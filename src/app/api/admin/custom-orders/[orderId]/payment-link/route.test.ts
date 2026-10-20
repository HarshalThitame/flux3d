import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseFromMock = vi.fn();
const paymentLinkCreateMock = vi.fn();

vi.mock("@/lib/admin/server", () => ({
  requireAdminUser: vi.fn().mockResolvedValue({ user: { id: "admin-1" } }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: supabaseFromMock }),
}));

vi.mock("razorpay", () => ({
  default: class MockRazorpay {
    paymentLink = { create: paymentLinkCreateMock };
  },
}));

import { POST } from "@/app/api/admin/custom-orders/[orderId]/payment-link/route";

function orderQuery(order: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve({ data: order, error: null })),
  };
  return builder;
}

describe("POST /api/admin/custom-orders/[orderId]/payment-link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "test_secret";
  });

  it("creates a payment link from the OMS order's outstanding balance", async () => {
    const builder = orderQuery({
      id: "4edd671a-c3cc-4dd9-9f38-acc1376f1070",
      order_number: "FXD-2026-001009",
      amount_due: "840.00",
      customers: {
        full_name: "Customer",
        phone: "+91 98765 43210",
        email: null,
      },
    });
    supabaseFromMock.mockReturnValue(builder);
    paymentLinkCreateMock.mockResolvedValue({
      id: "plink_123",
      short_url: "https://rzp.io/i/example",
    });

    const response = await POST(
      new Request(
        "http://localhost/api/admin/custom-orders/4edd671a-c3cc-4dd9-9f38-acc1376f1070/payment-link",
      ),
      {
        params: Promise.resolve({
          orderId: "4edd671a-c3cc-4dd9-9f38-acc1376f1070",
        }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      paymentLink: "https://rzp.io/i/example",
      paymentLinkId: "plink_123",
      amountPaise: 84000,
    });
    expect(supabaseFromMock).toHaveBeenCalledWith("oms_orders");
    expect(paymentLinkCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 84000,
        reference_id: "OMS-FXD-2026-001009",
        customer: expect.objectContaining({ contact: "9876543210" }),
      }),
    );
  });

  it("does not create a link when the OMS order is fully paid", async () => {
    supabaseFromMock.mockReturnValue(
      orderQuery({
        id: "order-1",
        order_number: "FXD-2026-001010",
        amount_due: "0",
        customers: { full_name: "Customer", phone: "9876543210" },
      }),
    );

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ orderId: "order-1" }),
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "This order has no outstanding balance to collect.",
    });
    expect(paymentLinkCreateMock).not.toHaveBeenCalled();
  });
});
