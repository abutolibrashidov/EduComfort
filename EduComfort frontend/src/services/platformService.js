import api from '../api/axios';

export const getPlatformStats = async () => {
    try {
        const response = await api.get('/platform/dashboard');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch platform stats:", error);
        throw error;
    }
};

export const getAllInstitutions = async () => {
    try {
        const response = await api.get('/platform/institutions');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch institutions:", error);
        throw error;
    }
};

export const getAllLearners = async () => {
    try {
        const response = await api.get('/platform/learners');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch learners:", error);
        throw error;
    }
};

export const getAllUsers = async () => {
    try {
        const response = await api.get('/platform/users');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch all users:", error);
        throw error;
    }
};

export const getSystemHealth = async () => {
    try {
        const response = await api.get('/platform/health');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch system health:", error);
        throw error;
    }
};

export const suspendInstitution = async (id) => {
    try {
        const response = await api.post(`/platform/institutions/${id}/suspend`);
        return response.data;
    } catch (error) {
        console.error(`Failed to suspend institution ${id}:`, error);
        throw error;
    }
};

export const activateInstitution = async (id) => {
    try {
        const response = await api.post(`/platform/institutions/${id}/activate`);
        return response.data;
    } catch (error) {
        console.error(`Failed to activate institution ${id}:`, error);
        throw error;
    }
};

export const deleteInstitution = async (id) => {
    try {
        const response = await api.delete(`/platform/institutions/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to delete institution ${id}:`, error);
        throw error;
    }
};

export const deleteUser = async (id) => {
    try {
        const response = await api.delete(`/platform/users/${id}`);
        return response.data;
    } catch (error) {
        console.error("Failed to delete user:", error);
        throw error;
    }
};

export const blockUser = async (id) => {
    try {
        const response = await api.post(`/platform/users/${id}/block`);
        return response.data;
    } catch (error) {
        console.error("Failed to block user:", error);
        throw error;
    }
};

export const unblockUser = async (id) => {
    try {
        const response = await api.post(`/platform/users/${id}/unblock`);
        return response.data;
    } catch (error) {
        console.error("Failed to unblock user:", error);
        throw error;
    }
};

export const updatePlatformProfile = async (id, data) => {
    try {
        const response = await api.put(`/admin/users/${id}`, data);
        return response.data;
    } catch (error) {
        console.error("Failed to update profile:", error);
        throw error;
    }
};

// Billing
export const getPlans = async () => {
    try {
        const response = await api.get('/billing/plans');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch plans:", error);
        throw error;
    }
};

export const getSubscriptions = async () => {
    try {
        const response = await api.get('/billing/subscriptions');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch subscriptions:", error);
        throw error;
    }
};

export const assignSubscription = async (institutionId, plan) => {
    try {
        const response = await api.post(`/billing/institutions/${institutionId}/subscribe?plan=${plan}`);
        return response.data;
    } catch (error) {
        console.error("Failed to assign subscription:", error);
        throw error;
    }
};

export const impersonateUser = async (userId) => {
    try {
        const response = await api.post(`/auth/impersonate/${userId}`);
        return response.data;
    } catch (error) {
        console.error("Failed to impersonate user:", error);
        throw error;
    }
};
