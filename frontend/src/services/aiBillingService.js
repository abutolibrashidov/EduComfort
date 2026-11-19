import api from '../api/axios';

export const getMyCreditBalance = async () => {
    try {
        const response = await api.get('/ai-billing/balance');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch credit balance:", error);
        throw error;
    }
};

export const getMyUsageReport = async (limit = 50) => {
    try {
        const response = await api.get(`/ai-billing/usage?limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error("Failed to fetch usage report:", error);
        throw error;
    }
};

// Platform Owner Only
export const addCredits = async (institutionId, amount, note = "") => {
    try {
        const response = await api.post('/ai-billing/admin/add-credits', {
            institution_id: institutionId,
            amount: parseFloat(amount),
            note
        });
        return response.data;
    } catch (error) {
        console.error("Failed to add credits:", error);
        throw error;
    }
};

export const getGlobalUsageReport = async () => {
    try {
        const response = await api.get('/ai-billing/admin/usage-report');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch global usage report:", error);
        throw error;
    }
};
