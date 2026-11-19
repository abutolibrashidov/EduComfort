import api from '../api/axios';

// Guruh chatlarini olish
export const getGroupMessages = async (groupId) => {
  try {
    const response = await api.get(`/student/chat/group/${groupId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching group messages:', error);
    throw error;
  }
};

// Xabar jo‘natish
export const sendMessage = async (groupId, message) => {
  try {
    const response = await api.post(`/student/chat/group/${groupId}`, { message });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};
