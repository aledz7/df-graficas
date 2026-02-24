import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { applyChatEffects, playNotificationSound } from '@/components/chat/ChatEffects';

/**
 * Hook para gerenciar notificações de chat globalmente
 */
export function useChatNotifications(chatOpen = false, activeThreadId = null) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [lastMessageIds, setLastMessageIds] = useState(new Set());
  const previousUnreadCountRef = useRef(0);
  const pollingIntervalRef = useRef(null);
  const lastCheckedRef = useRef(new Date());

  /**
   * Buscar mensagens não lidas recentes
   */
  const fetchUnreadMessages = useCallback(async () => {
    if (!user) return [];

    try {
      // Usar endpoint otimizado para buscar mensagens recentes não lidas
      const response = await chatService.getRecentUnreadMessages();
      
      if (!response.data.success) return [];

      const recentMessages = response.data.data || [];
      const newMessages = [];

      for (const item of recentMessages) {
        // Se o chat está aberto e esta é a thread ativa, não adicionar notificação
        if (chatOpen && activeThreadId === item.thread_id) {
          continue;
        }

        const messageId = `${item.thread_id}-${item.message.id}`;

        // Verificar se já foi notificado
        if (!lastMessageIds.has(messageId)) {
          newMessages.push({
            id: messageId,
            message: item.message,
            thread: item.thread,
            isUrgent: item.message.is_urgente || false,
            createdAt: new Date(item.message.created_at)
          });

          // Adicionar ao conjunto de mensagens já notificadas
          setLastMessageIds(prev => new Set([...prev, messageId]));
        }
      }

      return newMessages;
    } catch (error) {
      console.error('Erro ao buscar mensagens não lidas:', error);
      return [];
    }
  }, [user, chatOpen, activeThreadId, lastMessageIds]);

  /**
   * Adicionar nova notificação
   */
  const addNotification = useCallback((notification) => {
    setNotifications(prev => {
      // Evitar duplicatas
      if (prev.some(n => n.id === notification.id)) {
        return prev;
      }
      return [...prev, notification];
    });

    // Aplicar efeitos visuais no ícone do chat
    const chatIcon = document.getElementById('chat-icon-button');
    if (chatIcon) {
      applyChatEffects(chatIcon, notification.isUrgent);
    }

    // Tocar som se não for modo silencioso
    const isSilentMode = localStorage.getItem('chat_silent_mode') === 'true';
    if (!isSilentMode) {
      playNotificationSound();
    }
  }, []);

  /**
   * Remover notificação
   */
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  /**
   * Limpar todas as notificações
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Polling para novas mensagens
   */
  useEffect(() => {
    if (!user) return;

    // Verificar mensagens não lidas periodicamente
    const checkForNewMessages = async () => {
      const newMessages = await fetchUnreadMessages();
      
      newMessages.forEach(msg => {
        addNotification(msg);
      });

      // Atualizar timestamp da última verificação
      lastCheckedRef.current = new Date();

      // Verificar contagem de não lidas para efeitos visuais
      try {
        const countResponse = await chatService.getUnreadCount();
        if (countResponse.data.success) {
          const currentCount = countResponse.data.data.count || 0;
          
          // Se aumentou a contagem e há mensagens novas, aplicar efeitos
          if (currentCount > previousUnreadCountRef.current && newMessages.length > 0) {
            const chatIcon = document.getElementById('chat-icon-button');
            if (chatIcon) {
              const hasUrgent = newMessages.some(m => m.isUrgent);
              applyChatEffects(chatIcon, hasUrgent);
              
              const isSilentMode = localStorage.getItem('chat_silent_mode') === 'true';
              if (!isSilentMode) {
                playNotificationSound();
              }
            }
          }
          
          previousUnreadCountRef.current = currentCount;
        }
      } catch (error) {
        console.error('Erro ao verificar contagem:', error);
      }
    };

    // Verificar imediatamente
    checkForNewMessages();

    // Configurar polling a cada 3 segundos
    pollingIntervalRef.current = setInterval(checkForNewMessages, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [user, chatOpen, activeThreadId, fetchUnreadMessages, addNotification]);

  // Limpar mensagens antigas do conjunto (mais de 5 minutos)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setLastMessageIds(prev => {
        const now = new Date();
        const filtered = new Set();
        
        // Manter apenas IDs recentes (últimos 5 minutos)
        prev.forEach(id => {
          filtered.add(id);
        });
        
        return filtered;
      });
    }, 60000); // Limpar a cada minuto

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications
  };
}
