"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Maximize2, Ruler, Eye } from "lucide-react";
import Reveal from "@/components/Reveal";

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

const MARKET_WIDTH_PERCENT = 28; // ~150mm typical
const OUR_WIDTH_PERCENT = 100; // Flux3D full bar

export default function SizeSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="lux-section lux-band-cream lux-section-padding overflow-hidden"
    >
      <div className="mx-auto max-w-7xl">
        {/* Eyebrow + Headline */}
        <Reveal>
          <div className="mb-12 text-center">
            <p className="lux-eyebrow mb-3">Why Bigger Matters</p>
            <h2 className="lux-heading-1">
              Our prints aren&apos;t{" "}
              <span className="italic text-[var(--lux-gold)]">invisible.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-[var(--lux-text-muted)]">
              Most 3D printed products you see online are palm-sized. Flux3D
              prints are room-scale — you notice them the moment you walk in.
            </p>
          </div>
        </Reveal>

        {/* Animated Size Bar Comparison */}
        <Reveal delay={80}>
          <div className="mb-8 rounded-[var(--lux-radius-xl)] border border-[var(--lux-border-light)] bg-white p-6 shadow-[var(--lux-shadow-sm)] md:p-8">
            <p className="mb-6 text-xs font-bold uppercase tracking-widest text-[var(--lux-text-subtle)]">
              Size comparison — print volume
            </p>
            {/* Market bar */}
            <div className="mb-6">
              <div className="mb-2 flex justify-between text-xs text-[var(--lux-text-muted)]">
                <span>Typical market product</span>
                <span>~150 mm</span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-full bg-[var(--lux-warm)]">
                <motion.div
                  className="h-full rounded-full bg-[var(--lux-taupe)]"
                  initial={{ width: 0 }}
                  animate={inView ? { width: `${MARKET_WIDTH_PERCENT}%` } : {}}
                  transition={{
                    duration: 1.2,
                    ease: EASE_OUT_EXPO,
                    delay: 0.2,
                  }}
                />
              </div>
            </div>
            {/* Flux3D bar */}
            <div>
              <div className="mb-2 flex justify-between text-xs font-semibold text-[var(--lux-text-primary)]">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--lux-gold)]" />
                  Flux3D product
                </span>
                <span className="text-[var(--lux-gold)]">UP TO 500 mm</span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-full border border-[var(--lux-border-gold)] bg-[var(--lux-gold-faint)]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--lux-gold)] to-[var(--lux-gold-light)]"
                  initial={{ width: 0 }}
                  animate={inView ? { width: `${OUR_WIDTH_PERCENT}%` } : {}}
                  transition={{
                    duration: 1.5,
                    ease: EASE_OUT_EXPO,
                    delay: 0.5,
                  }}
                />
              </div>
            </div>
          </div>
        </Reveal>

        {/* Two-column: dark "Room scale" card + stats strip */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Dark card */}
          <Reveal delay={120}>
            <div className="relative flex h-full min-h-[280px] flex-col justify-between overflow-hidden rounded-[var(--lux-radius-xl)] bg-[var(--lux-ink)] p-8 text-white md:p-10">
              {/* CSS box illustration */}
              <div className="pointer-events-none absolute right-6 top-6 flex items-end gap-3 opacity-15">
                {/* Small box — market */}
                <div className="h-10 w-10 rounded-sm border-2 border-white" />
                {/* Large box — Flux3D */}
                <div className="h-24 w-24 rounded-sm border-2 border-[var(--lux-gold)]" />
              </div>
              <div className="relative z-10">
                <Eye className="mb-4 h-6 w-6 text-[var(--lux-gold)]" />
                <h3 className="mb-4 font-[var(--lux-font-display)] text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-tight">
                  Visible from across the room.
                </h3>
                <p className="max-w-[340px] text-sm leading-relaxed text-white/70">
                  These aren&apos;t desk knick-knacks. Our products are
                  statement pieces — furniture-scale, shelf-centerpieces, and
                  display-worthy art.
                </p>
              </div>
              <div className="mt-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--lux-gold)] sm:text-xs">
                <Ruler className="h-3.5 w-3.5" />
                Print volume far above market standard
              </div>
            </div>
          </Reveal>

          {/* Stats strip */}
          <Reveal delay={160}>
            <div className="grid h-full grid-rows-3 gap-4">
              {[
                {
                  icon: Maximize2,
                  stat: "Up to 500 mm",
                  label: "Maximum print dimension",
                },
                {
                  icon: Ruler,
                  stat: "3× Larger",
                  label: "Than typical market products",
                },
                {
                  icon: Eye,
                  stat: "Room-scale",
                  label: "Presence you can actually see",
                },
              ].map(({ icon: Icon, stat, label }) => (
                <div
                  key={stat}
                  className="flex items-center gap-4 rounded-[var(--lux-radius-xl)] border border-[var(--lux-border-light)] bg-white p-5 shadow-[var(--lux-shadow-sm)] sm:gap-6 sm:p-6"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--lux-border-gold)] bg-[var(--lux-gold-faint)]">
                    <Icon className="h-5 w-5 text-[var(--lux-gold)]" />
                  </div>
                  <div>
                    <p className="font-[var(--lux-font-display)] text-xl font-bold text-[var(--lux-text-primary)] sm:text-2xl">
                      {stat}
                    </p>
                    <p className="mt-1 text-xs text-[var(--lux-text-muted)] sm:text-sm">
                      {label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
