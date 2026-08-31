"use client";

import Link from "next/link";
import { Mail, Phone, MapPin, Clock, Sparkles } from "lucide-react";
import { useBusinessSettings } from "@/lib/settings-context";
import Reveal from "@/components/Reveal";

const BrandInstagram = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const BrandYoutube = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
  </svg>
);

const BrandLinkedin = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

const BrandTwitter = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
  </svg>
);

export default function FooterSection() {
  const { settings } = useBusinessSettings();

  const socialLinks = [
    { icon: BrandInstagram, href: settings.instagramUrl, label: "Instagram" },
    { icon: BrandYoutube, href: settings.youtubeUrl, label: "YouTube" },
    { icon: BrandLinkedin, href: settings.linkedinUrl, label: "LinkedIn" },
    { icon: BrandTwitter, href: settings.twitterUrl, label: "Twitter" },
  ].filter((s) => s.href);

  const addressParts = [
    settings.addressLine1,
    settings.addressLine2,
    settings.city && settings.state
      ? `${settings.city}, ${settings.state}`
      : "",
    settings.postalCode,
  ]
    .filter(Boolean)
    .join(" — ");

  const supportEmail =
    settings.supportEmail || settings.primaryEmail || "flux3d.in@gmail.com";
  const supportPhone = settings.primaryPhone || "+919623023480";

  const businessYear = new Date().getFullYear();

  const footerLinkClass =
    "text-sm text-[rgba(255,255,255,0.6)] transition-colors hover:text-[#FFFFFF]";
  const footerHeadingClass =
    "mb-5 font-[var(--shop-font-heading)] text-sm font-bold text-[#FFFFFF]";

  return (
    <footer className="footer relative overflow-hidden bg-[#050505] border-t border-[#1F1F1F] text-white py-16 md:py-24">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(201,169,98,0.03)] blur-[100px]" />

      <Reveal className="relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5 xl:gap-16">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 font-[var(--shop-font-heading)] text-2xl font-bold text-[#FFFFFF] mb-4">
              <Sparkles className="h-5 w-5 text-[var(--shop-gold,#C9A962)]" />
              <span>{settings.businessName || "Flux3D"}</span>
            </div>
            <p className="mb-8 max-w-[340px] text-sm leading-[1.8] text-[rgba(255,255,255,0.6)]">
              {settings.businessDescription ||
                `Flux3D provides custom 3D printing, prototyping, model printing and related manufacturing services for individuals and businesses across India.`}
            </p>

            {socialLinks.length > 0 && (
              <div className="flex items-center gap-4">
                {socialLinks.map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[rgba(255,255,255,0.7)] transition-all duration-300 hover:border-[var(--shop-gold,#C9A962)] hover:bg-[var(--shop-gold,#C9A962)] hover:text-[#000000] hover:-translate-y-1"
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className={footerHeadingClass}>Product</h3>
            <ul className="space-y-3">
              {[
                { label: "Services", href: "/services" },
                { label: "Pricing", href: "/pricing" },
                { label: "3D Shop", href: "/3d-shop" },
                { label: "Request a Quote", href: "/contact" },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={footerHeadingClass}>Company</h3>
            <ul className="space-y-3">
              {[
                { label: "About Us", href: "/about" },
                { label: "Contact Us", href: "/contact" },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={footerHeadingClass}>Contact</h3>
            <ul className="space-y-4">
              {(settings.addressLine1 || settings.city) && (
                <li className="flex items-start gap-3 text-sm text-[rgba(255,255,255,0.6)]">
                  <MapPin className="mt-0.5 h-4 w-4 text-[var(--shop-gold,#C9A962)] shrink-0" />
                  <span className="leading-relaxed">
                    {addressParts ||
                      "Sawargaon Tal, Sangamner — Maharashtra — 422605"}
                  </span>
                </li>
              )}
              {supportPhone && (
                <li className="flex items-center gap-3 text-sm text-[rgba(255,255,255,0.6)]">
                  <Phone className="h-4 w-4 text-[var(--shop-gold,#C9A962)] shrink-0" />
                  <a
                    href={`tel:${supportPhone.replace(/[^0-9+]/g, "")}`}
                    className="hover:text-white transition-colors"
                  >
                    {supportPhone}
                  </a>
                </li>
              )}
              {supportEmail && (
                <li className="flex items-center gap-3 text-sm text-[rgba(255,255,255,0.6)]">
                  <Mail className="h-4 w-4 text-[var(--shop-gold,#C9A962)] shrink-0" />
                  <a
                    href={`mailto:${supportEmail}`}
                    className="hover:text-white transition-colors"
                  >
                    {supportEmail}
                  </a>
                </li>
              )}
              {settings.businessHours && (
                <li className="flex items-start gap-3 text-sm text-[rgba(255,255,255,0.6)]">
                  <Clock className="mt-0.5 h-4 w-4 text-[var(--shop-gold,#C9A962)] shrink-0" />
                  <span className="leading-relaxed">
                    {settings.businessHours}
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-16 mb-8 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex flex-col items-center gap-3 md:items-start md:flex-row md:gap-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(255,255,255,0.4)]">
                Payment Methods
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {["UPI", "Cards", "Net Banking", "Razorpay"].map((method) => (
                  <span
                    key={method}
                    className="text-xs font-medium text-[rgba(255,255,255,0.7)]"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 md:items-start md:flex-row md:gap-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(255,255,255,0.4)]">
                Delivery
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {[
                  "Courier partner",
                  "Dispatch tracking",
                  "Serviceable locations",
                ].map((partner) => (
                  <span
                    key={partner}
                    className="text-xs font-medium text-[rgba(255,255,255,0.7)]"
                  >
                    {partner}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 lg:flex-row">
          <div className="flex flex-col items-center gap-2 lg:items-start">
            <p className="text-xs text-[rgba(255,255,255,0.5)]">
              &copy; {businessYear}{" "}
              {settings.brandName || settings.businessName} ·{" "}
              {settings.legalBusinessName || settings.businessName}.
            </p>
            <p className="text-[10px] text-[rgba(255,255,255,0.3)]">
              Brand: {settings.brandName || settings.businessName}. Legal
              operator: {settings.legalBusinessName || settings.businessName}.{" "}
              {settings.city ? `${settings.city}, ${settings.state}` : "India"}.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs">
            <Link
              href={settings.privacyPolicyUrl || "/privacy-policy"}
              className="text-[rgba(255,255,255,0.5)] transition-colors hover:text-[#FFFFFF]"
            >
              Privacy Policy
            </Link>
            <Link
              href={settings.termsUrl || "/terms-and-conditions"}
              className="text-[rgba(255,255,255,0.5)] transition-colors hover:text-[#FFFFFF]"
            >
              Terms
            </Link>
            <Link
              href={settings.refundPolicyUrl || "/refund-policy"}
              className="text-[rgba(255,255,255,0.5)] transition-colors hover:text-[#FFFFFF]"
            >
              Refunds
            </Link>
            <Link
              href={settings.shippingPolicyUrl || "/service-delivery-policy"}
              className="text-[rgba(255,255,255,0.5)] transition-colors hover:text-[#FFFFFF]"
            >
              Shipping
            </Link>
            <Link
              href="/security"
              className="text-[rgba(255,255,255,0.5)] transition-colors hover:text-[#FFFFFF]"
            >
              Security
            </Link>
          </div>
        </div>

        <p className="mt-12 text-center text-[10px] leading-[1.8] text-[rgba(255,255,255,0.2)] max-w-3xl mx-auto">
          {settings.brandName || settings.businessName} provides custom 3D
          printing and manufacturing services. Ready-made products are shipped
          after order confirmation where applicable.
        </p>
      </Reveal>
    </footer>
  );
}
