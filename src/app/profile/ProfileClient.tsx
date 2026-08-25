'use client'

import { FormEvent, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { addToast } from '@/lib/toast/store'
import type { ProfileDetailsData, ProfileSavedAddress, ProfileAddress } from '@/components/profile/types'
import ProfileHero from '@/components/profile/ProfileHero'
import ContactSection from '@/components/profile/ContactSection'
import AddressesSection from '@/components/profile/AddressesSection'
import WhatsappSection from '@/components/profile/WhatsappSection'
import PrivacySection from '@/components/profile/PrivacySection'
import EditSheet from '@/components/profile/EditSheet'
import { TextInput, SheetActions, SectionLabel, formatAddress } from '@/components/profile/ui'

type EditTarget = 'name' | 'phone' | 'gst' | 'address' | null

const emptyAddress: ProfileAddress = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
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

function withSyncedDefaultAddress(
  profile: ProfileDetailsData,
  addresses: ProfileSavedAddress[]
): ProfileDetailsData {
  const defaultAddress = getDefaultAddress(addresses)

  return {
    ...profile,
    addresses,
    addressId: defaultAddress?.id ?? null,
    address: defaultAddress ? toAddress(defaultAddress) : emptyAddress,
  }
}

function Divider() {
  return (
    <div aria-hidden className="relative h-px bg-[var(--line-subtle)]">
      <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[var(--accent-gold)]" />
    </div>
  )
}

export default function ProfileClient({ profile: initialProfile }: { profile: ProfileDetailsData }) {
  const [profile, setProfile] = useState(initialProfile)
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [nameDraft, setNameDraft] = useState(initialProfile.name)
  const [phoneDraft, setPhoneDraft] = useState(initialProfile.phone)
  const [gstDraft, setGstDraft] = useState(initialProfile.gstNumber)
  const [addressDraft, setAddressDraft] = useState<ProfileAddress>(initialProfile.address)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const reduceMotion = useReducedMotion()

  const openSheet = (target: Exclude<EditTarget, null>) => {
    if (target === 'name') setNameDraft(profile.name)
    if (target === 'phone') setPhoneDraft(profile.phone)
    if (target === 'gst') setGstDraft(profile.gstNumber)
    if (target === 'address') {
      setEditingAddressId(null)
      setAddressDraft(emptyAddress)
    }
    setEditTarget(target)
  }

  async function updateProfile(fields: Record<string, unknown>, successMessage: string) {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw new Error(authError.message)
    if (!user) throw new Error('Please sign in again to update your profile.')

    const { error } = await supabase.from('profiles').update(fields).eq('id', user.id)

    if (error) throw new Error(error.message)
    addToast({ type: 'success', title: successMessage })
  }

  async function handleNameSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = nameDraft.trim()

    if (!name) {
      addToast({ type: 'error', title: 'Name cannot be empty.' })
      return
    }

    setSaving(true)
    try {
      await updateProfile({ name, full_name: name }, 'Name saved')
      setProfile((current) => ({ ...current, name }))
      setEditTarget(null)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Could not save name',
        description: error instanceof Error ? error.message : undefined,
      })
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
      setEditTarget(null)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Could not save phone number',
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleGstSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const gstNumber = gstDraft.trim().toUpperCase()

    if (gstNumber && !/^[A-Z0-9]{15}$/.test(gstNumber)) {
      addToast({ type: 'error', title: 'GST number must be 15 alphanumeric characters.' })
      return
    }

    setSaving(true)
    try {
      await updateProfile({ gst_number: gstNumber || null }, 'GST number saved')
      setProfile((current) => ({ ...current, gstNumber }))
      setEditTarget(null)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Could not save GST number',
        description: error instanceof Error ? error.message : undefined,
      })
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
            address.id === editingAddressId ? { ...address, ...nextAddress } : address
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

      addToast({ type: 'success', title: 'Address saved' })
      setEditingAddressId(null)
      setEditTarget(null)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Could not save address',
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  const sectionMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
      }

  const sheetOpen = editTarget !== null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-24 sm:px-6 sm:pt-28 lg:pb-20">
      <motion.section
        {...(reduceMotion ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } })}
        transition={reduceMotion ? undefined : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="card-premium overflow-hidden rounded-3xl border border-[var(--line-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]"
      >
        <ProfileHero
          name={profile.name}
          email={profile.email}
          avatarUrl={profile.avatarUrl}
          createdAt={profile.createdAt}
          onAvatarUpdated={(avatarUrl) => setProfile((current) => ({ ...current, avatarUrl }))}
        />

        <motion.div {...sectionMotion}>
          <div className="px-6 pt-8 sm:px-10">
            <SectionLabel>Personal Details</SectionLabel>
          </div>
          <ContactSection profile={profile} onEdit={(target) => openSheet(target)} />
        </motion.div>

        <Divider />

        <motion.div {...sectionMotion} transition={reduceMotion ? undefined : { duration: 0.5, delay: 0.08 }}>
          <AddressesSection
            profile={profile}
            onAdd={() => openSheet('address')}
            onEdit={(address) => {
              setEditingAddressId(address.id)
              setAddressDraft(toAddress(address))
              setEditTarget('address')
            }}
          />
        </motion.div>

        <Divider />

        <motion.div {...sectionMotion} transition={reduceMotion ? undefined : { duration: 0.5, delay: 0.16 }}>
          <WhatsappSection profile={profile} />
        </motion.div>

        <Divider />

        <motion.div {...sectionMotion} transition={reduceMotion ? undefined : { duration: 0.5, delay: 0.24 }}>
          <PrivacySection />
        </motion.div>
      </motion.section>

      <EditSheet
        open={sheetOpen && editTarget === 'name'}
        title="Edit name"
        onClose={() => setEditTarget(null)}
      >
        <form onSubmit={handleNameSave} className="space-y-6">
          <TextInput label="Name" value={nameDraft} onChange={setNameDraft} placeholder="Your full name" />
          <SheetActions onCancel={() => setEditTarget(null)} saving={saving} />
        </form>
      </EditSheet>

      <EditSheet
        open={sheetOpen && editTarget === 'phone'}
        title="Phone number"
        onClose={() => setEditTarget(null)}
      >
        <form onSubmit={handlePhoneSave} className="space-y-6">
          <TextInput label="Phone number" value={phoneDraft} onChange={setPhoneDraft} placeholder="+91 98765 43210" />
          <SheetActions onCancel={() => setEditTarget(null)} saving={saving} />
        </form>
      </EditSheet>

      <EditSheet
        open={sheetOpen && editTarget === 'gst'}
        title="GSTIN"
        description="Optional — used only for B2B invoice details."
        onClose={() => setEditTarget(null)}
      >
        <form onSubmit={handleGstSave} className="space-y-6">
          <TextInput label="GST number" value={gstDraft} onChange={setGstDraft} placeholder="15 character GSTIN" />
          <SheetActions onCancel={() => setEditTarget(null)} saving={saving} />
        </form>
      </EditSheet>

      <EditSheet
        open={sheetOpen && editTarget === 'address'}
        title={editingAddressId ? 'Edit address' : 'Add address'}
        onClose={() => {
          setEditTarget(null)
          setEditingAddressId(null)
        }}
      >
        <form onSubmit={handleAddressSave} className="space-y-5">
          <TextInput
            label="Address line 1"
            value={addressDraft.addressLine1}
            onChange={(value) => setAddressDraft((current) => ({ ...current, addressLine1: value }))}
            placeholder="Flat / house number"
          />
          <TextInput
            label="Address line 2"
            value={addressDraft.addressLine2}
            onChange={(value) => setAddressDraft((current) => ({ ...current, addressLine2: value }))}
            placeholder="Street / area"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput
              label="City"
              value={addressDraft.city}
              onChange={(value) => setAddressDraft((current) => ({ ...current, city: value }))}
            />
            <TextInput
              label="State"
              value={addressDraft.state}
              onChange={(value) => setAddressDraft((current) => ({ ...current, state: value }))}
            />
          </div>
          <TextInput
            label="Pincode"
            value={addressDraft.pincode}
            onChange={(value) => setAddressDraft((current) => ({ ...current, pincode: value }))}
          />
          {editingAddressId && (
            <p className="text-[13px] leading-6 text-[var(--text-faint)]">
              {formatAddress(addressDraft)}
            </p>
          )}
          <SheetActions
            onCancel={() => {
              setEditTarget(null)
              setEditingAddressId(null)
            }}
            saving={saving}
            saveLabel="Save address"
          />
        </form>
      </EditSheet>
    </main>
  )
}
