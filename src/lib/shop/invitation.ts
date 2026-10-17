import { z } from "zod";

export const invitationFieldKeys = [
  "hostNames",
  "eventDate",
  "venue",
  "rsvp",
  "wording",
] as const;

export type InvitationFieldKey = (typeof invitationFieldKeys)[number];

export type InvitationConfig = {
  enabled: boolean;
  /** Minimum number of final cards that may be checked out together. */
  minOrderQuantity: number;
  fields: InvitationFieldKey[];
};

export type InvitationDetails = {
  hostNames: string;
  eventDate: string;
  venue: string;
  rsvp: string;
  wording: string;
};

export const DEFAULT_INVITATION_CONFIG: InvitationConfig = {
  enabled: false,
  minOrderQuantity: 25,
  fields: ["hostNames", "eventDate", "venue", "rsvp", "wording"],
};

const configSchema = z.object({
  enabled: z.boolean().default(false),
  minOrderQuantity: z.number().int().min(1).max(10000).optional(),
  // Compatibility input for existing product rows. New writes only use
  // minOrderQuantity and the cleanup migration removes this legacy key.
  minFinalQuantity: z.number().int().min(1).max(10000).optional(),
  fields: z
    .array(z.enum(invitationFieldKeys))
    .min(1)
    .max(invitationFieldKeys.length)
    .default(DEFAULT_INVITATION_CONFIG.fields),
});

export const invitationDetailsSchema = z.object({
  hostNames: z.string().trim().max(120).default(""),
  eventDate: z.string().trim().max(80).default(""),
  venue: z.string().trim().max(240).default(""),
  rsvp: z.string().trim().max(160).default(""),
  wording: z.string().trim().max(600).default(""),
});

export function normalizeInvitationConfig(value: unknown): InvitationConfig {
  const parsed = configSchema.safeParse(value);
  if (!parsed.success) return DEFAULT_INVITATION_CONFIG;
  return {
    ...DEFAULT_INVITATION_CONFIG,
    enabled: parsed.data.enabled,
    minOrderQuantity:
      parsed.data.minOrderQuantity ??
      parsed.data.minFinalQuantity ??
      DEFAULT_INVITATION_CONFIG.minOrderQuantity,
    fields: parsed.data.fields,
  };
}

export function normalizeInvitationDetails(
  value: unknown,
): InvitationDetails | null {
  const parsed = invitationDetailsSchema.safeParse(value);
  if (!parsed.success) return null;
  const details = parsed.data;
  return Object.values(details).some(Boolean) ? details : null;
}

export function validateInvitationDetails(
  value: unknown,
  config: InvitationConfig,
): InvitationDetails {
  const parsed = invitationDetailsSchema.safeParse(value);
  if (!parsed.success) throw new Error("Please check the invitation details.");
  const details = parsed.data;
  if (config.fields.includes("hostNames") && !details.hostNames)
    throw new Error("Enter the names for the invitation.");
  if (config.fields.includes("eventDate") && !details.eventDate)
    throw new Error("Enter the event date.");
  if (config.fields.includes("venue") && !details.venue)
    throw new Error("Enter the venue.");
  if (config.fields.includes("wording") && !details.wording) {
    throw new Error("Enter the invitation wording.");
  }
  return details;
}

const detailLabels: Record<InvitationFieldKey, string> = {
  hostNames: "Names",
  eventDate: "Date",
  venue: "Venue",
  rsvp: "RSVP",
  wording: "Wording",
};

export function invitationSummary(details: InvitationDetails | null): string {
  if (!details) return "";
  return invitationFieldKeys
    .map((key) => (details[key] ? `${detailLabels[key]}: ${details[key]}` : ""))
    .filter(Boolean)
    .join(" · ");
}

export function buildInvitationWhatsAppMessage(input: {
  productName: string;
  productUrl: string;
  variantLabel: string;
  quantity: number;
  details: InvitationDetails;
}) {
  const summary = invitationSummary(input.details);
  return [
    "Hi FLUX3D, I would like to discuss this custom invitation.",
    `Design: ${input.productName}`,
    input.variantLabel ? `Options: ${input.variantLabel}` : "",
    `Quantity: ${input.quantity}`,
    summary ? `Details: ${summary}` : "",
    `Product: ${input.productUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}
