import { useState, useCallback } from 'react';
import { osService } from '@/services/api';

const filterOSEmProducao = (osList) => {
  return (osList || []).filter(os => {
    const statusProducao = (os?.dados_producao?.status_producao ?? '').toString().trim().toLowerCase();
    const statusOS = (os?.status_os ?? '').toString().trim().toLowerCase();
    if (statusOS === 'orçamento salvo' || statusOS === 'orçamento salvo (editado)') return false;
    if (statusProducao === 'entregue' || statusOS === 'entregue') return false;
    if (statusProducao === 'pronto para entrega' || statusProducao === 'aguardando entrega') return false;
    return statusProducao === 'em produção' || (!statusProducao && statusOS === 'em produção') || statusOS === 'finalizada';
  });
};

/**
 * Contagem de OS "em produção" para o badge no sidebar.
 * Não chama a API em background para evitar 404 repetidos e requisições desnecessárias.
 * A contagem é atualizada apenas quando refreshCount() é chamado explicitamente (ex.: ao sair da página Em Produção).
 */
export const useOSProductionCount = () => {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await osService.getEmProducao({ status: 'Em Produção' });
      const osList = response.data || [];
      setCount(filterOSEmProducao(osList).length);
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.error('Erro ao buscar contagem de OS em produção:', error);
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
