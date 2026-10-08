import "dotenv/config"
import { expect, test } from "@playwright/test"

const API_BASE = process.env.VITE_API_URL!
const TRANSCRIPT =
  "Học phí ngành Computer Science and Engineering là bao nhiêu?"

test("voice input fills the existing draft without sending it", async ({
  page,
}) => {
  let chatRequests = 0
  let transcriptionRequests = 0

  await page.addInitScript(() => {
    class MockMediaRecorder {
      static isTypeSupported() {
        return true
      }

      state: RecordingState = "inactive"
      mimeType = "audio/webm"
      ondataavailable: ((event: BlobEvent) => void) | null = null
      onstop: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null

      start() {
        this.state = "recording"
      }

      stop() {
        this.state = "inactive"
        this.ondataavailable?.(
          new BlobEvent("dataavailable", {
            data: new Blob(["recorded-audio"], { type: this.mimeType }),
          })
        )
        this.onstop?.(new Event("stop"))
      }
    }

    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: MockMediaRecorder,
    })
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop: () => undefined }],
        }),
      },
    })
  })

  await page.route(`${API_BASE}asr/transcribe`, async (route) => {
    transcriptionRequests += 1
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        transcript: TRANSCRIPT,
        language: "vi",
        duration_seconds: 3.2,
        model: "vinai/PhoWhisper-small",
        requires_user_review: true,
      }),
    })
  })
  await page.route(`${API_BASE}chat/query`, async (route) => {
    chatRequests += 1
    await route.abort()
  })

  await page.goto("/")

  const voiceButton = page.getByTestId("voice-input-button")
  await expect(voiceButton).toBeVisible()
  await expect(voiceButton).toHaveAttribute("aria-pressed", "false")

  await voiceButton.click()
  await expect(voiceButton).toHaveAttribute("aria-pressed", "true")

  await voiceButton.click()

  const composer = page.locator("textarea")
  await expect(composer).toHaveValue(TRANSCRIPT)
  await expect(composer).toBeFocused()
  expect(transcriptionRequests).toBe(1)
  expect(chatRequests).toBe(0)

  await composer.fill(`${TRANSCRIPT} Tôi muốn kiểm tra lại.`)
  await expect(composer).toHaveValue(`${TRANSCRIPT} Tôi muốn kiểm tra lại.`)
})

test("voice input requests only one microphone stream while permission is pending", async ({
  page,
}) => {
  await page.addInitScript(() => {
    type VoiceTestWindow = Window & {
      getMicrophoneRequestCount: () => number
      resolveMicrophoneRequest: () => void
    }

    class MockMediaRecorder {
      static isTypeSupported() {
        return true
      }

      state: RecordingState = "inactive"
      mimeType = "audio/webm"
      ondataavailable: ((event: BlobEvent) => void) | null = null
      onstop: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null

      start() {
        this.state = "recording"
      }

      stop() {
        this.state = "inactive"
        this.ondataavailable?.(
          new BlobEvent("dataavailable", {
            data: new Blob(["recorded-audio"], { type: this.mimeType }),
          })
        )
        this.onstop?.(new Event("stop"))
      }
    }

    let microphoneRequestCount = 0
    let resolveMicrophoneRequest: ((stream: MediaStream) => void) | undefined
    const pendingStream = new Promise<MediaStream>((resolve) => {
      resolveMicrophoneRequest = resolve
    })
    const testWindow = window as VoiceTestWindow

    testWindow.getMicrophoneRequestCount = () => microphoneRequestCount
    testWindow.resolveMicrophoneRequest = () => {
      resolveMicrophoneRequest?.({
        getTracks: () => [{ stop: () => undefined }],
      } as MediaStream)
    }

    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: MockMediaRecorder,
    })
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: () => {
          microphoneRequestCount += 1
          return pendingStream
        },
      },
    })
  })

  await page.goto("/")

  const voiceButton = page.getByTestId("voice-input-button")
  await voiceButton.dblclick()

  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as Window & {
            getMicrophoneRequestCount: () => number
          }
        ).getMicrophoneRequestCount()
      )
    )
    .toBe(1)

  await page.evaluate(() =>
    (
      window as Window & {
        resolveMicrophoneRequest: () => void
      }
    ).resolveMicrophoneRequest()
  )
})

test("voice input releases a microphone stream resolved after leaving the page", async ({
  page,
}) => {
  await page.addInitScript(() => {
    type VoiceTestWindow = Window & {
      getRecorderStartCount: () => number
      getTrackStopCount: () => number
      resolveMicrophoneRequest: () => void
    }

    let recorderStartCount = 0
    let trackStopCount = 0

    class MockMediaRecorder {
      static isTypeSupported() {
        return true
      }

      state: RecordingState = "inactive"
      mimeType = "audio/webm"
      ondataavailable: ((event: BlobEvent) => void) | null = null
      onstop: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null

      start() {
        recorderStartCount += 1
        this.state = "recording"
      }

      stop() {
        this.state = "inactive"
      }
    }

    let resolveMicrophoneRequest: ((stream: MediaStream) => void) | undefined
    const pendingStream = new Promise<MediaStream>((resolve) => {
      resolveMicrophoneRequest = resolve
    })
    const testWindow = window as VoiceTestWindow

    testWindow.getRecorderStartCount = () => recorderStartCount
    testWindow.getTrackStopCount = () => trackStopCount
    testWindow.resolveMicrophoneRequest = () => {
      resolveMicrophoneRequest?.({
        getTracks: () => [
          {
            stop: () => {
              trackStopCount += 1
            },
          },
        ],
      } as MediaStream)
    }

    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: MockMediaRecorder,
    })
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: () => pendingStream,
      },
    })
  })

  await page.goto("/")
  await page.getByTestId("voice-input-button").click()

  await page.evaluate(() => {
    window.history.pushState({}, "", "/not-found")
    window.dispatchEvent(new PopStateEvent("popstate"))
  })
  await expect(page.getByTestId("voice-input-button")).toBeHidden()

  await page.evaluate(() =>
    (
      window as Window & {
        resolveMicrophoneRequest: () => void
      }
    ).resolveMicrophoneRequest()
  )

  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as Window & {
            getTrackStopCount: () => number
          }
        ).getTrackStopCount()
      )
    )
    .toBe(1)
  expect(
    await page.evaluate(() =>
      (
        window as Window & {
          getRecorderStartCount: () => number
        }
      ).getRecorderStartCount()
    )
  ).toBe(0)
})
