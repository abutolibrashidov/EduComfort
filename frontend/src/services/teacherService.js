import axiosClient from "../api/axiosClient";

export const getTeacherDashboard = async () => {
  const res = await axiosClient.get("/teacher/dashboard");
  return res.data;
};

export const getTeacherGroups = async () => {
  const res = await axiosClient.get("/teacher/groups");
  return res.data;
};

export const getGroupStudents = async (groupId) => {
  const res = await axiosClient.get(`/teacher/groups/${groupId}/students`);
  return res.data;
};