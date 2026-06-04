const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL as string | undefined

  if (!configuredUrl?.trim()) {
    throw new Error("VITE_API_URL is required")
  }

  return configuredUrl
}

const setWsAuthCookie = (token: string) => {
  try {
    const base = new URL(getApiBaseUrl(), window.location.origin)
    document.cookie = `access_token=${encodeURIComponent(token)}; path=${base.pathname}; SameSite=Lax; max-age=31536000`
  } catch {
    // ignore
  }
}

const clearWsAuthCookie = () => {
  try {
    const base = new URL(getApiBaseUrl(), window.location.origin)
    document.cookie = `access_token=; path=${base.pathname}; SameSite=Lax; max-age=0`
  } catch {
    // ignore
  }
}

const buildRealtimeUrl = (
  path: string,
  searchParams?: Record<string, string | null | undefined>
) => {
  const baseUrl = getApiBaseUrl().replace(/\/?$/, "/")
  const url = new URL(path.replace(/^\//, ""), baseUrl)

  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })

  return url.toString()
}

export { buildRealtimeUrl, setWsAuthCookie, clearWsAuthCookie }
