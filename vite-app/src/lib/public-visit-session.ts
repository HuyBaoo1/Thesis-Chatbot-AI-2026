const PUBLIC_LEAD_STORAGE_KEY = "lead-storage"

if (
  import.meta.env.VITE_APP_MODE !== "admin" &&
  typeof window !== "undefined"
) {
  // Public visits must not reuse the previous browser lead/conversation id.
  window.localStorage.removeItem(PUBLIC_LEAD_STORAGE_KEY)
}
