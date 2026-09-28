import "server-only";

import crypto from "node:crypto";
import { getQStashClient } from "@/lib/email/qstash";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import { normalizeOwnedStoragePath } from "@/lib/quote/storage-path";
import { calculateAuthoritativePricing } from "./authoritative-pricing";
import type {
  QuoteAnalysisConfig,
  QuoteAnalysisResponse,
  QuoteAnalysisStatus,
  QuoteDiagnosticCode,
  WorkerResult,
} from "./analysis-types";

const QUOTE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? "quote-models";
const UNITLESS_EXTENSIONS = new Set(["stl", "obj", "ply"]);

function fileNameFromPath(path: string) {
  return path.split("/").pop() || "model";
}

function extensionFromPath(path: string) {
  return fileNameFromPath(path).split(".").pop()?.toLowerCase() ?? "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function markManualReview(
  analysisId: string,
  diagnosticCodes: QuoteDiagnosticCode[],
  message: string,
) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("quote_analysis_jobs")
    .update({
      status: "manual_review",
      progress: 100,
      diagnostic_codes: diagnosticCodes,
      failure_stage: "dispatch",
      failure_message: message,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", analysisId);
  if (error) throw new Error(error.message);
}

export async function enqueueQuoteAnalysis(analysisId: string) {
  const workerUrl = process.env.QUOTE_WORKER_URL?.replace(/\/+$/, "");
  const workerToken = process.env.QUOTE_WORKER_TOKEN;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (!workerUrl || !workerToken || !siteUrl) {
    await markManualReview(
      analysisId,
      ["worker_unavailable", "manual_review_required"],
      "The authoritative slicing worker is not configured.",
    );
    return { queued: false as const };
  }
  try {
    new URL(`${workerUrl}/v1/jobs`);
    new URL(siteUrl);
  } catch {
    await markManualReview(
      analysisId,
      ["worker_unavailable", "manual_review_required"],
      "The authoritative worker or callback URL is invalid.",
    );
    return { queued: false as const };
  }

  const supabase = createAdminSupabaseClient();
  const { data: job, error } = await supabase
    .from("quote_analysis_jobs")
    .select("id, storage_bucket, storage_path, unit_override, config")
    .eq("id", analysisId)
    .single();
  if (error || !job) throw new Error(error?.message ?? "Analysis job not found.");

  try {
    const result = await getQStashClient().publishJSON({
      url: `${workerUrl}/v1/jobs`,
      body: {
        analysisId: job.id,
        storageBucket: job.storage_bucket,
        storagePath: job.storage_path,
        unitOverride: job.unit_override,
        config: job.config,
        callbackUrl: `${siteUrl}/api/quote/worker/jobs/${job.id}`,
      },
      retries: 5,
      timeout: 30,
      headers: {
        "X-Quote-Analysis-Id": job.id,
        "X-Quote-Worker-Token": workerToken,
      },
    });

    const { error: updateError } = await supabase
      .from("quote_analysis_jobs")
      .update({
        status: "queued",
        progress: 5,
        worker_job_id: result.messageId,
        queued_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", analysisId)
      .in("status", ["uploaded", "queued"]);
    if (updateError) throw new Error(updateError.message);
    return { queued: true as const };
  } catch (error) {
    await markManualReview(
      analysisId,
      ["worker_unavailable", "manual_review_required"],
      "The slicing worker could not be queued. The model was sent for manual review.",
    );
    console.error("[quote-analysis] Worker enqueue failed:", error);
    return { queued: false as const };
  }
}

export async function createQuoteAnalysis(input: {
  userId: string;
  storagePath: string;
  unitOverride?: "mm" | "cm" | "m" | "in" | "ft";
}) {
  const storagePath = normalizeOwnedStoragePath(input.storagePath, input.userId);
  const supabase = createAdminSupabaseClient();
  const { data: fileInfo, error: fileError } = await supabase.storage
    .from(QUOTE_BUCKET)
    .info(storagePath);
  if (fileError || !fileInfo) throw new Error("Uploaded file was not found.");

  const fileSize = Number(fileInfo.metadata?.size ?? 0);
  if (!Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > 100 * 1024 * 1024) {
    throw new Error("Uploaded file size is invalid or exceeds 100 MB.");
  }

  const extension = extensionFromPath(storagePath);
  const unitConfirmationRequired = UNITLESS_EXTENSIONS.has(extension) && !input.unitOverride;
  const idempotencyKey = crypto
    .createHash("sha256")
    .update(`${storagePath}:${fileSize}:${input.unitOverride ?? "unconfirmed"}`)
    .digest("hex");

  const { data: existing, error: existingError } = await supabase
    .from("quote_analysis_jobs")
    .select("id, status")
    .eq("user_id", input.userId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) {
    return { analysisId: existing.id as string, status: existing.status as QuoteAnalysisStatus };
  }

  const diagnosticCodes: QuoteDiagnosticCode[] = unitConfirmationRequired
    ? ["unit_confirmation_required"]
    : [];
  const { data: created, error: insertError } = await supabase
    .from("quote_analysis_jobs")
    .insert({
      user_id: input.userId,
      storage_bucket: QUOTE_BUCKET,
      storage_path: storagePath,
      original_file_name: fileNameFromPath(storagePath),
      file_size_bytes: fileSize,
      idempotency_key: idempotencyKey,
      unit_override: input.unitOverride ?? null,
      config: { unitConfirmed: !unitConfirmationRequired },
      diagnostic_codes: diagnosticCodes,
      status: "uploaded",
      progress: 1,
    })
    .select("id, status")
    .single();
  if (insertError || !created) throw new Error(insertError?.message ?? "Could not create analysis.");

  if (extension === "dwg") {
    await markManualReview(
      created.id,
      ["unsupported_format", "manual_review_required"],
      "DWG files require manual conversion review.",
    );
    return { analysisId: created.id as string, status: "manual_review" as const };
  }

  const dispatch = await enqueueQuoteAnalysis(created.id);
  return {
    analysisId: created.id as string,
    status: dispatch.queued ? ("queued" as const) : ("manual_review" as const),
  };
}

export async function createConfiguredAnalysis(input: {
  userId: string;
  analysisId: string;
  config: QuoteAnalysisConfig;
}) {
  const supabase = createAdminSupabaseClient();
  const { data: parent, error: parentError } = await supabase
    .from("quote_analysis_jobs")
    .select("id, storage_bucket, storage_path, original_file_name, file_size_bytes, file_sha256, unit_override, status")
    .eq("id", input.analysisId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (parentError) throw new Error(parentError.message);
  if (!parent) throw new Error("Analysis not found.");
  if (parent.status !== "ready") throw new Error("Geometry analysis is not ready for slicing.");
  if (!input.config.unitConfirmed && UNITLESS_EXTENSIONS.has(extensionFromPath(parent.storage_path))) {
    throw new Error("Confirm the model units before slicing.");
  }

  const idempotencyKey = crypto
    .createHash("sha256")
    .update(`${parent.id}:${JSON.stringify(input.config)}`)
    .digest("hex");
  const { data: existing } = await supabase
    .from("quote_analysis_jobs")
    .select("id, status")
    .eq("user_id", input.userId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing) return { analysisId: existing.id as string, status: existing.status as QuoteAnalysisStatus };

  const { data: created, error } = await supabase
    .from("quote_analysis_jobs")
    .insert({
      user_id: input.userId,
      parent_job_id: parent.id,
      storage_bucket: parent.storage_bucket,
      storage_path: parent.storage_path,
      original_file_name: parent.original_file_name,
      file_size_bytes: parent.file_size_bytes,
      file_sha256: parent.file_sha256,
      idempotency_key: idempotencyKey,
      unit_override: parent.unit_override,
      config: input.config,
      status: "uploaded",
      progress: 1,
    })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Could not create slicing analysis.");

  const dispatch = await enqueueQuoteAnalysis(created.id);
  return {
    analysisId: created.id as string,
    status: dispatch.queued ? ("queued" as const) : ("manual_review" as const),
  };
}

export async function getQuoteAnalysis(userId: string, analysisId: string): Promise<QuoteAnalysisResponse | null> {
  const supabase = createAdminSupabaseClient();
  const { data: job, error } = await supabase
    .from("quote_analysis_jobs")
    .select("id, status, progress, diagnostic_codes, failure_stage, failure_message, config, original_file_name, unit_override, created_at, updated_at")
    .eq("id", analysisId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!job) return null;

  const [{ data: result }, { data: quote }] = await Promise.all([
    supabase.from("quote_analysis_results").select("*").eq("analysis_job_id", analysisId).maybeSingle(),
    supabase
      .from("quote_versions")
      .select("id, currency, subtotal_paise, discount_paise, gst_paise, delivery_paise, total_paise, expires_at, pricing_snapshot")
      .eq("analysis_job_id", analysisId)
      .maybeSingle(),
  ]);

  const extension = extensionFromPath(job.original_file_name);
  const response: QuoteAnalysisResponse = {
    analysisId: job.id,
    status: job.status as QuoteAnalysisStatus,
    progress: Number(job.progress),
    diagnosticCodes: asStringArray(job.diagnostic_codes) as QuoteDiagnosticCode[],
    requiresUnitConfirmation:
      UNITLESS_EXTENSIONS.has(extension) &&
      !Boolean(asRecord(job.config).unitConfirmed) &&
      !job.unit_override,
    config: asRecord(job.config),
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  };

  if (job.failure_message) {
    response.failure = { stage: job.failure_stage, message: job.failure_message };
  }
  if (result) {
    response.result = {
      id: result.id,
      kind: result.result_kind,
      dimensionsMm: result.dimensions_mm,
      solidVolumeMm3: Number(result.solid_volume_mm3),
      surfaceAreaMm2: result.surface_area_mm2 == null ? null : Number(result.surface_area_mm2),
      triangleCount: result.triangle_count == null ? null : Number(result.triangle_count),
      geometryQuality: asRecord(result.geometry_quality),
      previewPath: result.preview_path,
      orientation: result.chosen_orientation ? asRecord(result.chosen_orientation) : null,
      slicerMetrics: result.slicer_metrics,
      warningCodes: asStringArray(result.warning_codes),
      manualReview: result.manual_review ? asRecord(result.manual_review) : null,
    };
  }
  if (quote?.total_paise != null && quote.expires_at) {
    const pricing = asRecord(quote.pricing_snapshot);
    const costPaise = Number(pricing.costPaise ?? 0);
    const priceBeforeTaxPaise = Number(pricing.priceBeforeTaxPaise ?? costPaise);
    response.quote = {
      quoteVersionId: quote.id,
      currency: "INR",
      subtotalPaise: Number(quote.subtotal_paise),
      discountPaise: Number(quote.discount_paise ?? 0),
      gstPaise: Number(quote.gst_paise ?? 0),
      deliveryPaise: Number(quote.delivery_paise ?? 0),
      totalPaise: Number(quote.total_paise),
      expiresAt: quote.expires_at,
      breakdown: {
        materialPaise: Number(pricing.materialPaise ?? 0),
        machinePaise: Number(pricing.machinePaise ?? 0),
        postProcessingPaise: Number(pricing.postProcessingPaise ?? 0),
        overheadPaise: Number(pricing.overheadPaise ?? 0),
        marginPaise: Math.max(0, priceBeforeTaxPaise - costPaise),
      },
    };
  }
  return response;
}

export async function updateAnalysisProgress(
  analysisId: string,
  event: {
    status: Exclude<QuoteAnalysisStatus, "uploaded" | "queued" | "ready">;
    progress: number;
    diagnosticCodes: QuoteDiagnosticCode[];
    failureMessage?: string;
    workerJobId?: string;
  },
) {
  const supabase = createAdminSupabaseClient();
  const terminal = event.status === "manual_review" || event.status === "failed";
  const { error } = await supabase
    .from("quote_analysis_jobs")
    .update({
      status: event.status,
      progress: terminal ? 100 : event.progress,
      diagnostic_codes: event.diagnosticCodes,
      failure_stage: event.status === "failed" ? event.status : null,
      failure_message: event.failureMessage ?? null,
      worker_job_id: event.workerJobId,
      started_at: new Date().toISOString(),
      completed_at: terminal ? new Date().toISOString() : null,
      last_heartbeat_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", analysisId)
    .not("status", "in", '("ready","manual_review","failed")');
  if (error) throw new Error(error.message);
}

export async function finalizeAnalysisResult(analysisId: string, result: WorkerResult) {
  const supabase = createAdminSupabaseClient();
  const { data: job, error: jobError } = await supabase
    .from("quote_analysis_jobs")
    .select("id, user_id, parent_job_id, config, original_file_name")
    .eq("id", analysisId)
    .single();
  if (jobError || !job) throw new Error(jobError?.message ?? "Analysis job not found.");

  const { data: existing } = await supabase
    .from("quote_analysis_results")
    .select("id")
    .eq("analysis_job_id", analysisId)
    .maybeSingle();
  if (existing) return { resultId: existing.id as string, idempotent: true };

  const { data: inserted, error: resultError } = await supabase
    .from("quote_analysis_results")
    .insert({
      analysis_job_id: analysisId,
      geometry_hash: result.geometryHash,
      result_kind: result.resultKind,
      importer: result.importer,
      importer_version: result.importerVersion,
      slicer_version: result.slicerVersion ?? null,
      canonical_model_path: result.canonicalModelPath ?? null,
      preview_path: result.previewPath ?? null,
      dimensions_mm: result.dimensionsMm,
      solid_volume_mm3: result.solidVolumeMm3,
      surface_area_mm2: result.surfaceAreaMm2 ?? null,
      triangle_count: result.triangleCount ?? null,
      geometry_quality: result.geometryQuality,
      chosen_orientation: result.chosenOrientation ?? null,
      slicer_metrics: result.slicerMetrics ?? null,
      profile_versions: result.profileVersions,
      warning_codes: result.warningCodes,
      manual_review: result.manualReview ?? null,
    })
    .select("id")
    .single();
  if (resultError || !inserted) throw new Error(resultError?.message ?? "Could not persist worker result.");

  const now = new Date().toISOString();
  await supabase
    .from("quote_analysis_jobs")
    .update({
      file_sha256: result.fileSha256,
      status: result.resultKind,
      progress: 100,
      geometry_cache_hit: result.geometryCacheHit,
      slicing_cache_hit: result.slicingCacheHit,
      processing_duration_ms: result.processingDurationMs,
      completed_at: now,
      last_heartbeat_at: now,
      updated_at: now,
    })
    .eq("id", analysisId);

  const parsedConfig = asRecord(job.config) as Partial<QuoteAnalysisConfig>;
  if (result.resultKind !== "ready" || !result.slicerMetrics || !parsedConfig.materialId) {
    return { resultId: inserted.id as string, idempotent: false };
  }

  const processProfileKey =
    parsedConfig.layerHeight === 0.08
      ? "ultra-008"
      : parsedConfig.layerHeight === 0.12
        ? "quality-012"
        : "standard-020";
  const [pricingQuery, filamentQuery, printerQuery, processQuery] = await Promise.all([
    supabase.from("quote_pricing_profiles").select("*").eq("is_active", true).limit(1).maybeSingle(),
    supabase
      .from("quote_filament_profiles")
      .select("*")
      .eq("profile_key", parsedConfig.materialId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("quote_printer_profiles")
      .select("version")
      .eq("profile_key", "bambu-a1-0.4")
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("quote_process_profiles")
      .select("version")
      .eq("profile_key", processProfileKey)
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  if (
    !pricingQuery.data ||
    !filamentQuery.data ||
    !printerQuery.data ||
    !processQuery.data
  ) {
    await markManualReview(
      analysisId,
      ["manual_review_required"],
      "Calibrated printer, process, filament, or pricing profiles are not active.",
    );
    return { resultId: inserted.id as string, idempotent: false };
  }
  const profilesMatch =
    result.profileVersions.machine === printerQuery.data.version &&
    result.profileVersions.process === processQuery.data.version &&
    result.profileVersions.filament === filamentQuery.data.version;
  if (!profilesMatch) {
    await markManualReview(
      analysisId,
      ["manual_review_required"],
      "The worker profile versions do not match the active calibrated quote profiles.",
    );
    return { resultId: inserted.id as string, idempotent: false };
  }

  const config = parsedConfig as QuoteAnalysisConfig;
  const calculated = calculateAuthoritativePricing({
    result,
    config,
    pricing: pricingQuery.data,
    filament: filamentQuery.data,
  });
  const rootId = job.parent_job_id ?? job.id;
  const quoteId = `F3D-${String(rootId).replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  const { data: latest } = await supabase
    .from("quote_versions")
    .select("version_number")
    .eq("quote_id", quoteId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const profileVersions = {
    ...result.profileVersions,
    pricing: pricingQuery.data.version,
    filament: filamentQuery.data.version,
    printer: printerQuery.data.version,
    process: processQuery.data.version,
  };
  const { error: quoteError } = await supabase.from("quote_versions").insert({
    quote_id: quoteId,
    user_id: job.user_id,
    version_number: Number(latest?.version_number ?? 0) + 1,
    status: "approved",
    approved_at: now,
    pricing_snapshot: calculated.snapshot,
    material_id: config.materialId,
    config,
    model_metadata: {
      fileName: job.original_file_name,
      dimensionsMm: result.dimensionsMm,
      solidVolumeMm3: result.solidVolumeMm3,
      surfaceAreaMm2: result.surfaceAreaMm2,
      triangleCount: result.triangleCount,
    },
    analysis_job_id: analysisId,
    analysis_result_id: inserted.id,
    expires_at: expiresAt,
    currency: calculated.currency,
    subtotal_paise: calculated.subtotalPaise,
    discount_paise: calculated.discountPaise,
    gst_paise: calculated.gstPaise,
    delivery_paise: calculated.deliveryPaise,
    total_paise: calculated.totalPaise,
    authoritative_metrics: result.slicerMetrics,
    profile_versions: profileVersions,
    snapshot_schema_version: 2,
  });
  if (quoteError) throw new Error(quoteError.message);
  return { resultId: inserted.id as string, idempotent: false };
}
