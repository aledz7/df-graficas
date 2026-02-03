import api from './api';

export const contasReceberService = {
  // Buscar todas as contas a receber
  getContasReceber: async (filtros = {}) => {
    try {
      const response = await api.get('/api/contas-receber', { params: filtros });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar contas a receber:', error);
      return [];
    }
  },

  // Buscar uma conta específica
  getContaReceber: async (id) => {
    try {
      const response = await api.get(`/api/contas-receber/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar conta a receber:', error);
      return null;
    }
  },

  // Criar nova conta a receber
  createContaReceber: async (dados) => {
    try {
      const response = await api.post('/api/contas-receber', dados);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar conta a receber:', error);
      throw error;
    }
  },

  // Método alternativo para compatibilidade
  create: async (dados) => {
    try {
      const response = await api.post('/api/contas-receber', dados);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar conta a receber:', error);
      throw error;
    }
  },

  // Atualizar conta a receber
  updateContaReceber: async (id, dados) => {
    try {
      const response = await api.put(`/api/contas-receber/${id}`, dados);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar conta a receber:', error);
      throw error;
    }
  },

  // Registrar pagamento
  registrarPagamento: async (id, dadosPagamento) => {
    try {
      const response = await api.post(`/api/contas-receber/${id}/receber`, dadosPagamento);
      return response.data;
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      throw error;
    }
  },

  // Aplicar juros
  aplicarJuros: async (id, dadosJuros) => {
    try {
      const response = await api.post(`/api/contas-receber/${id}/juros`, dadosJuros);
      return response.data;
    } catch (error) {
      console.error('Erro ao aplicar juros:', error);
      throw error;
    }
  },

  // Remover conta a receber
  deleteContaReceber: async (id) => {
    try {
      const response = await api.delete(`/api/contas-receber/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao remover conta a receber:', error);
      throw error;
    }
  }
}; 