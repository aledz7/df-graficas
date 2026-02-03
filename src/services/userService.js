import api from './api';

export const userService = {
  // Buscar todos os usuários ativos
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/api/users', { params });
      return {
        data: response.data.data || response.data || [],
        meta: response.data.meta || {}
      };
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
  },

  // Buscar usuários que podem receber comissão
  getVendedores: async (params = {}) => {
    try {
      const response = await api.get('/api/users', { 
        params: { 
          ...params,
          permite_comissao: true,
          ativo: true
        } 
      });
      return {
        data: response.data.data || response.data || [],
        meta: response.data.meta || {}
      };
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error);
      throw error;
    }
  },

  // Buscar usuário por ID
  getById: async (id) => {
    try {
      const response = await api.get(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar usuário com ID ${id}:`, error);
      throw error;
    }
  },

  // Buscar usuários com filtros específicos
  search: async (filtros = {}) => {
    try {
      const response = await api.get('/api/users', { params: filtros });
      return {
        data: response.data.data || response.data || [],
        meta: response.data.meta || {}
      };
    } catch (error) {
      console.error('Erro ao buscar usuários com filtros:', error);
      throw error;
    }
  }
};
