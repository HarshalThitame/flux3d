import crypto from 'crypto'
import { absoluteUrl } from '@/lib/site'
import type { ShopOrder } from '@/lib/shop/orders'
import type { PublicBusinessProfile } from '@/lib/public-business'

export type PayuConfig = {
  merchantKey: string
  salt: string
  baseUrl: string
  paymentUrl: string
  successUrl: string
  failureUrl: string
}

export function getPayuConfig(): PayuConfig | null {
  const merchantKey = process.env.PAYU_MERCHANT_KEY?.trim() || ''
  const salt = process.env.PAYU_SALT?.trim() || ''
  const baseUrl = (process.env.PAYU_BASE_URL?.trim() || 'https://secure.payu.in').replace(/\/+$/, '')
  const paymentUrl = baseUrl.endsWith('/_payment') ? baseUrl : `${baseUrl}/_payment`

  if (!merchantKey || !salt) {
    return null
  }

  return {
    merchantKey,
    salt,
    baseUrl,
    paymentUrl,
    successUrl: (process.env.PAYU_SUCCESS_URL?.trim() || absoluteUrl('/api/3d-shop/payu/response')).replace(/\/+$/, ''),
    failureUrl: (process.env.PAYU_FAILURE_URL?.trim() || absoluteUrl('/api/3d-shop/payu/response')).replace(/\/+$/, ''),
  }
}

function sha512(value: string) {
  return crypto.createHash('sha512').update(value).digest('hex')
}

function normalizeAmount(value: number) {
  return Number(value || 0).toFixed(2)
}

function normalizeText(value: string | null | undefined) {
  return (value || '').trim()
}

export function buildPayuRequestHash(params: {
  merchantKey: string
  txnid: string
  amount: number
  productinfo: string
  firstname: string
  email: string
  udf1?: string
  udf2?: string
  udf3?: string
  udf4?: string
  udf5?: string
  salt: string
}) {
  const {
    merchantKey,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1 = '',
    udf2 = '',
    udf3 = '',
    udf4 = '',
    udf5 = '',
    salt,
  } = params

  const sequence = [
    merchantKey,
    txnid,
    normalizeAmount(amount),
    productinfo,
    firstname,
    email,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
    '',
    '',
    '',
    '',
    '',
    salt,
  ].join('|')

  return sha512(sequence)
}

export function buildPayuResponseHash(params: {
  merchantKey: string
  txnid: string
  amount: string
  productinfo: string
  firstname: string
  email: string
  additionalCharges?: string
  udf1?: string
  udf2?: string
  udf3?: string
  udf4?: string
  udf5?: string
  status: string
  salt: string
}) {
  const {
    merchantKey,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    additionalCharges = '',
    udf1 = '',
    udf2 = '',
    udf3 = '',
    udf4 = '',
    udf5 = '',
    status,
    salt,
  } = params

  const reverseSequence = [
    salt,
    status,
    udf5,
    udf4,
    udf3,
    udf2,
    udf1,
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    merchantKey,
  ].join('|')

  if (additionalCharges) {
    return sha512([
      additionalCharges,
      reverseSequence,
    ].join('|'))
  }

  return sha512(reverseSequence)
}

export function buildPayuCheckoutFields(order: ShopOrder, profile: PublicBusinessProfile, config: PayuConfig) {
  const productinfo = `Flux 3D Order ${order.order_number}`
  const firstname = normalizeText(order.shipping_address.name) || profile.brandName
  const email = profile.supportEmail
  const phone = normalizeText(order.shipping_address.phone) || profile.supportPhone

  return {
    key: config.merchantKey,
    txnid: order.order_number,
    amount: normalizeAmount(order.total_amount),
    productinfo,
    firstname,
    email,
    phone,
    surl: config.successUrl,
    furl: config.failureUrl,
    hash: buildPayuRequestHash({
      merchantKey: config.merchantKey,
      txnid: order.order_number,
      amount: order.total_amount,
      productinfo,
      firstname,
      email,
      salt: config.salt,
    }),
    udf1: order.id,
    udf2: profile.legalName,
    udf3: profile.brandName,
    udf4: profile.jurisdictionCity,
    udf5: profile.jurisdictionState,
    address1: normalizeText(order.shipping_address.line1),
    address2: normalizeText(order.shipping_address.line2),
    city: normalizeText(order.shipping_address.city),
    state: normalizeText(order.shipping_address.state),
    country: 'India',
    zipcode: normalizeText(order.shipping_address.pincode),
  }
}
