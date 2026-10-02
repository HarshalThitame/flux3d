import type { ShopOrderItem } from "./orders";
import type { ShopPricingSnapshot } from "./pricing";
import type { ShopMoney } from "./financials";

export type ShopPriceSnapshot = ShopPricingSnapshot & {
  version: 2;
  currency: "INR";
  money: ShopMoney;
  cgst_percent: number;
  sgst_percent: number;
  promotions: Array<{
    table: "shelf_coupons" | "coupons" | "offers";
    id: string;
    code: string | null;
    discountType: string | null;
    discountValue: number;
    discountPaise: number;
  }>;
  delivery_rule_id: string | null;
  delivery_threshold: number;
  default_delivery_charge: number;
};

export type ShopQuote = {
  items: ShopOrderItem[];
  snapshot: ShopPriceSnapshot;
  fingerprint: string;
  estimated: boolean;
  destination: { pincode: string; state: string } | null;
  couponCode: string | null;
  offerId: string | null;
  offerLabel: string | null;
};
