'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

export default function RefundPolicyClient() {
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
              <RefreshCw className="w-4 h-4" />
              Refund Policy
            </div>
            <h1 className="font-[var(--font-syne)] text-4xl md:text-5xl font-extrabold text-white mb-4">
              Refund <span className="text-[#FF5C1A]">Policy</span>
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-[#7a82a0]">
              <span>Effective Date: January 1, 2025</span>
              <span>·</span>
              <span>Last Updated: May 3, 2025</span>
            </div>
          </div>

          {/* 14-Day Guarantee */}
          <div className="bg-gradient-to-r from-[#FF5C1A]/20 to-transparent border border-[#FF5C1A]/30 rounded-2xl p-8 mb-12">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-8 h-8 text-[#FF5C1A] flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">14-Day Money-Back Guarantee</h2>
                <p className="text-[#7a82a0] leading-relaxed">
                  We offer a full refund for new paid subscribers within 14 days of initial payment.
                  No questions asked. After 14 days, refunds are handled on a case-by-case basis.
                </p>
              </div>
            </div>
          </div>

          {/* Policy Sections */}
          <div className="space-y-10">
            {/* Subscription Refunds */}
            <section>
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5C1A]/10 text-[#FF5C1A] text-sm font-bold">1</span>
                Subscription Refunds
              </h2>
              <div className="text-[#7a82a0] leading-relaxed space-y-4">
                <div className="bg-[#0a0f1e] border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Eligibility Period</h3>
                  <ul className="space-y-2">
                    {[
                      'Refund requests within 14 days of initial payment: Full refund',
                      'Refund requests after 14 days: Evaluated case-by-case',
                      'Cancelled subscriptions retain access until billing period ends',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#FF5C1A] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p>
                  To request a refund, contact our support team at support@flux3d.com with your
                  account email and reason for the refund request.
                </p>
              </div>
            </section>

            {/* 3D Printing Services */}
            <section>
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5C1A]/10 text-[#FF5C1A] text-sm font-bold">2</span>
                3D Printing Service Refunds
              </h2>
              <div className="text-[#7a82a0] leading-relaxed space-y-4">
                <div className="bg-[#0a0f1e] border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Order Cancellation</h3>
                  <ul className="space-y-2">
                    {[
                      'Before printing starts: Full refund available',
                      'After printing starts: Partial refund (minus material costs)',
                      'After shipping: No refund unless item is defective',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#FF5C1A] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-[#0a0f1e] border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Defective or Incorrect Orders</h3>
                  <p className="mb-3">
                    If your order arrives defective or doesn't match your specifications:
                  </p>
                  <ul className="space-y-2">
                    {[
                      'Contact us within 48 hours of delivery',
                      'Provide photos of the received item',
                      'We will reprint and reship at no cost, or provide full refund',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#FF5C1A] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Non-Refundable Items */}
            <section>
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5C1A]/10 text-[#FF5C1A] text-sm font-bold">3</span>
                Non-Refundable Items
              </h2>
              <div className="bg-[#0a0f1e] border border-white/10 rounded-xl p-6 text-[#7a82a0] leading-relaxed">
                <p className="mb-3">The following are generally not eligible for refunds:</p>
                <ul className="space-y-2">
                  {[
                    'Custom designs or files provided by the customer',
                    'Orders cancelled after printing has started (material costs apply)',
                    'Completed orders that match the provided specifications',
                    'Shipping costs (unless the item is defective)',
                    'Subscription renewals beyond the 14-day window',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-[#FF5C1A] mt-1.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Processing Time */}
            <section>
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5C1A]/10 text-[#FF5C1A] text-sm font-bold">4</span>
                Refund Processing Time
              </h2>
              <div className="text-[#7a82a0] leading-relaxed">
                <div className="flex items-start gap-4 bg-[#0a0f1e] border border-white/10 rounded-xl p-6">
                  <Clock className="w-6 h-6 text-[#FF5C1A] flex-shrink-0 mt-1" />
                  <div>
                    <p className="mb-3">
                      Approved refunds are processed within 5-7 business days. The timing of the
                      refund appearing in your account depends on your payment method:
                    </p>
                    <ul className="space-y-2">
                      {[
                        'UPI/Razorpay: 1-3 business days',
                        'Credit/Debit Cards: 5-7 business days',
                        'Net Banking: 3-5 business days',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="text-[#FF5C1A] mt-1.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Exceptions */}
            <section>
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5C1A]/10 text-[#FF5C1A] text-sm font-bold">5</span>
                Exceptional Circumstances
              </h2>
              <div className="text-[#7a82a0] leading-relaxed">
                <p className="mb-4">
                  We understand that exceptional circumstances may arise. In the following cases,
                  we may approve refunds outside our standard policy:
                </p>
                <ul className="space-y-2 ml-6">
                  {[
                    'Technical issues preventing use of the Application for extended periods',
                    'Billing errors or duplicate charges',
                    'Fraudulent or unauthorized transactions',
                    'Force majeure events affecting service delivery',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-[#FF5C1A] mt-1.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Contact */}
            <section className="bg-[#0a0f1e] border border-white/10 rounded-2xl p-8">
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5C1A]/10 text-[#FF5C1A] text-sm font-bold">6</span>
                Request a Refund
              </h2>
              <p className="text-[#7a82a0] mb-6">
                To request a refund, please contact our support team with the following information:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {[
                  { label: 'Support Email', value: 'support@flux3d.com' },
                  { label: 'Phone', value: '+91 96230 23480' },
                  { label: 'Hours', value: 'Mon-Sat: 9 AM – 8 PM IST' },
                  { label: 'Response Time', value: 'Within 24 hours' },
                ].map((item) => (
                  <div key={item.label} className="bg-white/[0.03] rounded-xl p-4">
                    <p className="text-sm text-[#7a82a0] mb-1">{item.label}</p>
                    <p className="text-sm text-white">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#FF5C1A]/10 border border-[#FF5C1A]/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#FF5C1A] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#7a82a0]">
                  Please include your order ID or account email, reason for refund, and any
                  relevant screenshots or documentation.
                </p>
              </div>
            </section>
          </div>
        </motion.main>
      </div>
    </div>
  )
}
