'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, FileText, Scale, Shield, AlertTriangle } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

const sections = [
  { id: 'acceptance', title: '1. Acceptance of Terms', icon: FileText },
  { id: 'description', title: '2. Description of Service', icon: FileText },
  { id: 'accounts', title: '3. User Accounts & Registration', icon: Shield },
  { id: 'ip', title: '4. Intellectual Property Rights', icon: Scale },
  { id: 'acceptable', title: '5. Acceptable Use Policy', icon: AlertTriangle },
  { id: 'community', title: '6. User-Generated Content & Community', icon: FileText },
  { id: 'subscription', title: '7. Subscription Plans, Payments & Refunds', icon: FileText },
  { id: 'privacy', title: '8. Privacy & Data Protection', icon: Shield },
  { id: 'thirdparty', title: '9. Third-Party Services & Integrations', icon: FileText },
  { id: 'disclaimers', title: '10. Disclaimers & Warranties', icon: AlertTriangle },
  { id: 'liability', title: '11. Limitation of Liability', icon: AlertTriangle },
  { id: 'indemnification', title: '12. Indemnification', icon: Scale },
  { id: 'termination', title: '13. Termination', icon: AlertTriangle },
  { id: 'changes', title: '14. Changes to the Application & Terms', icon: FileText },
  { id: 'governing', title: '15. Governing Law & Dispute Resolution', icon: Scale },
  { id: 'general', title: '16. General Provisions', icon: FileText },
  { id: 'contact', title: '17. Contact Information', icon: FileText },
]

