import axios from "@/lib/axios"
import type {
  CreateTuitionPolicyPayload,
  TuitionPolicy,
  TuitionPolicyListParams,
  TuitionPolicyListResponse,
  UpdateTuitionPolicyPayload,
  UpdateTuitionPolicyStatusPayload,
} from "@/types/tuition-policy-type"

const getTuitionPolicies = async (
  params?: TuitionPolicyListParams
): Promise<TuitionPolicyListResponse> => {
  return await axios.get("tuition-policies", { params })
}

const createTuitionPolicy = async (
  payload: CreateTuitionPolicyPayload
): Promise<TuitionPolicy> => {
  return await axios.post("tuition-policies", payload)
}

const updateTuitionPolicy = async (
  policyId: string,
  payload: UpdateTuitionPolicyPayload
): Promise<TuitionPolicy> => {
  return await axios.patch(`tuition-policies/${policyId}`, payload)
}

const updateTuitionPolicyStatus = async (
  policyId: string,
  payload: UpdateTuitionPolicyStatusPayload
): Promise<TuitionPolicy> => {
  return await axios.patch(`tuition-policies/${policyId}/status`, payload)
}

const deleteTuitionPolicy = async (policyId: string): Promise<void> => {
  return await axios.delete(`tuition-policies/${policyId}`)
}

export {
  createTuitionPolicy,
  deleteTuitionPolicy,
  getTuitionPolicies,
  updateTuitionPolicy,
  updateTuitionPolicyStatus,
}
