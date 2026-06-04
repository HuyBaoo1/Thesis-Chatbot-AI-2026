import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createMajor,
  deleteMajor,
  getMajors,
  updateMajor,
  updateMajorStatus,
} from "@/api/major-api"
import type { MajorFormValues } from "@/schemas/major-schema"
import type { MajorListParams } from "@/types/major-type"

const useMajor = (params: MajorListParams) => {
  const queryClient = useQueryClient()

  const majorQuery = useQuery({
    queryKey: ["majors", params],
    queryFn: () => getMajors(params),
    placeholderData: (previousData) => previousData,
  })

  const createMajorMutation = useMutation({
    mutationFn: createMajor,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["majors"] })
    },
  })

  const updateMajorMutation = useMutation({
    mutationFn: ({ majorId, values }: { majorId: string; values: Partial<MajorFormValues> }) =>
      updateMajor(majorId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["majors"] })
    },
  })

  const updateMajorStatusMutation = useMutation({
    mutationFn: ({ majorId, is_active }: { majorId: string; is_active: boolean }) =>
      updateMajorStatus(majorId, { is_active }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["majors"] })
    },
  })

  const deleteMajorMutation = useMutation({
    mutationFn: (majorId: string) => deleteMajor(majorId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["majors"] })
    },
  })

  return {
    majorList: majorQuery.data,
    majorListPending: majorQuery.isLoading,
    majorListFetching: majorQuery.isFetching,
    createMajor: createMajorMutation.mutateAsync,
    createMajorPending: createMajorMutation.isPending,
    updateMajor: updateMajorMutation.mutateAsync,
    updateMajorPending: updateMajorMutation.isPending,
    updateMajorStatus: updateMajorStatusMutation.mutateAsync,
    updateMajorStatusPending: updateMajorStatusMutation.isPending,
    deleteMajor: deleteMajorMutation.mutateAsync,
    deleteMajorPending: deleteMajorMutation.isPending,
  }
}

export default useMajor
