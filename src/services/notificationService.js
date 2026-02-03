import api from './api';

class NotificationService {
  /**
   * Buscar todas as notificações
   */
  async getNotifications(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.tenant_id) params.append('tenant_id', filters.tenant_id);
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.type) params.append('type', filters.type);
      if (filters.read !== undefined) params.append('read', filters.read);
      
      const response = await api.get(`/api/notifications?${params.toString()}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return [];
    }
  }

  /**
   * Buscar contagem de notificações não lidas
   */
  async getUnreadCount(userId = null, tenantId = null) {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('user_id', userId);
      if (tenantId) params.append('tenant_id', tenantId);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/api/notifications/unread-count${queryString}`);
      return response.data.count || 0;
    } catch (error) {
      console.error('Erro ao buscar contagem de notificações não lidas:', error);
      return 0;
    }
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(notificationId) {
    try {
      const response = await api.post(`/api/notifications/${notificationId}/mark-as-read`);
      return response.data.success;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return false;
    }
  }

  /**
   * Marcar todas as notificações como lidas
   */
  async markAllAsRead(userId = null, tenantId = null) {
    try {
      const data = {};
      if (userId) data.user_id = userId;
      if (tenantId) data.tenant_id = tenantId;
      
      const response = await api.post('/api/notifications/mark-all-as-read', data);
      return response.data.success;
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      return false;
    }
  }

  /**
   * Deletar notificação
   */
  async deleteNotification(notificationId) {
    try {
      const response = await api.delete(`/api/notifications/${notificationId}`);
      return response.data.success;
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      return false;
    }
  }

  /**
   * Limpar todas as notificações
   */
  async clearAll(userId = null, tenantId = null) {
    try {
      const data = {};
      if (userId) data.user_id = userId;
      if (tenantId) data.tenant_id = tenantId;
      
      const response = await api.post('/api/notifications/clear-all', data);
      return response.data.success;
    } catch (error) {
      console.error('Erro ao limpar todas as notificações:', error);
      return false;
    }
  }

  /**
   * Criar notificação (para uso interno do sistema)
   */
  async createNotification(notificationData) {
    try {
      const response = await api.post('/api/notifications', notificationData);
      return response.data.data;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      return null;
    }
  }

  /**
   * Criar notificação de pré-venda
   */
  async createPreVendaNotification(venda, tenantId = null) {
    const notificationData = {
      type: 'pre-venda',
      title: 'Nova Pré-Venda Realizada',
      message: `Pré-venda #${venda.id} - ${venda.cliente_nome || venda.cliente?.nome || 'Cliente não informado'}`,
      data: {
        venda_id: venda.id,
        cliente: venda.cliente_nome || venda.cliente?.nome,
        valor_total: venda.total || venda.valor_total
      },
      tenant_id: tenantId
    };

    return await this.createNotification(notificationData);
  }
}

export const notificationService = new NotificationService(); 