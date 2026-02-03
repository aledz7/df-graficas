import api from '@/config/axios';
import { apiDataManager } from '@/lib/apiDataManager';

/**
 * Serviço para gerenciar backup e restauração de dados
 */

/**
 * Cria um backup completo dos dados do sistema
 * @returns {Promise} - Promise com os dados do backup
 */
export const criarBackup = async () => {
  try {
    const response = await api.get('/api/backup');
    return response.data;
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    throw error;
  }
};

/**
 * Restaura os dados do sistema a partir de um backup
 * @param {Object} backupData - Dados do backup a serem restaurados
 * @returns {Promise} - Promise com resultado da operação
 */
export const restaurarBackup = async (backupData) => {
  try {
    const response = await api.post('/api/backup/restore', backupData);
    return response.data;
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    throw error;
  }
};

/**
 * Cria um backup local (para compatibilidade com a versão anterior)
 * @returns {Object} - Objeto com os dados do localStorage
 */
export const criarBackupLocal = async () => {
  try {
    const dataToBackup = {};
    const keysToBackup = Object.keys(localStorage);

    // Usar Promise.all para lidar com operações assíncronas
    const items = await Promise.all(
      keysToBackup.map(async (key) => {
        const item = await apiDataManager.getItem(key);
        return { key, item };
      })
    );

    items.forEach(({ key, item }) => {
      if (item !== null) {
        try {
          dataToBackup[key] = JSON.parse(item);
        } catch (e) {
          // Se não for um JSON válido, salva como string
          dataToBackup[key] = item;
        }
      }
    });

    return dataToBackup;
  } catch (error) {
    console.error("Erro ao gerar backup local:", error);
    throw error;
  }
};

/**
 * Restaura um backup local (para compatibilidade com a versão anterior)
 * @param {Object} dataToRestore - Dados a serem restaurados
 */
export const restaurarBackupLocal = (dataToRestore) => {
  try {
    if (!dataToRestore || typeof dataToRestore !== 'object') {
      throw new Error("Arquivo de backup inválido ou corrompido.");
    }
    
    localStorage.clear();

    Object.keys(dataToRestore).forEach(key => {
      if (dataToRestore[key] !== undefined && dataToRestore[key] !== null) {
        localStorage.setItem(
          key, 
          typeof dataToRestore[key] === 'string' 
            ? dataToRestore[key] 
            : JSON.stringify(dataToRestore[key])
        );
      }
    });
    
    return true;
  } catch (error) {
    console.error("Erro ao restaurar backup local:", error);
    throw error;
  }
};
