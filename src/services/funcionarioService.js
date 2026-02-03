import api from './api';

export const funcionarioService = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/api/funcionarios', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/api/funcionarios/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar funcionário com ID ${id}:`, error);
      throw error;
    }
  },

  create: async (funcionarioData) => {
    try {
      const response = await api.post('/api/funcionarios', funcionarioData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      throw error;
    }
  },

  update: async (id, funcionarioData) => {
    try {
      const response = await api.put(`/api/funcionarios/${id}`, funcionarioData);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar funcionário com ID ${id}:`, error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      await api.delete(`/api/funcionarios/${id}`);
    } catch (error) {
      console.error(`Erro ao deletar funcionário com ID ${id}:`, error);
      throw error;
    }
  },

  // Verificar se funcionário tem credenciais de acesso
  hasCredentials: async (id) => {
    try {
      const response = await api.get(`/api/funcionarios/${id}/credenciais`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao verificar credenciais do funcionário ${id}:`, error);
      throw error;
    }
  },

  // Resetar senha do funcionário
  resetPassword: async (id) => {
    try {
      const response = await api.post(`/api/funcionarios/${id}/reset-senha`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao resetar senha do funcionário ${id}:`, error);
      throw error;
    }
  },

  // Métodos específicos
  getAtivos: async () => {
    try {
      const response = await api.get('/api/funcionarios/ativos');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar funcionários ativos:', error);
      throw error;
    }
  },

  getPorCargo: async (cargo) => {
    try {
      const response = await api.get('/api/funcionarios/por-cargo', { params: { cargo } });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar funcionários por cargo:', error);
      throw error;
    }
  },

  getComComissao: async () => {
    try {
      const response = await api.get('/api/funcionarios/com-comissao');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar funcionários com comissão:', error);
      throw error;
    }
  },

  addVale: async (funcionarioId, valeData) => {
    try {
      const response = await api.post(`/api/funcionarios/${funcionarioId}/vales`, valeData);
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar vale:', error);
      throw error;
    }
  },

  addFalta: async (funcionarioId, faltaData) => {
    try {
      const response = await api.post(`/api/funcionarios/${funcionarioId}/faltas`, faltaData);
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar falta:', error);
      throw error;
    }
  },

  removeVale: async (funcionarioId, valeId) => {
    try {
      const response = await api.delete(`/api/funcionarios/${funcionarioId}/vales`, { 
        data: { vale_id: valeId } 
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao remover vale:', error);
      throw error;
    }
  },

  removeFalta: async (funcionarioId, faltaId) => {
    try {
      const response = await api.delete(`/api/funcionarios/${funcionarioId}/faltas`, { 
        data: { falta_id: faltaId } 
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao remover falta:', error);
      throw error;
    }
  },

  // Histórico de salários
  addSalarioHistorico: async (funcionarioId, salarioData) => {
    try {
      const response = await api.post(`/api/funcionarios/${funcionarioId}/salario-historico`, salarioData);
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar histórico de salário:', error);
      throw error;
    }
  },

  getSalarioHistorico: async (funcionarioId) => {
    try {
      const response = await api.get(`/api/funcionarios/${funcionarioId}/salario-historico`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar histórico de salário:', error);
      // Se a tabela não existe, retornar array vazio
      if (error.response?.status === 500 && error.response?.data?.message?.includes('Table')) {
        return { success: true, data: [] };
      }
      throw error;
    }
  },

  getSalarioPorMes: async (funcionarioId, mes, ano) => {
    try {
      const response = await api.get(`/api/funcionarios/${funcionarioId}/salario-por-mes`, {
        params: { mes, ano }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar salário por mês:', error);
      throw error;
    }
  },

  // Relatórios mensais
  gerarRelatorioMensal: async (funcionarioId, mes, ano) => {
    try {
      const response = await api.get(`/api/funcionarios/${funcionarioId}/relatorio-mensal`, {
        params: { mes, ano }
      });
      // API retorna { success, message, data }; devolvemos somente data
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Erro ao gerar relatório mensal:', error);
      throw error;
    }
  },

  // Buscar todos os relatórios de um funcionário
  getRelatoriosMensais: async (funcionarioId) => {
    try {
      const response = await api.get(`/api/funcionarios/${funcionarioId}/relatorios-mensais`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar relatórios mensais:', error);
      // Se a tabela não existe, retornar array vazio
      if (error.response?.status === 500 && error.response?.data?.message?.includes('Table')) {
        return { success: true, data: [] };
      }
      throw error;
    }
  },

  // Verificar se mês já foi fechado
  verificarMesFechado: async (mes, ano) => {
    try {
      const response = await api.post('/api/funcionarios/verificar-mes-fechado', { mes, ano });
      return response.data;
    } catch (error) {
      console.error('Erro ao verificar mês fechado:', error);
      throw error;
    }
  },

  // Fechar mês e gerar holerites
  fecharMes: async (data) => {
    try {
      const response = await api.post('/api/funcionarios/fechar-mes', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao fechar mês:', error);
      throw error;
    }
  },

  // Reabrir mês (desfazer fechamento)
  reabrirMes: async (mes, ano) => {
    try {
      const response = await api.post('/api/funcionarios/reabrir-mes', { mes, ano });
      return response.data;
    } catch (error) {
      console.error('Erro ao reabrir mês:', error);
      throw error;
    }
  },

  // Buscar holerites de um funcionário
  getHolerites: async (funcionarioId, params = {}) => {
    try {
      const response = await api.get(`/api/funcionarios/${funcionarioId}/holerites`, { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar holerites:', error);
      throw error;
    }
  },

  // Buscar holerite específico
  getHolerite: async (funcionarioId, holeriteId) => {
    try {
      const response = await api.get(`/api/funcionarios/${funcionarioId}/holerites/${holeriteId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar holerite:', error);
      throw error;
    }
  },

  // Configuração de fechamento automático de mês
  getConfiguracaoFechamentoMes: async () => {
    try {
      const response = await api.get('/api/configuracao-fechamento-mes');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar configuração de fechamento:', error);
      throw error;
    }
  },

  updateConfiguracaoFechamentoMes: async (data) => {
    try {
      const response = await api.put('/api/configuracao-fechamento-mes', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar configuração de fechamento:', error);
      throw error;
    }
  },

  // Histórico de fechamentos
  getHistoricoFechamentos: async (params = {}) => {
    try {
      const response = await api.get('/api/configuracao-fechamento-mes/historico', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar histórico de fechamentos:', error);
      throw error;
    }
  },

  getHistoricoFechamentosResumido: async () => {
    try {
      const response = await api.get('/api/configuracao-fechamento-mes/historico-resumido');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar histórico resumido de fechamentos:', error);
      throw error;
    }
  },

  // Executar fechamento automático manualmente
  executarFechamentoAutomatico: async () => {
    try {
      const response = await api.post('/api/configuracao-fechamento-mes/executar-fechamento');
      return response.data;
    } catch (error) {
      console.error('Erro ao executar fechamento automático:', error);
      throw error;
    }
  }
};
