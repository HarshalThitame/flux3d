# Flux3D Email Management System (EMS) — Implementation Plan

**Status:** Completed (all 5 phases implemented)  
**Goal:** Replace all hardcoded React Email templates with a database-driven, admin-editable Email Management System inside the admin panel.  
**Approach:** HTML string templates stored in DB + variable replacement engine + branded wrapper + admin UI.  
**Decision:** React Email components fully deleted — no fallback remaining.  

---

## Architecture Overview

```
Business Event (e.g., ORDER_CREATED)
          │
          ▼
   email_automation_rules
          │
          ▼
     email_templates (DB)
          │
          ▼
    template-engine.ts
    ({{variable}} replacement)
          │
          ▼
    template-wrapper.ts
    (branded header/footer)
          │
          ▼
       Resend API
          │
          ▼
       email_logs
       email_events
       email_queue
```

---

## Session Strategy

Implemented **one phase per Kimi session** across 6 sessions.

| Session | Phase | Deliverable | Status |
|---|---|---|---|
| **Session 1** | Phase 0 — Database | Migration + schema ready | ✅ Complete |
| **Session 2** | Phase 1 — Backend | Engine + API routes + seed script | ✅ Complete |
| **Session 3** | Phase 2 — Templates UI | Templates list, Editor, Branding pages | ✅ Complete |
| **Session 4** | Phase 3 — Dashboard & Logs | Dashboard, Logs, Queue, Analytics pages | ✅ Complete |
| **Session 5** | Phase 4 — Automation | Rules, Test Sender, Settings pages | ✅ Complete |
| **Session 6** | Phase 5 — Advanced | Versioning, Matrix, Attachments, Cleanup | ✅ Complete |

---

## Phase 0 — Database Foundation

### New Tables

#### 1. `email_templates` (Editable CMS Templates)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| `name` | TEXT NOT NULL | Human-readable name |
| `email_type` | TEXT NOT NULL | Matches `EmailType` enum |
| `category` | TEXT NOT NULL | `transactional` \| `marketing` \| `support` \| `admin` \| `system` |
| `subject` | TEXT NOT NULL | Supports `{{variables}}` |
| `html_body` | TEXT NOT NULL | Full HTML string |
| `plain_text` | TEXT | Auto-generated fallback |
| `variables` | JSONB NOT NULL DEFAULT '[]' | Array of required variable names |
| `is_enabled` | BOOLEAN NOT NULL DEFAULT TRUE | Admin toggle |
| `is_system` | BOOLEAN NOT NULL DEFAULT FALSE | Protects built-in templates |
| `description` | TEXT | Internal admin note |
| `created_by` | UUID REFERENCES profiles(id) ON DELETE SET NULL | |
| `updated_by` | UUID REFERENCES profiles(id) ON DELETE SET NULL | |
| `created_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

**Constraints:**
- Unique on `email_type` for system templates (one template per event type)

**RLS Policies:**
- Admins: full CRUD
- Users: no access

#### 2. `email_template_versions` (Version History)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| `template_id` | UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE | |
| `version_number` | INTEGER NOT NULL | Sequential (1, 2, 3...) |
| `subject` | TEXT | |
| `html_body` | TEXT | |
| `plain_text` | TEXT | |
| `variables` | JSONB | |
| `editor_id` | UUID REFERENCES profiles(id) ON DELETE SET NULL | |
| `created_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

**Index:** `template_id, version_number DESC`

#### 3. `email_automation_rules` (Event-Driven Rules)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| `event_name` | TEXT NOT NULL | e.g. `order_created`, `payment_success`, `order_shipped` |
| `template_id` | UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE | Which template to send |
| `target_audience` | TEXT NOT NULL | `customer` \| `admin` \| `both` |
| `delay_minutes` | INTEGER NOT NULL DEFAULT 0 | 0 = immediate |
| `is_enabled` | BOOLEAN NOT NULL DEFAULT TRUE | |
| `conditions` | JSONB NULL DEFAULT '{}' | Future: `{ order_total_min: 500 }` |
| `priority` | INTEGER NOT NULL DEFAULT 0 | Higher = earlier in queue |
| `created_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

**Index:** `event_name, is_enabled`

#### 4. `email_queue` (Explicit Queue for Retry/Control)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PRIMARY KEY DEFAULT gen_random_uuid() | |
| `log_id` | UUID REFERENCES email_logs(id) ON DELETE SET NULL | Links to audit trail |
| `template_id` | UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE | |
| `recipient` | TEXT NOT NULL | |
| `variables` | JSONB NOT NULL DEFAULT '{}' | Snapshot of variables at enqueue time |
| `status` | TEXT NOT NULL | `queued` \| `sending` \| `sent` \| `delivered` \| `failed` \| `cancelled` |
| `priority` | INTEGER NOT NULL DEFAULT 0 | |
| `scheduled_at` | TIMESTAMPTZ NULL | For delayed sends |
| `retry_count` | INTEGER NOT NULL DEFAULT 0 | |
| `max_retries` | INTEGER NOT NULL DEFAULT 3 | |
| `error_message` | TEXT | |
| `created_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

