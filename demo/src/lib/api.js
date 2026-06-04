import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const ACCESS_TOKEN_KEY = "auth_access_token";

function deleteCookie(name) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

function getAccessToken() {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const clearAccessToken = () => {
  deleteCookie("access_token");
  deleteCookie("refresh_token");
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {}
};

// Add request interceptor to include Bearer token
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Backend reads access_token from HttpOnly cookie OR Authorization header.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const isLoginPage = window.location.pathname === "/login";
    originalRequest._retry = true;

    // Skip interceptor for the refresh-token request itself
    // to prevent infinite loops if the refresh cookie is expired.
    const isRefreshRequest = originalRequest._skipInterceptor;
    if (isRefreshRequest) {
      return Promise.reject(error);
    }

    if (isLoginPage) {
      clearAccessToken();
      return Promise.reject(error);
    }

    try {
      // Refresh will update cookies and localStorage with new tokens.
      // Mark this request so the interceptor skips it on 401 recursion.
      const refreshRequestConfig = { ...originalRequest, _skipInterceptor: true };
      const response = await apiClient.post("/auth/refresh-token", {}, {
        withCredentials: true,
        _skipInterceptor: true,
      });
      const newToken = response.data?.access_token;
      if (newToken) {
        try {
          localStorage.setItem(ACCESS_TOKEN_KEY, newToken);
        } catch {}
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearAccessToken();
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;
