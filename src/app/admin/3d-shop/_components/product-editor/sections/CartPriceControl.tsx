"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, Plus, Trash2 } from "lucide-react";
import { useProductEditor } from "../editor-context";
import { Section } from "../ui";
import {
  resolveCartUnitPrice,
  type CartPriceRule,
} from "@/lib/shop/cart-price-rules";

type RuleDraft = {
  name: string;
  adjustment_type: "percentage" | "fixed_amount";
  direction: "increase" | "decrease";
  adjustment_value: string;
  min_unit_price: string;
  priority: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const freshRule = (): RuleDraft => ({
  name: "",
  adjustment_type: "percentage",
  direction: "decrease",
  adjustment_value: "",
  min_unit_price: "0",
  priority: "10",
  starts_at: "",
  ends_at: "",
  is_active: true,
});

function status(rule: CartPriceRule) {
  const now = Date.now();
  if (!rule.is_active) return "Paused";
  if (rule.starts_at && new Date(rule.starts_at).getTime() > now)
    return "Scheduled";
  if (rule.ends_at && new Date(rule.ends_at).getTime() <= now) return "Expired";
  return "Live";
}

export function CartPriceControl() {
  const { product, skus, setToast } = useProductEditor();
  const [rules, setRules] = useState<CartPriceRule[]>([]);
  const [form, setForm] = useState(freshRule);
  const [busy, setBusy] = useState(false);
  const productId = product.id;

  async function loadRules() {
    if (!productId) return;
    const response = await fetch(
      `/api/3d-shop/admin/products/${productId}/cart-price-rules`,
    );
    const data = (await response.json().catch(() => ({}))) as {
      rules?: CartPriceRule[];
      error?: string;
    };
    if (!response.ok)
      throw new Error(data.error || "Could not load cart price rules.");
    setRules(data.rules ?? []);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRules().catch((error) =>
        setToast({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not load cart price rules.",
        }),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(
    () =>
      skus.slice(0, 5).map((sku) => ({
        sku,
        adjustment: resolveCartUnitPrice(Number(sku.price ?? 0), {
          id: "preview",
          product_id: productId ?? "",
          name: form.name || "Draft rule",
          adjustment_type: form.adjustment_type,
          direction: form.direction,
          adjustment_value: Number(form.adjustment_value || 0),
          min_unit_price: Number(form.min_unit_price || 0),
          priority: Number(form.priority || 0),
          starts_at: null,
          ends_at: null,
          is_active: true,
        }),
      })),
    [skus, form, productId],
  );

  async function createRule() {
    if (!productId) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/3d-shop/admin/products/${productId}/cart-price-rules`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            adjustment_value: Number(form.adjustment_value),
            min_unit_price: Number(form.min_unit_price),
            priority: Number(form.priority),
            starts_at: form.starts_at
              ? new Date(form.starts_at).toISOString()
              : null,
            ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not create rule.");
      setForm(freshRule());
      await loadRules();
      setToast({ type: "success", message: "Cart price rule saved." });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Could not create rule.",
      });
    } finally {
      setBusy(false);
    }
  }
  async function patchRule(
    rule: CartPriceRule,
    patch: Record<string, unknown>,
  ) {
    if (!productId) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/3d-shop/admin/products/${productId}/cart-price-rules`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: rule.id, ...patch }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not update rule.");
      await loadRules();
      setToast({ type: "success", message: "Cart price rule updated." });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Could not update rule.",
      });
    } finally {
      setBusy(false);
    }
  }
  async function deleteRule(rule: CartPriceRule) {
    if (!productId || !window.confirm(`Delete "${rule.name}"?`)) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/3d-shop/admin/products/${productId}/cart-price-rules?id=${rule.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Could not delete rule.");
      await loadRules();
      setToast({ type: "success", message: "Cart price rule deleted." });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Could not delete rule.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      title="Cart Price Control"
      description="Apply a scheduled percentage or fixed increase/decrease to every SKU without changing its catalog price."
    >
      {!productId ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Save this product before adding cart price rules.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 rounded-2xl border border-violet-200 bg-violet-50/40 p-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Campaign name"
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            />
            <select
              value={form.adjustment_type}
              onChange={(event) =>
                setForm({
                  ...form,
                  adjustment_type: event.target.value as
                    "percentage" | "fixed_amount",
                })
              }
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed per unit</option>
            </select>
            <select
              value={form.direction}
              onChange={(event) =>
                setForm({
                  ...form,
                  direction: event.target.value as "increase" | "decrease",
                })
              }
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="decrease">Decrease</option>
              <option value="increase">Increase</option>
            </select>
            <input
              value={form.adjustment_value}
              onChange={(event) =>
                setForm({ ...form, adjustment_value: event.target.value })
              }
              type="number"
              min="0.01"
              step="0.01"
              placeholder={
                form.adjustment_type === "percentage" ? "Percent" : "Amount (₹)"
              }
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={form.min_unit_price}
              onChange={(event) =>
                setForm({ ...form, min_unit_price: event.target.value })
              }
              type="number"
              min="0"
              step="0.01"
              placeholder="Minimum unit price"
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value })
              }
              type="number"
              min="0"
              step="1"
              placeholder="Priority"
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            />
            <label className="text-xs text-[#6F7192]">
              Starts
              <input
                value={form.starts_at}
                onChange={(event) =>
                  setForm({ ...form, starts_at: event.target.value })
                }
                type="datetime-local"
                className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#0F1B3D]"
              />
            </label>
            <label className="text-xs text-[#6F7192]">
              Ends
              <input
                value={form.ends_at}
                onChange={(event) =>
                  setForm({ ...form, ends_at: event.target.value })
                }
                type="datetime-local"
                className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#0F1B3D]"
              />
            </label>
            <button
              type="button"
              disabled={busy || !form.name || !form.adjustment_value}
              onClick={() => void createRule()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 xl:col-span-4"
            >
              <Plus className="h-4 w-4" />
              Create scheduled price rule
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-[#0F1B3D]">
              SKU impact preview
            </div>
            {preview.length ? (
              preview.map(({ sku, adjustment }) => (
                <div
                  key={sku.id}
                  className="flex items-center justify-between border-b border-gray-100 px-4 py-2 text-sm last:border-0"
                >
                  <span className="text-[#6F7192]">{sku.sku_code}</span>
                  <span>
                    ₹{Number(sku.price).toFixed(2)} →{" "}
                    <strong>
                      ₹
                      {adjustment?.adjustedUnitPrice.toFixed(2) ??
                        Number(sku.price).toFixed(2)}
                    </strong>
                  </span>
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-[#6F7192]">
                Add SKUs to preview pricing impact.
              </p>
            )}
          </div>
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
              >
                <span className="min-w-36 font-semibold text-[#0F1B3D]">
                  {rule.name}
                </span>
                <span className="rounded-full bg-violet-50 px-2 py-1 text-xs text-violet-700">
                  {status(rule)}
                </span>
                <span className="text-sm text-[#6F7192]">
                  {rule.direction === "decrease" ? "−" : "+"}
                  {rule.adjustment_value}
                  {rule.adjustment_type === "percentage" ? "%" : " ₹"} · min ₹
                  {rule.min_unit_price} · priority {rule.priority}
                </span>
                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void patchRule(rule, { is_active: !rule.is_active })
                    }
                    className="rounded-lg p-2 text-[#6F7192] hover:bg-gray-100"
                    aria-label={rule.is_active ? "Pause rule" : "Activate rule"}
                  >
                    {rule.is_active ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteRule(rule)}
                    className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                    aria-label="Delete rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {rules.length === 0 && (
              <p className="text-sm text-[#6F7192]">No cart price rules yet.</p>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}
