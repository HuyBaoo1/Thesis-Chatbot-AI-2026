import authAxios from "@/lib/axios"
import type { StaffLoginRequest, StaffLoginResponse } from "@/types/auth-type"

const login = async (data: StaffLoginRequest): Promise<StaffLoginResponse> => {
  return await authAxios.post("auth/login", data)
}

const refreshToken = async (): Promise<StaffLoginResponse> => {
  return await authAxios.post("auth/refresh-token", {})
}

const logout = async (): Promise<{ message?: string }> => {
  return await authAxios.post("auth/logout", {})
}

export { login, logout, refreshToken }
