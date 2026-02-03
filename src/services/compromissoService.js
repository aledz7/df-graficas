import api from '@/config/axios';

/**
 * Serviço para gerenciar compromissos da agenda
 */

/**
 * Lista todos os compromissos
 * @param {Object} filtros - Filtros opcionais
 * @returns {Promise} - Promise com os compromissos
 */
export const listarCompromissos = async (filtros = {}) => {
  try {
    const response = await api.get('/api/compromissos', { params: filtros });
    return response.data;
  } catch (error) {
    console.error('Erro ao listar compromissos:', error);
    throw error;
  }
};

/**
 * Busca um compromisso específico
 * @param {number} id - ID do compromisso
 * @returns {Promise} - Promise com o compromisso
 */
export const buscarCompromisso = async (id) => {
  try {
    const response = await api.get(`/api/compromissos/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar compromisso:', error);
    throw error;
  }
};

/**
 * Cria um novo compromisso
 * @param {Object} dados - Dados do compromisso
 * @returns {Promise} - Promise com o compromisso criado
 */
export const criarCompromisso = async (dados) => {
  try {
    const response = await api.post('/api/compromissos', dados);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar compromisso:', error);
    throw error;
  }
};

/**
 * Atualiza um compromisso
 * @param {number} id - ID do compromisso
 * @param {Object} dados - Dados atualizados
 * @returns {Promise} - Promise com o compromisso atualizado
 */
export const atualizarCompromisso = async (id, dados) => {
  try {
    const response = await api.put(`/api/compromissos/${id}`, dados);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar compromisso:', error);
    throw error;
  }
};

/**
 * Remove um compromisso
 * @param {number} id - ID do compromisso
 * @returns {Promise} - Promise com resultado da operação
 */
export const removerCompromisso = async (id) => {
  try {
    const response = await api.delete(`/api/compromissos/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao remover compromisso:', error);
    throw error;
  }
};

/**
 * Confirma um compromisso
 * @param {number} id - ID do compromisso
 * @returns {Promise} - Promise com o compromisso confirmado
 */
export const confirmarCompromisso = async (id) => {
  try {
    const response = await api.post(`/api/compromissos/${id}/confirmar`);
    return response.data;
  } catch (error) {
    console.error('Erro ao confirmar compromisso:', error);
    throw error;
  }
};

/**
 * Cancela um compromisso
 * @param {number} id - ID do compromisso
 * @returns {Promise} - Promise com o compromisso cancelado
 */
export const cancelarCompromisso = async (id) => {
  try {
    const response = await api.post(`/api/compromissos/${id}/cancelar`);
    return response.data;
  } catch (error) {
    console.error('Erro ao cancelar compromisso:', error);
    throw error;
  }
};

/**
 * Marca um compromisso como realizado
 * @param {number} id - ID do compromisso
 * @returns {Promise} - Promise com o compromisso realizado
 */
export const realizarCompromisso = async (id) => {
  try {
    const response = await api.post(`/api/compromissos/${id}/realizar`);
    return response.data;
  } catch (error) {
    console.error('Erro ao marcar compromisso como realizado:', error);
    throw error;
  }
};

/**
 * Busca estatísticas dos compromissos
 * @param {Object} filtros - Filtros opcionais
 * @returns {Promise} - Promise com as estatísticas
 */
export const buscarEstatisticas = async (filtros = {}) => {
  try {
    const response = await api.get('/api/compromissos/estatisticas', { params: filtros });
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    throw error;
  }
};

/**
 * Busca compromissos de hoje
 * @returns {Promise} - Promise com os compromissos de hoje
 */
export const compromissosHoje = async () => {
  return listarCompromissos({ hoje: true });
};

/**
 * Busca compromissos futuros
 * @returns {Promise} - Promise com os compromissos futuros
 */
export const compromissosFuturos = async () => {
  return listarCompromissos({ futuros: true });
};

/**
 * Busca compromissos em um período específico
 * @param {string} dataInicio - Data de início (YYYY-MM-DD)
 * @param {string} dataFim - Data de fim (YYYY-MM-DD)
 * @returns {Promise} - Promise com os compromissos do período
 */
export const compromissosNoPeriodo = async (dataInicio, dataFim) => {
  return listarCompromissos({ data_inicio: dataInicio, data_fim: dataFim });
}; 