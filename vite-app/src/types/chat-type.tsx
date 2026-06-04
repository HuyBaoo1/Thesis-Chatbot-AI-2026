import type { LeadTemperature } from "@/types/lead-type"

type LeadInitRequest = {
  full_name: string
  email?: string
  phone?: string
}

type LeadInitResponse = {
  lead_id: string
  full_name: string
  email: string | null
  phone: string | null
}

type ChatQueryRequest = {
  lead_id: string
  conversation_id?: string | null
  conversation_token?: string | null
  query: string
  top_k?: number
  source_domain?: string | null
}

type ChatSourceItem = {
  chunk_id: string | null
  category: string | null
  source: string | null
  score: number
  content: string
}

type ChatCitation = {
  url: string
}

type MessageSourceItem = {
  id: string
  message_id: string
  chunk_id: string
  rank: number | null
  score: number | null
  content: string | null
  category: string | null
  source: string | null
}

type MessageSources = {
  message_id: string
  items: MessageSourceItem[]
  total: number
}

type ChatRetrievalMode =
  | "none"
  | "direct"
  | "clarify"
  | "sparse"
  | "dense"
  | "hybrid"
  | "tool"
  | "handoff"
  | "error"

type ChatQueryResponse = {
  conversation_id: string
  conversation_token: string | null
  lead_id: string | null
  lead_temperature: LeadTemperature | null
  lead_score: number | null
  conversation_status: ChatConversationStatus | null
  conversation_staff_id: string | null
  user_message_id: string
  assistant_message_id: string | null
  answer: string
  confidence: number
  blocked: boolean
  retrieval_mode: ChatRetrievalMode
  selected_tools: string[]
  citations: ChatCitation[]
  sources: ChatSourceItem[]
  follow_up_suggestions: string[]
  created_at: string
}

type ChatConversation = {
  id: string
  conversation_token: string | null
  lead_id: string
  lead_full_name: string | null
  lead_email: string | null
  lead_phone: string | null
  lead_temperature: LeadTemperature | null
  lead_score: number | null
  staff_id: string | null
  staff_name: string | null
  channel: string | null
  status: ChatConversationStatus | null
  summary: string | null
  last_message: string | null
  last_message_at: string | null
  message_count: number
  created_at: string | null
  updated_at: string | null
}

type ChatConversationStatus = "OPEN" | "HANDOFF" | "CLOSED"

type ChatConversationListParams = {
  limit?: number
  before?: string | null
  status?: ChatConversationStatus
  channel?: string
  staff_id?: string
  assigned?: boolean
  q?: string
}

type ChatConversationsPage = {
  items: ChatConversation[]
  total: number
  limit: number
  before: string | null
  next_before: string | null
  has_more: boolean
}

type StaffChatMessageCreate = {
  content: string
}

type ChatMessage = {
  id: string
  conversation_id: string
  role: "USER" | "ASSISTANT" | "SYSTEM"
  content: string
  intent: string | null
  is_fallback: boolean
  citations?: ChatCitation[]
  created_at: string | null
}

type ChatMessagesPage = {
  conversation_id: string
  items: ChatMessage[]
  total: number
  limit: number
  before: string | null
  next_before: string | null
  has_more: boolean
}

export type {
  LeadInitRequest,
  LeadInitResponse,
  ChatRetrievalMode,
  ChatQueryRequest,
  ChatQueryResponse,
  ChatCitation,
  ChatSourceItem,
  MessageSourceItem,
  MessageSources,
  ChatConversation,
  ChatConversationStatus,
  ChatConversationListParams,
  ChatConversationsPage,
  StaffChatMessageCreate,
  ChatMessage,
  ChatMessagesPage,
}
