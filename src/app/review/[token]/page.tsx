"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, RefreshCw, Sparkles } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LinkData {
  order_type: string;
  customer_name: string | null;
  customer_email: string | null;
  product_name: string | null;
  expired: boolean;
}

// ─── Rating helpers ───────────────────────────────────────────────────────────

const RATING_LABELS: Record<number, string> = {
  1: "We are sorry to hear that — your feedback is valuable 🙏",
  2: "Thank you for being honest — we will work to do better 💪",
  3: "Appreciate your honest take — always room to grow ✨",
  4: "Great to hear — glad you had a good experience 😊",
  5: "Absolutely loved it — thank you so much! 🎉",
};

function getPromptChips(rating: number, orderType: string): string[] {
  const isShop = orderType === "shop";

  // 1-star: hide chips — handled separately in JSX with a helper message
  if (rating === 1) return [];

  if (rating === 5) {
    return isShop
      ? [
          "Perfect print quality — every detail came out sharp",
          "Packaging was excellent, product arrived safely",
          "Exceeded expectations — worth every rupee",
          "Great communication from the team",
        ]
      : [
          "Team understood my design vision exactly",
          "Delivered on time, quality was superb",
          "Will definitely order again without hesitation",
          "Best 3D printing service I have found in India",
        ];
  }

  if (rating === 4) {
    return isShop
      ? [
          "Good quality overall, happy with the result",
          "Product looked great, minor improvements possible",
          "Smooth ordering experience from start to finish",
          "Solid service — will order again",
        ]
      : [
          "Good experience overall, would recommend",
          "Quality was solid, communication was good",
          "Happy with the final output",
          "Professional team with good execution",
        ];
  }

  if (rating === 3) {
    return [
      "Decent experience overall — a few things could be better",
      "Product was okay but packaging could improve",
      "Promising service — looking forward to future improvements",
    ];
  }

  // 2-star: constructive, not harsh
  return [
    "Had some concerns — hoping the team can improve",
    "Mixed experience — a few things did not go as expected",
    "Not fully satisfied, but I see potential here",
  ];
}

