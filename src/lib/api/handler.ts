import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { reportError } from "@/lib/error-handling";
import { redactForAuditLog } from "@/lib/security/redact";

export type ApiHandler = (
  request: NextRequest,
) => Promise<NextResponse> | NextResponse;

export function withApiHandler(
  handler: ApiHandler,
  options: { module?: string; route?: string } = {},
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const start = Date.now();
    const requestId =
      request.headers.get("x-request-id") ?? crypto.randomUUID();

    try {
      const response = await handler(request);
      const duration = Date.now() - start;

      // Log successful request
      console.log(
        JSON.stringify({
          level: "info",
          module: options.module ?? "api",
          route: options.route ?? request.nextUrl.pathname,
          method: request.method,
          status: response.status,
          duration,
          requestId,
          userAgent: request.headers.get("user-agent")?.slice(0, 100),
        }),
      );

      // Propagate request ID in response
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (error) {
      const duration = Date.now() - start;

      // Log failed request
      console.error(
        JSON.stringify({
          level: "error",
          module: options.module ?? "api",
          route: options.route ?? request.nextUrl.pathname,
          method: request.method,
          status: 500,
          duration,
          requestId,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      );

      // Report to Sentry
      reportError(error, "API route error", {
        module: options.module ?? "api",
        tags: {
          route: options.route ?? request.nextUrl.pathname,
          method: request.method,
        },
      });

      // Return standardized error response with redaction
      return NextResponse.json(
        { error: "Internal server error", requestId },
        { status: 500, headers: { "x-request-id": requestId } },
      );
    }
  };
}

export function withApiHandlerForRoute(
  handler: ApiHandler,
  options?: { module?: string; route?: string },
) {
  return withApiHandler(handler, options);
}
