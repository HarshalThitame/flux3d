'use client'

import { motion } from 'framer-motion'

const galleryItems = [
  {
    title: 'Rapid Prototypes',
    subtitle: 'Product validation',
    description:
      'Fast design iterations for startups, founders, and engineering teams validating fit, form, and usability.',
    accent: 'from-[#6d28d9]/30 via-[#ff7b4d]/10 to-transparent',
  },
  {
    title: 'Functional Parts',
    subtitle: 'Workshop ready',
    description:
      'Jigs, brackets, mounts, and mechanical helpers built for repeat use and tighter production workflows.',
    accent: 'from-[#23c483]/30 via-[#23c483]/10 to-transparent',
  },
  {
    title: 'Brand Models',
    subtitle: 'Color and finish',
    description:
      'Display pieces, logos, and event-ready prints using silk finishes and multi-color AMS production.',
    accent: 'from-[#8b5cf6]/30 via-[#3498db]/10 to-transparent',
  },
  {
    title: 'Detail Prints',
    subtitle: 'Resin precision',
    description:
      'Miniatures, jewelry masters, and high-detail models where surface finish and fine geometry matter most.',
    accent: 'from-[#d946ef]/30 via-[#8e44ad]/10 to-transparent',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
}

export default function GalleryClient() {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F1B3D]">
      <main className="px-6 pb-20 pt-8 md:px-12 md:pt-10">
        <div className="mx-auto max-w-[1200px]">
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-sm font-medium uppercase tracking-[3px] text-[#6d28d9]"
          >
            Gallery
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-[var(--font-syne)] text-[clamp(2.4rem,5vw,4.6rem)] font-extrabold leading-[1.02] tracking-[-2px] text-[#0F1B3D]"
          >
            Showcase Categories for <span className="text-[#6F7192]">What We Print</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-[700px] text-base leading-8 text-[#6F7192]"
          >
            This page is structured as a fast-loading showcase overview. It keeps the route lightweight while still giving visitors a clearer sense of the work Flux3D handles.
          </motion.p>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-12 grid gap-6 md:grid-cols-2"
          >
            {galleryItems.map((item, index) => (
              <motion.article
                key={item.title}
                variants={itemVariants}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="relative overflow-hidden rounded-[30px] border border-[rgba(109, 40, 217,0.5)] bg-[#FFFFFF] p-8"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />
                <div className="relative">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="text-[11px] uppercase tracking-[0.22em] text-[#6d28d9]"
                  >
                    {item.subtitle}
                  </motion.div>
                  <h2 className="mt-4 font-[var(--font-syne)] text-3xl font-bold text-[#0F1B3D]">{item.title}</h2>
                  <p className="mt-4 max-w-[420px] text-sm leading-7 text-[#b1b9d5]">{item.description}</p>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.4 }}
                    className="mt-10 h-[220px] rounded-[24px] border border-[rgba(109, 40, 217,0.5)] bg-[linear-gradient(135deg,rgba(109, 40, 217,0.4),rgba(109, 40, 217,0.2))]"
                  />
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
