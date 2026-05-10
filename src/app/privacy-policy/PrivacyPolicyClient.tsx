'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Shield, Database, Lock, Eye, Globe } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

const sections = [
  { id: 'information', title: '1. Information We Collect', icon: Database },
  { id: 'usage', title: '2. How We Use Your Information', icon: Eye },
  { id: 'sharing', title: '3. Information Sharing', icon: Globe },
  { id: 'cookies', title: '4. Cookies & Tracking', icon: Database },
  { id: 'security', title: '5. Data Security', icon: Lock },
  { id: 'rights', title: '6. Your Rights', icon: Shield },
  { id: 'data-deletion', title: '7. Data Deletion Request', icon: Shield },
  { id: 'retention', title: '8. Data Retention', icon: Database },
  { id: 'children', title: '9. Children\'s Privacy', icon: Shield },
  { id: 'changes', title: '10. Changes to Policy', icon: Eye },
  { id: 'contact', title: '11. Contact Us', icon: Globe },
]

export default function PrivacyPolicyClient() {
  const { settings } = useBusinessSettings()
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F1B3D]">
      {/* Header */}
      <div className="border-b border-[#7C5CFF]/10 bg-[#FFFFFF]/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-[var(--font-syne)] text-2xl font-extrabold text-[#0F1B3D]">
              flux<span className="text-[#7C5CFF]">3d</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-[#6F7192] hover:text-[#0F1B3D] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12">
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block"
          >
            <div className="sticky top-24">
              <h3 className="text-sm font-semibold text-[#0F1B3D] uppercase tracking-wider mb-4">Contents</h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#6F7192] hover:text-[#0F1B3D] hover:bg-white/[0.03] rounded-lg transition-colors"
                  >
                    <section.icon className="w-3.5 h-3.5" />
                    <span className="line-clamp-1">{section.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </motion.aside>

          {/* Main Content */}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[800px]"
          >
            {/* Title Section */}
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 bg-[#7C5CFF]/10 text-[#7C5CFF] px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Shield className="w-4 h-4" />
                Privacy Document
              </div>
              <h1 className="font-[var(--font-syne)] text-4xl md:text-5xl font-extrabold text-[#0F1B3D] mb-4">
                Privacy <span className="text-[#7C5CFF]">Policy</span>
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-[#6F7192]">
                <span>Effective Date: January 1, 2025</span>
                <span>·</span>
                <span>Last Updated: May 3, 2025</span>
              </div>
            </div>

            {/* Intro */}
            <div className="bg-[#FFFFFF] border border-[#7C5CFF]/10 rounded-2xl p-6 mb-12">
              <p className="text-[#6F7192] leading-relaxed">
                At FLUX 3D, we value your privacy and are committed to protecting your personal information.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                when you use our application and services. Please read this policy carefully.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-12">
              <section id="information">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">1</span>
                  Information We Collect
                </h2>
                <div className="space-y-4 text-[#6F7192] leading-relaxed">
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F1B3D] mb-3">Personal Information</h3>
                    <ul className="space-y-2 ml-6">
                      {[
                        'Name and email address during account registration',
                        'Billing information for subscription plans',
                        'Profile information and preferences',
                        'Communication history with our support team',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="text-[#7C5CFF] mt-1.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F1B3D] mb-3">Usage Information</h3>
                    <ul className="space-y-2 ml-6">
                      {[
                        '3D models, projects, and files you create or upload',
                        'Application usage patterns and feature interactions',
                        'Device information (OS, browser type, IP address)',
                        'Crash reports and performance metrics',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="text-[#7C5CFF] mt-1.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              <section id="usage">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">2</span>
                  How We Use Your Information
                </h2>
                <div className="text-[#6F7192] leading-relaxed">
                  <p className="mb-4">We use the collected information for the following purposes:</p>
                  <ul className="space-y-2 ml-6">
                    {[
                      'Provide, maintain, and improve our Application and services',
                      'Process transactions and send related information',
                      'Send technical notices, updates, and support messages',
                      'Respond to your comments, questions, and requests',
                      'Monitor and analyze usage patterns and trends',
                      'Detect, prevent, and address technical issues or fraud',
                      'Comply with legal obligations and enforce our Terms',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#7C5CFF] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section id="sharing">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">3</span>
                  Information Sharing
                </h2>
                <div className="text-[#6F7192] leading-relaxed">
                  <p className="mb-4">We do not sell your personal information. We may share information in these circumstances:</p>
                  <ul className="space-y-2 ml-6">
                    {[
                      'With service providers who assist in our operations (payment processing, hosting)',
                      'To comply with legal obligations or respond to valid legal requests',
                      'To protect our rights, privacy, safety, or property',
                      'In connection with a merger, acquisition, or sale of assets',
                      'With your consent or at your direction',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#7C5CFF] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section id="cookies">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">4</span>
                  Cookies & Tracking
                </h2>
                <div className="text-[#6F7192] leading-relaxed">
                  <p className="mb-4">We use cookies and similar tracking technologies to:</p>
                  <ul className="space-y-2 ml-6">
                    {[
                      'Remember your preferences and settings',
                      'Understand how you interact with our Application',
                      'Improve user experience and Application performance',
                      'Provide personalized content and recommendations',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#7C5CFF] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4">
                    You can control cookies through your browser settings. However, disabling certain cookies
                    may limit your ability to use some features of our Application.
                  </p>
                </div>
              </section>

              <section id="security">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">5</span>
                  Data Security
                </h2>
                <div className="text-[#6F7192] leading-relaxed">
                  <p className="mb-4">
                    We implement appropriate technical and organizational measures to protect your information:
                  </p>
                  <ul className="space-y-2 ml-6">
                    {[
                      'Encryption of data in transit and at rest',
                      'Regular security assessments and updates',
                      'Access controls and authentication mechanisms',
                      'Employee training on data protection practices',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#7C5CFF] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4">
                    While we strive to protect your information, no method of transmission over the internet
                    is 100% secure. We cannot guarantee absolute security.
                  </p>
                </div>
              </section>

              <section id="rights">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">6</span>
                  Your Rights
                </h2>
                <div className="text-[#6F7192] leading-relaxed">
                  <p className="mb-4">Depending on your location, you may have the following rights:</p>
                  <ul className="space-y-2 ml-6">
                    {[
                      'Access and receive a copy of your personal information',
                      'Rectify inaccurate or incomplete information',
                      'Request deletion of your personal information',
                      'Object to or restrict processing of your information',
                      'Data portability (receive your data in a structured format)',
                      'Withdraw consent where processing is based on consent',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#7C5CFF] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4">
                    To exercise these rights, contact us at {settings.primaryEmail || 'privacy@flux3d.com'}. We will respond within
                    30 days of receiving your request.
                  </p>
                </div>
              </section>

              <section id="data-deletion">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">7</span>
                  Data Deletion Request
                </h2>
                <div className="text-[#6F7192] leading-relaxed">
                  <p className="mb-4">
                    You have the right to request deletion of your account and all associated personal data. We provide multiple ways to request data deletion:
                  </p>
                  <div className="space-y-4 ml-6">
                    <div>
                      <h3 className="text-[#0F1B3D] font-semibold mb-2">Option 1: Self-Service (Recommended)</h3>
                      <p>Visit your <a href="/profile" className="text-[#7C5CFF] hover:underline">Profile Page</a> and click "Delete Account" to permanently remove your account and all data.</p>
                    </div>
                    <div>
                      <h3 className="text-[#0F1B3D] font-semibold mb-2">Option 2: Email Request</h3>
                      <p>Send an email to <a href={`mailto:${settings.primaryEmail || 'privacy@flux3d.com'}`} className="text-[#7C5CFF] hover:underline">{settings.primaryEmail || 'privacy@flux3d.com'}</a> with subject "Data Deletion Request" including:</p>
                      <ul className="space-y-1 ml-6 mt-2">
                        {[
                          'Your registered email address',
                          'Full name associated with the account',
                          'Reason for deletion (optional)',
                        ].map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className="text-[#7C5CFF] mt-1.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-[#0F1B3D] font-semibold mb-2">Processing Time</h3>
                      <p>We will process your deletion request within 30 days. You will receive a confirmation email once your data has been permanently deleted from our systems.</p>
                    </div>
                    <div className="bg-[#7C5CFF]/5 border border-[#7C5CFF]/20 rounded-xl p-4">
                      <p className="text-sm">
                        <strong className="text-[#0F1B3D]">Note:</strong> Data deletion is permanent and cannot be undone. After deletion, you will lose access to all saved quotes, order history, and uploaded files.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section id="retention">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">8</span>
                  Data Retention
                </h2>
                <p className="text-[#6F7192] leading-relaxed">
                  We retain your information for as long as necessary to provide our services and fulfill
                  the purposes outlined in this policy. When you delete your account, we will delete
                  your personal information within 30 days, except where we need to retain it for legal
                  obligations or dispute resolution.
                </p>
              </section>

              <section id="children">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">9</span>
                  Children's Privacy
                </h2>
                <p className="text-[#6F7192] leading-relaxed">
                  Our Application is not intended for children under 13. We do not knowingly collect
                  personal information from children under 13. If you are a parent or guardian and believe
                  your child has provided us with personal information, please contact us immediately.
                </p>
              </section>

              <section id="changes">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">10</span>
                  Changes to This Policy
                </h2>
                <p className="text-[#6F7192] leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any material
                  changes via email or in-app notification. Your continued use of the Application after
                  the changes become effective constitutes your acceptance of the revised policy.
                </p>
              </section>

              <section id="contact" className="bg-[#FFFFFF] border border-[#7C5CFF]/10 rounded-2xl p-8">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">11</span>
                  Contact Us
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Privacy Inquiries', email: settings.primaryEmail || 'privacy@flux3d.com' },
                    { label: 'General Support', email: settings.supportEmail || 'support@flux3d.com' },
                    { label: 'Website', value: settings.websiteUrl || 'www.flux3d.com' },
                    { label: 'Address', value: [settings.city, settings.state].filter(Boolean).join(', ') || 'Mumbai, Maharashtra, India' },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/[0.03] rounded-xl p-4">
                      <p className="text-sm text-[#6F7192] mb-1">{item.label}</p>
                      <p className="text-sm text-[#0F1B3D]">{item.email || item.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  )
}
