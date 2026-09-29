export interface DepthCarouselDimensions {
  itemWidth: number;
  itemHeight: number;
  sideItemWidth: number;
  sideItemHeight: number;
  gap: number;
}

function fitWidthToVerticalSpace(
  baseWidth: number,
  aspectRatio: number,
  viewportHeight: number,
  reservedHeight: number,
) {
  // Preserve dedicated zones for the hero copy above and the drag hint below.
  // The proportional fallback also keeps the carousel usable in unusually
  // short browser windows where the fixed reserve would leave too little room.
  const availableHeight = Math.max(
    viewportHeight * 0.45,
    viewportHeight - reservedHeight,
  );
  return Math.min(baseWidth, availableHeight / aspectRatio);
}

export function getDepthCarouselDimensions(
  viewportWidth: number,
  viewportHeight: number,
): DepthCarouselDimensions {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);

  if (width <= 480) {
    const aspectRatio = 1.18;
    const baseWidth = Math.min(width * 0.72, 300);
    const center = fitWidthToVerticalSpace(baseWidth, aspectRatio, height, 270);
    return {
      itemWidth: Math.round(center),
      itemHeight: Math.round(center * aspectRatio),
      sideItemWidth: Math.round(center * 0.58),
      sideItemHeight: Math.round(center * 0.92),
      gap: 22,
    };
  }

  if (width <= 768) {
    const aspectRatio = 1.05;
    const baseWidth = Math.min(width * 0.5, 380);
    const center = fitWidthToVerticalSpace(baseWidth, aspectRatio, height, 300);
    return {
      itemWidth: Math.round(center),
      itemHeight: Math.round(center * aspectRatio),
      sideItemWidth: Math.round(center * 0.62),
      sideItemHeight: Math.round(center * 0.9),
      gap: 36,
    };
  }

  const aspectRatio = 1.08;
  const baseWidth = Math.min(width * 0.34, 440);
  const center = fitWidthToVerticalSpace(baseWidth, aspectRatio, height, 320);
  return {
    itemWidth: Math.round(center),
    itemHeight: Math.round(center * aspectRatio),
    sideItemWidth: Math.round(center * 0.64),
    sideItemHeight: Math.round(center * 0.94),
    gap: 56,
  };
}
