import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createStaff,
  deleteStaff,
  getStaffs,
  updateStaff,
  updateStaffStatus,
} from "@/api/staff-api"
import type { StaffFormValues } from "@/schemas/staff-schema"
import type { StaffListParams } from "@/types/staff-type"

const useStaff = (params: StaffListParams) => {
  const queryClient = useQueryClient()

  const staffQuery = useQuery({
    queryKey: ["staffs", params],
    queryFn: () => getStaffs(params),
    placeholderData: (previousData) => previousData,
  })

  const createStaffMutation = useMutation({
    mutationFn: createStaff,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["staffs"] })
    },
  })

  const updateStaffMutation = useMutation({
    mutationFn: ({ staffId, values }: { staffId: string; values: Partial<StaffFormValues> }) =>
      updateStaff(staffId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["staffs"] })
    },
  })

  const updateStaffStatusMutation = useMutation({
    mutationFn: ({ staffId, is_active }: { staffId: string; is_active: boolean }) =>
      updateStaffStatus(staffId, { is_active }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["staffs"] })
    },
  })

  const deleteStaffMutation = useMutation({
    mutationFn: (staffId: string) => deleteStaff(staffId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["staffs"] })
    },
  })

  return {
    staffList: staffQuery.data,
    staffListPending: staffQuery.isLoading,
    staffListFetching: staffQuery.isFetching,
    staffListError: staffQuery.error,
    refetchStaffList: staffQuery.refetch,
    createStaff: createStaffMutation.mutateAsync,
    createStaffPending: createStaffMutation.isPending,
    createStaffError: createStaffMutation.error,
    updateStaff: updateStaffMutation.mutateAsync,
    updateStaffPending: updateStaffMutation.isPending,
    updateStaffError: updateStaffMutation.error,
    updateStaffStatus: updateStaffStatusMutation.mutateAsync,
    updateStaffStatusPending: updateStaffStatusMutation.isPending,
    updateStaffStatusError: updateStaffStatusMutation.error,
    deleteStaff: deleteStaffMutation.mutateAsync,
    deleteStaffPending: deleteStaffMutation.isPending,
    deleteStaffError: deleteStaffMutation.error,
  }
}

export default useStaff
