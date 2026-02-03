import api from './api';

export const envelopamentoService = {
  // CRUD básico
  getAll: async (params = {}) => {
    const response = await api.get('/api/envelopamentos', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/envelopamentos/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/api/envelopamentos', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/envelopamentos/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/envelopamentos/${id}`);
    return response.data;
  },

  // Métodos customizados
  buscarPorCodigo: async (codigo) => {
    const response = await api.get('/api/envelopamentos/buscar/codigo', { params: { codigo } });
    return response.data;
  },

  getEstatisticas: async (params = {}) => {
    const response = await api.get('/api/envelopamentos/estatisticas', { params });
    return response.data;
  },

  finalizar: async (id, data) => {
    const response = await api.post(`/api/envelopamentos/${id}/finalizar`, data);
    return response.data;
  },

  moverParaLixeira: async (id, justificativa) => {
    const response = await api.post(`/api/envelopamentos/${id}/lixeira`, { justificativa });
    return response.data;
  },

  getNextCodigo: async () => {
    try {
      const response = await api.get('/api/envelopamentos/next-codigo');
      return response.data.codigo; // Assuming backend returns {codigo: "ENV-..."}
    } catch (error) {
      console.error('Erro ao gerar próximo código:', error);
      const timestamp = Date.now();
      return `ENV-${timestamp}`; // Fallback
    }
  },

  // Métodos CRUD básicos
  create: async (data) => {
    const response = await api.post('/api/envelopamentos', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/api/envelopamentos/${id}`, data);
    return response.data;
  },

  // Funções de rascunho
  salvarRascunhoOrcamento: async (orcamento) => {
    if (!orcamento) {
      // Limpar rascunho
      localStorage.removeItem('envelopamentoOrcamentoAtual');
      return { success: true };
    }
    
    try {
      // Salvar no localStorage como rascunho
      localStorage.setItem('envelopamentoOrcamentoAtual', JSON.stringify(orcamento));
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      throw error;
    }
  },

  carregarRascunhoOrcamento: async () => {
    try {
      const rascunho = localStorage.getItem('envelopamentoOrcamentoAtual');
      return rascunho ? JSON.parse(rascunho) : null;
    } catch (error) {
      console.error('Erro ao carregar rascunho:', error);
      return null;
    }
  },

  // Função para salvar orçamento final
  salvarOrcamento: async (orcamento) => {
    try {
      // Gerar código único se não existir
      if (!orcamento.codigo_orcamento) {
        orcamento.codigo_orcamento = await envelopamentoService.getNextCodigo();
      }

      // Preparar dados para API
      const dadosParaAPI = {
        codigo_orcamento: orcamento.codigo_orcamento,
        nome_orcamento: orcamento.nome_orcamento || '',
        cliente: orcamento.cliente || {},
        selected_pecas: orcamento.selectedPecas || [],
        produto: orcamento.produto || {},
        // Não precisamos mais da estrutura antiga dos adicionais
        // Os serviços são salvos dentro de cada peça em selected_pecas
        // adicionais: [], // Campo vazio - estrutura antiga removida
        area_total_m2: orcamento.areaTotalM2 || 0,
        custo_total_material: orcamento.custoTotalMaterial || 0,
        custo_total_adicionais: orcamento.custoTotalAdicionais || 0,
        // Campos de desconto e frete
        desconto: parseFloat(orcamento.desconto ?? 0) || 0,
        desconto_tipo: orcamento.descontoTipo || 'percentual',
        desconto_calculado: parseFloat(orcamento.descontoCalculado ?? 0) || 0,
        frete: parseFloat(orcamento.frete ?? 0) || 0,
        orcamento_total: orcamento.orcamentoTotal || 0,
        valor_total: orcamento.orcamentoTotal || orcamento.valor_total || 0, // Campo obrigatório para o backend
        observacao: orcamento.observacao || '',
        status: orcamento.status || 'Rascunho', // Campo obrigatório
        data_criacao: orcamento.data_criacao || new Date().toISOString(), // Campo obrigatório
        data_validade: orcamento.data_validade || null,
        vendedor_id: orcamento.vendedor_id || null,
        vendedor_nome: orcamento.vendedor_nome || '',
        pagamentos: orcamento.pagamentos || []
      };




      if (orcamento.id && (
        // Se é um número (ID do banco)
        (typeof orcamento.id === 'number') ||
        // Se é uma string que não é rascunho
        (typeof orcamento.id === 'string' && !orcamento.id.startsWith('env-draft-') && !orcamento.id.startsWith('rascunho_env_'))
      )) {
        
        // Atualizar orçamento existente
        const response = await api.put(`/api/envelopamentos/${orcamento.id}`, dadosParaAPI);
        return response.data;
      } else {
        
        // Criar novo orçamento
        const response = await api.post('/api/envelopamentos', dadosParaAPI);
        return response.data;
      }
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      throw error;
    }
  }
};

export default envelopamentoService; 