import "server-only";
import { createHash } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { getCheckoutSettings } from "@/lib/settings";
import {
  buildShopPricingSnapshot,
  calculateCouponDiscount,
  type ShopCouponResult,
} from "@/lib/shop/pricing";
import { calculateShippingFromRules } from "@/lib/shop/shipping";
import {
  groupRulesByProduct,
  resolveCartUnitPrice,
  type CartPriceRule,
} from "@/lib/shop/cart-price-rules";
import type { ShopOrderItem, ShopShippingAddress } from "@/lib/shop/orders";
import {
  calculateShopMoney,
  promotionDiscountPaise,
  toPaise,
} from "./financials";
import type { PlaceOrderItemInput } from "./place-order";
import type { ShopQuote } from "./quote-types";
import {
  normalizeInvitationConfig,
  normalizeInvitationDetails,
  getInvitationSampleVariant,
  getInvitationVariantPolicy,
  validateInvitationDetails,
} from "./invitation";
import type { ShopInvitationCustomization } from "./public-types";

function assertPromotionApplicable(
  promotion: Record<string, unknown>,
  items: ShopOrderItem[],
  products: Map<string, Record<string, unknown>>,
) {
  const token = (v: unknown) =>
    String(v ?? "")
      .trim()
      .toLowerCase();
  const categories = items.flatMap((item) => {
    const p = products.get(item.productId);
    const c = p?.category as Record<string, unknown> | null;
    return [p?.category_id, c?.id, c?.name, c?.slug];
  });
  const candidates: Record<string, unknown[]> = {
    applicable_products: items.flatMap((item) => [
      item.productId,
      item.productSlug,
      item.productName,
    ]),
    applicable_categories: categories,
    applicable_materials: items.flatMap((item) =>
      Object.values(item.variantCombination),
    ),
  };
  for (const [key, values] of Object.entries(candidates)) {
    const required = promotion[key];
    if (
      Array.isArray(required) &&
      required.length &&
      !required.some((v) => values.some((c) => token(c) === token(v)))
    ) {
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
      customizationData:
        isRecord(entry.customizationData) &&
        entry.customizationData.kind === "invitation"
          ? ({
              kind: "invitation",
              details: normalizeInvitationDetails(
                entry.customizationData.details,
              ) ?? {
                hostNames: "",
                eventDate: "",
                venue: "",
                rsvp: "",
                wording: "",
              },
              isSample: Boolean(entry.customizationData.isSample),
              sampleForSkuId:
                normalizeText(entry.customizationData.sampleForSkuId) || null,
            } satisfies ShopInvitationCustomization)
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

async function promotionUsage(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  table: "coupons" | "offers",
  id: string,
  userId: string,
) {
  const [reservations, redemptions] = await Promise.all([
    supabase
      .from("shop_promotion_reservations")
      .select("order_id,released_at")
      .eq("source_table", table)
      .eq("promotion_id", id)
      .eq("user_id", userId),
    supabase
      .from("redemptions")
      .select("order_id")
      .eq(table === "offers" ? "offer_id" : "coupon_id", id)
      .eq("user_id", userId),
  ]);
  if (reservations.error || redemptions.error)
    throw new Error("Unable to verify promotion usage. Please retry.");
  const versionedOrders = new Set(
    (reservations.data ?? []).map((row) => row.order_id),
  );
  return (
    (reservations.data ?? []).filter((row) => !row.released_at).length +
    (redemptions.data ?? []).filter((row) => !versionedOrders.has(row.order_id))
      .length
  );
}

async function validateCouponCode(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  couponCode: string,
  subtotal: number,
  userId: string | null,
  customerEmail: string | null | undefined,
  items: ShopOrderItem[],
  products: Map<string, Record<string, unknown>>,
): Promise<ShopCouponResult | null> {
  const code = couponCode.trim().toUpperCase();
  if (!code) return null;

  const today = new Date().toISOString().slice(0, 10);
  // A code can live in either table. Look both up concurrently rather than
  // waiting for the shop-specific lookup before checking legacy coupons.
  const [shopCouponResult, couponResult] = await Promise.all([
    supabase.from("shelf_coupons").select("*").eq("code", code).maybeSingle(),
    supabase.from("coupons").select("*").eq("code", code).maybeSingle(),
  ]);
  const { data: shopCoupon, error: shopCouponError } = shopCouponResult;
  const { data: coupon, error: couponError } = couponResult;
  if (shopCouponError) throw new Error(shopCouponError.message);
  if (couponError) throw new Error(couponError.message);

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
    if (shopCoupon.sample_credit_id) {
      const { data: credit, error: creditError } = await supabase
        .from("shop_sample_credits")
        .select(
          "owner_user_id,owner_email,product_id,min_final_quantity,expires_at,redeemed_order_id",
        )
        .eq("id", shopCoupon.sample_credit_id)
        .maybeSingle();
      if (creditError || !credit)
        throw new Error("This sample credit is no longer available.");
      const normalizedEmail = customerEmail?.trim().toLowerCase() || null;
      const ownsCredit =
        (credit.owner_user_id && credit.owner_user_id === userId) ||
        (credit.owner_email &&
          normalizedEmail &&
          credit.owner_email === normalizedEmail);
      if (!ownsCredit)
        throw new Error("This sample credit belongs to a different customer.");
      if (
        credit.redeemed_order_id ||
        new Date(credit.expires_at).getTime() < Date.now()
      ) {
        throw new Error("This sample credit has expired or was already used.");
      }
      const qualifyingQuantity = items
        .filter(
          (item) =>
            item.productId === credit.product_id &&
            !item.customizationData?.isSample,
        )
        .reduce((sum, item) => sum + item.quantity, 0);
      if (qualifyingQuantity < Number(credit.min_final_quantity)) {
        throw new Error(
          `Use this sample credit with at least ${credit.min_final_quantity} invitation cards.`,
        );
      }
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

  if ((coupon.first_order_only || coupon.usage_per_user) && !userId)
    throw new Error("Sign in to use this coupon.");
  if (coupon.first_order_only && userId) {
    const { count, error: usageError } = await supabase
      .from("shelf_orders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (usageError)
      throw new Error("Unable to verify promotion usage. Please retry.");
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
  loadedOffer?: Record<string, unknown>,
): Promise<ShopCouponResult | null> {
  const id = offerId.trim();
  if (!id) return null;

  const now = new Date().toISOString();
  const result = loadedOffer
    ? { data: loadedOffer, error: null }
    : await supabase.from("offers").select("*").eq("id", id).maybeSingle();
  const offer = result.data;
  if (result.error) throw new Error(result.error.message);
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

  if (offer.usage_per_user && !userId)
    throw new Error("Sign in to use this offer.");
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

export async function quoteShopOrder(input: {
  items: PlaceOrderItemInput[];
  userId?: string | null;
  customerEmail?: string | null;
  couponCode?: string | null;
  appliedOfferId?: string | null;
  destination?: { pincode: string; state: string } | null;
}): Promise<ShopQuote> {
  const supabase = createAdminSupabaseClient();
  const rawItems = normalizeOrderItems(input.items);
  const userId = input.userId ?? null;
  const skuIds = Array.from(new Set(rawItems.map((item) => item.skuId)));
  const [settings, skuResult] = await Promise.all([
    getCheckoutSettings(),
    supabase
      .from("shelf_skus")
      .select(
        "id, product_id, sku_code, variant_combination, price, stock_quantity, is_available, weight_grams",
      )
      .in("id", skuIds),
  ]);
  const { data: skuRows, error: skuError } = skuResult;

  if (skuError) throw new Error(skuError.message);

  const skusById = new Map(
    (skuRows ?? []).map((sku) => [sku.id, sku as SkuSnapshot]),
  );
  const skuProductIds = Array.from(
    new Set(
      (skuRows ?? []).map((sku) => String(sku.product_id)).filter(Boolean),
    ),
  );
  const cartPriceRulesPromise = skuProductIds.length
    ? supabase
        .from("shelf_product_cart_price_rules")
        .select("*")
        .in("product_id", skuProductIds)
        .eq("is_active", true)
    : Promise.resolve({ data: [], error: null });
  const [cartPriceRuleResult, productResult] = await Promise.all([
    cartPriceRulesPromise,
    supabase
      .from("shelf_products")
      .select(
        "id, name, slug, thumbnail_url, is_active, is_archived, category_id, invitation_config, category:shelf_categories(id,name,slug)",
      )
      .in("id", skuProductIds),
  ]);
  const { data: cartPriceRuleRows, error: cartPriceRuleError } =
    cartPriceRuleResult;
  const { data: productRows, error: productError } = productResult;
  if (cartPriceRuleError) throw new Error(cartPriceRuleError.message);
  if (productError) throw new Error("Unable to load products. Please retry.");
  const cartPriceRulesByProduct = groupRulesByProduct(
    (cartPriceRuleRows ?? []) as CartPriceRule[],
  );
  const productsById = new Map(
    (productRows ?? []).map((p) => [p.id, p as Record<string, unknown>]),
  );

  const requested = new Map<string, number>();
  for (const item of rawItems)
    requested.set(item.skuId, (requested.get(item.skuId) ?? 0) + item.quantity);
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
      customizationData: rawItem.customizationData ?? null,
    });
  }

  for (const item of items) {
    const product = productsById.get(item.productId);
    if (!product || !product.is_active || product.is_archived)
      throw new Error("This product is no longer available.");
    item.productName =
      typeof product?.name === "string" ? product.name : "Product";
    item.productSlug = typeof product?.slug === "string" ? product.slug : null;
    item.productThumbnail =
      typeof product?.thumbnail_url === "string" ? product.thumbnail_url : "";
    const invitationConfig = normalizeInvitationConfig(
      product.invitation_config,
    );
    if (invitationConfig.enabled) {
      const isSample =
        item.customizationData?.kind === "invitation" &&
        item.customizationData.isSample;
      if (isSample) {
        const sampleForSkuId = item.customizationData?.sampleForSkuId ?? "";
        const mapping = sampleForSkuId
          ? getInvitationSampleVariant(invitationConfig, sampleForSkuId)
          : null;
        if (
          !mapping ||
          item.skuId !== mapping.sampleSkuId ||
          item.quantity !== 1
        ) {
          throw new Error("This invitation sample is no longer available.");
        }
      } else {
        const policy = getInvitationVariantPolicy(invitationConfig, item.skuId);
        if (item.quantity < policy.minFinalQuantity) {
          throw new Error(
            `Invitation orders require at least ${policy.minFinalQuantity} cards.`,
          );
        }
        const details = validateInvitationDetails(
          item.customizationData?.details,
          invitationConfig,
        );
        item.customizationData = {
          kind: "invitation",
          details,
          isSample: false,
          sampleForSkuId: null,
        };
      }
    }

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

  const hasInvitationSample = items.some(
    (item) =>
      item.customizationData?.kind === "invitation" &&
      item.customizationData.isSample,
  );
  const hasInvitationFinal = items.some(
    (item) =>
      item.customizationData?.kind === "invitation" &&
      !item.customizationData.isSample,
  );
  if (hasInvitationSample && hasInvitationFinal) {
    throw new Error(
      "Please check out invitation samples separately from final cards.",
    );
  }

  const subtotalPaise = items.reduce(
    (sum, item) => sum + toPaise(item.unitPrice) * item.quantity,
    0,
  );
  const subtotal = subtotalPaise / 100;
  // Coupon validation and the automatic-offer list are independent. Starting
  // them together removes a database round-trip from the normal cart refresh.
  const couponPromise = input.couponCode
    ? validateCouponCode(
        supabase,
        input.couponCode,
        subtotal,
        userId,
        input.customerEmail,
        items,
        productsById,
      )
    : Promise.resolve(null);
  const offersPromise = input.appliedOfferId
    ? Promise.resolve({ data: [] as Record<string, unknown>[], error: null })
    : supabase
        .from("offers")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id");
  const [coupon, offersResult] = await Promise.all([
    couponPromise,
    offersPromise,
  ]);
  const couponDiscountPaise = promotionDiscountPaise(subtotalPaise, coupon);
  const afterCoupon = subtotalPaise - couponDiscountPaise;
  // Offer selection and eligibility live on the server; a stale client cannot suppress an offer.
  const { data: offers, error: offersError } = offersResult;
  if (offersError) throw new Error("Unable to load offers. Please retry.");
  let offer: ShopCouponResult | null = null;
  const candidateOffers = input.appliedOfferId
    ? [{ id: input.appliedOfferId, offer_type: undefined }]
    : (offers ?? []);
  for (const candidate of candidateOffers) {
    // An explicitly selected offer must be validated by validateOfferId even
    // when the lightweight candidate row does not include its offer_type.
    // Automatic offers are restricted to discount types supported by checkout.
    if (
      !input.appliedOfferId &&
      !["percentage", "fixed_amount", "free_shipping"].includes(
        String(candidate.offer_type),
      )
    )
      continue;
    try {
      // Automatic candidates come from the authoritative list above, so do
      // not re-query the same offer once per candidate. Explicit selections
      // still fetch by id to reject stale or tampered client input.
      offer = await validateOfferId(
        supabase,
        candidate.id,
        afterCoupon / 100,
        userId,
        items,
        productsById,
        input.appliedOfferId
          ? undefined
          : (candidate as Record<string, unknown>),
      );
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (
        !/no longer active|not yet valid|expired|usage limit|Minimum order|maximum number|does not apply|Sign in/.test(
          message,
        )
      )
        throw error;
    }
  }
  const offerDiscountPaise = promotionDiscountPaise(afterCoupon, offer);
  let customerEmail = normalizeText(input.customerEmail).toLowerCase();
  if (!customerEmail && userId) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    if (profileError)
      throw new Error("Unable to verify your sample credits. Please retry.");
    customerEmail = normalizeText(profile?.email).toLowerCase();
  }
  if (hasInvitationSample && !customerEmail) {
    throw new Error(
      "An email address is required to reserve an invitation sample credit.",
    );
  }
  const sampleCreditsResult = customerEmail
    ? await supabase.from("shop_sample_credits").select("*")
    : { data: [] as Record<string, unknown>[], error: null };
  if (sampleCreditsResult.error)
    throw new Error("Unable to check sample credits. Please retry.");
  const now = Date.now();
  const requestedSampleTargets = items
    .filter(
      (item) =>
        item.customizationData?.kind === "invitation" &&
        item.customizationData.isSample,
    )
    .map((item) => item.customizationData?.sampleForSkuId ?? "")
    .filter(Boolean);
  if (new Set(requestedSampleTargets).size !== requestedSampleTargets.length) {
    throw new Error(
      "Only one sample may be ordered for each invitation variant.",
    );
  }
  if (
    hasInvitationSample &&
    (sampleCreditsResult.data ?? []).some((credit) => {
      const expiresAt = Date.parse(normalizeText(credit.expires_at));
      return (
        normalizeText(credit.owner_email).toLowerCase() === customerEmail &&
        requestedSampleTargets.includes(normalizeText(credit.target_sku_id)) &&
        (credit.status === "active" || credit.status === "reserved") &&
        (!Number.isFinite(expiresAt) || expiresAt > now)
      );
    })
  ) {
    throw new Error(
      "You already have an active sample credit for this invitation variant.",
    );
  }
  const promotionDiscountPaiseTotal = couponDiscountPaise + offerDiscountPaise;
  const sampleCredits = (sampleCreditsResult.data ?? [])
    .filter((credit) => {
      const targetSkuId = normalizeText(credit.target_sku_id);
      const ownerEmail = normalizeText(credit.owner_email).toLowerCase();
      const expiresAt = Date.parse(normalizeText(credit.expires_at));
      return (
        credit.status === "active" &&
        ownerEmail === customerEmail &&
        targetSkuId &&
        (!Number.isFinite(expiresAt) || expiresAt > now) &&
        items.some(
          (item) =>
            item.skuId === targetSkuId &&
            item.customizationData?.kind === "invitation" &&
            !item.customizationData.isSample,
        )
      );
    })
    .sort((a, b) => normalizeText(a.id).localeCompare(normalizeText(b.id)))
    .reduce<
      Array<{
        id: string;
        targetSkuId: string;
        amountPaise: number;
        discountPaise: number;
      }>
    >((accepted, credit) => {
      const targetSkuId = normalizeText(credit.target_sku_id);
      if (accepted.some((entry) => entry.targetSkuId === targetSkuId))
        return accepted;
      const item = items.find((candidate) => candidate.skuId === targetSkuId)!;
      const linePaise = toPaise(item.unitPrice) * item.quantity;
      // Pro-rate ordinary promotions first. The sample credit can never discount
      // tax, shipping, another SKU, or more than the remaining matching line.
      const ordinaryShare = Math.floor(
        (promotionDiscountPaiseTotal * linePaise) / Math.max(1, subtotalPaise),
      );
      const amountPaise = Math.max(
        0,
        Math.round(Number(credit.amount_paise)) ||
          toPaise(Number(credit.amount) || 0),
      );
      const discountPaise = Math.min(
        amountPaise,
        Math.max(0, linePaise - ordinaryShare),
      );
      return discountPaise > 0
        ? [
            ...accepted,
            {
              id: normalizeText(credit.id),
              targetSkuId,
              amountPaise,
              discountPaise,
            },
          ]
        : accepted;
    }, []);
  const sampleCreditDiscountPaise = sampleCredits.reduce(
    (sum, credit) => sum + credit.discountPaise,
    0,
  );
  const discountedSubtotal =
    (afterCoupon - offerDiscountPaise - sampleCreditDiscountPaise) / 100;
  const destination =
    input.destination?.pincode && input.destination.state
      ? {
          pincode: input.destination.pincode.trim(),
          state: input.destination.state.trim(),
        }
      : null;
  if (destination && !/^\d{6}$/.test(destination.pincode))
    throw new Error("Enter a valid 6 digit pincode.");
  const shipping = await calculateShippingFromRules({
    pincode: destination?.pincode ?? "",
    state: destination?.state ?? "",
    subtotal: discountedSubtotal,
    minimumOrderSubtotal: subtotal,
    weightGrams: totalWeightGrams,
    settings,
  });
  if (!shipping.available)
    throw new Error(shipping.reason || "Delivery not available.");
  const promotionProvidesFreeDelivery = Boolean(
    coupon?.freeShipping || offer?.freeShipping,
  );
  const shippingPaise = promotionProvidesFreeDelivery
    ? 0
    : shipping.chargePaise;
  const deliverySource = promotionProvidesFreeDelivery
    ? ("promotion" as const)
    : (shipping.source ?? "default");
  const cgstPercent = settings.gstEnabled ? settings.cgstPercent : 0;
  const sgstPercent = settings.gstEnabled ? settings.sgstPercent : 0;
  const money = calculateShopMoney({
    subtotalPaise,
    couponDiscountPaise,
    offerDiscountPaise,
    sampleCreditDiscountPaise,
    shippingPaise,
    cgstPercent,
    sgstPercent,
  });
  const promotions = [coupon, offer]
    .filter((v): v is ShopCouponResult => Boolean(v))
    .map((p) => ({
      table: p.sourceTable!,
      id: (p.couponId ?? p.offerId)!,
      code: p.code,
      discountType: p.discountType,
      discountValue: p.discountValue,
      discountPaise: p === coupon ? couponDiscountPaise : offerDiscountPaise,
    }));
  const snapshot = {
    ...buildShopPricingSnapshot(
      items,
      coupon,
      subtotal,
      shippingPaise / 100,
      money.taxPaise / 100,
      money.totalPaise / 100,
    ),
    version: 2 as const,
    currency: "INR" as const,
    money,
    discount: money.discountPaise / 100,
    applied_offer_id: offer?.offerId ?? null,
    cgst_percent: cgstPercent,
    sgst_percent: sgstPercent,
    promotions,
    sample_credits: sampleCredits,
    delivery_rule_id: shipping.ruleId ?? null,
    delivery_source: deliverySource,
    delivery_threshold: settings.deliveryChargeThreshold,
    default_delivery_charge: settings.defaultDeliveryCharge,
  };
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        userId,
        items,
        destination,
        money,
        promotions,
        sampleCredits,
        cgstPercent,
        sgstPercent,
        ruleId: shipping.ruleId ?? null,
        deliverySource,
        threshold: settings.deliveryChargeThreshold,
        delivery: settings.defaultDeliveryCharge,
      }),
    )
    .digest("hex");
  return {
    items,
    snapshot,
    fingerprint,
    estimated: !destination,
    destination,
    couponCode: coupon?.code ?? null,
    offerId: offer?.offerId ?? null,
    offerLabel: offer?.code ?? null,
  };
}
