import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createCrawlSession,
  deleteCrawlPageJob,
  deleteCrawlSession,
  getCrawlPageJobContent,
  getCrawlPageJobDownloadUrl,
  getCrawlPageJobs,
  getCrawlSessions,
  sendCrawlPageJobToKb,
  updateCrawlPageJobContent,
} from "@/api/crawl-api"
import type {
  CrawlPageJobListParams,
  CrawlSession,
  CrawlSessionListParams,
  SendCrawlPageToKbPayload,
  UpdateCrawlPageContentPayload,
} from "@/types/crawl-type"

const hasActiveSession = (sessions?: CrawlSession[]) =>
  Boolean(
    sessions?.some((session) =>
      ["PENDING", "SCRAPING"].includes(session.status)
    )
  )

const useCrawl = (
  sessionParams: CrawlSessionListParams,
  pageJobParams: CrawlPageJobListParams
) => {
  const queryClient = useQueryClient()

  const sessionsQuery = useQuery({
    queryKey: ["crawl-sessions", sessionParams],
    queryFn: () => getCrawlSessions(sessionParams),
    placeholderData: (previousData) => previousData,
    refetchInterval: (query) =>
      hasActiveSession(query.state.data?.items) ? 3000 : false,
  })

  const pageJobsQuery = useQuery({
    queryKey: ["crawl-page-jobs", pageJobParams],
    queryFn: () => getCrawlPageJobs(pageJobParams),
    placeholderData: (previousData) => previousData,
    refetchInterval: hasActiveSession(sessionsQuery.data?.items)
      ? 3000
      : false,
  })

  const createSessionMutation = useMutation({
    mutationFn: createCrawlSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crawl-sessions"] })
      await queryClient.invalidateQueries({ queryKey: ["crawl-page-jobs"] })
    },
  })

  const deleteSessionMutation = useMutation({
    mutationFn: deleteCrawlSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crawl-sessions"] })
      await queryClient.invalidateQueries({ queryKey: ["crawl-page-jobs"] })
    },
  })

  const getPageJobContentMutation = useMutation({
    mutationFn: getCrawlPageJobContent,
  })

  const updatePageJobContentMutation = useMutation({
    mutationFn: (payload: UpdateCrawlPageContentPayload) =>
      updateCrawlPageJobContent(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crawl-page-jobs"] })
    },
  })

  const getPageJobDownloadUrlMutation = useMutation({
    mutationFn: getCrawlPageJobDownloadUrl,
  })

  const sendPageJobToKbMutation = useMutation({
    mutationFn: (payload: SendCrawlPageToKbPayload) =>
      sendCrawlPageJobToKb(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crawl-page-jobs"] })
      await queryClient.invalidateQueries({ queryKey: ["knowledge-chunks"] })
      await queryClient.invalidateQueries({
        queryKey: ["knowledge-chunk-uploaded-files"],
      })
    },
  })

  const deletePageJobMutation = useMutation({
    mutationFn: deleteCrawlPageJob,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crawl-page-jobs"] })
    },
  })

  return {
    crawlSessionList: sessionsQuery.data,
    crawlSessionListPending: sessionsQuery.isLoading,
    crawlSessionListFetching: sessionsQuery.isFetching,
    refetchCrawlSessions: sessionsQuery.refetch,
    crawlPageJobList: pageJobsQuery.data,
    crawlPageJobListPending: pageJobsQuery.isLoading,
    crawlPageJobListFetching: pageJobsQuery.isFetching,
    refetchCrawlPageJobs: pageJobsQuery.refetch,
    createCrawlSession: createSessionMutation.mutateAsync,
    createCrawlSessionPending: createSessionMutation.isPending,
    deleteCrawlSession: deleteSessionMutation.mutateAsync,
    deleteCrawlSessionPending: deleteSessionMutation.isPending,
    getCrawlPageJobContent: getPageJobContentMutation.mutateAsync,
    getCrawlPageJobContentPending: getPageJobContentMutation.isPending,
    updateCrawlPageJobContent: updatePageJobContentMutation.mutateAsync,
    updateCrawlPageJobContentPending: updatePageJobContentMutation.isPending,
    getCrawlPageJobDownloadUrl: getPageJobDownloadUrlMutation.mutateAsync,
    getCrawlPageJobDownloadUrlPending:
      getPageJobDownloadUrlMutation.isPending,
    sendCrawlPageJobToKb: sendPageJobToKbMutation.mutateAsync,
    sendCrawlPageJobToKbPending: sendPageJobToKbMutation.isPending,
    deleteCrawlPageJob: deletePageJobMutation.mutateAsync,
    deleteCrawlPageJobPending: deletePageJobMutation.isPending,
  }
}

export default useCrawl
