import axios from 'axios';
import { apiDataManager } from '@/lib/apiDataManager';
import { getApiBaseUrl } from '@/lib/apiUrlUtils';

// Configuração base do axios
const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Importante para o Laravel Sanctum
});


// Interceptador para adicionar o token de autenticação a todas as requisições
api.interceptors.request.use(
  (config) => {
    // Se está redirecionando para login, cancelar requisições não públicas
    if (isRedirectingToLogin) {
      const isPublicRoute = config.url && (
        config.url.includes('/api/public/') ||
        config.url.includes('/api/login') ||
        config.url.includes('/api/register') ||
        config.url.includes('/api/storage/') ||
        config.url.includes('/api/complete-two-factor-login') ||
        config.url.includes('/api/send-two-factor-code') ||
        config.url.includes('/api/verify-two-factor-code')
      );
      
      // Cancelar requisições não públicas se está redirecionando
      if (!isPublicRoute) {
        const CancelToken = axios.CancelToken;
        const source = CancelToken.source();
        source.cancel('Redirecionando para login - requisição cancelada');
        config.cancelToken = source.token;
      }
    }
    
    const token = apiDataManager.getToken();
    
    // Verificar se é uma rota pública que não precisa de autenticação
    const isPublicRoute = config.url && (
      config.url.includes('/api/public/') ||
      config.url.includes('/api/login') ||
      config.url.includes('/api/register') ||
      config.url.includes('/api/storage/') ||
      config.url.includes('/api/complete-two-factor-login') ||
      config.url.includes('/api/send-two-factor-code') ||
      config.url.includes('/api/verify-two-factor-code')
    );
    
    if (token && !isPublicRoute) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log do payload para requisições de OS (debug)
    if (config.url && config.url.includes('/api/ordens-servico') && config.method === 'post') {
      console.log('🌐 [API Interceptor] Payload sendo enviado para backend:', {
        url: config.url,
        funcionario_id: config.data?.funcionario_id,
        tipo_funcionario_id: typeof config.data?.funcionario_id,
        payload_keys: Object.keys(config.data || {}),
        payload_completo: JSON.parse(JSON.stringify(config.data || {}))
      });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Flag para evitar múltiplos redirects simultâneos
let isRedirectingToLogin = false;

// Interceptador para tratar erros de resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se o erro for 401 (não autorizado)
    if (error.response && error.response.status === 401) {
      const hadToken = !!apiDataManager.getToken();
      const requestUrl = error.config?.url || '';
      
      // Verificar se é uma rota pública que não precisa de autenticação
      const isPublicRoute = requestUrl.includes('/api/public/') ||
                          requestUrl.includes('/api/login') ||
                          requestUrl.includes('/api/register') ||
                          requestUrl.includes('/api/complete-two-factor-login') ||
                          requestUrl.includes('/api/send-two-factor-code') ||
                          requestUrl.includes('/api/verify-two-factor-code');
      
      // Se havia token e a rota não é pública, o token expirou
      if (hadToken && !isPublicRoute && !isRedirectingToLogin) {
        isRedirectingToLogin = true;
        apiDataManager.removeToken();
        
        // Suprimir logs de erro 401 para evitar poluição do console
        // Apenas logar o primeiro erro
        if (!window.__first401Logged) {
          console.warn('🔐 Token expirado ou inválido. Redirecionando para login...');
          window.__first401Logged = true;
        }
        
        // Disparar evento customizado para notificar a aplicação
        window.dispatchEvent(new CustomEvent('tokenExpired', { 
          detail: { message: 'Sua sessão expirou. Faça login novamente.' }
        }));
        
        // Resetar flag após um tempo para permitir novas tentativas
        setTimeout(() => {
          isRedirectingToLogin = false;
          window.__first401Logged = false;
        }, 3000);
      }
      
      // Se já está redirecionando, suprimir o erro para evitar logs desnecessários
      if (isRedirectingToLogin) {
        // Retornar um erro silencioso para evitar logs
        return Promise.reject(new Error('Token expirado - redirecionando para login'));
      }
    } else if (error.response && error.response.status === 404) {
      // 404 é esperado em alguns casos, não logar
    }
    return Promise.reject(error);
  }
);

// Serviços de autenticação
export const authService = {
  login: async (credentials) => {
    const response = await api.post('/api/login', credentials);
    // O token será definido no AuthContext com a preferência rememberMe
    return response.data;
  },
  
  logout: async () => {
    try {
      await api.post('/api/logout');
    } finally {
      // Limpar todo o cache (produtos, acabamentos, etc.) além do token
      // Isso evita que dados de um tenant anterior fiquem no cache em memória
      apiDataManager.clearCache();
      apiDataManager.removeToken();
    }
  },
  
  checkAuth: async () => {
    try {
      const response = await api.get('/api/me');
      return response.data;
    } catch (error) {
      apiDataManager.removeToken();
      throw error;
    }
  },

  changePassword: async (passwordData) => {
    const response = await api.post('/api/change-password', passwordData);
    return response.data;
  },

  toggleTwoFactor: async (enabled) => {
    const response = await api.post('/api/toggle-two-factor', { enabled });
    return response.data;
  },

  getTwoFactorStatus: async () => {
    const response = await api.get('/api/two-factor-status');
    return response.data;
  },

  sendTwoFactorCode: async (email) => {
    const response = await api.post('/api/send-two-factor-code', { email });
    return response.data;
  },

  verifyTwoFactorCode: async (email, code) => {
    const response = await api.post('/api/verify-two-factor-code', { email, code });
    return response.data;
  },

  completeTwoFactorLogin: async (email, code) => {
    const response = await api.post('/api/complete-two-factor-login', { email, code });
    return response.data;
  },
};

// Serviços para clientes
export const clienteService = {
  
  getAll: async () => {
    // Buscar exclusivamente da API com paginação maior para garantir que todos os clientes sejam retornados
    const response = await api.get('/api/clientes', { params: { per_page: 1000 } });
    return {
      data: response.data.data?.data || response.data.data || response.data || [],
      meta: response.data.data?.meta || response.data.meta || {}
    };
  },

  getById: async (id) => {
    // Buscar exclusivamente da API
    const cleanId = id.toString().replace(/^(cli-|local-)/, '');
    const response = await api.get(`/api/clientes/${cleanId}`);
    // A API retorna os dados em response.data.data conforme BaseController
    // Mas neste caso específico, está retornando em response.data
    return response.data;
  },

  create: async (clienteData) => {
    // Verificar se o token está presente
    const token = apiDataManager.getToken();
    if (!token) {
      console.error('Token de autenticação não encontrado. Usuário não está autenticado.');
      throw new Error('Usuário não autenticado. Faça login novamente.');
    }

    try {
      // Remover campos que podem causar problemas na API
      const { id, ...dataToSend } = clienteData;
      
      
      // Enviar dados para a API
      const response = await api.post('/api/clientes', dataToSend);
      
      // A API retorna os dados em response.data.data conforme BaseController
      return response.data.data || response.data;
    } catch (error) {
      // Se for um erro de validação do Laravel (código 422)
      if (error.response?.status === 422) {
        const validationErrors = error.response.data?.errors || {};
        const errorMessage = error.response.data?.message || 'Erro de validação. Verifique os campos do formulário.';
        
        // Criar um erro formatado com as mensagens de validação
        const formattedError = new Error(errorMessage);
        formattedError.validationErrors = validationErrors;
        formattedError.isValidationError = true;
        
        throw formattedError;
      }
      
      // Se for um erro de autenticação (401)
      if (error.response?.status === 401) {
        apiDataManager.removeToken();
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      // Para outros erros, apenas repasse a mensagem
      throw new Error(error.response?.data?.message || error.message || 'Ocorreu um erro ao salvar o cliente.');
    }
  },

  update: async (id, clienteData) => {
    // Atualizar exclusivamente via API
    const cleanId = id.toString().replace(/^(cli-|local-)/, '');
    const response = await api.put(`/api/clientes/${cleanId}`, clienteData);
    // A API retorna os dados em response.data.data conforme BaseController
    return response.data.data || response.data;
  },

  delete: async (id) => {
    // Excluir exclusivamente via API
    const cleanId = id.toString().replace(/^(cli-|local-)/, '');
    const response = await api.delete(`/api/clientes/${cleanId}`);
    // A API retorna os dados em response.data.data conforme BaseController
    return response.data.data || response.data;
  }
};

// Serviços para atendimentos
export const atendimentoService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/atendimentos', { params });
    return {
      data: response.data.data?.data || response.data.data || response.data || [],
      meta: response.data.data?.meta || response.data.meta || {}
    };
  },

  getById: async (id) => {
    const response = await api.get(`/api/atendimentos/${id}`);
    return response.data;
  },

  getByCliente: async (clienteId) => {
    const response = await api.get(`/api/clientes/${clienteId}/atendimentos`);
    return response.data;
  },

  create: async (atendimentoData) => {
    const response = await api.post('/api/atendimentos', atendimentoData);
    return response.data;
  },

  update: async (id, atendimentoData) => {
    const response = await api.put(`/api/atendimentos/${id}`, atendimentoData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/atendimentos/${id}`);
    return response.data;
  }
};

// Serviços para upload de imagens
export const uploadService = {
  uploadImagem: (file) => {
    const formData = new FormData();
    formData.append('imagem', file);
    return api.post('/api/upload/imagem', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  uploadGaleria: (files) => {
    const formData = new FormData();
    
    // Adicionar cada arquivo individualmente com o mesmo nome
    files.forEach(file => {
      formData.append('imagens[]', file);
    });
    
    return api.post('/api/upload/galeria', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  uploadAnexoProducao: (file, osId) => {
    const formData = new FormData();
    formData.append('anexo', file);
    formData.append('os_id', osId);
    
    return api.post('/api/upload/anexo-producao', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  uploadAnexoEntrega: (file, osId) => {
    const formData = new FormData();
    formData.append('anexo', file);
    formData.append('os_id', osId);
    
    return api.post('/api/upload/anexo-entrega', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  uploadQrCode: (file) => {
    const formData = new FormData();
    formData.append('qr_code', file);
    
    return api.post('/api/upload/qr-code', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  uploadFotoFuncionario: (file) => {
    const formData = new FormData();
    formData.append('foto', file);
    
    return api.post('/api/upload/foto-funcionario', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  uploadAnexoMovimentacao: (file, movimentacaoId) => {
    const formData = new FormData();
    formData.append('anexo', file);
    formData.append('movimentacao_id', movimentacaoId);
    
    return api.post('/api/upload/anexo-movimentacao', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Serviços para produtos
export const produtoService = {
  getAll: async (queryParams = '') => {
    // Buscar exclusivamente da API com suporte a parâmetros de consulta
    const url = queryParams ? `/api/produtos${queryParams}` : '/api/produtos';
    const response = await api.get(url);
    return response.data;
  },
  getByTenant: async (tenantId) => {
    const response = await api.get(`/api/public/produtos/tenant/${tenantId}`);
    return {
      data: response.data.data?.data || response.data.data || response.data || [],
      meta: response.data.data?.meta || response.data.meta || {}
    };
  },
  getById: (id) => api.get(`/api/produtos/${id}`),
  create: (data) => api.post('/api/produtos', data),
  update: (id, data) => api.put(`/api/produtos/${id}`, data),
  delete: (id) => api.delete(`/api/produtos/${id}`),
  getEstoqueBaixo: () => api.get('/api/produtos/estoque-baixo'),
  // Método para atualização em massa de preços
  updatePricesInBulk: async (data) => {
    const response = await api.post('/api/produtos/bulk-update-prices', data);
    return response.data;
  },
  // Método para atualizar estoque específico
  atualizarEstoque: async (id, data) => {
    const response = await api.post(`/api/produtos/${id}/atualizar-estoque`, data);
    return response.data;
  },
  // Método para atualizar estoque de variação específica
  atualizarEstoqueVariacao: async (id, data) => {
    const response = await api.post(`/api/produtos/${id}/atualizar-estoque-variacao`, data);
    return response.data;
  },
};

// Serviços para histórico de entradas de estoque
export const historicoEntradaEstoqueService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/historico-entrada-estoque', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/api/historico-entrada-estoque/${id}`);
    return response.data;
  },
  
  create: async (entrada) => {
    const response = await api.post('/api/historico-entrada-estoque', entrada);
    return response.data;
  },
  
  update: async (id, entrada) => {
    const response = await api.put(`/api/historico-entrada-estoque/${id}`, entrada);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/api/historico-entrada-estoque/${id}`);
    return response.data;
  },
  
  getEstatisticas: async (params = {}) => {
    const response = await api.get('/api/historico-entrada-estoque/estatisticas', { params });
    return response.data;
  }
};

// Serviços para categorias
export const categoriaService = {
  getAll: () => api.get('/api/categorias', { params: { per_page: 100 } }),
  getByTenant: (tenantId) => api.get(`/api/public/categorias/tenant/${tenantId}`),
  getById: (id) => api.get(`/api/categorias/${id}`),
  create: (data) => api.post('/api/categorias', data),
  update: (id, data) => api.put(`/api/categorias/${id}`, data),
  delete: (id) => api.delete(`/api/categorias/${id}`),
};

// Serviços para vendas
export const vendaService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/vendas', { params });
    return {
      data: response.data.data?.data || response.data.data || response.data || [],
      meta: response.data.data?.meta || response.data.meta || {}
    };
  },
  getById: (id) => api.get(`/api/vendas/${id}`),
  getByCliente: (clienteId) => api.get('/api/vendas', { params: { cliente_id: clienteId } }),
  getRelatorioFaturamento: (params = {}) => api.get('/api/vendas/relatorio-faturamento', { params }),
  getRelatorioGeralRecebimentos: (params = {}) => api.get('/api/vendas/relatorio-geral-recebimentos', { params }),
  getEstatisticas: (params = {}) => api.get('/api/vendas/estatisticas', { params }),
  create: (data) => api.post('/api/vendas', data),
  update: (id, data) => api.put(`/api/vendas/${id}`, data),
  delete: (id) => api.delete(`/api/vendas/${id}`),
};

// Serviços para orçamentos
export const orcamentoService = {
  getAll: () => api.get('/api/orcamentos'),
  getById: (id) => api.get(`/api/orcamentos/${id}`),
  create: (data) => api.post('/api/orcamentos', data),
  update: (id, data) => api.put(`/api/orcamentos/${id}`, data),
  delete: (id) => api.delete(`/api/orcamentos/${id}`),
  // Método específico para salvar rascunho
  saveRascunho: (data) => api.post('/api/orcamentos/rascunho', data),
  // Método para recuperar rascunho
  getRascunho: () => api.get('/api/orcamentos/rascunho'),
};

// Serviços para configurações
export const configuracaoService = {
  get: () => api.get('/api/configuracoes'),
  update: (data) => api.put('/api/configuracoes', data),
  // Método específico para configurações da empresa
  getEmpresa: () => api.get('/api/configuracoes/grupo/empresa'),
  getEmpresaByTenant: (tenantId) => api.get(`/api/public/configuracoes/empresa/tenant/${tenantId}`),
  getGrupo: (grupo) => api.get(`/api/configuracoes/grupo/${grupo}`),
  updateEmpresa: (data) => api.post('/api/configuracoes/bulk-update', data),
  // Método para upload de logo
  uploadLogo: (formData) => {
    return api.post('/api/configuracoes/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Serviços para empresa
export const empresaService = {
  get: () => api.get('/api/empresa'),
  getByTenant: (tenantId) => api.get(`/api/public/empresa/tenant/${tenantId}`),
  update: (data) => api.put('/api/empresa', data),
  uploadLogo: (formData) => {
    return api.post('/api/empresa/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Serviços para abertura e fechamento de caixa
export const caixaService = {
  // Verificar se há caixa aberto
  getCaixaAtual: async () => {
    try {
      const response = await api.get('/api/caixa/atual');
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // Nenhum caixa aberto
      }
      console.error('Erro ao buscar caixa atual:', error);
      throw error;
    }
  },

  // Abrir caixa
  abrirCaixa: async (data) => {
    try {
      // Enviar apenas os dados necessários para o backend
      const aberturaData = {
        valor_abertura: data.valor_abertura,
        usuario_id: data.usuario_id,
        usuario_nome: data.usuario_nome
      };

      const response = await api.post('/api/caixa/abrir', aberturaData);
      return response.data;
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      throw error;
    }
  },

  // Fechar caixa
  fecharCaixa: async (data) => {
    try {
      // Enviar apenas os dados necessários para o backend
      const fechamentoData = {
        valor_fechamento: data.valor_fechamento,
        valor_apurado: data.valor_apurado,
        diferenca: data.diferenca,
        observacoes: data.observacoes,
        sessao_id: data.sessao_id,
        usuario_id: data.usuario_id,
        usuario_nome: data.usuario_nome
      };

      const response = await api.post('/api/caixa/fechar', fechamentoData);
      return response.data;
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      throw error;
    }
  },

  // Buscar histórico de sessões de caixa
  getHistoricoCaixas: async () => {
    try {
      const response = await api.get('/api/caixa/historico');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar histórico de caixas:', error);
      throw error;
    }
  },

  // Buscar detalhes de uma sessão específica
  getSessaoCaixa: async (sessaoId) => {
    try {
      const response = await api.get(`/api/caixa/sessao/${sessaoId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar sessão de caixa:', error);
      throw error;
    }
  }
};

