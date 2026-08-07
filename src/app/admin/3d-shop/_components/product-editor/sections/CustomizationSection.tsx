'use client'

import { useProductEditor } from '../editor-context'
import { Section, Toggle, inputClass } from '../ui'

export function CustomizationSection() {
  const { product, updateProduct } = useProductEditor()

  return (
    <Section title="Customization" description="Allow optional personalization such as engraving or names.">
      <Toggle
        checked={product.is_customizable}
        onChange={(checked) => updateProduct('is_customizable', checked)}
        label="Is Customizable?"
        description="Adds a customer text field on the storefront."
      />
      {product.is_customizable && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6F7192]" htmlFor="customization-label">
              Customization Label
            </label>
            <input
              id="customization-label"
              value={product.customization_label}
              onChange={(event) => updateProduct('customization_label', event.target.value)}
              placeholder="Enter name for engraving"
              className={inputClass}
            />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Preview</div>
            <label className="mt-3 block text-sm font-medium text-[#0F1B3D]">
              {product.customization_label || 'Enter name for engraving'}
            </label>
            <input disabled placeholder="Customer text appears here" className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#6F7192]" />
          </div>
        </div>
      )}
    </Section>
  )
}
