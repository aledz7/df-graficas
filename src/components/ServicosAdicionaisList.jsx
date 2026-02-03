import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ServicosAdicionaisList = ({ 
    servicos, 
    onEdit, 
    onDelete, 
    onToggleStatus,
    loading = false 
}) => {
    const { toast } = useToast();

    const getCategoriaLabel = (categoria) => {
        const categorias = {
            'aplicacao': 'Aplicação',
            'remocao': 'Remoção',
            'preparacao': 'Preparação',
            'protecao': 'Proteção',
            'acabamento': 'Acabamento',
            'outros': 'Outros'
        };
        return categorias[categoria] || categoria;
    };

    const getCategoriaColor = (categoria) => {
        const cores = {
            'aplicacao': 'bg-blue-100 text-blue-800',
            'remocao': 'bg-red-100 text-red-800',
            'preparacao': 'bg-yellow-100 text-yellow-800',
            'protecao': 'bg-green-100 text-green-800',
            'acabamento': 'bg-purple-100 text-purple-800',
            'outros': 'bg-gray-100 text-gray-800'
        };
        return cores[categoria] || 'bg-gray-100 text-gray-800';
    };

    const handleDelete = async (servico) => {
        if (window.confirm(`Tem certeza que deseja excluir o serviço "${servico.nome}"?`)) {
            try {
                await onDelete(servico.id);
                toast({
                    title: 'Serviço excluído',
                    description: 'O serviço foi removido com sucesso',
                    className: 'bg-green-500 text-white'
                });
            } catch (error) {
                toast({
                    title: 'Erro ao excluir',
                    description: 'Não foi possível excluir o serviço',
                    variant: 'destructive'
                });
            }
        }
    };

    const handleToggleStatus = async (servico) => {
        try {
            await onToggleStatus(servico.id);
            const action = servico.ativo ? 'desativado' : 'ativado';
            toast({
                title: 'Status alterado',
                description: `O serviço foi ${action} com sucesso`,
                className: 'bg-blue-500 text-white'
            });
        } catch (error) {
            toast({
                title: 'Erro ao alterar status',
                description: 'Não foi possível alterar o status do serviço',
                variant: 'destructive'
            });
        }
    };

    if (!servicos || servicos.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground text-lg">
                        Nenhum serviço adicional cadastrado ainda.
                    </p>
                    <p className="text-muted-foreground text-sm mt-2">
                        Clique em "Novo Serviço" para começar.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {servicos.map((servico) => (
                <Card 
                    key={servico.id} 
                    className={`transition-all duration-200 hover:shadow-md ${
                        !servico.ativo ? 'opacity-60' : ''
                    }`}
                >
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center space-x-3">
                                    <h3 className="text-lg font-semibold">{servico.nome}</h3>
                                    <Badge 
                                        variant="secondary" 
                                        className={getCategoriaColor(servico.categoria)}
                                    >
                                        {getCategoriaLabel(servico.categoria)}
                                    </Badge>
                                    {!servico.ativo && (
                                        <Badge variant="outline" className="text-muted-foreground">
                                            Inativo
                                        </Badge>
                                    )}
                                </div>
                                
                                {servico.descricao && (
                                    <p className="text-muted-foreground text-sm">
                                        {servico.descricao}
                                    </p>
                                )}
                                
                                <div className="flex items-center space-x-4 text-sm">
                                    <span className="font-medium text-primary">
                                        R$ {parseFloat(servico.preco).toFixed(2)} / {servico.unidade}
                                    </span>
                                    {servico.ordem > 0 && (
                                        <span className="text-muted-foreground">
                                            Ordem: {servico.ordem}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 ml-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleStatus(servico)}
                                    disabled={loading}
                                    title={servico.ativo ? 'Desativar' : 'Ativar'}
                                >
                                    {servico.ativo ? (
                                        <EyeOff size={16} />
                                    ) : (
                                        <Eye size={16} />
                                    )}
                                </Button>
                                
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEdit(servico)}
                                    disabled={loading}
                                    title="Editar"
                                >
                                    <Edit size={16} />
                                </Button>
                                
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(servico)}
                                    disabled={loading}
                                    title="Excluir"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default ServicosAdicionaisList;
