// ============================================================================
// Seed System Templates
// ============================================================================
// Generates email_templates rows for all existing React Email types.
// Each template is a hand-crafted HTML skeleton that preserves the exact
// visual structure of the existing React template, with dynamic data
// replaced by {{variable}} placeholders.
//
// Run: npx ts-node --esm src/lib/email/seed-system-templates.ts
// Or:  node --loader ts-node/esm src/lib/email/seed-system-templates.ts
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import {
  getVariableNames,
  EMAIL_TYPE_META,
} from './variables'
import type { EmailTemplateRow } from '../../../types/database'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flux3d.in'

// ---------------------------------------------------------------------------
// Template skeletons — each matches the React Email component pixel-for-pixel
// ---------------------------------------------------------------------------

const SKELETONS: Record<string, string> = {
  welcome: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">Welcome aboard, {{customer_name}}!</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  Your Flux3D account is now active. Upload your first 3D model, get an instant quote, and we'll print it with precision.
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:24px 0;">
  <a href="https://flux3d.in/upload" style="background-color:#FF5C1A;color:#fff;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Upload Your First Model</a>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  Questions? Reach us at <a href="mailto:support@flux3d.in" style="color:#39BDF8;">support@flux3d.in</a>
</p>`,

  email_verification: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">Hi {{customer_name}},</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  Please verify your email address to complete your Flux3D account setup. This link is valid for 24 hours.
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:24px 0;">
  <a href="{{verification_url}}" style="background-color:#FF5C1A;color:#fff;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Verify Email Address</a>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  If you didn't create an account, you can safely ignore this email. Questions? <a href="mailto:support@flux3d.in" style="color:#39BDF8;">support@flux3d.in</a>
</p>`,

  password_reset: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">Hi {{customer_name}},</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  We received a request to reset your Flux3D password from <strong>{{device}}</strong> (IP: <strong>{{ip_address}}</strong>). Click the button below to set a new password.
</p>
<p style="font-size:14px;line-height:1.6;color:#6b7280;margin:0 0 4px;" class="email-muted">
  <strong>Security:</strong> this link can be used <strong>once</strong> and expires in <strong>1 hour</strong>. After you set a new password, the link is permanently invalid and any other logged-in sessions are signed out.
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:24px 0;">
  <a href="{{reset_url}}" style="background-color:#FF5C1A;color:#fff;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Reset Password</a>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  Didn't request this? Someone may have entered your email by mistake — your password has not been changed. If you're concerned, contact <a href="mailto:support@flux3d.in" style="color:#39BDF8;">support@flux3d.in</a>
</p>`.replace(/\s+$/g, ''),

  password_changed: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">Hi {{customer_name}},</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  Your Flux3D password was successfully changed on <strong>{{changed_at}}</strong> from <strong>{{device}}</strong> (IP: <strong>{{ip_address}}</strong>).
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f9fafb;border-radius:10px;padding:20px;border:1px solid #e5e7eb;margin:16px 0;" class="email-card"><tr>
  <td style="width:50%;vertical-align:top;">
    <p style="font-size:12px;font-weight:600;color:#6b7280;margin:0 0 4px;text-transform:uppercase;" class="email-muted">Device</p>
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">{{device}}</p>
  </td>
  <td style="width:50%;vertical-align:top;">
    <p style="font-size:12px;font-weight:600;color:#6b7280;margin:0 0 4px;text-transform:uppercase;" class="email-muted">IP Address</p>
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">{{ip_address}}</p>
  </td>
</tr></table>
<p style="font-size:14px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  For your security, we signed out all other logged-in sessions. The recovery link you used is now invalid.
</p>
<p style="font-size:14px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  <strong>Didn't change your password?</strong> Someone may have accessed your account. <a href="https://flux3d.in/forgot-password" style="color:#FF5C1A;font-weight:600;">Reset your password now</a> and contact <a href="mailto:support@flux3d.in" style="color:#39BDF8;">support@flux3d.in</a> immediately.
</p>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  This is an automated security notification — you don't need to reply to this email.
</p>`.replace(/\s+$/g, ''),

  account_link_confirmation: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">Hi {{customer_name}},</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  We received a request to link your WhatsApp number to your Flux3D account. This will import {{order_count}} past guest order(s) placed via WhatsApp. This link is valid for 15 minutes.
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:24px 0;">
  <a href="{{confirm_url}}" style="background-color:#FF5C1A;color:#fff;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Confirm Account Link</a>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  If you didn't request this, you can safely ignore this email. Questions? <a href="mailto:support@flux3d.in" style="color:#39BDF8;">support@flux3d.in</a>
</p>`.replace(/\s+$/g, ''),

  order_placed_customer: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">Thank you, {{customer_name}}!</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  Your order <strong>{{order_number}}</strong> has been confirmed and is now being reviewed by our team.
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f9fafb;border-radius:10px;padding:20px;border:1px solid #e5e7eb;margin:16px 0;" class="email-card"><tr>
  <td style="width:50%;vertical-align:top;">
    <p style="font-size:12px;font-weight:600;color:#6b7280;margin:0 0 4px;text-transform:uppercase;" class="email-muted">Order #</p>
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">{{order_number}}</p>
  </td>
  <td style="width:50%;vertical-align:top;">
    <p style="font-size:12px;font-weight:600;color:#6b7280;margin:0 0 4px;text-transform:uppercase;" class="email-muted">Total</p>
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">{{order_total}}</p>
  </td>
</tr></table>
{{items_html}}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:24px 0;">
  <a href="{{order_url}}" style="background-color:#FF5C1A;color:#fff;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">View Order Details</a>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  Questions? <a href="mailto:support@flux3d.in" style="color:#39BDF8;">support@flux3d.in</a>
</p>`,

  order_placed_admin: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">New order received</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  A new order has been placed by {{customer_name}} ({{customer_email}}).
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f9fafb;border-radius:10px;padding:20px;border:1px solid #e5e7eb;margin:16px 0;" class="email-card"><tr>
  <td style="width:50%;vertical-align:top;">
    <p style="font-size:12px;font-weight:600;color:#6b7280;margin:0 0 4px;text-transform:uppercase;" class="email-muted">Order #</p>
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">{{order_number}}</p>
  </td>
  <td style="width:50%;vertical-align:top;">
    <p style="font-size:12px;font-weight:600;color:#6b7280;margin:0 0 4px;text-transform:uppercase;" class="email-muted">Total</p>
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">{{order_total}}</p>
  </td>
</tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:24px 0;">
  <a href="{{admin_order_url}}" style="background-color:#FF5C1A;color:#fff;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Review in Admin</a>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  Questions? <a href="mailto:support@flux3d.in" style="color:#39BDF8;">support@flux3d.in</a>
</p>`,

  model_validation_pass: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">Hi {{customer_name}},</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  Great news! Your 3D model for order <strong>{{order_number}}</strong> has passed our validation checks and is approved for printing.
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0fdf4;border-radius:10px;padding:16px;border:1px solid #22c55e;margin:16px 0;"><tr><td>
  <p style="font-size:15px;font-weight:600;color:#22c55e;margin:0;text-align:center;">&#10003; Model Approved</p>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  Questions? <a href="mailto:support@flux3d.in" style="color:#39BDF8;">support@flux3d.in</a>
</p>`,

  model_validation_fail: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">Hi {{customer_name}},</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  We found issues with the 3D model for order <strong>{{order_number}}</strong> that need to be fixed before we can proceed with printing.
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fef2f2;border-radius:10px;padding:16px;border:1px solid #ef4444;margin:16px 0;"><tr><td>
  <p style="font-size:15px;font-weight:600;color:#ef4444;margin:0 0 8px;">Issues Found:</p>
  {{issues_html}}
</td></tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:24px 0;">
  <a href="{{admin_quote_url}}" style="background-color:#FF5C1A;color:#fff;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Upload Revised Model</a>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  Questions? <a href="mailto:support@flux3d.in" style="color:#39BDF8;">support@flux3d.in</a>
</p>`,

  production_started: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">Hi {{customer_name}},</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  Your order <strong>{{order_number}}</strong> is now on the print floor{{print_bed_name}}. Our machines are warming up and your parts will be printed with precision.
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f9fafb;border-radius:10px;padding:16px;border:1px solid #e5e7eb;margin:16px 0;" class="email-card"><tr><td>
  <p style="font-size:14px;color:#6b7280;margin:0;text-align:center;" class="email-muted">
    Estimated completion: <strong style="color:#1a1a1a;" class="email-text">{{estimated_completion_date}}</strong>
  </p>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  Questions? <a href="mailto:support@flux3d.in" style="color:#39BDF8;">support@flux3d.in</a>
</p>`,

  order_shipped: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;line-height:1.3;" class="email-text">Your order is on the way, {{customer_name}}!</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  Great news — order <strong style="color:#FF5C1A;">{{order_number}}</strong> has left our production facility and is now with <strong>{{courier_name}}</strong>.
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:0 32px 24px;">
  <a href="{{tracking_url}}" style="background-color:#FF5C1A;color:#fff;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Track Your Shipment</a>
</td></tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 32px 24px;padding:20px;background-color:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;" class="email-card"><tr>
  <td style="width:50%;vertical-align:top;">
    <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Courier</p>
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">{{courier_name}}</p>
  </td>
  <td style="width:50%;vertical-align:top;">
    <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Tracking #</p>
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;word-break:break-all;" class="email-text">{{tracking_number}}</p>
  </td>
</tr>{{estimated_delivery}}</table>
<hr class="email-hr" style="border:none;border-top:1px solid #e5e7eb;margin:0 32px;">
<p style="font-size:16px;font-weight:600;color:#1a1a1a;margin:24px 32px 16px;" class="email-text">Order Summary</p>
{{items_html}}
<hr class="email-hr" style="border:none;border-top:1px solid #e5e7eb;margin:0 32px;">
<p style="font-size:13px;line-height:1.5;color:#6b7280;text-align:center;margin:16px 32px 8px;" class="email-muted">
  Need help with your delivery? <a href="mailto:support@flux3d.in" style="color:#39BDF8;text-decoration:underline;">Contact our support team</a> or reply to this email.
</p>
<p style="font-size:13px;line-height:1.5;color:#6b7280;text-align:center;margin:0 32px 32px;" class="email-muted">Flux3D — Precision 3D Printing</p>`,

  delivery_confirmation: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">Hi {{customer_name}},</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  Your order <strong>{{order_number}}</strong> has been delivered. We hope you love your 3D-printed parts!
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:24px 0;">
  <a href="{{review_url}}" style="background-color:#FF5C1A;color:#fff;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Leave a Review</a>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  Questions or issues with your order? <a href="mailto:support@flux3d.in" style="color:#39BDF8;">support@flux3d.in</a>
</p>`,

  payment_receipt: `<p style="text-align:center;padding:0 32px 16px;">
  <span style="display:inline-block;background-color:#dcfce7;color:#166534;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1;padding:6px 14px;border-radius:20px;margin:0;">Payment Confirmed</span>
</p>
<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;line-height:1.3;" class="email-text">Thank you, {{customer_name}}!</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  We have successfully received your payment for order <strong style="color:#FF5C1A;">{{order_number}}</strong>. Your order is now confirmed and will be processed shortly.
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 32px 24px;"><tr>
  <td style="width:50%;vertical-align:top;">
    <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Order Number</p>
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">{{order_number}}</p>
  </td>
  <td style="width:50%;vertical-align:top;">
    <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Order Date</p>
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">{{order_date}}</p>
  </td>
</tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:0 32px 24px;">
  <a href="{{order_url}}" style="background-color:#FF5C1A;color:#fff;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">View Order Details</a>
</td></tr></table>
<hr class="email-hr" style="border:none;border-top:1px solid #e5e7eb;margin:0 32px;">
<p style="font-size:16px;font-weight:600;color:#1a1a1a;margin:24px 32px 16px;" class="email-text">Order Summary</p>
{{items_html}}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:0 32px 24px;">
  {{pricing_html}}
</table>
<hr class="email-hr" style="border:none;border-top:1px solid #e5e7eb;margin:0 32px;">
<p style="font-size:16px;font-weight:600;color:#1a1a1a;margin:24px 32px 16px;" class="email-text">Payment Details</p>
{{payment_html}}
<p style="font-size:16px;font-weight:600;color:#1a1a1a;margin:24px 32px 16px;" class="email-text">Shipping Address</p>
{{shipping_address_html}}
<hr class="email-hr" style="border:none;border-top:1px solid #e5e7eb;margin:0 32px;">
<p style="font-size:13px;line-height:1.5;color:#6b7280;text-align:center;margin:16px 32px 8px;" class="email-muted">
  Questions about your order? <a href="mailto:support@flux3d.in" style="color:#39BDF8;text-decoration:underline;">Contact our support team</a> or reply to this email.
</p>
<p style="font-size:13px;line-height:1.5;color:#6b7280;text-align:center;margin:0 32px 32px;" class="email-muted">Flux3D — Precision 3D Printing</p>`,

  payment_failed: `<p style="text-align:center;padding:0 32px 16px;">
  <span style="display:inline-block;background-color:#fee2e2;color:#991b1b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1;padding:6px 14px;border-radius:20px;margin:0;">Payment Failed</span>
</p>
<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;line-height:1.3;" class="email-text">Hi {{customer_name}},</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  We couldn't process your payment of <strong style="color:#1a1a1a;" class="email-text">{{amount}}</strong> for order <strong style="color:#1a1a1a;" class="email-text">{{order_number}}</strong>. Don't worry — your order is saved. You can retry payment within 24 hours.
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:0 32px 24px;">
  <tr><td style="padding:16px;background-color:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;" class="email-card">
    <p style="font-size:14px;color:#6b7280;margin:0 0 4px;" class="email-muted">Order Number</p>
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0 0 12px;" class="email-text">{{order_number}}</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 4px;" class="email-muted">Amount Due</p>
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">{{amount}}</p>
  </td></tr>
</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:0 32px 24px;">
  <a href="{{retry_url}}" style="background-color:#FF5C1A;color:#fff;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Retry Payment</a>
</td></tr></table>
<hr class="email-hr" style="border:none;border-top:1px solid #e5e7eb;margin:0 32px;">
<p style="font-size:13px;line-height:1.5;color:#6b7280;text-align:center;margin:16px 32px 8px;" class="email-muted">
  Need help? <a href="mailto:support@flux3d.in" style="color:#39BDF8;">support@flux3d.in</a>
</p>
<p style="font-size:13px;line-height:1.5;color:#6b7280;text-align:center;margin:0 32px 32px;" class="email-muted">Flux3D — Precision 3D Printing</p>`,

  refund_issued: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">Hi {{customer_name}},</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  A refund of <strong>{{refund_amount}}</strong> has been initiated for order <strong>{{order_number}}</strong>.
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f9fafb;border-radius:10px;padding:20px;border:1px solid #e5e7eb;margin:16px 0;" class="email-card"><tr><td>
  <p style="font-size:14px;color:#6b7280;margin:4px 0;" class="email-muted">Refund Amount: <strong style="color:#1a1a1a;" class="email-text">{{refund_amount}}</strong></p>
  <p style="font-size:14px;color:#6b7280;margin:4px 0;" class="email-muted">Method: <strong style="color:#1a1a1a;" class="email-text">{{refund_method}}</strong></p>
  <p style="font-size:14px;color:#6b7280;margin:4px 0;" class="email-muted">Expected by: <strong style="color:#1a1a1a;" class="email-text">{{expected_date}}</strong></p>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  Questions? <a href="mailto:support@flux3d.in" style="color:#39BDF8;">support@flux3d.in</a>
</p>`,

  contact_notification: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">New Contact Form Submission</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f9fafb;border-radius:10px;padding:20px;border:1px solid #e5e7eb;margin:16px 0;" class="email-card"><tr><td>
  <p style="font-size:14px;color:#6b7280;margin:4px 0;" class="email-muted"><strong style="color:#1a1a1a;" class="email-text">Name:</strong> {{sender_name}}</p>
  <p style="font-size:14px;color:#6b7280;margin:4px 0;" class="email-muted"><strong style="color:#1a1a1a;" class="email-text">Email:</strong> {{sender_email}}</p>
  <p style="font-size:14px;color:#6b7280;margin:4px 0;" class="email-muted"><strong style="color:#1a1a1a;" class="email-text">Phone:</strong> {{sender_phone}}</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;">
  <p style="font-size:14px;color:#6b7280;margin:4px 0;" class="email-muted">{{message}}</p>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  Reply to <a href="mailto:{{sender_email}}" style="color:#39BDF8;">{{sender_email}}</a> to respond.
</p>`,

  stock_alert: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">Stock Alert Digest</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  <strong style="color:#1a1a1a;" class="email-text">{{alert_count}}</strong> item(s) need your attention — <strong style="color:#1a1a1a;" class="email-text">{{low_stock_count}}</strong> low on stock and <strong style="color:#1a1a1a;" class="email-text">{{out_of_stock_count}}</strong> out of stock.
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">{{items_html}}</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:24px 0;">
  <a href="https://flux3d.in/admin/3d-shop/stock" style="background-color:#FF5C1A;color:#fff;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Open Stock Dashboard</a>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  You are receiving this because you are an admin. Adjust thresholds or SKUs in the stock dashboard.
</p>`,

  back_in_stock: `<p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 12px;" class="email-text">It&apos;s back!</p>
<p style="font-size:15px;line-height:1.6;color:#6b7280;margin:0 0 12px;" class="email-muted">
  Hi {{customer_name}}, the item you were waiting for is back in stock:
</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f9fafb;border-radius:10px;padding:20px;border:1px solid #e5e7eb;margin:16px 0;" class="email-card"><tr><td>
  <p style="font-size:16px;font-weight:700;color:#1a1a1a;margin:0 0 4px;" class="email-text">{{product_name}}</p>
  <p style="font-size:14px;color:#6b7280;margin:0;" class="email-muted">{{variant_label}}</p>
</td></tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:24px 0;">
  <a href="{{product_url}}" style="background-color:#FF5C1A;color:#fff;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Shop Now</a>
</td></tr></table>
<p style="font-size:13px;color:#6b7280;text-align:center;margin:0;" class="email-muted">
  Stock moves fast — grab yours while it lasts.
</p>`,
}

// ---------------------------------------------------------------------------
// Sample data for each email type (used by seed script only)
// ---------------------------------------------------------------------------

export const SAMPLE_DATA: Record<string, Record<string, string>> = {
  welcome: { customer_name: 'Rutik' },
  email_verification: { customer_name: 'Rutik', verification_url: `${SITE_URL}/verify?token=abc123` },
  password_reset: { customer_name: 'Rutik', reset_url: `${SITE_URL}/auth/confirm?token_hash=abc123`, ip_address: '203.0.113.42', device: 'Chrome on Windows' },
  password_changed: { customer_name: 'Rutik', changed_at: '13 Aug 2026, 09:45 pm', ip_address: '203.0.113.42', device: 'Chrome on Windows' },
  account_link_confirmation: { customer_name: 'Rutik', confirm_url: `${SITE_URL}/link/confirm?token=abc123`, order_count: '3' },
  order_placed_customer: {
    customer_name: 'Rutik',
    order_number: 'F3D-2026-001234',
    order_total: '₹2,499.00',
    order_url: `${SITE_URL}/orders/abc123`,
    items_html: `<p style="font-size:14px;color:#6b7280;margin:4px 0;" class="email-muted">ABS Black Enclosure &middot; Qty 2</p>`,
  },
  order_placed_admin: {
    customer_name: 'Rutik',
    customer_email: 'rutik@example.com',
    order_number: 'F3D-2026-001234',
    order_total: '₹2,499.00',
    admin_order_url: `${SITE_URL}/admin/orders/abc123`,
  },
  model_validation_pass: {
    customer_name: 'Rutik',
    order_number: 'F3D-2026-001234',
  },
  model_validation_fail: {
    customer_name: 'Rutik',
    order_number: 'F3D-2026-001234',
    issues_html: `<p style="font-size:14px;color:#6b7280;margin:4px 0;" class="email-muted">&bull; Non-manifold edges detected</p><p style="font-size:14px;color:#6b7280;margin:4px 0;" class="email-muted">&bull; Wall thickness below 1.2mm</p>`,
    admin_quote_url: `${SITE_URL}/admin/quotes/abc123`,
  },
  production_started: {
    customer_name: 'Rutik',
    order_number: 'F3D-2026-001234',
    print_bed_name: ' on Bed-A (Prusa XL)',
    estimated_completion_date: '15 Aug 2026',
  },
  order_shipped: {
    customer_name: 'Rutik',
    order_number: 'F3D-2026-001234',
    courier_name: 'Delhivery',
    tracking_number: 'AWB123456789',
    tracking_url: 'https://delhivery.com/track/AWB123',
    estimated_delivery: `<tr><td style="width:50%;vertical-align:top;"><p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Estimated Delivery</p><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">18 Aug 2026</p></td></tr>`,
    items_html: `<tr style="margin-bottom:12px;"><td style="width:80%;vertical-align:middle;"><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0 0 4px;" class="email-text">ABS Black Enclosure</p><p style="font-size:13px;color:#6b7280;margin:0;" class="email-muted">ABS &middot; Black &middot; Qty: 2</p></td></tr>`,
  },
  delivery_confirmation: {
    customer_name: 'Rutik',
    order_number: 'F3D-2026-001234',
    review_url: `${SITE_URL}/review/abc123`,
  },
  payment_receipt: {
    customer_name: 'Rutik',
    order_number: 'F3D-2026-001234',
    order_date: '10 Aug 2026',
    order_url: `${SITE_URL}/orders/abc123`,
    items_html: `<tr style="margin-bottom:12px;border-bottom:1px solid #e5e7eb;padding-bottom:12px;"><td style="width:75%;vertical-align:middle;"><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0 0 4px;" class="email-text">ABS Black Enclosure</p><p style="font-size:13px;color:#6b7280;margin:0;" class="email-muted">&middot; Qty: 2</p></td><td style="width:25%;text-align:right;vertical-align:middle;"><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">₹2,000.00</p></td></tr>`,
    pricing_html: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:16px;background-color:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;" class="email-card"><tr style="margin-bottom:8px;"><td><p style="font-size:14px;color:#6b7280;margin:0;" class="email-muted">Subtotal</p></td><td style="text-align:right;"><p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">₹2,000.00</p></td></tr><tr style="margin-bottom:8px;"><td><p style="font-size:14px;color:#6b7280;margin:0;" class="email-muted">Discount</p></td><td style="text-align:right;"><p style="font-size:14px;font-weight:600;color:#16a34a;margin:0;">-₹0.00</p></td></tr><tr style="margin-bottom:8px;"><td><p style="font-size:14px;color:#6b7280;margin:0;" class="email-muted">Shipping</p></td><td style="text-align:right;"><p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">Free</p></td></tr><tr style="margin-bottom:8px;"><td><p style="font-size:14px;color:#6b7280;margin:0;" class="email-muted">Tax (GST)</p></td><td style="text-align:right;"><p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">₹0.00</p></td></tr><tr><td colspan="2"><hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;"></td></tr><tr><td><p style="font-size:14px;font-weight:700;color:#1a1a1a;margin:0;" class="email-text">Grand Total</p></td><td style="text-align:right;"><p style="font-size:14px;font-weight:700;color:#FF5C1A;margin:0;">₹2,000.00</p></td></tr></table>`,
    payment_html: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 32px 24px;padding:20px;background-color:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;" class="email-card"><tr><td style="width:50%;vertical-align:top;"><p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Payment Method</p><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">UPI</p></td><td style="width:50%;vertical-align:top;"><p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Transaction ID</p><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">pay_ABC123</p></td></tr><tr style="margin-top:12px;"><td style="width:50%;vertical-align:top;"><p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Amount Paid</p><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">₹2,000.00</p></td><td style="width:50%;vertical-align:top;"><p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Status</p><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">Paid</p></td></tr><tr style="margin-top:12px;"><td style="width:50%;vertical-align:top;"><p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Payment Date</p><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">10 Aug 2026</p></td></tr></table>`,
    shipping_address_html: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 32px 24px;padding:20px;background-color:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;" class="email-card"><tr><td><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0 0 4px;" class="email-text">Rutik Thitame</p><p style="font-size:14px;color:#6b7280;margin:0 0 2px;" class="email-muted">+91 98765 43210</p><p style="font-size:14px;color:#6b7280;margin:0 0 2px;" class="email-muted">123 Main Street</p><p style="font-size:14px;color:#6b7280;margin:0;" class="email-muted">Mumbai, Maharashtra — 400001</p></td></tr></table>`,
  },
  payment_failed: {
    customer_name: 'Rutik',
    order_number: 'F3D-2026-001234',
    amount: '₹2,499.00',
    retry_url: `${SITE_URL}/orders/abc123/retry`,
  },
  refund_issued: {
    customer_name: 'Rutik',
    order_number: 'F3D-2026-001234',
    refund_amount: '₹2,499.00',
    refund_method: 'Razorpay (original payment method)',
    expected_date: '5-7 business days',
  },
  contact_notification: {
    sender_name: 'Rutik',
    sender_email: 'rutik@example.com',
    sender_phone: '+91 98765 43210',
    message: 'Hello, I have a question about my recent order.',
  },
  stock_alert: {
    alert_count: '4',
    low_stock_count: '3',
    out_of_stock_count: '1',
    items_html: `<p style="font-size:14px;color:#6b7280;margin:4px 0;" class="email-muted">Phone Stand Deluxe (SHOP-ABC-001) &middot; Low · 3 left</p><p style="font-size:14px;color:#6b7280;margin:4px 0;" class="email-muted">Desk Organizer Black (SHOP-ABC-002) &middot; Out of stock</p>`,
  },
  back_in_stock: {
    customer_name: 'Rutik',
    product_name: 'Phone Stand Deluxe',
    variant_label: 'Color: Black · Size: Large',
    product_url: `${SITE_URL}/3d-shop/phone-stand-deluxe`,
  },
}

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

