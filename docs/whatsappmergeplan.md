# WhatsApp Guest Orders ↔ Website Account Linking — Feasibility Analysis

Verdict: **Feasible, but Direction B has a compliance blocker as written.**

This is an analysis of the plan in `Downloads/whatsapp_website_account_linking_plan.md`. It focuses on the WhatsApp Business API side, which is the part that introduces hard external constraints not covered by the plan.

---

## What works

- **Direction A (WhatsApp → website)** is fully compliant.
  - The post-order "want to save this to your account?" prompt is a free-form reply *inside the 24h service window*; the customer just placed an order, so they initiated contact. Free-form replies work there.
  - The proving mechanism is a magic **link via email** + password login, which is entirely outside WhatsApp's policy surface. No WhatsApp opt-in needed.
  - Enumeration defense (identical WhatsApp reply whether or not the email is registered) is correct.
- **The security model is sound** and matches what banks/telecoms use for cross-channel identity linking:
  - Never merge on a typed match alone.
  - Enumeration-safe replies.
  - Single-use tokens with TTL.
  - Cross-account mismatch rejection.
  - Audit logging on `link_requests`.
- The data model is fine as written (`users.phone`, `orders.phone` retained permanently, `link_requests` with `confirmed_at`/token).

## The blocker: Direction B (website → WhatsApp OTP)

The plan says step 3 is *"Backend sends an OTP via WhatsApp to that number."* Research on Meta's Cloud API policy shows two hard requirements this skips.

### 1. Opt-in is mandatory before the first business-initiated message — including authentication/OTP templates.

Sources: MessageBird, CM.com, Dualhook, and Wati documentation all state that Meta's Business Messaging Policy requires collecting opt-in **before** sending any authentication message — even an initial verification. Key quotes:

> "The single most important compliance requirement is proper opt-in. Meta is explicit: you must obtain opt-in outside of WhatsApp before sending any proactive messages."

> "Per the WhatsApp Business Messaging Policy, you must collect opt-in before sending any authentication message — even an initial verification."

> "Businesses can only send templates to users who have confirmed their subscription to receive messages via WhatsApp."

A customer merely typing their number into your website is **not** an automatic opt-in. If your business sends the *first* WhatsApp message to a number that never opted in, the account gets throttled or blocked. The safe fix the providers suggest:

> "Present a clear choice ('WhatsApp / SMS / email') rather than defaulting to WhatsApp. Document the choice. The selection is the opt-in."

**Action:** Add an explicit WhatsApp opt-in capture at the moment the customer enters their number ("Yes, send me a WhatsApp verification code" checkbox). That click is the valid opt-in.

### 2. The number must actually be a WhatsApp number; you can't know this before sending.

- The number must be registered on WhatsApp and must **not** already be linked to the WhatsApp Business app (it must be a *dedicated* business number).
- You cannot know whether a number has WhatsApp before you attempt to send.
- For non-WhatsApp numbers or delivery failures, the OTP is silently lost — the customer cannot complete the link, and the flow deadlocks without a fallback.

The plan claims the WhatsApp channel "proves control of that specific WhatsApp number." As a security property, that's true *once a message is delivered*: an attacker entering a victim's number won't receive the OTP on the victim's phone. But it silently fails for numbers that aren't WhatsApp-registered.

**Action:** Provide an SMS (or email) OTP fallback when WhatsApp delivery fails, and make the fallback the opt-in path.

## Setup prerequisites (cost/complexity not in the plan)

These are required to send or receive any WhatsApp Business messages at all:

- **Meta Business verification** + a **dedicated phone number** (cannot be on the WhatsApp app already) + an **approved authentication template**.
  - Authentication templates have a fixed format (OTP variable + optional copy-code/autofill button). Approval is usually fast (~15 min to 24h).
  - The on-premises WhatsApp API is dead (sunset Oct 2025); the **Cloud API is the only path**.
- A **public HTTPS webhook endpoint** to receive inbound WhatsApp messages (the "guest places order via WhatsApp bot" flow depends on this). Your platform must expose a stable TLS endpoint reachable by Meta.
- **Messaging limits**: new portfolios start at 250 unique recipients/24h; business verification lifts this to 1,000, then scales up by quality rating. Not a blocker, but a real early throttle.
- **Per-message billing** in the Authentication category ($0.0014–$0.055/message depending on recipient country). Direction B OTPs are billable sends; Direction A uses email (not billed by WhatsApp).

## Minor notes

- **Recycled-phone risk (Direction B):** A WhatsApp account can outlive the SIM. The Cloud API offers an **identity-hash binding** that detects when the recipient's WhatsApp account has changed. If you keep Direction B, wire this in to avoid delivering an OTP to a recycled-number holder.
- **Proactive guest order status over WhatsApp:** The plan assumes order status updates "still work via WhatsApp regardless of linking." Proactive status pushes to guests require **utility templates + opt-in** (not free-form), unless the customer is actively messaging the bot. Outside the 24h window, free-form status updates will fail with Graph error `131047`. Minor gap if you intend to *push* status, but not part of the core linking feature.
- **Direction A typo safety:** Correct — a typo just means no magic link arrives; no data risk, and the customer retries.
- **Orders retention:** Correct to keep `orders.phone` permanently even after `user_id` is set, so support can always trace by phone.

## Summary of recommended fixes before building

1. **Direction B only:** Add an explicit WhatsApp opt-in checkbox before sending the first OTP.
2. **Direction B only:** Add SMS/email OTP fallback for numbers that aren't WhatsApp-registered or where delivery fails.
3. Confirm you have/will stand up: Meta Business verification, dedicated phone number, approved Authentication template, and a public HTTPS webhook endpoint.
4. (Optional, hardening) Wire in the WhatsApp identity-hash binding for Direction B to handle recycled numbers.

Direction A needs none of these fixes because it proves identity via email magic links + password login, which is fully outside WhatsApp's policy surface.
