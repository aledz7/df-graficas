import api from './api';

class ContaPagarService {
    /**
     * Lista todas as contas a pagar
     */
    async listar(filtros = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filtros.status && filtros.status !== 'todos') {
                params.append('status', filtros.status);
            }
            
            if (filtros.fornecedor_id && filtros.fornecedor_id !== 'todos') {
                params.append('fornecedor_id', filtros.fornecedor_id);
            }
            
            if (filtros.periodo_inicio) {
                params.append('periodo_inicio', filtros.periodo_inicio);
            }
            
            if (filtros.periodo_fim) {
                params.append('periodo_fim', filtros.periodo_fim);
            }

            const response = await api.get(`/api/contas-pagar?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Erro ao listar contas a pagar:', error);
            throw error;
        }
    }

    /**
     * Busca uma conta específica
     */
    async buscar(id) {
        try {
            const response = await api.get(`/api/contas-pagar/${id}`);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar conta:', error);
            throw error;
        }
    }

    /**
     * Cria uma nova conta a pagar
     */
    async criar(dados) {
        try {
            const response = await api.post('/api/contas-pagar', dados);
            return response.data;
        } catch (error) {
            console.error('Erro ao criar conta a pagar:', error);
            throw error;
        }
    }

    /**
     * Atualiza uma conta a pagar
     */
    async atualizar(id, dados) {
        try {
            const response = await api.put(`/api/contas-pagar/${id}`, dados);
            return response.data;
        } catch (error) {
            console.error('Erro ao atualizar conta a pagar:', error);
            throw error;
        }
    }

    /**
     * Remove uma conta a pagar
     */
    async remover(id) {
        try {
            const response = await api.delete(`/api/contas-pagar/${id}`);
            return response.data;
        } catch (error) {
            console.error('Erro ao remover conta a pagar:', error);
            throw error;
        }
    }

    /**
     * Marca uma conta como paga
     */
    async marcarComoPaga(id) {
        try {
            const response = await api.post(`/api/contas-pagar/${id}/marcar-como-paga`);
            return response.data;
        } catch (error) {
            console.error('Erro ao marcar conta como paga:', error);
            throw error;
        }
    }

    /**
     * Registra pagamento de uma conta com múltiplas formas de pagamento
     */
    async pagar(id, dados) {
        try {
            const response = await api.post(`/api/contas-pagar/${id}/pagar`, dados);
            return response.data;
        } catch (error) {
            console.error('Erro ao pagar conta:', error);
            throw error;
        }
    }

    /**
     * Busca fornecedores para o select
     */
    async buscarFornecedores() {
        try {
            const response = await api.get('/api/dados-usuario/fornecedores');
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar fornecedores:', error);
            throw error;
        }
    }

    /**
     * Busca categorias de despesa para o select
     */
    async buscarCategorias(tipo = null) {
        try {
            const params = new URLSearchParams();
            if (tipo) {
                params.append('tipo', tipo);
            }
            
            const response = await api.get(`/api/contas-pagar/categorias?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
            throw error;
        }
    }

    /**
     * Busca estatísticas das contas a pagar
     */
    async buscarEstatisticas() {
        try {
            const response = await api.get('/api/contas-pagar/estatisticas');
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            throw error;
        }
    }
}

export default new ContaPagarService(); 