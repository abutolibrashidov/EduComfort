import axiosClient from "./axiosClient";

// Login
export async function loginUser(login, password) {
  const payload = { login, password };
  console.log("Posting to:", axiosClient.defaults.baseURL + "/auth/login");

  const res = await axiosClient.post("/auth/login", payload);

  if (res?.data?.access_token) {
    // ✅ Store token
    localStorage.setItem("sp_token", res.data.access_token);

    // ✅ Store user data (if backend returns it)
    if (res.data.user) {
      localStorage.setItem("sp_user", JSON.stringify(res.data.user));
    } else {
      // ✅ If backend doesn't return user, decode from token
      const decoded = decodeToken(res.data.access_token);
      if (decoded) {
        localStorage.setItem("sp_user", JSON.stringify(decoded));
      }
    }
  }

  return res.data;
}

// Token helpers
export function setToken(token) {
  if (!token) return localStorage.removeItem("sp_token");
  localStorage.setItem("sp_token", token);
}

export function getToken() {
  return localStorage.getItem("sp_token");
}

export function decodeToken(token) {
  const t = token || getToken();
  if (!t) return null;

  try {
    const [, payload] = t.split(".");
    const decoded = JSON.parse(atob(payload));

    // Ensure id exists
    if (!decoded.id && decoded.user_id) {
      decoded.id = decoded.user_id;
    } else if (!decoded.id && decoded.sub) {
      decoded.id = parseInt(decoded.sub);
    }

    return decoded;
  } catch {
    return null;
  }
}

// ✅ NEW: Get current user from storage
export function getCurrentUser() {
  const userStr = localStorage.getItem("sp_user");
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  // Fallback: decode from token
  return decodeToken();
}

// ✅ NEW: Check if user has specific role
export function hasRole(allowedRoles) {
  const user = getCurrentUser();
  if (!user || !user.role) return false;

  if (Array.isArray(allowedRoles)) {
    return allowedRoles.includes(user.role);
  }

  return user.role === allowedRoles;
}

// ✅ NEW: Check if user is super admin
export function isSuperAdmin() {
  const user = getCurrentUser();
  return user?.is_super_admin === true;
}

// ✅ NEW: Get authorization headers for API calls
export function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Logout
export function logout() {
  localStorage.removeItem("sp_token");
  localStorage.removeItem("sp_user"); // ✅ ADDED
}

// Refresh token (optional, backend must support /auth/refresh)
export async function refreshToken() {
  const refresh = localStorage.getItem("sp_refresh_token");
  if (!refresh) throw new Error("No refresh token");

  const res = await axiosClient.post("/auth/refresh", { refresh });
  if (res?.data?.access_token) {
    localStorage.setItem("sp_token", res.data.access_token);

    // ✅ Update user data
    if (res.data.user) {
      localStorage.setItem("sp_user", JSON.stringify(res.data.user));
    }
  }

  return res.data;
}