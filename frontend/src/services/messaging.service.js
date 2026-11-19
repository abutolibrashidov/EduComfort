export const getAllMessages = async () => {
  try {
    const response = await api.get('/admin/messages');
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};
// src/services/chatService.js

export const getGroupMessages = async () => {
  // Temporary mock data
  return [
    { id: 1, sender: 'Teacher', message: 'Hello students!' },
    { id: 2, sender: 'Student', message: 'Hi teacher!' }
  ];
};

export const sendMessage = async (msg) => {
  // Just a mock for now
  console.log('Sending message:', msg);
  return { success: true };
};
