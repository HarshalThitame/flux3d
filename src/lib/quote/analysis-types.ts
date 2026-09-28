import { z } from "zod";

export const quoteAnalysisStatuses = [
  "uploaded",
  "queued",
  "converting",
  "validating",
  "orienting",
  "slicing",
  "ready",
  "manual_review",
  "failed",
] as const;

export type QuoteAnalysisStatus = (typeof quoteAnalysisStatuses)[number];

export const quoteDiagnosticCodes = [
  "invalid_archive",
  "missing_asset",
  "unsupported_3mf_extension",
  "unit_confirmation_required",
  "non_manifold_geometry",
  "self_intersection",
  "repair_volume_delta_exceeded",
  "oversized_model",
  "build_volume_exceeded",
  "unsupported_format",
  "encrypted_file",
  "complexity_limit_exceeded",
  "slicer_failed",
  "worker_unavailable",
  "manual_review_required",
] as const;

export type QuoteDiagnosticCode = (typeof quoteDiagnosticCodes)[number];

export const unitOverrideSchema = z.enum(["mm", "cm", "m", "in", "ft"]);

export const quoteAnalysisConfigSchema = z.object({
  materialId: z.string().trim().min(1).max(100),
  color: z.string().trim().min(1).max(100),
  layerHeight: z.union([z.literal(0.2), z.literal(0.12), z.literal(0.08)]),
  infill: z.number().int().min(0).max(100),
  quantity: z.number().int().min(1).max(1000),
  supports: z.enum(["auto", "always", "never"]),
  postProcessingLevel: z.enum(["none", "sanded", "sanded-painted"]),
  unitConfirmed: z.boolean(),
  orientationPolicy: z.enum(["automatic", "preserve"]),
});

export type QuoteAnalysisConfig = z.infer<typeof quoteAnalysisConfigSchema>;

export const createQuoteAnalysisSchema = z.object({
  storagePath: z.string().trim().min(3).max(1024),
  unitOverride: unitOverrideSchema.optional(),
});

const dimensionsSchema = z.object({
  x: z.number().finite().nonnegative(),
  y: z.number().finite().nonnegative(),
  z: z.number().finite().nonnegative(),
});

export const slicerMetricsSchema = z.object({
  finishedPartWeightGrams: z.number().finite().nonnegative(),
  supportWeightGrams: z.number().finite().nonnegative(),
  brimWeightGrams: z.number().finite().nonnegative(),
  purgeWeightGrams: z.number().finite().nonnegative(),
  billableMaterialGrams: z.number().finite().nonnegative(),
  elapsedSeconds: z.number().int().nonnegative(),
  layerCount: z.number().int().nonnegative(),
  plateCount: z.number().int().positive(),
});

export const workerProgressSchema = z.object({
  type: z.literal("progress"),
  status: z.enum([
    "converting",
    "validating",
    "orienting",
    "slicing",
    "manual_review",
    "failed",
  ]),
  progress: z.number().int().min(0).max(100),
  diagnosticCodes: z.array(z.enum(quoteDiagnosticCodes)).default([]),
  failureMessage: z.string().trim().max(2000).optional(),
  workerJobId: z.string().trim().max(200).optional(),
});

export const workerResultSchema = z.object({
  type: z.literal("result"),
  resultKind: z.enum(["ready", "manual_review"]),
  geometryHash: z.string().regex(/^[a-f0-9]{64}$/),
  fileSha256: z.string().regex(/^[a-f0-9]{64}$/),
  importer: z.string().trim().min(1).max(100),
  importerVersion: z.string().trim().min(1).max(100),
  slicerVersion: z.string().trim().min(1).max(100).optional(),
  canonicalModelPath: z.string().trim().max(1024).optional(),
  previewPath: z.string().trim().max(1024).optional(),
  dimensionsMm: dimensionsSchema,
  solidVolumeMm3: z.number().finite().nonnegative(),
  surfaceAreaMm2: z.number().finite().nonnegative().optional(),
  triangleCount: z.number().int().nonnegative().optional(),
  geometryQuality: z.record(z.string(), z.unknown()).default({}),
  chosenOrientation: z.record(z.string(), z.unknown()).optional(),
  slicerMetrics: slicerMetricsSchema.optional(),
  profileVersions: z.record(z.string(), z.string()).default({}),
  warningCodes: z.array(z.string().trim().min(1).max(100)).default([]),
  manualReview: z.record(z.string(), z.unknown()).optional(),
  processingDurationMs: z.number().int().nonnegative(),
  geometryCacheHit: z.boolean().default(false),
  slicingCacheHit: z.boolean().default(false),
});

export const workerEventSchema = z.discriminatedUnion("type", [
  workerProgressSchema,
  workerResultSchema,
]);

export type WorkerResult = z.infer<typeof workerResultSchema>;

export type QuoteAnalysisResponse = {
  analysisId: string;
  status: QuoteAnalysisStatus;
  progress: number;
  diagnosticCodes: QuoteDiagnosticCode[];
  failure?: { stage: string | null; message: string };
  requiresUnitConfirmation: boolean;
  config: Partial<QuoteAnalysisConfig>;
  createdAt: string;
  updatedAt: string;
  result?: {
    id: string;
    kind: "ready" | "manual_review";
    dimensionsMm: { x: number; y: number; z: number };
    solidVolumeMm3: number;
    surfaceAreaMm2: number | null;
    triangleCount: number | null;
    geometryQuality: Record<string, unknown>;
    previewPath: string | null;
    orientation: Record<string, unknown> | null;
    slicerMetrics: z.infer<typeof slicerMetricsSchema> | null;
    warningCodes: string[];
    manualReview: Record<string, unknown> | null;
  };
  quote?: {
    quoteVersionId: string;
    currency: "INR";
    subtotalPaise: number;
    discountPaise: number;
    gstPaise: number;
    deliveryPaise: number;
    totalPaise: number;
    expiresAt: string;
    breakdown: {
      materialPaise: number;
      machinePaise: number;
      postProcessingPaise: number;
      overheadPaise: number;
      marginPaise: number;
    };
  };
};
