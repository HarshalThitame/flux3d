import * as Sentry from "@sentry/nextjs";
import type { LogLevel } from "./logger";

type ReportOptions = {
  level?: "error" | "warn";
  module?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
};

function isServer() {
  return typeof window === "undefined";
}

async function logToServer(
  level: LogLevel,
  message: string,
  meta: Record<string, unknown>,
) {
  if (!isServer()) return;
  try {
    const { logError, logWarn } = await import("./logger");
    if (level === "warn") {
      logWarn(message, meta);
    } else {
      logError(message, meta);
    }
  } catch {
    // Logger is server-only; fall back to console in edge cases
    console[level]("[" + (meta.module ?? "app") + "]", message, meta);
  }
}

/**
 * Reports an error to both the structured logger and Sentry. Used as the
 * replacement for silent `.catch(() => {})` fire-and-forget patterns so that
 * background failures (emails, notifications, audit logs, tracking) are
 * never invisible in production.
 */
export function reportError(
  error: unknown,
  message: string,
  options: ReportOptions = {},
) {
  const { level = "error", module = "app", tags, metadata } = options;

  // Log to structured logger (server-side only)
  void logToServer(level, message, {
    module,
    error: asError(error).message,
    metadata,
  });

  // Always log to console for visibility during development
  if (!isServer()) {
    console[level === "warn" ? "warn" : "error"](
      "[" + module + "]",
      message,
      error,
    );
  }

  if (process.env.NODE_ENV === "production") {
    Sentry.withScope((scope) => {
      if (tags) {
        for (const [key, value] of Object.entries(tags)) {
          scope.setTag(key, value);
        }
      }
      if (metadata) {
        scope.setExtras(metadata);
      }
      Sentry.captureException(asError(error));
    });
  }
}

/**
 * Fire-and-forget wrapper that never throws, reports failures via
 * reportError. Replaces `promise.catch(() => {})` in critical paths.
 */
export function safeFireAndForget(
  promise: Promise<unknown>,
  message: string,
  options: ReportOptions = {},
) {
  promise.catch((error) => reportError(error, message, options));
}

function asError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  return new Error(`Non-Error value: ${JSON.stringify(error ?? null)}`);
}

export type { LogLevel };
