'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, Clock, CheckCircle } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

export default function RefundPolicyClient() {
  const { settings } = useBusinessSettings()
  const supportEmail = settings.supportEmail || settings.primaryEmail || 'flux3d.in@gmail.com'
  const supportPhone = settings.primaryPhone || '+919623023480'
  const effectiveDate = 'July 17, 2026'
  const updatedDate = 'September 6, 2026'

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
              Refund &amp; Cancellation Policy
            </div>
            <h1 className="mb-4 font-[var(--font-syne)] text-4xl font-extrabold text-[#070b1d] md:text-5xl">
              Refund &amp; <span className="text-[#6d28d9]">Cancellation</span>
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
                <h2 className="mb-2 text-2xl font-bold text-[#070b1d]">Our Commitment</h2>
                <p className="leading-relaxed text-[#6F7192]">
                  Flux3D sells custom 3D-printed products and ready-made 3D-printed goods. Because every item is manufactured on demand, refund and cancellation terms vary by order type and production stage. We are committed to resolving every genuine issue fairly and in compliance with the Consumer Protection Act, 2019 and all applicable Indian laws.
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
                <p>Custom 3D-printed products are manufactured specifically to your uploaded design, selected material, colour, size, finish, and quantity. Because these items cannot be resold, different terms apply.</p>
                <p><strong className="text-[#070b1d]">Cancellation before production starts:</strong> You may cancel your order at no cost before printing or material preparation begins. Once confirmed, the full amount will be refunded to your original payment method within 5–7 business days.</p>
                <p><strong className="text-[#070b1d]">Cancellation after production begins:</strong> Once any production step has commenced, the order cannot be cancelled and no refund will be issued for change of mind, incorrect measurements, a wrong file upload, or a decision that the item is no longer needed.</p>
                <p><strong className="text-[#070b1d]">Customer responsibility for design files:</strong> You are responsible for verifying model dimensions, wall thickness, geometry, file orientation, intended application, material and colour selection, quantity, and delivery address before placing the order. Flux3D is not liable for errors from incorrect files or specifications.</p>
                <p><strong className="text-[#070b1d]">Manufacturing tolerances:</strong> Minor variations in surface texture, support marks, layer lines, colour shade, and dimensions within disclosed manufacturing tolerances are not defects and do not qualify for a refund.</p>
                <p><strong className="text-[#070b1d]">Design consultation charges:</strong> Fees for 3D modelling, design consultation, or file repair are non-refundable once the work is completed, even if the main order is cancelled before production.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">2</span>
                Ready-Made Products (3D Shop)
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p><strong className="text-[#070b1d]">Cancellation before dispatch:</strong> You may cancel before dispatch and receive a full refund to your original payment method.</p>
                <p><strong className="text-[#070b1d]">Cancellation after dispatch:</strong> Once dispatched, the order cannot be cancelled. You may initiate a return after delivery, subject to the conditions below.</p>
                <p><strong className="text-[#070b1d]">Return window — 7 calendar days from delivery:</strong></p>
                <ul className="ml-4 list-disc space-y-1 pl-2">
                  <li>Wrong product delivered</li>
                  <li>Product arrived damaged in transit</li>
                  <li>Product has a manufacturing defect</li>
                  <li>Quantity received does not match the confirmed order</li>
                  <li>Change-of-mind return (conditions apply — see below)</li>
                </ul>
                <p><strong className="text-[#070b1d]">Change-of-mind returns:</strong> Accepted on ready-made (non-personalised) products if the item is unused, undamaged, and returned in its original condition with all packaging and accessories. Prior approval from our team is required before sending the item back. Original shipping charges are non-refundable, and return shipping is the customer&apos;s responsibility unless the reason is our error.</p>
                <p>Personalised or made-to-order products are not eligible for change-of-mind returns.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">3</span>
                Damaged, Defective or Incorrect Products
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>Report a damaged, defective, or incorrect product within <strong className="text-[#070b1d]">48 hours of delivery</strong>. Late claims may not be accepted except where required by law.</p>
                <p><strong className="text-[#070b1d]">Required documentation:</strong></p>
                <ul className="ml-4 list-disc space-y-1 pl-2">
                  <li>Order number and customer contact details</li>
                  <li>Clear photographs of the product showing the issue</li>
                  <li>Photographs of outer and inner packaging</li>
                  <li>An unpacking/unboxing video (strongly recommended)</li>
                  <li>Photograph of the shipping label</li>
                </ul>
                <p>Depending on the issue, we may offer a <strong className="text-[#070b1d]">replacement, reprint, repair, partial refund, or full refund</strong>.</p>
                <p>When the error is ours, we will arrange or cover return shipping at no cost to you.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">4</span>
                Exchange Policy
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>We accept exchanges on ready-made products for a different colour or variant of the same item, subject to stock availability and return conditions being met.</p>
                <p>Request an exchange within 7 days of delivery by contacting our support team. Exchanges are not available on custom-printed or personalised orders.</p>
                <p>If the desired variant is out of stock, a refund will be processed instead.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">5</span>
                Return Shipping Process
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p><strong className="text-[#070b1d]">Do not return any product without prior written approval from Flux3D.</strong> Unauthorised returns may not be accepted and refunds will not be issued for unapproved items.</p>
                <p><strong className="text-[#070b1d]">Flux3D&apos;s error (wrong item, defective, transit damage):</strong> We will arrange a reverse pickup or reimburse verified return shipping costs.</p>
                <p><strong className="text-[#070b1d]">Customer-initiated return (change of mind):</strong> You are responsible for secure packaging and return shipping costs. Original shipping charges are non-refundable. We recommend a tracked courier — Flux3D is not liable for items lost or damaged during customer-initiated return transit.</p>
                <p><strong className="text-[#070b1d]">RTO (Return to Origin):</strong> If delivery fails due to an incorrect address, recipient unavailability, or failure to collect from the courier, the order returns to our facility. Re-delivery may incur an additional charge. Refunds for RTO orders are issued after deducting original shipping and handling costs.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">6</span>
                Items Not Eligible for Refund or Return
              </h2>
              <div className="rounded-xl border border-[#6d28d9]/10 bg-white p-6 leading-relaxed text-[#6F7192]">
                <p className="mb-3">The following are generally not eligible:</p>
                <ul className="ml-4 list-disc space-y-1 pl-2">
                  <li>Correctly manufactured custom products where the customer changed their mind</li>
                  <li>Orders where the customer supplied incorrect dimensions, scale, or design files</li>
                  <li>Orders where the customer selected the wrong material, colour, or quantity</li>
                  <li>Products damaged after delivery due to improper handling, storage, installation, or use</li>
                  <li>Normal layer lines, surface texture, or other disclosed 3D-printing characteristics</li>
                  <li>Products altered, used, or washed after delivery</li>
                  <li>Products returned without prior written approval from Flux3D</li>
                  <li>Claims submitted outside the applicable window (48 hours for damage/defect; 7 days for returns), except where Indian law requires otherwise</li>
                  <li>Digital files, design services, or consultation fees once the work has been completed</li>
                </ul>
                <p className="mt-3">These exclusions do not limit any rights you have under the Consumer Protection Act, 2019 or other applicable Indian laws.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">7</span>
                Failed and Duplicate Payments
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>If your account was debited for a failed transaction, we will cross-verify with Razorpay&apos;s records. Do not make a second payment until the status of the first is confirmed — verified duplicate charges will be refunded.</p>
                <p>A payment debit alone does not confirm your order. An order is confirmed only after Flux3D receives successful payment confirmation from Razorpay and issues an order confirmation to you.</p>
                <p>Failed-payment reversals may be processed automatically by Razorpay or your issuing bank. If the amount is not returned within 7 business days, contact our support team with your transaction reference number.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">8</span>
                Partial Refunds
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>A partial refund may be offered when:</p>
                <ul className="ml-4 list-disc space-y-1 pl-2">
                  <li>Only part of a multi-item order is defective or incorrect</li>
                  <li>A product has minor damage that does not affect its core function</li>
                  <li>A custom order is partially completed when a valid cancellation is made</li>
                  <li>Shipping or handling charges are deducted from the refund amount</li>
                </ul>
                <p>The partial refund amount will be communicated to you in writing before processing.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#6d28d9]/10 bg-[#faf9f7] p-8">
              <h2 className="mb-6 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">9</span>
                Refund Request Process &amp; Timeline
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>Submit your refund or cancellation request through any of these channels:</p>
                <p><strong className="text-[#070b1d]">Email:</strong> <a className="text-[#6d28d9] hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
                <p><strong className="text-[#070b1d]">Phone / WhatsApp:</strong> <a className="text-[#6d28d9] hover:underline" href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`}>{supportPhone}</a></p>
                <p><strong className="text-[#070b1d]">Contact page:</strong> <Link href="/contact" className="text-[#6d28d9] hover:underline">https://flux3d.in/contact</Link></p>
                <p>Please include: order number, payment transaction reference, reason for request, relevant photos/videos, and your contact details.</p>
                <div className="mt-4 rounded-xl bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-[#6d28d9]" />
                    <strong className="text-[#070b1d]">Processing Timeline</strong>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li>📩 <strong className="text-[#070b1d]">Acknowledgement:</strong> Within 2 business days</li>
                    <li>🔍 <strong className="text-[#070b1d]">Review &amp; decision:</strong> Within 5 business days of receiving all required information</li>
                    <li>💰 <strong className="text-[#070b1d]">Refund initiation:</strong> Within 5–7 business days of approval</li>
                    <li>🏦 <strong className="text-[#070b1d]">Credit to your account:</strong> 5–21 business days depending on your bank and payment method</li>
                  </ul>
                </div>
                <p>Refunds are always returned to the original payment method. Cash refunds or refunds to a different account are not provided. You will be notified when the refund is initiated.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">10</span>
                Payment Methods &amp; COD
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>Flux3D accepts online payments via Razorpay, including UPI, debit cards, credit cards, and net banking.</p>
                <p><strong className="text-[#070b1d]">Cash on Delivery (COD) is not available.</strong> All orders must be paid online at checkout.</p>
                <p>If a payment was processed incorrectly due to a technical error on our platform, please contact us with the transaction reference and we will investigate and resolve it promptly.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">11</span>
                Your Statutory Consumer Rights
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>Nothing in this policy limits or excludes any right you have under the Consumer Protection Act, 2019, the Consumer Protection (E-Commerce) Rules, 2020, or any other applicable Indian law.</p>
                <p>If your complaint has not been resolved fairly, you may escalate to the <strong className="text-[#070b1d]">National Consumer Helpline at 1800-11-4000</strong> or file a complaint at <a href="https://consumerhelpline.gov.in" className="text-[#6d28d9] hover:underline" target="_blank" rel="noopener noreferrer">consumerhelpline.gov.in</a>.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-3 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/10 text-sm font-bold text-[#6d28d9]">12</span>
                Governing Law &amp; Jurisdiction
              </h2>
              <div className="space-y-4 leading-relaxed text-[#6F7192]">
                <p>This policy is governed by the laws of India. Any dispute that cannot be resolved through our internal process will be subject to the jurisdiction of the courts applicable to Flux3D&apos;s registered business location.</p>
                <p>For any questions, email <a className="text-[#6d28d9] hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a> or WhatsApp us at <a className="text-[#6d28d9] hover:underline" href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`}>{supportPhone}</a>.</p>
              </div>
            </section>

          </div>
        </motion.main>
      </div>
    </div>
  )
}
