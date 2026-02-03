import { configuracaoService } from './api';

/**
 * Carrega as configurações da aplicação da API
 * @returns {Promise} - Promise com as configurações da aplicação
 */
export const carregarConfiguracoes = async () => {
  try {
    const response = await configuracaoService.get();
    return response.data;
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
    throw error;
  }
};

/**
 * Carrega as configurações da empresa da API
 * @returns {Promise} - Promise com as configurações da empresa
 */
export const carregarConfiguracoesEmpresa = async () => {
  try {
    const response = await configuracaoService.getEmpresa();
    return response.data;
  } catch (error) {
    console.error('Erro ao carregar configurações da empresa:', error);
    throw error;
  }
};

/**
 * Salva as configurações da empresa na API
 * @param {Object} configuracoes - Configurações da empresa a serem salvas
 * @returns {Promise} - Promise com resultado da operação
 */
export const salvarConfiguracoesEmpresa = async (configuracoes) => {
  try {
    const response = await configuracaoService.updateEmpresa(configuracoes);
    return response.data;
  } catch (error) {
    console.error('Erro ao salvar configurações da empresa:', error);
    throw error;
  }
};

/**
 * Faz upload do logo da empresa
 * @param {File} file - Arquivo de imagem do logo
 * @returns {Promise} - Promise com a URL do logo
 */
export const uploadLogo = async (file) => {
  try {
    const response = await configuracaoService.uploadLogo(file);
    return response.data.url;
  } catch (error) {
    console.error('Erro ao fazer upload do logo:', error);
    throw error;
  }
};