// Serviços para movimentações de caixa (Sangria/Suprimento)
export const movimentacaoCaixaService = {
  // Buscar movimentações de caixa
  getMovimentacoes: async () => {
    try {
      const response = await api.get('/api/lancamentos-caixa');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar movimentações de caixa:', error);
      throw error;
    }
  },

  // Criar nova movimentação de caixa
  createMovimentacao: async (data) => {
    try {
      // Buscar categorias de sangria e suprimento
      const categoriasResponse = await api.get('/api/categorias-caixa');
      
      // Garantir que categorias seja sempre um array
      let categorias = [];
      if (categoriasResponse.data) {
        if (Array.isArray(categoriasResponse.data)) {
          categorias = categoriasResponse.data;
        } else if (categoriasResponse.data.data && Array.isArray(categoriasResponse.data.data)) {
          categorias = categoriasResponse.data.data;
        } else if (Array.isArray(categoriasResponse.data.data)) {
          categorias = categoriasResponse.data.data;
        }
      }
      
      
      const categoriaSangria = categorias.find(cat => cat.nome === 'Sangria de Caixa');
      const categoriaSuprimento = categorias.find(cat => cat.nome === 'Suprimento de Caixa');
      
      
      // Buscar conta de caixa - usar api.get diretamente para evitar referência circular
      let contas = [];
      try {
        const contasResponse = await api.get('/api/contas-bancarias', { params: { per_page: 100 } });
        console.log('💾 [api.js] Resposta completa de contas bancárias:', contasResponse);
        
        // Tentar diferentes estruturas de resposta (mesma lógica do SangriaSuprimentoPage)
        if (contasResponse && contasResponse.data) {
          // response.data.data.data (estrutura aninhada)
          if (contasResponse.data.data?.data && Array.isArray(contasResponse.data.data.data)) {
            contas = contasResponse.data.data.data;
          }
          // response.data.data (array direto)
          else if (contasResponse.data.data && Array.isArray(contasResponse.data.data)) {
            contas = contasResponse.data.data;
          }
          // response.data (array direto)
          else if (Array.isArray(contasResponse.data)) {
            contas = contasResponse.data;
          }
        }
        
        console.log('💾 [api.js] Contas extraídas:', contas.length, contas);
      } catch (error) {
        console.error('💾 [api.js] Erro ao buscar contas bancárias:', error);
        // Continuar com array vazio, será usado o fallback
      }
      
      const contaCaixa = contas.find(conta => conta.nome === 'Caixa' || conta.tipo === 'caixa');

      // Gerar data/hora local no formato correto
      const now = new Date();
      const data_operacao = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0');

      // Determinar qual conta usar: a selecionada pelo usuário ou a conta de caixa padrão
      let contaId = contaCaixa?.id || 1;
      let contaNome = contaCaixa?.nome || 'Caixa';
      
      console.log('💾 [api.js] Processando conta bancária:', {
        conta_bancaria_id_recebido: data.conta_bancaria_id,
        tipo: typeof data.conta_bancaria_id,
        contaCaixaId: contaCaixa?.id,
        totalContas: contas.length
      });
      
      // Se uma conta bancária específica foi selecionada, usar ela
      if (data.conta_bancaria_id) {
        // Converter para número se necessário
        const contaIdBuscado = typeof data.conta_bancaria_id === 'string' 
          ? parseInt(data.conta_bancaria_id) 
          : data.conta_bancaria_id;
        
        const contaSelecionada = contas.find(c => {
          const cId = typeof c.id === 'string' ? parseInt(c.id) : c.id;
          return cId === contaIdBuscado;
        });
        
        console.log('💾 [api.js] Buscando conta:', {
          contaIdBuscado,
          contaSelecionada: contaSelecionada ? {
            id: contaSelecionada.id,
            nome: contaSelecionada.nome,
            nome_banco: contaSelecionada.nome_banco
          } : null
        });
        
        if (contaSelecionada) {
          contaId = contaSelecionada.id;
          contaNome = contaSelecionada.nome_banco || contaSelecionada.nome;
          console.log('💾 [api.js] Usando conta selecionada:', { contaId, contaNome });
        } else {
          console.warn('💾 [api.js] Conta não encontrada, usando caixa padrão:', { contaIdBuscado });
        }
      } else {
        console.log('💾 [api.js] Nenhuma conta selecionada, usando caixa padrão');
      }

      const movimentacaoData = {
        tipo: data.tipo === 'sangria' ? 'saida' : 'entrada',
        valor: data.valor,
        descricao: `(${data.tipo.charAt(0).toUpperCase() + data.tipo.slice(1)}) - ${data.motivo}`,
        observacoes: data.motivo,
        data_operacao, // data e hora local
        forma_pagamento: 'dinheiro',
        status: 'concluido', // Status concluído para sangria/suprimento
        categoria_id: data.tipo === 'sangria' ? (categoriaSangria?.id || 1) : (categoriaSuprimento?.id || 2),
        categoria_nome: data.tipo === 'sangria' ? 'Sangria de Caixa' : 'Suprimento de Caixa',
        conta_id: contaId, // Usar conta selecionada ou caixa padrão
        conta_nome: contaNome,
        usuario_id: data.usuario_id, // Usar o ID do usuário passado pelo frontend
        usuario_nome: data.usuario_nome || 'Usuário', // Nome do usuário
        operacao_tipo: 'movimentacao_caixa',
        anexos: data.anexos || null, // Incluir anexos se fornecidos
        metadados: {
          tipo_movimentacao: data.tipo,
          motivo: data.motivo,
          conta_bancaria_id: data.conta_bancaria_id || null
        }
      };

      const response = await api.post('/api/lancamentos-caixa', movimentacaoData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar movimentação de caixa:', error);
      throw error;
    }
  }
};

// Serviços para categorias de caixa
export const categoriaCaixaService = {
  getAll: () => api.get('/api/categorias-caixa', { params: { per_page: 100 } }),
  getById: (id) => api.get(`/api/categorias-caixa/${id}`),
  create: (data) => api.post('/api/categorias-caixa', data),
  update: (id, data) => api.put(`/api/categorias-caixa/${id}`, data),
  delete: (id) => api.delete(`/api/categorias-caixa/${id}`),
  arvore: (params = {}) => api.get('/api/categorias-caixa/arvore', { params }),
  estatisticas: (id, params = {}) => api.get(`/api/categorias-caixa/${id}/estatisticas`, { params }),
  maisUtilizadas: (params = {}) => api.get('/api/categorias-caixa/mais-utilizadas', { params }),
};

// Serviços para lançamentos de caixa
export const lancamentoCaixaService = {
  getAll: (params = {}) => api.get('/api/lancamentos-caixa', { params }),
  getById: (id) => api.get(`/api/lancamentos-caixa/${id}`),
  create: (data) => api.post('/api/lancamentos-caixa', data),
  update: (id, data) => api.put(`/api/lancamentos-caixa/${id}`, data),
  delete: (id) => api.delete(`/api/lancamentos-caixa/${id}`),
  getByDate: (data) => api.get('/api/lancamentos-caixa/por-data', { 
    params: { 
      data_inicio: data,
      data_fim: data,
      per_page: 1000
    } 
  }),
  resumo: (dataInicio, dataFim, contaId = null) => api.get('/api/lancamentos-caixa/resumo', {
    params: {
      data_inicio: dataInicio,
      data_fim: dataFim,
      conta_id: contaId
    }
  }),
  estatisticas: (params = {}) => api.get('/api/lancamentos-caixa/estatisticas', { params }),
};

// Serviços para contas bancárias
export const contaBancariaService = {
  getAll: () => api.get('/api/contas-bancarias', { params: { per_page: 100 } }),
  getById: (id) => api.get(`/api/contas-bancarias/${id}`),
  create: (data) => api.post('/api/contas-bancarias', data),
  update: (id, data) => api.put(`/api/contas-bancarias/${id}`, data),
  delete: (id) => api.delete(`/api/contas-bancarias/${id}`),
  getAtivas: () => api.get('/api/contas-bancarias', { params: { ativo: true } }),
};

// Serviços para cores de produtos
export const corService = {
  getAll: () => api.get('/api/cores', { params: { per_page: 100 } }),
  getById: (id) => api.get(`/api/cores/${id}`),
  create: (data) => api.post('/api/cores', data),
  update: (id, data) => api.put(`/api/cores/${id}`, data),
  delete: (id) => api.delete(`/api/cores/${id}`),
};

// Serviços para tamanhos de produtos
export const tamanhoService = {
  getAll: () => api.get('/api/tamanhos', { params: { per_page: 100 } }),
  getById: (id) => api.get(`/api/tamanhos/${id}`),
  create: (data) => api.post('/api/tamanhos', data),
  update: (id, data) => api.put(`/api/tamanhos/${id}`, data),
  delete: (id) => api.delete(`/api/tamanhos/${id}`),
};

// Serviços para categorias de produto
export const productCategoryService = {
  getAll: async () => {
    try {
      const response = await api.get('/api/categorias');
      return response.data; // Return response.data instead of the entire response
    } catch (error) {
      throw error;
    }
  },
  getByTenant: async (tenantId) => {
    try {
      const response = await api.get(`/api/public/product-categories/tenant/${tenantId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  getById: (id) => api.get(`/api/categorias/${id}`),
  create: (data) => api.post('/api/categorias', data),
  update: (id, data) => api.put(`/api/categorias/${id}`, data),
  delete: (id) => api.delete(`/api/categorias/${id}`),
};

// Serviços para subcategorias
export const subcategoriaService = {
  getAll: () => api.get('/api/subcategorias', { params: { per_page: 100 } }),
  getById: (id) => api.get(`/api/subcategorias/${id}`),
  create: (data) => api.post('/api/subcategorias', data),
  update: (id, data) => api.put(`/api/subcategorias/${id}`, data),
  delete: (id) => api.delete(`/api/subcategorias/${id}`),
  porCategoria: (categoriaId) => {
    return api.get(`/api/subcategorias/por-categoria/${categoriaId}`)
      .then(response => {
        return response;
      });
  },
};

// Serviços para dados do usuário (substitui localStorage)
export const dadosUsuarioService = {
  getAll: async () => {
    try {
      const response = await api.get('/api/dados-usuario');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      return {};
    }
  },

  get: async (chave) => {
    try {
      const response = await api.get(`/api/dados-usuario/${chave}`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw error;
    }
  },

  set: async (chave, valor) => {
    try {
      const response = await api.post('/api/dados-usuario', { chave, valor });
      return response.data;
    } catch (error) {
      console.error(`Erro ao salvar dado ${chave}:`, error);
      throw error;
    }
  },

  update: async (chave, valor) => {
    try {
      const response = await api.put(`/api/dados-usuario/${chave}`, { valor });
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar ${chave}:`, error);
      throw error;
    }
  },

  delete: async (chave) => {
    try {
      const response = await api.delete(`/api/dados-usuario/${chave}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao remover dado ${chave}:`, error);
      throw error;
    }
  },

  bulkUpdate: async (dados) => {
    try {
      const dadosFormatados = Object.entries(dados).map(([chave, valor]) => ({
        chave,
        valor
      }));
      
      const response = await api.post('/api/dados-usuario/bulk-update', { dados: dadosFormatados });
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar dados em lote:', error);
      throw error;
    }
  },

  getFornecedores: async () => {
    try {
      const response = await api.get('/api/dados-usuario/fornecedores');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Serviços para calculadora
export const calculadoraService = {
  getCalculosSalvos: () => api.get('/api/calculadora/calculos-salvos'),
  salvarCalculo: (data) => api.post('/api/calculadora/calculos-salvos', data),
  deleteCalculo: (id) => api.delete(`/api/calculadora/calculos-salvos/${id}`),
  getServicosAdicionais: () => api.get('/api/calculadora/servicos-adicionais'),
  criarServicoAdicional: (data) => api.post('/api/calculadora/servicos-adicionais', data),
};

// Serviços para contas a receber
export const contaReceberService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/contas-receber', { params });
    return {
      data: response.data.data?.data || response.data.data || response.data || [],
      meta: response.data.data?.meta || response.data.meta || {}
    };
  },
  getById: (id) => api.get(`/api/contas-receber/${id}`),
  create: (data) => api.post('/api/contas-receber', data),
  update: (id, data) => api.put(`/api/contas-receber/${id}`, data),
  delete: (id) => api.delete(`/api/contas-receber/${id}`),
  receber: (id, data) => api.post(`/api/contas-receber/${id}/receber`, data),
  aplicarJuros: (id, data) => api.post(`/api/contas-receber/${id}/aplicar-juros`, data),
  configurarJuros: (id, data) => api.post(`/api/contas-receber/${id}/configurar-juros`, data),
  aplicarJurosProgramados: (id, data) => api.post(`/api/contas-receber/${id}/aplicar-juros-programados`, data),
  registrarPagamentoComParcelamento: (id, data) => api.post(`/api/contas-receber/${id}/registrar-pagamento-parcelamento`, data),
  listarParcelas: (id) => api.get(`/api/contas-receber/${id}/parcelas`),
  contasParaAplicarJuros: () => api.get('/api/contas-receber/contas-para-aplicar-juros'),
  aplicarJurosEmLote: () => api.post('/api/contas-receber/aplicar-juros-em-lote'),
  contasComJurosConfigurados: () => api.get('/api/contas-receber/contas-com-juros-configurados'),
  contasParceladas: () => api.get('/api/contas-receber/contas-parceladas'),
  recebimentosClientes: (params = {}) => api.get('/api/contas-receber/recebimentos-clientes', { params }),
};

// Serviços para contas a pagar
export const contaPagarService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/contas-pagar', { params });
    return {
      data: response.data.data?.data || response.data.data || response.data || [],
      meta: response.data.data?.meta || response.data.meta || {}
    };
  },
  getById: (id) => api.get(`/api/contas-pagar/${id}`),
  create: (data) => api.post('/api/contas-pagar', data),
  update: (id, data) => api.put(`/api/contas-pagar/${id}`, data),
  delete: (id) => api.delete(`/api/contas-pagar/${id}`),
  pagar: (id, data) => api.post(`/api/contas-pagar/${id}/pagar`, data),
  marcarComoPaga: (id) => api.post(`/api/contas-pagar/${id}/marcar-como-paga`),
  aplicarJuros: (id, data) => api.post(`/api/contas-pagar/${id}/aplicar-juros`, data),
  configurarJuros: (id, data) => api.post(`/api/contas-pagar/${id}/configurar-juros`, data),
  aplicarJurosProgramados: (id, data) => api.post(`/api/contas-pagar/${id}/aplicar-juros-programados`, data),
  registrarPagamentoComParcelamento: (id, data) => api.post(`/api/contas-pagar/${id}/registrar-pagamento-parcelamento`, data),
  listarParcelas: (id) => api.get(`/api/contas-pagar/${id}/parcelas`),
  contasParaAplicarJuros: () => api.get('/api/contas-pagar/contas-para-aplicar-juros'),
  aplicarJurosEmLote: () => api.post('/api/contas-pagar/aplicar-juros-em-lote'),
  contasComJurosConfigurados: () => api.get('/api/contas-pagar/contas-com-juros-configurados'),
  contasParceladas: () => api.get('/api/contas-pagar/contas-parceladas'),
  pagamentosFornecedores: (params = {}) => api.get('/api/contas-pagar/pagamentos-fornecedores', { params }),
};

