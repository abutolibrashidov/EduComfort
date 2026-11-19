import axios from "../api/axiosClient";

export const getStudentMaterials = async (studentId) => {
  const response = await axios.get(`/student/${studentId}/materials`);
  return response.data;
};
