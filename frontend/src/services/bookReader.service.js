import axiosClient from '../api/axiosClient';

const bookReaderService = {
    // Get book page
    getPage: (bookId, pageNumber) =>
        axiosClient.get(`/book-reader/books/${bookId}/pages/${pageNumber}`),

    // Get book chapters
    getChapters: (bookId) =>
        axiosClient.get(`/book-reader/books/${bookId}/chapters`),

    // Get student progress
    getMyProgress: (bookId) =>
        axiosClient.get(`/book-reader/books/${bookId}/my-progress`),

    // Update progress
    updateProgress: (bookId, progressData) =>
        axiosClient.post(`/book-reader/books/${bookId}/progress`, progressData),

    // Submit exercise answer
    submitExercise: (bookId, exerciseData) =>
        axiosClient.post(`/book-reader/books/${bookId}/exercises/submit`, exerciseData),

    // Check extraction status
    getExtractionStatus: (bookId) =>
        axiosClient.get(`/book-reader/books/${bookId}/extraction-status`),

    // Trigger content extraction (teachers only)
    extractContent: (bookId) =>
        axiosClient.post(`/book-reader/books/${bookId}/extract`),

    // Get book analytics (teachers only)
    getAnalytics: (bookId) =>
        axiosClient.get(`/book-reader/books/${bookId}/analytics`)
};

export default bookReaderService;
