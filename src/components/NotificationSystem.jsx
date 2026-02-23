import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ShoppingCart, AlertCircle, Lightbulb, Printer, FileText, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { notificationService } from '@/services/notificationService';
import { pdvService } from '@/services/pdvService';
import { useNavigate } from 'react-router-dom';

const NotificationSystem = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [showRead, setShowRead] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    // Verificar novas pré-vendas a cada 2 minutos (menos frequente para evitar spam)
    const interval = setInterval(() => {
      checkNewPreVendas();
      loadNotifications(); // Recarregar notificações periodicamente
    }, 30000); // Verificar a cada 30 segundos
    
    // Verificação inicial imediata para pegar pré-vendas existentes
    checkNewPreVendas();
    
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      // Buscar o tenant_id atual do localStorage ou usar '1' como padrão
      const currentTenantId = localStorage.getItem('tenant_id') || '1';
      
      const notifications = await notificationService.getNotifications({ 
        tenant_id: currentTenantId 
      });
      setNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const checkNewPreVendas = async () => {
    try {
      // Carregar vendas da API
      const vendasPDV = await pdvService.getHistoricoVendas();
      
      // Filtrar apenas pré-vendas
      const preVendas = vendasPDV.filter(v => 
        v.pre_venda || v.is_orcamento || v.status === 'pre_venda' || v.status === 'orcamento'
      );
      
      // Carregar notificações existentes para o tenant atual
      const currentTenantId = localStorage.getItem('tenant_id') || '1';
      const existingNotifications = await notificationService.getNotifications({ 
        type: 'pre-venda',
        tenant_id: currentTenantId
      });
      
      // Verificar se há novas pré-vendas (apenas as que não foram notificadas)
      const newPreVendas = preVendas.filter(venda => {
        const vendaId = venda.id;
        // Só criar notificação se não existir nenhuma notificação para esta venda
        return !existingNotifications.find(n => n.data?.venda_id === vendaId);
      });
      
      if (newPreVendas.length > 0) {
        // Criar notificações para novas pré-vendas via API
        for (const venda of newPreVendas) {
          // Usar o tenant_id da venda para criar a notificação
          const tenantId = venda.tenant_id || '1'; // fallback para tenant_id 1 se não existir
          await notificationService.createPreVendaNotification(venda, tenantId);
        }
        
        // Recarregar notificações
        await loadNotifications();
      }
    } catch (error) {
      console.error('Erro ao verificar novas pré-vendas:', error);
    }
  };

  // Função removida: não usaremos notificações do navegador
  // Apenas o sininho com badge será usado para alertas

  const markAsRead = async (notificationId) => {
    try {
      const success = await notificationService.markAsRead(notificationId);
      if (success) {
        const updatedNotifications = notifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        );
        
        setNotifications(updatedNotifications);
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // Fechar o popover após marcar como lida
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const currentTenantId = localStorage.getItem('tenant_id') || '1';
      const success = await notificationService.markAllAsRead(null, currentTenantId);
      if (success) {
        const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updatedNotifications);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
    }
  };

  const clearNotifications = async () => {
    try {
      const currentTenantId = localStorage.getItem('tenant_id') || '1';
      const success = await notificationService.clearAll(null, currentTenantId);
      if (success) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
    }
  };

  const handleOpenOS = (notification) => {
    if (notification.data?.os_id) {
      navigate(`/operacional/ordens-servico?osId=${notification.data.os_id}`);
      markAsRead(notification.id);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type, data) => {
    if (type === 'nova_os_criacao') {
      return <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    }
    if (type === 'nova_os_producao') {
      return <Printer className="h-4 w-4 text-green-600 dark:text-green-400" />;
    }
    if (type === 'pre-venda') {
      return <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    }
    return <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  };

  const getNotificationPriority = (notification) => {
    const data = notification.data || {};
    const badges = data.badges || [];
    
    // Prioridade máxima: arte pronta + prazo específico
    if (badges.includes('ARTE PRONTA') && badges.includes('PRAZO ESPECÍFICO')) {
      return 'maxima';
    }
    // Prioridade alta: apenas prazo específico
    if (badges.includes('PRAZO ESPECÍFICO')) {
      return 'alta';
    }
    // Prioridade média: apenas arte pronta
    if (badges.includes('ARTE PRONTA')) {
      return 'media';
    }
    return 'normal';
  };

  const getNotificationBgColor = (priority, read) => {
    if (read) return '';
    
    switch (priority) {
      case 'maxima':
        return 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800';
      case 'alta':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';
      case 'media':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800';
    }
  };

  // Removido: solicitação de permissão de notificação do navegador
  // Não usaremos notificações do sistema operacional



  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notificações</h4>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                navigate('/ferramentas/central-notificacoes');
              }}
              className="text-xs"
            >
              Ver todas
            </Button>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Marcar como lidas
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowRead(!showRead)}
            >
              {showRead ? 'Ocultar lidas' : 'Mostrar lidas'}
            </Button>
            <Button variant="ghost" size="sm" onClick={clearNotifications}>
              Limpar
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-80">
          <div className="p-2">
            <AnimatePresence>
              {(() => {
                const filteredNotifications = showRead 
                  ? notifications 
                  : notifications.filter(n => !n.read);
                
                if (filteredNotifications.length === 0) {
                  return (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8 text-muted-foreground"
                    >
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{showRead ? 'Nenhuma notificação' : 'Nenhuma notificação não lida'}</p>
                    </motion.div>
                  );
                }
                
                return filteredNotifications.map((notification, index) => {
                  const priority = getNotificationPriority(notification);
                  const isOSNotification = ['nova_os_criacao', 'nova_os_producao'].includes(notification.type);
                  
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className={`mb-2 transition-colors ${
                          getNotificationBgColor(priority, notification.read)
                        } ${!notification.read ? 'cursor-pointer' : ''}`}
                        onClick={() => !notification.read && markAsRead(notification.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded flex-shrink-0">
                                {getNotificationIcon(notification.type, notification.data)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 flex-wrap">
                                  <p className="text-sm font-medium flex-1">{notification.title}</p>
                                  {notification.data?.badges && notification.data.badges.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                      {notification.data.badges.map((badge, idx) => (
                                        <Badge 
                                          key={idx}
                                          variant="outline"
                                          className={`text-xs ${
                                            badge === 'ARTE PRONTA' 
                                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300'
                                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300'
                                          }`}
                                        >
                                          <Flame className="h-3 w-3 mr-1" />
                                          {badge}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(parseISO(notification.created_at), 'dd/MM/yyyy HH:mm')}
                                </p>
                                {isOSNotification && notification.data?.os_id && (
                                  <div className="mt-2 flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-7 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenOS(notification);
                                      }}
                                    >
                                      <FileText className="h-3 w-3 mr-1" />
                                      Abrir OS
                                    </Button>
                                    {!notification.read && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAsRead(notification.id);
                                        }}
                                      >
                                        Marcar como lida
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                });
              })()}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationSystem; 