import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

export const useServicosAdicionais = () => {
    const [servicos, setServicos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { toast } = useToast();
    const hasLoadedRef = useRef(false);

    // Carregar todos os serviços
    const loadServicos = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('🔄 useServicosAdicionais - Carregando serviços adicionais...');
            const response = await api.get('/api/servicos-adicionais');
            
            if (response.data.success) {
                setServicos(response.data.data);
                console.log('✅ useServicosAdicionais - Serviços carregados com sucesso:', response.data.data.length);
            } else {
                throw new Error(response.data.message || 'Erro ao carregar serviços');
            }
        } catch (err) {
            console.error('❌ useServicosAdicionais - Erro ao carregar serviços:', err);
            setError(err.message || 'Erro ao carregar serviços');
            toast({
                title: 'Erro',
                description: 'Não foi possível carregar os serviços adicionais',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    // Criar novo serviço
    const createServico = useCallback(async (servicoData) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await api.post('/api/servicos-adicionais', servicoData);
            
            if (response.data.success) {
                const newServico = response.data.data;
                setServicos(prev => [...prev, newServico]);
                
                toast({
                    title: 'Sucesso',
                    description: 'Serviço adicional criado com sucesso',
                    className: 'bg-green-500 text-white'
                });
                
                return newServico;
            } else {
                throw new Error(response.data.message || 'Erro ao criar serviço');
            }
        } catch (err) {
            console.error('Erro ao criar serviço:', err);
            setError(err.message || 'Erro ao criar serviço');
            
            let errorMessage = 'Não foi possível criar o serviço';
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.data?.errors) {
                const errors = Object.values(err.response.data.errors).flat();
                errorMessage = errors.join(', ');
            }
            
            toast({
                title: 'Erro',
                description: errorMessage,
                variant: 'destructive'
            });
            
            throw err;
        } finally {
            setLoading(false);
        }
    }, [toast]);

    // Atualizar serviço existente
    const updateServico = useCallback(async (id, servicoData) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await api.put(`/api/servicos-adicionais/${id}`, servicoData);
            
            if (response.data.success) {
                const updatedServico = response.data.data;
                setServicos(prev => 
                    prev.map(servico => 
                        servico.id === id ? updatedServico : servico
                    )
                );
                
                toast({
                    title: 'Sucesso',
                    description: 'Serviço adicional atualizado com sucesso',
                    className: 'bg-green-500 text-white'
                });
                
                return updatedServico;
            } else {
                throw new Error(response.data.message || 'Erro ao atualizar serviço');
            }
        } catch (err) {
            console.error('Erro ao atualizar serviço:', err);
            setError(err.message || 'Erro ao atualizar serviço');
            
            let errorMessage = 'Não foi possível atualizar o serviço';
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.data?.errors) {
                const errors = Object.values(err.response.data.errors).flat();
                errorMessage = errors.join(', ');
            }
            
            toast({
                title: 'Erro',
                description: errorMessage,
                variant: 'destructive'
            });
            
            throw err;
        } finally {
            setLoading(false);
        }
    }, [toast]);

    // Excluir serviço
    const deleteServico = useCallback(async (id) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await api.delete(`/api/servicos-adicionais/${id}`);
            
            if (response.data.success) {
                setServicos(prev => prev.filter(servico => servico.id !== id));
                
                toast({
                    title: 'Sucesso',
                    description: 'Serviço adicional excluído com sucesso',
                    className: 'bg-green-500 text-white'
                });
                
                return true;
            } else {
                throw new Error(response.data.message || 'Erro ao excluir serviço');
            }
        } catch (err) {
            console.error('Erro ao excluir serviço:', err);
            setError(err.message || 'Erro ao excluir serviço');
            
            toast({
                title: 'Erro',
                description: 'Não foi possível excluir o serviço',
                variant: 'destructive'
            });
            
            throw err;
        } finally {
            setLoading(false);
        }
    }, [toast]);

    // Alternar status do serviço
    const toggleServicoStatus = useCallback(async (id) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await api.patch(`/api/servicos-adicionais/${id}/toggle-status`);
            
            if (response.data.success) {
                const updatedServico = response.data.data;
                setServicos(prev => 
                    prev.map(servico => 
                        servico.id === id ? updatedServico : servico
                    )
                );
                
                return updatedServico;
            } else {
                throw new Error(response.data.message || 'Erro ao alterar status');
            }
        } catch (err) {
            console.error('Erro ao alterar status:', err);
            setError(err.message || 'Erro ao alterar status');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Filtrar serviços
    const filterServicos = useCallback((filters) => {
        let filtered = [...servicos];

        // Filtro por busca no nome
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(servico => 
                servico.nome.toLowerCase().includes(searchTerm) ||
                (servico.descricao && servico.descricao.toLowerCase().includes(searchTerm))
            );
        }

        // Filtro por categoria
        if (filters.categoria && filters.categoria !== 'todas') {
            filtered = filtered.filter(servico => servico.categoria === filters.categoria);
        }

        // Filtro por tipo
        if (filters.tipo && filters.tipo !== 'todos') {
            filtered = filtered.filter(servico => servico.tipo === filters.tipo);
        }

        // Filtro por status
        if (filters.ativo && filters.ativo !== 'todos') {
            const isAtivo = filters.ativo === 'true';
            filtered = filtered.filter(servico => servico.ativo === isAtivo);
        }

        // Filtro por preço mínimo
        if (filters.preco_min && filters.preco_min > 0) {
            filtered = filtered.filter(servico => 
                parseFloat(servico.preco) >= parseFloat(filters.preco_min)
            );
        }

        return filtered;
    }, [servicos]);

    // Carregar serviços na inicialização (apenas uma vez)
    useEffect(() => {
        if (!hasLoadedRef.current) {
            hasLoadedRef.current = true;
            loadServicos();
        }
    }, []); // Sem dependências para executar apenas uma vez

    return {
        servicos,
        loading,
        error,
        loadServicos,
        createServico,
        updateServico,
        deleteServico,
        toggleServicoStatus,
        filterServicos
    };
};
