import api from '@/config/axios';

export const cupomService = {
    // CRUD básico
    getAll: async (params = {}) => {
        const response = await api.get('/api/cupons', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/api/cupons/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/api/cupons', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/api/cupons/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/api/cupons/${id}`);
        return response.data;
    },

    // Gerar código único
    gerarCodigo: async () => {
        const response = await api.get('/api/cupons/gerar-codigo');
        return response.data;
    },

    // Métodos públicos para o catálogo (sem autenticação)
    validarCupom: async (tenantId, codigo, totalPedido, clienteId = null) => {
        const response = await api.post(`/api/public/cupons/validar/${tenantId}`, {
            codigo,
            total_pedido: totalPedido,
            cliente_id: clienteId
        });
        return response.data;
    },

    registrarUso: async (tenantId, cupomId) => {
        const response = await api.post(`/api/public/cupons/registrar-uso/${tenantId}`, {
            cupom_id: cupomId
        });
        return response.data;
    }
};

export default cupomService;
