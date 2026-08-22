# Vercel Deployment Setup for Flux3D

## Environment Variables Needed in Vercel

Go to your Vercel project settings → Environment Variables and add:

### Required Variables — Supabase:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: Your Supabase anon/public key

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Value: Your Supabase service_role key (from Project Settings → API)
   - ⚠️ Keep this secret! Only use in server-side code.

4. **NEXT_PUBLIC_SITE_URL**
   - Value: `https://your-domain.vercel.app` (or your custom domain)

### Required Variables — Security:

5. **CSP_NONCE**
   - Value: A long random string used for the Content-Security-Policy nonce and inline JSON-LD scripts
   - ⚠️ **Rotate this per deployment.** A deterministic nonce (e.g., the public fallback `flux3d-csp-nonce-v1`) makes the CSP bypassable. Generate one with `openssl rand -base64 32`.

### Required Variables — WhatsApp AI:

5. **OPENAI_API_KEY**
   - Value: Your OpenAI API key
   - ⚠️ Keep this secret!

6. **WHATSAPP_PHONE_NUMBER_ID**
   - Value: Your WhatsApp Business API phone number ID

7. **WHATSAPP_ACCESS_TOKEN**
   - Value: Your WhatsApp permanent access token
   - ⚠️ Keep this secret!

8. **WHATSAPP_VERIFY_TOKEN**
   - Value: A random string you choose for webhook verification

9. **WHATSAPP_WEBHOOK_SECRET**
   - Value: Your Meta app secret (from Meta Developer Portal)
   - ⚠️ Keep this secret!

### Optional WhatsApp Variables (defaults shown):

| Variable | Default | Description |
|---|---|---|
| `WHATSAPP_REPLY_TO_ALL` | `true` | Reply to unrecognized senders |
| `WHATSAPP_RAG_ENABLED` | `true` | Enable knowledge base search |
| `WHATSAPP_RAG_CONFIDENCE_THRESHOLD` | `0.55` | Min confidence to use GPT |
| `WHATSAPP_OPENAI_MODEL` | `gpt-4.1-mini` | GPT model for replies |
| `WHATSAPP_CLASSIFIER_MODEL` | `gpt-4o-mini` | GPT model for intent classification |
| `WHATSAPP_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `WHATSAPP_RAG_TOP_K` | `4` | Number of RAG chunks to retrieve |
| `WHATSAPP_RAG_MIN_SCORE` | `0.3` | Minimum similarity score |
| `WHATSAPP_SESSION_TURNS` | `4` | Conversation turns to remember |
| `WHATSAPP_STRUCTURED_DATA_ENABLED` | `true` | Enable live DB price queries |

### WhatsApp HSM Templates (requires Meta business verification)

After your WhatsApp Business Account is verified, create these templates in **WhatsApp Manager → Message Templates** and add their exact names to Vercel env vars:

| Env Var | Template Body | Variables |
|---|---|---|
| `WHATSAPP_TEMPLATE_ORDER_SHIPPED` | `Your order {{1}} has been shipped via {{2}}. Tracking: {{3}}` | order #, courier, tracking # |
| `WHATSAPP_TEMPLATE_ORDER_DELIVERED` | `Your order {{1}} has been delivered. Thank you for choosing Flux3D.` | order # |
| `WHATSAPP_TEMPLATE_ORDER_CONFIRMATION` | `Order {{1}} confirmed. Total amount: {{2}}` | order #, total amount |
| `WHATSAPP_TEMPLATE_PAYMENT_LINK` | `Please complete payment for order {{1}}: {{2}}` | order #, payment URL |
| `WHATSAPP_TEMPLATE_CONNECTED` | `Hi {{1}}, your WhatsApp number has been linked to your Flux3D account. You now have {{2}} order(s) available to track.` | name, order count |

**Authentication template (optional, for WhatsApp OTP account linking):**
- Name: set in `WHATSAPP_AUTH_TEMPLATE_NAME`
- Category: Authentication
- Body: `{{1}} is your Flux3D verification code. For your security, do not share it.`

### WhatsApp Address Flow

1. Ensure a **Privacy Policy URL** is configured on BOTH:
   - Your Facebook App (App Dashboard → Settings → Basic → Privacy Policy URL)
   - Your WhatsApp Business Account (Meta Business Suite → Settings → Business info → Privacy policy URL)
   - URL must be live HTTPS (e.g., `https://flux3d.in/privacy-policy`)
