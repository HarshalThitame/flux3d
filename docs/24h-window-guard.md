# WhatsApp 24h Service Window Guard

## What is the 24h window?

The WhatsApp Cloud API provides a **24-hour free-form messaging window** after a customer sends a message to your business. Outside this window, only **template messages** (pre-approved by Meta) can be sent.

## Impact on Direction-A (WhatsApp-initiated) account linking

The current Phase 2 implementation uses **on-demand** account linking: the customer initiates the flow by sending "link my account" within the 24h window. This is safe because the customer is replying to a WhatsApp message they received (or sent), so the business is within the 24h window.

## Future proactive Direction-A prompts

A future enhancement may want to proactively prompt customers to link their accounts (e.g., after an order is placed). This would require:

1. **A Meta Authentication template** — approved by Meta, sent outside the 24h window
2. **Customer opt-in** — the customer must have opted in to receive WhatsApp messages
3. **24h-window awareness** — if the customer's last WhatsApp interaction was >24h ago, the prompt cannot be sent as a free-form message; it must use a template

## Guard rules for future proactive prompts

- **Never send a proactive WhatsApp prompt outside the 24h window** without a pre-approved template
- **Always check `WHATSAPP_AUTH_TEMPLATE_NAME`** is configured before sending any proactive WhatsApp message
- **Always respect opt-in** — only send to customers who have `whatsapp_opt_in = true` on their profile
- **Log all proactive prompts** to `whatsapp_messages` with `automated = true` and `trigger_event = 'proactive_account_link_prompt'`
- **Rate limit** proactive prompts per phone number (reuse `rateLimitCheck`)

## References

- Meta Business Messaging Policy: https://developers.facebook.com/docs/whatsapp/cloud-api/policies
- Authentication templates: https://developers.facebook.com/docs/whatsapp/cloud-api/message-templates/authentication