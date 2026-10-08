import axios from "@/lib/axios"

type AsrTranscriptionResponse = {
  transcript: string
  language: string
  duration_seconds: number
  model: string
  requires_user_review: boolean
}

const transcribeAudio = async (
  audio: Blob,
  filename: string
): Promise<AsrTranscriptionResponse> => {
  const formData = new FormData()

  formData.append("file", audio, filename)

  return await axios.post("asr/transcribe", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
}

export { transcribeAudio }
export type { AsrTranscriptionResponse }
