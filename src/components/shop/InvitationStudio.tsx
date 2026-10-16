"use client";

import { MessageCircle, PackageCheck, Sparkles } from "lucide-react";
import type {
  InvitationConfig,
  InvitationDetails,
} from "@/lib/shop/invitation";

type Props = {
  config: InvitationConfig;
  details: InvitationDetails;
  quantity: number;
  sampleAvailable: boolean;
  onChange: (details: InvitationDetails) => void;
  onOrderSample: () => void;
  onDiscuss: () => void;
};

const fields: Array<{
  key: keyof InvitationDetails;
  label: string;
  placeholder: string;
  type?: "text" | "date";
  full?: boolean;
}> = [
  {
    key: "hostNames",
    label: "Names on the invitation",
    placeholder: "e.g. Aarav & Anaya",
  },
  { key: "eventDate", label: "Event date", placeholder: "", type: "date" },
  {
    key: "venue",
    label: "Venue",
    placeholder: "Venue name and city",
    full: true,
  },
  {
    key: "rsvp",
    label: "RSVP contact",
    placeholder: "Phone number or RSVP name",
  },
  {
    key: "wording",
    label: "Invitation wording",
    placeholder: "Add the wording or a short note for our design team",
    full: true,
  },
];

export default function InvitationStudio({
  config,
  details,
  quantity,
  sampleAvailable,
  onChange,
  onOrderSample,
  onDiscuss,
}: Props) {
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-[var(--shop-gold)]/35 bg-[linear-gradient(135deg,#fffdf7_0%,#fff_52%,#f8f5ff_100%)]">
      <div className="border-b border-[var(--shop-gold)]/20 px-4 py-4">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--shop-gold)]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> Invitation Studio
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--shop-text-primary)]">
          Make this design yours
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--shop-text-secondary)]">
          Share the essential details now. For bespoke layouts, our invitation
          team will help on WhatsApp.
        </p>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {fields
          .filter((field) => config.fields.includes(field.key))
          .map((field) => (
            <label
              key={field.key}
              className={field.full ? "sm:col-span-2" : ""}
            >
              <span className="mb-1.5 block text-xs font-semibold text-[var(--shop-text-primary)]">
                {field.label}
              </span>
              {field.key === "wording" ? (
                <textarea
                  value={details.wording}
                  maxLength={600}
                  rows={3}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    onChange({ ...details, wording: event.target.value })
                  }
                  className="w-full resize-y rounded-xl border border-[var(--shop-border-light)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--shop-gold)]"
                />
              ) : (
                <input
                  type={field.type ?? "text"}
                  value={details[field.key]}
                  maxLength={field.key === "venue" ? 240 : 160}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    onChange({ ...details, [field.key]: event.target.value })
                  }
                  className="min-h-11 w-full rounded-xl border border-[var(--shop-border-light)] bg-white px-3 text-sm outline-none transition focus:border-[var(--shop-gold)]"
                />
              )}
            </label>
          ))}
      </div>

      <div className="grid gap-2 border-t border-[var(--shop-gold)]/20 bg-white/70 p-4 sm:grid-cols-2">
        <div className="rounded-xl bg-[var(--shop-gold-faint)] px-3 py-2.5 text-xs leading-5 text-[var(--shop-text-secondary)]">
          <strong className="block text-[var(--shop-text-primary)]">
            Final order from {config.minFinalQuantity} cards
          </strong>
          Your selected quantity: {quantity} cards.
        </div>
        <div className="rounded-xl bg-[var(--shop-bg-soft)] px-3 py-2.5 text-xs leading-5 text-[var(--shop-text-secondary)]">
          <strong className="block text-[var(--shop-text-primary)]">
            Sample credit promise
          </strong>
          Your sample value becomes credit toward a qualifying final order.
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4 sm:flex-row">
        {sampleAvailable ? (
          <button
            type="button"
            onClick={onOrderSample}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--shop-text-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--shop-text-secondary)]"
          >
            <PackageCheck className="h-4 w-4" aria-hidden /> Order a physical
            sample
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDiscuss}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--shop-gold)] bg-white px-4 text-sm font-semibold text-[var(--shop-text-primary)] transition hover:bg-[var(--shop-gold-faint)]"
        >
          <MessageCircle
            className="h-4 w-4 text-[var(--shop-gold)]"
            aria-hidden
          />{" "}
          Discuss on WhatsApp
        </button>
      </div>
    </section>
  );
}
