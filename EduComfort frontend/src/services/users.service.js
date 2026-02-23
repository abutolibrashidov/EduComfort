import axios from "../api/axiosClient";

/* =========================
   ADMIN – USERS MANAGEMENT
   ========================= */

// GET all users (students list for admin)
// Merged from api/usersService.js: getUsers
export const getAllStudents = async (params = {}) => {
  const res = await axios.get("/admin/users", { params });
  return res.data;
};

// Alias for generic usage
export const getUsers = getAllStudents;

// CREATE a new user
export const createUser = async (data) => {
  const res = await axios.post("/admin/users", data);
  return res.data;
};

// UPDATE user (Generic)
export const updateUser = async (id, payload) => {
  const res = await axios.put(`/admin/users/${id}`, payload);
  return res.data;
};

// Alias for semantic clarity if needed, or just use updateUser
export const updateStudent = updateUser;

// DELETE user
export const deleteUser = async (id) => {
  const res = await axios.delete(`/admin/users/${id}`);
  return res.data;
};

// Alias
export const deleteStudent = deleteUser;

// ACTIVATE user
export const activateUser = async (id) => {
  const res = await axios.post(`/admin/users/${id}/activate`);
  return res.data;
};


/* =========================
   STUDENT – DASHBOARD
   ========================= */

export const getStudentDashboard = async () => {
  const res = await axios.get("/student/dashboard");
  return res.data;
};

export const getStudentCourses = async () => {
  const res = await axios.get("/student/courses");
  return res.data;
};

export const getStudentPayments = async () => {
  const res = await axios.get("/student/payments");
  return res.data;
};

export const getStudentRating = async () => {
  const res = await axios.get("/student/rating");
  return res.data;
};

/* =========================
   PROFILE - PUBLIC
   ========================= */

export const recordProfileView = async (userId) => {
  const res = await axios.post(`/users/${userId}/view`);
  return res.data;
};
