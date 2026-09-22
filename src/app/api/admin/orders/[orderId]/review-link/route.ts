import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/server";
import { generateTestimonialLink } from "@/lib/testimonials/generate-link";

type Params = { orderId: string };

const VALID_ORDER_TYPES = ["shop", "custom", "custom_order"] as const;
type ValidOrderType = (typeof VALID_ORDER_TYPES)[number];

function normaliseOrderType(raw: unknown): "shop" | "custom_order" | null {
  if (!VALID_ORDER_TYPES.includes(raw as ValidOrderType)) return null;
  // 'custom' and 'custom_order' both map to 'custom_order' for the new schema
  return raw === "shop" ? "shop" : "custom_order";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const auth = await requireAdminUser();
    const { orderId } = await params;

    const body = (await req.json()) as {
      orderType?: unknown;
      customerName?: unknown;
      customerEmail?: unknown;
      customerPhone?: unknown;
    };

    const orderType = normaliseOrderType(body.orderType);
    if (!orderType) {
      return NextResponse.json({ error: "Invalid orderType" }, { status: 400 });
    }

    const customerName =
      typeof body.customerName === "string" ? body.customerName : null;
    const customerEmail =
      typeof body.customerEmail === "string" ? body.customerEmail : null;
    const customerPhone =
      typeof body.customerPhone === "string" ? body.customerPhone : null;

    const result = await generateTestimonialLink({
      orderId,
      orderType,
      createdByAdminId: auth.user.id,
      customerName,
      customerEmail,
      customerPhone,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Create testimonial link error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
