import { useState, useEffect, useCallback } from 'react';
import { osService, treinamentoService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para gerenciar contadores de notificações da barra superior
 */
export const useHeaderNotifications = () => {
  const { user } = useAuth();
  const [counters, setCounters] = useState({
    geral: 0,           // Notificações gerais (já existe)
    chat: 0,            // Chat (já existe)
    itensProntos: 0,    // Itens prontos para próxima etapa
    treinamento: 0,     // Treinamentos disponíveis/obrigatórios
    itensEntregues: 0   // Itens entregues (histórico recente)
  });
  const [loading, setLoading] = useState(false);

  /**
   * Buscar contador de itens prontos
   * Itens prontos = OS com arte finalizada, produção concluída, ou prontos para retirada
   */
  const fetchItensProntos = useCallback(async () => {
    try {
      // Buscar OS com status que indicam "pronto para próxima etapa"
      const response = await osService.getAll({
        per_page: 1000,
        // Filtrar por status de produção que indicam "pronto"
        // status_producao: Pronto para Retirada, Produção Concluída, Arte Finalizada
      });
      
      const osList = response.data || [];
      
      // Contar OS que estão prontas para próxima etapa
      const itensProntos = osList.filter(os => {
        const statusProducao = os.dados_producao?.status_producao;
        const statusOS = os.status_os;
        
        // Considerar prontos:
        // - Arte finalizada (pronta para produção)
        // - Produção concluída (pronta para entrega)
        // - Pronto para retirada
        return (
          statusProducao === 'Pronto para Retirada' ||
          statusProducao === 'Produção Concluída' ||
          statusProducao === 'Arte Finalizada' ||
          (statusOS === 'Finalizada' && statusProducao === 'Concluído')
        );
      });
      
      return itensProntos.length;
    } catch (error) {
      console.error('Erro ao buscar itens prontos:', error);
      return 0;
    }
  }, []);

  /**
   * Buscar contador de treinamentos
   * Treinamentos disponíveis, obrigatórios ou atrasados
   */
  const fetchTreinamento = useCallback(async () => {
    try {
      // Buscar avisos de treinamento
      const response = await treinamentoService.getAvisos();
      const avisos = response.data?.data || response.data?.avisos || response.data || [];
      
      // Contar avisos não resolvidos
      const avisosNaoResolvidos = Array.isArray(avisos) 
        ? avisos.filter(aviso => !aviso.resolvido)
        : [];
      
      return avisosNaoResolvidos.length;
    } catch (error) {
      console.error('Erro ao buscar treinamentos:', error);
      return 0;
    }
  }, []);

  /**
   * Buscar contador de itens entregues (histórico recente)
   * OS marcadas como entregues nas últimas 24 horas
   */
  const fetchItensEntregues = useCallback(async () => {
    try {
      const response = await osService.getEntregues({
        per_page: 100,
        // Filtrar apenas entregues recentes (últimas 24h)
      });
      
      const osList = response.data || [];
      
      // Filtrar entregues nas últimas 24 horas
      const agora = new Date();
      const vinteQuatroHorasAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
      
      const entreguesRecentes = osList.filter(os => {
        const dataEntrega = os.dados_producao?.data_entrega || 
                           os.dados_producao?.data_hora_entrega ||
                           os.data_finalizacao_os;
        
        if (!dataEntrega) return false;
        
        const data = new Date(dataEntrega);
        return data >= vinteQuatroHorasAtras;
      });
      
      return entreguesRecentes.length;
    } catch (error) {
      console.error('Erro ao buscar itens entregues:', error);
      return 0;
    }
  }, []);

  /**
   * Atualizar todos os contadores
   */
  const updateCounters = useCallback(async () => {
    // Não fazer chamada se não há token
    if (!apiDataManager.getToken()) {
      return;
    }
    
    setLoading(true);
    try {
      const [itensProntos, treinamento, itensEntregues] = await Promise.all([
        fetchItensProntos(),
        fetchTreinamento(),
        fetchItensEntregues()
      ]);
      
      setCounters(prev => ({
        ...prev,
        itensProntos,
        treinamento,
        itensEntregues
      }));
    } catch (error) {
      console.error('Erro ao atualizar contadores:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchItensProntos, fetchTreinamento, fetchItensEntregues]);

  // Atualizar contadores periodicamente
  useEffect(() => {
    updateCounters();
    
    // Atualizar a cada 60 segundos
    const interval = setInterval(updateCounters, 60000);
    
    return () => clearInterval(interval);
  }, [updateCounters]);

  return {
    counters,
    loading,
    updateCounters
  };
};
