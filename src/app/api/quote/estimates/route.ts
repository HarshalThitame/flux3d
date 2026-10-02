import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { rateLimitResponse } from "@/lib/rate-limit";
import { calculateServerQuotePricing, type ModelMetadata } from "@/lib/quote/server-pricing";
import { normalizeOwnedStoragePath } from "@/lib/quote/storage-path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const dimensionsSchema = z.object({
  x: z.number().finite().positive().max(256),
  y: z.number().finite().positive().max(256),
  z: z.number().finite().positive().max(256),
});
const requestSchema = z.object({
  quoteId: z.string().regex(/^F3D-[A-F0-9]{8}$/),
  storagePath: z.string().trim().min(3).max(1024),
  config: z.object({
    materialId: z.string().trim().min(1).max(100),
    color: z.string().trim().min(1).max(100),
    layerHeight: z.union([z.literal(0.2), z.literal(0.12), z.literal(0.08)]),
    infill: z.number().int().min(0).max(100),
    quantity: z.number().int().min(1).max(100),
    supports: z.boolean(),
    postProcessingLevel: z.enum(["none", "sanded", "sanded-painted"]),
  }),
  model: z.object({
    fileName: z.string().trim().min(1).max(255),
    fileSize: z.number().int().positive().max(100 * 1024 * 1024),
    extension: z.string().trim().toLowerCase().min(1).max(10),
    volumeMm3: z.number().finite().positive().max(16_777_216),
    surfaceAreaMm2: z.number().finite().nonnegative().max(1_000_000),
    supportVolumeMm3: z.number().finite().nonnegative().max(16_777_216),
    dimensionsMm: dimensionsSchema,
    triangleCount: z.number().int().nonnegative().max(2_000_000),
    suggestedMaterialId: z.string().max(100).optional(),
  }),
});

function paise(value: number) {
  const amount = Math.round(value * 100);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Estimate amount is invalid.");
  return amount;
}

export async function POST(request: Request) {
  const auth = await createServerSupabaseClient();
  const { data, error } = await auth.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await rateLimitResponse(request, {
    prefix: "quote_estimate_create",
    windowSeconds: 60,
    maxRequests: 10,
    userId: data.user.id,
  });
  if (!limit.success) return NextResponse.json({ error: "Too many quote requests." }, { status: 429 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid estimate request." }, { status: 400 });

  try {
    const storagePath = normalizeOwnedStoragePath(parsed.data.storagePath, data.user.id);
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? "quote-models";
    const admin = createAdminSupabaseClient();
    const { data: info, error: infoError } = await admin.storage.from(bucket).info(storagePath);
    if (infoError || !info) throw new Error("Uploaded model was not found.");
    const metadata = (info.metadata ?? {}) as Record<string, unknown>;
    const actualSize = Number(metadata.size ?? metadata.contentLength ?? (info as { size?: unknown }).size ?? 0);
    if (!Number.isSafeInteger(actualSize) || actualSize < 1 || actualSize > 100 * 1024 * 1024 || actualSize !== parsed.data.model.fileSize) {
      throw new Error("Uploaded file size could not be verified.");
    }

    const model = parsed.data.model as ModelMetadata;
    const { breakdown, material } = await calculateServerQuotePricing(model, parsed.data.config);
    const { data: latest } = await admin.from("quote_versions").select("version_number")
      .eq("quote_id", parsed.data.quoteId).order("version_number", { ascending: false }).limit(1).maybeSingle();
    // Store the final post-discount/minimum subtotal so payment preparation can
    // charge the same amount without relying on browser-supplied price fields.
    const subtotalPaise = paise(breakdown.finalPrice);
    const discountPaise = 0;
    const deliveryPaise = paise(breakdown.deliveryCharge);
    const totalPaise = paise(breakdown.grandTotal);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const quoteData = {
      quote_id: parsed.data.quoteId,
      user_id: data.user.id,
      version_number: Number(latest?.version_number ?? 0) + 1,
      status: "approved",
      approved_at: new Date().toISOString(),
      pricing_snapshot: {
        materialPaise: paise(breakdown.materialCost),
        machinePaise: paise(breakdown.machineCost),
        postProcessingPaise: paise(breakdown.postProcessingCharges),
        overheadPaise: paise(breakdown.overheadAmount),
        costPaise: paise(breakdown.subtotal + breakdown.overheadAmount),
        priceBeforeTaxPaise: subtotalPaise,
        overheadBasisPoints: Math.round(breakdown.overheadPercentage * 100),
        marginBasisPoints: Math.round(breakdown.marginPercentage * 100),
      },
      material_id: material.id,
      config: parsed.data.config,
      model_metadata: {
        ...model,
        dimensionsMm: model.dimensionsMm,
        solidVolumeMm3: model.volumeMm3,
        storagePath,
      },
      expires_at: expiresAt,
      currency: "INR",
      subtotal_paise: subtotalPaise,
      discount_paise: discountPaise,
      gst_paise: 0,
      delivery_paise: deliveryPaise,
      total_paise: totalPaise,
      authoritative_metrics: {
        finishedPartWeightGrams: breakdown.materialWeightGrams,
        billableMaterialGrams: breakdown.materialWeightGrams,
        elapsedSeconds: Math.round(breakdown.estimatedHours * 3600),
        plateCount: 1,
        estimateOnly: true,
      },
      profile_versions: { source: "browser-estimate-v1", pricing: "server-settings-v1" },
      snapshot_schema_version: 2,
    };
    const { data: quote, error: insertError } = await admin.from("quote_versions").insert(quoteData).select("id").single();
    if (insertError || !quote) throw new Error(insertError?.message ?? "Could not save estimate.");

    return NextResponse.json({
      quoteVersionId: quote.id,
      expiresAt,
      pricing: breakdown,
      estimateOnly: true,
    }, { status: 201 });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Could not create estimate.";
    const status = /invalid|not found|does not belong|verified|exceeds/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
