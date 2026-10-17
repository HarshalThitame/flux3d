import { describe, expect, it } from "vitest";
import { isQuoteValidationError } from "@/lib/shop/quote-validation";

describe("isQuoteValidationError", () => {
  it("classifies an invitation minimum as a customer validation error", () => {
    expect(
      isQuoteValidationError("Invitation orders require at least 25 cards."),
    ).toBe(true);
  });

  it("does not classify an unexpected infrastructure error as validation", () => {
    expect(isQuoteValidationError("Unable to reach the database.")).toBe(false);
  });
});
