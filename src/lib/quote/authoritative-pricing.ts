import "server-only";

import type { QuoteAnalysisConfig, WorkerResult } from "./analysis-types";

type PricingProfile = {
  version: string;
  machine_rate_paise_per_hour: number;
  labour_rate_paise_per_hour: number;
  setup_minutes: number;
  per_part_labour_minutes: number;
  surface_rate_paise_per_cm2: number;
  consumables_paise: number;
  overhead_basis_points: number;
  margin_basis_points: number;
  gst_basis_points: number;
  minimum_order_paise: number;
  delivery_threshold_paise: number;
  default_delivery_paise: number;
};

type FilamentProfile = {
  version: string;
  material_rate_paise_per_gram: number;
};

function paise(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Pricing produced an invalid monetary value.");
  }
  return Math.round(value);
}

export function calculateAuthoritativePricing(input: {
  result: WorkerResult;
  config: QuoteAnalysisConfig;
  pricing: PricingProfile;
  filament: FilamentProfile;
}) {
  const metrics = input.result.slicerMetrics;
  if (!metrics || input.result.resultKind !== "ready") {
    throw new Error("A completed slicer result is required for automatic pricing.");
  }

  const materialPaise = paise(
    metrics.billableMaterialGrams * input.filament.material_rate_paise_per_gram,
  );
  const machinePaise = paise(
    (metrics.elapsedSeconds / 3600) * input.pricing.machine_rate_paise_per_hour,
  );
  const labourMinutes =
    input.pricing.setup_minutes +
    input.pricing.per_part_labour_minutes * input.config.quantity;
  const labourPaise = paise(
    (labourMinutes / 60) * input.pricing.labour_rate_paise_per_hour,
  );
  const surfaceCm2 = (input.result.surfaceAreaMm2 ?? 0) / 100;
  const surfacePaise = paise(
    surfaceCm2 * input.pricing.surface_rate_paise_per_cm2,
  );
  const postProcessingPaise =
    input.config.postProcessingLevel === "none"
      ? 0
      : labourPaise + surfacePaise + input.pricing.consumables_paise;
  const directManufacturingPaise =
    materialPaise + machinePaise + postProcessingPaise;
  const overheadPaise = paise(
    (directManufacturingPaise * input.pricing.overhead_basis_points) / 10_000,
  );
  const costPaise = directManufacturingPaise + overheadPaise;
  const marginFraction = input.pricing.margin_basis_points / 10_000;
  const priceBeforeTaxPaise = paise(costPaise / (1 - marginFraction));
  const minimumAdjustedPaise = Math.max(
    priceBeforeTaxPaise,
    input.pricing.minimum_order_paise,
  );
  const gstPaise = paise(
    (minimumAdjustedPaise * input.pricing.gst_basis_points) / 10_000,
  );
  const deliveryPaise =
    minimumAdjustedPaise >= input.pricing.delivery_threshold_paise
      ? 0
      : input.pricing.default_delivery_paise;
  const totalPaise = minimumAdjustedPaise + gstPaise + deliveryPaise;

  return {
    currency: "INR" as const,
    subtotalPaise: minimumAdjustedPaise,
    discountPaise: 0,
    gstPaise,
    deliveryPaise,
    totalPaise,
    snapshot: {
      materialPaise,
      machinePaise,
      postProcessingPaise,
      labourPaise,
      surfacePaise,
      directManufacturingPaise,
      overheadPaise,
      costPaise,
      priceBeforeTaxPaise,
      minimumAdjustedPaise,
      gstPaise,
      deliveryPaise,
      totalPaise,
      marginBasisPoints: input.pricing.margin_basis_points,
      overheadBasisPoints: input.pricing.overhead_basis_points,
      pricingProfileVersion: input.pricing.version,
      filamentProfileVersion: input.filament.version,
    },
  };
}
