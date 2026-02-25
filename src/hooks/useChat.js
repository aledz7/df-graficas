import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const DEFAULT_CHAT_POLL_INTERVAL_MS = 10000;

export function useChat(options = {}) {
  const { enabled = true, mode = 'full', pollIntervalMs = DEFAULT_CHAT_POLL_INTERVAL_MS } = options;
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const pollingIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isPollingRef = useRef(false);

  // Carregar threads
  const loadThreads = useCallback(async () => {
    try {
      const response = await chatService.getThreads();
      if (response.data.success) {
        setThreads(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar threads:', error);
    }
  }, []);

  // Carregar mensagens
  const loadMessages = useCallback(async (threadId) => {
    if (!threadId) return;
    
    setLoading(true);
    try {
      const response = await chatService.getMessages(threadId);
      if (response.data.success) {
        setMessages(response.data.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar contagem de não lidas
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await chatService.getUnreadCount();
      if (response.data.success) {
        setUnreadCount(response.data.data.count || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar contagem:', error);
    }
  }, []);

  // Enviar mensagem
  const sendMessage = useCallback(async (threadId, texto, options = {}) => {
    try {
      const response = await chatService.sendMessage({
        thread_id: threadId,
        texto,
        tipo: options.tipo || 'texto',
        reply_to: options.replyTo,
        is_importante: options.isImportante || false,
        is_urgente: options.isUrgente || false,
        ordem_servico_id: options.ordemServicoId,
      });

      if (response.data.success) {
        const newMessage = response.data.data;
        setMessages(prev => [...prev, newMessage]);
        
        // Atualizar threads
        await loadThreads();
        await loadUnreadCount();
        
        return newMessage;
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem',
        variant: 'destructive',
      });
      throw error;
    }
  }, [loadThreads, loadUnreadCount, toast]);

  // Upload de arquivo
  const uploadFile = useCallback(async (threadId, file) => {
    try {
      const response = await chatService.uploadAttachment(threadId, file);
      if (response.data.success) {
        const newMessage = response.data.data;
        setMessages(prev => [...prev, newMessage]);
        await loadThreads();
        await loadUnreadCount();
        return newMessage;
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o arquivo',
        variant: 'destructive',
      });
      throw error;
    }
  }, [loadThreads, loadUnreadCount, toast]);

  // Criar ou obter thread direta
  const getOrCreateDirectThread = useCallback(async (userId) => {
    try {
      const response = await chatService.getOrCreateDirectThread({ user_id: userId });
      if (response.data.success) {
        const thread = response.data.data;
        setActiveThread(thread);
        await loadMessages(thread.id);
        await loadThreads();
        return thread;
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar conversa',
        variant: 'destructive',
      });
      throw error;
    }
  }, [loadMessages, loadThreads, toast]);

  // Atualizar status "digitando..."
  const updateTypingStatus = useCallback(async (threadId, isTyping) => {
    try {
      await chatService.updateTypingStatus({
        thread_id: threadId,
        is_typing: isTyping,
      });

      // Limpar timeout anterior
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Se parou de digitar, limpar após 3 segundos
      if (!isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers([]);
        }, 3000);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  }, []);

  // Carregar usuários digitando
  const loadTypingUsers = useCallback(async (threadId) => {
    if (!threadId) return;
    
    try {
      const response = await chatService.getTypingUsers(threadId);
      if (response.data.success) {
        setTypingUsers(response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários digitando:', error);
    }
  }, []);

  // Buscar no chat
  const search = useCallback(async (query, threadId = null) => {
    try {
      const response = await chatService.search(query, threadId);
      if (response.data.success) {
        return response.data.data;
      }
    } catch (error) {
      console.error('Erro ao buscar:', error);
      return [];
    }
  }, []);

  // Polling para atualizações em tempo real
  useEffect(() => {
    if (!user || !enabled) return;

    const shouldRunFullPolling = mode === 'full';

    // Carregar dados iniciais
    loadUnreadCount();
    if (shouldRunFullPolling) {
      loadThreads();
    }

    const runPolling = async () => {
      if (isPollingRef.current) return;

      isPollingRef.current = true;
      try {
        await loadUnreadCount();

        if (shouldRunFullPolling) {
          await loadThreads();

          if (activeThread) {
            await Promise.all([
              loadMessages(activeThread.id),
              loadTypingUsers(activeThread.id)
            ]);
          }
        }
      } finally {
        isPollingRef.current = false;
      }
    };

    // Configurar polling
    pollingIntervalRef.current = setInterval(runPolling, pollIntervalMs);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [
    user,
    enabled,
    mode,
    pollIntervalMs,
    activeThread,
    loadThreads,
    loadUnreadCount,
    loadMessages,
    loadTypingUsers
  ]);

  return {
    threads,
    activeThread,
    setActiveThread,
    messages,
    unreadCount,
    typingUsers,
    loading,
    loadThreads,
    loadMessages,
    sendMessage,
    uploadFile,
    getOrCreateDirectThread,
    updateTypingStatus,
    search,
  };
}
