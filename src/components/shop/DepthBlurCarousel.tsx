"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DepthBlurCarouselItem {
  id: string;
  src: string | null;
  alt?: string;
  title: string;
  subheadline?: string;
}

export interface DepthBlurCarouselProps {
  items: DepthBlurCarouselItem[];
  onSelectItemAction?: (index: number) => void;
  onActiveIndexChangeAction?: (index: number) => void;
  className?: string;
  ariaLabel?: string;
}

interface Dimensions {
  itemWidth: number;
  itemHeight: number;
  sideItemWidth: number;
  sideItemHeight: number;
  gap: number;
}

function pickDimensions(width: number): Dimensions {
  if (width <= 480) {
    const center = Math.min(width * 0.72, 300);
    return {
      itemWidth: Math.round(center),
      itemHeight: Math.round(center * 1.18),
      sideItemWidth: Math.round(center * 0.58),
      sideItemHeight: Math.round(center * 0.92),
      gap: 22,
    };
  }
  if (width <= 768) {
    const center = Math.min(width * 0.5, 380);
    return {
      itemWidth: Math.round(center),
      itemHeight: Math.round(center * 1.05),
      sideItemWidth: Math.round(center * 0.62),
      sideItemHeight: Math.round(center * 0.9),
      gap: 36,
    };
  }
  const center = Math.min(width * 0.34, 440);
  return {
    itemWidth: Math.round(center),
    itemHeight: Math.round(center * 1.08),
    sideItemWidth: Math.round(center * 0.64),
    sideItemHeight: Math.round(center * 0.94),
    gap: 56,
  };
}

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg, #d8cfc0, #a89880)",
  "linear-gradient(135deg, #c9b8a3, #8a7a5f)",
  "linear-gradient(135deg, #b8ab97, #6f6350)",
  "linear-gradient(135deg, #e2dacb, #94876f)",
];

function wrapOffset(value: number, total: number) {
  let mapped = ((value % total) + total) % total;
  if (mapped > total / 2) mapped -= total;
  return mapped;
}

function shortestWrappedDelta(from: number, to: number, total: number) {
  return wrapOffset(to - from, total);
}

interface CardProps {
  src: string | null;
  alt: string;
  originalIndex: number;
  index: number;
  total: number;
  smoothScroll: MotionValue<number>;
  dims: Dimensions;
  maxRotation: number;
  borderRadius: string;
  onSelect: (originalIndex: number, cardIndex: number) => void;
}

function DepthCard(props: CardProps) {
  const {
    src,
    alt,
    index,
    total,
    smoothScroll,
    dims,
    maxRotation,
    borderRadius,
    onSelect,
  } = props;

  const localOffset = useTransform(smoothScroll, (v) =>
    wrapOffset(index - v, total),
  );
  const absOffset = useTransform(localOffset, Math.abs);

  const cardWidth = useTransform(
    absOffset,
    [0, 1],
    [dims.itemWidth, dims.sideItemWidth],
    {
      clamp: true,
    },
  );
  const cardHeight = useTransform(
    absOffset,
    [0, 1],
    [dims.itemHeight, dims.sideItemHeight],
    {
      clamp: true,
    },
  );
  const marginLeft = useTransform(cardWidth, (w) => -w / 2);
  const marginTop = useTransform(cardHeight, (h) => -h / 2);

  const x = useTransform(localOffset, (o) => {
    const a = Math.abs(o);
    const s = Math.sign(o);
    const centerToNext = dims.itemWidth / 2 + dims.gap + dims.sideItemWidth / 2;
    const sideToSide = dims.sideItemWidth + dims.gap;
    if (a === 0) return 0;
    if (a <= 1) return s * centerToNext * a;
    return s * (centerToNext + (a - 1) * sideToSide * 0.85);
  });

  const z = useTransform(absOffset, (a) => -a * 220);
  const rotateY = useTransform(
    localOffset,
    (o) => Math.sign(o) * Math.min(Math.abs(o) * 32, maxRotation),
  );
  const zIndex = useTransform(absOffset, (a) => 1000 - Math.round(a * 10));
  const opacity = useTransform(absOffset, [0, 4.5, 6.5], [1, 1, 0]);

  const handleClick = useCallback(() => {
    onSelect(props.originalIndex, index);
  }, [onSelect, props.originalIndex, index]);

  return (
    <motion.div
      onClick={handleClick}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        marginLeft,
        marginTop,
        width: cardWidth,
        height: cardHeight,
        rotateY,
        x,
        z,
        zIndex,
        transformStyle: "preserve-3d",
      }}
    >
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius,
          overflow: "hidden",
          background: "#efe9dc",
          boxShadow:
            "0 30px 60px -18px rgba(23,19,16,0.35), 0 12px 24px -12px rgba(23,19,16,0.25)",
          opacity,
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            draggable={false}
            priority={index === 0}
            sizes="(max-width: 480px) 80vw, (max-width: 1024px) 55vw, 520px"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length],
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
            pointerEvents: "none",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

