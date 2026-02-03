import api from '@/config/axios';

export const listarClientes = async () => {
  const response = await api.get('/api/clientes', { params: { per_page: 1000 } });
  return response.data;
}; 