import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, MapPin, ShieldCheck } from "lucide-react";
import ShopShell from "@/components/shop/ShopShell";
import PaymentPageClient from "./PaymentPageClient";
import { getCurrentUserProfile } from "@/lib/auth/server";
import { absoluteUrl } from "@/lib/site";
import { getSettings } from "@/lib/settings";
import { buildPublicBusinessProfile } from "@/lib/public-business";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { formatShopPrice } from "@/lib/shop/selection";
import { mapShopOrderRow, type ShopOrder } from "@/lib/shop/orders";
import { verifyGuestOrderAccess } from "@/lib/shop/guest-access";

export const dynamic = "force-dynamic";

type PaymentPageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export async function generateMetadata({
  params,
}: PaymentPageProps): Promise<Metadata> {
  const { orderId } = await params;
  return {
    title: "Secure Payment — 3D Shop",
    description:
      "Review your Flux3D order summary and complete payment through Razorpay Checkout.",
    alternates: { canonical: absoluteUrl(`/3d-shop/payment/${orderId}`) },
    robots: {
      index: false,
      follow: false,
    },
  };
}

async function getOrder(orderId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("shelf_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapShopOrderRow(data) : null;
}

function getPrimaryImage(order: ShopOrder) {
  return (
    order.items.find((item) => item.productThumbnail)?.productThumbnail ?? null
  );
}

const SHOP_GOLD_THEME = {
  accent: "#d4af37",
  accentFaint: "rgba(212, 175, 55, 0.05)",
  accentBorder: "rgba(212, 175, 55, 0.15)",
  accentText: "#d4af37",
  buttonBg: "#d4af37",
  buttonHoverBg: "#b5952f",
  buttonShadow: "0 8px 32px rgba(212, 175, 55, 0.2)",
  containerBorder: "rgba(255, 255, 255, 0.06)",
  containerBg: "rgba(10, 10, 10, 0.6)",
  containerRadius: "24px",
};

export default async function RazorpayShopPaymentPage({
  params,
  searchParams,
}: PaymentPageProps) {
  const { orderId } = await params;
  const { token: guestToken } = await searchParams;
  const auth = await getCurrentUserProfile();
  const order = await getOrder(orderId);
  if (!order) notFound();

  // Authorization: logged-in orders require the owner; guest orders (no
  // user_id) require the guest access token issued at checkout.
  let customerEmail = auth?.profile.email ?? "";
  if (order.user_id) {
    if (!auth || auth.profile.id !== order.user_id) {
      redirect(`/login?next=/3d-shop/payment/${encodeURIComponent(orderId)}`);
    }
  } else {
    const access = await verifyGuestOrderAccess(order.id, guestToken ?? "");
    if (!access) notFound();
    customerEmail =
      (order.payment_snapshot && typeof order.payment_snapshot === "object"
        ? String(
            (order.payment_snapshot as Record<string, unknown>).guestEmail ??
              "",
          )
        : "") || order.shipping_address.phone;
  }

  const isGuestOrder = !order.user_id;

  if (order.payment_status === "paid") {
    redirect(
      isGuestOrder
        ? `/3d-shop/track/${order.id}?token=${encodeURIComponent(guestToken ?? "")}`
        : `/3d-shop/order/${order.id}`,
    );
  }

  const settings = await getSettings();
  const profile = buildPublicBusinessProfile(settings);
  const primaryImage = getPrimaryImage(order);

  return (
    <ShopShell transparentNav>
      <main className="min-h-screen bg-[#050505] text-white selection:bg-[#d4af37]/30">
        <div className="relative w-full h-[45vh] lg:h-[50vh]">
          {primaryImage ? (
            <>
              <Image
                src={primaryImage}
                alt={order.items[0]?.productName || "3D Shop order item"}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-neutral-900 to-[#050505]" />
          )}

          <div className="absolute bottom-10 left-0 right-0 px-6 text-center">
            <h1 className="font-light tracking-[0.25em] uppercase text-[10px] text-neutral-400 mb-3">
              Checkout
            </h1>
            <div className="text-3xl md:text-4xl font-normal tracking-wide text-white">
              {order.items[0]?.productName || "Complete Payment"}
            </div>
          </div>
        </div>

        <div className="relative z-10 px-4 md:px-8 pb-24 mx-auto max-w-5xl -mt-2 lg:grid lg:grid-cols-[1fr_1.2fr] lg:gap-16 lg:-mt-12 lg:items-start">
          <section className="space-y-6 hidden lg:block">
            <div className="backdrop-blur-2xl bg-white/5 border border-white/5 rounded-[24px] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">
                  Shipping Details
                </h3>
                <MapPin className="w-4 h-4 text-[#d4af37]" />
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-neutral-500 tracking-wide">
                    Recipient
                  </span>
                  <span className="text-sm font-medium text-white text-right tracking-wide">
                    {order.shipping_address.name}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-neutral-500 tracking-wide">
                    Address
                  </span>
                  <span className="text-sm font-medium text-white text-right max-w-[200px] leading-relaxed tracking-wide">
                    {order.shipping_address.line1}
                    {order.shipping_address.line2
                      ? `, ${order.shipping_address.line2}`
                      : ""}
                    <br />
                    {order.shipping_address.city},{" "}
                    {order.shipping_address.state}{" "}
                    {order.shipping_address.pincode}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/3d-shop/cart"
              className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-neutral-500 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Cart
            </Link>
          </section>

          <aside
            className="mt-6 lg:mt-0"
            style={
              {
                "--shop-text-primary": "#ffffff",
                "--shop-text-muted": "#a3a3a3",
                "--shop-bg-base": "#050505",
              } as React.CSSProperties
            }
          >
            <PaymentPageClient
              orderId={order.id}
              createOrderEndpoint="/api/payments/razorpay/create-order"
              verifyEndpoint="/api/payments/razorpay/verify"
              statusEndpoint={`/api/payments/status/shop_order/${order.id}`}
              successHref={
                isGuestOrder
                  ? `/3d-shop/track/${order.id}?token=${encodeURIComponent(guestToken ?? "")}`
                  : `/3d-shop/order/${order.id}?payment=success`
              }
              orderNumber={order.order_number}
              amountPaise={Math.round(Number(order.total_amount) * 100)}
              currency="INR"
              title="Payment"
              subtitle=""
              supportEmail={profile.supportEmail}
              supportPhone={profile.supportPhone}
              authHeaders={
                isGuestOrder
                  ? { "x-guest-order-token": guestToken ?? "" }
                  : undefined
              }
              customer={{
                name: order.shipping_address.name,
                email: customerEmail,
                contact: order.shipping_address.phone,
              }}
              orderSummary={
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400 font-light tracking-wide">
                      Subtotal
                    </span>
                    <span className="text-white tracking-wide">
                      {formatShopPrice(order.subtotal)}
                    </span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex items-center justify-between text-sm text-[#d4af37]">
                      <span className="font-light tracking-wide">Discount</span>
                      <span className="tracking-wide">
                        -{formatShopPrice(order.discount_amount)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400 font-light tracking-wide">
                      Shipping
                    </span>
                    <span className="text-white tracking-wide">
                      {order.shipping_charge === 0
                        ? "Complimentary"
                        : formatShopPrice(order.shipping_charge)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-5 mt-5 border-t border-white/10">
                    <span className="text-xs font-semibold tracking-widest uppercase text-neutral-400">
                      Total
                    </span>
                    <span className="text-2xl font-light tracking-wider text-white">
                      {formatShopPrice(order.total_amount)}
                    </span>
                  </div>
                </div>
              }
              themeColor="#d4af37"
              theme={SHOP_GOLD_THEME}
            />
          </aside>

          <div className="mt-12 text-center lg:hidden">
            <Link
              href="/3d-shop/cart"
              className="inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" />
              Return to Cart
            </Link>
          </div>
        </div>
      </main>
    </ShopShell>
  );
}
