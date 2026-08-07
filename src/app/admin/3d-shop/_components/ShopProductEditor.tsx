'use client'

import AdminToast from '@/components/admin/AdminToast'
import { ProductEditorProvider, useProductEditor } from './product-editor/editor-context'
import { EditorHeader } from './product-editor/sections/EditorHeader'
import { BasicInfoSection } from './product-editor/sections/BasicInfoSection'
import { MediaGallerySection } from './product-editor/sections/MediaGallerySection'
import { Model3DSection } from './product-editor/sections/Model3DSection'
import { VariantOptionsSection } from './product-editor/sections/VariantOptionsSection'
import { SkuManagerSection } from './product-editor/sections/SkuManagerSection'
import { CustomizationSection } from './product-editor/sections/CustomizationSection'
import { SeoVisibilitySection } from './product-editor/sections/SeoVisibilitySection'

function EditorShell() {
  const { loading, toast } = useProductEditor()

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-[#6F7192]">Loading product editor...</div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <EditorHeader />
      <BasicInfoSection />
      <MediaGallerySection />
      <Model3DSection />
      <VariantOptionsSection />
      <SkuManagerSection />
      <CustomizationSection />
      <SeoVisibilitySection />
    </div>
  )
}

export default function ShopProductEditor({
  mode,
  productId,
}: {
  mode: 'new' | 'edit'
  productId?: string
}) {
  return (
    <ProductEditorProvider mode={mode} productId={productId}>
      <EditorShell />
    </ProductEditorProvider>
  )
}
