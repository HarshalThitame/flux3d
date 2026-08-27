"use client";

import dynamic from "next/dynamic";
import { startTransition, useEffect, useRef, useState } from "react";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import FadeIn from "@/components/FadeIn";
import { useBusinessSettings } from "@/lib/settings-context";

const ProblemSection = dynamic(() => import("./ProblemSection"), {
  ssr: false,
});
const ServicesSection = dynamic(() => import("./ServicesSection"), {
  ssr: false,
});
const HowItWorksSection = dynamic(() => import("./HowItWorksSection"), {
  ssr: false,
});
const PricingSection = dynamic(() => import("./PricingSection"), {
  ssr: false,
});
const FAQSection = dynamic(() => import("./FAQSection"), { ssr: false });
const FinalCTASection = dynamic(() => import("./FinalCTASection"), {
  ssr: false,
});
const FooterSection = dynamic(() => import("./FooterSection"), { ssr: false });

function FloatingWhatsAppButton() {
  const { settings } = useBusinessSettings();
  const whatsappNumber = (settings.whatsappNumber || "+919623023480").replace(
    /[^0-9]/g,
    "",
  );

  return (
    <a
      href={`https://wa.me/${whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Flux 3D on WhatsApp"
      className="floating-whatsapp-button fixed z-50 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--lux-border-gold,rgba(201,169,98,0.35))] bg-[var(--lux-ink,#1C1917)] text-[var(--lux-gold-light,#D4B978)] shadow-[0_18px_44px_rgba(28,25,23,0.28)] transition-all duration-300 hover:scale-105 hover:bg-[var(--lux-gold,#C9A962)] hover:text-white hover:shadow-[0_20px_54px_rgba(201,169,98,0.35)] md:h-14 md:w-14"
    >
      <WhatsAppIcon className="h-5 w-5 md:h-6 md:w-6" />
    </a>
  );
}

function LazySection({
  children,
  className = "",
  rootMargin = "320px",
  minHeight = 0,
}: {
  children: React.ReactNode;
  className?: string;
  rootMargin?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        startTransition(() => setMounted(true));
        observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [mounted, rootMargin]);

  return (
    <div
      ref={ref}
      className={className}
      style={minHeight ? { minHeight } : undefined}
    >
      {mounted ? <FadeIn>{children}</FadeIn> : null}
    </div>
  );
}

export default function LandingPageClient() {
  return (
    <div className="landing-premium relative">
      <FloatingWhatsAppButton />
      <LazySection minHeight={520} className="premium-band premium-band-ink">
        <ProblemSection />
      </LazySection>
      <LazySection minHeight={760} className="premium-band premium-band-panel">
        <ServicesSection />
      </LazySection>
      <LazySection minHeight={720} className="premium-band premium-band-ink">
        <HowItWorksSection />
      </LazySection>
      <LazySection minHeight={860} className="premium-band premium-band-panel">
        <PricingSection />
      </LazySection>
      <LazySection minHeight={720} className="premium-band premium-band-panel">
        <FAQSection />
      </LazySection>
      <LazySection minHeight={560} className="premium-band premium-band-black">
        <FinalCTASection />
      </LazySection>
      <LazySection minHeight={640}>
        <FooterSection />
      </LazySection>
    </div>
  );
}
