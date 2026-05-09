'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Truck, Package, Clock, MapPin, AlertTriangle } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

export default function ShippingPolicyClient() {
  const { settings } = useBusinessSettings()
  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0a0f1e]/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-[var(--font-syne)] text-2xl font-extrabold text-white">
              flux<span className="text-[#FF5C1A]">3d</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-[#7a82a0] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-6 py-12">
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Title Section */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 bg-[#FF5C1A]/10 text-[#FF5C1A] px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Truck className="w-4 h-4" />
              Shipping Policy
            </div>
            <h1 className="font-[var(--font-syne)] text-4xl md:text-5xl font-extrabold text-white mb-4">
              Shipping <span className="text-[#FF5C1A]">Policy</span>
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-[#7a82a0]">
              <span>Effective Date: January 1, 2025</span>
              <span>·</span>
              <span>Last Updated: May 3, 2025</span>
            </div>
          </div>

          {/* Shipping Coverage */}
          <div className="bg-gradient-to-r from-[#FF5C1A]/20 to-transparent border border-[#FF5C1A]/30 rounded-2xl p-8 mb-12">
            <div className="flex items-start gap-4">
              <MapPin className="w-8 h-8 text-[#FF5C1A] flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Pan-India Delivery</h2>
                <p className="text-[#7a82a0] leading-relaxed">
                  We ship 3D printed products to all major cities and towns across India.
                  From Mumbai to Delhi, Bangalore to Chennai — we've got you covered.
                </p>
              </div>
            </div>
          </div>

          {/* Policy Sections */}
          <div className="space-y-10">
            {/* Processing Time */}
            <section>
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5C1A]/10 text-[#FF5C1A] text-sm font-bold">1</span>
                Processing Time
              </h2>
              <div className="bg-[#0a0f1e] border border-white/10 rounded-xl p-6 text-[#7a82a0] leading-relaxed">
                <p className="mb-4">All orders require processing time before shipment:</p>
                <ul className="space-y-3">
                  {[
                    { label: 'Standard Prints', time: '1-3 business days' },
                    { label: 'Complex/ Large Prints', time: '3-5 business days' },
                    { label: 'Multi-part Orders', time: '5-7 business days' },
                  ].map((item) => (
                    <li key={item.label} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      <span>{item.label}</span>
                      <span className="text-white font-medium">{item.time}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm">
                  Processing time does not include weekends, holidays, or the time required for
                  you to approve the final design (if applicable).
                </p>
              </div>
            </section>

            {/* Shipping Methods */}
            <section>
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5C1A]/10 text-[#FF5C1A] text-sm font-bold">2</span>
                Shipping Methods & Costs
              </h2>
              <div className="space-y-4">
                <div className="bg-[#0a0f1e] border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Delivery Partners</h3>
                  <div className="flex flex-wrap gap-3 mb-6">
                    {['Delhivery', 'Shiprocket', 'DTDC', 'Bluedart'].map((partner) => (
                      <span key={partner} className="bg-white/[0.03] border border-white/10 px-4 py-2 rounded-lg text-sm text-white">
                        {partner}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {[
                      { zone: 'Within Mumbai', time: '1-2 days', cost: '₹49' },
                      { zone: 'Metro Cities', time: '2-4 days', cost: '₹99' },
                      { zone: 'Tier 2 Cities', time: '3-5 days', cost: '₹149' },
                      { zone: 'Rest of India', time: '4-7 days', cost: '₹199' },
                    ].map((item) => (
                      <div key={item.zone} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                        <span className="text-[#7a82a0]">{item.zone}</span>
                        <span className="text-white text-sm">{item.time}</span>
                        <span className="text-[#FF5C1A] font-semibold">{item.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-[#7a82a0]">
                  Orders above ₹999 qualify for free shipping within Mumbai. Orders above ₹1999
                  qualify for free shipping across India.
                </p>
              </div>
            </section>

            {/* Order Tracking */}
            <section>
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5C1A]/10 text-[#FF5C1A] text-sm font-bold">3</span>
                Order Tracking
              </h2>
              <div className="text-[#7a82a0] leading-relaxed">
                <p className="mb-4">
                  Once your order ships, you will receive a confirmation email with:
                </p>
                <ul className="space-y-2 ml-6 mb-4">
                  {[
                    'Tracking number and courier partner details',
                    'Estimated delivery date',
                    'Link to track your shipment online',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-[#FF5C1A] mt-1.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  You can also track your order by logging into your account on our website
                  or contacting our support team.
                </p>
              </div>
            </section>

            {/* Delivery Issues */}
            <section>
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5C1A]/10 text-[#FF5C1A] text-sm font-bold">4</span>
                Delivery Issues
              </h2>
              <div className="space-y-4">
                <div className="bg-[#0a0f1e] border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Damaged or Lost Packages</h3>
                  <p className="text-[#7a82a0] mb-3">
                    If your package arrives damaged or doesn't arrive:
                  </p>
                  <ul className="space-y-2">
                    {[
                      'Contact us within 48 hours of delivery (for damaged items)',
                      'Provide photos of the damaged package and contents',
                      'We will investigate with the courier and arrange replacement',
                      'For lost packages, we will reship or provide a full refund',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[#7a82a0]">
                        <span className="text-[#FF5C1A] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-[#0a0f1e] border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Failed Deliveries</h3>
                  <p className="text-[#7a82a0] mb-3">
                    If delivery fails due to:
                  </p>
                  <ul className="space-y-2">
                    {[
                      'Incorrect address: Contact us to update and reship (reshipping fee applies)',
                      'No one available: Courier will attempt 2 more deliveries',
                      'Refused package: Treated as order cancellation (policy applies)',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[#7a82a0]">
                        <span className="text-[#FF5C1A] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* International Shipping */}
            <section>
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5C1A]/10 text-[#FF5C1A] text-sm font-bold">5</span>
                International Shipping
              </h2>
              <div className="bg-[#0a0f1e] border border-white/10 rounded-xl p-6 text-[#7a82a0] leading-relaxed">
                <p className="mb-3">
                  Currently, we only ship within India. We are working on expanding to
                  international markets. Subscribe to our newsletter to be notified when
                  international shipping becomes available.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section className="bg-[#0a0f1e] border border-white/10 rounded-2xl p-8">
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5C1A]/10 text-[#FF5C1A] text-sm font-bold">6</span>
                Shipping Questions?
              </h2>
              <p className="text-[#7a82a0] mb-6">
                For any shipping-related questions or concerns, please contact our support team:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Support Email', value: settings.supportEmail || 'support@flux3d.com' },
                  { label: 'Phone', value: settings.primaryPhone || '+91 96230 23480' },
                  { label: 'Address', value: [settings.city, settings.state, settings.postalCode].filter(Boolean).join(' - ') || 'Mumbai, Maharashtra - 400053' },
                  { label: 'Hours', value: settings.businessHours || 'Mon-Sat: 9 AM – 8 PM IST' },
                ].map((item) => (
                  <div key={item.label} className="bg-white/[0.03] rounded-xl p-4">
                    <p className="text-sm text-[#7a82a0] mb-1">{item.label}</p>
                    <p className="text-sm text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </motion.main>
      </div>
    </div>
  )
}
