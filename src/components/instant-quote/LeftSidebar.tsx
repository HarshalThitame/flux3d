"use client";

import { motion } from "framer-motion";
import { Upload, X, Box, Cuboid, Layers } from "lucide-react";
import type { ParsedModel, SlicerResult } from "@/lib/quote/types";

type LeftSidebarProps = {
  files: Array<{ name: string; size: number }>;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  plates: SlicerResult["plates"];
  activePlateIndex: number;
  onPlateSelect: (index: number) => void;
  amsColorCount: number;
  onAmsColorCountChange: (count: number) => void;
  slicerResult?: SlicerResult;
  model: ParsedModel | null;
  detectedColors: string[];
};

export default function LeftSidebar({
  files,
  onAddFiles,
  onRemoveFile,
  plates,
  activePlateIndex,
  onPlateSelect,
  amsColorCount,
  onAmsColorCountChange,
  slicerResult,
  model,
  detectedColors,
}: LeftSidebarProps) {
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      onAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="flex h-full w-[280px] flex-col overflow-y-auto border-r border-[#6d28d9]/10 bg-white p-4 shrink-0">
      <div className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6F7192]">
          Files
        </h3>
        <div
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          className="mb-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#6d28d9]/20 bg-gray-50 py-4 hover:bg-gray-100 transition-colors"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.multiple = true;
            input.accept = ".stl,.obj,.3mf";
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              if (target.files?.length) {
                onAddFiles(Array.from(target.files));
              }
            };
            input.click();
          }}
        >
          <Upload className="mb-1.5 h-4 w-4 text-[#6F7192]" />
          <span className="text-xs text-[#6F7192]">Add files...</span>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs"
              >
                <span
                  className="truncate max-w-[180px] text-gray-800"
                  title={file.name}
                >
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveFile(i)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {plates && plates.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6F7192]">
            Plates
          </h3>
          <div className="flex flex-wrap gap-2">
            {plates.map((p, i) => (
              <button
                key={p.plateIndex}
                type="button"
                onClick={() => onPlateSelect(i)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  activePlateIndex === i
                    ? "border-[#6d28d9] bg-[#6d28d9] text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                Plate {p.plateIndex}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6F7192]">
          AMS Slots
        </h3>
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3, 4].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onAmsColorCountChange(count)}
              className={`flex h-8 flex-1 items-center justify-center rounded-lg border text-xs transition-colors ${
                amsColorCount === count
                  ? "border-[#6d28d9] bg-purple-50 text-purple-700 font-semibold"
                  : "border-gray-200 hover:bg-gray-50 text-gray-600"
              }`}
            >
              {count}
            </button>
          ))}
        </div>

        {model?.slicerResult && model.slicerResult.weightsPerColor && (
          <div className="space-y-1.5 mt-3">
            {model.slicerResult.weightsPerColor.map((weight, index) => {
              const color = detectedColors?.[index] || "#ffffff";
              return (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 text-xs bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100"
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-3 w-3 rounded-full border border-black/10 shadow-inner"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-gray-700">Slot {index + 1}</span>
                  </div>
                  <span className="font-mono text-gray-600 font-medium">
                    {weight.toFixed(1)}g
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {model && (
        <div className="mt-auto">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6F7192]">
            Model Stats
          </h3>
          <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 flex items-center gap-1">
                <Cuboid className="h-3 w-3" /> Size
              </span>
              <span className="text-gray-700 font-mono">
                {model.dimensionsMm.x.toFixed(0)}×
                {model.dimensionsMm.y.toFixed(0)}×
                {model.dimensionsMm.z.toFixed(0)} mm
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 flex items-center gap-1">
                <Layers className="h-3 w-3" /> Tris
              </span>
              <span className="text-gray-700 font-mono">
                {model.triangleCount.toLocaleString()}
              </span>
            </div>
            {slicerResult && (
              <div className="flex items-center justify-between text-xs border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-500">Total Weight</span>
                <span className="text-gray-700 font-mono font-semibold">
                  {slicerResult.totalWeightGrams.toFixed(1)}g
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
