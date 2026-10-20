import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { requireAdminUser } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { orderId: string };

type Customer = {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
};

function getCustomer(order: {
  customers?: Customer | Customer[] | null;
}): Customer {
  return Array.isArray(order.customers)
    ? (order.customers[0] ?? {})
    : (order.customers ?? {});
}

function indianMobileNumber(phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  const mobile = digits.slice(-10);
  return mobile.length === 10 ? mobile : null;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<Params> },
) {
  try {
    await requireAdminUser();
    const { orderId } = await params;
    const supabase = createAdminClient();

    // This admin page is backed by the unified OMS, not the legacy
    // custom_orders table. Read from OMS so the UUID and amount match the UI.
    const { data: order, error: orderError } = await supabase
      .from("oms_orders")
      .select(
        "id, order_number, payment_status, total_amount, amount_paid, amount_due, customers(full_name, phone, email)",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) throw new Error(orderError.message);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const amountDue = Number(order.amount_due);
    if (!Number.isFinite(amountDue) || amountDue <= 0) {
      return NextResponse.json(
        { error: "This order has no outstanding balance to collect." },
        { status: 422 },
      );
    }

    const customer = getCustomer(order);
    const contact = indianMobileNumber(customer.phone);
    if (!contact) {
      return NextResponse.json(
        {
          error:
            "A valid customer mobile number is required to create a payment link.",
        },
        { status: 422 },
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay keys are not configured." },
        { status: 503 },
      );
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const paymentLink = await razorpay.paymentLink.create({
      amount: Math.round(amountDue * 100),
      currency: "INR",
      accept_partial: false,
      description: `Payment for Flux3D order ${order.order_number}`,
      customer: {
        name: customer.full_name?.trim() || "Flux3D customer",
        contact,
        ...(customer.email?.trim() ? { email: customer.email.trim() } : {}),
      },
      notify: { sms: true, email: Boolean(customer.email?.trim()) },
      reminder_enable: true,
      reference_id: `OMS-${order.order_number}`.slice(0, 40),
      notes: {
        order_id: order.id,
        order_number: order.order_number,
        order_type: "oms_custom_order",
      },
    } as never);

    return NextResponse.json({
      paymentLink: paymentLink.short_url,
      paymentLinkId: paymentLink.id,
      amountPaise: Math.round(amountDue * 100),
    });
  } catch (error: unknown) {
    console.error("Create OMS payment link error:", error);
    const message =
      error instanceof Error ? error.message : "Unable to create payment link.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
