import { z } from "zod"

import { admissionCategoryOptions } from "@/types/knowledge-chunk-type"

const admissionCategoryValues = admissionCategoryOptions.map((item) => item.value) as [
  string,
  ...string[],
]

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => value || undefined)

const optionalNumberFromInput = (minimum: number, message: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined
      }

      return Number(value)
    },
    z.number().int().min(minimum, message).optional()
  )

const optionalUuid = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined
    }

    return value
  },
  z.uuid("Major ID must be a valid UUID").optional()
)

const optionalUrl = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined
    }

    return value
  },
  z.url("Source URL is invalid").optional()
)

const knowledgeChunkFormSchema = z.object({
  major_id: optionalUuid,
  category: z.enum(admissionCategoryValues as [string, ...string[]]),
  title: optionalTrimmedString,
  content: z.string().trim().min(1, "Content is required"),
  year: optionalNumberFromInput(2000, "Year must be at least 2000"),
  source: optionalTrimmedString,
  source_url: optionalUrl,
  version: z.coerce.number().int().min(1, "Version must be at least 1"),
})

type KnowledgeChunkFormInput = z.input<typeof knowledgeChunkFormSchema>
type KnowledgeChunkFormValues = z.output<typeof knowledgeChunkFormSchema>

export { knowledgeChunkFormSchema }
export type { KnowledgeChunkFormInput, KnowledgeChunkFormValues }
