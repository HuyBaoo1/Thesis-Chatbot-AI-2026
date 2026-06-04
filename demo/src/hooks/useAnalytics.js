import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsService } from "../lib/analytics.service";
import { leadService } from "../lib/lead.service";
import { QueryKeys } from "../lib/queryClient";

export function useTodayAnalytics() {
  return useQuery({
    queryKey: QueryKeys.todayAnalytics(),
    queryFn: () => analyticsService.getTodayAnalytics().then(r => r.data),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useTopLeads(params = {}) {
  return useQuery({
    queryKey: QueryKeys.leads({ ...params, score_sort: "desc" }),
    queryFn: () => leadService.list({ ...params, score_sort: "desc" }).then(r => r.data),
  });
}

export function useDailyAnalytics(params = {}) {
  return useQuery({
    queryKey: QueryKeys.daily(params),
    queryFn: () => analyticsService.getDaily({ params }).then(r => r.data),
  });
}

export function useConversionFunnel() {
  return useQuery({
    queryKey: QueryKeys.conversionFunnel(),
    queryFn: () => analyticsService.getConversionFunnel().then(r => r.data),
  });
}

export function useConversationStats() {
  return useQuery({
    queryKey: QueryKeys.conversationStats(),
    queryFn: () => analyticsService.getConversationStats().then(r => r.data),
  });
}

export function useLeadScoreHistory(leadId) {
  return useQuery({
    queryKey: QueryKeys.leadScoreHistory(leadId),
    queryFn: () => leadService.getScoreHistory(leadId).then(r => r.data),
    enabled: !!leadId,
  });
}