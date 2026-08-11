import { z } from 'zod'

export const customerStatusSchema = z.enum(['Active', 'Suspended', 'Unverified'])
export const customerSortColumnSchema = z.enum([
  'created_at',
  'last_seen_at',
  'total_orders',
  'total_spent',
  'last_order_date',
  'name',
])
export const customerSortDirSchema = z.enum(['asc', 'desc'])
export const signupMethodSchema = z.enum(['Google', 'Email', 'GitHub'])

const dateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date format.')

export const customerListParamsSchema = z.object({
  query: z.string().max(200).optional(),
  status: customerStatusSchema.optional(),
  signupMethod: signupMethodSchema.optional(),
  sortBy: customerSortColumnSchema.optional(),
  sortDir: customerSortDirSchema.optional(),
  dateFrom: dateParamSchema.optional(),
  dateTo: dateParamSchema.optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

export const customerPatchSchema = z
  .object({
    notes: z.string().max(10_000).optional(),
    tags: z.array(z.string().trim().max(100)).max(100).optional(),
    status: z.enum(['Active', 'Suspended']).optional(),
    manualCoupon: z.string().trim().max(100).optional(),
    manualCredit: z.number().min(0).max(1_000_000_000).optional(),
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Nothing to update.' })
    }
  })

export const bulkCustomerActionSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(500),
  action: z.enum(['suspend', 'reactivate']),
})

export const customerExportSchema = z.object({
  format: z.enum(['csv', 'xlsx']).optional(),
  userIds: z.array(z.string().uuid()).max(5000).optional(),
  filter: z
    .object({
      query: z.string().max(200).optional(),
      status: customerStatusSchema.optional(),
      signupMethod: signupMethodSchema.optional(),
      sortBy: customerSortColumnSchema.optional(),
      sortDir: customerSortDirSchema.optional(),
      dateFrom: dateParamSchema.optional(),
      dateTo: dateParamSchema.optional(),
    })
    .optional(),
})

export function zodErrorResponse(error: z.ZodError): { message: string; fields: Record<string, string[]> } {
  const fields: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'body'
    fields[key] = fields[key] ?? []
    fields[key].push(issue.message)
  }
  return { message: 'Invalid request parameters.', fields }
}