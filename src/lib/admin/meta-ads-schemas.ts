import { z } from 'zod'

export const TargetingConfigSchema = z.object({
  ageMin: z.number().int().min(13).max(65).optional().default(25),
  ageMax: z.number().int().min(13).max(65).optional().default(55),
  countries: z.array(z.string().min(1)).optional().default(['IN']),
  interests: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  placements: z.array(z.string()).optional().default(['facebook', 'instagram', 'audience_network', 'messenger']),
}).optional()

export const CreateCampaignSchema = z.object({
  categoryName: z.string().min(1, 'Category name is required').max(100, 'Category name too long'),
  dailyBudgetPaise: z.number().int().min(5000, 'Minimum daily budget is ₹50').max(10000000, 'Maximum daily budget is ₹1,00,000'),
  siteUrl: z.string().url().optional(),
  pageId: z.string().min(1).optional(),
  createDpa: z.boolean().optional().default(true),
  productLimit: z.number().int().min(1).max(20).optional().default(10),
  duplicateFromId: z.string().optional(),
  targetingConfig: TargetingConfigSchema,
})

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>

export const ToggleCampaignSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED'], {
    message: 'Status must be ACTIVE, PAUSED, or ARCHIVED',
  }),
})

export type ToggleCampaignInput = z.infer<typeof ToggleCampaignSchema>

export const EditCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  dailyBudgetPaise: z.number().int().min(5000, 'Minimum daily budget is ₹50').max(10000000, 'Maximum daily budget is ₹1,00,000').optional(),
})

export type EditCampaignInput = z.infer<typeof EditCampaignSchema>

export const BulkToggleSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one ID is required').max(100, 'Maximum 100 campaigns at a time'),
  status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']),
})

export type BulkToggleInput = z.infer<typeof BulkToggleSchema>

export const BulkArchiveSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
})

export type BulkArchiveInput = z.infer<typeof BulkArchiveSchema>

export const BulkDuplicateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
})

export type BulkDuplicateInput = z.infer<typeof BulkDuplicateSchema>
