import { dadosUsuarioService } from '../services/api.js';

// Variável global para manter o estado durante HMR
if (!window.__apiDataManagerInstance) {
  window.__apiDataManagerInstance = null;
}

/**
 * Gerenciador de dados que substitui o localStorage por chamadas da API
 * Compatível com a interface do localStorage para facilitar a migração
 */
class ApiDataManager {
  constructor() {
    this.instanceId = Math.random().toString(36).substr(2, 9);
    this.cache = new Map();
    this.loadPromises = new Map();
    // Cache especial para o token - nunca vai para a API
    this.tokenCache = null;
    // Flag para controlar se deve persistir o token
    this.shouldPersistToken = false;
    
    // Tentar restaurar estado da instância anterior (HMR)
    if (window.__apiDataManagerInstance) {
      this.tokenCache = window.__apiDataManagerInstance.tokenCache;
      this.shouldPersistToken = window.__apiDataManagerInstance.shouldPersistToken;
      this.cache = new Map(window.__apiDataManagerInstance.cache);
    } else {
      this.loadPersistedToken();
    }
    
    // Salvar referência para próxima instância
    window.__apiDataManagerInstance = this;
  }

  /**
   * Carrega token persistido do localStorage se existir
   */
  loadPersistedToken() {
    try {
      const token = localStorage.getItem('auth_token');
      const rememberMe = localStorage.getItem('remember_me');
      
      if (token) {
        this.tokenCache = token;
        this.shouldPersistToken = rememberMe === 'true';
        
        // Não remover tokens temporários - eles devem persistir durante a sessão do navegador
        // Apenas tokens com remember_me=true persistem entre sessões do navegador
      }
    } catch (error) {
      console.error('Erro ao carregar token persistido:', error);
    }
  }

  /**
   * Métodos especiais para o token que evitam loop infinito
   * O token nunca é buscado via API pois é necessário para as requisições
   */
  getToken() {
    // Se não há token em cache, tentar carregar do localStorage
    if (!this.tokenCache) {
      const token = localStorage.getItem('auth_token');
      const rememberMe = localStorage.getItem('remember_me') === 'true';
      
      if (token) {
        this.tokenCache = token;
        this.shouldPersistToken = rememberMe;
      }
    }
    
    return this.tokenCache;
  }

