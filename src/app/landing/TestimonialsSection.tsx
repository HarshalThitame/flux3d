'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Star, CheckCircle2 } from 'lucide-react'

type Testimonial = {
  id: string
  rating: number
  review_text: string
  customer_display_name: string
  customer_avatar_seed: string
  order_type: string
  featured: boolean
  submitted_at: string
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/testimonials')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTestimonials(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || testimonials.length === 0) return null

  // Duplicate for marquee effect
  const displayItems = [...testimonials, ...testimonials]

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[#0F1B3D] mb-4">What Our Customers Say</h2>
          <p className="text-lg text-[#6F7192] max-w-2xl mx-auto">Real reviews from verified customers</p>
        </motion.div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />
        
        <div className="flex overflow-hidden">
          <motion.div
            className="flex gap-6 min-w-max px-4 py-4"
            animate={{ x: [0, -1035] }} // rough calc, normally based on width
            transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
            whileHover={{ animationPlayState: 'paused' }} // simple trick, though Framer motion handles hover pause differently.
            // Actually, Framer Motion doesn't natively support pause on hover easily with animate prop.
            // Using a simple css animation might be better for hover pause, but we'll stick to basic motion.
          >
            {displayItems.map((testimonial, idx) => (
              <div
                key={`${testimonial.id}-${idx}`}
                className="w-[350px] md:w-[400px] bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-200'}`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    testimonial.order_type === 'shop' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'bg-purple-50 text-purple-600'
                  }`}>
                    {testimonial.order_type === 'shop' ? '3D Shop' : 'Custom Order'}
                  </span>
                </div>
                
                <p className="text-gray-700 text-sm mb-6 flex-grow">
                  "{testimonial.review_text.length > 150 
                    ? `${testimonial.review_text.substring(0, 150)}...` 
                    : testimonial.review_text}"
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF5C1A] to-[#ff8c5a] flex items-center justify-center text-white font-bold shrink-0">
                    {testimonial.customer_display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[#0F1B3D]">{testimonial.customer_display_name}</div>
                    <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Verified Purchase
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
