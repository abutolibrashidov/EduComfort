/**
 * Institution API Service
 * Handles institution branding and settings management
 */
import axiosClient from '../api/axiosClient';

const institutionService = {
    /**
     * Get current user's institution settings
     */
    getCurrentInstitution: async () => {
        const response = await axiosClient.get('/institutions/current');
        return response.data;
    },

    /**
     * Update current user's institution settings
     * @param {Object} data - Institution data to update
     */
    updateInstitution: async (data) => {
        const response = await axiosClient.put('/institutions/current', data);
        return response.data;
    },

    /**
     * Upload institution logo
     * @param {File} file - Logo file to upload
     */
    uploadLogo: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosClient.post('/institutions/current/logo', formData, {
            headers: {
                'Content-Type': undefined,
            },
        });
        return response.data;
    },

    /**
     * Get all institutions (super admin only)
     */
    getAllInstitutions: async () => {
        const response = await axiosClient.get('/institutions/');
        return response.data;
    },

    /**
     * Get institution by ID (super admin only)
     * @param {number} id - Institution ID
     */
    getInstitutionById: async (id) => {
        const response = await axiosClient.get(`/institutions/${id}`);
        return response.data;
    },
};

export default institutionService;
