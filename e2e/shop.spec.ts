import { test, expect } from "@playwright/test";

test.describe("Shop public pages", () => {
  test("shop page loads category shelves with unique products", async ({
    page,
  }) => {
    await page.goto("/3d-shop");

    await page.waitForSelector('[data-testid="product-card-link"]', {
      timeout: 10000,
    });

    await expect(
      page.getByRole("heading", {
        name: "Find the right piece for your space",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Shop categories" }),
    ).toBeVisible();

    const productLinks = page.getByTestId("product-card-link");
    await expect(productLinks.first()).toBeVisible();

    const hrefs = await productLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    );
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  test("shop shelves do not create page-level overflow on narrow screens", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/3d-shop");

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
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
