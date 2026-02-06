import api from '@/config/axios';

export const formaPagamentoService = {
    // CRUD básico
    getAll: async (params = {}) => {
        const response = await api.get('/api/formas-pagamento', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/api/formas-pagamento/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/api/formas-pagamento', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/api/formas-pagamento/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/api/formas-pagamento/${id}`);
        return response.data;
    },

    // Método público para o catálogo (sem autenticação)
    getByTenant: async (tenantId) => {
        const response = await api.get(`/api/public/formas-pagamento/tenant/${tenantId}`);
        return response.data;
    }
};

export default formaPagamentoService;
