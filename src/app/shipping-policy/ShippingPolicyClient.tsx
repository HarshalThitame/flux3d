'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Truck, Package, Clock, MapPin, AlertTriangle } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

export default function ShippingPolicyClient() {
  const { settings } = useBusinessSettings()
  const supportEmail = settings.supportEmail || settings.primaryEmail || 'flux3d.in@gmail.com'
  const supportPhone = settings.primaryPhone || '+919623023480'
  const address = [
    settings.addressLine1,
    settings.addressLine2,
    settings.city,
    settings.state,
    settings.postalCode,
    settings.country,
  ].filter(Boolean).join(', ')

  const effectiveDate = 'July 17, 2026'
  const updatedDate = 'July 17, 2026'

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#070b1d]">
      <div className="sticky top-0 z-50 border-b border-[#6d28d9]/10 bg-[#FFFFFF]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-[1200px] px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-[var(--font-syne)] text-2xl font-extrabold text-[#070b1d]">
              flux<span className="text-[#6d28d9]">3d</span>
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#6F7192] transition-colors hover:text-[#070b1d]">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[800px] px-6 py-8">
        <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#6d28d9]/10 px-4 py-2 text-sm font-medium text-[#6d28d9]">
              <Truck className="h-4 w-4" />
              Shipping & Delivery Policy
            </div>
            <h1 className="mb-4 font-[var(--font-syne)] text-4xl font-extrabold text-[#070b1d] md:text-5xl">
              Shipping & <span className="text-[#6d28d9]">Delivery</span>
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-[#6F7192]">
              <span>Effective Date: {effectiveDate}</span>
              <span>·</span>
              <span>Last Updated: {updatedDate}</span>
            </div>
          </div>

          <div className="mb-12 rounded-2xl border border-[#6d28d9]/30 bg-gradient-to-r from-[#6d28d9]/10 to-transparent p-8">
            <div className="flex items-start gap-4">
              <MapPin className="mt-1 h-8 w-8 shrink-0 text-[#6d28d9]" />
              <div>
                <h2 className="mb-2 text-2xl font-bold text-[#070b1d]">Digital service, physical dispatch</h2>
                <p className="leading-relaxed text-[#6F7192]">
                  Flux 3D delivers digitally ordered manufacturing services and ready-made products. No physical goods unrelated to the service are sold, and no shipping charge applies unless it is shown before checkout or included in the approved quotation.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">1</span>
                Delivery Coverage
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>Flux 3D delivers custom 3D-printed orders and ready-made products across serviceable PIN codes in India.</p>
                <p>Delivery availability depends on courier-service coverage. International shipping is not available unless Flux 3D confirms it separately in writing.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">2</span>
                Production and Processing Time
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p><strong className="text-[#070b1d]">Custom 3D-printed orders:</strong> Production normally begins after payment confirmation and acceptance of the final specifications. Estimated production time is generally 3-7 business days. Large, complex, high-quantity or specially finished orders may require additional time.</p>
                <p><strong className="text-[#070b1d]">Ready-made products:</strong> In-stock ready-made products are normally processed for dispatch within 1-3 business days after payment confirmation. Orders placed on Sundays or public holidays will be processed on the next working day.</p>
                <p>Production time and courier-delivery time are separate.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">3</span>
                Delivery Time
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>After dispatch, delivery normally takes approximately 3-8 business days, depending on the destination PIN code, courier availability and external conditions.</p>
                <p>Remote or difficult-to-service locations may take longer. Delivery dates are estimates and are not guaranteed.</p>
                <p>Delays may occur due to weather, transportation disruption, public holidays, courier limitations, strikes, natural events, regulatory restrictions or other circumstances outside Flux 3D&apos;s reasonable control.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">4</span>
                Shipping Charges
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>Shipping charges will be displayed before payment or included in the approved quotation. Charges may depend on product weight, dimensions, declared value, destination and courier service.</p>
                <p>Any free-shipping offer will apply only when clearly displayed for the relevant order. Customers will not be charged an undisclosed shipping amount after payment without their approval.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">5</span>
                Order Tracking and Inspection
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>Tracking details will be shared by email, SMS, WhatsApp or through the customer&apos;s order page when tracking is available. Tracking information may take up to 24 hours after dispatch to become active.</p>
                <p>Customers should inspect the package at delivery. When packaging appears visibly damaged, the customer should photograph the package before opening it, record an unpacking video where reasonably possible, retain the original packaging, and report the problem within 48 hours.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">6</span>
                Lost, Delayed and Returned Shipments
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>An order will not be considered lost merely because it is delayed. Flux 3D will first investigate the shipment with the courier partner.</p>
                <p>When the courier confirms that the package is lost, Flux 3D may provide a replacement, reprinting, reshipment or full refund. The customer will not be charged again when the shipment was lost due to Flux 3D or its courier partner.</p>
                <p>When a shipment is returned because the address was incorrect, the customer was unavailable, delivery was refused, the courier could not contact the customer, or multiple delivery attempts failed, Flux 3D may request an additional shipping payment before resending the order.</p>
                <p>For custom products, the manufacturing cost will not normally be refundable where the product was correctly produced but could not be delivered because of customer-provided information or customer unavailability.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#6d28d9]/10 bg-[#faf9f7] p-8">
              <h2 className="mb-6 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">7</span>
                Customer Responsibility and Support
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>Customers must provide a complete and accurate shipping address, including recipient name, house or business details, street and locality, city and state, correct PIN code, active mobile number and delivery instructions where necessary.</p>
                <p>Flux 3D is not responsible for delays or failed deliveries caused by an incomplete or incorrect address supplied by the customer. Any additional shipping cost caused by an incorrect address, refused delivery or repeated delivery attempt may be charged to the customer.</p>
                <p><strong className="text-[#070b1d]">Support email:</strong> <a className="text-[#6d28d9] hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
                <p><strong className="text-[#070b1d]">Support phone:</strong> <a className="text-[#6d28d9] hover:underline" href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`}>{supportPhone}</a></p>
                <p><strong className="text-[#070b1d]">Address:</strong> {address || 'Not published'}</p>
                <p>The customer should not discard the product or packaging until the claim has been reviewed.</p>
              </div>
            </section>
          </div>
        </motion.main>
      </div>
    </div>
  )
}
