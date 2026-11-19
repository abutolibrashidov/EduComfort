// api/config.js
// ✅ FIX 1: Single source of truth for the API base URL.
//    In development:  set VITE_API_URL=http://localhost:8000 in .env.development
//    In production:   set VITE_API_URL=https://api.educomfort.uz in .env.production
//    NEVER hardcode localhost or any domain here.

if (!import.meta.env.VITE_API_URL) {
  console.warn(
    "⚠️ VITE_API_URL is not set. " +
    "Create a .env.development file with: VITE_API_URL=http://localhost:8000"
  );
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ✅ FIX 2: Asset/image URL helper — use this for ALL file/image paths from the backend.
//    Example: <img src={assetUrl("/uploads/logos/logo.png")} />
export const assetUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path; // already absolute
  return `${API_BASE_URL}${path}`;
};