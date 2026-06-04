import axios, { AxiosError } from "axios"

import useAuthStore from "@/stores/auth-store"
import type { StaffLoginResponse } from "@/types/auth-type"

const baseURL = import.meta.env.VITE_API_URL

const instance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

let refreshPromise: Promise<string> | null = null

const shouldSkipRefresh = (url?: string) =>
  Boolean(url?.includes("auth/login") || url?.includes("auth/refresh-token"))

const getErrorMessageFromDetail = (detail: unknown): string | null => {
  if (typeof detail === "string" && detail.trim()) {
    return detail
  }

  if (!Array.isArray(detail) || detail.length === 0) {
    return null
  }

  const messages = detail
    .map((item) => {
      if (typeof item === "string" && item.trim()) {
        return item.trim()
      }

      if (
        item &&
        typeof item === "object" &&
        "msg" in item &&
        typeof item.msg === "string" &&
        item.msg.trim()
      ) {
        return item.msg.trim()
      }

      return null
    })
    .filter((message): message is string => Boolean(message))

  return messages.length > 0 ? messages.join(", ") : null
}

const normalizeAxiosError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return error
  }

  const nextError = error as AxiosError<{
    detail?: unknown
    message?: unknown
  }>

  const detailMessage = getErrorMessageFromDetail(
    nextError.response?.data?.detail
  )
  const fallbackMessage =
    typeof nextError.response?.data?.message === "string"
      ? nextError.response.data.message
      : null

  nextError.message =
    detailMessage ||
    fallbackMessage ||
    nextError.message ||
    "Something went wrong. Please try again."

  return nextError
}

const logAxiosError = (error: unknown) => {
  const normalizedError = normalizeAxiosError(error)

  if (axios.isAxiosError(normalizedError)) {
    console.log("[axios response error]", {
      message: normalizedError.message,
      method: normalizedError.config?.method,
      url: normalizedError.config?.url,
      status: normalizedError.response?.status,
      data: normalizedError.response?.data,
    })
    return normalizedError
  }

  console.log("[axios response error]", normalizedError)
  return normalizedError
}

instance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

instance.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config as
      | {
          _retry?: boolean
          url?: string
          headers?: Record<string, string>
        }
      | undefined

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest.url)
    ) {
      if (
        error.response?.status === 401 &&
        shouldSkipRefresh(originalRequest?.url)
      ) {
        useAuthStore.getState().clearAuthData()
      }

      return Promise.reject(logAxiosError(error))
    }

    originalRequest._retry = true

    if (!refreshPromise) {
      refreshPromise = refreshClient
        .post("auth/refresh-token", {})
        .then((response) => {
          const data = response.data as StaffLoginResponse

          useAuthStore.getState().setAuthData({
            accessToken: data.access_token,
            user: data.user,
          })

          return data.access_token
        })
        .catch((refreshError) => {
          useAuthStore.getState().clearAuthData()

          if (window.location.pathname !== "/login") {
            window.location.href = "/login"
          }

          throw logAxiosError(refreshError)
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    const nextAccessToken = await refreshPromise

    originalRequest.headers = originalRequest.headers ?? {}
    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`

    return instance(originalRequest)
  }
)

export default instance
