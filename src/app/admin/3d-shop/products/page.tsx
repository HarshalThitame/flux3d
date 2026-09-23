import type { Metadata } from "next";
import ShopProductListClient from "@/app/admin/3d-shop/_components/ShopProductListClient";

export const metadata: Metadata = {
  title: "Products — 3D Shop Admin",
  description: "Manage your 3D printable products.",
};

export default function AdminShopProductsPage() {
  return <ShopProductListClient />;
}
