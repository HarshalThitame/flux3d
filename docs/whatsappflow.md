# WhatsApp ↔ Website Account Linking Flows

## Overview
Two directions for linking a WhatsApp number to a Flux3D website account.

---

## Direction B: Website → WhatsApp (User starts on website)

**Trigger:** User is logged into Flux3D on web, visits Profile page.

### Flow 1: Email Magic Link (default)

```
1. User opens Profile page
   └─ Sees "Connect WhatsApp" card

2. User enters phone (+91 98765 43210)
   └─ Checks "I agree to receive WhatsApp messages"
   └─ Clicks "Send confirmation link"

3. System creates link_request (method=email_magic_link, 15-min TTL)
   └─ Sends email to user's registered email
   └─ Email contains: "Confirm and link account" button → /link/confirm?token=xyz

4. User clicks email link (on any device)
   └─ Lands on /link/confirm page
   └─ Sees: "This link will connect WhatsApp number +91 98765 43210 to Sarah"
   └─ Clicks "Confirm and link account"

5. System:
   └─ Consumes token (single-use)
   └─ Runs merge RPC → reassigns past shelf_orders + orders by phone
   └─ Updates profile: phone_verified=true, whatsapp_opt_in=true, phone_canonical=919876543210
   └─ Records consent_log (account_linking + whatsapp_messaging)

6. Redirects to /profile?linked=whatsapp
   └─ User sees: "WhatsApp  +91 98765 43210  [Change] [Unlink]"
```

### Flow 2: WhatsApp OTP (when `WHATSAPP_AUTH_TEMPLATE_NAME` configured + user opts in)

```
1. Same steps 1-2 above, but user checks opt-in checkbox

2. System creates link_request (method=whatsapp_otp)
   └─ Generates 6-digit OTP → hashes it → stores in link_requests.otp_code_hash
   └─ Sends via WhatsApp Cloud API using Meta Authentication template

3. User receives WhatsApp message: "Your Flux3D verification code: 123456"

4. UI switches to OTP input screen (/link/verify-otp or inline)
   └─ User enters 6-digit code
   └─ Clicks "Verify and Link Account"

5. System verifies OTP (timing-safe hash compare)
   └─ If valid: same merge + profile update as Flow 1
   └─ Redirects to profile with success
```

---

## Direction A: WhatsApp → Website (User starts on WhatsApp)

**Trigger:** User sends message to Flux3D WhatsApp business number.

```
1. User sends: "link my account" (or "connect", "save to account")

2. Bot detects intent=link_account (via detectWhatsAppIntent regex)
   └─ Calls handleAccountLinkWhatsApp()

3. Turn 1 - Bot replies:
   "Sure — to link this WhatsApp number to your website account,
   please reply with the email you use to log in."

4. User replies with email: "raj@gmail.com"

5. Turn 2 - Bot:
   └─ Validates email format
   └─ Looks up profile by email (enumeration-safe: same reply either way)
   └─ If found:
        - Creates link_request (initiated_from=whatsapp, method=email_magic_link)
        - Sends magic-link email to that email
        - Replies: "We've sent a confirmation link to raj@gmail.com.
          Click it to link this WhatsApp number to your account."
   └─ If not found:
        - Replies same generic message (enumeration-safe)

6. User clicks email link → same /link/confirm flow as Direction B
```

---

## Post-Linking: Profile UI

```
Connected accounts
WhatsApp  +91 98765 43210
[Change]  [Unlink]
```

| Action | What Happens |
|--------|--------------|
| **Change** | Opens form to enter new WhatsApp number → repeats Flow 1 or 2 |
| **Unlink** | Clears phone_verified, whatsapp_opt_in, phone_canonical → records consent withdrawal |

---

## Auto-Link (Google Sign-In)

```
1. User signs in with Google (email: raj@gmail.com)
2. Auth callback runs autoLinkGoogleToWhatsApp()
3. Finds profile with same email + phone_verified=true + whatsapp_opt_in=true
4. If found (different user_id):
   - Runs merge RPC → reassigns orders to WhatsApp-linked account
   - Updates Google user's profile with WhatsApp phone data
5. User now has Google auth + WhatsApp-linked data seamlessly
```

---

## Key Technical Details

| Component | Purpose |
|-----------|---------|
| `link_requests` table | Single-use tokens/OTPs (15-min TTL, one active per phone) |
| `consent_log` | DPDP audit trail (granted/withdrawn, method, timestamp) |
| `account_linking_merge_to_user(uid, phone)` | Atomic RPC: reassigns shelf_orders + orders by last-10-digit phone match |
| `phone_canonical` | Digits-only phone (e.g., "919876543210") for cross-table matching |
| Rate limit | 5 requests/hour per phone + per email on link endpoints |
| TTL cleanup | Cron job deletes expired unconfirmed requests (>24h) |
| Retention purge | `purge_old_records()` includes link_requests + consent_log (90-day default) |

---

## 24-Hour Window Guard (Direction A)

- **Current:** On-demand only (user initiates) → always inside 24h window
- **Future proactive prompts:** Require Meta Authentication template + opt-in + rate limit
- See `docs/24h-window-guard.md` for rules