export default function TermsOfServiceClient() {
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
          {/* Sidebar - Table of Contents */}
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
                <FileText className="w-4 h-4" />
                Legal Document
              </div>
              <h1 className="font-[var(--font-syne)] text-4xl md:text-5xl font-extrabold text-[#0F1B3D] mb-4">
                Terms of <span className="text-[#7C5CFF]">Service</span>
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-[#6F7192]">
                <span>Effective Date: January 1, 2025</span>
                <span>·</span>
                <span>Last Updated: May 3, 2025</span>
                <span>·</span>
                <span>Version 1.0</span>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-[#7C5CFF]/10 border border-[#7C5CFF]/20 rounded-2xl p-6 mb-12">
              <div className="flex gap-3">
                <AlertTriangle className="w-6 h-6 text-[#7C5CFF] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-[#0F1B3D] mb-2">Important Notice</h3>
                  <p className="text-sm text-[#6F7192] leading-relaxed">
                    Please read these Terms of Service carefully before using the Flux 3D application.
                    By accessing or using our service, you agree to be bound by these terms.
                    If you do not agree to any part of these terms, you must not use our application.
                  </p>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-12">
              {/* 1. Acceptance of Terms */}
              <section id="acceptance">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">1</span>
                  1. Acceptance of Terms
                </h2>
                <div className="space-y-4 text-[#6F7192] leading-relaxed">
                  <p>
                    By downloading, installing, accessing, or using the Flux 3D application (the "Application"),
                    you ("User" or "you") agree to be legally bound by these Terms of Service ("Terms"),
                    our Privacy Policy, and any other policies or guidelines incorporated herein.
                  </p>
                  <p>
                    These Terms constitute a binding legal agreement between you and Flux 3D ("we," "us," or "our").
                  </p>
                  <p>
                    If you are using the Application on behalf of an organization, you represent that you have authority
                    to bind that organization to these Terms, and all references to "you" also apply to that organization.
                  </p>
                  <p>
                    We reserve the right to modify these Terms at any time. We will provide notice of significant changes
                    via email or in-app notifications. Your continued use of the Application following any update
                    constitutes your acceptance of the revised Terms.
                  </p>
                </div>
              </section>

              {/* 2. Description of Service */}
              <section id="description">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">2</span>
                  2. Description of Service
                </h2>
                <div className="space-y-4 text-[#6F7192] leading-relaxed">
                  <p>
                    Flux 3D is a professional-grade 3D modeling, rendering, and animation application available on
                    web, desktop (Windows and macOS), and mobile (iOS and Android) platforms.
                  </p>
                  <p>The Application provides users with tools to:</p>
                  <ul className="space-y-2 ml-6">
                    {[
                      'Create, edit, and manipulate 3D models and scenes',
                      'Apply textures, materials, lighting, and visual effects',
                      'Render and export 3D projects in various formats',
                      'Collaborate with other users in real-time (where available)',
                      'Access a built-in asset library of models, materials, and components',
                      'Integrate with third-party plugins and external services',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#7C5CFF] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p>
                    We strive to maintain high service availability but do not guarantee uninterrupted access.
                    Scheduled maintenance, updates, and circumstances beyond our control may cause temporary disruptions.
                    We will endeavor to notify users of planned downtime in advance.
                  </p>
                </div>
              </section>

              {/* 3. User Accounts */}
              <section id="accounts">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">3</span>
                  3. User Accounts & Registration
                </h2>
                <div className="space-y-6 text-[#6F7192] leading-relaxed">
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F1B3D] mb-3">3.1 Account Creation</h3>
                    <p className="mb-3">To access certain features of the Application, you must create an account. When creating an account, you agree to:</p>
                    <ul className="space-y-2 ml-6">
                      {[
                        'Provide accurate, current, and complete registration information',
                        'Maintain and promptly update your account information',
                        'Keep your login credentials confidential and secure',
                        'Notify us immediately of any unauthorized access to your account',
                        'Accept responsibility for all activities conducted under your account',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="text-[#7C5CFF] mt-1.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F1B3D] mb-3">3.2 Eligibility</h3>
                    <p>
                      You must be at least 13 years of age to use the Application. If you are between 13 and 18 years of age,
                      you must have consent from a parent or legal guardian. By using the Application, you represent that
                      you meet these eligibility requirements.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F1B3D] mb-3">3.3 Account Restrictions</h3>
                    <ul className="space-y-2 ml-6">
                      {[
                        'You may only maintain one account per individual or organization',
                        'You may not create accounts using automated means or bots',
                        'You may not transfer or sell your account to another party',
                        'Accounts are non-transferable and non-assignable without our prior written consent',
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

              {/* 4. Intellectual Property */}
              <section id="ip">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">4</span>
                  4. Intellectual Property Rights
                </h2>
                <div className="space-y-6 text-[#6F7192] leading-relaxed">
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F1B3D] mb-3">4.1 License Grant to Users</h3>
                    <p>
                      Subject to your compliance with these Terms, Flux 3D grants you a limited, non-exclusive,
                      non-transferable, revocable license to download, install, and use the Application for your
                      personal or internal business purposes. This license does not include the right to sublicense
                      the Application or use it for commercial redistribution.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F1B3D] mb-3">4.2 User-Created Content</h3>
                    <p>
                      You retain full ownership of all 3D models, scenes, animations, renders, and other original
                      content you create using the Application ("User Content"). We do not claim any ownership rights
                      over your User Content.
                    </p>
                    <p className="mt-3">
                      By using cloud storage or sharing features, you grant us a limited, worldwide, royalty-free
                      license to host, store, and display your User Content solely for the purpose of providing
                      the service to you.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F1B3D] mb-3">4.3 Our Intellectual Property</h3>
                    <p>
                      The Application, including its source code, user interface, design, graphics, built-in asset
                      library, documentation, and all associated intellectual property, is owned by Flux 3D and
                      protected by copyright, trademark, and other applicable laws. You may not:
                    </p>
                    <ul className="space-y-2 ml-6 mt-3">
                      {[
                        'Copy, modify, or create derivative works of the Application',
                        'Reverse engineer, decompile, or disassemble the Application',
                        'Remove, alter, or obscure any proprietary notices or labels',
                        'Use our trademarks, logos, or branding without prior written consent',
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

              {/* 5. Acceptable Use */}
              <section id="acceptable">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">5</span>
                  5. Acceptable Use Policy
                </h2>
                <div className="space-y-6 text-[#6F7192] leading-relaxed">
                  <p>
                    You agree to use the Application only for lawful purposes and in a manner that does not infringe
                    the rights of others or restrict their use and enjoyment of the Application.
                  </p>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F1B3D] mb-3">5.1 Permitted Uses</h3>
                    <ul className="space-y-2 ml-6">
                      {[
                        'Creating and exporting 3D content for personal, educational, or commercial projects',
                        'Sharing rendered images and models on external platforms',
                        'Collaborating with team members within an authorized workspace',
                        'Using the Application for research, prototyping, and development purposes',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="text-[#7C5CFF] mt-1.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F1B3D] mb-3">5.2 Prohibited Uses</h3>
                    <p className="mb-3">You expressly agree not to:</p>
                    <ul className="space-y-2 ml-6">
                      {[
                        'Create, distribute, or promote content that is illegal, harmful, threatening, abusive, defamatory, obscene, or otherwise objectionable',
                        'Use the Application to develop or distribute malware, spyware, viruses, or any other malicious software',
                        'Attempt to gain unauthorized access to any part of the Application, its servers, or connected networks',
                        'Use automated scripts, bots, or other tools to overload, disrupt, or exploit the Application',
                        'Circumvent, disable, or interfere with security features, licensing systems, or DRM protections',
                        'Share, sell, or transfer your account credentials to any third party',
                        'Use the Application to process or create content that violates any applicable laws or regulations',
                        'Engage in any activity that may damage the reputation or business interests of Flux 3D',
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

              {/* 6. Community */}
              <section id="community">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">6</span>
                  6. User-Generated Content & Community
                </h2>
                <div className="space-y-4 text-[#6F7192] leading-relaxed">
                  <p>
                    If the Application includes community features, asset sharing, or collaborative workspaces,
                    the following terms apply to any content you upload, share, or publish within the platform ("Community Content"):
                  </p>
                  <ul className="space-y-2 ml-6">
                    {[
                      'You are solely responsible for all Community Content you share',
                      'You represent that you own or have appropriate rights to all shared content',
                      'We reserve the right to remove any content that violates these Terms or our Community Guidelines',
                      'Flux 3D does not endorse or take responsibility for Community Content posted by other users',
                      'We may, but are not obligated to, monitor or review Community Content for policy compliance',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#7C5CFF] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* 7. Subscription */}
              <section id="subscription">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">7</span>
                  7. Subscription Plans, Payments & Refunds
                </h2>
                <div className="space-y-6 text-[#6F7192] leading-relaxed">
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F1B3D] mb-3">7.1 Plans & Pricing</h3>
                    <p>
                      Flux 3D offers both free and paid subscription plans. Paid plans provide access to premium
                      features including advanced rendering, extended cloud storage, collaboration tools, and priority
                      support. Current pricing is available at our website and may be updated with 30 days' advance notice.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F1B3D] mb-3">7.2 Billing & Auto-Renewal</h3>
                    <ul className="space-y-2 ml-6">
                      {[
                        'Paid subscriptions are billed in advance on a monthly or annual basis',
                        'Subscriptions automatically renew unless cancelled at least 24 hours before the renewal date',
                        'You authorize us to charge your payment method for all applicable fees',
                        'Taxes and applicable duties are the responsibility of the subscriber',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="text-[#7C5CFF] mt-1.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F1B3D] mb-3">7.3 Refund Policy</h3>
                    <p>
                      We offer a 14-day money-back guarantee for new paid subscribers. Refund requests submitted
                      within 14 days of initial payment will be processed in full. Requests submitted after this
                      period will generally not be approved except in exceptional circumstances at our sole discretion.
                      To request a refund, contact our support team at support@flux3d.com.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0F1B3D] mb-3">7.4 Cancellation</h3>
                    <p>
                      You may cancel your subscription at any time through your account settings. Upon cancellation,
                      your paid access will remain active until the end of the current billing period. Your projects
                      and data will be retained for 30 days after cancellation, after which they may be permanently deleted.
                    </p>
                  </div>
                </div>
              </section>

              {/* 8. Privacy */}
              <section id="privacy">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">8</span>
                  8. Privacy & Data Protection
                </h2>
                <div className="space-y-4 text-[#6F7192] leading-relaxed">
                  <p>
                    Your use of the Application is also governed by our Privacy Policy, which is incorporated into
                    these Terms by reference. Our Privacy Policy describes how we collect, use, store, and protect
                    your personal information and project data.
                  </p>
                  <ul className="space-y-2 ml-6">
                    {[
                      'Account information (name, email, billing details) is collected during registration',
                      'Usage analytics and crash reports may be collected to improve the Application',
                      '3D project files may be stored on our servers when cloud features are enabled',
                      'We do not sell your personal data to third parties for advertising purposes',
                      'Data is processed in accordance with applicable privacy laws, including GDPR and applicable Indian data protection regulations',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#7C5CFF] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* 9. Third-Party */}
              <section id="thirdparty">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">9</span>
                  9. Third-Party Services & Integrations
                </h2>
                <div className="space-y-4 text-[#6F7192] leading-relaxed">
                  <p>
                    The Application may integrate with or link to third-party services, plugins, renderers, or platforms.
                    These integrations are provided for your convenience and are subject to the following:
                  </p>
                  <ul className="space-y-2 ml-6">
                    {[
                      'Third-party services are governed by their own terms of service and privacy policies',
                      'Flux 3D is not responsible for the content, security, or availability of third-party services',
                      'You assume all risks associated with installing or using third-party plugins',
                      'We reserve the right to disable or remove any third-party integration that poses a security risk or violates our policies',
                      'Any purchases or transactions through third-party services are solely between you and that provider',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#7C5CFF] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* 10. Disclaimers */}
              <section id="disclaimers">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">10</span>
                  10. Disclaimers & Warranties
                </h2>
                <div className="bg-[#FFFFFF] border border-[#7C5CFF]/10 rounded-2xl p-6 text-[#6F7192] leading-relaxed">
                  <p className="font-semibold text-[#0F1B3D] mb-3">THE APPLICATION IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:</p>
                  <ul className="space-y-2 ml-6 mb-4">
                    {[
                      'Warranties of merchantability, fitness for a particular purpose, or non-infringement',
                      'Guarantees that the Application will be error-free, uninterrupted, or free from harmful components',
                      'Assurances regarding the accuracy, reliability, or completeness of any information provided',
                      'Warranties that defects or errors will be corrected within a specific timeframe',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#7C5CFF] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p>
                    We strongly recommend maintaining regular local backups of your 3D projects. Flux 3D is not
                    liable for the loss of unsaved work due to application crashes, network failures, or any other
                    technical issues.
                  </p>
                </div>
              </section>

              {/* 11. Limitation of Liability */}
              <section id="liability">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">11</span>
                  11. Limitation of Liability
                </h2>
                <div className="bg-[#FFFFFF] border border-[#7C5CFF]/10 rounded-2xl p-6 text-[#6F7192] leading-relaxed">
                  <p className="font-semibold text-[#0F1B3D] mb-3">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, FLUX 3D SHALL NOT BE LIABLE FOR:</p>
                  <ul className="space-y-2 ml-6 mb-4">
                    {[
                      'Loss of data, projects, or files',
                      'Loss of revenue, profits, or business opportunities',
                      'Business interruption or downtime',
                      'Cost of substitute products or services',
                      'Damage to hardware or other software resulting from use of the Application',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#7C5CFF] mt-1.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p>
                    Our total aggregate liability shall not exceed the greater of (a) the amount you paid to us
                    in the 12 months preceding the claim, or (b) INR 5,000.
                  </p>
                </div>
              </section>

              {/* 12. Indemnification */}
              <section id="indemnification">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">12</span>
                  12. Indemnification
                </h2>
                <p className="text-[#6F7192] leading-relaxed">
                  You agree to indemnify, defend, and hold harmless Flux 3D and its affiliates from claims arising
                  out of your use of the Application, violation of these Terms, or any content you create or share.
                </p>
              </section>

              {/* 13. Termination */}
              <section id="termination">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">13</span>
                  13. Termination
                </h2>
                <div className="space-y-4 text-[#6F7192] leading-relaxed">
                  <p>
                    We reserve the right to suspend or terminate your account for violations, harmful conduct,
                    non-payment, or extended inactivity (12+ months for free accounts).
                  </p>
                  <p>
                    Upon termination, your data is retained for 30 days, after which it may be permanently deleted.
                  </p>
                </div>
              </section>

              {/* 14. Changes */}
              <section id="changes">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">14</span>
                  14. Changes to Application & Terms
                </h2>
                <p className="text-[#6F7192] leading-relaxed">
                  We may add, modify, or remove features at any time. Material changes to Terms will be communicated
                  14 days in advance. Continued use after changes constitutes acceptance.
                </p>
              </section>

              {/* 15. Governing Law */}
              <section id="governing">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">15</span>
                  15. Governing Law & Dispute Resolution
                </h2>
                <div className="space-y-4 text-[#6F7192] leading-relaxed">
                  <p>
                    These Terms are governed by the laws of India. Disputes will be resolved through arbitration
                    in Mumbai, Maharashtra in accordance with the Arbitration and Conciliation Act, 1996.
                  </p>
                </div>
              </section>

              {/* 16. General */}
              <section id="general">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">16</span>
                  16. General Provisions
                </h2>
                <ul className="space-y-2 text-[#6F7192] leading-relaxed ml-6">
                  {[
                    'Entire Agreement: These Terms constitute the entire agreement between you and Flux 3D',
                    'Severability: If any provision is unenforceable, the remaining provisions continue in effect',
                    'Waiver: Failure to enforce any right does not constitute a waiver of that right',
                    'Force Majeure: We are not liable for failures due to circumstances beyond our reasonable control',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-[#7C5CFF] mt-1.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 17. Contact */}
              <section id="contact" className="bg-[#FFFFFF] border border-[#7C5CFF]/10 rounded-2xl p-8">
                <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D] mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7C5CFF]/10 text-[#7C5CFF] text-sm font-bold">17</span>
                  17. Contact Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'General Support', email: settings.supportEmail || 'support@flux3d.com' },
                    { label: 'Legal & Compliance', email: settings.primaryEmail || 'legal@flux3d.com' },
                    { label: 'Privacy Inquiries', email: settings.primaryEmail || 'privacy@flux3d.com' },
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

            {/* Footer CTA */}
            <div className="mt-12 pt-8 border-t border-[#7C5CFF]/10">
              <p className="text-sm text-[#6F7192] text-center">
                By continuing to use our application, you acknowledge that you have read, understood,
                and agree to be bound by these Terms of Service.
              </p>
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  )
}
