import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type LeadData = {
  lead_id: string
  conversation_id?: string | null
  conversation_token?: string | null
  full_name: string
  source_domain?: string | null
}

type LeadStore = {
  leadData: LeadData | null
  setLeadData: (data: LeadData) => void
  updateLeadData: (data: Partial<LeadData>) => void
  clearLeadData: () => void
}

const useLeadStore = create<LeadStore>()(
  persist(
    (set) => ({
      leadData: null,

      setLeadData: (data) =>
        set({
          leadData: data,
        }),

      updateLeadData: (data) =>
        set((state) => ({
          leadData: state.leadData
            ? {
                ...state.leadData,
                ...data,
              }
            : null,
        })),

      clearLeadData: () =>
        set({
          leadData: null,
        }),
    }),
    {
      name: "lead-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default useLeadStore
