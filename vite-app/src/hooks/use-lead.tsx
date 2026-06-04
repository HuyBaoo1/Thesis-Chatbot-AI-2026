import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  getLead,
  getLeadApplications,
  getLeadInterests,
  getLeads,
  updateLead,
} from "@/api/lead-api"
import type { LeadListParams, UpdateLeadPayload } from "@/types/lead-type"

type UseLeadOptions = {
  params: LeadListParams
  leadId?: string | null
}

const useLead = ({ params, leadId }: UseLeadOptions) => {
  const queryClient = useQueryClient()

  const leadListQuery = useQuery({
    queryKey: ["leads", params],
    queryFn: () => getLeads(params),
    placeholderData: (previousData) => previousData,
  })

  const resolvedLeadId = leadId ?? null

  const leadDetailQuery = useQuery({
    queryKey: ["lead", resolvedLeadId],
    queryFn: () => getLead(resolvedLeadId as string),
    enabled: Boolean(resolvedLeadId),
  })

  const leadInterestsQuery = useQuery({
    queryKey: ["lead", resolvedLeadId, "interests"],
    queryFn: () => getLeadInterests(resolvedLeadId as string),
    enabled: Boolean(resolvedLeadId),
  })

  const leadApplicationsQuery = useQuery({
    queryKey: ["lead", resolvedLeadId, "applications"],
    queryFn: () =>
      getLeadApplications(resolvedLeadId as string, { limit: 10, offset: 0 }),
    enabled: Boolean(resolvedLeadId),
  })

  const invalidateLeadData = async (nextLeadId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["leads"] }),
      queryClient.invalidateQueries({ queryKey: ["lead", nextLeadId] }),
      queryClient.invalidateQueries({
        queryKey: ["lead", nextLeadId, "interests"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["lead", nextLeadId, "applications"],
      }),
    ])
  }

  const updateLeadMutation = useMutation({
    mutationFn: ({
      leadId: nextLeadId,
      values,
    }: {
      leadId: string
      values: UpdateLeadPayload
    }) => updateLead(nextLeadId, values),
    onSuccess: async (data) => {
      queryClient.setQueryData(["lead", data.id], data)
      await invalidateLeadData(data.id)
    },
  })

  return {
    activeLeadId: resolvedLeadId,
    leadList: leadListQuery.data,
    leadListPending: leadListQuery.isLoading,
    leadListFetching: leadListQuery.isFetching,
    leadListError: leadListQuery.error,
    refetchLeadList: leadListQuery.refetch,
    leadDetail: leadDetailQuery.data,
    leadDetailPending: leadDetailQuery.isLoading,
    leadDetailFetching: leadDetailQuery.isFetching,
    leadDetailError: leadDetailQuery.error,
    refetchLeadDetail: leadDetailQuery.refetch,
    leadInterests: leadInterestsQuery.data,
    leadInterestsPending: leadInterestsQuery.isLoading,
    leadInterestsError: leadInterestsQuery.error,
    leadApplications: leadApplicationsQuery.data,
    leadApplicationsPending: leadApplicationsQuery.isLoading,
    leadApplicationsError: leadApplicationsQuery.error,
    updateLead: updateLeadMutation.mutateAsync,
    updateLeadPending: updateLeadMutation.isPending,
  }
}

export default useLead
