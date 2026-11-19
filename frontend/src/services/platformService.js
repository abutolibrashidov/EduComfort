import axiosClient from '../api/axiosClient';
// NOTE: import axiosClient (not `api`) — match the export name in axiosClient.js

// ==================== Platform Stats ====================

export const getPlatformStats = async () => {
  const response = await axiosClient.get('/platform/dashboard');
  return response.data;
};

export const getPlatformGrowth = async () => {
  const response = await axiosClient.get('/platform/stats/growth');
  return response.data;
};

export const getSystemHealth = async () => {
  const response = await axiosClient.get('/platform/health');
  return response.data;
};

// ==================== Institutions ====================

export const getAllInstitutions = async () => {
  const response = await axiosClient.get('/platform/institutions');
  return response.data;
};

export const createInstitution = async (data) => {
  const response = await axiosClient.post('/platform/institutions', data);
  return response.data;
};

export const suspendInstitution = async (id) => {
  const response = await axiosClient.post(`/platform/institutions/${id}/suspend`);
  return response.data;
};

export const activateInstitution = async (id) => {
  const response = await axiosClient.post(`/platform/institutions/${id}/activate`);
  return response.data;
};

/**
 * Delete an institution.
 *
 * The backend now uses a two-phase delete:
 *   1. Soft-delete (is_active=False) → responds with 200 immediately
 *   2. Hard cascade delete runs as a background task after the response
 *
 * This means the request completes in < 1 second regardless of institution size.
 * The response will have status: "processing" — handle this in the UI by
 * removing the institution from the list optimistically on 200/202.
 *
 * No timeout override needed anymore, but kept at 10s as a safety net
 * (if the backend hasn't adopted the background task pattern yet,
 *  this will still fail — increase if needed while migrating).
 */
export const deleteInstitution = async (id) => {
  const response = await axiosClient.delete(`/platform/institutions/${id}`, {
    timeout: 10_000, // 10s — soft-delete should respond in < 1s
  });
  return response.data;
};

export const updateInstitutionCredits = async (id, credits) => {
  const response = await axiosClient.put(`/platform/institutions/${id}/credits`, { credits });
  return response.data;
};

// ==================== Users ====================

export const getAllUsers = async () => {
  const response = await axiosClient.get('/platform/users');
  return response.data;
};

export const getAllLearners = async () => {
  const response = await axiosClient.get('/platform/learners');
  return response.data;
};

/**
 * Delete a user. Same two-phase pattern as institution delete.
 * Backend responds immediately after soft-delete; hard delete runs in background.
 */
export const deleteUser = async (id) => {
  const response = await axiosClient.delete(`/platform/users/${id}`, {
    timeout: 10_000,
  });
  return response.data;
};

export const blockUser = async (id) => {
  const response = await axiosClient.post(`/platform/users/${id}/block`);
  return response.data;
};

export const unblockUser = async (id) => {
  const response = await axiosClient.post(`/platform/users/${id}/unblock`);
  return response.data;
};

export const updatePlatformProfile = async (id, data) => {
  const response = await axiosClient.put(`/admin/users/${id}`, data);
  return response.data;
};

export const impersonateUser = async (userId) => {
  const response = await axiosClient.post(`/auth/impersonate/${userId}`);
  return response.data;
};

// ==================== Billing ====================

export const getPlans = async () => {
  const response = await axiosClient.get('/billing/plans');
  return response.data;
};

export const getSubscriptions = async () => {
  const response = await axiosClient.get('/billing/subscriptions');
  return response.data;
};

export const assignSubscription = async (institutionId, plan) => {
  const response = await axiosClient.post(
    `/billing/institutions/${institutionId}/subscribe?plan=${plan}`
  );
  return response.data;
};