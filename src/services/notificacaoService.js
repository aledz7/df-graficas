import { apiDataManager } from '@/lib/apiDataManager';
import { produtoService } from './api';
import axios from 'axios';

// Configuração base do axios para notificações
const apiBaseUrl = import.meta.env.VITE_API_URL || '';
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Interceptador para adicionar o token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = apiDataManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

class NotificacaoService {
  constructor() {
    this.notificacoes = [];
    this.ultimaVerificacao = null;
    this.intervaloVerificacao = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Verifica produtos com estoque baixo baseado nas configurações
   */
  async verificarEstoqueBaixo() {
    try {
      // Carregar configurações de produtos
      const configData = await apiDataManager.getItem('produtoConfigGlobal');
      const config = JSON.parse(configData || '{}');
      const percentualAlerta = parseInt(config.notificarEstoqueBaixoPercentual || '20');

      // Buscar todos os produtos
      const response = await produtoService.getAll();
      const produtos = response.data?.data?.data || response.data?.data || response.data || [];
      
      if (produtos.length === 0) {
        return [];
      }

                      const produtosComEstoqueBaixo = produtos.filter(produto => {
          if (!produto.estoque_minimo || produto.estoque_minimo <= 0) {
            return false;
          }
          
          // Verificar diferentes possíveis nomes de campos
          const estoqueAtual = parseFloat(produto.estoque || produto.estoque_atual || produto.estoqueAtual || 0);
          const estoqueMinimo = parseFloat(produto.estoque_minimo || produto.estoqueMinimo || 0);
          const percentualAtual = (estoqueAtual / estoqueMinimo) * 100;
          
          return percentualAtual <= percentualAlerta;
        });

      // Gerar notificações para produtos com estoque baixo
      const notificacoes = produtosComEstoqueBaixo.map(produto => ({
        id: `estoque-${produto.id}-${Date.now()}`,
        tipo: 'estoque_baixo',
        titulo: 'Estoque Baixo',
        mensagem: `O produto "${produto.nome}" está com estoque baixo (${produto.estoque} unidades). Estoque mínimo: ${produto.estoque_minimo}`,
        produto_id: produto.id,
        produto_nome: produto.nome,
        estoque_atual: produto.estoque,
        estoque_minimo: produto.estoque_minimo,
        data_criacao: new Date().toISOString(),
        lida: false,
        prioridade: 'alta'
      }));

      // Salvar notificações
      await this.salvarNotificacoes(notificacoes);

      return notificacoes;
    } catch (error) {
      console.error('Erro ao verificar estoque baixo:', error);
      return [];
    }
  }

  /**
   * Salva notificações no sistema
   */
  async salvarNotificacoes(novasNotificacoes) {
    try {
      // Carregar notificações existentes
      const notificacoesExistentes = await this.getNotificacoes();
      
      // Adicionar novas notificações
      const todasNotificacoes = [...notificacoesExistentes, ...novasNotificacoes];
      
      // Manter apenas as últimas 100 notificações
      const notificacoesLimitadas = todasNotificacoes.slice(-100);
      
      // Salvar no sistema
      await apiDataManager.setItem('notificacoes_sistema', notificacoesLimitadas);
      
      return notificacoesLimitadas;
    } catch (error) {
      console.error('Erro ao salvar notificações:', error);
      return [];
    }
  }

  /**
   * Obtém todas as notificações
   */
  async getNotificacoes() {
    try {
      // Tentar buscar da API primeiro
      const token = apiDataManager.getToken();
      
      if (token) {
        const response = await api.get('/api/notificacoes');
        
        if (response.data.success) {
          return response.data.data || [];
        }
      }
      
      // Fallback para localStorage
      const notificacoesData = await apiDataManager.getItem('notificacoes_sistema');
      const parsed = JSON.parse(notificacoesData || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      // Fallback para localStorage
      const notificacoesData = await apiDataManager.getItem('notificacoes_sistema');
      const parsed = JSON.parse(notificacoesData || '[]');
      return Array.isArray(parsed) ? parsed : [];
    }
  }

  /**
   * Obtém notificações não lidas
   */
  async getNotificacoesNaoLidas() {
    try {
      // Tentar buscar da API primeiro
      const token = apiDataManager.getToken();
      
      if (token) {
        const response = await api.get('/api/notificacoes/nao-lidas');
        
        if (response.data.success) {
          return response.data.data || [];
        }
      }
      
      // Fallback para localStorage
      const notificacoes = await this.getNotificacoes();
      return notificacoes.filter(notif => !notif.lida);
    } catch (error) {
      console.error('Erro ao carregar notificações não lidas:', error);
      // Fallback para localStorage
      const notificacoes = await this.getNotificacoes();
      return notificacoes.filter(notif => !notif.lida);
    }
  }

  /**
   * Marca notificação como lida
   */
  async marcarComoLida(notificacaoId) {
    try {
      // Tentar marcar na API primeiro
      const token = apiDataManager.getToken();
      if (token) {
        const response = await api.post(`/api/notificacoes/${notificacaoId}/marcar-como-lida`);
        if (response.data.success) {
          return true;
        }
      }
      
      // Fallback para localStorage
      const notificacoes = await this.getNotificacoes();
      const notificacoesAtualizadas = notificacoes.map(notif => 
        notif.id === notificacaoId ? { ...notif, lida: true } : notif
      );
      
      await apiDataManager.setItem('notificacoes_sistema', notificacoesAtualizadas);
      return true;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return false;
    }
  }

  /**
   * Marca todas as notificações como lidas
   */
  async marcarTodasComoLidas() {
    try {
      // Tentar marcar na API primeiro
      const token = apiDataManager.getToken();
      if (token) {
        const response = await api.post('/api/notificacoes/marcar-todas-como-lidas');
        if (response.data.success) {
          return true;
        }
      }
      
      // Fallback para localStorage
      const notificacoes = await this.getNotificacoes();
      const notificacoesAtualizadas = notificacoes.map(notif => ({ ...notif, lida: true }));
      
      await apiDataManager.setItem('notificacoes_sistema', notificacoesAtualizadas);
      return true;
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      return false;
    }
  }

  /**
   * Remove notificação
   */
  async removerNotificacao(notificacaoId) {
    try {
      const notificacoes = await this.getNotificacoes();
      const notificacoesFiltradas = notificacoes.filter(notif => notif.id !== notificacaoId);
      
      await apiDataManager.setItem('notificacoes_sistema', notificacoesFiltradas);
      return true;
    } catch (error) {
      console.error('Erro ao remover notificação:', error);
      return false;
    }
  }

  /**
   * Inicia verificação periódica de estoque baixo
   */
  iniciarVerificacaoPeriodica() {
    // Verificar imediatamente
    this.verificarEstoqueBaixo();
    
    // Configurar verificação periódica
    setInterval(() => {
      this.verificarEstoqueBaixo();
    }, this.intervaloVerificacao);
  }

  /**
   * Força verificação manual de estoque baixo
   */
  async forcarVerificacaoEstoqueBaixo() {
    const notificacoes = await this.verificarEstoqueBaixo();
    return notificacoes;
  }

  /**
   * Testa verificação específica para um produto
   */
  async testarProdutoEspecifico(nomeProduto) {
    try {
      const response = await produtoService.getAll();
      const produtos = response.data?.data?.data || response.data?.data || response.data || [];
      
      const produto = produtos.find(p => p.nome && p.nome.toLowerCase().includes(nomeProduto.toLowerCase()));
      
      if (!produto) {
        return null;
      }
      
      // Carregar configurações
      const configData = await apiDataManager.getItem('produtoConfigGlobal');
      const config = JSON.parse(configData || '{}');
      const percentualAlerta = parseInt(config.notificarEstoqueBaixoPercentual || '20');
      
      const estoqueAtual = parseFloat(produto.estoque || produto.estoque_atual || produto.estoqueAtual || 0);
      const estoqueMinimo = parseFloat(produto.estoque_minimo || produto.estoqueMinimo || 0);
      const percentualAtual = (estoqueAtual / estoqueMinimo) * 100;
      
      return {
        produto,
        percentualAtual,
        percentualAlerta,
        deveAlertar: percentualAtual <= percentualAlerta
      };
    } catch (error) {
      console.error('Erro ao testar produto específico:', error);
      return null;
    }
  }

  /**
   * Cria notificação personalizada
   */
  async criarNotificacao(tipo, titulo, mensagem, dadosAdicionais = {}) {
    const notificacao = {
      id: `${tipo}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tipo,
      titulo,
      mensagem,
      data_criacao: new Date().toISOString(),
      lida: false,
      prioridade: 'normal',
      ...dadosAdicionais
    };

    await this.salvarNotificacoes([notificacao]);
    return notificacao;
  }
}

export const notificacaoService = new NotificacaoService(); 