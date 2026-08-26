import { test, expect } from "@playwright/test";

test.describe("Health check", () => {
  test("health endpoint returns 200", async ({ request }) => {
    const response = await request.get("/api/health");

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body.status).toBe("healthy");
  });
});
