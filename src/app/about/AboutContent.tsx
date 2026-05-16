'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Printer, Truck, IndianRupee, Clock, HeadphonesIcon, Target, Globe, Zap } from 'lucide-react'

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

const stats = [
  { icon: '📦', value: '500+', label: 'Orders Fulfilled' },
  { icon: '🏙️', value: '15+', label: 'Cities Served' },
  { icon: '⚡', value: '24hrs', label: 'Average Turnaround' },
  { icon: '🎯', value: '98%', label: 'On-Time Delivery' },
]

const whyChooseUs = [
  {
    icon: Printer,
    title: 'Bambu-Powered Precision',
    description: 'Industry-grade Bambu Lab printers delivering multi-color, multi-material prints with micron-level accuracy. No compromises.',
    color: 'from-[#7C5CFF] to-[#A78BFA]',
  },
  {
    icon: Truck,
    title: 'Pan-India Delivery',
                 description: 'Based in Mumbai, delivering to Pune, Bangalore, Delhi, Hyderabad, Chennai & beyond. Tracked, secure packaging.',
    color: 'from-[#A78BFA] to-[#A78BFA]',
  },
  {
    icon: IndianRupee,
    title: 'Made-in-India Pricing',
    description: 'Transparent INR pricing with UPI, NEFT & card support. No dollar conversions, no hidden charges.',
    color: 'from-[#7C5CFF] to-[#7C5CFF]',
  },
  {
    icon: Clock,
    title: 'Real Turnaround Times',
    description: 'Standard orders printed & dispatched in 24-72 hours. Rush jobs? Talk to us for expedited options.',
    color: 'from-[#A78BFA] to-[#A78BFA]',
  },
  {
    icon: HeadphonesIcon,
    title: 'White-Glove Support',
    description: 'Material selection to file optimization — we ensure the right print, not just a quick print.',
    color: 'from-[#8B5CF6] to-[#a78bfa]',
  },
  {
    icon: Globe,
    title: 'Community First',
    description: 'Supporting students, indie makers & early-stage founders. Special discounts for educational projects.',
    color: 'from-[#EC4899] to-[#f472b6]',
  },
]

const values = [
  { icon: Target, text: 'Precision over speed — though we&apos;re fast too' },
  { icon: Zap, text: 'Transparency — you&apos;ll always know your order status' },
  { icon: Printer, text: 'Quality by default — no &ldquo;quick and dirty&rdquo; options' },
  { icon: Globe, text: 'Community first — we love supporting creators' },
]

const printTypes = ['Prototypes', 'Functional Parts', 'Product Mockups', 'Cosplay & Props', 'Architectural Models', 'Educational Models', 'Custom Enclosures', 'Replacement Parts', 'Art & Decor']

