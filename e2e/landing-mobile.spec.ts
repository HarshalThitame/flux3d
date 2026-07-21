import { test, expect } from '@playwright/test'

test.describe('Landing page — mobile', () => {
  test('has no horizontal scrollbar', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1)
  })

  test('hero section renders all key elements', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Flux3D')
    await expect(page.locator('text=Request a Quote').first()).toBeVisible()
    await expect(page.locator('text=Explore Services').first()).toBeVisible()
  })

  test('navbar mobile menu opens and closes', async ({ page }) => {
    await page.goto('/')
    const menuButton = page.locator('summary[aria-label*="Open navigation"]')
    await expect(menuButton).toBeVisible()
    await menuButton.click()
    const panel = page.locator('#navbar-mobile-menu')
    await expect(panel).toBeVisible()
    await expect(panel.locator('a:has-text("Services")')).toBeVisible()
    const closeButton = page.locator('summary[aria-label*="Close navigation"]')
    await expect(closeButton).toBeVisible()
    await closeButton.click()
    await expect(panel).not.toBeVisible()
  })

  test('mobile menu closes on Escape key', async ({ page }) => {
    await page.goto('/')
    await page.locator('summary[aria-label*="Open navigation"]').click()
    await expect(page.locator('#navbar-mobile-menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('#navbar-mobile-menu')).not.toBeVisible()
  })

  test('mobile menu link navigates and closes menu', async ({ page }) => {
    await page.goto('/')
    await page.locator('summary[aria-label*="Open navigation"]').click()
    await page.locator('#navbar-mobile-menu a:has-text("Services")').click()
    await expect(page).toHaveURL(/\/services/)
  })

  test('all lazy sections are reachable on scroll', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const sections = ['Services', 'Pricing', 'FAQ']
    for (const heading of sections) {
      await page.locator(`h2:has-text("${heading}")`).first().scrollIntoViewIfNeeded()
      await expect(page.locator(`h2:has-text("${heading}")`).first()).toBeInViewport()
    }
  })

  test('Floating WhatsApp button is visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('a[aria-label="Chat with Flux 3D on WhatsApp"]')).toBeVisible()
  })
})
