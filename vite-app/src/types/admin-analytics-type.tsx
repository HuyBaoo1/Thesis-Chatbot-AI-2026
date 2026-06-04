type IntentCount = {
  intent: string
  count: number
}

type DailyAnalytic = {
  id: string | null
  date: string
  total_chats: number
  new_leads: number
  fallbacks: number
  fallback_rate: number
  top_intents: Record<string, number>
}

type DailyAnalyticsPage = {
  items: DailyAnalytic[]
  total: number
  limit: number
  offset: number
  from: string
  to: string
  has_more: boolean
}

type DailyAnalyticsSummary = {
  from: string
  to: string
  days: number
  active_days: number
  total_chats: number
  new_leads: number
  fallbacks: number
  fallback_rate: number
  top_intents: IntentCount[]
}

type ConversationBreakdownItem = {
  status?: string | null
  channel?: string | null
  count: number
}

type ConversationStats = {
  total: number
  by_status: Array<{
    status: string | null
    count: number
  }>
  by_channel: Array<{
    channel: string | null
    count: number
  }>
}

type ConversionFunnelStage = {
  stage: string
  count: number
  conversion_from_previous: number | null
}

type ConversionFunnel = {
  stages: ConversionFunnelStage[]
}

type HotQuestion = {
  id: string
  question: string
  normalized: string | null
  intent: string | null
  count: number
  is_fallback: boolean
  last_conversation_id: string | null
  last_user_message_id: string | null
  last_assistant_message_id: string | null
  last_asked_at: string | null
  created_at: string | null
}

type HotQuestionsPage = {
  items: HotQuestion[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

type HotQuestionsSummary = {
  total_questions: number
  total_asks: number
  fallback_questions: number
  fallback_asks: number
  top_intents: IntentCount[]
}

export type {
  ConversationBreakdownItem,
  ConversationStats,
  ConversionFunnel,
  ConversionFunnelStage,
  DailyAnalytic,
  DailyAnalyticsPage,
  DailyAnalyticsSummary,
  HotQuestion,
  HotQuestionsPage,
  HotQuestionsSummary,
  IntentCount,
}