export async function seedSystemTemplates() {
  const supabase = createAdminClient()

  const types = Object.keys(SKELETONS)
  let inserted = 0
  let updated = 0
  let skipped = 0

  for (const emailType of types) {
    // Check if system template already exists
    const { data: existing } = await supabase
      .from('email_templates')
      .select('id')
      .eq('email_type', emailType)
      .eq('is_system', true)
      .maybeSingle()

    if (existing) {
      // Update existing system template with latest skeleton
      const meta = EMAIL_TYPE_META[emailType]
      const variables = getVariableNames(emailType)
      const { error: updateError } = await supabase
        .from('email_templates')
        .update({
          html_body: SKELETONS[emailType],
          subject: meta.subject,
          variables,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error(`[seed] Failed to update ${emailType}:`, updateError.message)
      } else {
        console.log(`[seed] Updated ${emailType}`)
        updated++
      }
      continue
    }

    const meta = EMAIL_TYPE_META[emailType]
    const variables = getVariableNames(emailType)

    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        name: meta.subject.replace(/\{\{\w+\}\}/g, 'Sample'),
        email_type: emailType,
        category: meta.category as any,
        subject: meta.subject,
        html_body: SKELETONS[emailType],
        plain_text: null,
        variables,
        is_enabled: true,
        is_system: true,
        description: meta.description,
      })
      .select()
      .single()

    if (error) {
      console.error(`[seed] Failed to insert ${emailType}:`, error.message)
      continue
    }

    // Insert initial version row
    await supabase.from('email_template_versions').insert({
      template_id: (data as EmailTemplateRow).id,
      version_number: 1,
      subject: meta.subject,
      html_body: SKELETONS[emailType],
      plain_text: null,
      variables,
    })

    console.log(`[seed] Inserted ${emailType}`)
    inserted++
  }

  // Seed default automation rules for transactional types
  const { data: templates } = await supabase
    .from('email_templates')
    .select('id, email_type')
    .eq('is_system', true)

  const templateMap = new Map(
    (templates ?? []).map((t: any) => [t.email_type, t.id])
  )

  const defaultRules: Array<{
    event_name: string
    template_id: string
    target_audience: string
    delay_minutes: number
    priority: number
  }> = [
    { event_name: 'user_registered', template_id: templateMap.get('welcome')!, target_audience: 'customer', delay_minutes: 0, priority: 0 },
    { event_name: 'email_verification_requested', template_id: templateMap.get('email_verification')!, target_audience: 'customer', delay_minutes: 0, priority: 0 },
    { event_name: 'password_reset_requested', template_id: templateMap.get('password_reset')!, target_audience: 'customer', delay_minutes: 0, priority: 0 },
    { event_name: 'password_changed', template_id: templateMap.get('password_changed')!, target_audience: 'customer', delay_minutes: 0, priority: 0 },
    { event_name: 'account_linking_requested', template_id: templateMap.get('account_link_confirmation')!, target_audience: 'customer', delay_minutes: 0, priority: 0 },
    { event_name: 'order_created', template_id: templateMap.get('order_placed_customer')!, target_audience: 'customer', delay_minutes: 0, priority: 0 },
    { event_name: 'order_created', template_id: templateMap.get('order_placed_admin')!, target_audience: 'admin', delay_minutes: 0, priority: 1 },
    { event_name: 'model_validation_passed', template_id: templateMap.get('model_validation_pass')!, target_audience: 'customer', delay_minutes: 0, priority: 0 },
    { event_name: 'model_validation_failed', template_id: templateMap.get('model_validation_fail')!, target_audience: 'customer', delay_minutes: 0, priority: 0 },
    { event_name: 'production_started', template_id: templateMap.get('production_started')!, target_audience: 'customer', delay_minutes: 0, priority: 0 },
    { event_name: 'order_shipped', template_id: templateMap.get('order_shipped')!, target_audience: 'customer', delay_minutes: 0, priority: 0 },
    { event_name: 'order_delivered', template_id: templateMap.get('delivery_confirmation')!, target_audience: 'customer', delay_minutes: 0, priority: 0 },
    { event_name: 'payment_captured', template_id: templateMap.get('payment_receipt')!, target_audience: 'customer', delay_minutes: 0, priority: 0 },
    { event_name: 'payment_failed', template_id: templateMap.get('payment_failed')!, target_audience: 'customer', delay_minutes: 0, priority: 0 },
    { event_name: 'refund_processed', template_id: templateMap.get('refund_issued')!, target_audience: 'customer', delay_minutes: 0, priority: 0 },
    { event_name: 'contact_form_submitted', template_id: templateMap.get('contact_notification')!, target_audience: 'admin', delay_minutes: 0, priority: 0 },
  ].filter((r) => r.template_id)

  for (const rule of defaultRules) {
    const { data: existing } = await supabase
      .from('email_automation_rules')
      .select('id')
      .eq('event_name', rule.event_name)
      .eq('template_id', rule.template_id)
      .maybeSingle()

    if (!existing) {
      const { error } = await supabase.from('email_automation_rules').insert(rule)
      if (error) {
        console.error(`[seed] Failed to insert rule ${rule.event_name}:`, error.message)
      } else {
        console.log(`[seed] Inserted rule ${rule.event_name}`)
      }
    }
  }

  console.log(`\n[seed] Done: ${inserted} templates inserted, ${updated} updated, ${skipped} skipped`)
}

// CLI entrypoint (ESM-safe check)
const runningDirectly = process.argv[1] && (
  process.argv[1].endsWith('/seed-system-templates.ts') ||
  process.argv[1].endsWith('/seed-system-templates.js')
)
if (runningDirectly) {
  seedSystemTemplates()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] Fatal error:', err)
      process.exit(1)
    })
}
