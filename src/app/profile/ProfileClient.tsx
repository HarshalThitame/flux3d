'use client'

import { ChangeEvent, FormEvent, ReactNode, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Camera,
  FileArchive,
  MessageCircle,
  PackageCheck,
  RotateCcw,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export type ProfileAddress = {
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pincode: string
}

export type ProfileSavedAddress = ProfileAddress & {
  id: string
  isDefault: boolean
}

export type ProfileDetailsData = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  createdAt: string | null
  phone: string
  addressId: string | null
  address: ProfileAddress
  addresses: ProfileSavedAddress[]
  gstNumber: string
}

export type ProfileOrderActivity = {
  totalOrders: number
  lastOrder: {
    createdAt: string
    status: string
  } | null
  favoriteMaterial: string | null
  unavailableMessage: string | null
}

export type ProfileModelFile = {
  id: string
  fileName: string
  fileUrl: string
  material: string
  status: 'quoted' | 'ordered' | 'draft'
  uploadedAt: string
}

type ProfileClientProps = {
  profile: ProfileDetailsData
  businessName: string
  savedQuotesCount: number
  savedQuotesMessage: string
  orderActivity: ProfileOrderActivity
  initialFiles: ProfileModelFile[]
  totalFileCount: number
}

type Toast = {
  type: 'success' | 'error'
  message: string
} | null

const emptyAddress: ProfileAddress = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
}

const avatarBucket = 'avatars'

