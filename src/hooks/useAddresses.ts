'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { AddressRow } from '../../types/database'

export type AddressInput = {
  full_name: string
  phone: string
  address_line_1: string
  address_line_2?: string | null
  city: string
  state: string
  pincode: string
  country?: string
  is_default?: boolean
}

type UseAddressesResult = {
  addresses: AddressRow[]
  defaultAddress: AddressRow | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  addAddress: (input: AddressInput) => Promise<void>
  updateAddress: (id: string, input: Partial<AddressInput>) => Promise<void>
  deleteAddress: (id: string) => Promise<void>
  setDefault: (id: string) => Promise<void>
}

async function fetchAddressesForCurrentUser() {
  const supabase = getSupabaseBrowserClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  const user = authData.user
  if (!user) {
    return { userId: null, addresses: [] as AddressRow[] }
  }

  const { data, error: addressError } = await supabase
    .from('addresses')
    .select('id, user_id, full_name, phone, address_line_1, address_line_2, city, state, pincode, country, is_default, created_at')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (addressError) throw addressError

  return {
    userId: user.id,
    addresses: (data ?? []) as AddressRow[],
  }
}

export function useAddresses(): UseAddressesResult {
  const [userId, setUserId] = useState<string | null>(null)
  const [addresses, setAddresses] = useState<AddressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const defaultAddress = useMemo(
    () => addresses.find((address) => address.is_default) ?? addresses[0] ?? null,
    [addresses]
  )

  const loadAddresses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await fetchAddressesForCurrentUser()
      setUserId(next.userId)
      setAddresses(next.addresses)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load addresses.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function bootstrap() {
      try {
        const next = await fetchAddressesForCurrentUser()
        if (!active) return
        setUserId(next.userId)
        setAddresses(next.addresses)
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load addresses.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      active = false
    }
  }, [])

  async function requireUserId() {
    if (userId) return userId
    const supabase = getSupabaseBrowserClient()
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!data.user) throw new Error('You must be signed in to manage addresses.')
    setUserId(data.user.id)
    return data.user.id
  }

  async function addAddress(input: AddressInput) {
    const id = await requireUserId()
    const supabase = getSupabaseBrowserClient()
    const optimisticId = crypto.randomUUID()
    const optimistic: AddressRow = {
      id: optimisticId,
      user_id: id,
      full_name: input.full_name,
      phone: input.phone,
      address_line_1: input.address_line_1,
      address_line_2: input.address_line_2 ?? null,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      country: input.country ?? 'India',
      is_default: Boolean(input.is_default),
      created_at: new Date().toISOString(),
    }
    setAddresses((current) => [optimistic, ...current.map((address) => input.is_default ? { ...address, is_default: false } : address)])
    const { error: insertError } = await supabase.from('addresses').insert({ user_id: id, ...input })
    if (insertError) {
      setAddresses((current) => current.filter((address) => address.id !== optimisticId))
      throw insertError
    }
    await loadAddresses()
  }

  async function updateAddress(id: string, input: Partial<AddressInput>) {
    const supabase = getSupabaseBrowserClient()
    const previous = addresses
    setAddresses((current) =>
      current.map((address) =>
        address.id === id
          ? { ...address, ...input }
          : input.is_default
            ? { ...address, is_default: false }
            : address
      )
    )
    const { error: updateError } = await supabase.from('addresses').update(input).eq('id', id)
    if (updateError) {
      setAddresses(previous)
      throw updateError
    }
    await loadAddresses()
  }

  async function deleteAddress(id: string) {
    const supabase = getSupabaseBrowserClient()
    const previous = addresses
    setAddresses((current) => current.filter((address) => address.id !== id))
    const { error: deleteError } = await supabase.from('addresses').delete().eq('id', id)
    if (deleteError) {
      setAddresses(previous)
      throw deleteError
    }
  }

  async function setDefault(id: string) {
    await updateAddress(id, { is_default: true })
  }

  return {
    addresses,
    defaultAddress,
    loading,
    error,
    refetch: loadAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefault,
  }
}
