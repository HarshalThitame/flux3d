import "server-only";
import { createHash } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { getCheckoutSettings } from "@/lib/settings";
import { buildShopPricingSnapshot, calculateCouponDiscount, type ShopCouponResult } from "@/lib/shop/pricing";
import { calculateShippingFromRules } from "@/lib/shop/shipping";
import { groupRulesByProduct, resolveCartUnitPrice, type CartPriceRule } from "@/lib/shop/cart-price-rules";
import type { ShopOrderItem, ShopShippingAddress } from "@/lib/shop/orders";
import { calculateShopMoney, promotionDiscountPaise, toPaise } from "./financials";
import type { PlaceOrderItemInput } from "./place-order";
import type { ShopQuote } from "./quote-types";

function assertPromotionApplicable(promotion: Record<string, unknown>, items: ShopOrderItem[], products: Map<string, Record<string, unknown>>) {
  const token = (v: unknown) => String(v ?? "").trim().toLowerCase();
  const categories = items.flatMap(item => { const p = products.get(item.productId); const c = p?.category as Record<string, unknown> | null; return [p?.category_id, c?.id, c?.name, c?.slug]; });
  const candidates: Record<string, unknown[]> = {
    applicable_products: items.flatMap(item => [item.productId, item.productSlug, item.productName]),
    applicable_categories: categories,
    applicable_materials: items.flatMap(item => Object.values(item.variantCombination)),
  };
  for (const [key, values] of Object.entries(candidates)) {
    const required = promotion[key];
    if (Array.isArray(required) && required.length && !required.some(v => values.some(c => token(c) === token(v)))) {
      throw new Error("This promotion does not apply to these products.");
    }
  }
}

type SkuSnapshot = {
  id: string;
  product_id: string;
  sku_code?: string;
  price: number | string;
  stock_quantity: number | string;
  is_available: boolean | null;
  weight_grams: number | string | null;
  variant_combination?: Record<string, string | boolean> | null;
  variant_label?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOrderItems(value: unknown): PlaceOrderItemInput[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw new Error("Your cart is empty.");
  }

  return value.map((entry) => {
    if (!isRecord(entry)) throw new Error("Invalid cart item.");

    const productId = normalizeText(entry.productId);
    const skuId = normalizeText(entry.skuId);
    const quantity = Number(entry.quantity);

    if (!productId || !skuId) throw new Error("Invalid cart item.");
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 10000)
      throw new Error("Invalid item quantity.");

    return {
      productId,
      skuId,
      quantity,
      customizationText:
        typeof entry.customizationText === "string"
          ? entry.customizationText.trim() || null
          : null,
    };
  });
}

export function normalizeShippingAddress(value: unknown): ShopShippingAddress {
  if (!isRecord(value)) throw new Error("Delivery address is required.");

  const address: ShopShippingAddress = {
    name: normalizeText(value.name),
    phone: normalizeText(value.phone).replace(/\D/g, ""),
    line1: normalizeText(value.line1),
    line2: normalizeText(value.line2) || null,
    city: normalizeText(value.city),
    state: normalizeText(value.state),
    pincode: normalizeText(value.pincode).replace(/\D/g, ""),
  };

  if (!address.name || !address.line1 || !address.city || !address.state) {
    throw new Error("Complete delivery address is required.");
  }

  if (!/^\d{10}$/.test(address.phone)) {
    throw new Error("Enter a valid 10 digit phone number.");
  }

  if (!/^\d{6}$/.test(address.pincode)) {
    throw new Error("Enter a valid 6 digit pincode.");
  }

  return address;
}

function isLimitReached(limit: unknown, used: unknown) {
  const usageLimit = Number(limit);
  if (!Number.isFinite(usageLimit) || usageLimit <= 0) return false;
  return Number(used ?? 0) >= usageLimit;
}

