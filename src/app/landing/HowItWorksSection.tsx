"use client";

import { memo } from "react";
import {
  Upload,
  MessageSquare,
  CreditCard,
  Printer,
  Package,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import Reveal from "@/components/Reveal";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Share Your Requirement",
    description:
      "Upload a design file or describe the part, product or model you need. We review the request before confirming the order.",
  },
  {
    icon: MessageSquare,
    step: "02",
    title: "Receive a Quotation",
    description:
      "We confirm the material, colour, quantity, finish, shipping and production details, then send the final price or quote.",
  },
  {
    icon: CreditCard,
    step: "03",
    title: "Pay Securely Online",
    description:
      "Payments are handled through the checkout flow with server-side verification before an order is marked paid.",
  },
  {
    icon: Printer,
    step: "04",
    title: "Production and QC",
    description:
      "The order is manufactured, checked, and prepared for dispatch after the final approved specifications are locked in.",
  },
  {
    icon: Package,
    step: "05",
    title: "Delivered to You",
    description:
      "The completed order is shipped to a serviceable location in India. Tracking is shared when available.",
  },
];

function HowItWorksSection() {
  return (
    <section className="relative overflow-hidden py-16 px-4 md:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl relative z-10">
        <Reveal>
          <div className="text-center mb-12 md:mb-16">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--shop-gold,#C9A962)]">
              The Process
            </p>
            <h2 className="font-[var(--shop-font-heading)] text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.15] text-[var(--shop-text-primary,#1C1917)]">
              From Requirement to Dispatch <br className="hidden md:block" />
              <span className="text-[var(--shop-gold,#C9A962)]">
                in 5 Steps.
              </span>
            </h2>
          </div>
        </Reveal>

        {/* Enterprise Grade Wide Cards List */}
        <div className="mx-auto max-w-4xl space-y-5">
          {steps.map((step, i) => (
            <Reveal key={step.step} delay={i * 0.1}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="group flex flex-col md:flex-row items-start md:items-center gap-6 rounded-[var(--shop-radius-xl,24px)] border border-[var(--shop-border-light,#E7E5E0)] bg-[var(--shop-bg-elevated,#FFFFFF)] p-6 shadow-sm hover:border-[var(--shop-gold,#C9A962)] hover:shadow-md transition-colors sm:p-8"
              >
                {/* Icon Box */}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--shop-gold-faint,#FAF6EB)] border border-[var(--shop-border-gold)] transition-transform group-hover:scale-110">
                  <step.icon className="h-7 w-7 text-[var(--shop-gold,#C9A962)]" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--shop-gold,#C9A962)]">
                      Step {step.step}
                    </span>
                    <div className="h-px flex-1 bg-[var(--shop-border-light,#E7E5E0)] md:hidden" />
                  </div>
                  <h3 className="font-[var(--shop-font-heading)] mb-2 text-xl font-semibold leading-tight text-[var(--shop-text-primary,#1C1917)] sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--shop-text-secondary,#44403C)] sm:text-base sm:leading-relaxed max-w-2xl">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>

        {/* CTA */}
        <Reveal>
          <div className="mt-16 text-center md:mt-20">
            <p className="mb-6 font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary,#1C1917)]">
              Ready to start?
            </p>
            <a
              href="/contact"
              className="inline-flex min-h-[56px] items-center gap-2 rounded-full bg-[var(--shop-text-primary,#1C1917)] px-10 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--shop-gold,#C9A962)] hover:shadow-md hover:-translate-y-0.5"
            >
              Request a Quote
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-[11px] uppercase tracking-widest text-[var(--shop-text-muted,#78716C)]">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--shop-gold,#C9A962)]" />
                Timeline shared before confirmation
              </span>
              <span className="hidden md:inline-block text-[var(--shop-border-medium)]">
                |
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--shop-gold,#C9A962)]" />
                Quality checked before dispatch
              </span>
              <span className="hidden md:inline-block text-[var(--shop-border-medium)]">
                |
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--shop-gold,#C9A962)]" />
                Support via email & phone
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default memo(HowItWorksSection);

export const _exports = { steps };