2. Run: `npm run whatsapp:create-flow`
3. The script outputs a `WHATSAPP_ADDRESS_FLOW_ID` — add it to Vercel env vars.

> If publishing fails with `Integrity requirements not met` (139000/4233020), the
> account likely lacks WhatsApp Flows access yet. Verify with `npm run whatsapp:diagnose`
> and contact Meta support. See `docs/runbooks/whatsapp-ops.md`.

### Optional — Rate Limiting (falls back to in-memory):

| Variable | Description |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL for distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |

### Shiprocket Fulfilment

| Variable | Description |
|---|---|
| `SHIPROCKET_EMAIL` | Shiprocket login email |
| `SHIPROCKET_PASSWORD` | Shiprocket login password |
| `SHIPROCKET_PICKUP_LOCATION` | Pickup location code from Shiprocket panel |
| `SHIPROCKET_WEBHOOK_SECRET` | Secret for validating Shiprocket webhook signatures |

Set all four to enable automatic order fulfilment via Shiprocket.

### How to Find Supabase Values:

1. Go to your Supabase project dashboard
2. Click on **Project Settings** (gear icon)
3. Click on **API** in the sidebar
4. Copy:
   - **URL**: `https://xxxxx.supabase.co`
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - ⚠️ Keep secret!

### How to Get WhatsApp Values:

1. Go to the [Meta Developer Portal](https://developers.facebook.com/)
2. Create/select your WhatsApp Business App
3. Navigate to **WhatsApp** → **API Setup**
4. Copy:
   - **Phone Number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - **Temporary Access Token** → `WHATSAPP_ACCESS_TOKEN` (generate a permanent token via the Meta Business Platform)
5. Set up your webhook URL: `https://your-domain.vercel.app/api/whatsapp`
6. Choose a **Verify Token** → `WHATSAPP_VERIFY_TOKEN`
7. Copy your **App Secret** from the app dashboard → `WHATSAPP_WEBHOOK_SECRET`

## Supabase Table Setup

Run all migration files in `supabase/migrations/` in order using the Supabase SQL Editor. The key WhatsApp-related tables:

- `whatsapp_webhook_events` — webhook idempotency and dedup
- `whatsapp_messages` — message history
- `whatsapp_knowledge_chunks` — RAG knowledge base with vector embeddings
- `whatsapp_rag_answer_audits` — AI reply audit trail
- `whatsapp_sessions` — conversation memory

## Steps to Deploy:

1. **Add environment variables** in Vercel (as listed above)
2. **Run all migrations** in `supabase/migrations/` in Supabase SQL Editor
3. **Sync seed knowledge**: Run `npm run whatsapp:rag:sync` to populate the knowledge base
4. **Configure WhatsApp webhook** in Meta Developer Portal pointing to `https://your-domain.vercel.app/api/whatsapp`
5. **Deploy** — Push to Git and Vercel will auto-deploy
6. **Verify** — Visit `/admin/whatsapp-test` for diagnostics
7. **Test** — Send a WhatsApp message to the business number

## Troubleshooting:

### "Missing SUPABASE_SERVICE_ROLE_KEY"
- Make sure you added the variable in Vercel project settings
- Redeploy after adding variables (they don't apply to ongoing builds)
- Check that the variable name is exactly: `SUPABASE_SERVICE_ROLE_KEY`

### WhatsApp webhook returns 403
- Verify `WHATSAPP_VERIFY_TOKEN` matches the token in Meta Developer Portal
- Check `META_APP_SECRET` or `WHATSAPP_WEBHOOK_SECRET` is correctly set

### GPT replies not working
- Verify `OPENAI_API_KEY` is set and has credits
- Check `/admin/whatsapp-test` for all green checks

### Still having issues?
```bash
curl https://your-domain.vercel.app/api/admin/whatsapp-test
```

## Maintenance & Operations

See `docs/runbooks/whatsapp-ops.md` for the full runbook. Quick commands:

```bash
npm run whatsapp:diagnose       # Full WhatsApp infra health check
npm run whatsapp:templates      # Reconcile message templates (idempotent)
npm run whatsapp:create-flow    # Create + publish the address Flow
npm run whatsapp:verify-phone   # Re-verify phone (fixes EXPIRED status)
```
