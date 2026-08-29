import axios from "axios";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle timeouts, cold starts, and 401s globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle Axios timeout (Render cold start)
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout') && !originalRequest._retry) {
      originalRequest._retry = true;
      toast.loading("Waking up server... this may take up to 60 seconds.", { id: "cold-start-toast" });
      
      // Increase timeout for the retry to give Render time to spin up
      originalRequest.timeout = 60000;
      
      try {
        const response = await api(originalRequest);
        toast.success("Server is awake!", { id: "cold-start-toast" });
        return response;
      } catch (retryError) {
        toast.dismiss("cold-start-toast");
        return Promise.reject(retryError);
      }
    }

    if (error.response?.status === 401) {
      // Avoid infinite redirects if already on login page
      if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Extract a human-readable error message from an API error.
 * Prefers the backend's `message` field when available.
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      if (error.message === "Network Error") {
        return "Unable to connect to BodyForge AI server. Please try again.";
      }
      return error.message;
    }
    const data = error.response.data as
      | { success: false; message?: string }
      | undefined;
    if (data?.message) {
      return data.message;
    }
    return error.message || "An unexpected error occurred";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
