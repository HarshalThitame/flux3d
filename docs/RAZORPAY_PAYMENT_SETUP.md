# Razorpay Payment Setup - Flux 3D

Date: 2026-07-18

## Overview

Flux3D now uses Razorpay Standard Checkout for both shop orders and custom quote payments.
All payment creation, signature verification, webhook processing, and refund actions run on the server.

## Required Environment Variables

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_ENVIRONMENT=test|live`
- `RAZORPAY_PAYMENTS_ENABLED=true|false`

## Razorpay Dashboard Setup

1. Create separate test and live API keys.
2. Set the checkout key ID in the matching deployment environment. Use `RAZORPAY_KEY_ID` as the primary variable.
3. Configure the webhook endpoint:
   - `https://<your-domain>/api/webhooks/razorpay`
4. Enable the events used by Flux3D:
   - payment authorized
   - payment captured
   - payment failed
   - order paid
   - payment link paid (`payment_link.paid` — required for WhatsApp payment-link orders,
     otherwise paid links stay stuck in `pending` and no confirmation is sent)
   - refund created
   - refund processed
   - refund failed
5. Copy the webhook secret into the matching deployment environment.

## Deployment Notes

- Keep test and live credentials separate.
- Never expose the key secret or webhook secret to browser code.
- Deploy with `RAZORPAY_PAYMENTS_ENABLED=false` only if you need to temporarily stop new checkout creation.

## Operational Checks

- Confirm `/api/payments/razorpay/create-order` returns a Razorpay order only for the server-calculated amount.
- Confirm `/api/payments/razorpay/verify` only marks the payment after signature verification and order/payment matching.
- Confirm `/api/webhooks/razorpay` accepts raw-body signed webhook events and deduplicates event IDs.
- Confirm historical PayU order records are still readable in admin views, but no new PayU checkout is exposed.
