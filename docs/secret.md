# Secrets Reference (keep this safe — never commit to public repos)

## Sentry

| Variable | Value |
|---|---|
| `SENTRY_DSN` | `https://53c94743cf4bce1c3a0443fcf8163c77@o4511776765181952.ingest.us.sentry.io/4511776780976128` |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://53c94743cf4bce1c3a0443fcf8163c77@o4511776765181952.ingest.us.sentry.io/4511776780976128` |
| `SENTRY_ORG` | `flux3d` |
| `SENTRY_PROJECT` | `javascript-nextjs` |
| `SENTRY_AUTH_TOKEN` | `sntrys_...` (set in GitHub Actions secrets / Vercel env) |

## Vercel

| Variable | Value |
|---|---|
| `VERCEL_TOKEN` | `vcp_...` (set in GitHub Actions secrets) |
| `CRON_SECRET` | `30f52afd0c080cefcc921902dad483dcbec3d215b2743256ba9e3f6086c08a3a` |
| `SUPABASE_WEBHOOK_SECRET` | `aded32727cf9c09b879bf999caa05bffcb22686402b61ff00a662e330ffca35f` |
| `WHATSAPP_SYNC_ENABLED` | `true` |

## GitHub

| Variable | Value |
|---|---|
| `GITHUB_TOKEN` | `ghp_...` (use `GITHUB_TOKEN` from Actions context) |
| `CRON_SECRET` (Actions secret) | Same as Vercel: `30f52afd0c080cefcc921902dad483dcbec3d215b2743256ba9e3f6086c08a3a` |
| `SUPABASE_WEBHOOK_SECRET` (Actions secret) | Same as Vercel: `aded32727cf9c09b879bf999caa05bffcb22686402b61ff00a662e330ffca35f` |

## Supabase Database Webhooks (manual — 2 webhooks to create)

> ⚠️ This cannot be automated — must be configured in the Supabase Dashboard at **Project Settings → Database → Webhooks**.

### Webhook 1: shelf_products
| Field | Value |
|---|---|
| **Name** | `sync-knowledge-products` |
| **Table** | `shelf_products` |
| **Events** | INSERT, UPDATE, DELETE |
| **Webhook URL** | `https://flux3d.in/api/webhooks/supabase-product-sync` |
| **HTTP method** | POST |
| **Secret** | `aded32727cf9c09b879bf999caa05bffcb22686402b61ff00a662e330ffca35f` |

### Webhook 2: materials
| Field | Value |
|---|---|
| **Name** | `sync-knowledge-materials` |
| **Table** | `materials` |
| **Events** | INSERT, UPDATE, DELETE |
| **Webhook URL** | `https://flux3d.in/api/webhooks/supabase-product-sync` |
| **HTTP method** | POST |
| **Secret** | `aded32727cf9c09b879bf999caa05bffcb22686402b61ff00a662e330ffca35f` |

> Both webhooks point to the same endpoint — the `SUPABASE_WEBHOOK_SECRET` is the shared secret sent in the `Authorization: Bearer` header.

## Updated WhatsApp IDs
| Variable | Value |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | `1099569106574377` |
| `WABA_ID` | `1464389558768847` |
