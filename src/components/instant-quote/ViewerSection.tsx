"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Box,
  Eye,
  Grid3X3,
  Layers,
  Maximize2,
  Move3D,
  Scissors,
  X,
} from "lucide-react";
import type { ParsedModel } from "@/lib/quote/types";
import ModelPreviewCanvas from "@/components/instant-quote/ModelPreviewCanvas";

type ViewerSectionProps = {
  model: ParsedModel | null;
  isLoading: boolean;
  materialId?: string;
  colorName?: string;
  isSlicing?: boolean;
  slicingProgress?: string;
  activePlateIndex?: number;
};

export default function ViewerSection({
  model,
  isLoading,
  materialId = "pla",
  colorName = "Default",
  isSlicing,
  slicingProgress,
  activePlateIndex = 0,
}: ViewerSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayMode, setDisplayMode] = useState<
    "solid" | "wireframe" | "xray"
  >("solid");
  const [showBuildVolume, setShowBuildVolume] = useState(false);
  const [clippingZPercent, setClippingZPercent] = useState(100);
  const [showClippingSlider, setShowClippingSlider] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<
    "iso" | "top" | "front" | "side" | null
  >(null);

  return (
    <>
      <div className="flex h-full flex-col p-4 bg-[#070a12]">
        {/* 3D Inspection Toolbar */}
        {model && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-md">
            {/* Shading Mode */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDisplayMode("solid")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  displayMode === "solid"
                    ? "bg-[#6d28d9] text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Eye className="h-3.5 w-3.5" /> Solid
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("wireframe")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  displayMode === "wireframe"
                    ? "bg-[#6d28d9] text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Grid3X3 className="h-3.5 w-3.5" /> Wireframe
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("xray")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  displayMode === "xray"
                    ? "bg-[#6d28d9] text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> X-Ray
              </button>
            </div>

            {/* Quick Actions & Toggles */}
            <div className="flex items-center gap-1.5">
              {/* Build Box Cage */}
              <button
                type="button"
                onClick={() => setShowBuildVolume(!showBuildVolume)}
                title="Toggle 330x320x325mm 3D Printer Build Volume Box"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                  showBuildVolume
                    ? "border-cyan-400/40 bg-cyan-900/40 text-cyan-400"
                    : "border-white/10 bg-transparent text-white/60 hover:bg-white/10"
                }`}
              >
                <Box className="h-3.5 w-3.5" /> Build Box
              </button>

              {/* Cross Section Slice */}
              <button
                type="button"
                onClick={() => setShowClippingSlider(!showClippingSlider)}
                title="Toggle Cross-Section Slice"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                  showClippingSlider || clippingZPercent < 100
                    ? "border-purple-400/40 bg-purple-900/40 text-purple-400"
                    : "border-white/10 bg-transparent text-white/60 hover:bg-white/10"
                }`}
              >
                <Scissors className="h-3.5 w-3.5" /> Slice
              </button>

              {/* Camera Presets */}
              <div className="hidden items-center gap-1 sm:flex">
                <button
                  type="button"
                  onClick={() => setCameraPreset("iso")}
                  className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-[11px] text-white/60 hover:bg-white/10"
                  title="Isometric View"
                >
                  ISO
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPreset("top")}
                  className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-[11px] text-white/60 hover:bg-white/10"
                  title="Top View"
                >
                  TOP
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPreset("front")}
                  className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-[11px] text-white/60 hover:bg-white/10"
                  title="FRONT View"
                >
                  FRONT
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPreset("side")}
                  className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-[11px] text-white/60 hover:bg-white/10"
                  title="SIDE View"
                >
                  SIDE
                </button>
              </div>

              {/* Fullscreen Modal Toggle */}
              <button
                type="button"
                onClick={() => setIsFullScreen(true)}
                title="Full Screen Inspection"
                aria-label="Enter fullscreen inspection"
                className="rounded-lg border border-white/10 bg-transparent p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Slice Slider Bar */}
        {showClippingSlider && model && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-900/30 px-4 py-2 text-xs text-purple-200">
            <span className="shrink-0 font-medium">Cross-Section Cut:</span>
            <input
              type="range"
              min={5}
              max={100}
              value={clippingZPercent}
              onChange={(e) => setClippingZPercent(Number(e.target.value))}
              className="w-full accent-[#6d28d9]"
            />
            <span className="shrink-0 font-mono text-[11px]">
              {clippingZPercent}%
            </span>
            {clippingZPercent < 100 && (
              <button
                type="button"
                onClick={() => setClippingZPercent(100)}
                className="text-[10px] text-purple-400 underline underline-offset-2"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* 3D Canvas Stage */}
        <div className="relative flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-[#070a12]">
          {model ? (
            <>
              <ModelPreviewCanvas
                object={model.object}
                materialId={materialId}
                colorName={colorName}
                displayMode={displayMode}
                showBuildVolume={showBuildVolume}
                clippingZPercent={clippingZPercent}
                cameraPreset={cameraPreset}
                onPresetApplied={() => setCameraPreset(null)}
                slicerResult={model.slicerResult}
                isSlicing={isSlicing}
                slicingProgress={slicingProgress}
                activePlateIndex={activePlateIndex}
              />

              {/* Material Live Badge Overlay */}
              <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/10 bg-[#070a12]/80 px-3 py-1.5 text-xs text-white/90 backdrop-blur-md">
                <span className="text-white/40">Shading:</span>{" "}
                <span className="font-semibold text-cyan-400">
                  {materialId.toUpperCase()}
                </span>{" "}
                · <span className="text-purple-300">{colorName}</span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <motion.div
                animate={shouldReduceMotion ? undefined : { y: [0, -6, 0] }}
                transition={
                  shouldReduceMotion
                    ? undefined
                    : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
                }
                className="flex h-18 w-18 items-center justify-center rounded-[22px] border border-white/10 bg-white/5 text-cyan-400"
              >
                <Move3D className="h-7 w-7" />
              </motion.div>
              <div className="font-[var(--font-syne)] text-2xl font-semibold text-white">
                Awaiting 3D Model
              </div>
              <p className="max-w-md text-sm leading-7 text-white/50">
                Upload an STL, OBJ, or 3MF file to render a studio-quality PBR
                3D preview with dynamic materials, environment lighting, and
                inspection tools.
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(4,8,16,0.62)] backdrop-blur-sm">
              <div className="rounded-xl border border-white/10 bg-[#070a12] px-4 py-3 text-sm text-white">
                Building 3D preview engine...
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Full Screen Viewport Modal */}
      {isFullScreen && model && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#070a12] p-4 text-white">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-[var(--font-syne)] text-xl font-bold">
                {model.fileName}
              </h3>
              <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-300">
                {materialId.toUpperCase()} ({colorName})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsFullScreen(false)}
              aria-label="Exit fullscreen inspection"
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black">
            <ModelPreviewCanvas
              object={model.object}
              materialId={materialId}
              colorName={colorName}
              displayMode={displayMode}
              showBuildVolume={showBuildVolume}
              clippingZPercent={clippingZPercent}
              cameraPreset={cameraPreset}
              onPresetApplied={() => setCameraPreset(null)}
              slicerResult={model.slicerResult}
              activePlateIndex={activePlateIndex}
            />
          </div>
        </div>
      )}
    </>
  );
}
