import { describe, expect, it } from "vitest";
import {
  createQuoteAnalysisSchema,
  quoteAnalysisConfigSchema,
  workerEventSchema,
} from "../analysis-types";

describe("authoritative quote input validation", () => {
  it("accepts only supported layer profiles and bounded quantity", () => {
    expect(
      quoteAnalysisConfigSchema.safeParse({
        materialId: "pla",
        color: "Black",
        layerHeight: 0.1,
        infill: 20,
        quantity: 1,
        supports: "auto",
        postProcessingLevel: "none",
        unitConfirmed: true,
        orientationPolicy: "automatic",
      }).success,
    ).toBe(false);
    expect(
      quoteAnalysisConfigSchema.safeParse({
        materialId: "pla",
        color: "Black",
        layerHeight: 0.12,
        infill: 20,
        quantity: 1001,
        supports: "auto",
        postProcessingLevel: "none",
        unitConfirmed: true,
        orientationPolicy: "automatic",
      }).success,
    ).toBe(false);
  });

  it("rejects paths and units outside the public contract", () => {
    expect(createQuoteAnalysisSchema.safeParse({ storagePath: "" }).success).toBe(false);
    expect(
      createQuoteAnalysisSchema.safeParse({ storagePath: "user/model.stl", unitOverride: "yards" }).success,
    ).toBe(false);
  });

  it("rejects fabricated negative slicer metrics", () => {
    const parsed = workerEventSchema.safeParse({
      type: "result",
      resultKind: "ready",
      geometryHash: "a".repeat(64),
      fileSha256: "b".repeat(64),
      importer: "lib3mf",
      importerVersion: "1",
      dimensionsMm: { x: 1, y: 1, z: 1 },
      solidVolumeMm3: 1,
      slicerMetrics: {
        finishedPartWeightGrams: -1,
        supportWeightGrams: 0,
        brimWeightGrams: 0,
        purgeWeightGrams: 0,
        billableMaterialGrams: 1,
        elapsedSeconds: 1,
        layerCount: 1,
        plateCount: 1,
      },
      processingDurationMs: 1,
    });
    expect(parsed.success).toBe(false);
  });
});
