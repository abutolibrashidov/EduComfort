// src/utils/token.js
import * as jwtDecode from "jwt-decode";

export const TOKEN_KEYS = ["sp_token", "access_token", "token"];

// ✅ Get token from localStorage
export const getToken = () => {
  for (const key of TOKEN_KEYS) {
    const t = localStorage.getItem(key);
    if (t) return t;
  }
  return null;
};

// ✅ Decode JWT token
export const decodeToken = (token) => {
  const t = token || getToken();
  if (!t) return null;

  try {
    // Try manual decoding first
    const payload = t.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    try {
      // Fallback to jwt-decode
      return jwtDecode.default ? jwtDecode.default(t) : jwtDecode(t);
    } catch {
      return null;
    }
  }
};
