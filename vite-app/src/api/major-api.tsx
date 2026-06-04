import axios from "@/lib/axios"
import type {
  CreateMajorPayload,
  Major,
  MajorListParams,
  MajorListResponse,
  UpdateMajorPayload,
  UpdateMajorStatusPayload,
} from "@/types/major-type"

const getMajors = async (params?: MajorListParams): Promise<MajorListResponse> => {
  return await axios.get("majors", { params })
}

const createMajor = async (payload: CreateMajorPayload): Promise<Major> => {
  return await axios.post("majors", payload)
}

const updateMajor = async (
  majorId: string,
  payload: UpdateMajorPayload
): Promise<Major> => {
  return await axios.patch(`majors/${majorId}`, payload)
}

const updateMajorStatus = async (
  majorId: string,
  payload: UpdateMajorStatusPayload
): Promise<Major> => {
  return await axios.patch(`majors/${majorId}/status`, payload)
}

const deleteMajor = async (majorId: string): Promise<void> => {
  return await axios.delete(`majors/${majorId}`)
}

export { createMajor, deleteMajor, getMajors, updateMajor, updateMajorStatus }