export default function AboutContent() {
  const heroRef = useRef(null)
  const missionRef = useRef(null)
  const whyRef = useRef(null)
  const valuesRef = useRef(null)
  const statsRef = useRef(null)
  const storyRef = useRef(null)
  const ctaRef = useRef(null)

  const heroInView = useInView(heroRef, { once: true })
  const missionInView = useInView(missionRef, { once: true, margin: '-100px' })
  const whyInView = useInView(whyRef, { once: true, margin: '-100px' })
  const valuesInView = useInView(valuesRef, { once: true, margin: '-100px' })
  const statsInView = useInView(statsRef, { once: true, margin: '-100px' })
  const storyInView = useInView(storyRef, { once: true, margin: '-100px' })
  const ctaInView = useInView(ctaRef, { once: true, margin: '-100px' })

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        initial="hidden"
        animate={heroInView ? 'visible' : 'hidden'}
        variants={fadeInUp}
        className="relative pt-32 pb-20 px-6 text-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(124, 92, 255,0.08)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.p
            variants={fadeInUp}
            className="text-[#7C5CFF] text-sm font-semibold tracking-[3px] uppercase mb-6"
          >
            About Flux 3D
          </motion.p>
          
          <motion.h1
            variants={fadeInUp}
            className="font-[var(--font-syne)] text-[clamp(2rem,6vw,4rem)] font-extrabold text-[#0F1B3D] tracking-[-1px] leading-[1.1] mb-6"
          >
            We Don&apos;t Just Print{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFF] to-[#A78BFA]">
              Objects.
            </span>
            <br />
            <span className="text-[#6F7192] font-normal text-[clamp(1.2rem,3vw,2rem)]">
              We Manufacture Ideas.
            </span>
          </motion.h1>
          
          <motion.p
            variants={fadeInUp}
            className="text-lg text-[#6F7192] max-w-2xl mx-auto leading-[1.7]"
          >
             Precision additive manufacturing studio in Mumbai, India — built for makers, 
                 engineers, startups, and businesses who demand excellence.
          </motion.p>
        </div>
      </motion.section>

      {/* Who We Are */}
      <motion.section
        ref={missionRef}
        variants={staggerContainer}
        initial="hidden"
        animate={missionInView ? 'visible' : 'hidden'}
        className="relative py-20 px-6"
      >
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeInUp} className="mb-12">
            <span className="text-[#7C5CFF] text-sm font-semibold tracking-[3px] uppercase">Who We Are</span>
            <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] mt-4 leading-[1.2]">
              Precision Meets Passion
            </h2>
          </motion.div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div variants={fadeInUp} className="space-y-4">
              <p className="text-[#6F7192] leading-[1.8]">
                 Flux 3D is a professional additive manufacturing studio based in{' '}
                 <span className="text-[#0F1B3D] font-medium">Mumbai, India</span> — built for makers, 
                 engineers, startups, and businesses who demand precision without compromise.
              </p>
              <p className="text-[#6F7192] leading-[1.8]">
                We run industry-grade{' '}
                <span className="text-[#7C5CFF] font-medium">Bambu Lab printers</span> to deliver 
                parts, prototypes, and products with tolerances and surface finishes that look 
                as good as they perform.
              </p>
            </motion.div>
            
            <motion.div variants={fadeInUp} className="bg-[#FFFFFF] border border-white/[0.07] rounded-2xl p-6">
              <h3 className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D] mb-4">Our Mission</h3>
              <p className="text-[#6F7192] leading-[1.8] mb-4">
                To make high-quality 3D printing accessible to every innovator across India — 
                from a first-time creator in a college dorm to an R&D team at a scaling startup.
              </p>
              <p className="text-[#6F7192] leading-[1.8] italic border-l-2 border-[#7C5CFF] pl-4">
                &ldquo;We believe the barrier between an idea and a physical object should be nothing 
                but a few hours of print time.&rdquo;
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Why Choose Us */}
      <motion.section
        ref={whyRef}
        variants={staggerContainer}
        initial="hidden"
        animate={whyInView ? 'visible' : 'hidden'}
        className="relative py-20 px-6 bg-[var(--bg-soft)]"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <span className="text-[#7C5CFF] text-sm font-semibold tracking-[3px] uppercase">Why Flux 3D?</span>
            <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] mt-4 leading-[1.2]">
              Built Different.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFF] to-[#A78BFA]">
                By Design.
              </span>
            </h2>
          </motion.div>
          
          <motion.div variants={staggerContainer} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyChooseUs.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group relative bg-[#FFFFFF] border border-white/[0.07] rounded-2xl p-6 hover:border-[rgba(124, 92, 255,0.3)] transition-all duration-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`} />
                <div className={`relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} p-0.5 mb-4`}>
                  <div className="w-full h-full rounded-xl bg-[#FFFFFF] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <item.icon className="w-6 h-6 text-[#0F1B3D]" />
                  </div>
                </div>
                <h3 className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D] mb-2 group-hover:text-[#7C5CFF] transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-[#6F7192] leading-[1.7]">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* What We Print */}
      <motion.section
        ref={valuesRef}
        variants={fadeInUp}
        initial="hidden"
        animate={valuesInView ? 'visible' : 'hidden'}
        className="relative py-20 px-6"
      >
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-[#7C5CFF] text-sm font-semibold tracking-[3px] uppercase">What We Print</span>
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] mt-4 mb-12 leading-[1.2]">
            Every Industry. Every Need.
          </h2>
          
          <div className="flex flex-wrap justify-center gap-3">
            {printTypes.map((type, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={valuesInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: i * 0.05 }}
                className="text-sm bg-[#FFFFFF] border border-white/[0.07] text-[#6F7192] px-4 py-2 rounded-full hover:border-[#7C5CFF]/30 hover:text-[#0F1B3D] transition-colors"
              >
                {type}
              </motion.span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Values */}
      <motion.section
        ref={storyRef}
        variants={fadeInUp}
        initial="hidden"
        animate={storyInView ? 'visible' : 'hidden'}
        className="relative py-20 px-6 bg-[var(--bg-soft)]"
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[#7C5CFF] text-sm font-semibold tracking-[3px] uppercase">Our Values</span>
              <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold text-[#0F1B3D] mt-4 mb-6 leading-[1.2]">
                Principles That{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFF] to-[#A78BFA]">
                  Drive Us.
                </span>
              </h2>
              <p className="text-[#6F7192] leading-[1.8]">
                Every print that leaves our studio reflects these core values. They&apos;re not just 
                words on a wall — they&apos;re the standards we hold ourselves to, every single day.
              </p>
            </div>
            
            <div className="space-y-4">
              {values.map((value, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={storyInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 bg-[#FFFFFF] border border-white/[0.07] rounded-xl p-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#7C5CFF]/10 flex items-center justify-center flex-shrink-0">
                    <value.icon className="w-5 h-5 text-[#7C5CFF]" />
                  </div>
                  <p className="text-[#0F1B3D] leading-[1.6] pt-2">{value.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* The Flux Story */}
      <motion.section
        ref={statsRef}
        variants={fadeInUp}
        initial="hidden"
        animate={statsInView ? 'visible' : 'hidden'}
        className="relative py-20 px-6"
      >
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#FFFFFF] border border-white/[0.07] rounded-3xl p-8 md:p-12">
            <span className="text-[#7C5CFF] text-sm font-semibold tracking-[3px] uppercase">The Flux Story</span>
            <h2 className="font-[var(--font-syne)] text-[clamp(1.5rem,3vw,2.5rem)] font-extrabold text-[#0F1B3D] mt-4 mb-6 leading-[1.2]">
              Born From Frustration.{' '}
              <span className="text-[#6F7192]">Built For You.</span>
            </h2>
            <blockquote className="border-l-4 border-[#7C5CFF] pl-6 py-2">
              <p className="text-lg text-[#6F7192] leading-[1.8] italic">
                &ldquo;Flux 3D started as a frustration with the gap between 3D printing&apos;s potential 
                and what most Indian print services actually delivered. We built the studio we 
                wished existed — fast machines, honest pricing, and people who actually care 
                about your project.&rdquo;
              </p>
              <footer className="mt-4 text-[#7C5CFF] font-medium">— The Flux 3D Team</footer>
            </blockquote>
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <section className="relative py-20 px-6 bg-[var(--bg-soft)]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={statsInView ? 'visible' : 'hidden'}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="text-center bg-[#FFFFFF] border border-white/[0.07] rounded-2xl p-6 hover:border-[#7C5CFF]/30 transition-colors"
              >
                <div className="text-4xl mb-3">{stat.icon}</div>
                <div className="font-[var(--font-syne)] text-3xl md:text-4xl font-extrabold text-[#0F1B3D] mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-[#6F7192]">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <motion.section
        ref={ctaRef}
        variants={fadeInUp}
        initial="hidden"
        animate={ctaInView ? 'visible' : 'hidden'}
        className="relative py-32 px-6 text-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(124, 92, 255,0.08)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="font-[var(--font-syne)] text-[clamp(1.8rem,5vw,3.5rem)] font-extrabold text-[#0F1B3D] mb-6 leading-[1.1]">
            Ready to Bring Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFF] to-[#A78BFA]">
              Design to Life?
            </span>
          </h2>
            <p className="text-lg text-[#6F7192] mb-10 leading-[1.7]">
              Upload your file or describe your project — we&apos;ll handle the rest. 
              Precision printing with turnaround times that keep your project moving.
            </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/instant-quote"
              className="inline-flex items-center justify-center gap-2 bg-[#7C5CFF] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-[0_0_40px_rgba(124, 92, 255,0.3)] transition-shadow"
            >
              Get a Quote →
            </a>
            <a
              href="/gallery"
              className="inline-flex items-center justify-center gap-2 border border-white/[0.1] bg-white/[0.03] text-[#0F1B3D] px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/[0.07] transition-colors"
            >
              See Our Work →
            </a>
          </div>
        </div>
      </motion.section>
    </div>
  )
}
