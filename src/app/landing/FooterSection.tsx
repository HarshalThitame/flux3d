'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Clock, Camera, Users, Globe, Send } from 'lucide-react'

export default function FooterSection() {
  return (
    <footer className="relative border-t border-[rgba(255,255,255,0.07)] bg-[#050810]">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="font-[var(--font-syne)] text-2xl font-extrabold text-white mb-4">
              flux<span className="text-[#FF5C1A]">3d</span>
            </div>
            <p className="text-sm text-[#7a82a0] leading-[1.7] max-w-[320px] mb-6">
              Precision 3D printing for every need — industrial, architectural, medical, student, creator, and corporate. Made in India. Delivered across India.
            </p>

            {/* Social */}
            <div className="flex items-center gap-3">
              {[
                { icon: Camera, href: '#', label: 'Instagram' },
                { icon: Users, href: '#', label: 'YouTube' },
                { icon: Globe, href: '#', label: 'LinkedIn' },
                { icon: Send, href: '#', label: 'Twitter' }
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] flex items-center justify-center text-[#7a82a0] hover:text-[#FF5C1A] hover:border-[rgba(255,92,26,0.3)] transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Services</h4>
            <ul className="space-y-2">
              {['Industrial Parts', 'Architecture Models', 'Student Projects', 'Online Products', 'Medical & Dental', 'Creator Props', 'Corporate Gifting'].map((item) => (
                <li key={item}>
                  <Link href="/services" className="text-sm text-[#7a82a0] hover:text-[#FF5C1A] transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2">
              {['About Flux 3D', 'Our Technology', 'Gallery', 'Pricing', 'Blog', 'Careers'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-[#7a82a0] hover:text-[#FF5C1A] transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-[#7a82a0]">
                <MapPin className="w-4 h-4 mt-0.5 text-[#FF5C1A]" />
                Mumbai, Maharashtra — 400053
              </li>
              <li className="flex items-center gap-2 text-sm text-[#7a82a0]">
                <Phone className="w-4 h-4 text-[#FF5C1A]" />
                +91 96230 23480
              </li>
              <li className="flex items-center gap-2 text-sm text-[#7a82a0]">
                <Mail className="w-4 h-4 text-[#FF5C1A]" />
                hello@flux3d.in
              </li>
              <li className="flex items-center gap-2 text-sm text-[#7a82a0]">
                <Clock className="w-4 h-4 text-[#FF5C1A]" />
                Mon–Sat: 9 AM – 8 PM IST
              </li>
            </ul>
          </div>
        </div>

        {/* Payment & Delivery */}
        <div className="border-t border-[rgba(255,255,255,0.07)] pt-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Payment */}
            <div>
              <p className="text-xs text-[#7a82a0] mb-2">Payment Methods</p>
              <div className="flex flex-wrap gap-2">
                {['UPI', 'Razorpay', 'Google Pay', 'PhonePe', 'Visa', 'Mastercard'].map((method) => (
                  <span key={method} className="text-xs bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] text-[#7a82a0] px-2 py-1 rounded">
                    {method}
                  </span>
                ))}
              </div>
            </div>

            {/* Delivery */}
            <div>
              <p className="text-xs text-[#7a82a0] mb-2">Delivery Partners</p>
              <div className="flex flex-wrap gap-2">
                {['Delhivery', 'Shiprocket', 'DTDC'].map((partner) => (
                  <span key={partner} className="text-xs bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] text-[#7a82a0] px-2 py-1 rounded">
                    {partner}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#7a82a0]">
          <p>© 2025 Flux 3D Private Limited · All Rights Reserved · GST: 27AXXXXXX1Z5</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Refund Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Shipping Policy</Link>
          </div>
        </div>

        {/* SEO footer text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-[10px] text-[#4a5070] leading-[1.6] text-center"
        >
          Flux 3D provides professional 3D printing services in Mumbai, Pune, Bangalore, Hyderabad, Chennai, Delhi and across India. Specializing in FDM and resin 3D printing for industrial, architectural, medical, student, and corporate clients. Printed on Bambu Lab P2S. Starting at ₹99.
        </motion.p>
      </div>
    </footer>
  )
}
