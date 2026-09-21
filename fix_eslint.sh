#!/bin/bash
# Fix catch (err: any) -> catch (err: unknown)
find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/catch (err: any)/catch (err: unknown)/g'

# Fix any arrays
find src -type f -name "*.tsx" | xargs sed -i 's/useState<any\[\]>/useState<Record<string, unknown>\[\]>/g'
find src -type f -name "*.tsx" | xargs sed -i 's/useState<any>/useState<Record<string, unknown> | null>/g'

# Fix (row: any) -> (row: Record<string, unknown>)
find src -type f -name "*.tsx" | xargs sed -i 's/(row: any)/(row: Record<string, unknown>)/g'

# Fix (item: any) -> (item: Record<string, unknown>)
find src -type f -name "*.tsx" | xargs sed -i 's/(item: any)/(item: Record<string, unknown>)/g'
find src -type f -name "*.ts" | xargs sed -i 's/(item: any)/(item: Record<string, unknown>)/g'

# Fix value: any -> value: string | number
find src/app/admin/custom-orders/create/page.tsx -type f | xargs sed -i 's/value: any/value: string | number/g'

# Fix TestimonialsSection.tsx
sed -i 's/(testimonial: any)/(testimonial: Record<string, unknown>)/g' src/components/TestimonialsSection.tsx
sed -i 's/\"{testimonial.body}\"/&quot;{String(testimonial.body)}&quot;/g' src/components/TestimonialsSection.tsx

# Fix other potential any
find src/app/admin/reviews/page.tsx -type f | xargs sed -i 's/row.rating/Number(row.rating)/g'
find src/components/TestimonialsSection.tsx -type f | xargs sed -i 's/testimonial.rating/Number(testimonial.rating)/g'
