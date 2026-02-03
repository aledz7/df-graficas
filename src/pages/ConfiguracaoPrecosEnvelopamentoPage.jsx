import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Settings, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useServicosAdicionais } from '@/hooks/useServicosAdicionais';
import ServicoAdicionalModal from '@/components/ServicoAdicionalModal';
import ServicosAdicionaisList from '@/components/ServicosAdicionaisList';
import ServicosAdicionaisFilters from '@/components/ServicosAdicionaisFilters';

const ConfiguracaoPrecosEnvelopamentoPage = () => {
    const { toast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingServico, setEditingServico] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        categoria: 'todas',
        tipo: 'envelopamento', // Filtrar apenas serviços de envelopamento
        ativo: 'todos',
        preco_min: ''
    });

    const {
        servicos,
        loading,
        createServico,
        updateServico,
        deleteServico,
        toggleServicoStatus,
        filterServicos
    } = useServicosAdicionais();

    // Aplicar filtros aos serviços
    const filteredServicos = useMemo(() => {
        return filterServicos(filters);
    }, [filterServicos, filters]);

    const handleOpenModal = (servico = null) => {
        setEditingServico(servico);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingServico(null);
    };

    const handleSaveServico = async (servicoData) => {
        try {
            if (editingServico) {
                // Atualizar serviço existente
                await updateServico(editingServico.id, {
                    ...servicoData,
                    preco: parseFloat(servicoData.preco),
                    ordem: parseInt(servicoData.ordem) || 0
                });
            } else {
                // Criar novo serviço
                await createServico({
                    ...servicoData,
                    preco: parseFloat(servicoData.preco),
                    ordem: parseInt(servicoData.ordem) || 0
                });
            }
        } catch (error) {
            console.error('Erro ao salvar serviço:', error);
            throw error;
        }
    };

    const handleEditServico = (servico) => {
        handleOpenModal(servico);
    };

    const handleDeleteServico = async (id) => {
        try {
            await deleteServico(id);
        } catch (error) {
            console.error('Erro ao excluir serviço:', error);
            throw error;
        }
    };

    const handleToggleStatus = async (id) => {
        try {
            await toggleServicoStatus(id);
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            throw error;
        }
    };

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    const handleClearFilters = () => {
        setFilters({
            search: '',
            categoria: 'todas',
            tipo: 'envelopamento', // Manter filtro de tipo
            ativo: 'todos',
            preco_min: ''
        });
    };

    // Estatísticas dos serviços (apenas envelopamento)
    const stats = useMemo(() => {
        const servicosEnvelopamento = servicos.filter(s => s.tipo === 'envelopamento');
        const total = servicosEnvelopamento.length;
        const ativos = servicosEnvelopamento.filter(s => s.ativo).length;
        const inativos = total - ativos;
        const valorTotal = servicosEnvelopamento
            .filter(s => s.ativo)
            .reduce((sum, s) => sum + parseFloat(s.preco), 0);

        return { total, ativos, inativos, valorTotal };
    }, [servicos]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-4 md:p-6"
        >
            <header className="mb-8">
                <div className="flex items-center space-x-3">
                    <Settings size={36} className="text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold">Serviços Adicionais</h1>
                        <p className="text-muted-foreground">
                            Gerencie os serviços adicionais disponíveis para orçamentos de envelopamento.
                        </p>
                    </div>
                </div>
            </header>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Settings className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total de Serviços</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Ativos</p>
                                <p className="text-2xl font-bold text-green-600">{stats.ativos}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Inativos</p>
                                <p className="text-2xl font-bold text-gray-600">{stats.inativos}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                                <p className="text-2xl font-bold text-primary">
                                    R$ {stats.valorTotal.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <ServicosAdicionaisFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
            />

            {/* Cabeçalho da lista */}
            <div className="flex items-center justify-between mb-6 mt-6">
                <div>
                    <h2 className="text-xl font-semibold">Serviços de Envelopamento</h2>
                    <p className="text-muted-foreground">
                        {filteredServicos.length} de {stats.total} serviços
                    </p>
                </div>
                
                <Button 
                    onClick={() => handleOpenModal()}
                    size="lg"
                    className="bg-primary hover:bg-primary/90"
                >
                    <Plus size={20} className="mr-2" />
                    Novo Serviço
                </Button>
            </div>

            {/* Lista de serviços */}
            <ServicosAdicionaisList
                servicos={filteredServicos}
                onEdit={handleEditServico}
                onDelete={handleDeleteServico}
                onToggleStatus={handleToggleStatus}
                loading={loading}
            />

            {/* Modal para criar/editar serviço */}
            <ServicoAdicionalModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                servico={editingServico}
                onSave={handleSaveServico}
                loading={loading}
            />
        </motion.div>
    );
};

export default ConfiguracaoPrecosEnvelopamentoPage;