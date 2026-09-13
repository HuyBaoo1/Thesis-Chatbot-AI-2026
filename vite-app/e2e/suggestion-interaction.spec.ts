import "dotenv/config"
import { expect, test } from "@playwright/test"

const API_BASE = process.env.VITE_API_URL!
const TELEGRAM_BOT_URL = process.env.VITE_TELEGRAM_BOT_URL ?? ""

const FIRST_SUGGESTION = "Tell me about tuition"
const SECOND_SUGGESTION = "Tell me about scholarships"
const THIRD_SUGGESTION = "Tell me about the application process"

const isDarkReadableColor = (color: string) => {
  if (color.startsWith("oklch(")) {
    const lightness = Number(color.match(/oklch\(([\d.]+)/)?.[1])

    return Number.isFinite(lightness) && lightness < 0.55
  }

  const channels = color.match(/\d+/g)?.map(Number) ?? []

  if (channels.length < 3) {
    return false
  }

  const [red, green, blue] = channels
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue

  return luminance < 140
}

const isNearBlackColor = (color: string) => {
  if (color.startsWith("oklch(")) {
    const lightness = Number(color.match(/oklch\(([\d.]+)/)?.[1])

    return Number.isFinite(lightness) && lightness <= 0.25
  }

  const channels = color.match(/\d+/g)?.map(Number) ?? []

  if (channels.length < 3) {
    return false
  }

  const [red, green, blue] = channels

  return red <= 40 && green <= 40 && blue <= 40
}

const isReadableOnWhiteColor = (color: string) => {
  if (color.startsWith("oklch(")) {
    const lightness = Number(color.match(/oklch\(([\d.]+)/)?.[1])

    return Number.isFinite(lightness) && lightness < 0.75
  }

  const channels = color.match(/\d+/g)?.map(Number) ?? []

  if (channels.length < 3) {
    return false
  }

  const [red, green, blue] = channels
  const relative = [red, green, blue].map((value) => {
    const normalized = value / 255

    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })
  const [relativeRed, relativeGreen, relativeBlue] = relative
  const luminance =
    0.2126 * relativeRed + 0.7152 * relativeGreen + 0.0722 * relativeBlue
  const whiteContrast = 1.05 / (luminance + 0.05)

  return whiteContrast >= 4.5
}

type ChatRequest = {
  lead_id: string
  conversation_id?: string | null
  conversation_token?: string | null
  query: string
}

const chatResponse = ({
  query,
  requestIndex,
  suggestions = [],
}: {
  query: string
  requestIndex: number
  suggestions?: string[]
}) => ({
  conversation_id: "conversation-1",
  conversation_token: null,
  lead_id: "lead-1",
  lead_temperature: null,
  lead_score: null,
  conversation_status: "OPEN",
  conversation_staff_id: null,
  user_message_id: `user-${requestIndex}`,
  assistant_message_id: `assistant-${requestIndex}`,
  answer: `Answer for: ${query}`,
  confidence: 0.9,
  blocked: false,
  retrieval_mode: "hybrid",
  selected_tools: [],
  citations: [],
  sources: [],
  follow_up_suggestions: suggestions,
  created_at: "2026-09-11T00:00:00Z",
})

const emptyConversation = {
  id: "conversation-1",
  conversation_token: null,
  lead_id: "lead-1",
  lead_full_name: "Suggestion Test",
  lead_email: "suggestion@example.com",
  lead_phone: null,
  lead_temperature: null,
  lead_score: null,
  staff_id: null,
  staff_name: null,
  channel: "WEB",
  status: "OPEN",
  summary: null,
  last_message: null,
  last_message_at: null,
  message_count: 0,
  created_at: "2026-09-11T00:00:00Z",
  updated_at: "2026-09-11T00:00:00Z",
}

async function setupChatMocks(
  page: import("@playwright/test").Page,
  options: { delaySuggestionResponse?: boolean } = {}
) {
  const chatRequests: ChatRequest[] = []

  await page.route(`${API_BASE}chat/init-lead`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        lead_id: "lead-1",
        full_name: "Suggestion Test",
        email: "suggestion@example.com",
        phone: null,
      }),
    })
  })

  await page.route(`${API_BASE}chat/query`, async (route) => {
    const body = route.request().postDataJSON() as ChatRequest
    chatRequests.push(body)

    if (options.delaySuggestionResponse && body.query === FIRST_SUGGESTION) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        chatResponse({
          query: body.query,
          requestIndex: chatRequests.length,
          suggestions:
            chatRequests.length === 1
              ? [FIRST_SUGGESTION, SECOND_SUGGESTION, THIRD_SUGGESTION]
              : [],
        })
      ),
    })
  })

  await page.route(
    `${API_BASE}chat/conversations/conversation-1`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyConversation),
      })
    }
  )

  await page.route(
    `${API_BASE}chat/conversations/conversation-1/messages**`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          conversation_id: "conversation-1",
          items: [],
          total: 0,
          limit: 10,
          before: null,
          next_before: null,
          has_more: false,
        }),
      })
    }
  )

  return chatRequests
}

async function startConversation(page: import("@playwright/test").Page) {
  await page.goto("/")
  await page.locator("textarea").fill("Initial question")
  await page.getByRole("button", { name: /send/i }).last().click()
  await page.locator("#lead-full-name").fill("Suggestion Test")
  await page.locator("#lead-email").fill("suggestion@example.com")
  await page.locator("form button[type='submit']").click()

  await expect(page.getByText(`Answer for: Initial question`)).toBeVisible()
  await expect(
    page.getByRole("button", { name: new RegExp(FIRST_SUGGESTION) })
  ).toBeVisible()
}

