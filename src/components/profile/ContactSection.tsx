'use client'

import type { ProfileDetailsData } from './types'
import { FieldRow, IconButton } from './ui'

export default function ContactSection({
  profile,
  onEdit,
}: {
  profile: ProfileDetailsData
  onEdit: (target: 'name' | 'phone' | 'gst') => void
}) {
  return (
    <div className="px-6 pb-2 sm:px-10">
      {[
        <FieldRow
          key="name"
          label="Name"
          value={profile.name || 'Not set'}
          muted={!profile.name}
          action={<IconButton label="Edit name" onClick={() => onEdit('name')} />}
        />,
        <FieldRow key="email" label="Email" value={profile.email} />,
        <FieldRow
          key="phone"
          label="Phone"
          value={profile.phone || 'Not added'}
          muted={!profile.phone}
          action={<IconButton label="Edit phone" onClick={() => onEdit('phone')} />}
        />,
        <FieldRow
          key="gst"
          label="GSTIN · for B2B invoices"
          value={profile.gstNumber || 'Not provided'}
          muted={!profile.gstNumber}
          action={
            <IconButton label={profile.gstNumber ? 'Edit GST number' : 'Add GST number'} onClick={() => onEdit('gst')} />
          }
        />,
      ]}
    </div>
  )
}
