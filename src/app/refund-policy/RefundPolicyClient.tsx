'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

export default function RefundPolicyClient() {
  const { settings } = useBusinessSettings()
  const supportEmail = settings.supportEmail || settings.primaryEmail || 'flux3d.in@gmail.com'
  const supportPhone = settings.primaryPhone || '+919623023480'
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
              <RefreshCw className="h-4 w-4" />
              Refund & Cancellation Policy
            </div>
            <h1 className="mb-4 font-[var(--font-syne)] text-4xl font-extrabold text-[#070b1d] md:text-5xl">
              Refund & <span className="text-[#6d28d9]">Cancellation</span>
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-[#6F7192]">
              <span>Effective Date: {effectiveDate}</span>
              <span>·</span>
              <span>Last Updated: {updatedDate}</span>
            </div>
          </div>

          <div className="mb-12 rounded-2xl border border-[#6d28d9]/30 bg-gradient-to-r from-[#6d28d9]/10 to-transparent p-8">
            <div className="flex items-start gap-4">
              <CheckCircle className="mt-1 h-8 w-8 shrink-0 text-[#6d28d9]" />
              <div>
                <h2 className="mb-2 text-2xl font-bold text-[#070b1d]">Custom and ready-made orders</h2>
                <p className="leading-relaxed text-[#6F7192]">
                  Flux 3D accepts custom 3D printing orders and ready-made products. Cancellation and refunds depend on the order type, the production stage, and whether the product was damaged, defective, incorrect, or duplicated.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">1</span>
                Custom 3D-Printed Orders
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>Custom 3D-printed products are manufactured specifically according to the customer&apos;s uploaded design, selected material, colour, size, quantity and other specifications.</p>
                <p><strong className="text-[#070b1d]">Cancellation before production:</strong> Customers may request cancellation before production begins. When cancellation is approved before production starts, the eligible order amount will be refunded. Any separately approved design-modification, 3D-modelling or consultation charges already incurred may be non-refundable if the work has already been completed.</p>
                <p><strong className="text-[#070b1d]">Cancellation after production begins:</strong> Custom orders cannot normally be cancelled after printing, material preparation or production has started. No refund will be provided for a correctly manufactured custom product merely because the customer changed their mind, selected the wrong measurements, uploaded the wrong file or no longer requires the item.</p>
                <p><strong className="text-[#070b1d]">Customer-uploaded files:</strong> The customer is responsible for checking model dimensions and scale, wall thickness, geometry and design accuracy, file orientation requirements, intended application, material and colour selection, quantity and delivery address.</p>
                <p><strong className="text-[#070b1d]">Manufacturing variations:</strong> Minor variations may occur because 3D printing is an additive manufacturing process. Small differences in surface texture, support marks, layer lines, shade, dimensions or finishing will not automatically qualify as defects when they are within reasonable manufacturing tolerances disclosed to the customer.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">2</span>
                Ready-Made Products
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p><strong className="text-[#070b1d]">Cancellation before dispatch:</strong> Ready-made product orders may be cancelled before dispatch. An eligible cancellation made before dispatch will receive a refund to the original payment method.</p>
                <p><strong className="text-[#070b1d]">Cancellation after dispatch:</strong> Orders cannot normally be cancelled after dispatch. The customer may request an eligible return after receiving the product, subject to the return conditions below.</p>
                <p><strong className="text-[#070b1d]">Return eligibility:</strong> A ready-made product may be returned within 7 calendar days of delivery when the wrong product was delivered, the product arrived damaged, the product has a manufacturing defect, the quantity received does not match the confirmed order, or an unused ready-made product is accepted for return under Flux 3D&apos;s change-of-mind return conditions.</p>
                <p><strong className="text-[#070b1d]">Change-of-mind return:</strong> The product must be unused and undamaged, returned in its original condition and packaging, with all included parts. The customer may be responsible for return-delivery charges and original shipping charges may be non-refundable. The return must be approved before the product is sent back.</p>
                <p>Custom-made or personalised products are not eligible for change-of-mind returns.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">3</span>
                Damaged, Defective or Incorrect Products
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>Customers must report a damaged, defective or incorrect product within 48 hours of delivery.</p>
                <p>The request should include the order number, customer name and contact details, description of the issue, clear photographs of the product, photographs of the external and internal packaging, an unpacking video where reasonably available, and a shipping label photograph.</p>
                <p>Flux 3D will review the request and may offer a replacement, reprinting, repair, partial refund or full refund depending on the nature of the issue.</p>
                <p>Do not require customers to pay return shipping when Flux 3D delivered a damaged, defective or incorrect product.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">4</span>
                Items Not Eligible for Refund or Return
              </h2>
              <div className="rounded-xl border border-[#6d28d9]/10 bg-white p-6 leading-relaxed text-[#6F7192]">
                <p className="mb-3">Refunds or returns will generally not be accepted for correctly manufactured custom products, customer change of mind after custom production begins, incorrect dimensions or scale supplied by the customer, incorrect or defective customer-uploaded design files, incorrect material, colour or quantity selected by the customer, damage caused after delivery, improper handling, storage, installation or use, normal layer lines or disclosed 3D-printing characteristics, products altered after delivery, products returned without approval, or claims submitted outside the reporting period except where law requires otherwise.</p>
                <p>These restrictions do not remove any rights available to customers under applicable Indian consumer-protection laws.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">5</span>
                Failed and Duplicate Payments
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>A failed transaction for which the customer&apos;s account was debited will be checked against the payment gateway&apos;s transaction records.</p>
                <p>Customers should avoid making repeated payments until the previous payment status is confirmed. A verified duplicate payment will be refunded to the original payment method.</p>
                <p>A payment debit alone does not confirm an order. An order is confirmed only after Flux 3D receives successful payment confirmation and issues an order confirmation.</p>
                <p>Failed-payment reversals may be processed automatically by the payment provider or issuing bank.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#6d28d9]/10 bg-[#faf9f7] p-8">
              <h2 className="mb-6 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">6</span>
                Refund Request Process and Timeline
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>Refund or cancellation requests should be sent through the support email, support phone, or the contact page on this site.</p>
                <p><strong className="text-[#070b1d]">Support email:</strong> <a className="text-[#6d28d9] hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
                <p><strong className="text-[#070b1d]">Support phone:</strong> <a className="text-[#6d28d9] hover:underline" href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`}>{supportPhone}</a></p>
                <p><strong className="text-[#070b1d]">Contact page:</strong> <Link href="/contact" className="text-[#6d28d9] hover:underline">https://flux3d.in/contact</Link></p>
                <p>The request must include the order number, payment transaction reference, reason for the request, relevant photographs or videos, and customer contact details.</p>
                <p>Flux 3D will acknowledge the request within 2 business days and normally review it within 5 business days after receiving all required information.</p>
                <p>Approved refunds will be initiated to the original payment method within 5-7 business days after approval. The time taken for the amount to appear in the customer&apos;s account depends on Razorpay, the issuing bank and the selected payment method. Once initiated, payment providers and banks may require additional time to complete the credit.</p>
                <p>Cash refunds or refunds to an unrelated bank account will not be provided. Customers will be informed when the refund has been initiated.</p>
                <p>Depending on the bank and payment method, a processed refund can take approximately 5-21 days to reflect in the customer&apos;s account.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">7</span>
                Governing Law and Contact
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>These terms are governed by the laws of India. Disputes will be subject to the jurisdiction applicable to Flux 3D&apos;s business location, subject to applicable consumer rights.</p>
                <p>If you have any questions, contact <a className="text-[#6d28d9] hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
              </div>
            </section>
          </div>
        </motion.main>
      </div>
    </div>
  )
}
