import axios from "@/lib/axios"
import type {
  ConversationStats,
  ConversionFunnel,
  DailyAnalytic,
  DailyAnalyticsPage,
  DailyAnalyticsSummary,
  HotQuestion,
  HotQuestionsPage,
  HotQuestionsSummary,
} from "@/types/admin-analytics-type"

type AnalyticsRangeParams = {
  days?: number
  from?: string
  to?: string
}

type GetDailyAnalyticsParams = AnalyticsRangeParams & {
  limit?: number
  offset?: number
}

type GetHotQuestionsParams = {
  limit?: number
  offset?: number
  intent?: string
  fallback_only?: boolean
  q?: string
}

const getDailyAnalytics = async (
  params?: GetDailyAnalyticsParams
): Promise<DailyAnalyticsPage> => {
  return await axios.get("admin/analytics/daily", { params })
}

const getDailyAnalyticsSummary = async (
  params?: AnalyticsRangeParams
): Promise<DailyAnalyticsSummary> => {
  return await axios.get("admin/analytics/daily/summary", { params })
}

const getDailyAnalyticsByDate = async (
  targetDate: string
): Promise<DailyAnalytic> => {
  return await axios.get(`admin/analytics/daily/${targetDate}`)
}

const getConversationStats = async (): Promise<ConversationStats> => {
  return await axios.get("admin/analytics/conversation-stats")
}

const getConversionFunnel = async (
  params?: AnalyticsRangeParams
): Promise<ConversionFunnel> => {
  return await axios.get("admin/analytics/conversion-funnel", { params })
}

const getHotQuestionsSummary = async (): Promise<HotQuestionsSummary> => {
  return await axios.get("admin/analytics/hot-questions/summary")
}

const getHotQuestions = async (
  params?: GetHotQuestionsParams
): Promise<HotQuestionsPage> => {
  return await axios.get("admin/analytics/hot-questions", { params })
}

const getHotQuestionDetail = async (
  questionId: string
): Promise<HotQuestion> => {
  return await axios.get(`admin/analytics/hot-questions/${questionId}`)
}

export {
  getConversationStats,
  getConversionFunnel,
  getDailyAnalytics,
  getDailyAnalyticsByDate,
  getDailyAnalyticsSummary,
  getHotQuestionDetail,
  getHotQuestions,
  getHotQuestionsSummary,
}
