type StaffRole = "ADMIN" | "COUNSELOR"

type Staff = {
  id: string
  name: string
  email: string
  role: StaffRole
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

type StaffListResponse = {
  items: Staff[]
  total: number
  limit: number
  offset: number
}

type StaffListParams = {
  limit?: number
  offset?: number
  q?: string
  role?: StaffRole
}

type CreateStaffPayload = {
  name: string
  email: string
  password: string
  role: StaffRole
}

type UpdateStaffPayload = {
  name?: string
  email?: string
  password?: string
  role?: StaffRole
}

type UpdateStaffStatusPayload = {
  is_active: boolean
}

export type {
  CreateStaffPayload,
  Staff,
  StaffListParams,
  StaffListResponse,
  StaffRole,
  UpdateStaffPayload,
  UpdateStaffStatusPayload,
}
