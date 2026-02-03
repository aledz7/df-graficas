import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ShoppingCart, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { notificationService } from '@/services/notificationService';
import { pdvService } from '@/services/pdvService';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [showRead, setShowRead] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    // Verificar novas pré-vendas a cada 2 minutos (menos frequente para evitar spam)
    const interval = setInterval(checkNewPreVendas, 120000);
    
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
                
                return filteredNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className={`mb-2 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2 flex-1">
                            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                              {notification.type === 'pre-venda' ? (
                                <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{notification.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(parseISO(notification.created_at), 'dd/MM/yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ));
              })()}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationSystem; 