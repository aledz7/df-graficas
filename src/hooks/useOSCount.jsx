import { useState, useCallback } from 'react';
import { osService } from '@/services/api';

/**
 * Contagem de OS "a serem entregues" para o badge no sidebar.
 * Não chama a API em background para evitar 404 repetidos e requisições desnecessárias.
 * A contagem é atualizada apenas quando refreshCount() é chamado explicitamente (ex.: ao sair da página de entregas).
 */
export const useOSCount = () => {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await osService.getASeremEntregues();
      const osList = response.data || [];
      setCount(Array.isArray(osList) ? osList.length : 0);
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.error('Erro ao buscar contagem de OS a serem entregues:', error);
      }
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    count,
    isLoading,
    refreshCount
  };
};
