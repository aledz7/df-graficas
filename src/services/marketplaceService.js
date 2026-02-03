import api from './api';

export const marketplaceService = {
  // Vendas de marketplace
  getVendas: async (params = {}) => {
    try {
      const response = await api.get('/api/marketplace/vendas', {
        params: params
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar vendas de marketplace:', error);
      return [];
    }
  },
  
  salvarVendas: async (dados) => {
    try {
      const response = await api.post('/api/marketplace/vendas', { dados });
      return response.data;
    } catch (error) {
      console.error('Erro ao salvar vendas de marketplace:', error);
      throw error;
    }
  },

  // Salvar uma única venda
  salvarVenda: async (vendaData) => {
    try {
      const response = await api.post('/api/marketplace/venda', vendaData);
      return response.data;
    } catch (error) {
      console.error('Erro ao salvar venda de marketplace:', error);
      throw error;
    }
  },

  // Excluir uma venda
  excluirVenda: async (id) => {
    try {
      const response = await api.delete(`/api/marketplace/venda/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao excluir venda de marketplace:', error);
      throw error;
    }
  }
};

export default marketplaceService;
