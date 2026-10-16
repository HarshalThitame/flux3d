"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

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

type TestimonialsResponse = {
  testimonials?: Testimonial[];
  count?: number;
  avg_rating?: number;
};

const GRADIENTS = [
  "from-[#5b21b6] to-[#7c3aed]",
  "from-[#1e3a8a] to-[#2563eb]",
  "from-[#9f1239] to-[#db2777]",
  "from-[#92400e] to-[#d97706]",
  "from-[#065f46] to-[#0f766e]",
];

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

function avatarGradient(name: string | null): string {
  if (!name) return GRADIENTS[0];
  return GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];
}

function initials(name: string | null): string {
  const words = (name ?? "Client").trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function orderTypeLabel(type: string): string {
  if (type === "shop") return "3D Shop";
  if (type === "custom_order") return "Custom project";
  return "Instant quote";
}

function StarRow({
  rating,
  className = "",
}: {
  rating: number;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden
          className={`h-4 w-4 ${star <= rating ? "fill-[#D4AF37] text-[#D4AF37]" : "fill-white/15 text-white/15"}`}
        />
      ))}
    </div>
  );
}

function CustomerIdentity({
  testimonial,
  compact = false,
}: {
  testimonial: Testimonial;
  compact?: boolean;
}) {
  const name = testimonial.customer_name ?? "FLUX3D client";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(testimonial.customer_name)} font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.22)] ${compact ? "h-9 w-9 text-[11px]" : "h-12 w-12 text-sm"}`}
      >
        {initials(testimonial.customer_name)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300">
          {testimonial.is_verified_purchase ? (
            <span className="inline-flex items-center gap-1 font-medium text-[#f5d061]">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
              Verified client
            </span>
          ) : null}
          <span className="text-slate-400">
            {orderTypeLabel(testimonial.order_type)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({
  testimonial,
  index,
}: {
  testimonial: Testimonial;
  index: number;
}) {
  const reviewText =
    testimonial.body || testimonial.title || "A trusted FLUX3D client.";

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: 0.45,
        ease: EASE_OUT,
        delay: Math.min(index * 0.06, 0.18),
      }}
      className="group flex min-h-[274px] w-[min(82vw,350px)] shrink-0 snap-start flex-col rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_16px_42px_rgba(0,0,0,0.12)] transition duration-300 hover:-translate-y-1 hover:border-[#D4AF37]/35 hover:bg-white/[0.08] sm:w-[350px]"
    >
      <div className="flex items-center justify-between gap-4">
        <StarRow rating={testimonial.rating} />
        <span className="rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-300">
          {orderTypeLabel(testimonial.order_type)}
        </span>
      </div>
      {testimonial.title ? (
        <h3 className="mt-5 text-base font-semibold leading-snug text-white">
          {testimonial.title}
        </h3>
      ) : null}
      <p
        className={`text-sm leading-6 text-slate-300 ${testimonial.title ? "mt-2" : "mt-5"}`}
      >
        &ldquo;{reviewText}&rdquo;
      </p>
      <div className="mt-auto border-t border-white/10 pt-4">
        <CustomerIdentity testimonial={testimonial} compact />
      </div>
    </motion.article>
  );
}

function TestimonialSkeleton() {
  return (
    <section
      className="bg-[#0b1020] py-20 sm:py-24"
      aria-label="Customer testimonials"
      aria-busy="true"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="mt-5 h-12 max-w-xl animate-pulse rounded-xl bg-white/10" />
        <div className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="h-72 animate-pulse rounded-[2rem] bg-white/[0.07]" />
          <div className="h-72 animate-pulse rounded-[2rem] bg-white/[0.05]" />
        </div>
      </div>
    </section>
  );
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [count, setCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTestimonials() {
      try {
        const response = await fetch("/api/testimonials", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unable to load testimonials");
        const data = (await response.json()) as TestimonialsResponse;
        setTestimonials(data.testimonials ?? []);
        setCount(data.count ?? 0);
        setAvgRating(data.avg_rating ?? 0);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setTestimonials([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadTestimonials();
    return () => controller.abort();
  }, []);

  const scrollRail = useCallback((direction: "previous" | "next") => {
    railRef.current?.scrollBy({
      left: direction === "next" ? 374 : -374,
      behavior: "smooth",
    });
  }, []);

  if (isLoading) return <TestimonialSkeleton />;
  if (testimonials.length === 0) return null;

  const [featured, ...remainingTestimonials] = testimonials;
  const railTestimonials =
    remainingTestimonials.length > 0 ? remainingTestimonials : testimonials;
  const visibleCount = count || testimonials.length;

  return (
    <section
      className="relative isolate overflow-hidden bg-[#0b1020] py-20 text-white sm:py-24"
      aria-labelledby="testimonials-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#d4af37]/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-8 border-b border-white/10 pb-10 lg:flex-row lg:items-end lg:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="max-w-2xl"
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f5d061]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Client outcomes
            </p>
            <h2
              id="testimonials-heading"
              className="mt-5 max-w-xl font-[var(--lux-font-display,Georgia,serif)] text-4xl font-medium leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl"
            >
              Trusted for work that needs to be right.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              A closer look at the makers, teams, and businesses who choose
              FLUX3D for dependable execution and thoughtful support.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 divide-x divide-white/10 self-start rounded-2xl border border-white/10 bg-white/[0.045] px-2 py-3 sm:self-auto">
            <div className="px-4 sm:px-6">
              <div className="flex items-center gap-1.5 text-lg font-semibold text-white">
                <Star
                  className="h-4 w-4 fill-[#D4AF37] text-[#D4AF37]"
                  aria-hidden
                />
                {avgRating.toFixed(1)}
              </div>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Average rating
              </p>
            </div>
            <div className="px-4 sm:px-6">
              <p className="text-lg font-semibold text-white">
                {visibleCount.toLocaleString("en-IN")}+
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Client reviews
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.04fr)_minmax(360px,0.96fr)]">
          <motion.article
            initial={{ opacity: 0, x: -18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55, ease: EASE_OUT }}
            className="relative overflow-hidden rounded-[2rem] border border-[#D4AF37]/30 bg-[linear-gradient(135deg,#191333_0%,#11182b_55%,#182134_100%)] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-9"
          >
            <div
              className="absolute right-5 top-4 font-serif text-[8rem] leading-none text-[#D4AF37]/10"
              aria-hidden
            >
              &ldquo;
            </div>
            <div className="relative flex h-full flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#f5d061]">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Featured client story
                </span>
                <StarRow rating={featured.rating} />
              </div>
              <Quote className="mt-8 h-8 w-8 text-[#D4AF37]" aria-hidden />
              {featured.title ? (
                <h3 className="mt-5 text-xl font-semibold text-white sm:text-2xl">
                  {featured.title}
                </h3>
              ) : null}
              <blockquote
                className={`max-w-2xl text-xl leading-8 text-slate-100 sm:text-2xl sm:leading-9 ${featured.title ? "mt-3" : "mt-5"}`}
              >
                &ldquo;
                {featured.body ||
                  featured.title ||
                  "FLUX3D delivers with care, clarity, and precision."}
                &rdquo;
              </blockquote>
              <div className="mt-9 border-t border-white/10 pt-5">
                <CustomerIdentity testimonial={featured} />
              </div>
            </div>
          </motion.article>

          <motion.div
            initial={{ opacity: 0, x: 18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55, ease: EASE_OUT, delay: 0.08 }}
            className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-7 sm:p-9"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#f5d061]">
              The FLUX3D standard
            </p>
            <h3 className="mt-4 max-w-md text-2xl font-semibold leading-tight text-white">
              A premium experience from first file to final delivery.
            </h3>
            <div className="mt-8 space-y-5">
              {[
                [
                  "Clear communication",
                  "Thoughtful guidance before production begins.",
                ],
                [
                  "Precision-focused process",
                  "Every detail is reviewed with the intended use in mind.",
                ],
                [
                  "Reliable follow-through",
                  "A dedicated team stays close to the outcome.",
                ],
              ].map(([heading, detail], index) => (
                <div key={heading} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-xs font-semibold text-[#f5d061]">
                    0{index + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {heading}
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {railTestimonials.length > 1 ? (
          <div className="mt-12">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">
                  More client perspectives
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Scroll to explore verified experiences.
                </p>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => scrollRail("previous")}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-[#D4AF37]/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d061]"
                  aria-label="Show previous testimonials"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRail("next")}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-[#D4AF37]/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d061]"
                  aria-label="Show next testimonials"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <div
              ref={railRef}
              className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scrollbar-color:rgba(212,175,55,0.55)_transparent] sm:-mx-8 sm:gap-5 sm:px-8 lg:-mx-10 lg:px-10"
              tabIndex={0}
              aria-label="Additional customer testimonials"
            >
              {railTestimonials.map((testimonial, index) => (
                <ReviewCard
                  key={testimonial.id}
                  testimonial={testimonial}
                  index={index}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
