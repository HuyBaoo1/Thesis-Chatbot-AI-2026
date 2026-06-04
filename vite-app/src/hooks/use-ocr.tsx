import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createOcrJob,
  deleteOcrJob,
  getOcrJob,
  getOcrJobContent,
  getOcrJobDownloadUrl,
  getOcrJobs,
  retryOcrJob,
  sendOcrJobToKb,
  updateOcrJobContent,
} from "@/api/ocr-api"
import type {
  OcrJob,
  OcrJobListParams,
  SendOcrToKbPayload,
  UpdateOcrContentPayload,
} from "@/types/ocr-type"

const activeStatuses = new Set(["queued", "started", "deferred"])

const hasActiveJob = (jobs?: OcrJob[]) =>
  Boolean(jobs?.some((job) => activeStatuses.has(job.status)))

const useOcr = (params: OcrJobListParams) => {
  const queryClient = useQueryClient()

  const ocrJobsQuery = useQuery({
    queryKey: ["ocr-jobs", params],
    queryFn: () => getOcrJobs(params),
    placeholderData: (previousData) => previousData,
    refetchInterval: (query) =>
      hasActiveJob(query.state.data?.jobs) ? 3000 : false,
  })

  const createOcrJobMutation = useMutation({
    mutationFn: createOcrJob,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] })
    },
  })

  const getOcrJobMutation = useMutation({
    mutationFn: getOcrJob,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] })
    },
  })

  const getOcrJobContentMutation = useMutation({
    mutationFn: getOcrJobContent,
  })

  const getOcrJobDownloadUrlMutation = useMutation({
    mutationFn: getOcrJobDownloadUrl,
  })

  const updateOcrJobContentMutation = useMutation({
    mutationFn: (payload: UpdateOcrContentPayload) =>
      updateOcrJobContent(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] })
    },
  })

  const retryOcrJobMutation = useMutation({
    mutationFn: retryOcrJob,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] })
    },
  })

  const sendOcrJobToKbMutation = useMutation({
    mutationFn: (payload: SendOcrToKbPayload) => sendOcrJobToKb(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] })
      await queryClient.invalidateQueries({ queryKey: ["knowledge-chunks"] })
    },
  })

  const deleteOcrJobMutation = useMutation({
    mutationFn: deleteOcrJob,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] })
    },
  })

  return {
    ocrJobList: ocrJobsQuery.data,
    ocrJobListPending: ocrJobsQuery.isLoading,
    ocrJobListFetching: ocrJobsQuery.isFetching,
    refetchOcrJobs: ocrJobsQuery.refetch,
    createOcrJob: createOcrJobMutation.mutateAsync,
    createOcrJobPending: createOcrJobMutation.isPending,
    getOcrJob: getOcrJobMutation.mutateAsync,
    getOcrJobPending: getOcrJobMutation.isPending,
    getOcrJobContent: getOcrJobContentMutation.mutateAsync,
    getOcrJobContentPending: getOcrJobContentMutation.isPending,
    getOcrJobDownloadUrl: getOcrJobDownloadUrlMutation.mutateAsync,
    getOcrJobDownloadUrlPending: getOcrJobDownloadUrlMutation.isPending,
    updateOcrJobContent: updateOcrJobContentMutation.mutateAsync,
    updateOcrJobContentPending: updateOcrJobContentMutation.isPending,
    retryOcrJob: retryOcrJobMutation.mutateAsync,
    retryOcrJobPending: retryOcrJobMutation.isPending,
    sendOcrJobToKb: sendOcrJobToKbMutation.mutateAsync,
    sendOcrJobToKbPending: sendOcrJobToKbMutation.isPending,
    deleteOcrJob: deleteOcrJobMutation.mutateAsync,
    deleteOcrJobPending: deleteOcrJobMutation.isPending,
  }
}

export default useOcr
