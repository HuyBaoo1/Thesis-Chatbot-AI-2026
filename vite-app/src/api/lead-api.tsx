import axios from "@/lib/axios"
import type {
  Lead,
  LeadActivityListResponse,
  LeadApplicationListResponse,
  LeadInterestListResponse,
  LeadListParams,
  LeadListResponse,
  LeadScoreHistoryResponse,
  UpdateLeadPayload,
} from "@/types/lead-type"

const getLeads = async (params?: LeadListParams): Promise<LeadListResponse> => {
  return await axios.get("leads", { params })
}

const getLead = async (leadId: string): Promise<Lead> => {
  return await axios.get(`leads/${leadId}`)
}

const updateLead = async (
  leadId: string,
  payload: UpdateLeadPayload
): Promise<Lead> => {
  return await axios.patch(`leads/${leadId}`, payload)
}

const getLeadApplications = async (
  leadId: string,
  params?: {
    limit?: number
    offset?: number
  }
): Promise<LeadApplicationListResponse> => {
  return await axios.get(`leads/${leadId}/applications`, { params })
}

const getLeadActivities = async (
  leadId: string,
  params?: {
    limit?: number
    offset?: number
  }
): Promise<LeadActivityListResponse> => {
  return await axios.get(`leads/${leadId}/activities`, { params })
}

const getLeadScoreHistory = async (
  leadId: string
): Promise<LeadScoreHistoryResponse> => {
  return await axios.get(`leads/${leadId}/score-history`)
}

const getLeadInterests = async (
  leadId: string
): Promise<LeadInterestListResponse> => {
  return await axios.get(`leads/${leadId}/interests`)
}

export {
  getLead,
  getLeadActivities,
  getLeadApplications,
  getLeadInterests,
  getLeadScoreHistory,
  getLeads,
  updateLead,
}
