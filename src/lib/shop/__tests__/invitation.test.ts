import { describe, expect, it } from "vitest";
import {
  buildInvitationWhatsAppMessage,
  getInvitationSampleVariant,
  getInvitationVariantPolicy,
  invitationSummary,
  normalizeInvitationConfig,
  validateInvitationDetails,
} from "../invitation";
import type { InvitationConfig } from "../invitation";

const config: InvitationConfig = {
  enabled: true,
  sampleSkuId: "0f8fad5b-d9cb-469f-a165-70867728950e",
  minFinalQuantity: 25,
  creditExpiryDays: 90,
  fields: ["hostNames", "eventDate", "venue", "rsvp", "wording"],
  sampleVariants: [],
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
      minFinalQuantity: 25,
      creditExpiryDays: 90,
    });
  });

  it("rejects final invitation cards without the production details", () => {
    expect(() =>
      validateInvitationDetails({ ...details, venue: "" }, config),
    ).toThrow("Enter the venue");
  });

  it("maps each sample to its matching final SKU and inherits defaults", () => {
    const finalSkuId = "11111111-1111-4111-8111-111111111111";
    const sampleSkuId = "22222222-2222-4222-8222-222222222222";
    const mapped = {
      ...config,
      sampleVariants: [
        {
          finalSkuId,
          sampleSkuId,
          minFinalQuantity: null,
          creditExpiryDays: 30,
        },
      ],
    };
    expect(getInvitationSampleVariant(mapped, finalSkuId)?.sampleSkuId).toBe(
      sampleSkuId,
    );
    expect(
      getInvitationSampleVariant(mapped, "33333333-3333-4333-8333-333333333333")
        ?.sampleSkuId,
    ).toBe(config.sampleSkuId);
    expect(getInvitationVariantPolicy(mapped, finalSkuId)).toMatchObject({
      minFinalQuantity: 25,
      creditExpiryDays: 30,
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
