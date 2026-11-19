export const getAllPayments = async () => {
  try {
    const response = await api.get('/admin/payments');
    return response.data;
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
};333