// ─── Star component ───────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className="focus:outline-none"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <motion.svg
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className={`h-10 w-10 transition-colors duration-150 ${filled ? "text-amber-400" : "text-gray-200"}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </motion.svg>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TestimonialPage() {
  const params = useParams();
  const token = (params?.token ?? "") as string;

  // Link data
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [linkLoading, setLinkLoading] = useState(true);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [shortPrompt, setShortPrompt] = useState("");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [nameError, setNameError] = useState("");

  // Honeypot
  const [website, setWebsite] = useState("");

  // Auto-scroll to body textarea after generation
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch link data for prefill ──────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetch(`/api/testimonial/${token}`)
      .then((r) => r.json())
      .then((data: LinkData) => {
        setLinkData(data);
        if (data.customer_name) setCustomerName(data.customer_name);
        if (data.customer_email) setCustomerEmail(data.customer_email);
      })
      .catch(() => setLinkData(null))
      .finally(() => setLinkLoading(false));
  }, [token]);

  // ── AI generation ────────────────────────────────────────────────────────
  const generateDraft = useCallback(
    async (prompt?: string) => {
      const input = prompt ?? shortPrompt;
      if (!rating || !input.trim()) return;
      setGenerating(true);
      try {
        const res = await fetch(`/api/review/${token}/generate-draft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating,
            customerInput: input,
            orderType: linkData?.order_type ?? "custom",
            productName: linkData?.product_name ?? null,
          }),
        });
        const data = await res.json();
        if (res.ok && data.draft) {
          setBody(data.draft);
          window.setTimeout(() => bodyRef.current?.focus(), 100);
        }
      } finally {
        setGenerating(false);
      }
    },
    [token, rating, shortPrompt, linkData],
  );

  // ── Chip click: fill short prompt + auto-generate ────────────────────────
  const handleChipClick = useCallback(
    (chip: string) => {
      setShortPrompt(chip);
      generateDraft(chip);
    },
    [generateDraft],
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setNameError("");
    if (!customerName.trim()) {
      setNameError("Your name is required");
      return;
    }
    if (!rating) return;
    if (!body.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/review/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website, // honeypot
          rating,
          title: `Testimonial from ${customerName}`,
          body,
          customerName,
          customerEmail: customerEmail || null,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  }, [token, website, rating, body, customerName, customerEmail]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (linkLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // ─── Expired ──────────────────────────────────────────────────────────────
  if (!linkData || linkData.expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-4xl">
            🔒
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Link Expired</h1>
          <p className="mt-3 text-gray-500">
            This testimonial link has expired. Please contact us and we&apos;ll
            send you a new one.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Back to FLUX3D
          </Link>
        </div>
      </div>
    );
  }

  // ─── Success ──────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100"
          >
            <Check className="h-12 w-12 text-green-600" strokeWidth={2.5} />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900">
            Thank you{customerName ? `, ${customerName.split(" ")[0]}` : ""}!
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Your testimonial has been submitted.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            It will appear on our website after a quick review. We truly
            appreciate you taking the time! 🙏
          </p>
          <div className="mt-6 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="text-2xl"
              >
                ⭐
              </motion.span>
            ))}
          </div>
          <Link
            href="/"
            className="mt-8 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Visit FLUX3D
          </Link>
        </motion.div>
      </div>
    );
  }

  const chips = rating > 0 ? getPromptChips(rating, linkData.order_type) : [];

  // ─── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm">
            F3
          </div>
          <span className="font-semibold text-gray-900">FLUX3D</span>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Share Your Experience
            </h1>
            <p className="mt-1 text-gray-500">
              Your story helps others discover us 🙏
            </p>
            {linkData.product_name && (
              <p className="mt-2 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                📦 {linkData.product_name}
              </p>
            )}
          </div>

          {/* Card container */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            {/* ── Your Details ── */}
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Your Details
              </h2>
              <div className="space-y-3">
                {/* Honeypot */}
                <input
                  type="text"
                  className="hidden"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setNameError("");
                    }}
                    placeholder="Your name"
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-100 ${
                      nameError
                        ? "border-red-400 focus:border-red-400"
                        : "border-gray-200 focus:border-indigo-400"
                    }`}
                  />
                  {nameError && (
                    <p className="mt-1 text-xs text-red-500">{nameError}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email{" "}
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </section>

            {/* ── Rating ── */}
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Your Rating
              </h2>
              <StarRating value={rating} onChange={setRating} />
              <AnimatePresence>
                {rating > 0 && (
                  <motion.p
                    key={rating}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 text-sm font-medium text-indigo-700"
                  >
                    {RATING_LABELS[rating]}
                  </motion.p>
                )}
              </AnimatePresence>
            </section>

            {/* ── Quick Prompt Chips / 1-star helper ── */}
            <AnimatePresence>
              {rating === 1 ? (
                <motion.section
                  key="one-star-helper"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-medium text-amber-800">
                      💬 Tell us what went wrong — your honest feedback helps us
                      improve 🙏
                    </p>
                    <p className="mt-1 text-xs text-amber-600">
                      Type your experience below. Our team personally reads
                      every response.
                    </p>
                  </div>
                </motion.section>
              ) : chips.length > 0 ? (
                <motion.section
                  key="chips"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                    Quick Prompts — tap to generate
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {chips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleChipClick(chip)}
                        disabled={generating}
                        className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                      >
                        {generating && shortPrompt === chip ? (
                          <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="inline h-3 w-3 mr-1" />
                        )}
                        {chip}
                      </button>
                    ))}
                  </div>
                </motion.section>
              ) : null}
            </AnimatePresence>

            {/* ── Testimonial writer ── */}
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Your Testimonial
              </h2>

              {/* Short prompt input + Generate */}
              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  value={shortPrompt}
                  onChange={(e) => setShortPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void generateDraft();
                    }
                  }}
                  placeholder="A few words... (e.g. loved the print quality and packaging)"
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => void generateDraft()}
                  disabled={generating || !shortPrompt.trim() || rating === 0}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {generating ? "Generating…" : "Generate"}
                </button>
              </div>

              {/* Body textarea */}
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Your testimonial will appear here. You can type directly or use the quick prompts above."
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />

              {/* Regenerate */}
              {body && (
                <button
                  type="button"
                  onClick={() => void generateDraft()}
                  disabled={generating || !shortPrompt.trim()}
                  className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400 transition hover:text-indigo-600 disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </button>
              )}
            </section>

            {/* ── Submit ── */}
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={
                submitting || !rating || !body.trim() || !customerName.trim()
              }
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </span>
              ) : (
                "Submit My Testimonial →"
              )}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400">
            Your testimonial will be reviewed before it appears on our site.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
