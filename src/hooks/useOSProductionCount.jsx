import { useState, useEffect, useCallback } from 'react';
import { osService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';

export const useOSProductionCount = () => {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProductionCount = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Tentar usar a API primeiro
      try {
        const response = await osService.getEmProducao({ status: 'Em Produção' });
        const osList = response.data || [];
        
        // Filtrar apenas OS em produção (lógica simplificada baseada no backend)
        const osEmProducao = osList.filter(os => {
          const statusProducao = (os?.dados_producao?.status_producao ?? '').toString().trim().toLowerCase();
          const statusOS = (os?.status_os ?? '').toString().trim().toLowerCase();
          
          // Excluir orçamentos
          if (statusOS === 'orçamento salvo' || statusOS === 'orçamento salvo (editado)') {
            return false;
          }
          
          // Excluir OS entregues
          if (statusProducao === 'entregue' || statusOS === 'entregue') {
            return false;
          }
          
          // Excluir OS prontas para entrega
          if (statusProducao === 'pronto para entrega' || statusProducao === 'aguardando entrega') {
            return false;
          }
          
          // Incluir OS com status de produção "Em Produção" ou NULL (que serão tratadas como "Em Produção")
          // ou OS com status_os "Finalizada" (conforme lógica do backend)
          return statusProducao === 'em produção' || 
                 (!statusProducao && statusOS === 'em produção') ||
                 statusOS === 'finalizada';
        });
        
        setCount(osEmProducao.length);
      } catch (apiError) {
        console.error("Erro na API, usando dados locais:", apiError);
        
        // Fallback para dados locais
        const todasOSSalvas = await apiDataManager.getDataAsArray('ordens_servico_salvas');
        
        const osEmProducao = todasOSSalvas.filter(os => {
          const statusProducao = (os?.dados_producao?.status_producao ?? '').toString().trim().toLowerCase();
          const statusOS = (os?.status_os ?? '').toString().trim().toLowerCase();
          
          // Excluir orçamentos
          if (statusOS === 'orçamento salvo' || statusOS === 'orçamento salvo (editado)') {
            return false;
          }
          
          // Excluir OS entregues
          if (statusProducao === 'entregue' || statusOS === 'entregue') {
            return false;
          }
          
          // Excluir OS prontas para entrega
          if (statusProducao === 'pronto para entrega' || statusProducao === 'aguardando entrega') {
            return false;
          }
          
          // Incluir OS com status de produção "Em Produção" ou NULL (que serão tratadas como "Em Produção")
          // ou OS com status_os "Finalizada" (conforme lógica do backend)
          return statusProducao === 'em produção' || 
                 (!statusProducao && statusOS === 'em produção') ||
                 statusOS === 'finalizada';
        });
        
        setCount(osEmProducao.length);
      }
    } catch (error) {
      console.error('Erro ao buscar contagem de OS em produção:', error);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carregar dados de forma lazy - aguardar página carregar primeiro
    // Isso evita bloquear o carregamento inicial da página
    const loadDataLazy = () => {
      // Usar requestIdleCallback se disponível, senão usar setTimeout
      if (window.requestIdleCallback) {
        requestIdleCallback(() => {
          fetchProductionCount();
        }, { timeout: 2000 });
      } else {
        setTimeout(() => {
          fetchProductionCount();
        }, 2000);
      }
    };
    
    loadDataLazy();
    
    // Recarregar quando a janela ganha foco (para capturar mudanças de outras abas)
    const handleFocus = () => {
      fetchProductionCount();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Recarregar a cada 30 segundos para manter sincronizado
    const interval = setInterval(fetchProductionCount, 30000);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [fetchProductionCount]);

  // Função para atualizar a contagem manualmente (útil quando sabemos que algo mudou)
  const refreshCount = useCallback(() => {
    fetchProductionCount();
  }, [fetchProductionCount]);

  return {
    count,
    isLoading,
    refreshCount
  };
};
