import api from './api.js';

/**
 * Serviço para gerenciar configurações administrativas
 */
class AdminConfigService {
  /**
   * Busca todas as configurações administrativas
   */
  async getConfiguracoes() {
    try {
      const response = await api.get('/api/admin-configuracoes');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar configurações administrativas:', error);
      throw error;
    }
  }

  /**
   * Atualiza as configurações administrativas
   */
  async updateConfiguracoes(dados) {
    try {
      const response = await api.put('/api/admin-configuracoes', dados);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar configurações administrativas:', error);
      throw error;
    }
  }

  /**
   * Busca uma configuração específica
   */
  async getConfiguracao(chave) {
    try {
      const response = await api.get(`/api/admin-configuracoes/${chave}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar configuração ${chave}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza uma configuração específica
   */
  async updateConfiguracao(chave, valor) {
    try {
      const response = await api.put(`/api/admin-configuracoes/${chave}`, { valor });
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar configuração ${chave}:`, error);
      throw error;
    }
  }

  /**
   * Valida a senha master
   */
  async validarSenhaMaster(senha) {
    try {
      const response = await api.post('/api/admin-configuracoes/validar-senha-master', { senha });
      return response.data;
    } catch (error) {
      console.error('Erro ao validar senha master:', error);
      throw error;
    }
  }

  /**
   * Remove a senha master
   */
  async removerSenhaMaster() {
    try {
      const response = await api.delete('/api/admin-configuracoes/senha-master');
      return response.data;
    } catch (error) {
      console.error('Erro ao remover senha master:', error);
      throw error;
    }
  }

  /**
   * Busca o nome do sistema
   */
  async getNomeSistema() {
    try {
      const response = await this.getConfiguracoes();
      return response.data?.nome_sistema || 'Sistema Gráficas';
    } catch (error) {
      console.error('Erro ao buscar nome do sistema:', error);
      return 'Sistema Gráficas';
    }
  }

  /**
   * Atualiza o nome do sistema
   */
  async setNomeSistema(nome) {
    try {
      const response = await this.updateConfiguracao('nome_sistema', nome);
      return response;
    } catch (error) {
      console.error('Erro ao atualizar nome do sistema:', error);
      throw error;
    }
  }

  /**
   * Verifica se existe senha master configurada
   */
  async temSenhaMaster() {
    try {
      const response = await this.getConfiguracoes();
      return response.data?.tem_senha_master || false;
    } catch (error) {
      console.error('Erro ao verificar senha master:', error);
      return false;
    }
  }

  /**
   * Busca a configuração de numeração inicial de OS
   */
  async getConfiguracaoNumeracaoOS() {
    try {
      const response = await api.get('/api/ordens-servico/configuracao-numeracao');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar configuração de numeração:', error);
      throw error;
    }
  }

  /**
   * Atualiza a configuração de numeração inicial de OS
   */
  async setConfiguracaoNumeracaoOS(numeracaoInicial) {
    try {
      const response = await api.post('/api/ordens-servico/configuracao-numeracao', {
        numeracao_inicial_os: numeracaoInicial
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao salvar configuração de numeração:', error);
      throw error;
    }
  }
}

export const adminConfigService = new AdminConfigService(); 