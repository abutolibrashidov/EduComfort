import axios from "axios";
import { getToken } from "./auth";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || https://api.educomfort.uz",
  timeout: 15000, // 15 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: Add token to every request
axiosClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 Starting Request: ${config.method?.toUpperCase()} ${config.url}`);
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle errors globally
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    // Handle 307/308 redirects (FastAPI trailing slash redirects)
    if ((error.response?.status === 307 || error.response?.status === 308) && !originalRequest._retry) {
      originalRequest._retry = true;
      const redirectUrl = error.response.headers.location;

      if (redirectUrl) {
        // Preserve full URL and retry with Authorization header
        const fullUrl = redirectUrl.startsWith('http')
          ? redirectUrl
          : `${axiosClient.defaults.baseURL}${redirectUrl}`;

        originalRequest.url = fullUrl;
        return axiosClient(originalRequest);
      }
    }

    // Handle 401 Unauthorized - but don't redirect if we're already on login page
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;

      // Only clear tokens and redirect if NOT already on login page
      // This prevents clearing tokens during the initial login->dashboard transition
      if (!currentPath.includes('/login')) {
        localStorage.removeItem("sp_token");
        localStorage.removeItem("sp_user");

        // Use setTimeout to ensure any pending requests complete first
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