// Serviços para acabamentos
export const acabamentoService = {
  getAll: async () => {
    // Buscar exclusivamente da API
    const response = await api.get('/api/acabamentos');
    return {
      data: response.data.data?.data || response.data.data || response.data || [],
      meta: response.data.data?.meta || response.data.meta || {}
    };
  },
  getById: (id) => api.get(`/api/acabamentos/${id}`),
  create: (data) => api.post('/api/acabamentos', data),
  update: (id, data) => api.put(`/api/acabamentos/${id}`, data),
  delete: (id) => api.delete(`/api/acabamentos/${id}`),
};

// Serviços para máquinas
export const maquinaService = {
  getAll: async () => {
    // Buscar exclusivamente da API
    const response = await api.get('/api/maquinas');
    
    const result = {
      data: response.data.data?.data || response.data.data || response.data || [],
      meta: response.data.data?.meta || response.data.meta || {}
    };
    
    return result;
  },
  getById: (id) => api.get(`/api/maquinas/${id}`),
  create: (data) => api.post('/api/maquinas', data),
  update: (id, data) => api.put(`/api/maquinas/${id}`, data),
  delete: (id) => api.delete(`/api/maquinas/${id}`),
};

// Serviços para ordens de serviço (OS)
export const osService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/ordens-servico', { params });
    // Laravel retorna a paginação diretamente, não aninhada
    return {
      data: response.data.data || [],
      meta: {
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        per_page: response.data.per_page,
        total: response.data.total,
        from: response.data.from,
        to: response.data.to
      }
    };
  },
  
  getByCliente: async (clienteId) => {
    const response = await api.get('/api/ordens-servico', { params: { cliente_id: clienteId } });
    return {
      data: response.data.data?.data || response.data.data || response.data || [],
      meta: response.data.data?.meta || response.data.meta || {}
    };
  },
  
  getById: async (id) => {
    const response = await api.get(`/api/ordens-servico/${id}`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/api/ordens-servico', data);
    return response.data;
  },
  
  getProximoNumero: async () => {
    const response = await api.get('/api/ordens-servico/proximo-numero');
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/api/ordens-servico/${id}`, data);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/api/ordens-servico/${id}`);
    return response.data;
  },
  
  // Métodos específicos para gerenciar o status de produção
  getEmProducao: async (params = {}) => {
    const response = await api.get('/api/ordens-servico/em-producao', { params });
    return {
      data: response.data.data?.data || response.data.data || response.data || [],
      meta: response.data.data?.meta || response.data.meta || {}
    };
  },
  
  getASeremEntregues: async (params = {}) => {
    const response = await api.get('/api/ordens-servico/a-serem-entregues', { params });
    return {
      data: response.data.data?.data || response.data.data || response.data || [],
      meta: response.data.data?.meta || response.data.meta || {}
    };
  },
  
  getEntregues: async (params = {}) => {
    // Aumentar o per_page para carregar mais dados por vez
    const paramsWithPagination = { per_page: 1000, ...params };
    const response = await api.get('/api/ordens-servico/entregues', { params: paramsWithPagination });
    return {
      data: response.data.data?.data || response.data.data || response.data || [],
      meta: response.data.data?.meta || response.data.meta || {}
    };
  },
  
  updateStatusProducao: async (id, data) => {
    try {
      console.log('Enviando dados para updateStatusProducao:', { id, data });
      const response = await api.put(`/api/ordens-servico/${id}/status-producao`, data);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar status de produção:', error.response?.data || error);
      console.error('Dados enviados que causaram erro:', { id, data });
      throw error;
    }
  },
  
  uploadAnexos: async (id, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('anexos[]', file);
    });
    
    return api.post(`/api/ordens-servico/${id}/anexos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  getAnexos: async (id) => {
    const response = await api.get(`/api/ordens-servico/${id}/anexos`);
    return response.data;
  },
};

// Serviços para partes do catálogo
export const catalogoParteService = {
  getAll: () => api.get('/api/catalogo-partes'),
  getById: (id) => api.get(`/api/catalogo-partes/${id}`),
  create: (data) => api.post('/api/catalogo-partes', data),
  update: (id, data) => api.put(`/api/catalogo-partes/${id}`, data),
  delete: (id) => api.delete(`/api/catalogo-partes/${id}`),
  uploadImagem: (formData) => api.post('/api/catalogo-partes/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

// Serviços para aparência e tema
export const aparenciaService = {
  // Obter o tema atual do usuário
  getTheme: async () => {
    try {
      const response = await api.get('/api/aparencia/theme');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter tema:', error);
      throw error;
    }
  },

  // Atualizar o tema do usuário
  updateTheme: async (theme) => {
    try {
      const response = await api.put('/api/aparencia/theme', { theme });
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar tema:', error);
      throw error;
    }
  },

  // Obter lista de temas disponíveis
  getAvailableThemes: async () => {
    try {
      const response = await api.get('/api/aparencia/themes');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter temas disponíveis:', error);
      throw error;
    }
  },

  // Obter cores do dashboard
  getDashboardColors: async () => {
    try {
      const response = await api.get('/api/aparencia/dashboard-colors');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter cores do dashboard:', error);
      throw error;
    }
  },

  // Atualizar cores do dashboard
  updateDashboardColors: async (colors) => {
    try {
      const response = await api.put('/api/aparencia/dashboard-colors', { colors });
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar cores do dashboard:', error);
      throw error;
    }
  },

  // Resetar cores do dashboard
  resetDashboardColors: async () => {
    try {
      const response = await api.post('/api/aparencia/dashboard-colors/reset');
      return response.data;
    } catch (error) {
      console.error('Erro ao resetar cores do dashboard:', error);
      throw error;
    }
  },

  // Obter cores disponíveis
  getAvailableColors: async () => {
    try {
      const response = await api.get('/api/aparencia/available-colors');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter cores disponíveis:', error);
      throw error;
    }
  },

  // Obter cores das Ações Rápidas
  getQuickActionsColors: async () => {
    try {
      const response = await api.get('/api/aparencia/quick-actions-colors');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter cores das ações rápidas:', error);
      throw error;
    }
  },

  // Atualizar cores das Ações Rápidas
  updateQuickActionsColors: async (colors) => {
    try {
      const response = await api.put('/api/aparencia/quick-actions-colors', { colors });
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar cores das ações rápidas:', error);
      throw error;
    }
  },

  // Resetar cores das Ações Rápidas para o padrão
  resetQuickActionsColors: async () => {
    try {
      const response = await api.post('/api/aparencia/quick-actions-colors/reset');
      return response.data;
    } catch (error) {
      console.error('Erro ao resetar cores das ações rápidas:', error);
      throw error;
    }
  }
};

// Serviços para lixeira (registros excluídos)
export const lixeiraService = {
  // Obter todos os registros excluídos
  getAll: async () => {
    try {
      const response = await api.get('/api/lixeira');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar registros excluídos:', error);
      throw error;
    }
  },

  // Restaurar um registro excluído
  restore: async (id, tabela) => {
    try {
      const response = await api.post('/api/lixeira/restore', { id, tabela });
      return response.data;
    } catch (error) {
      console.error('Erro ao restaurar registro:', error);
      throw error;
    }
  },

  // Excluir permanentemente um registro
  destroy: async (id, tabela) => {
    try {
      const response = await api.delete('/api/lixeira/destroy', { 
        data: { id, tabela } 
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao excluir registro permanentemente:', error);
      throw error;
    }
  },

  // Obter detalhes de um registro específico
  getDetails: async (id, tabela) => {
    try {
      const response = await api.get(`/api/lixeira/${id}/${tabela}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar detalhes do registro:', error);
      throw error;
    }
  }
};

