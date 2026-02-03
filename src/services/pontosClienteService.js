import api from './api';

export const pontosClienteService = {
  /**
   * Atualizar pontos do cliente após uma venda
   */
  async atualizarPontosCliente(clienteId, valorVenda, tipoOperacao = 'acumular') {
    try {
      const response = await api.post(`/api/clientes/${clienteId}/pontos`, {
        valor_venda: valorVenda,
        tipo_operacao: tipoOperacao, // 'acumular' ou 'utilizar'
        data_operacao: new Date().toISOString()
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar pontos do cliente:', error);
      throw error;
    }
  },

  /**
   * Obter pontos do cliente
   */
  async getPontosCliente(clienteId) {
    try {
      const response = await api.get(`/api/clientes/${clienteId}/pontos`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter pontos do cliente:', error);
      throw error;
    }
  },

  /**
   * Resgatar pontos do cliente
   */
  async resgatarPontos(clienteId, pontosParaResgatar) {
    try {
      const response = await api.post(`/api/clientes/${clienteId}/pontos/resgatar`, {
        pontos_para_resgatar: pontosParaResgatar
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao resgatar pontos do cliente:', error);
      throw error;
    }
  }
}; 