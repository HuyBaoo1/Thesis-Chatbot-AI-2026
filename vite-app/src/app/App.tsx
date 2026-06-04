import { useEffect, useState } from "react"
import { RouterProvider } from "react-router-dom"

import { refreshToken } from "@/api/auth-api"
import router from "./router"
import useAuthStore from "@/stores/auth-store"

export const App = () => {
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const { accessToken, setAuthData, clearAuthData } = useAuthStore()

  useEffect(() => {
    let active = true

    const bootstrapAuth = async () => {
      const hasAuthSession = localStorage.getItem("has_auth_session") === "true"

      if (accessToken) {
        setIsBootstrapping(false)
        return
      }

      if (!hasAuthSession) {
        clearAuthData()
        setIsBootstrapping(false)
        return
      }

      try {
        const data = await refreshToken()

        if (!active) {
          return
        }

        setAuthData({
          accessToken: data.access_token,
          user: data.user,
        })
      } catch {
        if (active) {
          clearAuthData()
        }
      } finally {
        if (active) {
          setIsBootstrapping(false)
        }
      }
    }

    void bootstrapAuth()

    return () => {
      active = false
    }
  }, [accessToken, clearAuthData, setAuthData])

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <svg
            className="h-4 w-4 animate-spin text-slate-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      </div>
    )
  }

  return <RouterProvider router={router} />
}

export default App
