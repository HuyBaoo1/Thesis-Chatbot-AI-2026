import "dotenv/config"
import { expect, test } from "@playwright/test"

const API_BASE = process.env.VITE_API_URL!

const FIRST_SUGGESTION = "Tell me about tuition"
const SECOND_SUGGESTION = "Tell me about scholarships"
const THIRD_SUGGESTION = "Tell me about the application process"

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
