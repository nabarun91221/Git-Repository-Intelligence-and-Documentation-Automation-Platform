import axios, { type InternalAxiosRequestConfig } from "axios";

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api",
  withCredentials: true,
});

let refreshRequest: Promise<unknown> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshRequest
    ) {
      originalRequest._retry = true;

      try {
        refreshRequest ??= api.post("/auth/refresh");
        await refreshRequest;
        return api.request(originalRequest);
      } catch {
        // The expired-session event below removes local display data and sends
        // the user back through the normal protected-route flow.
      } finally {
        refreshRequest = null;
      }
    }

    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("codeatlas:auth-expired"));
    }

    return Promise.reject(error);
  },
);

export default api;