**Indexes:** `status, scheduled_at, template_id, created_at DESC`

#### 5. `email_branding` (Dedicated Branding Table)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PRIMARY KEY DEFAULT 'default' | Single row system |
| `logo_url` | TEXT | |
| `company_name` | TEXT | |
| `address` | TEXT | Full address block |
| `gst_number` | TEXT | |
| `support_email` | TEXT | |
| `support_phone` | TEXT | |
| `primary_color` | TEXT DEFAULT '#FF5C1A' | |
| `secondary_color` | TEXT DEFAULT '#39BDF8' | |
| `accent_color` | TEXT | |
| `footer_text` | TEXT | |
| `social_icons` | JSONB DEFAULT '{}' | `{ instagram, facebook, linkedin, twitter, youtube }` |
| `dark_mode_css` | TEXT | Injected `<style>` for dark mode |
| `header_html` | TEXT | Optional custom header HTML |
| `footer_html` | TEXT | Optional custom footer HTML |
| `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

#### 6. `email_settings` (Global Toggles)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PRIMARY KEY DEFAULT 'default' | Single row system |
| `emails_enabled` | BOOLEAN NOT NULL DEFAULT TRUE | Global kill-switch |
| `maintenance_mode` | BOOLEAN NOT NULL DEFAULT FALSE | |
| `pause_all_emails` | BOOLEAN NOT NULL DEFAULT FALSE | |
| `retry_failed` | BOOLEAN NOT NULL DEFAULT TRUE | |
| `max_retries` | INTEGER NOT NULL DEFAULT 3 | |
| `sender_name` | TEXT | |
| `sender_email` | TEXT | |
| `reply_to` | TEXT | |
| `bcc` | TEXT | Comma-separated |
| `cc` | TEXT | Comma-separated |
| `footer` | TEXT | Global footer appended to all emails |
| `timezone` | TEXT DEFAULT 'Asia/Kolkata' | |
| `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

### Alter Existing Tables

```sql
-- Link logs to templates
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variables_used JSONB,
  ADD COLUMN IF NOT EXISTS queue_id UUID REFERENCES public.email_queue(id) ON DELETE SET NULL;
```

### Migration Files

**`supabase/migrations/20260801000000_email_management_system.sql`**
- Create all 6 tables
- Add indexes (status, email_type, category, scheduled_at, log_id, template_id, event_name, version_number)
- Add RLS policies (admin CRUD, users no access)
- Add `updated_at` triggers
- Add table/column comments
- Alter `email_logs`

**`supabase/migrations/20260729000000_email_attachments_bucket.sql`**
- Create `email-attachments` Supabase Storage bucket
- Add RLS policies for storage

---

## Phase 1 — Backend Engine & Migration

### 1.1 Variable Replacement Engine

**File:** `src/lib/email/template-engine.ts`

```typescript
export function replaceVariables(html, variables): string
export function extractMissingVariables(html, variables): string[]
export function generatePlainText(html): string
```

**Features:**
- Replace `{{variable_name}}` with values
- HTML-escape all values to prevent XSS
- Auto-generate `plainText` from HTML via `html-to-text`

**New dependency:** `html-to-text`

### 1.2 Branded Wrapper

**File:** `src/lib/email/template-wrapper.ts`

```typescript
export function getEmailBranding(): Promise<EmailBrandingRow>
export function wrapTemplate(bodyHtml, branding?): string
```

**Wraps every email with:**
- Branded header (logo + company name)
- Branded footer (address, GST, support links, social icons)
- Dark mode CSS via media query
- Global footer text from `email_settings`
- Primary/secondary/accent colors

### 1.3 Dispatch Refactor

**File:** `src/lib/email/dispatcher.ts`

**New flow:**
1. Look up `email_templates` by `email_type` via `db-templates.ts`
2. If template is disabled OR `email_settings.pause_all_emails` = true → log skip, return
3. Fetch `email_branding` + `email_settings`
4. Replace variables using `template-engine.ts`
5. Wrap with branded header/footer using `template-wrapper.ts`
6. Send via Resend API
7. Update `email_logs` with `template_id` and `variables_used`

