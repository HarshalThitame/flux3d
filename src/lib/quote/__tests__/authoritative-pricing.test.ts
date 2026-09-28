import { describe, expect, it } from "vitest";
import { calculateAuthoritativePricing } from "../authoritative-pricing";
import type { QuoteAnalysisConfig, WorkerResult } from "../analysis-types";

const config: QuoteAnalysisConfig = {
  materialId: "pla",
  color: "Black",
  layerHeight: 0.2,
  infill: 20,
  quantity: 2,
  supports: "auto",
  postProcessingLevel: "sanded",
  unitConfirmed: true,
  orientationPolicy: "automatic",
};

const result: WorkerResult = {
  type: "result",
  resultKind: "ready",
  geometryHash: "a".repeat(64),
  fileSha256: "b".repeat(64),
  importer: "lib3mf",
  importerVersion: "2.4.1",
  slicerVersion: "02.06.00.51",
  dimensionsMm: { x: 20, y: 30, z: 40 },
  solidVolumeMm3: 24_000,
  surfaceAreaMm2: 5_000,
  geometryQuality: {},
  slicerMetrics: {
    finishedPartWeightGrams: 42,
    supportWeightGrams: 5,
    brimWeightGrams: 1,
    purgeWeightGrams: 2,
    billableMaterialGrams: 50,
    elapsedSeconds: 7_200,
    layerCount: 200,
    plateCount: 1,
  },
  profileVersions: {},
  warningCodes: [],
  processingDurationMs: 9_000,
  geometryCacheHit: false,
  slicingCacheHit: false,
};

describe("calculateAuthoritativePricing", () => {
  it("uses billable slicer grams and gross-margin division in integer paise", () => {
    const price = calculateAuthoritativePricing({
      result,
      config,
      filament: { version: "pla-1", material_rate_paise_per_gram: 200 },
      pricing: {
        version: "pricing-1",
        machine_rate_paise_per_hour: 10_000,
        labour_rate_paise_per_hour: 6_000,
        setup_minutes: 10,
        per_part_labour_minutes: 5,
        surface_rate_paise_per_cm2: 10,
        consumables_paise: 100,
        overhead_basis_points: 1_000,
        margin_basis_points: 2_000,
        gst_basis_points: 1_800,
        minimum_order_paise: 0,
        delivery_threshold_paise: 100_000,
        default_delivery_paise: 5_000,
      },
    });

    expect(price.snapshot.materialPaise).toBe(10_000);
    expect(price.snapshot.machinePaise).toBe(20_000);
    expect(price.snapshot.costPaise).toBe(35_860);
    expect(price.snapshot.priceBeforeTaxPaise).toBe(44_825);
    expect(price.gstPaise).toBe(8_069);
    expect(price.deliveryPaise).toBe(5_000);
    expect(price.totalPaise).toBe(57_894);
  });

  it("does not silently price a result without slicer metrics", () => {
    expect(() =>
      calculateAuthoritativePricing({
        result: { ...result, slicerMetrics: undefined },
        config,
        filament: { version: "pla-1", material_rate_paise_per_gram: 200 },
        pricing: {
          version: "pricing-1",
          machine_rate_paise_per_hour: 0,
          labour_rate_paise_per_hour: 0,
          setup_minutes: 0,
          per_part_labour_minutes: 0,
          surface_rate_paise_per_cm2: 0,
          consumables_paise: 0,
          overhead_basis_points: 0,
          margin_basis_points: 0,
          gst_basis_points: 0,
          minimum_order_paise: 0,
          delivery_threshold_paise: 0,
          default_delivery_paise: 0,
        },
      }),
    ).toThrow("completed slicer result");
  });
});
