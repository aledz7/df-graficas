import api from './api';

export const configuracaoPontosService = {
  /**
   * Obter configuração de pontos atual
   */
  async getConfiguracao() {
    try {
      const response = await api.get('/api/configuracoes-pontos');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter configuração de pontos:', error);
      throw error;
    }
  },

  /**
   * Salvar configuração de pontos
   */
  async salvarConfiguracao(configuracao) {
    try {
      const response = await api.post('/api/configuracoes-pontos', configuracao);
      return response.data;
    } catch (error) {
      console.error('Erro ao salvar configuração de pontos:', error);
      throw error;
    }
  },

  /**
   * Ativar/desativar programa de pontos
   */
  async toggleStatus(ativo) {
    try {
      const response = await api.post('/api/configuracoes-pontos/toggle-status', { ativo });
      return response.data;
    } catch (error) {
      console.error('Erro ao alterar status do programa de pontos:', error);
      throw error;
    }
  },

  /**
   * Resetar configuração para valores padrão
   */
  async resetarConfiguracao() {
    try {
      const response = await api.post('/api/configuracoes-pontos/reset');
      return response.data;
    } catch (error) {
      console.error('Erro ao resetar configuração de pontos:', error);
      throw error;
    }
  },

  /**
   * Obter configuração com fallback para valores padrão
   */
  async getConfiguracaoComFallback() {
    try {
      const response = await this.getConfiguracao();
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.warn('Erro ao obter configuração de pontos, usando valores padrão:', error);
    }

    // Retornar valores padrão se não conseguir obter da API
    return {
      ativo: true,
      pontos_por_reais: 50.00,
      validade_meses: 12,
      resgate_minimo: 50,
      descricao: 'Programa de fidelidade padrão',
      regras_adicionais: [],
    };
  }
}; 