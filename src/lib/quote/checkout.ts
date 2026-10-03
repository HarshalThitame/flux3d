import "server-only";

import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { getSettings } from "@/lib/settings";
import {
  normalizePhone,
  validateAddressFields,
  type PrepareAuthoritativeQuotePaymentInput,
} from "@/lib/orders";
import { createQuoteCapture } from "./capture";
import {
  createRazorpayOrder,
  getPublicRazorpayKeyId,
  getRazorpayConfig,
  makeReceipt,
} from "@/lib/payments/razorpay";
import {
  insertPaymentAuditLog,
  upsertPaymentAttempt,
} from "@/lib/payments/repository";
import { updatePaymentAttemptStatus } from "@/lib/payments/state";
import { normalizeOwnedStoragePath } from "@/lib/quote/storage-path";
import { calculatePromotionDiscount } from "@/lib/quote/pricing-waterfall";

export type AuthoritativePaymentContext = {
  userId: string;
  email: string;
};

export type AuthoritativePaymentResult = {
  reference: string;
  quoteVersionId: string;
  session: {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
  };
  customer: {
    name: string;
    email: string;
    contact: string;
  };
};

export type PrepareAuthoritativeCartPaymentInput = {
  quoteVersionIds: string[];
  couponCode?: string | null;
  offerId?: string | null;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  fbp?: string;
  fbc?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function rupees(paise: number) {
  return Math.round(paise) / 100;
}

function requireSafePaise(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Stored ${field} is invalid.`);
  }
  return parsed;
}

async function getOwnedModelPath(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  value: unknown,
) {
  if (typeof value !== "string") throw new Error("The uploaded model path is missing.");
  const path = normalizeOwnedStoragePath(value, userId);
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? "quote-models";
  const { data, error } = await supabase.storage.from(bucket).info(path);
  if (error || !data) throw new Error("The uploaded model is no longer available.");
  return path;
}

export async function prepareAuthoritativeQuotePayment(
  context: AuthoritativePaymentContext,
  input: PrepareAuthoritativeQuotePaymentInput,
): Promise<AuthoritativePaymentResult> {
  const addressErrors = validateAddressFields({
    fullName: input.fullName,
    phone: input.phone,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 ?? "",
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    landmark: input.landmark ?? "",
  });
  if (Object.keys(addressErrors).length > 0) {
    throw new Error("Complete the delivery address before placing the order.");
  }
  if (!/^[0-9a-f-]{36}$/i.test(input.quoteVersionId)) {
    throw new Error("Invalid quote version.");
  }

  const supabase = createAdminSupabaseClient();
  const { data: quote, error: quoteError } = await supabase
    .from("quote_versions")
    .select(
      "id, quote_id, user_id, status, expires_at, currency, subtotal_paise, discount_paise, gst_paise, delivery_paise, total_paise, pricing_snapshot, config, model_metadata, authoritative_metrics, profile_versions, analysis_job_id, analysis_result_id",
    )
    .eq("id", input.quoteVersionId)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (quoteError) throw new Error(quoteError.message);
  if (!quote) throw new Error("Quote version not found.");
  if (quote.status !== "approved") throw new Error("This quote is not available for checkout.");
  if (!quote.expires_at || new Date(quote.expires_at).getTime() <= Date.now()) {
    throw new Error("This estimate has expired. Please calculate a new estimate.");
  }
  if (quote.currency !== "INR") {
    throw new Error("Quote currency or amount is invalid.");
  }

  const metrics = asRecord(quote.authoritative_metrics);
  const config = asRecord(quote.config);
  const modelMetadata = asRecord(quote.model_metadata);
  const pricingSnapshot = asRecord(quote.pricing_snapshot);
  const profileVersions = asRecord(quote.profile_versions);
  let modelPath: string;
  if (profileVersions.source === "browser-estimate-v1") {
    modelPath = await getOwnedModelPath(supabase, context.userId, modelMetadata.storagePath);
  } else {
    const { data: job, error: jobError } = await supabase
      .from("quote_analysis_jobs")
      .select("storage_path, status")
      .eq("id", quote.analysis_job_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (jobError) throw new Error(jobError.message);
    if (!job || job.status !== "ready") throw new Error("Quote is not available for checkout.");
    modelPath = job.storage_path;
  }
  const settings = await getSettings();

  const quotedSubtotalPaise = requireSafePaise(quote.subtotal_paise, "subtotal");
  const quotedDiscountPaise = requireSafePaise(quote.discount_paise ?? 0, "discount");
  const quotedGstPaise = requireSafePaise(quote.gst_paise ?? 0, "GST");
  const isBrowserEstimate = profileVersions.source === "browser-estimate-v1";
  const currentDeliveryPaise = isBrowserEstimate
    ? requireSafePaise(quote.delivery_paise ?? 0, "delivery")
    : quotedSubtotalPaise >= Math.round(settings.deliveryChargeThreshold * 100)
      ? 0
      : Math.round(settings.defaultDeliveryCharge * 100);
  const amountPaise = isBrowserEstimate
    ? requireSafePaise(quote.total_paise, "total")
    : quotedSubtotalPaise - quotedDiscountPaise + quotedGstPaise + currentDeliveryPaise;
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new Error("Order total must be greater than zero.");
  }

  const normalizedPhone = normalizePhone(input.phone);
  const addressData = {
    fullName: input.fullName.trim(),
    phone: normalizedPhone,
    addressLine1: input.addressLine1.trim(),
    addressLine2: input.addressLine2?.trim() ?? "",
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
    landmark: input.landmark?.trim() ?? "",
  };

  const { error: expireQuoteCaptureError } = await supabase
    .from("quote_captures")
    .update({ status: "expired" })
    .eq("quote_version_id", quote.id)
    .eq("user_id", context.userId)
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());
  if (expireQuoteCaptureError) throw new Error(expireQuoteCaptureError.message);

  const { data: pendingCapture, error: pendingCaptureError } = await supabase
    .from("quote_captures")
    .select("reference, amount_paise, currency, razorpay_order_id, address_data")
    .eq("quote_version_id", quote.id)
    .eq("user_id", context.userId)
    .eq("status", "pending")
    .maybeSingle();
  if (pendingCaptureError) throw new Error(pendingCaptureError.message);
  if (pendingCapture?.razorpay_order_id && Number(pendingCapture.amount_paise) === amountPaise) {
    const pendingAddress = asRecord(pendingCapture.address_data);
    return {
      reference: pendingCapture.reference,
      quoteVersionId: quote.id,
      session: {
        keyId: getPublicRazorpayKeyId(),
        orderId: pendingCapture.razorpay_order_id,
        amount: amountPaise,
        currency: "INR",
      },
      customer: {
        name: String(pendingAddress.fullName ?? addressData.fullName),
        email: context.email,
        contact: String(pendingAddress.phone ?? normalizedPhone),
      },
    };
  }
  if (pendingCapture?.razorpay_order_id) {
    throw new Error(
      "An earlier payment session exists for this quote. Let it expire before retrying.",
    );
  }
  if (pendingCapture) {
    const { error: cancelError } = await supabase
      .from("quote_captures")
      .update({ status: "cancelled" })
      .eq("reference", pendingCapture.reference)
      .eq("status", "pending");
    if (cancelError) throw new Error(cancelError.message);
  }

  const quantity = Math.max(1, Math.floor(Number(config.quantity ?? 1)));
  const pricingData = {
    materialCost: rupees(Number(pricingSnapshot.materialPaise ?? 0)),
    machineCost: rupees(Number(pricingSnapshot.machinePaise ?? 0)),
    postProcessingCharges: rupees(Number(pricingSnapshot.postProcessingPaise ?? 0)),
    subtotal: rupees(quotedSubtotalPaise),
    cartDiscountAmount: rupees(quotedDiscountPaise),
    cartDiscountPercent: 0,
    overheadPercentage: Number(pricingSnapshot.overheadBasisPoints ?? 0) / 100,
    overheadAmount: rupees(Number(pricingSnapshot.overheadPaise ?? 0)),
    marginPercentage: Number(pricingSnapshot.marginBasisPoints ?? 0) / 100,
    marginAmount: rupees(
      Math.max(
        0,
        Number(pricingSnapshot.priceBeforeTaxPaise ?? 0) -
          Number(pricingSnapshot.costPaise ?? 0),
      ),
    ),
    totalPrice: rupees(quotedSubtotalPaise),
    finalPrice: rupees(quotedSubtotalPaise - quotedDiscountPaise + quotedGstPaise),
    deliveryCharge: rupees(currentDeliveryPaise),
    grandTotal: rupees(amountPaise),
    pricePerUnit: rupees(quotedSubtotalPaise) / quantity,
    estimatedHours: Number(metrics.elapsedSeconds ?? 0) / 3600,
    discount: rupees(quotedDiscountPaise),
    gstPaise: quotedGstPaise,
  };
  const serverModelMetadata = {
    ...modelMetadata,
    finishedPartWeightGrams: Number(metrics.finishedPartWeightGrams ?? 0),
    billableMaterialGrams: Number(metrics.billableMaterialGrams ?? 0),
    elapsedSeconds: Number(metrics.elapsedSeconds ?? 0),
    plateCount: Number(metrics.plateCount ?? 0),
    profileVersions: quote.profile_versions,
  };
  const draftData = {
    quoteId: quote.quote_id,
    quoteVersionId: quote.id,
    fileUrl: modelPath,
    notes: input.notes?.trim() ?? "",
  };

  const capture = await createQuoteCapture({
    userId: context.userId,
    quoteVersionId: quote.id,
    amountPaise,
    draftData,
    addressData,
    configData: config,
    pricingData,
    modelMetadata: serverModelMetadata,
  });

  if (!getRazorpayConfig()) throw new Error("Payment gateway is not configured.");
  const receipt = makeReceipt(
    capture.reference.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 10) || "QV",
    1,
  );
  const providerOrder = await createRazorpayOrder({
    amountPaise,
    currency: "INR",
    receipt,
    notes: {
      quote_version_id: quote.id,
      quote_capture_reference: capture.reference,
      internal_order_type: "custom_quote",
      user_id: context.userId,
    },
  });

  const paymentAttempt = await upsertPaymentAttempt({
    internal_order_type: "custom_quote",
    internal_order_id: capture.reference,
    customer_id: context.userId,
    provider: "razorpay",
    payment_purpose: "custom_quote_full_payment",
    provider_order_id: providerOrder.id,
    provider_payment_id: null,
    amount_paise: amountPaise,
    currency: "INR",
    status: "created",
    attempt_number: 1,
    idempotency_key: `qv-${capture.reference}`,
    receipt,
    failure_code: null,
    failure_description: null,
    payment_method: null,
    captured_at: null,
    failed_at: null,
    metadata: {
      quote_version_id: quote.id,
      quote_capture_reference: capture.reference,
      customer: { name: addressData.fullName, email: context.email, contact: normalizedPhone },
      ...(input.fbp ? { meta_fbp: input.fbp } : {}),
      ...(input.fbc ? { meta_fbc: input.fbc } : {}),
    },
  });
  await updatePaymentAttemptStatus(
    paymentAttempt.id,
    paymentAttempt.status,
    "pending",
    { provider_order_id: providerOrder.id },
    {
      actorId: context.userId,
      actorRole: "customer",
      reason: "Payment attempt created from authoritative quote version",
    },
  );
  await supabase
    .from("quote_captures")
    .update({
      razorpay_order_id: providerOrder.id,
      payment_attempt_id: paymentAttempt.id,
      amount_paise: amountPaise,
      pricing_data: pricingData,
    })
    .eq("id", capture.id)
    .eq("status", "pending");
  await insertPaymentAuditLog({
    actor_id: context.userId,
    actor_role: "customer",
    action: "payment_attempt_created",
    entity_type: "custom_quote",
    entity_id: capture.reference,
    previous_state: null,
    new_state: {
      quote_version_id: quote.id,
      payment_attempt_id: paymentAttempt.id,
      provider_order_id: providerOrder.id,
      amount_paise: amountPaise,
    },
  });

  return {
    reference: capture.reference,
    quoteVersionId: quote.id,
    session: {
      keyId: getPublicRazorpayKeyId(),
      orderId: providerOrder.id,
      amount: amountPaise,
      currency: "INR",
    },
    customer: {
      name: addressData.fullName,
      email: context.email,
      contact: normalizedPhone,
    },
  };
}

export async function prepareAuthoritativeCartPayment(
  context: AuthoritativePaymentContext,
  input: PrepareAuthoritativeCartPaymentInput,
): Promise<Omit<AuthoritativePaymentResult, "quoteVersionId">> {
  const addressErrors = validateAddressFields({
    fullName: input.fullName,
    phone: input.phone,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 ?? "",
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    landmark: input.landmark ?? "",
  });
  if (Object.keys(addressErrors).length > 0) {
    throw new Error("Complete the delivery address before placing the order.");
  }

  if (!Array.isArray(input.quoteVersionIds)) {
    throw new Error("Your cart does not contain authoritative quote versions.");
  }
  const quoteVersionIds = [...new Set(input.quoteVersionIds)];
  if (
    quoteVersionIds.length === 0 ||
    quoteVersionIds.length > 25 ||
    quoteVersionIds.length !== input.quoteVersionIds.length ||
    quoteVersionIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))
  ) {
    throw new Error("Your cart contains an invalid quote version.");
  }

  const supabase = createAdminSupabaseClient();
  const { data: quoteRows, error: quoteError } = await supabase
    .from("quote_versions")
    .select(
      "id, quote_id, user_id, status, expires_at, currency, subtotal_paise, discount_paise, gst_paise, pricing_snapshot, config, model_metadata, authoritative_metrics, profile_versions, analysis_job_id, analysis_result_id",
    )
    .eq("user_id", context.userId)
    .in("id", quoteVersionIds);
  if (quoteError) throw new Error(quoteError.message);
  if (!quoteRows || quoteRows.length !== quoteVersionIds.length) {
    throw new Error("One or more quote versions are unavailable.");
  }

  const quoteById = new Map(quoteRows.map((quote) => [quote.id as string, quote]));
  const quotes = quoteVersionIds.map((id) => quoteById.get(id));
  const now = Date.now();
  for (const quote of quotes) {
    if (!quote || quote.status !== "approved") {
      throw new Error("Every cart item must have an approved authoritative quote.");
    }
    if (!quote.expires_at || new Date(quote.expires_at).getTime() <= now) {
      throw new Error("An estimate in your cart has expired. Please calculate it again.");
    }
    if (quote.currency !== "INR") {
      throw new Error("A quote in your cart has an unsupported currency.");
    }
  }

  const slicedQuotes = quotes.filter((quote) => asRecord(quote?.profile_versions).source !== "browser-estimate-v1");
  const analysisJobIds = slicedQuotes.map((quote) => String(quote?.analysis_job_id));
  const { data: jobRows, error: jobsError } = analysisJobIds.length
    ? await supabase
        .from("quote_analysis_jobs")
        .select("id, user_id, storage_path, original_file_name, status")
        .eq("user_id", context.userId)
        .in("id", analysisJobIds)
    : { data: [], error: null };
  if (jobsError) throw new Error(jobsError.message);
  const jobById = new Map((jobRows ?? []).map((job) => [job.id as string, job]));
  if (
    analysisJobIds.some((id) => {
      const job = jobById.get(id);
      return !job || job.status !== "ready";
    })
  ) {
    throw new Error("Authoritative slicing is not complete for every cart item.");
  }

  const settings = await getSettings();
  const subtotalPaise = quotes.reduce(
    (sum, quote) => sum + requireSafePaise(quote?.subtotal_paise, "subtotal"),
    0,
  );
  const discountPaise = quotes.reduce(
    (sum, quote) => sum + requireSafePaise(quote?.discount_paise ?? 0, "discount"),
    0,
  );
  const gstPaise = quotes.reduce(
    (sum, quote) => sum + requireSafePaise(quote?.gst_paise ?? 0, "GST"),
    0,
  );
  const merchandiseAfterQuoteDiscountPaise = Math.max(0, subtotalPaise - discountPaise);
  const couponCode = input.couponCode?.trim().toUpperCase() || null;
  let couponId: string | null = null;
  let couponDiscountPaise = 0;
  let couponFreeShipping = false;
  let couponDiscountType: string | null = null;
  if (couponCode) {
    const { data: coupon, error } = await supabase.from("coupons").select("*").eq("code", couponCode).maybeSingle();
    if (error) throw new Error("Unable to verify your coupon. Please retry.");
    const now = Date.now();
    if (!coupon || !coupon.is_active || (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) || (coupon.expires_at && new Date(coupon.expires_at).getTime() < now)) {
      throw new Error("This coupon is no longer valid. Return to your cart and remove it.");
    }
    if (merchandiseAfterQuoteDiscountPaise < Math.round(Number(coupon.min_order_value ?? 0) * 100)) throw new Error("Your cart no longer meets this coupon's minimum order value.");
    const couponMaterials = Array.isArray(coupon.applicable_materials) ? coupon.applicable_materials.map((value: unknown) => String(value).toLowerCase()) : [];
    const quoteMaterials = quotes.map((quote) => {
      const config = asRecord(quote?.config);
      return [config.materialId, config.material, config.materialName].map((value) => String(value ?? "").toLowerCase()).filter(Boolean);
    });
    if ((Array.isArray(coupon.applicable_products) && coupon.applicable_products.length) || (Array.isArray(coupon.applicable_categories) && coupon.applicable_categories.length) || (couponMaterials.length && quoteMaterials.some((materials) => !materials.some((material) => couponMaterials.includes(material))))) {
      throw new Error("This coupon does not apply to every item in your quote cart.");
    }
    if (Number(coupon.usage_limit ?? 0) > 0 && Number(coupon.used_count ?? 0) >= Number(coupon.usage_limit)) throw new Error("This coupon has reached its usage limit.");
    if (Number(coupon.usage_per_user ?? 0) > 0) {
      const { count, error: usageError } = await supabase.from("redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", coupon.id).eq("user_id", context.userId);
      if (usageError) throw new Error("Unable to verify coupon eligibility. Please retry.");
      if ((count ?? 0) >= Number(coupon.usage_per_user)) throw new Error("You have already used this coupon the maximum number of times.");
    }
    if (coupon.first_order_only) {
      const { count, error: orderError } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", context.userId);
      if (orderError) throw new Error("Unable to verify coupon eligibility. Please retry.");
      if ((count ?? 0) > 0) throw new Error("This coupon is for first-time orders only.");
    }
    couponId = String(coupon.id);
    couponDiscountType = String(coupon.discount_type);
    couponFreeShipping = coupon.discount_type === "free_shipping";
    couponDiscountPaise = Math.round(calculatePromotionDiscount(merchandiseAfterQuoteDiscountPaise / 100, {
      discountType: coupon.discount_type, discountValue: Number(coupon.discount_value ?? 0), maxDiscount: coupon.max_discount == null ? null : Number(coupon.max_discount),
    }) * 100);
  }

  const offerId = input.offerId?.trim() || null;
  let offerDiscountPaise = 0;
  let offerFreeShipping = false;
  let appliedOfferId: string | null = null;
  let offerDiscountType: string | null = null;
  let offerName: string | null = null;
  let offerCode: string | null = null;
  if (offerId) {
    const { data: offer, error } = await supabase.from("offers").select("*").eq("id", offerId).maybeSingle();
    if (error) throw new Error("Unable to verify your offer. Please retry.");
    const now = Date.now();
    if (!offer?.is_active || (offer.starts_at && new Date(offer.starts_at).getTime() > now) || (offer.ends_at && new Date(offer.ends_at).getTime() < now) || (Number(offer.usage_limit ?? 0) > 0 && Number(offer.used_count ?? 0) >= Number(offer.usage_limit))) {
      throw new Error("This offer is no longer valid. Refresh your cart to recalculate the total.");
    }
    if (Number(offer.usage_per_user ?? 0) > 0) {
      const { count, error: usageError } = await supabase.from("redemptions").select("id", { count: "exact", head: true }).eq("offer_id", offer.id).eq("user_id", context.userId);
      if (usageError) throw new Error("Unable to verify offer eligibility. Please retry.");
      if ((count ?? 0) >= Number(offer.usage_per_user)) throw new Error("You have already used this offer the maximum number of times.");
    }
    const afterCouponPaise = Math.max(0, merchandiseAfterQuoteDiscountPaise - couponDiscountPaise);
    if (afterCouponPaise < Math.round(Number(offer.min_order_value ?? 0) * 100)) throw new Error("Your cart no longer meets this offer's minimum order value.");
    const offerMaterials = Array.isArray(offer.applicable_materials) ? offer.applicable_materials.map((value: unknown) => String(value).toLowerCase()) : [];
    const quoteMaterials = quotes.map((quote) => {
      const config = asRecord(quote?.config);
      return [config.materialId, config.material, config.materialName].map((value) => String(value ?? "").toLowerCase()).filter(Boolean);
    });
    const blockedByScope = (Array.isArray(offer.applicable_products) && offer.applicable_products.length) || (Array.isArray(offer.applicable_categories) && offer.applicable_categories.length) || (offerMaterials.length && quoteMaterials.some((materials) => !materials.some((material) => offerMaterials.includes(material))));
    if (blockedByScope) throw new Error("This offer does not apply to every item in your quote cart.");
    appliedOfferId = String(offer.id);
    offerDiscountType = String(offer.offer_type);
    offerName = String(offer.title ?? offer.badge_text ?? offer.sale_label ?? "Offer");
    offerCode = String(offer.code ?? "");
    offerFreeShipping = offer.offer_type === "free_shipping";
    offerDiscountPaise = Math.round(calculatePromotionDiscount(afterCouponPaise / 100, {
      discountType: offer.offer_type, discountValue: Number(offer.discount_value ?? 0), maxDiscount: offer.max_discount == null ? null : Number(offer.max_discount),
    }) * 100);
  }
  const promoDiscountPaise = Math.min(merchandiseAfterQuoteDiscountPaise, couponDiscountPaise + offerDiscountPaise);
  const finalMerchandisePaise = merchandiseAfterQuoteDiscountPaise - promoDiscountPaise;
  const deliveryPaise = couponFreeShipping || offerFreeShipping ? 0 :
    finalMerchandisePaise >= Math.round(settings.deliveryChargeThreshold * 100)
      ? 0
      : Math.round(settings.defaultDeliveryCharge * 100);
  const amountPaise = finalMerchandisePaise + gstPaise + deliveryPaise;
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new Error("Order total must be greater than zero.");
  }

  const normalizedPhone = normalizePhone(input.phone);
  const addressData = {
    fullName: input.fullName.trim(),
    phone: normalizedPhone,
    addressLine1: input.addressLine1.trim(),
    addressLine2: input.addressLine2?.trim() ?? "",
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
    landmark: input.landmark?.trim() ?? "",
  };

  const items = await Promise.all(quotes.map(async (quote, index) => {
    if (!quote) throw new Error("Quote version not found.");
    const config = asRecord(quote.config);
    const metrics = asRecord(quote.authoritative_metrics);
    const model = asRecord(quote.model_metadata);
    const pricing = asRecord(quote.pricing_snapshot);
    const job = jobById.get(String(quote.analysis_job_id));
    const isBrowserEstimate = asRecord(quote.profile_versions).source === "browser-estimate-v1";
    const filePath = isBrowserEstimate
      ? await getOwnedModelPath(supabase, context.userId, model.storagePath)
      : job?.storage_path ?? "";
    if (!filePath) throw new Error("The uploaded model is unavailable for an item in your cart.");
    const quantity = Math.max(1, Math.floor(Number(config.quantity ?? 1)));
    const itemSubtotalPaise = requireSafePaise(quote.subtotal_paise, "subtotal");
    const itemDiscountPaise = requireSafePaise(quote.discount_paise ?? 0, "discount");
    const itemGstPaise = requireSafePaise(quote.gst_paise ?? 0, "GST");
    const itemDeliveryPaise = index === 0 ? deliveryPaise : 0;
    const itemTotalPaise =
      itemSubtotalPaise - itemDiscountPaise + itemGstPaise + itemDeliveryPaise;

    return {
      quoteVersionId: quote.id,
      quoteId: quote.quote_id,
      fileUrl: filePath,
      fileName: job?.original_file_name ?? String(model.fileName ?? "model"),
      material: String(config.materialId ?? ""),
      color: String(config.color ?? ""),
      quantity,
      infill: Number(config.infill ?? 0),
      layerHeight: Number(config.layerHeight ?? 0),
      postProcessingLevel: String(config.postProcessingLevel ?? "none"),
      supports: config.supports !== "never",
      materialCost: rupees(requireSafePaise(pricing.materialPaise ?? 0, "material cost")),
      machineCost: rupees(requireSafePaise(pricing.machinePaise ?? 0, "machine cost")),
      postProcessingCharges: rupees(
        requireSafePaise(pricing.postProcessingPaise ?? 0, "post-processing cost"),
      ),
      subtotal: rupees(itemSubtotalPaise),
      overheadPercentage: Number(pricing.overheadBasisPoints ?? 0) / 100,
      overheadAmount: rupees(requireSafePaise(pricing.overheadPaise ?? 0, "overhead")),
      marginPercentage: Number(pricing.marginBasisPoints ?? 0) / 100,
      marginAmount: rupees(
        Math.max(
          0,
          requireSafePaise(pricing.priceBeforeTaxPaise ?? 0, "pre-tax price") -
            requireSafePaise(pricing.costPaise ?? 0, "cost"),
        ),
      ),
      totalPrice: rupees(itemSubtotalPaise + itemGstPaise),
      cartDiscountAmount: rupees(itemDiscountPaise),
      cartDiscountPercent: 0,
      finalPrice: rupees(itemSubtotalPaise - itemDiscountPaise + itemGstPaise),
      deliveryCharge: rupees(itemDeliveryPaise),
      grandTotal: rupees(itemTotalPaise),
      price: rupees(itemTotalPaise),
      estimatedTime: Number(metrics.elapsedSeconds ?? 0) / 3600,
      weight: Number(metrics.finishedPartWeightGrams ?? 0),
      finishedPartWeightGrams: Number(metrics.finishedPartWeightGrams ?? 0),
      billableMaterialGrams: Number(metrics.billableMaterialGrams ?? 0),
      modelVolumeMm3: Number(model.solidVolumeMm3 ?? 0),
      dimensions: asRecord(model.dimensionsMm),
      plateCount: Number(metrics.plateCount ?? 0),
      elapsedSeconds: Number(metrics.elapsedSeconds ?? 0),
      profileVersions: quote.profile_versions,
      analysisJobId: quote.analysis_job_id,
      analysisResultId: quote.analysis_result_id,
    };
  }));

  const checkoutKey = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        quoteVersionIds,
        couponCode,
        couponId,
        offerId: appliedOfferId,
        amountPaise,
        addressData,
      }),
    )
    .digest("hex");
  const { error: expireCartCaptureError } = await supabase
    .from("quote_captures")
    .update({ status: "expired" })
    .eq("user_id", context.userId)
    .eq("checkout_key", checkoutKey)
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());
  if (expireCartCaptureError) throw new Error(expireCartCaptureError.message);
  const { data: pendingCapture, error: pendingCaptureError } = await supabase
    .from("quote_captures")
    .select("reference, amount_paise, razorpay_order_id")
    .eq("user_id", context.userId)
    .eq("checkout_key", checkoutKey)
    .eq("status", "pending")
    .maybeSingle();
  if (pendingCaptureError) throw new Error(pendingCaptureError.message);
  if (pendingCapture) {
    if (!pendingCapture.razorpay_order_id) {
      throw new Error("This cart checkout is already being prepared. Try again shortly.");
    }
    return {
      reference: pendingCapture.reference,
      session: {
        keyId: getPublicRazorpayKeyId(),
        orderId: pendingCapture.razorpay_order_id,
        amount: Number(pendingCapture.amount_paise),
        currency: "INR",
      },
      customer: {
        name: addressData.fullName,
        email: context.email,
        contact: normalizedPhone,
      },
    };
  }

  const capture = await createQuoteCapture({
    userId: context.userId,
    checkoutKey,
    amountPaise,
    draftData: { type: "cart", quoteVersionIds },
    addressData,
    configData: { type: "authoritative_cart" },
    pricingData: {
      subtotal: rupees(subtotalPaise),
      cartDiscountAmount: rupees(discountPaise),
      cartDiscountPercent: 0,
      couponCode,
      couponId,
      couponDiscountType,
      couponDiscountAmount: rupees(couponDiscountPaise),
      offerId: appliedOfferId,
      offerDiscountType,
      offerName,
      offerCode,
      offerDiscountAmount: rupees(offerDiscountPaise),
      finalPrice: rupees(finalMerchandisePaise + gstPaise),
      discount: rupees(discountPaise + promoDiscountPaise),
      deliveryCharge: rupees(deliveryPaise),
      grandTotal: rupees(amountPaise),
      items,
    },
    modelMetadata: { quoteVersionIds },
  });

  if (!getRazorpayConfig()) throw new Error("Payment gateway is not configured.");
  const receipt = makeReceipt(
    capture.reference.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 10) || "QC",
    1,
  );
  const providerOrder = await createRazorpayOrder({
    amountPaise,
    currency: "INR",
    receipt,
    notes: {
      quote_capture_reference: capture.reference,
      internal_order_type: "custom_quote",
      user_id: context.userId,
    },
  });
  const paymentAttempt = await upsertPaymentAttempt({
    internal_order_type: "custom_quote",
    internal_order_id: capture.reference,
    customer_id: context.userId,
    provider: "razorpay",
    payment_purpose: "custom_quote_full_payment",
    provider_order_id: providerOrder.id,
    provider_payment_id: null,
    amount_paise: amountPaise,
    currency: "INR",
    status: "created",
    attempt_number: 1,
    idempotency_key: `qvc-${capture.reference}`,
    receipt,
    failure_code: null,
    failure_description: null,
    payment_method: null,
    captured_at: null,
    failed_at: null,
    metadata: {
      quote_version_ids: quoteVersionIds,
      quote_capture_reference: capture.reference,
      customer: { name: addressData.fullName, email: context.email, contact: normalizedPhone },
      ...(input.fbp ? { meta_fbp: input.fbp } : {}),
      ...(input.fbc ? { meta_fbc: input.fbc } : {}),
    },
  });
  await updatePaymentAttemptStatus(
    paymentAttempt.id,
    paymentAttempt.status,
    "pending",
    { provider_order_id: providerOrder.id },
    {
      actorId: context.userId,
      actorRole: "customer",
      reason: "Cart payment attempt created from authoritative quote versions",
    },
  );
  await supabase
    .from("quote_captures")
    .update({
      razorpay_order_id: providerOrder.id,
      payment_attempt_id: paymentAttempt.id,
    })
    .eq("id", capture.id)
    .eq("status", "pending");
  await insertPaymentAuditLog({
    actor_id: context.userId,
    actor_role: "customer",
    action: "payment_attempt_created",
    entity_type: "custom_quote",
    entity_id: capture.reference,
    previous_state: null,
    new_state: {
      quote_version_ids: quoteVersionIds,
      payment_attempt_id: paymentAttempt.id,
      provider_order_id: providerOrder.id,
      amount_paise: amountPaise,
    },
  });

  return {
    reference: capture.reference,
    session: {
      keyId: getPublicRazorpayKeyId(),
      orderId: providerOrder.id,
      amount: amountPaise,
      currency: "INR",
    },
    customer: {
      name: addressData.fullName,
      email: context.email,
      contact: normalizedPhone,
    },
  };
}
