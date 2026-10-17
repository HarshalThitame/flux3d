/** Returns true when a quote error is safe to show as a customer correction. */
export function isQuoteValidationError(message: string) {
  return /cart|quantity|SKU|coupon|promotion|pincode|product|stock|delivery|Sign in|minimum|at least/i.test(
    message,
  );
}
