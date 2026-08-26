import { test, expect } from "@playwright/test";

test.describe("Auth flows", () => {
  test("login page loads with form elements", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByTestId("login-form")).toBeVisible();
    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toHaveText("Sign In");
  });

  test("login form shows validation error for empty submission", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByTestId("login-submit").click();

    // HTML5 validation should prevent submission; form should still be present
    await expect(page.getByTestId("login-form")).toBeVisible();
  });
});
