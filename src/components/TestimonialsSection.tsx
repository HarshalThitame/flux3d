'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<any[]>([]);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await fetch('/api/testimonials');
        const data = await res.json();
        if (res.ok && data.testimonials) {
          setTestimonials(data.testimonials);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchTestimonials();
  }, []);

  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Loved by our customers
        </h2>
        <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
          See what creators and engineers are saying about our custom 3D printing services.
        </p>
      </div>

      <div className="relative flex overflow-x-hidden group">
        <div className="animate-marquee whitespace-nowrap flex space-x-6 px-4 group-hover:[animation-play-state:paused]">
          {[...testimonials, ...testimonials].map((testimonial, i) => (
            <motion.div 
              key={`${testimonial.id}-${i}`}
              className="w-80 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 whitespace-normal"
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center space-x-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <svg key={j} className={`w-5 h-5 ${j < testimonial.rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 italic mb-6">"{testimonial.body}"</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {(testimonial.customer_name || 'A')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{testimonial.customer_name || 'Anonymous'}</p>
                    {testimonial.is_verified_purchase && (
                      <p className="text-xs text-green-600 font-medium flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                        Verified Buyer
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400 border border-gray-200 px-2 py-1 rounded">
                  {testimonial.order_type === 'custom_order' ? 'Custom Quote' : 'Store'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Add marquee animation to tailwind config or global css manually if needed */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
      `}</style>
    </section>
  );
}
