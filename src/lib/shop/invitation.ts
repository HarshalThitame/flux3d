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
  /** Legacy fallback. New products must use sampleVariants. */
  sampleSkuId: string | null;
  minFinalQuantity: number;
  creditExpiryDays: number;
  fields: InvitationFieldKey[];
  sampleVariants: InvitationSampleVariant[];
};

export type InvitationSampleVariant = {
  /** The final-card SKU that this physical sample can be redeemed against. */
  finalSkuId: string;
  sampleSkuId: string;
  /** Null inherits the product-wide minimum. */
  minFinalQuantity: number | null;
  /** Null inherits the product-wide credit expiry. */
  creditExpiryDays: number | null;
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
  sampleSkuId: null,
  minFinalQuantity: 25,
  creditExpiryDays: 90,
  fields: ["hostNames", "eventDate", "venue", "rsvp", "wording"],
  sampleVariants: [],
};

const configSchema = z.object({
  enabled: z.boolean().default(false),
  sampleSkuId: z.string().uuid().nullable().default(null),
  minFinalQuantity: z.number().int().min(1).max(10000).default(25),
  creditExpiryDays: z.number().int().min(1).max(365).default(90),
  fields: z
    .array(z.enum(invitationFieldKeys))
    .min(1)
    .max(invitationFieldKeys.length)
    .default(DEFAULT_INVITATION_CONFIG.fields),
  sampleVariants: z
    .array(
      z.object({
        finalSkuId: z.string().uuid(),
        sampleSkuId: z.string().uuid(),
        minFinalQuantity: z
          .number()
          .int()
          .min(1)
          .max(10000)
          .nullable()
          .default(null),
        creditExpiryDays: z
          .number()
          .int()
          .min(1)
          .max(365)
          .nullable()
          .default(null),
      }),
    )
    .max(100)
    .default([]),
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
  const variants = parsed.data.sampleVariants.filter(
    (variant, index, all) =>
      variant.finalSkuId !== variant.sampleSkuId &&
      all.findIndex(
        (candidate) => candidate.finalSkuId === variant.finalSkuId,
      ) === index,
  );
  return {
    ...DEFAULT_INVITATION_CONFIG,
    ...parsed.data,
    sampleVariants: variants,
  };
}

/** Finds the exact sample policy for the selected final-card SKU.
 * The legacy single-SKU setting remains a temporary fallback for existing products.
 */
export function getInvitationSampleVariant(
  config: InvitationConfig,
  finalSkuId: string,
): InvitationSampleVariant | null {
  return (
    config.sampleVariants.find(
      (variant) => variant.finalSkuId === finalSkuId,
    ) ??
    (config.sampleSkuId
      ? {
          finalSkuId,
          sampleSkuId: config.sampleSkuId,
          minFinalQuantity: null,
          creditExpiryDays: null,
        }
      : null)
  );
}

export function getInvitationVariantPolicy(
  config: InvitationConfig,
  finalSkuId: string,
) {
  const variant = getInvitationSampleVariant(config, finalSkuId);
  return {
    variant,
    minFinalQuantity: variant?.minFinalQuantity ?? config.minFinalQuantity,
    creditExpiryDays: variant?.creditExpiryDays ?? config.creditExpiryDays,
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
  if (!details.hostNames)
    throw new Error("Enter the names for the invitation.");
  if (!details.eventDate) throw new Error("Enter the event date.");
  if (!details.venue) throw new Error("Enter the venue.");
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
