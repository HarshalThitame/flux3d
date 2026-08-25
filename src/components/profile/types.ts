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
  phoneVerified: boolean
  whatsappOptIn: boolean
  phoneCanonical: string | null
  pendingLinkPhone: string | null
  addressId: string | null
  address: ProfileAddress
  addresses: ProfileSavedAddress[]
  gstNumber: string
}
