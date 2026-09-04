"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogIn,
  Package,
  ShoppingCart,
  Store,
  UserCircle,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getShopCartTotals, useShopCartStore } from "@/stores/shopCartStore";

type BarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: string[];
};

// Always-visible static tabs: Shop | Cart | Quote
const BAR_ITEMS: BarItem[] = [
  { href: "/3d-shop", label: "Shop", icon: Store, match: ["/3d-shop"] },
  {
    href: "/3d-shop/cart",
    label: "Cart",
    icon: ShoppingCart,
    match: ["/3d-shop/cart"],
  },
  {
    href: "/instant-quote",
    label: "Quote",
    icon: FileText,
    match: ["/instant-quote", "/saved-quotes"],
  },
];

export default function MobileBottomBar() {
  const pathname = usePathname() ?? "/";
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const loading = isAuthenticated === null;
  const shopCartCount = useShopCartStore(
    (state) => getShopCartTotals(state).itemCount,
  );

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | undefined;

    const initAuth = async () => {
      const { getSupabaseBrowserClient } =
        await import("@/lib/supabase/client");
      const supabase = getSupabaseBrowserClient();

      const { data } = await supabase.auth.getUser();
      if (mounted) setIsAuthenticated(!!data.user);

      const { data: subData } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (mounted) setIsAuthenticated(!!session?.user);
        },
      );
      subscription = subData.subscription;
    };

    initAuth();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Never render on admin or auth screens
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup")
  ) {
    return null;
  }

  const isActive = (item: BarItem) =>
    item.match.some((prefix) => pathname.startsWith(prefix));

  // 4th slot: Orders when logged in, Login when guest
  const accountItem: BarItem = isAuthenticated
    ? {
        href: "/3d-shop/orders",
        label: "Orders",
        icon: Package,
        match: ["/3d-shop/orders"],
      }
    : { href: "/login", label: "Login", icon: LogIn, match: ["/login"] };

  return (
    <nav
      aria-label="Quick navigation"
      className="mobile-bottom-bar fixed inset-x-0 bottom-0 z-[95] border-t border-black/5 bg-white/90 backdrop-blur-xl lg:hidden"
      style={{
        paddingBottom:
          "var(--safe-area-bottom, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {BAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[56px] min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? "text-[#6d28d9]" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              <span>{item.label}</span>
              {item.label === "Cart" && shopCartCount > 0 && (
                <span className="absolute right-[calc(50%-1.4rem)] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6d28d9] px-1 text-[10px] font-bold text-white">
                  {shopCartCount > 99 ? "99+" : shopCartCount}
                </span>
              )}
            </Link>
          );
        })}
        {/* Dynamic 4th tab */}
        {loading ? (
          <div className="flex min-h-[56px] min-w-[64px] flex-1 flex-col items-center justify-center gap-1.5 opacity-50">
            <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
            <div className="h-1.5 w-6 animate-pulse rounded-full bg-gray-200" />
          </div>
        ) : (
          (() => {
            const Icon = accountItem.icon;
            const active = isActive(accountItem);
            return (
              <Link
                href={accountItem.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active
                    ? "text-[#6d28d9]"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                <span>{accountItem.label}</span>
              </Link>
            );
          })()
        )}
      </div>
    </nav>
  );
}
