// src/api/config.js
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Backward-compatible alias — older files that import ASSET_BASE_URL still work
export const ASSET_BASE_URL = API_BASE_URL;

export function assetUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return API_BASE_URL + path;
}
