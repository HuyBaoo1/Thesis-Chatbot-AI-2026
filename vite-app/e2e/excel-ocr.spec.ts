import "dotenv/config"
import { test, expect } from "@playwright/test"
import * as path from "path"
import * as fs from "fs"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_BASE = process.env.VITE_API_URL!

const MOCK_AUTH = {
  access_token: "test-token",
  user: { sub: "1", name: "Test Admin", role: "ADMIN", email: "test@test.com" },
}

// ---------------------------------------------------------------------------
// Test file fixtures
// ---------------------------------------------------------------------------

function generateCsvContent(): string {
  return [
    "Name,Age,Score",
    "Nguyễn Văn A,20,8.5",
    "Trần Thị B,21,9.0",
    "Lê Văn C,19,7.8",
  ].join("\n")
}

const MINIMAL_XLSX_BASE64 =
  "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"

const UPLOAD_BUTTON_SELECTOR = 'button:has(svg.lucide-upload)'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function gotoAdminQuickProcessing(page: import("@playwright/test").Page) {
  await page.goto("/login")
  await page.evaluate(() => localStorage.setItem("has_auth_session", "true"))
  await page.goto("/admin/quick-processing", { waitUntil: "networkidle" })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Excel OCR Upload", () => {
  test.describe.configure({ mode: "serial" })

  let fixturesDir: string

  test.beforeAll(() => {
    fixturesDir = path.resolve(__dirname, "..", "test-results", "excel-fixtures")
    fs.mkdirSync(fixturesDir, { recursive: true })
    fs.writeFileSync(path.join(fixturesDir, "test.csv"), generateCsvContent(), "utf-8")
    fs.writeFileSync(path.join(fixturesDir, "test.xlsx"), Buffer.from(MINIMAL_XLSX_BASE64, "base64"))
  })

  test("1. Upload dialog accepts Excel file types (.xlsx, .xls, .csv)", async ({ page }) => {
    await page.route(`${API_BASE}auth/refresh-token`, async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify(MOCK_AUTH),
      })
    })
    await page.route(`**/ocr-quick/jobs**`, async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ jobs: [], total: 0, page: 1, page_size: 50, pages: 0 }),
      })
    })

    await gotoAdminQuickProcessing(page)

    await page.locator(UPLOAD_BUTTON_SELECTOR).first().click()
    const dialog = page.locator('[data-slot="dialog-content"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const accept = await dialog.locator('input[type="file"]').getAttribute("accept")
    expect(accept).toContain(".xlsx")
    expect(accept).toContain(".xls")
    expect(accept).toContain(".csv")
  })

  test("2. Upload CSV file creates OCR job", async ({ page }) => {
    let ocrPostCalled = false

    await page.route(`**/ocr-quick/jobs**`, async (route) => {
      if (route.request().method() === "POST") {
        ocrPostCalled = true
        return route.fulfill({
          status: 201, contentType: "application/json",
          body: JSON.stringify({
            job_id: "excel-001", status: "queued",
            original_filename: "test.csv", title: "Test CSV OCR", category: "FAQ",
          }),
        })
      }
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ jobs: [], total: 0, page: 1, page_size: 50, pages: 0 }),
      })
    })
    await page.route(`${API_BASE}auth/refresh-token`, async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify(MOCK_AUTH),
      })
    })

    await gotoAdminQuickProcessing(page)
    await page.locator(UPLOAD_BUTTON_SELECTOR).first().click()

    const dialog = page.locator('[data-slot="dialog-content"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    await dialog.locator('input[type="file"]').setInputFiles(path.join(fixturesDir, "test.csv"))
    await dialog.locator("#ocr-upload-title").fill("Test CSV OCR")
    await expect(dialog.locator("#ocr-upload-title")).toHaveValue("Test CSV OCR")

    await dialog.locator('button:has(svg.lucide-file-up)').first().click()
    expect(ocrPostCalled).toBe(true)
  })

  test("3. Completed Excel OCR job shows in table with Vietnamese preview", async ({ page }) => {
    const mockMarkdown = [
      "## Sheet: Sheet1", "",
      "| Name | Age | Score |",
      "|-------|-----|-------|",
      "| Nguyễn Văn A | 20 | 8.5 |",
      "| Trần Thị B | 21 | 9.0 |",
      "",
    ].join("\n")

    // General routes first (lower priority)
    await page.route(`${API_BASE}auth/refresh-token`, async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify(MOCK_AUTH),
      })
    })
    await page.route(`**/ocr-quick/jobs**`, async (route) => {
      const url = route.request().url()
      // Let specific job sub-routes fall through to later handlers
      if (url.includes("/content") || url.includes("/download") || url.includes("/send-to-kb")) {
        return route.fallback()
      }
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          jobs: [{
            job_id: "excel-002", status: "completed",
            original_filename: "students.xlsx", title: "Student Scores",
            category: "ADMISSIONS", pages: 1,
          }],
          total: 1, page: 1, page_size: 50, pages: 1,
        }),
      })
    })

    // Specific routes after (higher priority — checked first in LIFO)
    await page.route(`${API_BASE}ocr-quick/jobs/excel-002/content`, async (route) => {
      await route.fulfill({
        status: 200, contentType: "text/markdown; charset=utf-8",
        body: mockMarkdown,
      })
    })
    await page.route(`${API_BASE}ocr-quick/jobs/excel-002/download`, async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ url: `${API_BASE}ocr-quick/jobs/excel-002/content` }),
      })
    })

    await gotoAdminQuickProcessing(page)
    await expect(page.locator("text=Student Scores")).toBeVisible({ timeout: 10000 })

    // Open preview
    await page.locator('button:has(svg.lucide-eye)').first().click()
    const previewDialog = page.locator('[data-slot="dialog-content"]')
    await expect(previewDialog).toBeVisible({ timeout: 5000 })

    // Wait for textarea to appear (content loaded) and verify Vietnamese text
    const textarea = previewDialog.locator("textarea")
    await expect(textarea).toBeVisible({ timeout: 5000 })
    await expect(textarea).toContainText("Nguyễn Văn A")
    await expect(textarea).toContainText("Trần Thị B")
    await expect(textarea).toContainText("Sheet1")
  })

  test("4. Send Excel OCR result to Knowledge Base", async ({ page }) => {
    let sendToKbReceived = false

    await page.route(`${API_BASE}auth/refresh-token`, async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify(MOCK_AUTH),
      })
    })
    await page.route(`**/ocr-quick/jobs**`, async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          jobs: [{
            job_id: "excel-003", status: "completed",
            original_filename: "data.xlsx", title: "Admission Data",
            category: "ADMISSIONS", pages: 2,
          }],
          total: 1, page: 1, page_size: 50, pages: 1,
        }),
      })
    })
    await page.route(`${API_BASE}ocr-quick/jobs/excel-003/content`, async (route) => {
      await route.fulfill({
        status: 200, contentType: "text/markdown",
        body: "## Sheet: Sheet1\n\n| Name | Score |\n|-------|-------|\n| A | 8.5 |\n",
      })
    })
    await page.route(`${API_BASE}ocr-quick/jobs/excel-003/download`, async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ url: `${API_BASE}ocr-quick/jobs/excel-003/content` }),
      })
    })
    await page.route(`${API_BASE}ocr-quick/jobs/excel-003/send-to-kb`, async (route) => {
      sendToKbReceived = true
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          job_id: "excel-003", status: "completed", sent_to_kb: "chunk-abc-123",
        }),
      })
    })

    await gotoAdminQuickProcessing(page)

    await expect(page.locator("text=Admission Data")).toBeVisible({ timeout: 10000 })
    await page.locator('button:has(svg.lucide-eye)').first().click()

    const previewDialog = page.locator('[data-slot="dialog-content"]')
    await expect(previewDialog).toBeVisible({ timeout: 5000 })

    await previewDialog.locator('button:has-text("Send to KB")').first().click()
    expect(sendToKbReceived).toBe(true)
  })

  test("5. File input does NOT accept unsupported formats", async ({ page }) => {
    await page.route(`${API_BASE}auth/refresh-token`, async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify(MOCK_AUTH),
      })
    })
    await page.route(`**/ocr-quick/jobs**`, async (route) => {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ jobs: [], total: 0, page: 1, page_size: 50, pages: 0 }),
      })
    })

    await gotoAdminQuickProcessing(page)
    await page.locator(UPLOAD_BUTTON_SELECTOR).first().click()

    const dialog = page.locator('[data-slot="dialog-content"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const accept = await dialog.locator('input[type="file"]').getAttribute("accept")
    expect(accept).toContain(".xlsx")
    expect(accept).toContain(".xls")
    expect(accept).toContain(".csv")
    expect(accept).not.toContain(".docx")
    expect(accept).not.toContain(".pptx")
    expect(accept).not.toContain(".txt")
  })
})
