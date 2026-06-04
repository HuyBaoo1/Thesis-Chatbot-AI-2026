import axios from "@/lib/axios"
import type {
  ScholarshipPolicyListParams,
  ScholarshipPolicyListResponse,
} from "@/types/scholarship-policy-type"

const getScholarshipPolicies = async (
  params?: ScholarshipPolicyListParams
): Promise<ScholarshipPolicyListResponse> => {
  return await axios.get("scholarship-policies", { params })
}

export { getScholarshipPolicies }
