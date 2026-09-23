import {
  AlertTriangle,
  CheckCircle2,
  FilePenLine,
  Package,
} from "lucide-react";
import type { ShopProduct } from "@/lib/shop/admin-types";
import { tabCounts } from "./product-list-utils";

export function ProductKpiBar({
  products,
  loading,
}: {
  products: ShopProduct[];
  loading: boolean;
}) {
  if (loading)
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-pulse">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  const counts = tabCounts(products);
  const cards = [
    {
      label: "Total Products",
      value: counts.all,
      icon: Package,
      tone: "bg-violet-100 text-violet-700",
    },
    {
      label: "Active",
      value: counts.active,
      icon: CheckCircle2,
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Draft",
      value: counts.draft,
      icon: FilePenLine,
      tone: "bg-amber-100 text-amber-700",
    },
    {
      label: "Out of Stock",
      value: products.filter(
        (product) => product.stock_status === "Out of Stock",
      ).length,
      icon: AlertTriangle,
      tone: "bg-rose-100 text-rose-700",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <div
          key={label}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className={`rounded-xl p-2.5 ${tone}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-2xl font-bold text-[#0F1B3D]">{value}</span>
          </div>
          <p className="mt-3 text-sm font-medium text-[#6F7192]">{label}</p>
        </div>
      ))}
    </div>
  );
}
