import { create } from "zustand";
import { clearAccessToken } from "../lib/api";
import authService from "../lib/auth.service";

const LOCAL_STORAGE_KEY = "auth_user";
const ACCESS_TOKEN_KEY = "auth_access_token";

function getStoredUser() {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getStoredAccessToken() {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export const useAuthStore = create((set, get) => ({
  user: getStoredUser(),
  accessToken: getStoredAccessToken(),
  isAuthenticated: !!getStoredUser(),
  isLoading: true,
  _authCheckPromise: null,

  login: async (email, password) => {
    try {
      const data = await authService.login(email, password);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.user));
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
      set({ user: data.user, accessToken: data.access_token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      clearAccessToken();
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    clearAccessToken();
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    const storedUser = getStoredUser();
    const storedToken = getStoredAccessToken();
    if (!storedUser || !storedToken) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    // Prevent race condition: reuse ongoing auth check promise
    if (get()._authCheckPromise) {
      return get()._authCheckPromise;
    }

    const authCheckPromise = (async () => {
      try {
        const user = await authService.me();
        // /auth/me validates the token but does not issue a new one.
        // Token refresh happens via 401 interceptor → /auth/refresh-token.
        // storedToken is the authoritative token; user data is from server.
        if (!user || (typeof user.id === "undefined" && typeof user.sub === "undefined")) {
          throw new Error("Invalid user response");
        }
        set({ user, accessToken: storedToken, isAuthenticated: true, isLoading: false });
      } catch (error) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        clearAccessToken();
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      } finally {
        set({ _authCheckPromise: null });
      }
    })();

    set({ _authCheckPromise: authCheckPromise });
    return authCheckPromise;
  },
}));