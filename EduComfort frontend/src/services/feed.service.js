import axios from "../api/axiosClient";

// GET feed posts
export const getFeedPosts = async (institutionId = null, userId = null) => {
    const params = {};
    if (institutionId) params.institution_id = institutionId;
    if (userId) params.user_id = userId;

    const res = await axios.get("/feed/", { params });
    return res.data;
};

// CREATE new post
export const createPost = async (content, institutionId = null, imageUrl = null) => {
    const payload = {
        content,
        institution_id: institutionId,
        image_url: imageUrl
    };

    const res = await axios.post("/feed/posts", payload);
    return res.data;
};

// UPLOAD media
export const uploadMedia = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post("/feed/upload", formData, {
        headers: {
            "Content-Type": undefined // Let browser set boundary
        }
    });
    return res.data; // { url: ... }
};

// DELETE post
// DELETE post
export const deletePost = async (postId) => {
    await axios.delete(`/feed/posts/${postId}`);
};

// LIKE post
export const likePost = async (postId) => {
    const res = await axios.post(`/feed/posts/${postId}/like`);
    return res.data;
};

// FOLLOW user
export const followUser = async (userId) => {
    const res = await axios.post(`/feed/users/${userId}/follow`);
    return res.data;
};

// GET comments
export const getComments = async (postId) => {
    const res = await axios.get(`/feed/posts/${postId}/comments`);
    return res.data;
};

// ADD comment
export const addComment = async (postId, content) => {
    const res = await axios.post(`/feed/posts/${postId}/comments`, { content });
    return res.data;
};
