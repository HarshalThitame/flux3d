'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, FileText, Scale, Shield, AlertTriangle, Truck, UploadCloud, CreditCard } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

const sections = [
  { id: 'intro', title: '1. Introduction', icon: FileText },
  { id: 'operator', title: '2. Business and Legal Operator', icon: Shield },
  { id: 'acceptance', title: '3. Acceptance of Terms', icon: Scale },
  { id: 'service', title: '4. Description of Service', icon: FileText },
  { id: 'quotes', title: '5. Quotations, Orders and File Submission', icon: UploadCloud },
  { id: 'pricing', title: '6. Pricing, Taxes and Payment', icon: CreditCard },
  { id: 'production', title: '7. Production Approval and Tolerances', icon: AlertTriangle },
  { id: 'cancellation', title: '8. Cancellation', icon: AlertTriangle },
  { id: 'refunds', title: '9. Refunds', icon: AlertTriangle },
  { id: 'delivery', title: '10. Delivery and Shipping', icon: Truck },
  { id: 'conduct', title: '11. Acceptable Use and Prohibited Items', icon: AlertTriangle },
  { id: 'liability', title: '12. Limitation of Liability', icon: Scale },
  { id: 'law', title: '13. Governing Law and Jurisdiction', icon: Scale },
  { id: 'changes', title: '14. Changes and Contact Information', icon: FileText },
]

function SectionTitle({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">{index}</span>
      {children}
    </h2>
  )
}

