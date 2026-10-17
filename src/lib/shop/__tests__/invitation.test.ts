import { describe, expect, it } from "vitest";
import {
  buildInvitationWhatsAppMessage,
  invitationSummary,
  normalizeInvitationConfig,
  validateInvitationDetails,
} from "../invitation";
import type { InvitationConfig } from "../invitation";

const config: InvitationConfig = {
  enabled: true,
  minOrderQuantity: 25,
  fields: ["hostNames", "eventDate", "venue", "rsvp", "wording"],
};

const details = {
  hostNames: "Aarav & Meera",
  eventDate: "14 December 2026",
  venue: "The Fern, Pune",
  rsvp: "Riya · 98765 43210",
  wording: "Together with their families",
};

describe("Invitation Studio helpers", () => {
  it("uses safe defaults for invalid product configuration", () => {
    expect(normalizeInvitationConfig({ enabled: "yes" })).toMatchObject({
      enabled: false,
      minOrderQuantity: 25,
    });
  });

  it("rejects final invitation cards without the production details", () => {
    expect(() =>
      validateInvitationDetails({ ...details, venue: "" }, config),
    ).toThrow("Enter the venue");
  });

  it("migrates the legacy minimum quantity without retaining sample settings", () => {
    expect(
      normalizeInvitationConfig({
        enabled: true,
        minFinalQuantity: 40,
        sampleSkuId: "not-read",
        sampleVariants: [],
        fields: config.fields,
      }),
    ).toEqual({
      enabled: true,
      minOrderQuantity: 40,
      fields: config.fields,
    });
  });

  it("keeps the readable card brief and WhatsApp brief aligned", () => {
    const summary = invitationSummary(details);
    const message = buildInvitationWhatsAppMessage({
      productName: "Royal Arch Invitation",
      productUrl: "https://flux3d.in/3d-shop/royal-arch",
      variantLabel: "Ivory · Gold",
      quantity: 100,
      details,
    });

    expect(summary).toContain("Names: Aarav & Meera");
    expect(summary).toContain("Venue: The Fern, Pune");
    expect(message).toContain("Quantity: 100");
    expect(message).toContain(summary);
  });
});
