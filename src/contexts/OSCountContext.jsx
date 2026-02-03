import React, { createContext, useContext, useState, useCallback } from 'react';
import { useOSCount } from '@/hooks/useOSCount';
import { useOSProductionCount } from '@/hooks/useOSProductionCount';

const OSCountContext = createContext();

export const useOSCountContext = () => {
  const context = useContext(OSCountContext);
  if (!context) {
    throw new Error('useOSCountContext deve ser usado dentro de um OSCountProvider');
  }
  return context;
};

export const OSCountProvider = ({ children }) => {
  const { count, isLoading, refreshCount } = useOSCount();
  const { count: productionCount, isLoading: productionLoading, refreshCount: refreshProductionCount } = useOSProductionCount();
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Função para forçar atualização da contagem
  const forceRefresh = useCallback(() => {
    setLastUpdate(Date.now());
    refreshCount();
    refreshProductionCount();
  }, [refreshCount, refreshProductionCount]);

  const value = {
    count,
    isLoading,
    productionCount,
    productionLoading,
    lastUpdate,
    refreshCount: forceRefresh
  };

  return (
    <OSCountContext.Provider value={value}>
      {children}
    </OSCountContext.Provider>
  );
};
