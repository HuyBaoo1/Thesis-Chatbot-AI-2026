import axios from "@/lib/axios"
import type {
  ChatConversation,
  ChatConversationListParams,
  ChatConversationStatus,
  ChatConversationsPage,
  ChatMessage,
  ChatMessagesPage,
  ChatQueryRequest,
  ChatQueryResponse,
  LeadInitRequest,
  LeadInitResponse,
  MessageSources,
} from "@/types/chat-type"

type PublicConversationAccess = {
  leadId?: string | null
  conversationToken?: string | null
}

const buildPublicConversationParams = (access?: PublicConversationAccess) => {
  const params: Record<string, string> = {}

  if (access?.leadId) {
    params.lead_id = access.leadId
  }

  if (access?.conversationToken) {
    params.conversation_token = access.conversationToken
  }

  return Object.keys(params).length > 0 ? params : undefined
}

const initLead = async (data: LeadInitRequest): Promise<LeadInitResponse> => {
  return await axios.post("chat/init-lead", data)
}

const queryChat = async (
  data: ChatQueryRequest
): Promise<ChatQueryResponse> => {
  return await axios.post("chat/query", data)
}

const getConversations = async (
  params?: ChatConversationListParams
): Promise<ChatConversationsPage> => {
  return await axios.get("chat/conversations", { params })
}

const getConversation = async (
  conversationId: string,
  access?: PublicConversationAccess
): Promise<ChatConversation> => {
  return await axios.get(`chat/conversations/${conversationId}`, {
    params: buildPublicConversationParams(access),
  })
}

const updateConversationStatus = async (
  conversationId: string,
  status: ChatConversationStatus
): Promise<ChatConversation> => {
  return await axios.patch(`chat/conversations/${conversationId}/status`, {
    status,
  })
}

const createStaffMessage = async (
  conversationId: string,
  content: string
): Promise<ChatMessage> => {
  return await axios.post(
    `chat/conversations/${conversationId}/staff-messages`,
    {
      content,
    }
  )
}

const requestConversationStaffContact = async (
  conversationId: string,
  access?: PublicConversationAccess
): Promise<ChatConversation> => {
  return await axios.post(
    `chat/conversations/${conversationId}/contact-staff-request`,
    {},
    {
      params: buildPublicConversationParams(access),
    }
  )
}

const getConversationMessages = async (
  conversationId: string,
  params?: {
    before?: string | null
    limit?: number
  } & PublicConversationAccess
): Promise<ChatMessagesPage> => {
  const { leadId, conversationToken, ...queryParams } = params ?? {}
  const publicParams =
    buildPublicConversationParams({
      leadId,
      conversationToken,
    }) ?? {}

  return await axios.get(`chat/conversations/${conversationId}/messages`, {
    params: {
      ...queryParams,
      ...publicParams,
    },
  })
}

const getMessageSources = async (messageId: string): Promise<MessageSources> => {
  return await axios.get(`chat/messages/${messageId}/sources`)
}

export {
  initLead,
  queryChat,
  getConversations,
  getConversation,
  updateConversationStatus,
  createStaffMessage,
  requestConversationStaffContact,
  getConversationMessages,
  getMessageSources,
}