export default function DepthBlurCarousel({
  items,
  onSelectItemAction,
  onActiveIndexChangeAction,
  className,
  ariaLabel,
}: DepthBlurCarouselProps) {
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 620 });

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      startTransition(() =>
        setSize({
          width: Math.max(1, rect.width),
          height: Math.max(1, rect.height),
        }),
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const poolCount = items.length;
  const renderItems = useMemo(() => {
    if (poolCount === 0) return [] as DepthBlurCarouselItem[];
    const copies = Math.max(1, Math.min(Math.ceil(12 / poolCount), 12));
    const out: DepthBlurCarouselItem[] = [];
    for (let c = 0; c < copies; c++) {
      for (const item of items) out.push(item);
    }
    return out;
  }, [items, poolCount]);

  const totalItems = renderItems.length;

  const rawScroll = useMotionValue(0);
  const smoothScroll = useSpring(rawScroll, {
    stiffness: reducedMotion ? 1200 : 180,
    damping: reducedMotion ? 400 : 90,
    mass: 1,
    restDelta: 0.001,
  });

  const scrollTarget = useRef(0);
  const snapTimeout = useRef<number | null>(null);

  const activeIndexRef = useRef(0);

  useMotionValueEvent(smoothScroll, "change", (value) => {
    if (poolCount === 0) return;
    const idx = ((Math.round(value) % poolCount) + poolCount) % poolCount;
    if (idx !== activeIndexRef.current) {
      activeIndexRef.current = idx;
      onActiveIndexChangeAction?.(idx);
    }
  });

  const commitSnap = useCallback(() => {
    scrollTarget.current = Math.round(scrollTarget.current);
    rawScroll.set(scrollTarget.current);
  }, [rawScroll]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || totalItems <= 1) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY * 0.8;
      scrollTarget.current += delta * 0.004;
      rawScroll.set(scrollTarget.current);
      if (snapTimeout.current != null) window.clearTimeout(snapTimeout.current);
      snapTimeout.current = window.setTimeout(commitSnap, 150);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => {
      el.removeEventListener("wheel", handler);
      if (snapTimeout.current != null) window.clearTimeout(snapTimeout.current);
    };
  }, [rawScroll, commitSnap, totalItems]);

  const pointerIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityXRef = useRef(0);

  const onWindowPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isDraggingRef.current || pointerIdRef.current !== event.pointerId)
        return;
      const now = performance.now();
      const dt = now - lastTRef.current;
      if (dt > 0) {
        velocityXRef.current = ((event.clientX - lastXRef.current) / dt) * 1000;
      }
      lastXRef.current = event.clientX;
      lastTRef.current = now;
      const dx = event.clientX - startXRef.current;
      if (Math.abs(dx) > 8) didDragRef.current = true;
      scrollTarget.current = startScrollRef.current - dx * 0.005;
      rawScroll.set(scrollTarget.current);
    },
    [rawScroll],
  );

  const endDragRef = useRef<(event: PointerEvent) => void>(() => {});

  const endDrag = useCallback(
    (event: PointerEvent) => {
      if (!isDraggingRef.current || pointerIdRef.current !== event.pointerId)
        return;
      isDraggingRef.current = false;
      pointerIdRef.current = null;
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", endDragRef.current);
      window.removeEventListener("pointercancel", endDragRef.current);
      scrollTarget.current += -velocityXRef.current * 0.0015;
      commitSnap();
    },
    [onWindowPointerMove, commitSnap],
  );

  useEffect(() => {
    endDragRef.current = endDrag;
  }, [endDrag]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (totalItems <= 1) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointerIdRef.current = event.pointerId;
      isDraggingRef.current = true;
      didDragRef.current = false;
      startXRef.current = event.clientX;
      lastXRef.current = event.clientX;
      lastTRef.current = performance.now();
      velocityXRef.current = 0;
      startScrollRef.current = scrollTarget.current;
      window.addEventListener("pointermove", onWindowPointerMove);
      window.addEventListener("pointerup", endDragRef.current);
      window.addEventListener("pointercancel", endDragRef.current);
    },
    [totalItems, onWindowPointerMove],
  );

  const handleSelect = useCallback(
    (originalIndex: number, cardIndex: number) => {
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }
      const isCentered =
        Math.abs(wrapOffset(cardIndex - smoothScroll.get(), totalItems)) < 0.45;
      if (!isCentered) {
        scrollTarget.current += shortestWrappedDelta(
          Math.round(scrollTarget.current),
          cardIndex,
          totalItems,
        );
        commitSnap();
        return;
      }
      onSelectItemAction?.(originalIndex);
    },
    [smoothScroll, totalItems, commitSnap, onSelectItemAction],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (totalItems <= 1) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        scrollTarget.current =
          Math.round(scrollTarget.current) +
          (event.key === "ArrowLeft" ? -1 : 1);
        rawScroll.set(scrollTarget.current);
      }
    },
    [totalItems, rawScroll],
  );

  const stepCarousel = useCallback(
    (dir: 1 | -1) => {
      if (totalItems <= 1) return;
      scrollTarget.current = Math.round(scrollTarget.current) + dir;
      rawScroll.set(scrollTarget.current);
    },
    [totalItems, rawScroll],
  );

  const arrowButtonClass =
    "pointer-events-auto absolute top-1/2 z-[10001] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[rgba(201,169,98,0.45)] bg-white/85 text-[#1C1917] shadow-[0_10px_30px_rgba(23,19,16,0.18)] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-[#C9A962] hover:text-white hover:shadow-[0_12px_34px_rgba(201,169,98,0.4)] active:scale-95 md:h-12 md:w-12";

  const arrowIconClass = "h-5 w-5 md:h-6 md:w-6";

  const dims = useMemo(() => pickDimensions(size.width), [size.width]);
  const isMobile = size.width <= 480;
  const perspective = isMobile ? 700 : 1100;
  const blurStrength = isMobile ? 16 : 26;
  const blurSpread = isMobile ? 30 : 22;
  const borderRadius = isMobile ? "16px" : "20px";

  if (totalItems === 0) return null;

  return (
    <div
      ref={rootRef}
      className={className}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={onPointerDown}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective,
        overflow: "hidden",
        outline: "none",
        cursor: "grab",
        touchAction: "pan-y",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
        }}
      >
        {renderItems.map((item, i) => (
          <DepthCard
            key={`${item.id}-${i}`}
            src={item.src}
            alt={item.alt ?? item.title}
            originalIndex={i % poolCount}
            index={i}
            total={totalItems}
            smoothScroll={smoothScroll}
            dims={dims}
            maxRotation={38}
            borderRadius={borderRadius}
            onSelect={handleSelect}
          />
        ))}
      </div>

      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${blurSpread}%`,
          backdropFilter: `blur(${blurStrength}px)`,
          WebkitBackdropFilter: `blur(${blurStrength}px)`,
          maskImage: "linear-gradient(to right, black 0%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, black 0%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 10000,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: `${blurSpread}%`,
          backdropFilter: `blur(${blurStrength}px)`,
          WebkitBackdropFilter: `blur(${blurStrength}px)`,
          maskImage: "linear-gradient(to left, black 0%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to left, black 0%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 10000,
        }}
      />

      {totalItems > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous products"
            onClick={(event) => {
              event.stopPropagation();
              stepCarousel(-1);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            className={`${arrowButtonClass} left-2 sm:left-5`}
          >
            <ChevronLeft className={arrowIconClass} />
          </button>
          <button
            type="button"
            aria-label="Next products"
            onClick={(event) => {
              event.stopPropagation();
              stepCarousel(1);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            className={`${arrowButtonClass} right-2 sm:right-5`}
          >
            <ChevronRight className={arrowIconClass} />
          </button>
        </>
      )}
    </div>
  );
}
