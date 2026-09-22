"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

type Testimonial = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  customer_name: string | null;
  is_verified_purchase: boolean;
  order_type: string;
  created_at: string;
  image_urls: string[];
};

// Gradient palette per initial letter for avatar
const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-indigo-500 to-blue-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-cyan-500 to-sky-600",
];
function avatarGradient(name: string | null): string {
  if (!name) return GRADIENTS[0];
  const idx = name.charCodeAt(0) % GRADIENTS.length;
  return GRADIENTS[idx];
}

function orderTypeLabel(type: string): string {
  if (type === "shop") return "3D Shop";
  if (type === "custom_order") return "Custom Order";
  return "Instant Quote";
}
function orderTypeClass(type: string): string {
  if (type === "shop") return "border-purple-200 bg-purple-50 text-purple-700";
  if (type === "custom_order")
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function StarRow({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const cls = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${cls} ${i <= rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
    </div>
  );
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="w-80 shrink-0 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      <StarRow rating={t.rating} />
      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-gray-600">
        &ldquo;{t.body}&rdquo;
      </p>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(t.customer_name)} text-sm font-bold text-white`}
          >
            {(t.customer_name ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {t.customer_name ?? "Customer"}
            </p>
            {t.is_verified_purchase && (
              <p className="flex items-center gap-1 text-[11px] font-medium text-green-600">
                <svg
                  className="h-3 w-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Verified
              </p>
            )}
          </div>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${orderTypeClass(t.order_type)}`}
        >
          {orderTypeLabel(t.order_type)}
        </span>
      </div>
    </motion.div>
  );
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [count, setCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/testimonials")
      .then((r) => r.json())
      .then(
        (data: {
          testimonials?: Testimonial[];
          count?: number;
          avg_rating?: number;
        }) => {
          setTestimonials(data.testimonials ?? []);
          setCount(data.count ?? 0);
          setAvgRating(data.avg_rating ?? 0);
        },
      )
      .catch(() => {});
  }, []);

  // Need at least 2 to show the section
  if (testimonials.length < 2) return null;

  const [featured, ...rest] = testimonials;
  const marqueeItems = rest.length > 0 ? rest : testimonials;

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Section heading ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-700 mb-4">
            ⭐ Testimonials
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Voices of FLUX3D
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500">
            Real stories from creators, engineers & makers who trust us with
            their ideas.
          </p>
        </motion.div>

        {/* ── Featured testimonial ── */}
        {featured && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mb-12 max-w-2xl rounded-2xl border border-indigo-100 bg-white p-8 shadow-lg"
          >
            <StarRow rating={featured.rating} size="md" />
            <blockquote className="mt-4 text-xl leading-relaxed text-gray-700 font-medium">
              &ldquo;{featured.body}&rdquo;
            </blockquote>
            <div className="mt-6 flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(featured.customer_name)} text-lg font-bold text-white`}
              >
                {(featured.customer_name ?? "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {featured.customer_name ?? "Happy Customer"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {featured.is_verified_purchase && (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                      <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Verified Buyer
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${orderTypeClass(featured.order_type)}`}
                  >
                    {orderTypeLabel(featured.order_type)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Marquee cards ── */}
        {marqueeItems.length > 0 && (
          <div className="relative">
            {/* Gradient fade edges */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-gray-50 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-gray-50 to-transparent" />

            <div className="overflow-hidden">
              <div
                ref={trackRef}
                className="flex gap-5 animate-marquee-testimonials group-hover:[animation-play-state:paused] w-max"
                style={{ animationPlayState: "running" }}
                onMouseEnter={() => {
                  if (trackRef.current)
                    trackRef.current.style.animationPlayState = "paused";
                }}
                onMouseLeave={() => {
                  if (trackRef.current)
                    trackRef.current.style.animationPlayState = "running";
                }}
              >
                {[...marqueeItems, ...marqueeItems].map((t, i) => (
                  <TestimonialCard key={`${t.id}-${i}`} t={t} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Stats bar ── */}
        {count > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-500"
          >
            <span className="text-amber-500 font-bold">★ {avgRating}</span>
            <span>average rating</span>
            <span className="text-gray-300">·</span>
            <span className="font-semibold text-gray-700">
              {count.toLocaleString("en-IN")}
            </span>
            <span>happy customers</span>
          </motion.div>
        )}
      </div>

      {/* Marquee animation */}
      <style jsx global>{`
        @keyframes marquee-testimonials {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee-testimonials {
          animation: marquee-testimonials 30s linear infinite;
        }
      `}</style>
    </section>
  );
}
