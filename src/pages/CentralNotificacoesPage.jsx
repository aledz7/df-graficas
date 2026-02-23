import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { 
  Bell, 
  Lightbulb, 
  Printer, 
  GraduationCap, 
  AlertTriangle, 
  Package,
  Clock,
  Check,
  X,
  FileText,
  ExternalLink,
  Flame,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { notificationService } from '@/services/notificationService';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const CentralNotificacoesPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('nao-lidas');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    carregarNotificacoes();
    
    // Recarregar notificações a cada 30 segundos
    const interval = setInterval(carregarNotificacoes, 30000);
    return () => clearInterval(interval);
  }, [filtroTipo, filtroStatus]);

  const carregarNotificacoes = async () => {
    try {
      setLoading(true);
      const currentTenantId = localStorage.getItem('tenant_id') || '1';
      const userId = localStorage.getItem('user_id');
      
      const filters = {
        tenant_id: currentTenantId,
        user_id: userId,
      };
      
      // Filtro por status de leitura
      if (filtroStatus === 'nao-lidas') {
        filters.read = false;
      } else if (filtroStatus === 'lidas') {
        filters.read = true;
      }
      
      // Filtro por tipo/categoria será aplicado no frontend
      
      if (filtroStatus === 'nao-lidas') {
        filters.read = false;
      } else if (filtroStatus === 'lidas') {
        filters.read = true;
      }
      
      const notificacoes = await notificationService.getNotifications(filters);
      setNotifications(notificacoes);
      setHasMore(notificacoes.length >= 20); // Assumindo paginação de 20
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as notificações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLida = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      toast({
        title: "Sucesso",
        description: "Notificação marcada como lida.",
      });
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a notificação como lida.",
        variant: "destructive",
      });
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      const currentTenantId = localStorage.getItem('tenant_id') || '1';
      const userId = localStorage.getItem('user_id');
      await notificationService.markAllAsRead(userId, currentTenantId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas.",
      });
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar todas como lidas.",
        variant: "destructive",
      });
    }
  };

  const deletarNotificacao = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast({
        title: "Sucesso",
        description: "Notificação removida.",
      });
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a notificação.",
        variant: "destructive",
      });
    }
  };

  const handleOpenOS = (notification) => {
    if (notification.data?.os_id || notification.os_id) {
      const osId = notification.data?.os_id || notification.os_id;
      navigate(`/operacional/ordens-servico?osId=${osId}`);
      if (!notification.read) {
        marcarComoLida(notification.id);
      }
    }
  };

  const handleIrTreinamento = (notification) => {
    navigate('/ferramentas/treinamento-interno');
    if (!notification.read) {
      marcarComoLida(notification.id);
    }
  };

  const getNotificationIcon = (type, data) => {
    switch (type) {
      case 'nova_os_criacao':
      case 'arte_pronta':
        return <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'nova_os_producao':
      case 'os_producao':
        return <Printer className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'arte_atrasada':
        return <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'os_entregue':
        return <Package className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'treinamento_disponivel':
      case 'treinamento_atrasado':
        return <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'pre-venda':
        return <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getNotificationPriority = (notification) => {
    const data = notification.data || {};
    const badges = data.badges || [];
    const priority = notification.priority || data.prioridade || 'media';
    
    // Prioridade máxima: arte pronta + prazo específico
    if (badges.includes('ARTE PRONTA') && badges.includes('PRAZO ESPECÍFICO')) {
      return 'critica';
    }
    
    // Mapear prioridades
    if (priority === 'critica' || priority === 'CRITICA') return 'critica';
    if (priority === 'alta' || priority === 'ALTA') return 'alta';
    if (priority === 'media' || priority === 'MEDIA') return 'media';
    return 'baixa';
  };

  const getNotificationBgColor = (priority, read) => {
    if (read) return 'bg-muted/50';
    
    switch (priority) {
      case 'critica':
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
      case 'alta':
        return 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800';
      case 'media':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';
      case 'baixa':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-950/20';
    }
  };

  const getNotificationType = (type) => {
    // Mapear tipos de notificação para categorias
    const tiposCriacao = ['nova_os_criacao', 'arte_pronta', 'arte_atrasada'];
    const tiposProducao = ['nova_os_producao', 'os_producao'];
    const tiposTreinamento = ['treinamento_disponivel', 'treinamento_atrasado'];
    
    if (tiposCriacao.includes(type)) {
      return 'criacao';
    }
    if (tiposProducao.includes(type)) {
      return 'producao';
    }
    if (tiposTreinamento.includes(type)) {
      return 'treinamento';
    }
    return 'sistema';
  };

  // Ordenar notificações: por prioridade (crítica → alta → média → baixa) e depois por data
  const notificacoesOrdenadas = useMemo(() => {
    const prioridadeOrdem = { critica: 0, alta: 1, media: 2, baixa: 3 };
    
    return [...notifications].sort((a, b) => {
      const prioridadeA = getNotificationPriority(a);
      const prioridadeB = getNotificationPriority(b);
      
      // Primeiro por prioridade
      if (prioridadeOrdem[prioridadeA] !== prioridadeOrdem[prioridadeB]) {
        return prioridadeOrdem[prioridadeA] - prioridadeOrdem[prioridadeB];
      }
      
      // Depois por data (mais recente primeiro)
      const dataA = new Date(a.created_at || a.data_criacao || 0);
      const dataB = new Date(b.created_at || b.data_criacao || 0);
      return dataB - dataA;
    });
  }, [notifications]);

  // Filtrar notificações
  const notificacoesFiltradas = useMemo(() => {
    return notificacoesOrdenadas.filter(notif => {
      // Filtro por tipo/categoria
      if (filtroTipo !== 'todas') {
        const tipoNotif = getNotificationType(notif.type);
        if (tipoNotif !== filtroTipo) return false;
      }
      
      // Filtro por status
      if (filtroStatus === 'nao-lidas' && notif.read) return false;
      if (filtroStatus === 'lidas' && !notif.read) return false;
      
      return true;
    });
  }, [notificacoesOrdenadas, filtroTipo, filtroStatus]);

  // Agrupar por data
  const notificacoesAgrupadas = useMemo(() => {
    const grupos = {
      hoje: [],
      ontem: [],
      anteriores: []
    };
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    
    notificacoesFiltradas.forEach(notif => {
      const dataNotif = new Date(notif.created_at || notif.data_criacao);
      
      if (dataNotif >= hoje) {
        grupos.hoje.push(notif);
      } else if (dataNotif >= ontem) {
        grupos.ontem.push(notif);
      } else {
        grupos.anteriores.push(notif);
      }
    });
    
    return grupos;
  }, [notificacoesFiltradas]);

  const notificacoesNaoLidas = notificacoesFiltradas.filter(n => !n.read).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Central de Notificações</h1>
          <p className="text-muted-foreground mt-1">
            Visualize e gerencie todas as notificações do sistema
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <Badge variant="destructive" className="text-sm">
              {notificacoesNaoLidas} não lidas
            </Badge>
          </div>
          {notificacoesNaoLidas > 0 && (
            <Button onClick={marcarTodasComoLidas} variant="outline">
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtro por Tipo */}
          <Tabs value={filtroTipo} onValueChange={setFiltroTipo}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="todas">Todas</TabsTrigger>
              <TabsTrigger value="criacao">Criação</TabsTrigger>
              <TabsTrigger value="producao">Produção</TabsTrigger>
              <TabsTrigger value="treinamento">Treinamento</TabsTrigger>
              <TabsTrigger value="sistema">Sistema</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filtro por Status */}
          <div className="flex items-center gap-2">
            <Button
              variant={filtroStatus === 'nao-lidas' ? 'default' : 'outline'}
              onClick={() => setFiltroStatus('nao-lidas')}
            >
              Não lidas
            </Button>
            <Button
              variant={filtroStatus === 'lidas' ? 'default' : 'outline'}
              onClick={() => setFiltroStatus('lidas')}
            >
              Lidas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Notificações */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-20rem)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Carregando notificações...</span>
              </div>
            ) : notificacoesFiltradas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma notificação encontrada</p>
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {/* Hoje */}
                {notificacoesAgrupadas.hoje.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-muted-foreground">Hoje</h3>
                    <AnimatePresence>
                      {notificacoesAgrupadas.hoje.map((notif, index) => (
                        <NotificationCard
                          key={notif.id}
                          notification={notif}
                          index={index}
                          getNotificationIcon={getNotificationIcon}
                          getNotificationPriority={getNotificationPriority}
                          getNotificationBgColor={getNotificationBgColor}
                          marcarComoLida={marcarComoLida}
                          deletarNotificacao={deletarNotificacao}
                          handleOpenOS={handleOpenOS}
                          handleIrTreinamento={handleIrTreinamento}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Ontem */}
                {notificacoesAgrupadas.ontem.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-muted-foreground">Ontem</h3>
                    <AnimatePresence>
                      {notificacoesAgrupadas.ontem.map((notif, index) => (
                        <NotificationCard
                          key={notif.id}
                          notification={notif}
                          index={index}
                          getNotificationIcon={getNotificationIcon}
                          getNotificationPriority={getNotificationPriority}
                          getNotificationBgColor={getNotificationBgColor}
                          marcarComoLida={marcarComoLida}
                          deletarNotificacao={deletarNotificacao}
                          handleOpenOS={handleOpenOS}
                          handleIrTreinamento={handleIrTreinamento}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Anteriores */}
                {notificacoesAgrupadas.anteriores.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-muted-foreground">Anteriores</h3>
                    <AnimatePresence>
                      {notificacoesAgrupadas.anteriores.map((notif, index) => (
                        <NotificationCard
                          key={notif.id}
                          notification={notif}
                          index={index}
                          getNotificationIcon={getNotificationIcon}
                          getNotificationPriority={getNotificationPriority}
                          getNotificationBgColor={getNotificationBgColor}
                          marcarComoLida={marcarComoLida}
                          deletarNotificacao={deletarNotificacao}
                          handleOpenOS={handleOpenOS}
                          handleIrTreinamento={handleIrTreinamento}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {hasMore && (
                  <div className="text-center pt-4">
                    <Button variant="outline" onClick={() => setPage(prev => prev + 1)}>
                      Carregar mais notificações
                    </Button>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente de Card de Notificação
const NotificationCard = ({
  notification,
  index,
  getNotificationIcon,
  getNotificationPriority,
  getNotificationBgColor,
  marcarComoLida,
  deletarNotificacao,
  handleOpenOS,
  handleIrTreinamento,
}) => {
  const priority = getNotificationPriority(notification);
  const isOSNotification = ['nova_os_criacao', 'nova_os_producao', 'arte_pronta', 'arte_atrasada', 'os_producao', 'os_entregue'].includes(notification.type);
  const isTreinamentoNotification = ['treinamento_disponivel', 'treinamento_atrasado'].includes(notification.type);
  const data = notification.data || {};
  const badges = data.badges || [];

  const getActionButton = () => {
    if (isOSNotification) {
      if (notification.type === 'arte_atrasada') {
        return (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleOpenOS(notification)}
          >
            Abrir imediatamente
          </Button>
        );
      }
      if (notification.type === 'os_producao') {
        return (
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleOpenOS(notification)}
          >
            Visualizar OS
          </Button>
        );
      }
      if (notification.type === 'os_entregue') {
        return (
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleOpenOS(notification)}
          >
            Ver detalhes
          </Button>
        );
      }
      return (
        <Button
          size="sm"
          variant="default"
          onClick={() => handleOpenOS(notification)}
        >
          Abrir OS
        </Button>
      );
    }
    
    if (isTreinamentoNotification) {
      return (
        <Button
          size="sm"
          variant="default"
          onClick={() => handleIrTreinamento(notification)}
        >
          Ir para treinamento
        </Button>
      );
    }
    
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={cn(
        "transition-all",
        getNotificationBgColor(priority, notification.read)
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {getNotificationIcon(notification.type, data)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <h4 className={cn(
                    "font-semibold text-base",
                    notification.read ? 'text-muted-foreground' : 'text-foreground'
                  )}>
                    {notification.title || notification.titulo}
                  </h4>
                  {badges.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {badges.map((badge, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className={cn(
                            "text-xs",
                            badge === 'ARTE PRONTA'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300'
                          )}
                        >
                          <Flame className="h-3 w-3 mr-1" />
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                {!notification.read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
              
              <p className={cn(
                "text-sm mb-2",
                notification.read ? 'text-muted-foreground' : 'text-foreground'
              )}>
                {notification.message || notification.mensagem}
              </p>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(
                    new Date(notification.created_at || notification.data_criacao),
                    { addSuffix: true, locale: ptBR }
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {getActionButton()}
                  {!notification.read && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => marcarComoLida(notification.id)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Marcar como lida
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deletarNotificacao(notification.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CentralNotificacoesPage;
