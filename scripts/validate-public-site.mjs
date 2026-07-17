import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()

const filesToRead = [
  'src/app/terms-of-service/page.tsx',
  'src/app/terms-and-conditions/page.tsx',
  'src/app/shipping-policy/page.tsx',
  'src/app/service-delivery-policy/page.tsx',
  'src/app/refund-policy/page.tsx',
  'src/app/landing/FooterSection.tsx',
  'src/app/sitemap.ts',
  'src/app/about/page.tsx',
  'src/app/contact/page.tsx',
]

const placeholderPatterns = [
  'Lorem ipsum',
  'TBD',
  'TODO',
  'Placeholder',
  '[ADDRESS]',
  'example@email.com',
  '123 Main Street',
  'Fake phone',
]

const requiredSnippets = [
  ['src/app/terms-of-service/page.tsx', "redirect('/terms-and-conditions')"],
  ['src/app/shipping-policy/page.tsx', "redirect('/service-delivery-policy')"],
  ['src/app/landing/FooterSection.tsx', '/features'],
  ['src/app/landing/FooterSection.tsx', '/service-delivery-policy'],
  ['src/app/landing/FooterSection.tsx', '/terms-and-conditions'],
  ['src/app/sitemap.ts', 'https://flux3d.in/service-delivery-policy'],
  ['src/app/sitemap.ts', 'https://flux3d.in/features'],
]

let failed = false

for (const relativePath of filesToRead) {
  const absolutePath = path.join(root, relativePath)
  const content = await fs.readFile(absolutePath, 'utf8')

  for (const pattern of placeholderPatterns) {
    if (content.includes(pattern)) {
      console.error(`Placeholder content found in ${relativePath}: ${pattern}`)
      failed = true
    }
  }
}

for (const [relativePath, snippet] of requiredSnippets) {
  const content = await fs.readFile(path.join(root, relativePath), 'utf8')
  if (!content.includes(snippet)) {
    console.error(`Missing required snippet in ${relativePath}: ${snippet}`)
    failed = true
  }
}

const publicRouteFiles = [
  'src/app/about/page.tsx',
  'src/app/contact/page.tsx',
  'src/app/features/page.tsx',
  'src/app/pricing/page.tsx',
  'src/app/privacy-policy/page.tsx',
  'src/app/refund-policy/page.tsx',
  'src/app/terms-and-conditions/page.tsx',
  'src/app/service-delivery-policy/page.tsx',
]

for (const relativePath of publicRouteFiles) {
  const content = await fs.readFile(path.join(root, relativePath), 'utf8')
  if (!/canonical:\s*['"]\/[a-z-]+['"]/.test(content)) {
    console.error(`Missing canonical metadata in ${relativePath}`)
    failed = true
  }
}

if (failed) {
  process.exitCode = 1
  console.error('Public-site validation failed.')
} else {
  console.log('Public-site validation passed.')
}
