import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export const QueryKeys = {
  // Analytics
  daily: (params) => ["analytics", "daily", params],
  dailySummary: (params) => ["analytics", "daily-summary", params],
  todayAnalytics: () => ["analytics", "today"],
  conversationStats: () => ["analytics", "conversation-stats"],
  conversionFunnel: () => ["analytics", "conversion-funnel"],
  hotQuestions: (params) => ["analytics", "hot-questions", params],
  hotQuestionsSummary: () => ["analytics", "hot-questions-summary"],

  // Leads
  leads: (params) => ["leads", params],
  lead: (id) => ["leads", id],
  leadScoreHistory: (id) => ["leads", id, "score-history"],

  // Chat
  conversations: (params) => ["conversations", params],
  conversation: (id) => ["conversations", id],
};