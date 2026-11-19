import axios from "../api/axiosClient";

export const getPublicMaterials = async () => {
  const response = await axios.get("/public/materials");
  return response.data;
};
