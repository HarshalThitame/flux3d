// Convenience re-exports for the Email Management System (EMS)
// All row types live in types/database.ts to keep the Supabase types
// in a single source of truth. This file exists so that EMS-specific
// code can import from a dedicated path.

export type {
  EmailTemplateRow as EmailTemplate,
  EmailTemplateVersionRow as EmailTemplateVersion,
  EmailAutomationRuleRow as EmailAutomationRule,
  EmailQueueRow as EmailQueueItem,
  EmailBrandingRow as EmailBranding,
  EmailSettingsRow as EmailSettings,
} from './database'
