"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
  ArrowRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LinkData {
  order_type: string;
  customer_name: string | null;
  customer_email: string | null;
  product_name: string | null;
  expired: boolean;
}

// ─── Rating helpers ──────────────────────────────────────────────────────────

const RATING_META: Record<
  number,
  { label: string; color: string; bg: string; emoji: string }
> = {
  1: {
    label: "We are sorry to hear that — your feedback is valuable",
    color: "text-red-600",
    bg: "bg-red-50 border-red-100",
    emoji: "🙏",
  },
  2: {
    label: "Thank you for being honest — we will work to do better",
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-100",
    emoji: "💪",
  },
  3: {
    label: "Appreciate your honest take — always room to grow",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-100",
    emoji: "✨",
  },
  4: {
    label: "Great to hear — glad you had a good experience",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-100",
    emoji: "😊",
  },
  5: {
    label: "Absolutely loved it — thank you so much",
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-100",
    emoji: "🎉",
  },
};

function getPromptChips(rating: number, orderType: string): string[] {
  const isShop = orderType === "shop";
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
  return [
    "Had some concerns — hoping the team can improve",
    "Mixed experience — a few things did not go as expected",
    "Not fully satisfied, but I see potential here",
  ];
}

// ─── Star Rating Component ────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= active;
        return (
          <motion.button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            whileHover={{ scale: 1.25, y: -4 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="focus:outline-none"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              className={`h-12 w-12 transition-all duration-200 drop-shadow-sm ${
                filled
                  ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                  : "fill-gray-100 text-gray-300"
              }`}
            />
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Floating Label Input ─────────────────────────────────────────────────────

function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
  optional = false,
  error = "",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  optional?: boolean;
  error?: string;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={lifted ? placeholder : ""}
        className={`peer w-full rounded-2xl border bg-white/80 px-4 pb-3 pt-6 text-sm text-gray-900 outline-none backdrop-blur-sm transition-all duration-200 ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
            : focused
              ? "border-indigo-300 ring-2 ring-indigo-100 shadow-sm"
              : "border-gray-200 hover:border-gray-300"
        }`}
      />
      <label
        className={`pointer-events-none absolute left-4 font-medium transition-all duration-200 ${
          lifted
            ? "top-2 text-[10px] tracking-widest uppercase"
            : "top-1/2 -translate-y-1/2 text-sm"
        } ${error ? "text-red-500" : focused ? "text-indigo-500" : "text-gray-400"}`}
      >
        {label}
        {optional && (
          <span className="ml-1 normal-case tracking-normal font-normal text-gray-300">
            (optional)
          </span>
        )}
      </label>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 pl-1 text-xs text-red-500"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TestimonialPage() {
  const params = useParams();
  const token = (params?.token ?? "") as string;

  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [linkLoading, setLinkLoading] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [shortPrompt, setShortPrompt] = useState("");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [nameError, setNameError] = useState("");
  const [website, setWebsite] = useState("");

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const writeRef = useRef<HTMLDivElement>(null);

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

  // Scroll to writing section when rating is selected
  useEffect(() => {
    if (rating > 0) {
      window.setTimeout(() => {
        writeRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    }
  }, [rating]);

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

  const handleChipClick = useCallback(
    (chip: string) => {
      setShortPrompt(chip);
      generateDraft(chip);
    },
    [generateDraft],
  );

  const handleSubmit = useCallback(async () => {
    setNameError("");
    if (!customerName.trim()) {
      setNameError("Your name is required");
      return;
    }
    if (!rating || !body.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/review/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website,
          rating,
          title: `Testimonial from ${customerName}`,
          body,
          customerName,
          customerEmail: customerEmail || null,
        }),
      });
      if (res.ok) setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [token, website, rating, body, customerName, customerEmail]);

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (linkLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-white font-black text-lg">F</span>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
        </div>
      </div>
    );
  }

  // ─── Expired ───────────────────────────────────────────────────────────────
  if (!linkData || linkData.expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gray-100 text-5xl shadow-inner">
            🔒
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Link Expired</h1>
          <p className="mt-3 text-gray-500 leading-relaxed">
            This testimonial link has expired. Please contact us and we&apos;ll
            send you a fresh one.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 hover:shadow-indigo-300"
          >
            Back to FLUX3D <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  // ─── Success ───────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.15,
              type: "spring",
              stiffness: 250,
              damping: 20,
            }}
            className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-200"
          >
            <Check className="h-14 w-14 text-white" strokeWidth={2.5} />
          </motion.div>

          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Thank you{customerName ? `, ${customerName.split(" ")[0]}` : ""}!
          </h1>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Your testimonial has been submitted and is under review.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            We truly appreciate you taking the time. 🙏
          </p>

          <div className="mt-6 flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.07, type: "spring" }}
                className="text-2xl"
              >
                ⭐
              </motion.span>
            ))}
          </div>

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
          >
            Explore FLUX3D <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  const chips = rating > 0 ? getPromptChips(rating, linkData.order_type) : [];
  const meta = rating > 0 ? RATING_META[rating] : null;

  // ─── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Honeypot */}
      <input
        type="text"
        className="hidden"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
      />

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 border-b border-gray-100/80 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
              <span className="text-xs font-black text-white">F3</span>
            </div>
            <span className="text-sm font-bold text-gray-900 tracking-tight">
              FLUX3D
            </span>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-indigo-500">
            Testimonial
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-5 pb-20 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-5"
        >
          {/* ── Hero heading ── */}
          <div className="text-center pb-2">
            {linkData.product_name && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 mb-5"
              >
                <span className="text-xs">📦</span>
                <span className="text-xs font-semibold text-indigo-700 tracking-wide">
                  {linkData.product_name}
                </span>
              </motion.div>
            )}
            <h1 className="text-4xl font-black tracking-tight text-gray-900 leading-tight">
              How was your
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                FLUX3D experience?
              </span>
            </h1>
            <p className="mt-3 text-gray-500 text-base">
              Your story helps others make confident decisions 🙏
            </p>
          </div>

          {/* ── Section 1: Details ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm shadow-gray-100"
          >
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
                1
              </div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                About You
              </h2>
            </div>
            <div className="space-y-3.5">
              <FloatingInput
                label="Your Name"
                value={customerName}
                onChange={(v) => {
                  setCustomerName(v);
                  setNameError("");
                }}
                error={nameError}
                placeholder="e.g. Rahul Sharma"
              />
              <FloatingInput
                label="Email Address"
                value={customerEmail}
                onChange={setCustomerEmail}
                type="email"
                optional
                placeholder="your@email.com"
              />
            </div>
          </motion.div>

          {/* ── Section 2: Rating ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm shadow-gray-100"
          >
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
                2
              </div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                Your Rating
              </h2>
            </div>

            <StarRating value={rating} onChange={setRating} />

            <AnimatePresence mode="wait">
              {meta && (
                <motion.div
                  key={rating}
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className={`mt-4 flex items-center gap-2 rounded-2xl border px-4 py-3 ${meta.bg}`}
                >
                  <span className="text-lg">{meta.emoji}</span>
                  <p className={`text-sm font-semibold ${meta.color}`}>
                    {meta.label}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Section 3: Write testimonial ── */}
          <AnimatePresence>
            {rating > 0 && (
              <motion.div
                ref={writeRef}
                key="write-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.35 }}
                className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm shadow-gray-100"
              >
                <div className="mb-5 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
                    3
                  </div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                    Your Testimonial
                  </h2>
                </div>

                {/* 1-star helper */}
                {rating === 1 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5"
                  >
                    <p className="text-sm font-semibold text-amber-800">
                      💬 Tell us what went wrong
                    </p>
                    <p className="mt-1 text-xs text-amber-600 leading-relaxed">
                      Your honest feedback helps us improve. Our team personally
                      reads every response.
                    </p>
                  </motion.div>
                ) : (
                  <>
                    {/* Quick prompt chips */}
                    <div className="mb-4">
                      <p className="mb-2.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                        ✨ Quick prompts — tap to generate
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {chips.map((chip) => (
                          <motion.button
                            key={chip}
                            type="button"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleChipClick(chip)}
                            disabled={generating}
                            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
                              shortPrompt === chip && generating
                                ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                                : "border-gray-200 bg-gray-50 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                            }`}
                          >
                            {generating && shortPrompt === chip ? (
                              <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="inline h-3 w-3 mr-1 text-indigo-400" />
                            )}
                            {chip}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Custom prompt row */}
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
                        placeholder="Or type a few words and let AI write for you…"
                        className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 outline-none transition hover:border-gray-300 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400"
                      />
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => void generateDraft()}
                        disabled={generating || !shortPrompt.trim()}
                        className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-40"
                      >
                        {generating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {generating ? "Writing…" : "Generate"}
                      </motion.button>
                    </div>
                  </>
                )}

                {/* Textarea */}
                <div className="relative">
                  {generating && !body && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                        <p className="text-xs text-gray-400 font-medium">
                          AI is writing your testimonial…
                        </p>
                      </div>
                    </div>
                  )}
                  <textarea
                    ref={bodyRef}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                    placeholder={
                      rating === 1
                        ? "Share what went wrong and what could have been better…"
                        : "Your testimonial will appear here. You can also write directly — no need to use AI."
                    }
                    className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm leading-relaxed text-gray-800 outline-none transition hover:border-gray-300 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400"
                  />
                </div>

                {/* Char count + regenerate */}
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    {body && shortPrompt && (
                      <button
                        type="button"
                        onClick={() => void generateDraft()}
                        disabled={generating}
                        className="flex items-center gap-1.5 text-xs text-gray-400 transition hover:text-indigo-600 disabled:opacity-40"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Regenerate
                      </button>
                    )}
                  </div>
                  <span
                    className={`text-xs tabular-nums ${body.length > 500 ? "text-amber-500" : "text-gray-300"}`}
                  >
                    {body.length} / 600
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Submit button ── */}
          <AnimatePresence>
            {rating > 0 && (
              <motion.div
                key="submit"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
              >
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => void handleSubmit()}
                  disabled={
                    submitting ||
                    !rating ||
                    !body.trim() ||
                    !customerName.trim()
                  }
                  className="w-full rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 py-4 text-sm font-bold text-white shadow-xl shadow-indigo-200 transition-all hover:shadow-indigo-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Submit My Testimonial
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </motion.button>

                <p className="mt-3 text-center text-xs text-gray-400">
                  Your testimonial is reviewed before it appears on our site
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
