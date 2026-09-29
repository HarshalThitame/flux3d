import { describe, expect, it } from "vitest";
import { getDepthCarouselDimensions } from "@/lib/shop/depth-carousel-layout";

describe("getDepthCarouselDimensions", () => {
  it.each([
    { width: 1280, height: 640 },
    { width: 1366, height: 657 },
    { width: 1440, height: 700 },
    { width: 1512, height: 720 },
  ])(
    "reserves vertical copy space at $width × $height",
    ({ width, height }) => {
      const dimensions = getDepthCarouselDimensions(width, height);
      const clearance = (height - dimensions.itemHeight) / 2;

      expect(clearance).toBeGreaterThanOrEqual(145);
      expect(dimensions.itemHeight).toBeLessThanOrEqual(height - 290);
    },
  );

  it("keeps the full premium card size on a tall desktop viewport", () => {
    expect(getDepthCarouselDimensions(1440, 900)).toMatchObject({
      itemWidth: 440,
      itemHeight: 475,
    });
  });

  it("preserves the existing mobile sizing when vertical space is sufficient", () => {
    expect(getDepthCarouselDimensions(390, 844)).toMatchObject({
      itemWidth: 281,
      itemHeight: 331,
      gap: 22,
    });
  });

  it("keeps side cards smaller than the focused card", () => {
    const dimensions = getDepthCarouselDimensions(1366, 657);

    expect(dimensions.sideItemWidth).toBeLessThan(dimensions.itemWidth);
    expect(dimensions.sideItemHeight).toBeLessThan(dimensions.itemHeight);
  });
});
