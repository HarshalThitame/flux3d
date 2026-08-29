"use client";

import AdminToast from "@/components/admin/AdminToast";
import {
  ProductEditorProvider,
  useProductEditor,
} from "./product-editor/editor-context";
import { EditorHeader } from "./product-editor/sections/EditorHeader";
import { BasicInfoSection } from "./product-editor/sections/BasicInfoSection";
import { UnifiedMediaPool } from "./product-editor/sections/media/UnifiedMediaPool";
import { Model3DSection } from "./product-editor/sections/Model3DSection";
import { HotspotSection } from "./product-editor/sections/HotspotSection";
import { VariantOptionsSection } from "./product-editor/sections/VariantOptionsSection";
import { SkuPatternStudio } from "./product-editor/sections/SkuPatternStudio";
import { PricingRulesEngine } from "./product-editor/sections/PricingRulesEngine";
import { SkuManagerSection } from "./product-editor/sections/SkuManagerSection";
import { DimensionsSection } from "./product-editor/sections/DimensionsSection";
import { CustomizationSection } from "./product-editor/sections/CustomizationSection";
import { SeoVisibilitySection } from "./product-editor/sections/SeoVisibilitySection";
import { VariantImageGalleriesSection } from "./product-editor/sections/VariantImageGalleriesSection";

const editorSections = [
  { id: "sec-basic", label: "Basics" },
  { id: "sec-media", label: "Media" },
  { id: "sec-variant-galleries", label: "Variant Galleries" },
  { id: "sec-model", label: "3D & Cinematic" },
  { id: "sec-hotspots", label: "Hotspots" },
  { id: "sec-variants", label: "Variants" },
  { id: "sec-pattern", label: "SKU Pattern" },
  { id: "sec-pricing", label: "Pricing Rules" },
  { id: "sec-dimensions", label: "Dimensions" },
  { id: "sec-skus", label: "SKUs" },
  { id: "sec-customization", label: "Customization" },
  { id: "sec-seo", label: "SEO & Publish" },
];

function EditorNav() {
  return (
    <nav
      className="sticky top-24 hidden w-44 shrink-0 self-start xl:block"
      aria-label="Editor sections"
    >
      <ul className="space-y-1 border-l border-gray-200">
        {editorSections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="block border-l-2 border-transparent py-1.5 pl-3 text-sm text-[#6F7192] transition hover:border-[#6d28d9] hover:text-[#0F1B3D]"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function EditorShell() {
  const { loading, toast } = useProductEditor();

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-[#6F7192]">
        Loading product editor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <EditorHeader />
      <div className="flex gap-10">
        <div className="min-w-0 flex-1 space-y-6">
          <div id="sec-basic" className="scroll-mt-28">
            <BasicInfoSection />
          </div>
          <div id="sec-media" className="scroll-mt-28">
            <UnifiedMediaPool />
          </div>
          <div id="sec-variant-galleries" className="scroll-mt-28">
            <VariantImageGalleriesSection />
          </div>
          <div id="sec-model" className="scroll-mt-28">
            <Model3DSection />
          </div>
          <div id="sec-hotspots" className="scroll-mt-28">
            <HotspotSection />
          </div>
          <div id="sec-variants" className="scroll-mt-28">
            <VariantOptionsSection />
          </div>
          <div id="sec-pattern" className="scroll-mt-28">
            <SkuPatternStudio />
          </div>
          <div id="sec-pricing" className="scroll-mt-28">
            <PricingRulesEngine />
          </div>
          <div id="sec-dimensions" className="scroll-mt-28">
            <DimensionsSection />
          </div>
          <div id="sec-skus" className="scroll-mt-28">
            <SkuManagerSection />
          </div>
          <div id="sec-customization" className="scroll-mt-28">
            <CustomizationSection />
          </div>
          <div id="sec-seo" className="scroll-mt-28">
            <SeoVisibilitySection />
          </div>
        </div>
        <EditorNav />
      </div>
    </div>
  );
}

export default function ShopProductEditor({
  mode,
  productId,
}: {
  mode: "new" | "edit";
  productId?: string;
}) {
  return (
    <ProductEditorProvider mode={mode} productId={productId}>
      <EditorShell />
    </ProductEditorProvider>
  );
}
