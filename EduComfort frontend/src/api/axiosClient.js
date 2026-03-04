import axios from "axios";
import { API_BASE_URL } from "./config";

// ✅ FIX 1: Removed the fragile `getBaseUrl()` function that checked window.location at runtime.
//    The correct URL is now always set at BUILD TIME via the VITE_API_URL env variable.
//    .env.development  → VITE_API_URL=http://localhost:8000
//    .env.production   → VITE_API_URL=https://api.educomfort.uz
//    Vite guarantees the right value is baked in at build time — no runtime guessing needed.

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ========================= Request Interceptor =========================
axiosClient.interceptors.request.use(
  (config) => {
    // ✅ FIX 2: Removed console.log on every request — was leaking full URLs
    //    and Authorization tokens in the production browser console.
    //    Only log in development.
    if (import.meta.env.DEV) {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    }

    const token = localStorage.getItem("sp_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Impersonation logic
    const impStudentId = sessionStorage.getItem("impersonatedStudentId");
    const impTeacherId = sessionStorage.getItem("impersonatedTeacherId");

    if (config.url) {
      if (impTeacherId && (config.url.startsWith('/teacher') || config.url.includes('/teacher/'))) {
        config.params = { ...config.params, teacher_id: impTeacherId };
      } else if (impStudentId && (config.url.startsWith('/student') || config.url.includes('/student/'))) {
        config.params = { ...config.params, student_id: impStudentId };
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ========================= Response Interceptor =========================
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // ✅ FIX 3: Removed the 307/308 redirect handler.
    //    Since main.py sets `redirect_slashes=False`, these redirects should
    //    NEVER happen. Keeping a retry handler here could mask bugs and
    //    cause hard-to-debug infinite loops. Removed entirely.
    //    If you see 307s, the fix is in the backend route definition, not here.

    // ✅ FIX 4: 401 handler — only clear session and redirect if NOT on login page
    if (status === 401) {
      const currentPath = window.location.pathname;
      if (!currentPath.includes("/login")) {
        localStorage.removeItem("sp_token");
        localStorage.removeItem("sp_user");
        // Small delay to let any in-flight requests settle
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      }
    }

    // ✅ FIX 5: Log errors only in development — don't expose internal errors in production console
    if (import.meta.env.DEV) {
      console.error(
        `❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        `Status: ${status}`,
        error.response?.data
      );
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