function getAvatarStoragePath(avatarUrl: string | null, userId: string) {
  if (!avatarUrl) return null

  if (!avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
    return avatarUrl.startsWith(`${userId}/`) ? avatarUrl : null
  }

  try {
    const parsed = new URL(avatarUrl)
    const prefixes = [
      `/storage/v1/object/public/${avatarBucket}/`,
      `/storage/v1/object/sign/${avatarBucket}/`,
    ]
    const prefix = prefixes.find((value) => parsed.pathname.startsWith(value))
    if (!prefix) return null

    const storagePath = decodeURIComponent(parsed.pathname.slice(prefix.length))
    return storagePath.startsWith(`${userId}/`) ? storagePath : null
  } catch {
    return null
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDate(value: string | null) {
  if (!value) return 'Recently created'

  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatAddress(address: ProfileAddress) {
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.pincode,
  ].filter(Boolean).join(', ')
}

function toAddress(savedAddress: ProfileSavedAddress): ProfileAddress {
  return {
    addressLine1: savedAddress.addressLine1,
    addressLine2: savedAddress.addressLine2,
    city: savedAddress.city,
    state: savedAddress.state,
    pincode: savedAddress.pincode,
  }
}

function getDefaultAddress(addresses: ProfileSavedAddress[]) {
  return addresses.find((address) => address.isDefault) ?? addresses[0] ?? null
}

function withSyncedDefaultAddress(profile: ProfileDetailsData, addresses: ProfileSavedAddress[]): ProfileDetailsData {
  const defaultAddress = getDefaultAddress(addresses)

  return {
    ...profile,
    addresses,
    addressId: defaultAddress?.id ?? null,
    address: defaultAddress ? toAddress(defaultAddress) : emptyAddress,
  }
}

function getOrderStatusLabel(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === 'confirmed') return 'Pending'
  if (normalized === 'completed') return 'Delivered'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function getOrderStatusClasses(status: string) {
  const normalized = status.toLowerCase()

  if (normalized === 'pending' || normalized === 'confirmed') {
    return 'border-yellow-200 bg-yellow-50 text-yellow-700'
  }
  if (normalized === 'printing') {
    return 'border-violet-200 bg-violet-50 text-violet-700'
  }
  if (normalized === 'shipped') {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }
  if (normalized === 'delivered' || normalized === 'completed') {
    return 'border-green-200 bg-green-50 text-green-700'
  }

  return 'border-gray-200 bg-gray-50 text-gray-600'
}

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toUpperCase() || 'FILE'
}

function getQuoteStoragePath(value: string) {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models'
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return trimmed

  try {
    const parsed = new URL(trimmed)
    const publicPrefix = `/storage/v1/object/public/${bucket}/`
    const signedPrefix = `/storage/v1/object/sign/${bucket}/`

    if (parsed.pathname.startsWith(publicPrefix)) return parsed.pathname.slice(publicPrefix.length)
    if (parsed.pathname.startsWith(signedPrefix)) return parsed.pathname.slice(signedPrefix.length)
  } catch {
    return null
  }

  return null
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#e8e4df] bg-[#faf9f7] p-6 shadow-sm ${className}`}>
      {children}
    </section>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-widest text-[#9ca3af]">
      {children}
    </div>
  )
}

function SmallButton({
  children,
  onClick,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="rounded-lg border border-[#e8e4df] px-3 py-1.5 text-xs font-semibold text-[#4b4b4b] transition hover:border-[#ded7ff] hover:bg-[#f3f0ff] hover:text-[#6d28d9]"
    >
      {children}
    </button>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2e1065]/25 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[#e8e4df] bg-[#faf9f7] p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-[#1a1a1a]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e8e4df] text-[#4b4b4b] transition hover:bg-[#f3f0ff]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-[#9ca3af]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-[#e8e4df] bg-white px-3.5 py-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#c8bfff] focus:ring-4 focus:ring-[#ebe5ff]"
      />
    </label>
  )
}

export default function ProfileClient({
  profile: initialProfile,
  businessName,
  savedQuotesCount,
  savedQuotesMessage,
  orderActivity,
  initialFiles,
  totalFileCount,
}: ProfileClientProps) {
  const [profile, setProfile] = useState(initialProfile)
  const [files, setFiles] = useState(initialFiles)
  const [toast, setToast] = useState<Toast>(null)
  const [activeModal, setActiveModal] = useState<null | 'name' | 'phone' | 'address' | 'gst'>(null)
  const [nameDraft, setNameDraft] = useState(initialProfile.name)
  const [phoneDraft, setPhoneDraft] = useState(initialProfile.phone)
  const [addressDraft, setAddressDraft] = useState(initialProfile.address)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(initialProfile.addressId)
  const [gstDraft, setGstDraft] = useState(initialProfile.gstNumber)
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const showToast = (nextToast: Toast) => {
    setToast(nextToast)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200)
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  async function updateProfile(fields: Record<string, unknown>, successMessage: string) {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw new Error(authError.message)
    if (!user) throw new Error('Please sign in again to update your profile.')

    const { error } = await supabase
      .from('profiles')
      .update(fields)
      .eq('id', user.id)

    if (error) throw new Error(error.message)
    showToast({ type: 'success', message: successMessage })
  }

  async function handleNameSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = nameDraft.trim()

    if (!name) {
      showToast({ type: 'error', message: 'Name cannot be empty.' })
      return
    }

    setSaving(true)
    try {
      await updateProfile({ name, full_name: name }, 'Name saved')
      setProfile((current) => ({ ...current, name }))
      setActiveModal(null)
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not save name' })
    } finally {
      setSaving(false)
    }
  }

  async function handlePhoneSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const phone = phoneDraft.trim()
      await updateProfile({ phone: phone || null, phone_number: phone || null }, 'Phone number saved')
      setProfile((current) => ({ ...current, phone }))
      setActiveModal(null)
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not save phone number' })
    } finally {
      setSaving(false)
    }
  }

  async function handleAddressSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw new Error(authError.message)
      if (!user) throw new Error('Please sign in again to update your address.')

      const nextAddress = {
        addressLine1: addressDraft.addressLine1.trim(),
        addressLine2: addressDraft.addressLine2.trim(),
        city: addressDraft.city.trim(),
        state: addressDraft.state.trim(),
        pincode: addressDraft.pincode.trim(),
      }

      if (!nextAddress.addressLine1 || !nextAddress.city || !nextAddress.state || !nextAddress.pincode) {
        throw new Error('Address line 1, city, state, and pincode are required.')
      }

      const savedAddress = {
        user_id: user.id,
        full_name: profile.name,
        phone: profile.phone,
        address_line_1: nextAddress.addressLine1,
        address_line_2: nextAddress.addressLine2 || null,
        city: nextAddress.city,
        state: nextAddress.state,
        pincode: nextAddress.pincode,
        country: 'India',
        is_default: editingAddressId
          ? Boolean(profile.addresses.find((address) => address.id === editingAddressId)?.isDefault)
          : profile.addresses.length === 0,
        updated_at: new Date().toISOString(),
      }

      if (editingAddressId) {
        const { error } = await supabase
          .from('addresses')
          .update(savedAddress)
          .eq('id', editingAddressId)
          .eq('user_id', user.id)

        if (error) throw new Error(error.message)

        setProfile((current) => {
          const addresses = current.addresses.map((address) =>
            address.id === editingAddressId
              ? { ...address, ...nextAddress }
              : address
          )

          return withSyncedDefaultAddress(current, addresses)
        })
      } else {
        const { data, error } = await supabase
          .from('addresses')
          .insert(savedAddress)
          .select('id, is_default')
          .single()

        if (error) throw new Error(error.message)

        setProfile((current) => {
          const insertedAddress: ProfileSavedAddress = {
            id: data.id,
            ...nextAddress,
            isDefault: Boolean(data.is_default),
          }
          const addresses = insertedAddress.isDefault
            ? [insertedAddress, ...current.addresses.map((address) => ({ ...address, isDefault: false }))]
            : [...current.addresses, insertedAddress]

          return withSyncedDefaultAddress(current, addresses)
        })
      }

      showToast({ type: 'success', message: 'Address saved' })
      setEditingAddressId(null)
      setActiveModal(null)
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not save address' })
    } finally {
      setSaving(false)
    }
  }

  async function handleGstSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const gstNumber = gstDraft.trim().toUpperCase()

    if (gstNumber && !/^[A-Z0-9]{15}$/.test(gstNumber)) {
      showToast({ type: 'error', message: 'GST number must be 15 alphanumeric characters.' })
      return
    }

    setSaving(true)
    try {
      await updateProfile({ gst_number: gstNumber || null }, 'GST number saved')
      setProfile((current) => ({ ...current, gstNumber }))
      setActiveModal(null)
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not save GST number' })
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      showToast({ type: 'error', message: 'Upload a JPEG, PNG, WebP, or GIF image.' })
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast({ type: 'error', message: 'Profile photo must be under 5MB.' })
      event.target.value = ''
      return
    }

    setAvatarUploading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw new Error(authError.message)
      if (!user) throw new Error('Please sign in again to update your profile photo.')

      const previousAvatarPath = getAvatarStoragePath(profile.avatarUrl, user.id)
      const extension = file.name.split('.').pop() || 'png'
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-')
      const path = `${user.id}/${Date.now()}-${safeFileName || `avatar.${extension}`}`
      const { error: uploadError } = await supabase.storage.from(avatarBucket).upload(path, file, {
        contentType: file.type,
        upsert: true,
      })

      if (uploadError) throw new Error(uploadError.message)

      const { data: publicUrlData } = supabase.storage.from(avatarBucket).getPublicUrl(path)
      const avatarUrl = publicUrlData.publicUrl
      await updateProfile({ avatar_url: avatarUrl }, 'Profile photo updated')

      if (previousAvatarPath && previousAvatarPath !== path) {
        const { error: removeError } = await supabase.storage.from(avatarBucket).remove([previousAvatarPath])
        if (removeError) {
          console.error('[profile] Failed to remove previous avatar:', removeError)
        }
      }

      setProfile((current) => ({ ...current, avatarUrl }))
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not upload profile photo' })
    } finally {
      setAvatarUploading(false)
      event.target.value = ''
    }
  }

  async function handleFileDelete(file: ProfileModelFile) {
    setDeletingFileId(file.id)
    try {
      const supabase = getSupabaseBrowserClient()
      const storagePath = getQuoteStoragePath(file.fileUrl)

      if (storagePath) {
        await supabase.storage.from(process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models').remove([storagePath])
      }

      const { error } = await supabase
        .from('model_files')
        .delete()
        .eq('id', file.id)

      if (error) throw new Error(error.message)
      setFiles((current) => current.filter((item) => item.id !== file.id))
      showToast({ type: 'success', message: 'Model file deleted' })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not delete file' })
    } finally {
      setDeletingFileId(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="rounded-2xl border border-[#e8e4df] bg-gradient-to-br from-[#f8f6f2] via-[#f0ede8] to-[#e8e4df] p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#ded7ff] bg-[#f3f0ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#4c1d95]">
          Account Profile
        </div>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[#1a1a1a]">
          {profile.name}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-8 text-[#4b4b4b]">
          Your secure {businessName} account stores quote history, uploaded model references, and authentication settings.
        </p>
      </div>

      <QuickActionsBar />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <SectionLabel>Profile details</SectionLabel>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="mt-5 flex items-center gap-4">
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#ebe5ff] text-2xl font-bold text-[#6d28d9]">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={`${profile.name} avatar`}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(profile.name)
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e8e4df] px-4 text-sm font-semibold text-[#4b4b4b] transition hover:border-[#ded7ff] hover:bg-[#f3f0ff] hover:text-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Camera className="h-4 w-4" />
                {avatarUploading ? 'Uploading...' : 'Change Photo'}
              </button>
              <p className="mt-2 text-xs text-[#9ca3af]">PNG, WebP, JPG, or GIF up to 5MB.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <ProfileField
              label="Name"
              value={profile.name}
              action={<SmallButton onClick={() => {
                setNameDraft(profile.name)
                setActiveModal('name')
              }}>Edit</SmallButton>}
            />
            <ProfileField label="Email" value={profile.email} />
            <ProfileField label="Member since" value={formatDate(profile.createdAt)} />

            <ProfileField
              label="Phone number"
              value={profile.phone || 'Not added'}
              muted={!profile.phone}
              action={<SmallButton onClick={() => {
                setPhoneDraft(profile.phone)
                setActiveModal('phone')
              }}>{profile.phone ? 'Edit' : 'Edit'}</SmallButton>}
            />

            <AddressesField
              addresses={profile.addresses}
              onAdd={() => {
                setEditingAddressId(null)
                setAddressDraft(emptyAddress)
                setActiveModal('address')
              }}
              onEdit={(address) => {
                setEditingAddressId(address.id)
                setAddressDraft(toAddress(address))
                setActiveModal('address')
              }}
            />

            <ProfileField
              label="GST Number (for B2B invoices)"
              value={profile.gstNumber || 'Not provided'}
              muted={!profile.gstNumber}
              action={<SmallButton onClick={() => {
                setGstDraft(profile.gstNumber)
                setActiveModal('gst')
              }}>{profile.gstNumber ? 'Edit' : 'Add'}</SmallButton>}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <UsageSnapshotCard count={savedQuotesCount} message={savedQuotesMessage} />
          <OrderActivityCard orderActivity={orderActivity} />
          <SecurityCard />
        </div>
      </div>

      <MyFilesCard
        files={files}
        totalFileCount={totalFileCount}
        deletingFileId={deletingFileId}
        onDelete={handleFileDelete}
      />

      {activeModal === 'name' && (
        <Modal title="Edit Name" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleNameSave} className="space-y-5">
            <TextInput label="Name" value={nameDraft} onChange={setNameDraft} placeholder="Your full name" />
            <div className="flex justify-end gap-3">
              <SmallButton onClick={() => setActiveModal(null)}>Cancel</SmallButton>
              <button type="submit" disabled={saving} className="rounded-xl bg-[#6d28d9] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c1d95] disabled:opacity-60">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === 'phone' && (
        <Modal title="Edit Phone Number" onClose={() => setActiveModal(null)}>
          <form onSubmit={handlePhoneSave} className="space-y-5">
            <TextInput label="Phone Number" value={phoneDraft} onChange={setPhoneDraft} placeholder="+91 98765 43210" />
            <div className="flex justify-end gap-3">
              <SmallButton onClick={() => setActiveModal(null)}>Cancel</SmallButton>
              <button type="submit" disabled={saving} className="rounded-xl bg-[#6d28d9] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c1d95] disabled:opacity-60">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === 'address' && (
        <Modal title={editingAddressId ? 'Edit Address' : 'Add Address'} onClose={() => setActiveModal(null)}>
          <form onSubmit={handleAddressSave} className="space-y-4">
            <TextInput label="Address Line 1" value={addressDraft.addressLine1} onChange={(value) => setAddressDraft((current) => ({ ...current, addressLine1: value }))} placeholder="Flat / house number" />
            <TextInput label="Address Line 2" value={addressDraft.addressLine2} onChange={(value) => setAddressDraft((current) => ({ ...current, addressLine2: value }))} placeholder="Street / area" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="City" value={addressDraft.city} onChange={(value) => setAddressDraft((current) => ({ ...current, city: value }))} />
              <TextInput label="State" value={addressDraft.state} onChange={(value) => setAddressDraft((current) => ({ ...current, state: value }))} />
            </div>
            <TextInput label="Pincode" value={addressDraft.pincode} onChange={(value) => setAddressDraft((current) => ({ ...current, pincode: value }))} />
            <div className="flex justify-end gap-3 pt-1">
              <SmallButton onClick={() => setActiveModal(null)}>Cancel</SmallButton>
              <button type="submit" disabled={saving} className="rounded-xl bg-[#6d28d9] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c1d95] disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === 'gst' && (
        <Modal title="GST Number" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleGstSave} className="space-y-5">
            <TextInput label="GST Number" value={gstDraft} onChange={setGstDraft} placeholder="15 character GSTIN" />
            <p className="text-sm leading-6 text-[#4b4b4b]">GST number is optional and used only for B2B invoice details.</p>
            <div className="flex justify-end gap-3">
              <SmallButton onClick={() => setActiveModal(null)}>Cancel</SmallButton>
              <button type="submit" disabled={saving} className="rounded-xl bg-[#6d28d9] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c1d95] disabled:opacity-60">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[130] rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

function AddressesField({
  addresses,
  onAdd,
  onEdit,
}: {
  addresses: ProfileSavedAddress[]
  onAdd: () => void
  onEdit: (address: ProfileSavedAddress) => void
}) {
  return (
    <div className="rounded-2xl border border-[#e8e4df] bg-[#fffdfb] px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[#9ca3af]">My Addresses</div>
          <div className="mt-2 text-sm text-[#4b4b4b]">
            {addresses.length > 0 ? `${addresses.length} saved ${addresses.length === 1 ? 'address' : 'addresses'}` : 'No address saved'}
          </div>
        </div>
        <SmallButton onClick={onAdd}>Add Address</SmallButton>
      </div>

      {addresses.length > 0 && (
        <div className="mt-4 grid gap-3">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-xl border border-[#e8e4df] bg-white px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-[#1a1a1a]">
                      {address.city}, {address.state}
                    </div>
                    {address.isDefault && (
                      <span className="rounded-full border border-[#ded7ff] bg-[#f3f0ff] px-2 py-0.5 text-[11px] font-semibold text-[#4c1d95]">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1 break-words text-sm leading-6 text-[#4b4b4b]">
                    {formatAddress(address)}
                  </p>
                </div>
                <SmallButton onClick={() => onEdit(address)}>Edit</SmallButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileField({
  label,
  value,
  muted = false,
  action,
}: {
  label: string
  value: string
  muted?: boolean
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[#e8e4df] bg-[#fffdfb] px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.18em] text-[#9ca3af]">{label}</div>
          <div className={`mt-2 break-words text-sm ${muted ? 'text-[#9ca3af]' : 'text-[#1a1a1a]'}`}>{value}</div>
        </div>
        {action}
      </div>
    </div>
  )
}

function QuickActionsBar() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Link
        href="/instant-quote"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4c1d95]"
      >
        <Upload className="h-4 w-4" />
        Upload New Model
      </Link>
      <Link
        href="/orders?filter=active"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e8e4df] px-5 text-sm font-semibold text-[#4b4b4b] transition hover:border-[#ded7ff] hover:bg-[#f3f0ff] hover:text-[#6d28d9]"
      >
        <Truck className="h-4 w-4" />
        Track Active Order
      </Link>
      <a
        href="https://wa.me/919623023480"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 px-5 text-sm font-semibold text-[#1fa855] transition hover:bg-[#25D366]/10"
      >
        <MessageCircle className="h-4 w-4" />
        Contact Support
      </a>
    </div>
  )
}

function UsageSnapshotCard({ count, message }: { count: number; message: string }) {
  return (
    <Card>
      <SectionLabel>Usage snapshot</SectionLabel>
      <div className="mt-4 text-4xl font-extrabold text-[#1a1a1a]">{count}</div>
      <div className="mt-2 text-sm leading-6 text-[#4b4b4b]">{message}</div>
    </Card>
  )
}

function OrderActivityCard({ orderActivity }: { orderActivity: ProfileOrderActivity }) {
  if (orderActivity.unavailableMessage) {
    return (
      <Card>
        <SectionLabel>Order activity</SectionLabel>
        <p className="mt-4 text-sm leading-6 text-[#4b4b4b]">{orderActivity.unavailableMessage}</p>
      </Card>
    )
  }

  if (orderActivity.totalOrders === 0) {
    return (
      <Card>
        <SectionLabel>Order activity</SectionLabel>
        <div className="mt-5 rounded-2xl border border-dashed border-[#e8e4df] bg-[#fffdfb] p-5 text-center">
          <PackageCheck className="mx-auto h-8 w-8 text-[#6d28d9]" />
          <p className="mt-3 text-sm font-semibold text-[#1a1a1a]">No orders yet. Upload your first model to get started.</p>
          <Link
            href="/instant-quote"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#6d28d9] px-4 text-sm font-semibold text-white transition hover:bg-[#4c1d95]"
          >
            Upload Model
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <SectionLabel>Order activity</SectionLabel>
        <Link href="/orders" className="text-sm font-semibold text-[#6d28d9] transition hover:text-[#4c1d95]">
          View All Orders
        </Link>
      </div>

      {orderActivity.unavailableMessage ? (
        <p className="mt-4 text-sm leading-6 text-[#4b4b4b]">{orderActivity.unavailableMessage}</p>
      ) : (
        <div className="mt-5 grid gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[#9ca3af]">Total Orders Placed</div>
            <div className="mt-1 text-3xl font-extrabold text-[#1a1a1a]">{orderActivity.totalOrders}</div>
          </div>
          <div className="rounded-2xl border border-[#e8e4df] bg-[#fffdfb] px-4 py-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#9ca3af]">Last Order</div>
            {orderActivity.lastOrder ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#1a1a1a]">
                <span>{formatShortDate(orderActivity.lastOrder.createdAt)}</span>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getOrderStatusClasses(orderActivity.lastOrder.status)}`}>
                  {getOrderStatusLabel(orderActivity.lastOrder.status)}
                </span>
              </div>
            ) : (
              <div className="mt-2 text-sm text-[#9ca3af]">—</div>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[#9ca3af]">Favourite Material</div>
            <div className="mt-2 text-sm font-semibold text-[#1a1a1a]">{orderActivity.favoriteMaterial || '—'}</div>
          </div>
        </div>
      )}
    </Card>
  )
}

function SecurityCard() {
  return (
    <Card className="border-[#e8e1ff] bg-[#f3f0ff]/40">
      <SectionLabel>Security</SectionLabel>
      <p className="mt-3 text-sm leading-7 text-[#4b4b4b]">
        Need to rotate credentials or test recovery? Use the password reset flow from the login screen.
      </p>
      <Link
        href="/saved-quotes"
        className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#1a1a1a] shadow-sm transition hover:bg-[#f3f0ff]"
      >
        Review saved quotes
      </Link>
    </Card>
  )
}

function MyFilesCard({
  files,
  totalFileCount,
  deletingFileId,
  onDelete,
}: {
  files: ProfileModelFile[]
  totalFileCount: number
  deletingFileId: string | null
  onDelete: (file: ProfileModelFile) => void
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <SectionLabel>My Files / Models</SectionLabel>
        {totalFileCount > 5 && (
          <Link href="/saved-quotes" className="text-sm font-semibold text-[#6d28d9] transition hover:text-[#4c1d95]">
            View All Files
          </Link>
        )}
      </div>

      {files.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#e8e4df] bg-[#fffdfb] p-6 text-center">
          <FileArchive className="mx-auto h-8 w-8 text-[#9ca3af]" />
          <p className="mt-3 text-sm font-semibold text-[#1a1a1a]">No models uploaded yet</p>
          <Link
            href="/instant-quote"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#6d28d9] px-4 text-sm font-semibold text-white transition hover:bg-[#4c1d95]"
          >
            Upload Model
          </Link>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-gray-100">
          {files.slice(0, 5).map((file) => (
            <div key={file.id} className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f3f0ff] text-xs font-black text-[#6d28d9]">
                  {getFileExtension(file.fileName)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[#1a1a1a]">{file.fileName}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#9ca3af]">
                    <span>{formatShortDate(file.uploadedAt)}</span>
                    <span>{file.material || 'Material not set'}</span>
                    <span className="capitalize">{file.status}</span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/instant-quote?modelFile=${encodeURIComponent(file.id)}`}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e8e4df] px-3 text-sm font-semibold text-[#4b4b4b] transition hover:border-[#ded7ff] hover:bg-[#f3f0ff] hover:text-[#6d28d9]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Re-order
                </Link>
                <button
                  type="button"
                  onClick={() => onDelete(file)}
                  disabled={deletingFileId === file.id}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-100 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingFileId === file.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
