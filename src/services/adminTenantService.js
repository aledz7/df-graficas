import api from './api.js';

/**
 * Serviço para gerenciar tenants (clientes do sistema) - apenas administradores.
 */
class AdminTenantService {
  /**
   * Lista tenants com filtros e paginação.
   * @param {Object} params - { ativo, plano, search, page, per_page, sort_by, sort_dir }
   */
  async getTenants(params = {}) {
    try {
      const response = await api.get('/api/admin/tenants', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar tenants:', error);
      throw error;
    }
  }

  /**
   * Busca um tenant por ID com contagens.
   */
  async getTenant(id) {
    try {
      const response = await api.get(`/api/admin/tenants/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar tenant:', error);
      throw error;
    }
  }

  /**
   * Atualiza um tenant.
   */
  async updateTenant(id, data) {
    try {
      const response = await api.put(`/api/admin/tenants/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar tenant:', error);
      throw error;
    }
  }

  /**
   * Alterna status ativo do tenant (bloquear/desbloquear).
   */
  async toggleAtivo(id) {
    try {
      const response = await api.post(`/api/admin/tenants/${id}/toggle-ativo`);
      return response.data;
    } catch (error) {
      console.error('Erro ao alternar status do tenant:', error);
      throw error;
    }
  }
}

export const adminTenantService = new AdminTenantService();
