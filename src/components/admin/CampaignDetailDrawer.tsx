"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  AlertCircle,
  Target,
  IndianRupee,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  Megaphone,
} from "lucide-react";
import AdsetsList from "./AdsetsList";

type CampaignDetail = {
  id: string;
  name: string;
  objective: string;
  status: string;
  effective_status: string;
  daily_budget?: string;
  budget_remaining?: string;
  created_time: string;
  updated_time: string;
  adsets?: { data?: Array<Record<string, unknown>> };
};

type InsightPoint = {
  label: string;
  spend: number;
  impressions: number;
  clicks: number;
};

export default function CampaignDetailDrawer({
  campaignId,
  onClose,
}: {
  campaignId: string | null;
  onClose: () => void;
}) {
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [insights, setInsights] = useState<InsightPoint[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [loading, setLoading] = useState(() => false);
  const [error, setError] = useState<string | null>(null);
  const [showAdsets, setShowAdsets] = useState(true);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;

    fetch(`/api/admin/ads/campaigns/${campaignId}`)
      .then((res) => res.json())
      .then((data: { campaign?: CampaignDetail; error?: string }) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setCampaign(data.campaign ?? null);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Fetch insights
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Loading state must be set before async fetch
    setInsightsLoading(true);
    fetch(`/api/admin/ads/campaigns/${campaignId}/insights`)
      .then((res) => res.json())
      .then((data: { points?: InsightPoint[]; error?: string }) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setInsights(data.points ?? []);
      })
      .catch(() => {
        // Non-critical
      })
      .finally(() => {
        if (!cancelled) setInsightsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  return (
    <AnimatePresence>
      {campaignId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
            data-lenis-prevent
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/80 px-6 py-4 backdrop-blur">
              <h2 className="text-lg font-semibold text-[#0F1B3D]">
                Campaign Details
              </h2>
              <button
                onClick={onClose}
                aria-label="Close campaign details"
                className="rounded-lg p-2 text-[#6F7192] hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-[#6d28d9] animate-spin" />
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-rose-400/20 bg-rose-50 p-4 text-sm text-rose-600 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              {!loading && !error && campaign && (
                <>
                  {/* Campaign Info Card */}
                  <div className="rounded-2xl border border-[rgba(109,40,217,0.15)] bg-white p-5">
                    <h3 className="font-semibold text-[#0F1B3D] text-lg">
                      {campaign.name}
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm text-[#6F7192]">
                        <Target className="w-4 h-4" />
                        <span>{campaign.objective.replace(/_/g, " ")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#6F7192]">
                        <IndianRupee className="w-4 h-4" />
                        <span>
                          {campaign.daily_budget
                            ? `₹${(Number(campaign.daily_budget) / 100).toLocaleString("en-IN")}/day`
                            : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#6F7192]">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(campaign.created_time).toLocaleDateString(
                            "en-IN",
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#6F7192]">
                        <Layers className="w-4 h-4" />
                        <span>
                          {campaign.adsets?.data?.length ?? 0} ad sets
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <a
                        href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=${campaign.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#6d28d9] px-3 py-2 text-xs font-medium text-white hover:bg-[#4c1d95] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open in Ads Manager
                      </a>
                    </div>
                  </div>

                  {/* Insights Section */}
                  <div className="rounded-2xl border border-[rgba(109,40,217,0.12)] bg-white p-5">
                    <h3 className="text-sm font-semibold text-[#0F1B3D] mb-3">
                      7-Day Performance
                    </h3>
                    {insightsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 text-[#6d28d9] animate-spin" />
                      </div>
                    ) : insights.length === 0 ? (
                      <p className="text-sm text-[#6F7192]">
                        No insights available for this period.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-xs text-[#6F7192] uppercase tracking-wider">
                            Spend
                          </div>
                          <div className="mt-1 text-lg font-bold text-[#0F1B3D]">
                            ₹
                            {Math.round(
                              insights.reduce((s, p) => s + p.spend, 0),
                            ).toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-[#6F7192] uppercase tracking-wider">
                            Impressions
                          </div>
                          <div className="mt-1 text-lg font-bold text-[#0F1B3D]">
                            {insights
                              .reduce((s, p) => s + p.impressions, 0)
                              .toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-[#6F7192] uppercase tracking-wider">
                            Clicks
                          </div>
                          <div className="mt-1 text-lg font-bold text-[#0F1B3D]">
                            {insights
                              .reduce((s, p) => s + p.clicks, 0)
                              .toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ad Sets Section */}
                  <div>
                    <button
                      onClick={() => setShowAdsets((v) => !v)}
                      className="flex items-center gap-2 text-sm font-semibold text-[#0F1B3D] mb-3"
                    >
                      <Megaphone className="w-4 h-4 text-[#6d28d9]" />
                      Ad Sets
                      {showAdsets ? (
                        <ChevronUp className="w-4 h-4 text-[#6F7192]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#6F7192]" />
                      )}
                    </button>

                    <AnimatePresence>
                      {showAdsets && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <AdsetsList
                            adsets={
                              (campaign.adsets?.data ?? []) as Array<
                                Record<string, unknown>
                              >
                            }
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
