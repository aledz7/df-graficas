import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, Ticket, RefreshCw, Copy, Check, X, Calendar, Percent, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { cupomService } from '@/services/cupomService';
import { categoriaService } from '@/services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const initialCupomState = { 
    id: null, 
    codigo: '', 
    descricao: '',
    tipo_desconto: 'percentual',
    valor_desconto: '',
    valor_minimo: '',
    limite_uso: 'ilimitado',
    quantidade_limite: '',
    cliente_id: null,
    produto_ids: null,
    tipo_aplicacao: 'todos_itens',
    categoria_id: null,
    primeira_compra: false,
    data_inicio: '',
    data_fim: '',
    ativo: true
};

const CuponsPage = () => {
    const { toast } = useToast();
    const [cupons, setCupons] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCupom, setCurrentCupom] = useState(initialCupomState);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [copiedCode, setCopiedCode] = useState(null);
    const [categorias, setCategorias] = useState([]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const response = await cupomService.getAll();
            setCupons(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar cupons:', error);
            toast({ 
                title: 'Erro ao carregar dados', 
                description: 'Ocorreu um erro ao carregar os cupons.', 
                variant: 'destructive' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        loadCategorias();
    }, []);

    const loadCategorias = async () => {
        try {
            const response = await categoriaService.getAll();
            const categoriasData = response.data?.data || response.data || [];
            setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    };

    const gerarNovoCodigo = async () => {
        try {
            const response = await cupomService.gerarCodigo();
            setCurrentCupom(prev => ({ ...prev, codigo: response.codigo }));
        } catch (error) {
            console.error('Erro ao gerar código:', error);
        }
    };

    const handleOpenModal = async (cupom = null) => {
        if (cupom) {
            setIsEditing(true);
            setCurrentCupom({
                ...cupom,
                tipo_aplicacao: cupom.tipo_aplicacao || 'todos_itens',
                categoria_id: cupom.categoria_id || null,
                data_inicio: cupom.data_inicio ? cupom.data_inicio.split('T')[0] : '',
                data_fim: cupom.data_fim ? cupom.data_fim.split('T')[0] : ''
            });
        } else {
            setIsEditing(false);
            const novoCupom = { ...initialCupomState };
            setCurrentCupom(novoCupom);
            // Gerar código automaticamente para novo cupom
            try {
                const response = await cupomService.gerarCodigo();
                setCurrentCupom(prev => ({ ...prev, codigo: response.codigo }));
            } catch (error) {
                console.error('Erro ao gerar código:', error);
            }
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentCupom.codigo?.trim()) {
            toast({ title: 'Código obrigatório', description: 'Informe o código do cupom.', variant: 'destructive' });
            return;
        }
        if (!currentCupom.valor_desconto || parseFloat(currentCupom.valor_desconto) <= 0) {
            toast({ title: 'Desconto inválido', description: 'Informe o valor do desconto.', variant: 'destructive' });
            return;
        }

        try {
            setIsSaving(true);
            
            const dataToSave = {
                codigo: currentCupom.codigo.toUpperCase(),
                descricao: currentCupom.descricao,
                tipo_desconto: currentCupom.tipo_desconto,
                valor_desconto: parseFloat(currentCupom.valor_desconto),
                valor_minimo: currentCupom.valor_minimo ? parseFloat(currentCupom.valor_minimo) : null,
                limite_uso: currentCupom.limite_uso,
                quantidade_limite: currentCupom.limite_uso === 'quantidade_fixa' ? parseInt(currentCupom.quantidade_limite) : null,
                cliente_id: currentCupom.cliente_id,
                produto_ids: currentCupom.produto_ids,
                tipo_aplicacao: currentCupom.tipo_aplicacao,
                categoria_id: currentCupom.tipo_aplicacao === 'categoria' ? currentCupom.categoria_id : null,
                primeira_compra: currentCupom.primeira_compra,
                data_inicio: currentCupom.data_inicio || null,
                data_fim: currentCupom.data_fim || null,
                ativo: currentCupom.ativo
            };

            if (isEditing) {
                await cupomService.update(currentCupom.id, dataToSave);
                toast({ title: 'Sucesso!', description: 'Cupom atualizado.' });
            } else {
                await cupomService.create(dataToSave);
                toast({ title: 'Sucesso!', description: 'Cupom criado.' });
            }
            
            await loadData();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Erro ao salvar cupom:', error);
            toast({ 
                title: 'Erro ao salvar', 
                description: error.response?.data?.message || 'Ocorreu um erro ao salvar.', 
                variant: 'destructive' 
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este cupom?')) return;
        
        try {
            await cupomService.delete(id);
            await loadData();
            toast({ title: 'Sucesso!', description: 'Cupom removido.' });
        } catch (error) {
            console.error('Erro ao excluir cupom:', error);
            toast({ 
                title: 'Erro ao excluir', 
                description: error.response?.data?.message || 'Ocorreu um erro ao excluir.', 
                variant: 'destructive' 
            });
        }
    };

    const handleToggleAtivo = async (cupom) => {
        try {
            await cupomService.update(cupom.id, { ativo: !cupom.ativo });
            await loadData();
            toast({ 
                title: 'Sucesso!', 
                description: `Cupom ${!cupom.ativo ? 'ativado' : 'desativado'}.` 
            });
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            toast({ title: 'Erro ao alterar status', variant: 'destructive' });
        }
    };

    const copiarCodigo = (codigo) => {
        navigator.clipboard.writeText(codigo);
        setCopiedCode(codigo);
        setTimeout(() => setCopiedCode(null), 2000);
        toast({ title: 'Código copiado!', description: codigo });
    };

    const formatarDesconto = (cupom) => {
        if (cupom.tipo_desconto === 'percentual') {
            return `${cupom.valor_desconto}%`;
        }
        return `R$ ${parseFloat(cupom.valor_desconto).toFixed(2)}`;
    };

    const getStatusBadge = (cupom) => {
        if (!cupom.ativo) {
            return <Badge variant="secondary">Inativo</Badge>;
        }
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        if (cupom.data_fim) {
            const dataFim = new Date(cupom.data_fim);
            if (dataFim < hoje) {
                return <Badge variant="destructive">Expirado</Badge>;
            }
        }
        
        if (cupom.data_inicio) {
            const dataInicio = new Date(cupom.data_inicio);
            if (dataInicio > hoje) {
                return <Badge variant="outline">Agendado</Badge>;
            }
        }
        
        if (cupom.limite_uso === 'quantidade_fixa' && cupom.quantidade_usada >= cupom.quantidade_limite) {
            return <Badge variant="destructive">Esgotado</Badge>;
        }
        
        return <Badge className="bg-green-500">Ativo</Badge>;
    };

    const getLimiteUsoLabel = (cupom) => {
        switch (cupom.limite_uso) {
            case 'ilimitado':
                return 'Ilimitado';
            case 'uma_vez_por_cliente':
                return '1x por cliente';
            case 'primeira_compra':
                return 'Primeira compra';
            case 'quantidade_fixa':
                return `${cupom.quantidade_usada || 0}/${cupom.quantidade_limite}`;
            default:
                return '-';
        }
    };

    return (
        <>
            <div className="p-4 md:p-6 space-y-6">
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-3">
                            <Ticket size={28} className="text-primary hidden sm:block" />
                            <div>
                                <CardTitle className="text-xl sm:text-2xl">Cupons de Desconto</CardTitle>
                                <CardDescription className="text-sm">
                                    Crie e gerencie cupons de desconto para o catálogo público.
                                </CardDescription>
                            </div>
                        </div>
                        <Button 
                            onClick={() => handleOpenModal(null)}
                            className="w-full sm:w-auto"
                        >
                            <PlusCircle size={18} className="mr-2" /> Novo Cupom
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {/* Visualização em Cards para Mobile */}
                        <div className="md:hidden">
                            <ScrollArea className="h-[calc(100vh-18rem)]">
                                <div className="space-y-4 pr-2">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-10">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                                            <span>Carregando cupons...</span>
                                        </div>
                                    ) : cupons.length > 0 ? (
                                        cupons.map((cupom) => (
                                            <motion.div
                                                key={cupom.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-card rounded-lg shadow-md p-4 border"
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                                                {cupom.codigo}
                                                            </code>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => copiarCodigo(cupom.codigo)}
                                                                className="h-6 w-6 p-0"
                                                            >
                                                                {copiedCode === cupom.codigo ? (
                                                                    <Check className="h-3 w-3 text-green-500" />
                                                                ) : (
                                                                    <Copy className="h-3 w-3" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                        {getStatusBadge(cupom)}
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div>
                                                            <span className="text-muted-foreground">Desconto:</span>
                                                            <p className="font-semibold">{formatarDesconto(cupom)}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Limite:</span>
                                                            <p className="font-medium">{getLimiteUsoLabel(cupom)}</p>
                                                        </div>
                                                    </div>

                                                    {cupom.data_fim && (
                                                        <div className="text-sm text-muted-foreground">
                                                            Válido até: {format(new Date(cupom.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                                                        </div>
                                                    )}

                                                    <div className="pt-3 border-t">
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                onClick={() => handleOpenModal(cupom)}
                                                                className="flex-1"
                                                            >
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Editar
                                                            </Button>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                onClick={() => handleDelete(cupom.id)}
                                                                className="flex-1 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Excluir
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 text-muted-foreground">
                                            <Ticket className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                            <p>Nenhum cupom cadastrado.</p>
                                            <p className="text-sm mt-2">Clique em "Novo Cupom" para criar.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Visualização em Tabela para Desktop */}
                        <div className="hidden md:block">
                            <ScrollArea className="h-[calc(100vh-18rem)]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Código</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead>Desconto</TableHead>
                                            <TableHead>Valor Mínimo</TableHead>
                                            <TableHead>Limite</TableHead>
                                            <TableHead>Validade</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-24 text-center">
                                                    <div className="flex items-center justify-center">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                                                        <span>Carregando cupons...</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : cupons.length > 0 ? (
                                            cupons.map(cupom => (
                                                <TableRow key={cupom.id} className="hover:bg-muted/50">
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                                                {cupom.codigo}
                                                            </code>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => copiarCodigo(cupom.codigo)}
                                                                className="h-6 w-6 p-0"
                                                            >
                                                                {copiedCode === cupom.codigo ? (
                                                                    <Check className="h-3 w-3 text-green-500" />
                                                                ) : (
                                                                    <Copy className="h-3 w-3" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                                        {cupom.descricao || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            {cupom.tipo_desconto === 'percentual' ? (
                                                                <Percent className="h-3 w-3 text-muted-foreground" />
                                                            ) : (
                                                                <DollarSign className="h-3 w-3 text-muted-foreground" />
                                                            )}
                                                            <span className="font-medium">{formatarDesconto(cupom)}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {cupom.valor_minimo ? `R$ ${parseFloat(cupom.valor_minimo).toFixed(2)}` : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getLimiteUsoLabel(cupom)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {cupom.data_fim ? (
                                                            <div className="flex items-center gap-1 text-sm">
                                                                <Calendar className="h-3 w-3" />
                                                                {format(new Date(cupom.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">Sem limite</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {getStatusBadge(cupom)}
                                                    </TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(cupom)}>
                                                            <Edit size={16} />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => handleDelete(cupom.id)} 
                                                            className="text-red-500"
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-24 text-center">
                                                    <div className="text-muted-foreground">
                                                        <p>Nenhum cupom cadastrado.</p>
                                                        <p className="text-sm mt-1">Clique em "Novo Cupom" para criar.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Modal de Cadastro/Edição */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Editar Cupom' : 'Novo Cupom de Desconto'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {/* Código do Cupom */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="cupom-codigo">Código do Cupom *</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input 
                                        id="cupom-codigo" 
                                        value={currentCupom.codigo} 
                                        onChange={(e) => setCurrentCupom({ ...currentCupom, codigo: e.target.value.toUpperCase() })}
                                        placeholder="DESCONTO10"
                                        className="font-mono"
                                    />
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="icon"
                                        onClick={gerarNovoCodigo}
                                        title="Gerar código aleatório"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="cupom-descricao">Descrição (opcional)</Label>
                                <Input 
                                    id="cupom-descricao" 
                                    value={currentCupom.descricao} 
                                    onChange={(e) => setCurrentCupom({ ...currentCupom, descricao: e.target.value })}
                                    placeholder="Ex: Cupom de inauguração"
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {/* Tipo e Valor do Desconto */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label>Tipo de Desconto *</Label>
                                <Select
                                    value={currentCupom.tipo_desconto}
                                    onValueChange={(value) => setCurrentCupom({ ...currentCupom, tipo_desconto: value })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentual">
                                            <div className="flex items-center gap-2">
                                                <Percent className="h-4 w-4" />
                                                Percentual (%)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="valor_fixo">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4" />
                                                Valor Fixo (R$)
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="cupom-valor">
                                    Valor do Desconto *
                                    {currentCupom.tipo_desconto === 'percentual' ? ' (%)' : ' (R$)'}
                                </Label>
                                <Input 
                                    id="cupom-valor"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    max={currentCupom.tipo_desconto === 'percentual' ? 100 : undefined}
                                    value={currentCupom.valor_desconto} 
                                    onChange={(e) => setCurrentCupom({ ...currentCupom, valor_desconto: e.target.value })}
                                    placeholder={currentCupom.tipo_desconto === 'percentual' ? '10' : '50.00'}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="cupom-minimo">Valor Mínimo (R$)</Label>
                                <Input 
                                    id="cupom-minimo"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={currentCupom.valor_minimo} 
                                    onChange={(e) => setCurrentCupom({ ...currentCupom, valor_minimo: e.target.value })}
                                    placeholder="0.00"
                                    className="mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Deixe vazio para sem mínimo
                                </p>
                            </div>
                        </div>

                        {/* Limite de Uso */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Limite de Uso</Label>
                                <Select
                                    value={currentCupom.limite_uso}
                                    onValueChange={(value) => setCurrentCupom({ ...currentCupom, limite_uso: value })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ilimitado">Ilimitado</SelectItem>
                                        <SelectItem value="uma_vez_por_cliente">Uma vez por cliente</SelectItem>
                                        <SelectItem value="primeira_compra">Primeira compra (novos clientes)</SelectItem>
                                        <SelectItem value="quantidade_fixa">Quantidade fixa de usos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {currentCupom.limite_uso === 'quantidade_fixa' && (
                                <div>
                                    <Label htmlFor="cupom-quantidade">Quantidade de Usos</Label>
                                    <Input 
                                        id="cupom-quantidade"
                                        type="number"
                                        min="1"
                                        value={currentCupom.quantidade_limite} 
                                        onChange={(e) => setCurrentCupom({ ...currentCupom, quantidade_limite: e.target.value })}
                                        placeholder="100"
                                        className="mt-1"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Onde se aplica o desconto */}
                        <div className="space-y-4">
                            <div>
                                <Label>Onde se aplica o desconto *</Label>
                                <Select
                                    value={currentCupom.tipo_aplicacao}
                                    onValueChange={(value) => setCurrentCupom({ ...currentCupom, tipo_aplicacao: value, categoria_id: value !== 'categoria' ? null : currentCupom.categoria_id })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos_itens">Todos os itens</SelectItem>
                                        <SelectItem value="categoria">Uma categoria específica</SelectItem>
                                        <SelectItem value="item_especifico">Item específico</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {currentCupom.tipo_aplicacao === 'categoria' && (
                                <div>
                                    <Label htmlFor="cupom-categoria">Categoria *</Label>
                                    <Select
                                        value={currentCupom.categoria_id?.toString() || 'none'}
                                        onValueChange={(value) => setCurrentCupom({ ...currentCupom, categoria_id: value === 'none' ? null : parseInt(value) })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Selecione a categoria" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categorias.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                                    {cat.nome}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {currentCupom.tipo_aplicacao === 'item_especifico' && (
                                <div>
                                    <Label htmlFor="cupom-produtos">IDs dos Produtos (separados por vírgula)</Label>
                                    <Input 
                                        id="cupom-produtos"
                                        value={currentCupom.produto_ids ? currentCupom.produto_ids.join(', ') : ''} 
                                        onChange={(e) => {
                                            const ids = e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                                            setCurrentCupom({ ...currentCupom, produto_ids: ids.length > 0 ? ids : null });
                                        }}
                                        placeholder="Ex: 1, 5, 10"
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Informe os IDs dos produtos separados por vírgula
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Primeira Compra */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <Label htmlFor="cupom-primeira-compra">Apenas Primeira Compra</Label>
                                <p className="text-xs text-muted-foreground">Cupom válido apenas para primeira compra do cliente</p>
                            </div>
                            <Switch 
                                id="cupom-primeira-compra"
                                checked={currentCupom.primeira_compra || false} 
                                onCheckedChange={(checked) => setCurrentCupom({ ...currentCupom, primeira_compra: checked })}
                            />
                        </div>

                        {/* Validade */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="cupom-inicio">Data de Início (opcional)</Label>
                                <Input 
                                    id="cupom-inicio"
                                    type="date"
                                    value={currentCupom.data_inicio} 
                                    onChange={(e) => setCurrentCupom({ ...currentCupom, data_inicio: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="cupom-fim">Data de Validade (opcional)</Label>
                                <Input 
                                    id="cupom-fim"
                                    type="date"
                                    value={currentCupom.data_fim} 
                                    onChange={(e) => setCurrentCupom({ ...currentCupom, data_fim: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <Label htmlFor="cupom-ativo">Cupom Ativo</Label>
                                <p className="text-xs text-muted-foreground">Se o cupom pode ser utilizado</p>
                            </div>
                            <Switch 
                                id="cupom-ativo"
                                checked={currentCupom.ativo} 
                                onCheckedChange={(checked) => setCurrentCupom({ ...currentCupom, ativo: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" disabled={isSaving}>Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Salvando...
                                </>
                            ) : 'Salvar Cupom'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CuponsPage;