async function promotionUsage(supabase: ReturnType<typeof createAdminSupabaseClient>, table: "coupons" | "offers", id: string, userId: string) {
  const [reservations, redemptions] = await Promise.all([
    supabase.from("shop_promotion_reservations").select("order_id,released_at")
      .eq("source_table", table).eq("promotion_id", id).eq("user_id", userId),
    supabase.from("redemptions").select("order_id")
      .eq(table === "offers" ? "offer_id" : "coupon_id", id).eq("user_id", userId),
  ]);
  if (reservations.error || redemptions.error) throw new Error("Unable to verify promotion usage. Please retry.");
  const versionedOrders = new Set((reservations.data ?? []).map(row => row.order_id));
  return (reservations.data ?? []).filter(row => !row.released_at).length +
    (redemptions.data ?? []).filter(row => !versionedOrders.has(row.order_id)).length;
}

async function validateCouponCode(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  couponCode: string,
  subtotal: number,
  userId: string | null,
  items: ShopOrderItem[],
  products: Map<string, Record<string, unknown>>,
): Promise<ShopCouponResult | null> {
  const code = couponCode.trim().toUpperCase();
  if (!code) return null;

  const today = new Date().toISOString().slice(0, 10);
  const { data: shopCoupon, error: shopCouponError } = await supabase
    .from("shelf_coupons")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (shopCouponError) throw new Error(shopCouponError.message);

  if (shopCoupon) {
    assertPromotionApplicable(shopCoupon, items, products);
    if (!shopCoupon.is_active)
      throw new Error("This coupon is no longer active.");
    if (shopCoupon.valid_from && today < shopCoupon.valid_from)
      throw new Error("This coupon is not yet valid.");
    if (shopCoupon.valid_until && today > shopCoupon.valid_until)
      throw new Error("This coupon has expired.");
    if (isLimitReached(shopCoupon.max_uses, shopCoupon.used_count)) {
      throw new Error("This coupon has reached its usage limit.");
    }
    if (subtotal < Number(shopCoupon.min_order_value ?? 0)) {
      throw new Error(
        `Minimum order value of ₹${Number(shopCoupon.min_order_value ?? 0).toFixed(0)} required.`,
      );
    }

    const discountType = String(shopCoupon.discount_type).toLowerCase() as
      "percentage" | "fixed_amount" | "free_shipping";
    const discountValue = Number(shopCoupon.discount_value ?? 0);
    const freeShipping = discountType === "free_shipping";
    const calculatedDiscount = freeShipping
      ? 0
      : calculateCouponDiscount(subtotal, {
          discount_type: discountType,
          discount_value: discountValue,
          max_discount: shopCoupon.max_discount ?? null,
        });

    return {
      code,
      discountType: freeShipping ? "free_shipping" : discountType,
      discountValue,
      maxDiscount: shopCoupon.max_discount ?? null,
      calculatedDiscount,
      freeShipping,
      couponId: shopCoupon.id,
      sourceTable: "shelf_coupons",
    };
  }

  const { data: coupon, error: couponError } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (couponError) throw new Error(couponError.message);
  if (!coupon) throw new Error("Invalid coupon code.");
  assertPromotionApplicable(coupon, items, products);

  const now = new Date().toISOString();
  if (!coupon.is_active) throw new Error("This coupon is no longer active.");
  if (coupon.starts_at && now < coupon.starts_at)
    throw new Error("This coupon is not yet valid.");
  if (coupon.expires_at && now > coupon.expires_at)
    throw new Error("This coupon has expired.");
  if (isLimitReached(coupon.usage_limit, coupon.used_count)) {
    throw new Error("This coupon has reached its usage limit.");
  }
  if (subtotal < Number(coupon.min_order_value ?? 0)) {
    throw new Error(
      `Minimum order value of ₹${Number(coupon.min_order_value ?? 0).toFixed(0)} required.`,
    );
  }

  if (coupon.usage_per_user && userId) {
    const count = await promotionUsage(supabase, "coupons", coupon.id, userId);
    if (count && count >= Number(coupon.usage_per_user)) {
      throw new Error(
        "You have already used this coupon the maximum number of times.",
      );
    }
  }

  if ((coupon.first_order_only || coupon.usage_per_user) && !userId) throw new Error("Sign in to use this coupon.");
  if (coupon.first_order_only && userId) {
    const { count, error: usageError } = await supabase
      .from("shelf_orders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (usageError) throw new Error("Unable to verify promotion usage. Please retry.");
    if (count && count > 0)
      throw new Error("This coupon is for first-time orders only.");
  }

  const discountType = String(coupon.discount_type).toLowerCase() as
    "percentage" | "fixed_amount" | "free_shipping";
  const discountValue = Number(coupon.discount_value ?? 0);
  const freeShipping = discountType === "free_shipping";
  const calculatedDiscount = freeShipping
    ? 0
    : calculateCouponDiscount(subtotal, {
        discount_type: discountType,
        discount_value: discountValue,
        max_discount: coupon.max_discount ?? null,
      });

  return {
    code,
    discountType: freeShipping ? "free_shipping" : discountType,
    discountValue,
    maxDiscount: coupon.max_discount ?? null,
    calculatedDiscount,
    freeShipping,
    couponId: coupon.id,
    sourceTable: "coupons",
  };
}

async function validateOfferId(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  offerId: string,
  orderAmount: number,
  userId: string | null,
  items: ShopOrderItem[],
  products: Map<string, Record<string, unknown>>,
): Promise<ShopCouponResult | null> {
  const id = offerId.trim();
  if (!id) return null;

  const now = new Date().toISOString();
  const { data: offer, error } = await supabase
    .from("offers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!offer) throw new Error("Invalid offer code.");
  assertPromotionApplicable(offer, items, products);

  if (!offer.is_active) throw new Error("This offer is no longer active.");
  if (offer.starts_at && now < offer.starts_at)
    throw new Error("This offer is not yet valid.");
  if (offer.ends_at && now > offer.ends_at)
    throw new Error("This offer has expired.");
  if (isLimitReached(offer.usage_limit, offer.used_count)) {
    throw new Error("This offer has reached its usage limit.");
  }
  if (orderAmount < Number(offer.min_order_value ?? 0)) {
    throw new Error(
      `Minimum order value of ₹${Number(offer.min_order_value ?? 0).toFixed(0)} required.`,
    );
  }

  if (offer.usage_per_user && !userId) throw new Error("Sign in to use this offer.");
  if (offer.usage_per_user && userId) {
    const count = await promotionUsage(supabase, "offers", offer.id, userId);
    if (count && count >= Number(offer.usage_per_user)) {
      throw new Error(
        "You have already used this offer the maximum number of times.",
      );
    }
  }

  const discountType = String(offer.offer_type).toLowerCase() as
    "percentage" | "fixed_amount" | "free_shipping" | "buy_x_get_y";
  const discountValue = Number(offer.discount_value ?? 0);
  const freeShipping = discountType === "free_shipping";
  const calculatedDiscount =
    freeShipping || discountType === "buy_x_get_y"
      ? 0
      : calculateCouponDiscount(orderAmount, {
          discount_type: discountType,
          discount_value: discountValue,
          max_discount: offer.max_discount ?? null,
        });

  return {
    code: id,
    discountType: freeShipping ? "free_shipping" : discountType,
    discountValue,
    maxDiscount: offer.max_discount ?? null,
    calculatedDiscount,
    freeShipping,
    offerId: offer.id,
    sourceTable: "offers",
  };
}


export async function quoteShopOrder(input: { items: PlaceOrderItemInput[]; userId?: string | null; couponCode?: string | null; appliedOfferId?: string | null; destination?: { pincode: string; state: string } | null }): Promise<ShopQuote> {
  const supabase = createAdminSupabaseClient();
  const settings = await getCheckoutSettings();
  const rawItems = normalizeOrderItems(input.items);
  const userId = input.userId ?? null;
  const skuIds = Array.from(new Set(rawItems.map((item) => item.skuId)));
  const { data: skuRows, error: skuError } = await supabase
    .from("shelf_skus")
    .select(
      "id, product_id, sku_code, variant_combination, price, stock_quantity, is_available, weight_grams",
    )
    .in("id", skuIds);

  if (skuError) throw new Error(skuError.message);

  const skusById = new Map(
    (skuRows ?? []).map((sku) => [sku.id, sku as SkuSnapshot]),
  );
  const skuProductIds = Array.from(
    new Set(
      (skuRows ?? []).map((sku) => String(sku.product_id)).filter(Boolean),
    ),
  );
  const { data: cartPriceRuleRows, error: cartPriceRuleError } =
    skuProductIds.length
      ? await supabase
          .from("shelf_product_cart_price_rules")
          .select("*")
          .in("product_id", skuProductIds)
          .eq("is_active", true)
      : { data: [], error: null };
  if (cartPriceRuleError) throw new Error(cartPriceRuleError.message);
  const cartPriceRulesByProduct = groupRulesByProduct(
    (cartPriceRuleRows ?? []) as CartPriceRule[],
  );

  const requested = new Map<string, number>();
  for (const item of rawItems) requested.set(item.skuId, (requested.get(item.skuId) ?? 0) + item.quantity);
  const items: ShopOrderItem[] = [];
  let totalWeightGrams = 0;

  for (const rawItem of rawItems) {
    const sku = skusById.get(rawItem.skuId);
    if (!sku || sku.product_id !== rawItem.productId) {
      throw new Error(`Invalid SKU: ${rawItem.skuId}`);
    }

    if (
      sku.is_available === false ||
      Number(sku.stock_quantity ?? 0) < (requested.get(rawItem.skuId) ?? 0)
    ) {
      throw new Error(
        `Sorry, ${rawItem.skuId} is no longer available in the requested quantity.`,
      );
    }

    const baseUnitPrice = toPaise(Number(sku.price)) / 100;
    const priceAdjustment = resolveCartUnitPrice(
      baseUnitPrice,
      cartPriceRulesByProduct.get(sku.product_id) ?? null,
    );
    const unitPrice = priceAdjustment?.adjustedUnitPrice ?? baseUnitPrice;
    const weight = Number(sku.weight_grams ?? 0);
    totalWeightGrams += weight * rawItem.quantity;

    items.push({
      productId: rawItem.productId,
      productName: "",
      productThumbnail: "",
      productSlug: null,
      skuId: rawItem.skuId,
      skuCode: "",
      variantCombination: {},
      variantLabel: "",
      quantity: rawItem.quantity,
      unitPrice,
      pricingAdjustment: priceAdjustment
        ? {
            ruleId: priceAdjustment.ruleId,
            ruleName: priceAdjustment.ruleName,
            baseUnitPrice,
            amount: priceAdjustment.amount,
          }
        : null,
      customizationText: rawItem.customizationText ?? null,
    });
  }

  const productIds = Array.from(new Set(items.map((item) => item.productId)));
  const { data: productRows, error: productError } = await supabase
    .from("shelf_products")
    .select("id, name, slug, thumbnail_url, is_active, is_archived, category_id, category:shelf_categories(id,name,slug)")
    .in("id", productIds);

  if (productError) throw new Error("Unable to load products. Please retry.");
  const productsById = new Map(
    (productRows ?? []).map((p) => [p.id, p as Record<string, unknown>]),
  );

  for (const item of items) {
    const product = productsById.get(item.productId);
    if (!product || !product.is_active || product.is_archived) throw new Error("This product is no longer available.");
    item.productName =
      typeof product?.name === "string" ? product.name : "Product";
    item.productSlug = typeof product?.slug === "string" ? product.slug : null;
    item.productThumbnail =
      typeof product?.thumbnail_url === "string" ? product.thumbnail_url : "";

    const sku = skusById.get(item.skuId);
    item.skuCode =
      sku &&
      typeof (sku as SkuSnapshot).sku_code === "string" &&
      (sku as SkuSnapshot).sku_code !== ""
        ? ((sku as SkuSnapshot).sku_code as string)
        : String(item.skuId).slice(0, 8);
    const variant =
      sku &&
      typeof (sku as SkuSnapshot).variant_combination === "object" &&
      (sku as SkuSnapshot).variant_combination !== null
        ? (sku as SkuSnapshot).variant_combination
        : {};
    item.variantCombination = variant as Record<string, string | boolean>;
    item.variantLabel = Object.entries(item.variantCombination)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }


  const subtotalPaise = items.reduce((sum, item) => sum + toPaise(item.unitPrice) * item.quantity, 0);
  const subtotal = subtotalPaise / 100;
  const coupon = input.couponCode ? await validateCouponCode(supabase, input.couponCode, subtotal, userId, items, productsById) : null;
  const couponDiscountPaise = promotionDiscountPaise(subtotalPaise, coupon);
  const afterCoupon = subtotalPaise - couponDiscountPaise;
  // Offer selection and eligibility live on the server; a stale client cannot suppress an offer.
  const { data: offers, error: offersError } = await supabase.from("offers").select("*").eq("is_active", true).order("is_featured", { ascending: false }).order("created_at", { ascending: false }).order("id");
  if (offersError) throw new Error("Unable to load offers. Please retry.");
  let offer: ShopCouponResult | null = null;
  const candidateOffers = input.appliedOfferId
    ? [{ id: input.appliedOfferId, offer_type: undefined }]
    : offers ?? [];
  for (const candidate of candidateOffers) {
    // An explicitly selected offer must be validated by validateOfferId even
    // when the lightweight candidate row does not include its offer_type.
    // Automatic offers are restricted to discount types supported by checkout.
    if (!input.appliedOfferId && !["percentage", "fixed_amount", "free_shipping"].includes(String(candidate.offer_type))) continue;
    try { offer = await validateOfferId(supabase, candidate.id, afterCoupon / 100, userId, items, productsById); break; }
    catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/no longer active|not yet valid|expired|usage limit|Minimum order|maximum number|does not apply|Sign in/.test(message)) throw error;
    }
  }
  const offerDiscountPaise = promotionDiscountPaise(afterCoupon, offer);
  const discountedSubtotal = (afterCoupon - offerDiscountPaise) / 100;
  const destination = input.destination?.pincode && input.destination.state ? { pincode: input.destination.pincode.trim(), state: input.destination.state.trim() } : null;
  if (destination && !/^\d{6}$/.test(destination.pincode)) throw new Error("Enter a valid 6 digit pincode.");
  const shipping = await calculateShippingFromRules({ pincode: destination?.pincode ?? "", state: destination?.state ?? "", subtotal: discountedSubtotal, minimumOrderSubtotal: subtotal, weightGrams: totalWeightGrams, settings });
  if (!shipping.available) throw new Error(shipping.reason || "Delivery not available.");
  const shippingPaise = coupon?.freeShipping || offer?.freeShipping ? 0 : shipping.chargePaise;
  const cgstPercent = settings.gstEnabled ? settings.cgstPercent : 0;
  const sgstPercent = settings.gstEnabled ? settings.sgstPercent : 0;
  const money = calculateShopMoney({ subtotalPaise, couponDiscountPaise, offerDiscountPaise, shippingPaise, cgstPercent, sgstPercent });
  const promotions = [coupon, offer].filter((v): v is ShopCouponResult => Boolean(v)).map(p => ({ table: p.sourceTable!, id: (p.couponId ?? p.offerId)!, code: p.code, discountType: p.discountType, discountValue: p.discountValue, discountPaise: p === coupon ? couponDiscountPaise : offerDiscountPaise }));
  const snapshot = { ...buildShopPricingSnapshot(items, coupon, subtotal, shippingPaise / 100, money.taxPaise / 100, money.totalPaise / 100), version: 2 as const, currency: "INR" as const, money, discount: money.discountPaise / 100, applied_offer_id: offer?.offerId ?? null, cgst_percent: cgstPercent, sgst_percent: sgstPercent, promotions, delivery_rule_id: shipping.ruleId ?? null, delivery_threshold: settings.deliveryChargeThreshold, default_delivery_charge: settings.defaultDeliveryCharge };
  const fingerprint = createHash("sha256").update(JSON.stringify({ userId, items, destination, money, promotions, cgstPercent, sgstPercent, ruleId: shipping.ruleId ?? null, threshold: settings.deliveryChargeThreshold, delivery: settings.defaultDeliveryCharge })).digest("hex");
  return { items, snapshot, fingerprint, estimated: !destination, destination, couponCode: coupon?.code ?? null, offerId: offer?.offerId ?? null, offerLabel: offer?.code ?? null };
}