**Note:** No React Email fallback — DB templates are the sole source.

### 1.4 DB Template Helpers

**File:** `src/lib/email/db-templates.ts`

```typescript
export async function getTemplateByType(emailType: string): Promise<EmailTemplateRow | null>
export async function getTemplateById(id: string): Promise<EmailTemplateRow | null>
export async function renderDbTemplate(template, variables, branding?): Promise<{ html: string; missingVariables: string[] }>
```

### 1.5 Seed Script

**File:** `src/lib/email/seed-system-templates.ts`

Converts all 14 existing email types into DB rows with HTML skeletons.

| Template | email_type | Category |
|---|---|---|
| Welcome | `welcome` | `transactional` |
| Email Verification | `email_verification` | `transactional` |
| Password Reset | `password_reset` | `transactional` |
| Order Placed (Customer) | `order_placed_customer` | `transactional` |
| Order Placed (Admin) | `order_placed_admin` | `admin` |
| Payment Receipt | `payment_receipt` | `transactional` |
| Payment Failed | `payment_failed` | `transactional` |
| Refund Issued | `refund_issued` | `transactional` |
| Model Validation Pass | `model_validation_pass` | `transactional` |
| Model Validation Fail | `model_validation_fail` | `transactional` |
| Production Started | `production_started` | `transactional` |
| Order Shipped | `order_shipped` | `transactional` |
| Delivery Confirmation | `delivery_confirmation` | `transactional` |
| Contact Notification | `contact_notification` | `support` |

**Run:** `npx tsx src/lib/email/seed-system-templates.ts`

Also seeds default automation rules for all events.

### 1.6 API Routes

All routes protected with `requireAdminRequest()`.

| Route | Method | Description |
|---|---|---|
| `/api/admin/email-templates` | GET / POST | List / create templates |
| `/api/admin/email-templates/[id]` | GET / PUT / DELETE | Get / update / delete |
| `/api/admin/email-templates/[id]/duplicate` | POST | Clone template |
| `/api/admin/email-templates/[id]/versions` | GET | List version history |
| `/api/admin/email-templates/[id]/versions/[vid]/restore` | POST | Restore version |
| `/api/admin/email-templates/[id]/preview` | POST | Render preview |
| `/api/admin/email-templates/[id]/test` | POST | Send test email |
| `/api/admin/email-branding` | GET / PUT | Branding config |
| `/api/admin/email-settings` | GET / PUT | Global settings |
| `/api/admin/email-queue` | GET | List queue |
| `/api/admin/email-queue/[id]/retry` | POST | Retry email |
| `/api/admin/email-queue/[id]/cancel` | POST | Cancel email |
| `/api/admin/email-automation-rules` | GET / POST | List / create rules |
| `/api/admin/email-automation-rules/[id]` | PUT / DELETE | Update / delete rule |
| `/api/admin/email-automation-rules/matrix` | GET / POST | Notification matrix |
| `/api/admin/email-analytics` | GET | Aggregated stats |
| `/api/admin/email-dashboard` | GET | Dashboard metrics |
| `/api/admin/email-attachments` | GET / POST | List / upload attachments |
| `/api/admin/email-attachments/[filename]` | DELETE | Delete attachment |

### 1.7 Types

**File:** `types/email-system.ts` — re-exports from `types/database.ts`

---

## Phase 2 — Admin UI: Templates, Branding & Editor

### 2.1 Navigation Update

**File:** `src/lib/admin/nav-config.ts`

Replaced single "Email Logs" with **Email Center** tab group:
```
Dashboard → Templates → Branding → Logs → Queue → Automation → Test → Analytics → Settings
```

### 2.2 Templates List Page

**Route:** `/admin/emails/templates`

**Features:**
- Grid / list view toggle
- Search by name or email_type
- Filter by category and status
- Inline enable/disable toggle
- Duplicate, Test, Preview actions
- Pagination

### 2.3 Template Editor Page

**Route:** `/admin/emails/templates/[id]/edit`

**Layout:** Split-pane (sidebar left, HTML editor center, live preview right)

**Components:**
- `TemplateEditor.tsx` — Layout container with header actions
- `HtmlEditor.tsx` — Dark-themed textarea with synced line numbers
- `VariableAutocomplete.tsx` — Detects `{{` and shows dropdown
- `LivePreview.tsx` — Iframe with desktop/mobile toggle + light/dark toggle
- `TemplateSidebar.tsx` — Metadata, variables list, version history with restore/compare

### 2.4 Branding Page

**Route:** `/admin/emails/branding`

**Features:**
- Logo upload via `/api/admin/upload-branding`
- Company info, colors, social links
- Custom header/footer HTML
- Live preview panel