  setToken(token, rememberMe = false) {
    this.tokenCache = token;
    this.shouldPersistToken = rememberMe;
    
    // Atualizar referência global
    if (window.__apiDataManagerInstance) {
      window.__apiDataManagerInstance.tokenCache = token;
      window.__apiDataManagerInstance.shouldPersistToken = rememberMe;
    }
    
    if (token) {
      if (rememberMe) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('remember_me', 'true');
      } else {
        // Para sessões temporárias, ainda salvar no localStorage mas marcar como temporário
        localStorage.setItem('auth_token', token);
        localStorage.setItem('remember_me', 'false');
      }
    } else {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('remember_me');
    }
  }

  removeToken() {
    this.tokenCache = null;
    this.shouldPersistToken = false;
    
    // Atualizar referência global
    if (window.__apiDataManagerInstance) {
      window.__apiDataManagerInstance.tokenCache = null;
      window.__apiDataManagerInstance.shouldPersistToken = false;
    }
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('remember_me');
  }

  /**
   * Carrega e inicializa dados da API ou usa valor padrão
   */
  async loadAndInitialize(key, defaultValue, itemDefaultValue = null) {
    // Evita múltiplas chamadas simultâneas para a mesma chave
    if (this.loadPromises.has(key)) {
      return this.loadPromises.get(key);
    }

    const loadPromise = this._doLoadAndInitialize(key, defaultValue, itemDefaultValue);
    this.loadPromises.set(key, loadPromise);

    try {
      const result = await loadPromise;
      this.cache.set(key, result);
      return result;
    } finally {
      this.loadPromises.delete(key);
    }
  }

  async _doLoadAndInitialize(key, defaultValue, itemDefaultValue = null) {
    try {
      let data = await dadosUsuarioService.get(key);
      
      if (data === null || data === undefined) {
        data = defaultValue;
        await this.setItem(key, data);
      } else {
        // Aplicar merge de defaults se necessário
        if (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue) &&
            typeof data === 'object' && data !== null && !Array.isArray(data)) {
          data = { ...defaultValue, ...data };
        } else if (Array.isArray(defaultValue) && Array.isArray(data)) {
          if (itemDefaultValue && typeof itemDefaultValue === 'object' && itemDefaultValue !== null) {
            data = data.map(item => 
              typeof item === 'object' && item !== null 
              ? { ...itemDefaultValue, ...item } 
              : item
            );
          }
        }
      }

      return data;
    } catch (error) {
      console.error(`Erro ao carregar dados para ${key}:`, error);
      await this.setItem(key, defaultValue);
      return defaultValue;
    }
  }

  /**
   * Obtém um item (compatível com localStorage.getItem)
   * @param {string} key - Chave para buscar o valor
   * @param {boolean} forceBackend - Se true, força a busca no backend mesmo sem token
   */
  async getItem(key, forceBackend = false) {
    try {
      // Tratamento especial para o token - evita loop infinito
      if (key === 'token') {
        return this.tokenCache || null;
      }

      // Verificar se há token para requisições que precisam de autenticação
      if (!this.getToken() && !forceBackend) {
        // Se não há token e não estamos forçando o backend, usar localStorage como fallback
        console.warn(`Sem token de autenticação, usando localStorage como fallback para ${key}`);
        return localStorage.getItem(key);
      } else if (!this.getToken() && forceBackend) {
        // Se estamos forçando o backend mas não há token, tentar usar API mesmo assim
        console.warn(`Forçando uso do backend para ${key} mesmo sem token. Tentando usar API...`);
        // Continua para tentar usar a API mesmo sem token
      }

      if (this.cache.has(key)) {
        const cachedValue = this.cache.get(key);
        return typeof cachedValue === 'string' ? cachedValue : JSON.stringify(cachedValue);
      }

      try {
        const data = await dadosUsuarioService.get(key);
        if (data !== null) {
          this.cache.set(key, data);
          return typeof data === 'string' ? data : JSON.stringify(data);
        }
        return null;
      } catch (error) {
        // Se for erro de autenticação ou conexão, usar localStorage como fallback
        if (error.response && (error.response.status === 401 || error.response.status === 404)) {
          console.warn(`Erro ${error.response.status} ao buscar ${key}, usando localStorage como fallback`);
          return localStorage.getItem(key);
        }
        throw error;
      }
    } catch (error) {
      console.error(`Erro ao buscar item ${key}:`, error);
      // Em caso de erro, tentar localStorage como último recurso
      try {
        return localStorage.getItem(key);
      } catch (localStorageError) {
        console.error(`Erro ao acessar localStorage para ${key}:`, localStorageError);
        return null;
      }
    }
  }

  /**
   * Define um item (compatível com localStorage.setItem)
   * @param {string} key - Chave para armazenar o valor
   * @param {any} value - Valor a ser armazenado
   * @param {boolean} forceBackend - Se true, força o armazenamento no backend mesmo sem token
   */
  async setItem(key, value, forceBackend = false) {
    try {
      let parsedValue;
      
      if (typeof value === 'string') {
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = value;
        }
      } else {
        parsedValue = value;
      }

      // Verifica o tamanho dos dados antes de enviar
      const jsonString = JSON.stringify(parsedValue);
      const tamanhoBytes = new Blob([jsonString]).size;
      
      if (tamanhoBytes > 16000000) { // 16MB
        console.error(`Dados muito grandes para ${key}: ${tamanhoBytes} bytes`);
        throw new Error(`Dados muito grandes (${Math.round(tamanhoBytes / 1024 / 1024)}MB). Limite máximo: 16MB`);
      }

      // Verificar se há token para requisições que precisam de autenticação
      if (!this.getToken() && !forceBackend) {
        // Se não há token e não estamos forçando o backend, usar localStorage como fallback
        console.warn(`Sem token de autenticação, usando localStorage como fallback para ${key}`);
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        this.cache.set(key, parsedValue);
        return;
      } else if (!this.getToken() && forceBackend) {
        // Se estamos forçando o backend mas não há token, tentar fazer login anônimo ou usar credenciais padrão
        console.warn(`Forçando uso do backend para ${key} mesmo sem token. Tentando usar API...`);
        // Continua para tentar usar a API mesmo sem token
      }

      // Verificar se os dados são válidos antes de enviar
      const hasValidData = this.hasValidData(parsedValue);
      if (!hasValidData && !forceBackend) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        this.cache.set(key, parsedValue);
        return;
      } 

      try {
        await dadosUsuarioService.update(key, parsedValue);
        this.cache.set(key, parsedValue);
      } catch (error) {
        // Se for erro de autenticação ou conexão, usar localStorage como fallback
        if (error.response && (error.response.status === 401 || error.response.status === 422)) {
          console.warn(`Erro ${error.response.status} ao salvar ${key}, usando localStorage como fallback`);
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          this.cache.set(key, parsedValue);
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error(`Erro ao salvar item ${key}:`, error);
      // Em caso de erro, tentar localStorage como último recurso
      try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        this.cache.set(key, parsedValue);
      } catch (localStorageError) {
        console.error(`Erro ao acessar localStorage para ${key}:`, localStorageError);
        throw error;
      }
    }
  }

  /**
   * Remove um item (compatível com localStorage.removeItem)
   * @param {string} key - Chave do item a ser removido
   * @param {boolean} forceBackend - Se true, força a remoção no backend mesmo sem token
   */
  async removeItem(key, forceBackend = false) {
    try {
      // Tratamento especial para o token - não vai para a API
      if (key === 'token') {
        this.removeToken();
        return;
      }

      // Verificar se há token para requisições que precisam de autenticação
      if (!this.getToken()) {
        // Se não há token, sempre usar localStorage como fallback
        console.warn(`Sem token de autenticação, usando localStorage como fallback para ${key}`);
        try {
          localStorage.removeItem(key);
          this.cache.delete(key);
        } catch (localError) {
          console.error(`Erro ao remover do localStorage para ${key}:`, localError);
        }
        return;
      }
      
      await dadosUsuarioService.delete(key);
      this.cache.delete(key);
    } catch (error) {
      console.error(`Erro ao remover item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Obtém dados diretamente sem conversão JSON
   */
  /**
   * Verifica se os dados são válidos para enviar para a API
   * @param {any} value - Valor a ser verificado
   * @returns {boolean} - True se os dados são válidos, false caso contrário
   */
  hasValidData(value) {
    if (value === null || value === undefined) return false;
    // Não permitir arrays vazios para evitar erros de validação no backend
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return true;
  }

  /**
   * Obtém dados diretamente sem conversão JSON
   * @param {string} key - Chave para buscar o valor
   * @param {any} defaultValue - Valor padrão caso não exista
   * @param {boolean} forceBackend - Se true, força a busca no backend mesmo sem token
   */
  async getData(key, defaultValue = null, forceBackend = false) {
    try {
      // Tratamento especial para o token - evita loop infinito
      if (key === 'token') {
        return this.tokenCache || defaultValue;
      }

      // Verificar se há token para requisições que precisam de autenticação
      if (!this.getToken()) {
        console.warn(`Sem token de autenticação para ${key}, usando localStorage como fallback`);
        // Tentar buscar do localStorage
        try {
          const localData = localStorage.getItem(key);
          if (localData) {
            try {
              const parsedData = JSON.parse(localData);
              return parsedData;
            } catch (e) {
              // Se não for JSON válido, retorna como string
              return localData;
            }
          }
        } catch (localError) {
          console.error(`Erro ao acessar localStorage para ${key}:`, localError);
        }
        return defaultValue;
      }

      if (this.cache.has(key)) {
        const cachedValue = this.cache.get(key);
        return cachedValue;
      }

      const response = await dadosUsuarioService.get(key);
      
      // Verificar se a resposta está no formato da API (com propriedade data)
      let data = null;
      
      if (response !== null) {
        // Se a resposta tem uma propriedade data, usar essa propriedade
        if (response.data !== undefined) {
          data = response.data;
        } else {
          // Caso contrário, usar a resposta diretamente
          data = response;
        }
        
        this.cache.set(key, data);
        return data;
      }
      return defaultValue;
    } catch (error) {
      // Se for erro 401, não loga como erro pois é esperado quando não autenticado
      if (error.response && error.response.status === 401) {
        return defaultValue;
      }
      console.error(`Erro ao buscar dados ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Obtém dados garantindo que seja sempre um array
   */
  /**
   * Obtém dados garantindo que seja sempre um array
   * @param {string} key - Chave para buscar o valor
   * @param {any} defaultValue - Valor padrão caso não exista
   * @param {boolean} forceBackend - Se true, força a busca no backend mesmo sem token
   */
  async getDataAsArray(key, defaultValue = [], forceBackend = false) {
    const data = await this.getData(key, defaultValue, forceBackend);
    return Array.isArray(data) ? data : defaultValue;
  }

  /**
   * Define dados diretamente sem conversão JSON
   */
  /**
   * Define dados diretamente sem conversão JSON
   * @param {string} key - Chave para armazenar o valor
   * @param {any} value - Valor a ser armazenado
   * @param {boolean} forceBackend - Se true, força o armazenamento no backend mesmo sem token
   */
  async setData(key, value, forceBackend = false) {
    try {
      // Tratamento especial para o token - não vai para a API
      if (key === 'token') {
        this.setToken(value);
        return;
      }

      // Verificar se há token para requisições que precisam de autenticação
      if (!this.getToken()) {
        // Se não há token, sempre usar localStorage como fallback
        console.warn(`Sem token de autenticação, usando localStorage como fallback para ${key}`);
        try {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          this.cache.set(key, value);
        } catch (localError) {
          console.error(`Erro ao salvar no localStorage para ${key}:`, localError);
        }
        return;
      }
      
      await dadosUsuarioService.update(key, value);
      this.cache.set(key, value);
    } catch (error) {
      console.error(`Erro ao salvar dados ${key}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza múltiplos dados de uma vez
   */
  async bulkUpdate(dados) {
    try {
      const result = await dadosUsuarioService.bulkUpdate(dados);
      
      // Atualizar cache
      Object.entries(dados).forEach(([key, value]) => {
        this.cache.set(key, value);
      });

      return result;
    } catch (error) {
      console.error('Erro ao atualizar dados em lote:', error);
      throw error;
    }
  }

  /**
   * Limpa o cache (útil ao fazer logout)
   * Remove dados em memória para evitar que dados de um tenant anterior
   * sejam exibidos quando outro usuário fizer login
   */
  clearCache() {
    this.cache.clear();
    this.loadPromises.clear();
    this.tokenCache = null;
    
    // Atualizar referência global
    if (window.__apiDataManagerInstance) {
      window.__apiDataManagerInstance.cache = new Map();
      window.__apiDataManagerInstance.loadPromises = new Map();
      window.__apiDataManagerInstance.tokenCache = null;
    }
  }

  /**
   * Migra dados do localStorage para a API
   */
  async migrateFromLocalStorage() {
    const dadosParaMigrar = {};
    
    // Lista de chaves conhecidas no localStorage
    const chavesConhecidas = [
      'theme',
      'logoUrl',
      'empresaSettings',
              'envelopamentoPrecos',
      'vendedorAtualId',
      'historico_vendas_pdv',
      'orcamentosPDV',
      'envelopamentosOrcamentos',
      'calculos_salvos',
      'calculadora_servicos_adicionais',
      'contasReceber',
      'ordens_servico_salvas',
      'contador_envelopamento_global'
    ];

    for (const chave of chavesConhecidas) {
      const valor = localStorage.getItem(chave);
      if (valor && valor !== 'undefined' && valor !== 'null') {
        try {
          dadosParaMigrar[chave] = JSON.parse(valor);
        } catch {
          dadosParaMigrar[chave] = valor;
        }
      }
    }

    if (Object.keys(dadosParaMigrar).length > 0) {
      await this.bulkUpdate(dadosParaMigrar);
      
      // Remover dados do localStorage após migração bem-sucedida
      for (const chave of chavesConhecidas) {
        localStorage.removeItem(chave);
      }
    }
  }
}

// Instância singleton
export const apiDataManager = new ApiDataManager();

// Funções utilitárias para compatibilidade
export const loadAndInitialize = (key, defaultValue, itemDefaultValue = null) => {
  return apiDataManager.loadAndInitialize(key, defaultValue, itemDefaultValue);
};

export const setData = (key, value, forceBackend = false) => {
  return apiDataManager.setData(key, value, forceBackend);
};

export const getData = (key, defaultValue = null, forceBackend = false) => {
  return apiDataManager.getData(key, defaultValue, forceBackend);
};

export const getDataAsArray = (key, defaultValue = [], forceBackend = false) => {
  return apiDataManager.getDataAsArray(key, defaultValue, forceBackend);
};

export default apiDataManager;