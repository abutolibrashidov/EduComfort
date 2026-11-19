import axiosClient from "../api/axiosClient";

const workbookService = {
    // --- Workbook Management ---
    getAllWorkbooks: async (params = {}) => {
        const response = await axiosClient.get("/interactive-workbooks", { params });
        return response.data;
    },

    getWorkbookById: async (id) => {
        const response = await axiosClient.get(`/interactive-workbooks/${id}`);
        return response.data;
    },

    createWorkbook: async (data) => {
        const response = await axiosClient.post("/interactive-workbooks", data);
        return response.data;
    },

    updateWorkbook: async (id, data) => {
        const formData = new FormData();
        Object.keys(data).forEach((key) => {
            if (data[key] !== undefined && data[key] !== null) {
                formData.append(key, data[key]);
            }
        });

        // Use put with form data for updates (consistent with router)
        const response = await axiosClient.put(`/interactive-workbooks/${id}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    uploadWorkbookFile: async (id, file) => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await axiosClient.post(
            `/interactive-workbooks/${id}/upload`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        return response.data;
    },

    // --- Exercises ---
    getExercises: async (workbookId) => {
        const response = await axiosClient.get(`/interactive-workbooks/${workbookId}/exercises`);
        return response.data;
    },

    createExercise: async (workbookId, data) => {
        const response = await axiosClient.post(`/interactive-workbooks/${workbookId}/exercises`, data);
        return response.data;
    },

    updateExercise: async (exerciseId, data) => {
        const response = await axiosClient.put(`/interactive-workbooks/exercises/${exerciseId}`, data);
        return response.data;
    },

    // --- Student Submissions ---
    submitExercise: async (workbookId, exerciseId, answer) => {
        const response = await axiosClient.post(
            `/interactive-workbooks/${workbookId}/exercises/${exerciseId}/submit`,
            { student_answer: answer }
        );
        return response.data;
    },

    getMySubmissions: async (workbookId) => {
        const response = await axiosClient.get(`/interactive-workbooks/${workbookId}/my-submissions`);
        return response.data;
    },

    getMyProgress: async (workbookId) => {
        const response = await axiosClient.get(`/interactive-workbooks/${workbookId}/my-progress`);
        return response.data;
    },

    getDashboard: async (workbookId) => {
        const response = await axiosClient.get(`/interactive-workbooks/${workbookId}/dashboard`);
        return response.data;
    },

    // --- Teacher Stats ---
    getAllSubmissions: async (workbookId) => {
        const response = await axiosClient.get(`/interactive-workbooks/${workbookId}/all-submissions`);
        return response.data;
    },

    getStatistics: async (workbookId) => {
        const response = await axiosClient.get(`/interactive-workbooks/${workbookId}/statistics`);
        return response.data;
    }
};

export default workbookService;
