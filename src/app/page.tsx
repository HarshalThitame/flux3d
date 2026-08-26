import type { Metadata } from "next";

import { getSettings } from "@/lib/settings";
import { buildPublicBusinessProfile } from "@/lib/public-business";
import { faqPageJsonLd, makeLocalBusinessJsonLd } from "@/lib/structured-data";
import { getShopHomeData } from "@/lib/shop/public-data";
import { getCspNonce } from "@/lib/csp";
import "./landing-luxury-unified.css";
import HeroSection from "./landing/HeroSection";
import LandingPageBoundary from "./landing/LandingPageBoundary";
import LandingShopSection from "./landing/LandingShopSection";
import Navbar from "@/components/Navbar";
import LuxuryOfferBanner from "@/components/offers/LuxuryOfferBanner";

export const metadata: Metadata = {
  title: {
    absolute: "Flux3D — 3D Shop and Custom 3D Printing Services in India",
  },
  description:
    "Shop ready-made 3D printed products with live 3D previews, or order custom 3D printing, prototyping, and manufacturing services in India.",
  alternates: {
    canonical: "https://flux3d.in",
  },
};

function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function Home() {
  const nonce = await getCspNonce();
  const settings = await getSettings();
  const profile = buildPublicBusinessProfile(settings);
  const shopData = await getShopHomeData();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      makeLocalBusinessJsonLd(settings),
      // NOTE: no WebSite entity here — the root layout already emits one
      // (with SearchAction) on every page; duplicating it creates two
      // WebSite entities in Google's understanding of the site.
      {
        "@type": "Service",
        name: "Custom 3D Printing",
        provider: { "@type": "Organization", name: profile.legalName },
        areaServed: "IN",
        serviceType: "Custom 3D Printing",
      },
    ],
  };

  // The hero carousel is server-rendered and its centered card uses
  // next/image with `priority`, which emits an optimized
  // <link rel="preload"> in the head — no manual preload needed.
  return (
    <div className="public-shell">
      <script
        nonce={nonce}
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: toJsonLd(structuredData) }}
      />
      <script
        nonce={nonce}
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: toJsonLd(faqPageJsonLd) }}
      />
      <Navbar transparent />
      <LuxuryOfferBanner />
      <main>
        <HeroSection shopData={shopData} />
        <LandingShopSection data={shopData} />
        <LandingPageBoundary />
      </main>
    </div>
  );
}
