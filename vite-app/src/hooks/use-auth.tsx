import { useMutation } from "@tanstack/react-query"

import { login, logout, refreshToken } from "@/api/auth-api"
import useAuthStore from "@/stores/auth-store"
import type { StaffLoginRequest } from "@/types/auth-type"

const useAuth = () => {
  const { accessToken, user, setAuthData, clearAuthData } = useAuthStore()

  const loginMutation = useMutation({
    mutationFn: (data: StaffLoginRequest) => login(data),
    onSuccess: (data) => {
      setAuthData({
        accessToken: data.access_token,
        user: data.user,
      })
    },
  })

  const refreshTokenMutation = useMutation({
    mutationFn: refreshToken,
    onSuccess: (data) => {
      setAuthData({
        accessToken: data.access_token,
        user: data.user,
      })
    },
  })

  const logoutMutation = useMutation({
    mutationFn: logout,
  })

  return {
    accessToken,
    user,
    login: loginMutation.mutateAsync,
    loginPending: loginMutation.isPending,
    loginError: loginMutation.error,
    refreshSession: refreshTokenMutation.mutateAsync,
    refreshSessionPending: refreshTokenMutation.isPending,
    logout: logoutMutation.mutateAsync,
    logoutPending: logoutMutation.isPending,
    clearAuthData,
  }
}

export default useAuth
