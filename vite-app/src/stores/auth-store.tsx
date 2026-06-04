import { create } from "zustand"

import type { AuthUser } from "@/types/auth-type"

type AuthState = {
  accessToken: string | null
  user: AuthUser | null
  setAuthData: (payload: { accessToken: string; user: AuthUser }) => void
  clearAuthData: () => void
}

const AUTH_SESSION_HINT_KEY = "has_auth_session"

const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  user: null,

  setAuthData: ({ accessToken, user }) => {
    localStorage.setItem(AUTH_SESSION_HINT_KEY, "true")
    set({
      accessToken,
      user,
    })
  },

  clearAuthData: () => {
    localStorage.removeItem(AUTH_SESSION_HINT_KEY)
    set({
      accessToken: null,
      user: null,
    })
  },
}))

export default useAuthStore
