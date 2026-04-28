'use client'

import { motion } from 'framer-motion'
import type { AddressFieldErrors, AddressFields } from '@/lib/orders'

type AddressFormProps = {
  values: AddressFields
  errors: AddressFieldErrors
  onChange: (field: keyof AddressFields, value: string) => void
}

function Field({
  label,
  value,
  error,
  required = false,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  error?: string
  required?: boolean
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-white">
        {label}
        {required ? <span className="ml-1 text-[#FF9A72]">*</span> : null}
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-[18px] border bg-[#0d1120] px-4 py-3 text-sm text-white outline-none transition ${
          error ? 'border-rose-400/35' : 'border-white/10 focus:border-[#FF5C1A]/40'
        }`}
      />
      {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}
    </label>
  )
}

export default function AddressForm({ values, errors, onChange }: AddressFormProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.18 }}
      className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,22,0.92))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
    >
      <div className="mb-5">
        <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white">
          Delivery Address
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#97a1c2]">
          Add the delivery details before submitting your print request. Shipping is free for orders of ₹499 or more.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Full Name"
          value={values.fullName}
          error={errors.fullName}
          required
          placeholder="Recipient name"
          onChange={(value) => onChange('fullName', value)}
        />
        <Field
          label="Phone Number"
          value={values.phone}
          error={errors.phone}
          required
          placeholder="10-digit mobile number"
          onChange={(value) => onChange('phone', value)}
        />
        <div className="md:col-span-2">
          <Field
            label="Address Line 1"
            value={values.addressLine1}
            error={errors.addressLine1}
            required
            placeholder="House number, street, area"
            onChange={(value) => onChange('addressLine1', value)}
          />
        </div>
        <div className="md:col-span-2">
          <Field
            label="Address Line 2"
            value={values.addressLine2}
            error={errors.addressLine2}
            placeholder="Apartment, suite, floor"
            onChange={(value) => onChange('addressLine2', value)}
          />
        </div>
        <Field
          label="City"
          value={values.city}
          error={errors.city}
          required
          placeholder="City"
          onChange={(value) => onChange('city', value)}
        />
        <Field
          label="State"
          value={values.state}
          error={errors.state}
          required
          placeholder="State"
          onChange={(value) => onChange('state', value)}
        />
        <Field
          label="Pincode"
          value={values.pincode}
          error={errors.pincode}
          required
          placeholder="6-digit pincode"
          onChange={(value) => onChange('pincode', value)}
        />
        <Field
          label="Landmark"
          value={values.landmark}
          error={errors.landmark}
          placeholder="Nearby landmark"
          onChange={(value) => onChange('landmark', value)}
        />
      </div>
    </motion.section>
  )
}
