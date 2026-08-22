# Security Policy

## Reporting a Vulnerability

We take the security of Flux3D seriously. If you discover a security
vulnerability, please report it to us privately before disclosing it publicly.

**How to report:**

- Email: **security@flux3d.in**
- Do **not** open a public GitHub issue for security vulnerabilities.
- Include as much detail as possible: affected endpoint/module, steps to
  reproduce, impact, and a suggested fix (if any).
- You will receive an acknowledgement within **72 hours** of submission.
- We aim to resolve critical issues within **14 days** of confirmation.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Production (main branch) | ✅ |
| Development (agent/** branches) | ❌ |

## Security Architecture

Flux3D follows these security principles:

- **Server-side validation** — all pricing, discounts, shipping, and payment
  amounts are calculated and verified server-side. Client-supplied financial
  values are never trusted.
- **Payment integrity** — Razorpay webhook signatures are verified with
  `crypto.timingSafeEqual`; checkout signatures are verified before any order
  is confirmed. Payment status transitions are enforced by a centralized
  state machine with full audit history.
- **Row Level Security** — database RLS is enabled on all customer-facing
  tables; users can only access their own data.
- **RBAC for admins** — granular admin roles (`is_admin`, `is_finance`,
  `is_order_manager`, `is_printer_manager`, `is_qc_manager`) gate access to
  sensitive operations like refunds and financial overrides.
- **Strict Content-Security-Policy** — nonce-based CSP with `strict-dynamic`
  prevents script injection.
- **Rate limiting** — distributed rate limiting (Upstash Redis) protects
  checkout, quote creation, webhooks, and contact endpoints.
- **Secrets management** — all secrets live in environment variables /
  platform secret stores. Never commit `.env*`, `docs/secret.md`, or API keys.

## Scope

In-scope areas include (but are not limited to):

- Authentication and session handling
- Payment processing and refund flows
- Order / quote creation and pricing integrity
- API endpoints under `/api/**`
- WhatsApp / Meta webhook handling
- File upload validation
- SQL injection and RLS bypass
- Cross-site scripting (XSS) and CSRF

Out-of-scope:

- Denial-of-service attacks
- Social engineering of Flux3D staff
- Issues in third-party dependencies already patched upstream

## Safe Harbor

We will not pursue legal action against researchers who:

1. Make a good-faith effort to avoid privacy violations and data destruction.
2. Do not exfiltrate data beyond what is necessary to demonstrate the issue.
3. Do not access systems belonging to other customers.
4. Report the vulnerability privately before public disclosure.