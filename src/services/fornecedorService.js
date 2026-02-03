import api from './api';

export const fornecedorService = {
  getAll: async () => {
    try {
      const response = await api.get('/api/fornecedores');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/api/fornecedores/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar fornecedor com ID ${id}:`, error);
      throw error;
    }
  },

  create: async (fornecedorData) => {
    try {
      const response = await api.post('/api/fornecedores', fornecedorData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      throw error;
    }
  },

  update: async (id, fornecedorData) => {
    try {
      const response = await api.put(`/api/fornecedores/${id}`, fornecedorData);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar fornecedor com ID ${id}:`, error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      await api.delete(`/api/fornecedores/${id}`);
    } catch (error) {
      console.error(`Erro ao deletar fornecedor com ID ${id}:`, error);
      throw error;
    }
  }
};