---

## Phase 3 — Admin UI: Dashboard, Logs, Queue, Analytics

### 3.1 Email Dashboard

**Route:** `/admin/emails`

**Metrics:**
- Emails sent today, success rate, failed count
- Queue size, avg delivery time
- Open rate, click rate
- Most used template, failed templates
- 7-day history line chart

### 3.2 Enhanced Email Logs

**Route:** `/admin/emails/logs`

**Features:**
- Multi-status filter chips
- Recipient/template search, date range
- Expandable detail rows (variables, provider message ID, errors)
- Resend action with hard-bounce guard
- Pagination

### 3.3 Email Queue

**Route:** `/admin/emails/queue`

**Features:**
- Status filter, pagination
- Color-coded status badges
- Retry and Cancel actions
- Template name display

### 3.4 Analytics Page

**Route:** `/admin/emails/analytics`

**Features:**
- Time range selector (today / 7d / 30d / custom)
- Rate pills (delivery, open, click, bounce)
- Donut charts (bounce rate, failure rate)
- `LineChartCard` showing email activity over time
- Top templates by volume + most opened templates
- Error state with retry button

---

## Phase 4 — Automation Rules, Test Emails, Settings

### 4.1 Automation Rules Page

**Route:** `/admin/emails/automation`

**Features:**
- List grouped by event name with expand/collapse
- Rule builder modal: event dropdown, template dropdown, audience, delay, priority, toggle
- Inline enable/disable, edit, delete

### 4.2 Test Email Sender

**Route:** `/admin/emails/test`

**Features:**
- Template selector dropdown
- Recipient email input
- Dynamic variable inputs based on template metadata
- Preview in iframe via `/api/admin/email-templates/[id]/preview`
- Send via `/api/admin/email-templates/[id]/test`
- Success feedback with messageId

### 4.3 Email Settings Page

**Route:** `/admin/emails/settings`

**Fields:**
- Enable Emails, Maintenance Mode, Pause All Emails, Retry Failed
- Max Retry, Sender Name, Sender Email, Reply-To, BCC, CC
- Global Footer Text, Timezone

---

## Phase 5 — Advanced Features & Cleanup

### 5.1 Template Versioning

- Auto-save version on every PUT to `/api/admin/email-templates/[id]`
- `TemplateSidebar` lists versions with restore + compare buttons
- `VersionCompareModal` shows side-by-side rendered HTML preview

### 5.2 Notification Matrix

**Route:** `/admin/emails/matrix`

- Interactive toggle table for 13 business events
- Toggles `is_enabled` on automation rules
- Creates new rules automatically when enabling for the first time

### 5.3 Attachment Manager

**Route:** `/admin/emails/attachments`

- Upload/manage PDFs, images to `email-attachments` Supabase Storage bucket
- Template editor shows attachment chips → click to insert `{{attachment:filename}}`
- Dispatcher resolves placeholders, fetches base64 from storage, attaches to Resend email

### 5.4 React Email Cleanup

**Deleted:**
- `src/lib/email/templates/` directory (all 14 React Email components)
- `src/lib/email/template-registry.ts`
- `@react-email/components` and `@react-email/render` from `package.json`

**Updated:**
- `src/lib/email/dispatcher.ts` — removed React fallback, uses DB templates exclusively

---

## Migration Strategy & Rollback Plan

### Deployment Steps (Completed)

| Step | Action | Status |
|---|---|---|
| 1 | Run Phase 0 DB migration | ✅ Applied |
| 2 | Deploy Phase 1 backend code | ✅ Merged |
| 3 | Run `npx tsx src/lib/email/seed-system-templates.ts` | ✅ Seeded |
| 4 | Deploy Phase 2–4 admin UI | ✅ Merged |
| 5 | Deploy Phase 5 cleanup + advanced features | ✅ Merged |

### Backward Compatibility

- `email_logs.template_id` is nullable — old logs remain valid
- No React Email fallback — DB templates are the sole source

---

## Dependencies

| Package | Purpose |
|---|---|
| `html-to-text` | Auto-generate plain text from HTML templates |
| `@types/html-to-text` | TypeScript types for html-to-text |

**No WYSIWYG or drag-and-drop library.** Textarea + variable autocomplete is sufficient. Future enhancements can add a block builder.

---

## File Manifest

### Database
```
supabase/migrations/20260801000000_email_management_system.sql
supabase/migrations/20260729000000_email_attachments_bucket.sql
```

