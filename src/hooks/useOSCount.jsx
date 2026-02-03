import { useState, useEffect, useCallback } from 'react';
import { osService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';

export const useOSCount = () => {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOSCount = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Tentar usar a API primeiro
      try {
        const response = await osService.getASeremEntregues();
        const osList = response.data || [];
        setCount(osList.length);
      } catch (apiError) {
        console.error("Erro na API, usando dados locais:", apiError);
        
        // Fallback para dados locais
        const todasOSSalvas = await apiDataManager.getDataAsArray('ordens_servico_salvas');
        
        const osParaEntregar = todasOSSalvas.filter(
          os => os.dados_producao?.status_producao === 'Pronto para Entrega'
        );
        
        setCount(osParaEntregar.length);
      }
    } catch (error) {
      console.error('Erro ao buscar contagem de OS:', error);
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
          fetchOSCount();
        }, { timeout: 2000 });
      } else {
        setTimeout(() => {
          fetchOSCount();
        }, 2000);
      }
    };
    
    loadDataLazy();
    
    // Recarregar quando a janela ganha foco (para capturar mudanças de outras abas)
    const handleFocus = () => {
      fetchOSCount();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Recarregar a cada 30 segundos para manter sincronizado
    const interval = setInterval(fetchOSCount, 30000);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [fetchOSCount]);

  // Função para atualizar a contagem manualmente (útil quando sabemos que algo mudou)
  const refreshCount = useCallback(() => {
    fetchOSCount();
  }, [fetchOSCount]);

  return {
    count,
    isLoading,
    refreshCount
  };
};
