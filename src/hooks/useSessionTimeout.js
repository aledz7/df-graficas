import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para gerenciar timeout de sessão por inatividade
 * @param {number} timeoutMinutes - Tempo em minutos para expirar a sessão (padrão: 240 = 4 horas)
 */
export const useSessionTimeout = (timeoutMinutes = 240) => {
  const { logout, isAuthenticated } = useAuth();
  const timeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  
  // Converter minutos para milissegundos
  const timeoutMs = timeoutMinutes * 60 * 1000;
  
  // Função para resetar o timer de inatividade
  const resetTimeout = useCallback(() => {
    if (!isAuthenticated) return;
    
    lastActivityRef.current = Date.now();
    
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Criar novo timeout
    timeoutRef.current = setTimeout(() => {
      // Verificar se realmente passou o tempo de inatividade
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      
      if (timeSinceLastActivity >= timeoutMs) {
        // Disparar evento customizado antes do logout
        window.dispatchEvent(new CustomEvent('sessionTimeout', {
          detail: { 
            message: `Sua sessão expirou após ${timeoutMinutes} minutos de inatividade.`,
            reason: 'inactivity'
          }
        }));
        
        logout();
      } else {
        // Se ainda não passou o tempo, reagendar
        const remainingTime = timeoutMs - timeSinceLastActivity;
        timeoutRef.current = setTimeout(() => {
          window.dispatchEvent(new CustomEvent('sessionTimeout', {
            detail: { 
              message: `Sua sessão expirou após ${timeoutMinutes} minutos de inatividade.`,
              reason: 'inactivity'
            }
          }));
          logout();
        }, remainingTime);
      }
    }, timeoutMs);
  }, [isAuthenticated, logout, timeoutMs, timeoutMinutes]);
  
  // Eventos que indicam atividade do usuário
  const activityEvents = [
    'mousedown',
    'mousemove', 
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ];
  
  // Função throttled para evitar muitas chamadas
  const throttledResetTimeout = useCallback(() => {
    const now = Date.now();
    const timeSinceLastReset = now - lastActivityRef.current;
    
    // Só resetar se passou pelo menos 1 minuto desde a última atividade registrada
    if (timeSinceLastReset >= 60000) {
      resetTimeout();
    }
  }, [resetTimeout]);
  
  useEffect(() => {
    if (!isAuthenticated) {
      // Limpar timeout se não estiver autenticado
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
    
    // Inicializar timeout
    resetTimeout();
    
    // Adicionar listeners de atividade
    activityEvents.forEach(event => {
      document.addEventListener(event, throttledResetTimeout, true);
    });
    
    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      activityEvents.forEach(event => {
        document.removeEventListener(event, throttledResetTimeout, true);
      });
    };
  }, [isAuthenticated, resetTimeout, throttledResetTimeout]);
  
  // Função para obter tempo restante da sessão
  const getTimeRemaining = useCallback(() => {
    if (!isAuthenticated) return 0;
    
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    const remaining = Math.max(0, timeoutMs - timeSinceLastActivity);
    
    return Math.floor(remaining / 1000); // Retornar em segundos
  }, [isAuthenticated, timeoutMs]);
  
  // Função para estender a sessão manualmente
  const extendSession = useCallback(() => {
    if (isAuthenticated) {
      resetTimeout();
    }
  }, [isAuthenticated, resetTimeout]);
  
  return {
    getTimeRemaining,
    extendSession,
    resetTimeout
  };
};

export default useSessionTimeout;