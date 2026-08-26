import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminApiErrorResponse } from "@/lib/admin/api";
import { logAdminAction } from "@/lib/admin/auditLog";
import type { EmailSettingsRow } from "types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/email-settings
 */
export async function GET() {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("email_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    return NextResponse.json({ data: data as EmailSettingsRow | null });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}

/**
 * PUT /api/admin/email-settings
 *
 * Body: Partial<EmailSettingsRow>
 */
export async function PUT(req: Request) {
  const auth = await requireAdminRequest();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("email_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    const update: Partial<EmailSettingsRow> = { id: "default" };

    const boolFields = [
      "emails_enabled",
      "maintenance_mode",
      "pause_all_emails",
      "retry_failed",
    ] as const;

    const dynamicUpdate = update as Record<string, unknown>;
    for (const key of boolFields) {
      if (key in body) {
        dynamicUpdate[key] = Boolean(body[key]);
      }
    }

    const numberFields = ["max_retries"] as const;
    for (const key of numberFields) {
      if (key in body) {
        dynamicUpdate[key] = Number(body[key]);
      }
    }

    const stringFields = [
      "sender_name",
      "sender_email",
      "reply_to",
      "bcc",
      "cc",
      "footer",
      "timezone",
    ] as const;

    for (const key of stringFields) {
      if (key in body) {
        dynamicUpdate[key] = body[key] ? String(body[key]).trim() : null;
      }
    }

    const { data, error } = await supabase
      .from("email_settings")
      .upsert(update)
      .select()
      .single();

    if (error || !data) {
      console.error("[admin/email-settings] Upsert error:", error);
      return NextResponse.json(
        { error: error?.message ?? "Update failed" },
        { status: 500 },
      );
    }

    await logAdminAction({
      admin_id: auth.user.id,
      action: "update_email_settings",
      target_type: "setting",
      target_id: "default",
      old_value: (existing as EmailSettingsRow | null)
        ? (existing as EmailSettingsRow)
        : {},
      new_value: data as EmailSettingsRow,
    });

    return NextResponse.json({ data: data as EmailSettingsRow });
  } catch (error) {
    return getAdminApiErrorResponse(error);
  }
}
