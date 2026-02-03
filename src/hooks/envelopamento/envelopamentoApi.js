import { orcamentoService } from '@/services/api';

/**
 * Funções de API para gerenciar orçamentos de envelopamento
 */

/**
 * Salva um rascunho de orçamento na API
 * @param {Object} orcamento - Orçamento a ser salvo como rascunho
 * @returns {Promise} - Promise com resultado da operação
 */
export const salvarRascunhoOrcamento = async (orcamento) => {
  try {
    const response = await orcamentoService.saveRascunho(orcamento);
    return response.data;
  } catch (error) {
    console.error('Erro ao salvar rascunho de orçamento:', error);
    // Fallback para localStorage em caso de erro da API
    if (error.response?.status === 500 || error.response?.status === 422) {
      localStorage.setItem('envelopamentoRascunho', JSON.stringify(orcamento));
      return orcamento;
    }
    throw error;
  }
};

/**
 * Carrega um rascunho de orçamento da API
 * @returns {Promise} - Promise com o rascunho de orçamento
 */
export const carregarRascunhoOrcamento = async () => {
  try {
    const response = await orcamentoService.getRascunho();
    return response.data;
  } catch (error) {
    console.error('Erro ao carregar rascunho de orçamento:', error);
    // Fallback para localStorage em caso de erro da API
    if (error.response?.status === 500 || error.response?.status === 404) {
      const rascunhoLocal = localStorage.getItem('envelopamentoRascunho');
      return rascunhoLocal ? JSON.parse(rascunhoLocal) : null;
    }
    return null;
  }
};

/**
 * Salva um orçamento completo na API
 * @param {Object} orcamento - Orçamento a ser salvo
 * @returns {Promise} - Promise com resultado da operação
 */
export const salvarOrcamento = async (orcamento) => {
  try {
    let response;
    
    if (orcamento.id && typeof orcamento.id === 'string' && !orcamento.id.startsWith('env-draft-') && !orcamento.id.startsWith('rascunho_env_')) {
      // Se tem ID e não é rascunho, atualiza
      response = await orcamentoService.update(orcamento.id, orcamento);
    } else {
      // Se não tem ID ou é rascunho, cria novo
      response = await orcamentoService.create(orcamento);
    }
    
    return response.data;
  } catch (error) {
    console.error('Erro ao salvar orçamento:', error);
    throw error;
  }
};

/**
 * Carrega um orçamento específico da API
 * @param {string} id - ID do orçamento a ser carregado
 * @returns {Promise} - Promise com o orçamento
 */
export const carregarOrcamento = async (id) => {
  try {
    const response = await orcamentoService.getById(id);
    return response.data;
  } catch (error) {
    console.error(`Erro ao carregar orçamento ${id}:`, error);
    throw error;
  }
};
