'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import NavbarClient from '@/components/NavbarClient'
import { Mail, Phone, MapPin, Send, ArrowRight } from 'lucide-react'
import { useBusinessSettings } from '@/lib/settings-context'

export default function ContactContent() {
  const { settings } = useBusinessSettings()

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email Us',
      description: 'For quotes, support, and general inquiries',
      value: settings.primaryEmail || 'hello@flux3d.in',
      href: `mailto:${settings.primaryEmail || 'hello@flux3d.in'}`,
      color: 'from-[#7C5CFF] to-[#A78BFA]',
    },
    {
      icon: Phone,
      title: 'Call / WhatsApp',
      description: settings.businessHours || 'Mon-Sat, 9 AM – 8 PM IST',
      value: settings.primaryPhone || '+91 96230 23480',
      href: `tel:${(settings.primaryPhone || '+919623023480').replace(/[^0-9]/g, '')}`,
      color: 'from-[#A78BFA] to-[#A78BFA]',
    },
    {
      icon: MapPin,
      title: 'Visit / Ship To',
      description: 'Our studio location',
      value: [settings.city, settings.state, settings.country].filter(Boolean).join(', ') || 'Pune, Maharashtra, India',
      href: '#',
      color: 'from-[#7C5CFF] to-[#7C5CFF]',
    },
  ]

  const heroRef = useRef(null)
  const cardsRef = useRef(null)
  const careersRef = useRef(null)
  const ctaRef = useRef(null)

  const heroInView = useInView(heroRef, { once: true })
  const cardsInView = useInView(cardsRef, { once: true })
  const careersInView = useInView(careersRef, { once: true })
  const ctaInView = useInView(ctaRef, { once: true })

  return (
    <>
      <NavbarClient user={null} />
      
      <main>
        {/* Hero Section */}
        <motion.section
          ref={heroRef}
          initial={{ opacity: 0, y: 30 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative pt-32 pb-20 px-6 text-center"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(124, 92, 255,0.08)_0%,transparent_70%)] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto relative z-10">
            <motion.p
              initial={{ opacity: 0 }}
              animate={heroInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.2 }}
              className="text-[#7C5CFF] text-sm font-semibold tracking-[3px] uppercase mb-6"
            >
              Get in Touch
            </motion.p>
            
            <h1 className="font-[var(--font-syne)] text-[clamp(2rem,6vw,4rem)] font-extrabold text-[#0F1B3D] mb-6 leading-[1.1]">
              Let&apos;s Build{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFF] to-[#A78BFA]">
                Something
              </span>
              <br />
              <span className="text-[#6F7192] font-normal text-[clamp(1.2rem,3vw,2rem)]">
                Amazing Together.
              </span>
            </h1>
            
            <p className="text-lg text-[#6F7192] max-w-2xl mx-auto leading-[1.7]">
              Have a question, custom request, or ready to start your next project? 
              Reach out — we&apos;re here to help bring your ideas to life.
            </p>
          </div>
        </motion.section>

        {/* Contact Cards */}
        <motion.section
          ref={cardsRef}
          initial={{ opacity: 0 }}
          animate={cardsInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="relative py-20 px-6"
        >
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              {contactMethods.map((method, i) => (
                <motion.div
                  key={method.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={cardsInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.15 }}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  className="group relative bg-[#FFFFFF] border border-white/[0.07] rounded-2xl p-8 hover:border-[rgba(124, 92, 255,0.3)] transition-all duration-300"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${method.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`} />
                  
                  <div className={`relative z-10 w-14 h-14 rounded-xl bg-gradient-to-br ${method.color} p-0.5 mb-6 mx-auto md:mx-0`}>
                    <div className="w-full h-full rounded-xl bg-[#FFFFFF] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <method.icon className="w-7 h-7 text-[#0F1B3D]" />
                    </div>
                  </div>
                  
                  <h3 className="font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D] mb-2 text-center md:text-left group-hover:text-[#7C5CFF] transition-colors">
                    {method.title}
                  </h3>
                  
                  <p className="text-sm text-[#6F7192] mb-4 text-center md:text-left">
                    {method.description}
                  </p>
                  
                  {method.href !== '#' ? (
                    <a
                      href={method.href}
                      className="inline-flex items-center gap-2 text-[#7C5CFF] font-medium text-sm hover:gap-3 transition-all group/link"
                    >
                      {method.value}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                    </a>
                  ) : (
                    <p className="text-[#0F1B3D] font-medium text-sm">
                      {method.value}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Careers Section */}
        <motion.section
          ref={careersRef}
          initial={{ opacity: 0, y: 30 }}
          animate={careersInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative py-20 px-6 bg-[var(--bg-soft)]"
        >
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#FFFFFF] border border-white/[0.07] rounded-3xl p-8 md:p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_20%,rgba(124, 92, 255,0.05)_0%,transparent_70%)] pointer-events-none" />
              
              <div className="relative z-10">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={careersInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-[#7C5CFF] text-sm font-semibold tracking-[3px] uppercase">Join Our Team</span>
                  <h2 className="font-[var(--font-syne)] text-[clamp(1.5rem,3vw,2.5rem)] font-extrabold text-[#0F1B3D] mt-4 mb-6 leading-[1.2]">
                    Careers at{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFF] to-[#A78BFA]">
                      {settings.businessName || 'Flux 3D'}
                    </span>
                  </h2>
                </motion.div>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={careersInView ? { opacity: 1 } : {}}
                  transition={{ delay: 0.4 }}
                  className="text-[#6F7192] leading-[1.8] mb-8 max-w-2xl"
                >
                  We&apos;re always looking for talented individuals passionate about additive manufacturing, 
                  3D printing, and making ideas reality. Whether you&apos;re a 3D printing expert, 
                  CAD designer, or customer success specialist — we&apos;d love to hear from you.
                </motion.p>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={careersInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <a
                    href={`mailto:${settings.primaryEmail || 'hello@flux3d.in'}?subject=Career%20Inquiry%20-%20${encodeURIComponent(settings.businessName || 'Flux 3D')}`}
                    className="inline-flex items-center justify-center gap-2 bg-[#7C5CFF] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-[0_0_40px_rgba(124, 92, 255,0.3)] transition-shadow"
                  >
                    Send Your Resume
                    <Send className="w-5 h-5" />
                  </a>
                  
                  <a
                    href={`https://wa.me/${(settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-[#0F1B3D] px-8 py-4 rounded-xl text-lg font-semibold hover:bg-[#25D366]/90 transition-colors"
                  >
                    WhatsApp Us
                    <Send className="w-5 h-5" />
                  </a>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          ref={ctaRef}
          initial={{ opacity: 0 }}
          animate={ctaInView ? { opacity: 1 } : {}}
          className="relative py-32 px-6 text-center"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(124, 92, 255,0.08)_0%,transparent_70%)] pointer-events-none" />
          
          <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,5vw,3.5rem)] font-extrabold text-[#0F1B3D] mb-6 leading-[1.1]">
              Ready to Start Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFF] to-[#A78BFA]">
                Project?
              </span>
            </h2>
            <p className="text-lg text-[#6F7192] mb-10 leading-[1.7]">
              Don&apos;t want to wait? Get an instant quote online and see pricing in real-time.
            </p>
            <a
              href="/instant-quote"
              className="inline-flex items-center justify-center gap-2 bg-[#7C5CFF] text-white px-10 py-5 rounded-xl text-lg font-semibold hover:shadow-[0_0_40px_rgba(124, 92, 255,0.3)] transition-shadow"
            >
              Get Instant Quote
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </motion.section>
      </main>
    </>
  )
}
