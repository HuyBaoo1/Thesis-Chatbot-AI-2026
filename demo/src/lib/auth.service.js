import apiClient from "./api";

const authService = {
  login: async (email, password) => {
    const res = await apiClient.post("/auth/login", { email, password });
    return res.data;
  },

  logout: async () => {
    await apiClient.post("/auth/logout");
  },

  me: async () => {
    const res = await apiClient.get("/auth/me");
    return res.data;
  },

  changePassword: async (data) => {
    const res = await apiClient.patch("/auth/change-password", data);
    return res.data;
  },
};

export default authService;