test.describe("public chat follow-up suggestions", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
    await page.goto("/")
    await page.evaluate(() => localStorage.clear())
  })

  test("shows the configured Telegram CTA with the provided icon", async ({
    page,
  }) => {
    test.skip(!TELEGRAM_BOT_URL, "VITE_TELEGRAM_BOT_URL is required")

    const telegramLink = page.getByRole("link", { name: /telegram/i })

    await expect(telegramLink).toBeVisible()
    await expect(telegramLink).toBeEnabled()
    await expect(telegramLink).toHaveAttribute("href", TELEGRAM_BOT_URL)
    await expect(telegramLink).toHaveAttribute("target", "_blank")
    await expect(telegramLink).toHaveAttribute("rel", /noopener/)
    const telegramIcon = telegramLink.locator(
      '[data-testid="telegram-cta-icon"]'
    )

    await expect(telegramIcon).toBeVisible()
    await expect(telegramIcon).toHaveAttribute("src", "/telegram-icon.webp")
  })

  test("keeps the lead form readable on its white surface", async ({
    page,
  }) => {
    await page.evaluate(() => localStorage.setItem("theme", "dark"))
    await page.reload()
    await setupChatMocks(page)

    await page.locator("textarea").fill("Initial question")
    await page.getByRole("button", { name: /send/i }).last().click()

    const dialog = page.getByTestId("home-lead-form-dialog")
    await expect(dialog).toBeVisible()

    const dialogStyle = await dialog.evaluate((element) => {
      const style = window.getComputedStyle(element)

      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
      }
    })

    expect(dialogStyle.backgroundColor).toBe("rgb(255, 255, 255)")
    expect(isDarkReadableColor(dialogStyle.color)).toBe(true)

    const labelColor = await page
      .locator("label[for='lead-full-name']")
      .evaluate((element) => window.getComputedStyle(element).color)
    expect(isNearBlackColor(labelColor)).toBe(true)

    const nameInput = page.locator("#lead-full-name")
    await expect(nameInput).toHaveClass(/text-black/)
    await expect(nameInput).toHaveClass(/caret-black/)
    await expect(nameInput).toHaveClass(/placeholder:text-slate-500/)
    await expect(nameInput).toHaveClass(/\[-webkit-text-fill-color:#000000\]/)

    await page.locator("form button[type='submit']").click()
    const validationError = page.locator("[data-slot='field-error']").first()
    await expect(validationError).toBeVisible()
    const validationErrorColor = await validationError.evaluate(
      (element) => window.getComputedStyle(element).color
    )
    expect(isReadableOnWhiteColor(validationErrorColor)).toBe(true)

    await nameInput.fill("Suggestion Test")
    await expect(nameInput).toHaveValue("Suggestion Test")

    const inputColor = await nameInput.evaluate(
      (element) => window.getComputedStyle(element).color
    )
    expect(isNearBlackColor(inputColor)).toBe(true)
    const caretColor = await nameInput.evaluate(
      (element) => window.getComputedStyle(element).caretColor
    )
    expect(isNearBlackColor(caretColor)).toBe(true)

    await page.locator("#lead-email").fill("suggestion@example.com")
    await page.locator("form button[type='submit']").click()

    await expect(page.getByText("Answer for: Initial question")).toBeVisible()
  })

  test("render as interactive buttons and submit through the existing chat flow", async ({
    page,
  }) => {
    const chatRequests = await setupChatMocks(page)

    await startConversation(page)

    const firstSuggestion = page.getByRole("button", {
      name: new RegExp(FIRST_SUGGESTION),
    })
    await expect(firstSuggestion).toBeEnabled()

    await firstSuggestion.click()

    await expect(
      page.getByText(`Answer for: ${FIRST_SUGGESTION}`)
    ).toBeVisible()
    expect(chatRequests).toHaveLength(2)
    expect(chatRequests[1].query).toBe(FIRST_SUGGESTION)
    await expect(page.getByText(FIRST_SUGGESTION).first()).toBeVisible()
  })

  test("does not duplicate a suggestion message while chat is loading", async ({
    page,
  }) => {
    const chatRequests = await setupChatMocks(page, {
      delaySuggestionResponse: true,
    })

    await startConversation(page)

    const firstSuggestion = page.getByRole("button", {
      name: new RegExp(FIRST_SUGGESTION),
    })

    await firstSuggestion.dblclick()

    await expect(
      page.getByText(`Answer for: ${FIRST_SUGGESTION}`)
    ).toBeVisible()
    expect(
      chatRequests.filter((request) => request.query === FIRST_SUGGESTION)
    ).toHaveLength(1)
  })

  test("keeps normal manual text input and Send behavior working", async ({
    page,
  }) => {
    const chatRequests = await setupChatMocks(page)

    await startConversation(page)

    await page.locator("textarea").fill("Manual follow-up question")
    await page.getByRole("button", { name: /send/i }).last().click()

    await expect(
      page.getByText("Answer for: Manual follow-up question")
    ).toBeVisible()
    expect(chatRequests.at(-1)?.query).toBe("Manual follow-up question")
  })
})