### Backend
```
src/lib/email/template-engine.ts
src/lib/email/template-wrapper.ts
src/lib/email/db-templates.ts
src/lib/email/seed-system-templates.ts
src/lib/email/variables.ts
src/lib/email/attachments.ts

src/app/api/admin/email-templates/route.ts
src/app/api/admin/email-templates/[id]/route.ts
src/app/api/admin/email-templates/[id]/duplicate/route.ts
src/app/api/admin/email-templates/[id]/versions/route.ts
src/app/api/admin/email-templates/[id]/versions/[vid]/restore/route.ts
src/app/api/admin/email-templates/[id]/preview/route.ts
src/app/api/admin/email-templates/[id]/test/route.ts

src/app/api/admin/email-branding/route.ts
src/app/api/admin/email-settings/route.ts

src/app/api/admin/email-queue/route.ts
src/app/api/admin/email-queue/[id]/retry/route.ts
src/app/api/admin/email-queue/[id]/cancel/route.ts

src/app/api/admin/email-automation-rules/route.ts
src/app/api/admin/email-automation-rules/[id]/route.ts
src/app/api/admin/email-automation-rules/matrix/route.ts

src/app/api/admin/email-analytics/route.ts
src/app/api/admin/email-dashboard/route.ts

src/app/api/admin/email-attachments/route.ts
src/app/api/admin/email-attachments/[filename]/route.ts
```

### Admin Pages
```
src/app/admin/emails/page.tsx                    (dashboard)
src/app/admin/emails/templates/page.tsx
src/app/admin/emails/templates/new/page.tsx
src/app/admin/emails/templates/[id]/edit/page.tsx
src/app/admin/emails/branding/page.tsx
src/app/admin/emails/logs/page.tsx
src/app/admin/emails/queue/page.tsx
src/app/admin/emails/automation/page.tsx
src/app/admin/emails/matrix/page.tsx
src/app/admin/emails/attachments/page.tsx
src/app/admin/emails/test/page.tsx
src/app/admin/emails/analytics/page.tsx
src/app/admin/emails/settings/page.tsx
```

### Admin Components
```
src/components/admin/emails/EmailTabs.tsx
src/components/admin/emails/EmailTemplatesClient.tsx
src/components/admin/emails/TemplateEditor.tsx
src/components/admin/emails/HtmlEditor.tsx
src/components/admin/emails/VariableAutocomplete.tsx
src/components/admin/emails/LivePreview.tsx
src/components/admin/emails/TemplateSidebar.tsx
src/components/admin/emails/VersionCompareModal.tsx
src/components/admin/emails/EmailBrandingForm.tsx
src/components/admin/emails/ColorPickerField.tsx
src/components/admin/emails/EmailDashboard.tsx
src/components/admin/emails/EmailQueueTable.tsx
src/components/admin/emails/AutomationRulesClient.tsx
src/components/admin/emails/AutomationRulesList.tsx
src/components/admin/emails/AutomationRuleBuilder.tsx
src/components/admin/emails/TestEmailSender.tsx
src/components/admin/emails/EmailAnalyticsClient.tsx
src/components/admin/emails/EmailSettingsForm.tsx
src/components/admin/emails/NotificationMatrix.tsx
src/components/admin/emails/AttachmentManager.tsx
src/components/admin/EmailLogsTable.tsx
```

### Scripts & Types
```
src/lib/email/seed-system-templates.ts
types/email-system.ts
```

### Deleted (Phase 5 Cleanup)
```
src/lib/email/templates/                    (all React Email components)
src/lib/email/template-registry.ts          (React fallback registry)
```

### Updated Existing Files
```
src/lib/admin/nav-config.ts              (add Email Center nav)
src/lib/email/dispatcher.ts              (DB templates only, no React fallback)
src/lib/email/types.ts                   (added _html fields for type safety)
types/database.ts                        (EmailTemplateRow, EmailQueueRow, etc.)
src/app/api/admin/email-templates/route.ts         (auto-generate plain_text)
src/app/api/admin/email-templates/[id]/route.ts    (auto-generate plain_text)
```

---

## Notes for Developers

1. **Always test email sending** after backend changes using `/admin/emails/test`
2. **Use existing admin patterns:** `DataTable`, `Modal`, `Drawer`, `AdminToast`, `SkeletonBlock`
3. **Color tokens:** Primary `#6d28d9`, Success `emerald`, Error `rose`
4. **Max-width:** Admin content area max-width `1500px`
5. **Rounded corners:** Cards `rounded-2xl`, buttons `rounded-xl`
6. **Attachment syntax:** Use `{{attachment:filename.pdf}}` in templates
7. **Variables:** All known variables are registered in `src/lib/email/variables.ts`

---

*Plan written: 2026-07-29*  
*Status updated: 2026-08-05 — All phases complete*
