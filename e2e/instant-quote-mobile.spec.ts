import { expect, test } from '@playwright/test'

const viewports = [
  { width: 320, height: 640 },
  { width: 360, height: 740 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 640, height: 320 },
  { width: 844, height: 390 },
]

const boundedRegions = [
  'quote-hero',
  'quote-step-nav',
  'quote-upload-card',
  'quote-viewer',
  'quote-settings-card',
  'quote-summary-card',
]

test.describe('Instant Quote — mobile layouts', () => {
  for (const viewport of viewports) {
    test(`fits ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/instant-quote')
      await expect(page.getByRole('heading', { name: /Get Your Instant Quote/i })).toBeVisible()

      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1)

      const overflowingInteractiveElements = await page.evaluate(() => {
        const workspace = document.querySelector('.instant-quote-workspace')
        if (!workspace) return ['workspace not found']

        return Array.from(workspace.querySelectorAll<HTMLElement>('*'))
          .filter((element) => !element.closest('[aria-hidden="true"]'))
          .filter((element) => {
            const bounds = element.getBoundingClientRect()
            return bounds.width > 0 && (bounds.left < -1 || bounds.right > window.innerWidth + 1)
          })
          .slice(0, 5)
          .map((element) => `${element.tagName.toLowerCase()}.${element.className}`)
      })
      expect(overflowingInteractiveElements).toEqual([])

      for (const testId of boundedRegions) {
        const region = page.getByTestId(testId)
        await expect(region).toBeVisible()
        const box = await region.boundingBox()
        expect(box, `${testId} should have a layout box`).not.toBeNull()
        expect(box!.x, `${testId} should not extend left of the viewport`).toBeGreaterThanOrEqual(-1)
        expect(box!.x + box!.width, `${testId} should not extend right of the viewport`).toBeLessThanOrEqual(viewport.width + 1)
      }

      const steps = page.getByTestId('quote-step-nav').getByRole('button')
      await expect(steps).toHaveCount(4)
      for (let index = 0; index < 4; index += 1) {
        await expect(steps.nth(index)).toBeVisible()
      }
    })
  }
})
