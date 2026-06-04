import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createTuitionPolicy,
  deleteTuitionPolicy,
  getTuitionPolicies,
  updateTuitionPolicy,
  updateTuitionPolicyStatus,
} from "@/api/tuition-policy-api"
import { getMajors } from "@/api/major-api"
import type { TuitionPolicyFormValues } from "@/schemas/tuition-policy-schema"
import type { TuitionPolicyListParams } from "@/types/tuition-policy-type"

const useTuitionPolicy = (params: TuitionPolicyListParams) => {
  const queryClient = useQueryClient()

  const tuitionPolicyQuery = useQuery({
    queryKey: ["tuition-policies", params],
    queryFn: () => getTuitionPolicies(params),
    placeholderData: (previousData) => previousData,
  })

  const majorOptionsQuery = useQuery({
    queryKey: ["major-options"],
    queryFn: () => getMajors({ limit: 100, offset: 0 }),
  })

  const createTuitionPolicyMutation = useMutation({
    mutationFn: createTuitionPolicy,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tuition-policies"] })
    },
  })

  const updateTuitionPolicyMutation = useMutation({
    mutationFn: ({
      policyId,
      values,
    }: {
      policyId: string
      values: Partial<TuitionPolicyFormValues>
    }) => updateTuitionPolicy(policyId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tuition-policies"] })
    },
  })

  const updateTuitionPolicyStatusMutation = useMutation({
    mutationFn: ({ policyId, is_active }: { policyId: string; is_active: boolean }) =>
      updateTuitionPolicyStatus(policyId, { is_active }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tuition-policies"] })
    },
  })

  const deleteTuitionPolicyMutation = useMutation({
    mutationFn: (policyId: string) => deleteTuitionPolicy(policyId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tuition-policies"] })
    },
  })

  return {
    tuitionPolicyList: tuitionPolicyQuery.data,
    tuitionPolicyListPending: tuitionPolicyQuery.isLoading,
    tuitionPolicyListFetching: tuitionPolicyQuery.isFetching,
    majorOptions: majorOptionsQuery.data?.items ?? [],
    majorOptionsPending: majorOptionsQuery.isLoading,
    createTuitionPolicy: createTuitionPolicyMutation.mutateAsync,
    createTuitionPolicyPending: createTuitionPolicyMutation.isPending,
    updateTuitionPolicy: updateTuitionPolicyMutation.mutateAsync,
    updateTuitionPolicyPending: updateTuitionPolicyMutation.isPending,
    updateTuitionPolicyStatus: updateTuitionPolicyStatusMutation.mutateAsync,
    updateTuitionPolicyStatusPending: updateTuitionPolicyStatusMutation.isPending,
    deleteTuitionPolicy: deleteTuitionPolicyMutation.mutateAsync,
    deleteTuitionPolicyPending: deleteTuitionPolicyMutation.isPending,
  }
}

export default useTuitionPolicy
