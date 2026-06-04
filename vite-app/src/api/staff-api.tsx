import axios from "@/lib/axios"
import type {
  CreateStaffPayload,
  Staff,
  StaffListParams,
  StaffListResponse,
  UpdateStaffPayload,
  UpdateStaffStatusPayload,
} from "@/types/staff-type"

const getStaffs = async (params?: StaffListParams): Promise<StaffListResponse> => {
  return await axios.get("staffs", { params })
}

const createStaff = async (payload: CreateStaffPayload): Promise<Staff> => {
  return await axios.post("staffs", payload)
}

const updateStaff = async (
  staffId: string,
  payload: UpdateStaffPayload
): Promise<Staff> => {
  return await axios.patch(`staffs/${staffId}`, payload)
}

const updateStaffStatus = async (
  staffId: string,
  payload: UpdateStaffStatusPayload
): Promise<Staff> => {
  return await axios.patch(`staffs/${staffId}/status`, payload)
}

const deleteStaff = async (staffId: string): Promise<void> => {
  return await axios.delete(`staffs/${staffId}`)
}

export { createStaff, deleteStaff, getStaffs, updateStaff, updateStaffStatus }
