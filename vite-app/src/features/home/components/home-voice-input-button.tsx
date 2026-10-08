import { useEffect, useRef, useState } from "react"
import { LoaderCircle, Mic, Square } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { transcribeAudio } from "@/api/asr-api"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type VoiceInputStatus = "idle" | "requesting" | "recording" | "transcribing"

type HomeVoiceInputButtonProps = {
  disabled?: boolean
  onTranscript: (transcript: string) => void
}

const MAX_RECORDING_DURATION_MS = 14_500
const RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
]

const getSupportedMimeType = () =>
  RECORDING_MIME_TYPES.find((mimeType) =>
    MediaRecorder.isTypeSupported(mimeType)
  ) ?? ""

const getAudioFilename = (mimeType: string) => {
  if (mimeType.includes("mp4")) {
    return "question.m4a"
  }

  if (mimeType.includes("ogg")) {
    return "question.ogg"
  }

  return "question.webm"
}

const HomeVoiceInputButton = ({
  disabled = false,
  onTranscript,
}: HomeVoiceInputButtonProps) => {
  const [status, setStatus] = useState<VoiceInputStatus>("idle")
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const microphoneRequestIdRef = useRef(0)
  const microphoneRequestPendingRef = useRef(false)
  const mountedRef = useRef(true)
  const { t } = useTranslation("home")

  const clearStopTimer = () => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
  }

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const resetRecorder = () => {
    clearStopTimer()
    releaseStream()
    recorderRef.current = null
  }

  const finishRecording = async (recorder: MediaRecorder) => {
    const mimeType = recorder.mimeType.split(";", 1)[0] || "audio/webm"
    const audio = new Blob(chunksRef.current, { type: mimeType })

    chunksRef.current = []
    resetRecorder()

    if (!mountedRef.current) {
      return
    }

    if (!audio.size) {
      setStatus("idle")
      toast.error(t("chat.voiceNoAudio"))
      return
    }

    setStatus("transcribing")

    try {
      const result = await transcribeAudio(audio, getAudioFilename(mimeType))

      if (!mountedRef.current) {
        return
      }

      onTranscript(result.transcript)
    } catch {
      if (mountedRef.current) {
        toast.error(t("chat.voiceTranscriptionFailed"))
      }
    } finally {
      if (mountedRef.current) {
        setStatus("idle")
      }
    }
  }

  const stopRecording = () => {
    clearStopTimer()

    if (recorderRef.current?.state !== "inactive") {
      recorderRef.current?.stop()
    }
  }

  const startRecording = async () => {
    if (microphoneRequestPendingRef.current || recorderRef.current) {
      return
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      toast.error(t("chat.voiceUnsupported"))
      return
    }

    microphoneRequestPendingRef.current = true
    const microphoneRequestId = ++microphoneRequestIdRef.current
    setStatus("requesting")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      if (
        !mountedRef.current ||
        microphoneRequestId !== microphoneRequestIdRef.current
      ) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      const mimeType = getSupportedMimeType()

      streamRef.current = stream

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          chunksRef.current.push(event.data)
        }
      }
      recorder.onstop = () => {
        void finishRecording(recorder)
      }
      recorder.onerror = () => {
        recorder.onstop = null
        chunksRef.current = []
        resetRecorder()
        if (mountedRef.current) {
          setStatus("idle")
          toast.error(t("chat.voiceRecordingFailed"))
        }
      }

      recorder.start()
      setStatus("recording")
      stopTimerRef.current = setTimeout(
        stopRecording,
        MAX_RECORDING_DURATION_MS
      )
    } catch (error) {
      if (
        !mountedRef.current ||
        microphoneRequestId !== microphoneRequestIdRef.current
      ) {
        return
      }

      resetRecorder()
      setStatus("idle")

      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? t("chat.voicePermissionDenied")
          : t("chat.voiceRecordingFailed")

      toast.error(message)
    } finally {
      if (microphoneRequestId === microphoneRequestIdRef.current) {
        microphoneRequestPendingRef.current = false
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      microphoneRequestIdRef.current += 1
      microphoneRequestPendingRef.current = false
      clearStopTimer()

      const recorder = recorderRef.current
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null
        recorder.onstop = null
        recorder.onerror = null
        recorder.stop()
      }

      releaseStream()
    }
  }, [])

  const isRequesting = status === "requesting"
  const isRecording = status === "recording"
  const isTranscribing = status === "transcribing"
  const label = isRecording
    ? t("chat.voiceStop")
    : isRequesting
      ? t("chat.voiceRequesting")
      : isTranscribing
        ? t("chat.voiceProcessing")
        : t("chat.voiceStart")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={label}
          aria-pressed={isRecording}
          data-testid="voice-input-button"
          disabled={
            isRequesting || isTranscribing || (disabled && !isRecording)
          }
          onClick={() => {
            if (isRecording) {
              stopRecording()
              return
            }

            void startRecording()
          }}
          className={`relative h-8 w-8 cursor-pointer rounded-xl shadow-none ${
            isRecording
              ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          }`}
        >
          {isRequesting || isTranscribing ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : isRecording ? (
            <Square className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export default HomeVoiceInputButton
