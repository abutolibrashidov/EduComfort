import axios from "../api/axiosClient";

export const approveUser = async (userId) => {
  const response = await axios.post(`/admin/approve/${userId}`);
  return response.data;
};
