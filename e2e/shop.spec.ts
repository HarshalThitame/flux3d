import { test, expect } from "@playwright/test";

test.describe("Shop public pages", () => {
  test("shop page loads with products", async ({ page }) => {
    await page.goto("/3d-shop");

    // Wait for products to load
    await page.waitForSelector('[data-testid="product-card-link"]', {
      timeout: 10000,
    });

    const productLinks = page.getByTestId("product-card-link");
    await expect(productLinks.first()).toBeVisible();
  });

  test("product page loads from shop", async ({ page }) => {
    await page.goto("/3d-shop");

    await page.waitForSelector('[data-testid="product-card-link"]', {
      timeout: 10000,
    });
    const firstProduct = page.getByTestId("product-card-link").first();

    await firstProduct.click();

    // Should navigate to a product detail page
    await expect(page).toHaveURL(/\/3d-shop\/product\//);
    await expect(page.locator("h1")).toBeVisible();
  });
});
