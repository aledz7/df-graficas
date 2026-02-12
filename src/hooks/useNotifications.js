import { useState, useEffect, useCallback } from 'react';
import { notificacaoService } from '@/services/notificacaoService';
import { useToast } from '@/components/ui/use-toast';

export const useNotifications = () => {
  const [notificacoes, setNotificacoes] = useState([]);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [ultimaVerificacao, setUltimaVerificacao] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);
  const { toast } = useToast();

  // Carregar notificações
  const carregarNotificacoes = useCallback(async () => {
    setLoading(true);
    try {
      const notifs = await notificacaoService.getNotificacoes();
      const normalizado = Array.isArray(notifs)
        ? notifs.map(n => ({
            ...n,
            createdAt: new Date(n.data_criacao || n.created_at || Date.now()),
            isNew: false // Por padrão, não são novas
          }))
        : [];
      
      const ordenadas = normalizado.sort((a, b) => b.createdAt - a.createdAt);
      setNotificacoes(ordenadas);
      
      const naoLidas = ordenadas.filter(n => !n.lida).length;
      setNotificacoesNaoLidas(naoLidas);
      
      return ordenadas;
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar novas notificações
  const verificarNovasNotificacoes = useCallback(async () => {
    try {
      const notifs = await notificacaoService.getNotificacoes();
      const normalizado = Array.isArray(notifs)
        ? notifs.map(n => ({
            ...n,
            createdAt: new Date(n.data_criacao || n.created_at || Date.now()),
            isNew: ultimaVerificacao ? new Date(n.data_criacao || n.created_at) > ultimaVerificacao : false
          }))
        : [];
      
      const ordenadas = normalizado.sort((a, b) => b.createdAt - a.createdAt);
      const naoLidas = ordenadas.filter(n => !n.lida).length;
      
      // Verificar se há novas notificações
      const novasNotificacoes = ordenadas.filter(n => n.isNew);
      
      if (novasNotificacoes.length > 0) {
        // Tocar som de notificação
        playNotificationSound();
        
        // Mostrar toast personalizado para a primeira nova notificação
        const primeiraNotificacao = novasNotificacoes[0];
        setToastNotification({
          title: primeiraNotificacao.titulo || primeiraNotificacao.title || "Nova Notificação",
          message: primeiraNotificacao.mensagem || primeiraNotificacao.message || "Você tem uma nova notificação",
          type: primeiraNotificacao.tipo || 'info',
          isVisible: true
        });
        
        // Auto-close após 5 segundos
        setTimeout(() => {
          setToastNotification(prev => prev ? { ...prev, isVisible: false } : null);
        }, 5000);
      }
      
      setNotificacoes(ordenadas);
      setNotificacoesNaoLidas(naoLidas);
      setUltimaVerificacao(new Date());
      
      return ordenadas;
    } catch (error) {
      console.error('Erro ao verificar novas notificações:', error);
      return [];
    }
  }, [ultimaVerificacao, toast]);

  // Tocar som de notificação
  const playNotificationSound = useCallback(() => {
    try {
      // Criar um contexto de áudio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Criar um oscilador para gerar o som
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Conectar os nós
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configurar o som (frequência e duração)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1); // 600Hz
      
      // Configurar o volume
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      // Tocar o som
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Não foi possível reproduzir o som de notificação:', error);
    }
  }, []);

  // Marcar como lida
  const marcarComoLida = useCallback(async (notificacaoId) => {
    try {
      await notificacaoService.marcarComoLida(notificacaoId);
      
      setNotificacoes(prev => 
        prev.map(n => 
          n.id === notificacaoId ? { ...n, lida: true } : n
        )
      );
      
      setNotificacoesNaoLidas(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }, []);

  // Marcar todas como lidas
  const marcarTodasComoLidas = useCallback(async () => {
    try {
      const naoLidas = notificacoes.filter(n => !n.lida);
      for (const notif of naoLidas) {
        await notificacaoService.marcarComoLida(notif.id);
      }
      
      setNotificacoes(prev => 
        prev.map(n => ({ ...n, lida: true }))
      );
      
      setNotificacoesNaoLidas(0);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  }, [notificacoes]);

  // Deletar notificação
  const deletarNotificacao = useCallback(async (notificacaoId) => {
    try {
      await notificacaoService.removerNotificacao(notificacaoId);
      
      setNotificacoes(prev => prev.filter(n => n.id !== notificacaoId));
      
      const notif = notificacoes.find(n => n.id === notificacaoId);
      if (notif && !notif.lida) {
        setNotificacoesNaoLidas(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  }, [notificacoes]);

  // Efeito para verificação periódica
  useEffect(() => {
    // Carregar notificações iniciais
    carregarNotificacoes();
    
    // Verificar novas notificações a cada 30 segundos
    const interval = setInterval(verificarNovasNotificacoes, 30000);
    
    return () => clearInterval(interval);
  }, [carregarNotificacoes, verificarNovasNotificacoes]);

  // Executar verificações de alertas
  const executarVerificacoes = useCallback(async () => {
    setLoading(true);
    try {
      const resultado = await notificacaoService.executarVerificacoes();
      await carregarNotificacoes();
      
      toast({
        title: "Verificações executadas",
        description: `Foram criados ${resultado.data?.estoque_baixo || 0} alertas de estoque, ${resultado.data?.atrasos || 0} de atrasos, ${resultado.data?.clientes_inativos || 0} de clientes inativos e ${resultado.data?.metas_proximas || 0} de metas próximas.`,
      });
      
      return resultado;
    } catch (error) {
      console.error('Erro ao executar verificações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível executar as verificações.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [carregarNotificacoes, toast]);

  // Fechar toast personalizado
  const fecharToast = useCallback(() => {
    setToastNotification(prev => prev ? { ...prev, isVisible: false } : null);
  }, []);

  return {
    notificacoes,
    notificacoesNaoLidas,
    loading,
    toastNotification,
    carregarNotificacoes,
    verificarNovasNotificacoes,
    marcarComoLida,
    marcarTodasComoLidas,
    deletarNotificacao,
    playNotificationSound,
    fecharToast,
    executarVerificacoes
  };
};
