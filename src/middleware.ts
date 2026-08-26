import type { NextRequest } from "next/server";
import { proxy } from "@/lib/middleware/proxy";

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  request.headers.set("x-request-id", requestId);

  const response = await proxy(request);
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/3d-shop/admin/:path*",
  ],
};