export default function TermsOfServiceClient() {
  const { settings } = useBusinessSettings()
  const brandName = settings.brandName || settings.businessName || 'Flux3D'
  const legalName = settings.legalBusinessName || settings.businessName || brandName
  const supportEmail = settings.supportEmail || settings.primaryEmail || 'flux3d.in@gmail.com'
  const phone = settings.primaryPhone || '+919623023480'
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
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F1B3D]">
      <div className="sticky top-0 z-50 border-b border-[#6d28d9]/10 bg-[#FFFFFF]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-[1200px] px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-[var(--font-syne)] text-2xl font-extrabold text-[#0F1B3D]">
              flux<span className="text-[#6d28d9]">3d</span>
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#6F7192] transition-colors hover:text-[#0F1B3D]">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[280px_1fr]">
          <motion.aside initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="hidden lg:block">
            <div className="sticky top-24">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#0F1B3D]">Contents</h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#6F7192] transition-colors hover:bg-white/[0.03] hover:text-[#0F1B3D]"
                  >
                    <section.icon className="h-3.5 w-3.5" />
                    <span className="line-clamp-1">{section.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </motion.aside>

          <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[800px]">
            <div className="mb-12">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#6d28d9]/10 px-4 py-2 text-sm font-medium text-[#6d28d9]">
                <FileText className="h-4 w-4" />
                Legal Document
              </div>
              <h1 className="mb-4 font-[var(--font-syne)] text-4xl font-extrabold text-[#0F1B3D] md:text-5xl">
                Terms & <span className="text-[#6d28d9]">Conditions</span>
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-[#6F7192]">
                <span>Effective Date: {effectiveDate}</span>
                <span>·</span>
                <span>Last Updated: {updatedDate}</span>
              </div>
            </div>

            <div className="mb-12 rounded-2xl border border-[#6d28d9]/20 bg-[#6d28d9]/10 p-6">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-[#6d28d9]" />
                <div>
                  <h3 className="mb-2 font-semibold text-[#0F1B3D]">Important notice</h3>
                  <p className="text-sm leading-relaxed text-[#6F7192]">
                    These Terms apply to Flux 3D&apos;s custom 3D printing, prototyping, model printing, ready-made products,
                    and related manufacturing services. By placing an order or using the website, you agree to these Terms
                    and the linked policies published on this site.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-12">
              <section id="intro">
                <SectionTitle index={1}>Introduction</SectionTitle>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>Flux 3D is the brand used to provide custom 3D printing and custom manufacturing services in India.</p>
                  <p>These Terms cover website use, quotation requests, order placement, file uploads, payment, production, shipping, cancellation, refunds, and customer support.</p>
                </div>
              </section>

              <section id="operator">
                <SectionTitle index={2}>Business and Legal Operator</SectionTitle>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p><strong className="text-[#0F1B3D]">{brandName}</strong> is the public brand. The legal operator is <strong className="text-[#0F1B3D]">{legalName}</strong>.</p>
                  <p>Public contact details: <a className="text-[#6d28d9] hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>, <a className="text-[#6d28d9] hover:underline" href={`tel:${phone.replace(/[^0-9+]/g, '')}`}>{phone}</a>, {address}.</p>
                </div>
              </section>

              <section id="acceptance">
                <SectionTitle index={3}>Acceptance of Terms</SectionTitle>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>By using the website, requesting a quotation, uploading a file, or paying for an order, you confirm that you have read and accepted these Terms.</p>
                </div>
              </section>

              <section id="service">
                <SectionTitle index={4}>Description of Service</SectionTitle>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>Flux 3D provides custom 3D printing, prototyping, model printing, ready-made products, and related manufacturing services. Services may include material selection, production, finishing, packaging and delivery.</p>
                  <p>For custom orders, the final price is confirmed only after the design, material, finish, quantity and delivery requirements are reviewed.</p>
                </div>
              </section>

              <section id="quotes">
                <SectionTitle index={5}>Quotations, Orders and File Submission</SectionTitle>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>Customers may upload a 3D model or design file, select available specifications, or share product requirements for review.</p>
                  <p>You are responsible for dimensions, scale, wall thickness, geometry, file orientation, intended use, quantity, colour, and delivery details.</p>
                  <p>If a file appears unsuitable for printing, we may request clarification, suggest changes, place the order on hold, or cancel and refund the affected order.</p>
                </div>
              </section>

              <section id="pricing">
                <SectionTitle index={6}>Pricing, Taxes and Payment</SectionTitle>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>Prices are shown in INR. Applicable taxes, shipping charges and any service-specific fees are shown before payment whenever possible.</p>
                  <p>Payment is processed through the configured payment gateway. A successful card or UPI debit does not by itself confirm the order until payment confirmation is received on the server.</p>
                </div>
              </section>

              <section id="production">
                <SectionTitle index={7}>Production Approval and Tolerances</SectionTitle>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>Custom products are manufactured based on the approved file and final specifications. Minor variations may occur due to the additive manufacturing process.</p>
                  <p>Small differences in surface texture, support marks, layer lines, shade, dimensions or finishing will not automatically qualify as defects if they are within reasonable manufacturing tolerances.</p>
                </div>
              </section>

              <section id="cancellation">
                <SectionTitle index={8}>Cancellation</SectionTitle>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>Custom 3D-printed orders may be cancelled before production begins if the request is approved. Once printing, material preparation or production has started, cancellation is normally not available.</p>
                  <p>Ready-made product orders may be cancelled before dispatch. After dispatch, cancellation is normally not available.</p>
                </div>
              </section>

              <section id="refunds">
                <SectionTitle index={9}>Refunds</SectionTitle>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>Refunds are handled under the Refund & Cancellation Policy. Correctly manufactured custom products are generally not refundable for change of mind or customer-provided design errors.</p>
                  <p>Refunds may be approved for defective, damaged, incorrect, duplicate, or failed-payment cases according to the published policy and applicable law.</p>
                </div>
              </section>

              <section id="delivery">
                <SectionTitle index={10}>Delivery and Shipping</SectionTitle>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>Flux 3D delivers orders across serviceable locations in India. Delivery time starts after production and dispatch, and courier timelines may vary by destination.</p>
                  <p>Customers are responsible for providing a complete and accurate address. Delays caused by incorrect addresses, courier issues or unavailability are handled according to the shipping policy.</p>
                </div>
              </section>

              <section id="conduct">
                <SectionTitle index={11}>Acceptable Use and Prohibited Items</SectionTitle>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>You must not submit illegal, unsafe, infringing or otherwise prohibited items. We may reject files or orders that cannot be manufactured safely or lawfully.</p>
                  <p>You are responsible for intellectual-property rights in the files or designs you submit. Do not upload content you do not have the right to produce.</p>
                </div>
              </section>

              <section id="liability">
                <SectionTitle index={12}>Limitation of Liability</SectionTitle>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>To the maximum extent permitted by law, Flux 3D is not liable for losses arising from customer-uploaded design defects, incorrect specifications, delays outside our reasonable control, or misuse after delivery.</p>
                  <p>Nothing in these Terms limits liability where such limitation is not permitted by applicable law.</p>
                </div>
              </section>

              <section id="law">
                <SectionTitle index={13}>Governing Law and Jurisdiction</SectionTitle>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>These Terms are governed by the laws of India. Courts having jurisdiction over the business location will have jurisdiction over disputes, subject to applicable consumer protection law.</p>
                </div>
              </section>

              <section id="changes">
                <SectionTitle index={14}>Changes and Contact Information</SectionTitle>
                <div className="space-y-4 leading-relaxed text-[#6F7192]">
                  <p>We may update these Terms from time to time. The version posted on this website is the version that applies on the date of the order.</p>
                  <p>Questions about these Terms can be sent to <a className="text-[#6d28d9] hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a> or via the public contact page.</p>
                </div>
              </section>
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  )
}
