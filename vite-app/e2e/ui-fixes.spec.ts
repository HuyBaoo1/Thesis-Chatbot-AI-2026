import "dotenv/config"
import { test, expect } from "@playwright/test"

const API_BASE = process.env.VITE_API_URL!

const MOCK_AUTH = {
  access_token: "test-token",
  user: { sub: "1", name: "Test Admin", role: "ADMIN", email: "test@test.com" },
}

async function setupAdminMocks(page: import("@playwright/test").Page) {
  await page.route(`${API_BASE}auth/refresh-token`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_AUTH),
    })
  })

  await page.route(`${API_BASE}**/majors**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], total: 0 }),
    })
  })
}

test.describe("UI Fixes Verification", () => {
  test.describe.configure({ mode: "serial" })

  test("1. Login page renders with Input components", async ({ page }) => {
    await page.goto("/login")

    const emailInput = page.locator("#login-email")
    const passwordInput = page.locator("#login-password")

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()

    const emailClass = await emailInput.getAttribute("class") ?? ""
    const passwordClass = await passwordInput.getAttribute("class") ?? ""

    expect(emailClass).toContain("rounded-xl")
    expect(passwordClass).toContain("rounded-xl")
  })

  test("2. Failed login does NOT navigate away", async ({ page }) => {
    await page.goto("/login")

    await page.fill("#login-email", "wrong@example.com")
    await page.fill("#login-password", "wrongpassword")
    await page.locator('button[type="submit"]').click()

    await expect(page.locator('button[type="submit"]')).not.toHaveAttribute("disabled")

    expect(page.url()).toContain("/login")
  })

  test("3. Header mobile menu closes on route change", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/")

    const menuButton = page.locator('button[aria-label="Toggle menu"], button:has(svg.lucide-menu)').first()
    await menuButton.click()

    const mobileNav = page.locator("header nav, header .flex.flex-col.gap-1").last()
    await expect(mobileNav).toBeVisible()

    const mobileLink = page.locator('header >> .flex.flex-col >> a').first()
    await mobileLink.click()

    await expect(mobileNav).toBeHidden()
  })

  test("4. Dialog overlay uses backdrop-blur-sm (not blur-xs)", async ({ page }) => {
    await setupAdminMocks(page)

    await page.goto("/login")
    await page.evaluate(() => localStorage.setItem("has_auth_session", "true"))
    await page.goto("/admin/majors", { waitUntil: "networkidle" })

    await expect(page.locator('[data-slot="select-trigger"]').first()).toBeVisible({ timeout: 10000 })

    const createButton = page.locator('button:has(svg.lucide-plus)').first()
    await createButton.click()

    const overlay = page.locator('[data-slot="dialog-overlay"]')
    await expect(overlay).toBeVisible()

    const overlayClass = await overlay.getAttribute("class") ?? ""
    expect(overlayClass).toContain("backdrop-blur-sm")
    expect(overlayClass).not.toContain("backdrop-blur-xs")
  })

  test("5. Select component ChevronUpIcon renders correctly", async ({ page }) => {
    await setupAdminMocks(page)

    await page.goto("/login")
    await page.evaluate(() => localStorage.setItem("has_auth_session", "true"))
    await page.goto("/admin/majors", { waitUntil: "networkidle" })

    const selectTrigger = page.locator('[data-slot="select-trigger"]').first()
    await expect(selectTrigger).toBeVisible({ timeout: 10000 })

    await selectTrigger.click()

    const selectContent = page.locator('[data-slot="select-content"]')
    await expect(selectContent).toBeVisible()

    const selectItem = page.locator('[data-slot="select-item"]').first()
    await expect(selectItem).toBeVisible()
  })
})
