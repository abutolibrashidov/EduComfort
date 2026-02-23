import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getToken, getCurrentUser } from "../api/auth";

const RequireAuth = ({ allowedRoles = [] }) => {
  const location = useLocation();
  const token = getToken();

  // ✅ Not logged in
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ✅ Get user data
  const user = getCurrentUser();
  const role = typeof user?.role === 'object' ? user.role.value : user?.role;

  console.log(`[RequireAuth] Path: ${location.pathname}, User: ${user?.first_name}, Role: ${role}, Allowed: ${allowedRoles}`);

  if (!user || !role) {
    console.error("Token exists but user data is invalid or role missing");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ✅ No role restrictions - allow any authenticated user
  if (allowedRoles.length === 0) {
    return <Outlet />;
  }

  // ✅ Check if user's role is allowed (OR if user is super_admin bypass)
  if (allowedRoles.includes(role) || role === "super_admin") {
    return <Outlet />;
  }

  // ✅ Role not allowed - redirect to unauthorized
  console.warn(`Access denied: User role "${role}" not in allowed roles:`, allowedRoles);
  return <Navigate to="/unauthorized" replace />;
};

export default RequireAuth;