// Exporta a instância do axios para uso em casos específicos
export default api;

// Serviço para Cálculos Salvos (nova tabela específica)
export const calculoSavadoService = {
    // Listar todos os cálculos salvos
    getAll: () => api.get('/api/calculos-salvos'),
    
    // Buscar um cálculo específico
    getById: (id) => api.get(`/api/calculos-salvos/${id}`),
    
    // Criar novo cálculo
    create: (data) => api.post('/api/calculos-salvos', data),
    
    // Atualizar cálculo
    update: (id, data) => api.put(`/api/calculos-salvos/${id}`, data),
    
    // Excluir cálculo
    delete: (id) => api.delete(`/api/calculos-salvos/${id}`),
    
    // Buscar cálculos por cliente
    getByCliente: (clienteId) => api.get('/api/calculos-salvos/por-cliente', { params: { cliente_id: clienteId } })
};

// Serviços para funcionários
export const funcionarioService = {
  getAll: () => api.get('/api/funcionarios', { params: { per_page: 100 } }),
  getById: (id) => api.get(`/api/funcionarios/${id}`),
  create: (data) => api.post('/api/funcionarios', data),
  update: (id, data) => api.put(`/api/funcionarios/${id}`, data),
  delete: (id) => api.delete(`/api/funcionarios/${id}`),
  
  // Métodos para vales
  addVale: async (funcionarioId, valeData) => {
    try {
      const response = await api.post(`/api/funcionarios/${funcionarioId}/vales`, valeData);
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar vale:', error);
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
  
  // Métodos para faltas
  addFalta: async (funcionarioId, faltaData) => {
    try {
      const response = await api.post(`/api/funcionarios/${funcionarioId}/faltas`, faltaData);
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar falta:', error);
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
};

// Serviços para envelopamentos
export const envelopamentoService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/envelopamentos', { params });
    return {
      data: response.data.data?.data || response.data.data || response.data || [],
      meta: response.data.data?.meta || response.data.meta || {}
    };
  },
  getById: (id) => api.get(`/api/envelopamentos/${id}`),
  getByCliente: (clienteId) => api.get('/api/envelopamentos', { params: { cliente_id: clienteId } }),
  create: (data) => api.post('/api/envelopamentos', data),
  update: (id, data) => api.put(`/api/envelopamentos/${id}`, data),
  delete: (id) => api.delete(`/api/envelopamentos/${id}`),
  buscarPorCodigo: (codigo) => api.get('/api/envelopamentos/buscar/codigo', { params: { codigo } }),
  getEstatisticas: (params = {}) => api.get('/api/envelopamentos/estatisticas', { params }),
  finalizar: (id, data = {}) => api.post(`/api/envelopamentos/${id}/finalizar`, data),
  moverParaLixeira: (id, justificativa) => api.post(`/api/envelopamentos/${id}/lixeira`, { justificativa }),
};

// Serviços para comissões de OS
export const comissaoOSService = {
  // Buscar comissões de um funcionário específico
  getComissoesFuncionario: async (userId) => {
    try {
      const response = await api.get(`/api/comissoes-os/funcionario/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar comissões do funcionário:', error);
      throw error;
    }
  },

  // Marcar comissão como paga
  marcarComoPaga: async (comissaoId) => {
    try {
      const response = await api.put(`/api/comissoes-os/${comissaoId}/marcar-paga`);
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar comissão como paga:', error);
      throw error;
    }
  },

  // Processar comissões pendentes
  processarPendentes: async () => {
    try {
      const response = await api.post('/api/comissoes-os/processar-pendentes');
      return response.data;
    } catch (error) {
      console.error('Erro ao processar comissões pendentes:', error);
      throw error;
    }
  },

  // Buscar todas as comissões
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/api/comissoes-os', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar comissões:', error);
      throw error;
    }
  },

  // Buscar comissão por ID
  getById: async (id) => {
    try {
      const response = await api.get(`/api/comissoes-os/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar comissão:', error);
      throw error;
    }
  },

  // Buscar comissões de um usuário por período
  getComissoesUsuario: async (userId, dataInicio = null, dataFim = null) => {
    try {
      const params = {};
      if (dataInicio) params.data_inicio = dataInicio;
      if (dataFim) params.data_fim = dataFim;
      
      const response = await api.get(`/api/comissoes-os/funcionario/${userId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar comissões do usuário:', error);
      throw error;
    }
  },

  // Buscar relatório de comissões
  getRelatorio: async (params = {}) => {
    try {
      const response = await api.get('/api/comissoes-os/relatorio', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar relatório de comissões:', error);
      throw error;
    }
  },

  // Marcar todas as comissões pendentes de um funcionário como pagas
  marcarTodasComoPagas: async (userId) => {
    try {
      const response = await api.put(`/api/comissoes-os/funcionario/${userId}/marcar-todas-pagas`);
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar todas as comissões como pagas:', error);
      throw error;
    }
  }
};



// Serviços para vendas de pré-venda (salvas na tabela vendas)
export const vendaPreVendaService = {
  create: async (pedidoData) => {
    try {
      const response = await api.post('/api/vendas-pre-venda', pedidoData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar venda de pré-venda:', error);
      throw error;
    }
  },

  createForTenant: async (pedidoData, tenantId) => {
    try {
      const response = await api.post(`/api/public/vendas-pre-venda/tenant/${tenantId}`, pedidoData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar venda de pré-venda para tenant:', error);
      throw error;
    }
  },

  getAll: async (params = {}) => {
    try {
      const response = await api.get('/api/vendas-pre-venda', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar vendas de pré-venda:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/api/vendas-pre-venda/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar venda de pré-venda:', error);
      throw error;
    }
  },

  update: async (id, pedidoData) => {
    try {
      const response = await api.put(`/api/vendas-pre-venda/${id}`, pedidoData);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar venda de pré-venda:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/api/vendas-pre-venda/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao deletar venda de pré-venda:', error);
      throw error;
    }
  },

  // Método para enviar pedido via WhatsApp ou email
  enviarPedido: async (pedidoId, metodo = 'whatsapp') => {
    try {
      const response = await api.post(`/api/vendas-pre-venda/${pedidoId}/enviar`, {
        metodo: metodo
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      throw error;
    }
  }
};

// Serviço de Notas Fiscais (NFe / NFSe)
export const notaFiscalService = {
  // Emitir nota fiscal
  emitir: async (data) => {
    try {
      const response = await api.post('/api/notas-fiscais/emitir', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao emitir nota fiscal:', error);
      throw error;
    }
  },

  // Consultar status de uma nota fiscal
  consultar: async (id) => {
    try {
      const response = await api.get(`/api/notas-fiscais/${id}/consultar`);
      return response.data;
    } catch (error) {
      console.error('Erro ao consultar nota fiscal:', error);
      throw error;
    }
  },

  // Cancelar nota fiscal
  cancelar: async (id, justificativa) => {
    try {
      const response = await api.delete(`/api/notas-fiscais/${id}/cancelar`, {
        data: { justificativa }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao cancelar nota fiscal:', error);
      throw error;
    }
  },

  // Listar notas fiscais
  listar: async (params = {}) => {
    try {
      const response = await api.get('/api/notas-fiscais', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao listar notas fiscais:', error);
      throw error;
    }
  },

  // Buscar notas fiscais de uma OS
  porOrdemServico: async (osId) => {
    try {
      const response = await api.get(`/api/notas-fiscais/por-os/${osId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar notas da OS:', error);
      throw error;
    }
  },

  // Testar conexão com a API de emissão
  testarConexao: async () => {
    try {
      const response = await api.post('/api/notas-fiscais/testar-conexao');
      return response.data;
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      throw error;
    }
  },

  // Carregar configurações de Nota Fiscal
  carregarConfiguracoes: async () => {
    try {
      const response = await api.get('/api/notas-fiscais/configuracoes');
      return response.data;
    } catch (error) {
      console.error('Erro ao carregar configurações NFe:', error);
      throw error;
    }
  },

  // Salvar configurações de Nota Fiscal (upsert)
  salvarConfiguracoes: async (data) => {
    try {
      const response = await api.post('/api/notas-fiscais/configuracoes', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao salvar configurações NFe:', error);
      throw error;
    }
  },
};

// Serviços para Alertas e Notificações
export const alertasService = {
  // Listar alertas/notificações
  getAll: (params = {}) => api.get('/api/alertas', { params }),
  
  // Executar todas as verificações de alertas
  executarVerificacoes: () => api.post('/api/alertas/executar-verificacoes'),
  
  // Contar notificações não lidas
  contarNaoLidas: () => api.get('/api/alertas/contar-nao-lidas'),
  
  // Marcar todas como lidas
  marcarTodasComoLidas: () => api.post('/api/alertas/marcar-todas-lidas'),
  
  // Marcar uma notificação como lida
  marcarComoLida: (id) => api.post(`/api/alertas/${id}/marcar-lida`),
};

// Serviços para Ranking de Vendedores
export const rankingVendedoresService = {
  // Ranking por valor vendido
  getRanking: (params = {}) => api.get('/api/ranking-vendedores', { params }),
  
  // Ranking por quantidade de vendas
  getRankingPorQuantidade: (params = {}) => api.get('/api/ranking-vendedores/por-quantidade', { params }),
};

// Serviços para Gamificação
export const gamificacaoService = {
  // Ranking de pontos
  getRanking: (params = {}) => api.get('/api/gamificacao/ranking', { params }),
  
  // Pontos do vendedor logado
  getMeusPontos: () => api.get('/api/gamificacao/meus-pontos'),
  
  // Histórico de pontos
  getHistorico: (params = {}) => api.get('/api/gamificacao/historico', { params }),
  
  // Premiações do vendedor
  getPremiacoes: (params = {}) => api.get('/api/gamificacao/premiacoes', { params }),
  
  // Entregar premiação
  entregarPremiacao: (id) => api.post(`/api/gamificacao/premiacoes/${id}/entregar`),
};

// Serviços para Metas de Vendas
export const metaVendaService = {
  getAll: (params = {}) => api.get('/api/metas-vendas', { params }),
  getById: (id) => api.get(`/api/metas-vendas/${id}`),
  create: (data) => api.post('/api/metas-vendas', data),
  update: (id, data) => api.put(`/api/metas-vendas/${id}`, data),
  delete: (id) => api.delete(`/api/metas-vendas/${id}`),
  getMetaPeriodo: (params = {}) => api.get('/api/metas-vendas/periodo/meta', { params }),
  getProgresso: (id) => api.get(`/api/metas-vendas/${id}/progresso`),
};

// Serviços para Aproveitamento de Folha
export const aproveitamentoFolhaService = {
  calcular: (data) => api.post('/api/aproveitamento-folha/calcular', data),
  listarImpressoras: () => api.get('/api/aproveitamento-folha/impressoras'),
  salvarImpressora: (data) => api.post('/api/aproveitamento-folha/impressoras', data),
  excluirImpressora: (id) => api.delete(`/api/aproveitamento-folha/impressoras/${id}`),
};

// Serviços para Treinamento Interno
export const treinamentoService = {
  getAll: (params = {}) => api.get('/api/treinamento', { params }),
  getById: (id) => api.get(`/api/treinamento/${id}`),
  create: (data) => api.post('/api/treinamento', data),
  update: (id, data) => api.put(`/api/treinamento/${id}`, data),
  delete: (id) => api.delete(`/api/treinamento/${id}`),
  getEstatisticas: () => api.get('/api/treinamento/estatisticas'),
  getMeuProgresso: () => api.get('/api/treinamento/meu-progresso'),
  marcarComoConcluido: (treinamentoId, data = {}) => api.post(`/api/treinamento/marcar-concluido/${treinamentoId}`, data),
  getProgressoColaborador: (usuarioId) => api.get(`/api/treinamento/progresso-colaborador/${usuarioId}`),
  atualizarColaborador: (usuarioId, data) => api.put(`/api/treinamento/atualizar-colaborador/${usuarioId}`, data),
  getRelatorioPorSetor: (params = {}) => api.get('/api/treinamento/relatorio-por-setor', { params }),
  getAvisos: (params = {}) => api.get('/api/treinamento/avisos', { params }),
  marcarAvisoResolvido: (id) => api.post(`/api/treinamento/avisos/${id}/marcar-resolvido`),
  executarVerificacoesAvisos: () => api.post('/api/treinamento/avisos/executar-verificacoes'),
  getRegrasAlerta: () => api.get('/api/treinamento/avisos/regras'),
  salvarRegraAlerta: (data) => api.post('/api/treinamento/avisos/regras', data),
};

// Serviços para Clientes Diminuindo Compras
export const clienteTendenciaService = {
  getClientesComQueda: (params = {}) => api.get('/api/clientes-tendencia', { params }),
  gerarAlertas: (params = {}) => api.post('/api/clientes-tendencia/gerar-alertas', params),
};