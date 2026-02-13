import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, Truck, MapPin, Package, X, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { opcaoFreteService } from '@/services/api';
import api from '@/services/api';

const OpcoesFretePage = () => {
    const { toast } = useToast();
    const [opcoesFrete, setOpcoesFrete] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentOpcao, setCurrentOpcao] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [localidades, setLocalidades] = useState([]);
    const [faixasCep, setFaixasCep] = useState([]);
    const [novaLocalidade, setNovaLocalidade] = useState({ estado: '', cidade: '', bairro: '' });
    const [novaFaixaCep, setNovaFaixaCep] = useState({ cep_inicio: '', cep_fim: '' });

    const estados = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];

    const loadData = async () => {
        try {
            setIsLoading(true);
            const response = await opcaoFreteService.getAll();
            setOpcoesFrete(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Erro ao carregar opções de frete:', error);
            toast({ 
                title: 'Erro ao carregar dados', 
                description: 'Ocorreu um erro ao carregar as opções de frete.', 
                variant: 'destructive' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenModal = (opcao = null) => {
        if (opcao) {
            setIsEditing(true);
            setCurrentOpcao(opcao);
            setLocalidades(opcao.localidades || []);
            setFaixasCep(opcao.faixas_cep || []);
        } else {
            setIsEditing(false);
            setCurrentOpcao({
                titulo: '',
                descricao: '',
                prazo_entrega: 1,
                taxa_entrega: 0,
                pedido_minimo: null,
                peso_minimo: null,
                peso_maximo: null,
                tamanho_minimo: null,
                tamanho_maximo: null,
                tipo_limite_geografico: 'localidade',
                produtos_limitados: [],
                ativo: true,
                ordem: opcoesFrete.length + 1,
            });
            setLocalidades([]);
            setFaixasCep([]);
        }
        setIsModalOpen(true);
    };

    const handleAddLocalidade = () => {
        if (!novaLocalidade.estado && !novaLocalidade.cidade && !novaLocalidade.bairro) {
            toast({ title: 'Atenção', description: 'Preencha pelo menos um campo (Estado, Cidade ou Bairro).', variant: 'destructive' });
            return;
        }
        setLocalidades([...localidades, { ...novaLocalidade }]);
        setNovaLocalidade({ estado: '', cidade: '', bairro: '' });
    };

    const handleRemoveLocalidade = (index) => {
        setLocalidades(localidades.filter((_, i) => i !== index));
    };

    const handleAddFaixaCep = () => {
        if (!novaFaixaCep.cep_inicio || !novaFaixaCep.cep_fim) {
            toast({ title: 'Atenção', description: 'Preencha o CEP inicial e final.', variant: 'destructive' });
            return;
        }
        setFaixasCep([...faixasCep, { ...novaFaixaCep }]);
        setNovaFaixaCep({ cep_inicio: '', cep_fim: '' });
    };

    const handleRemoveFaixaCep = (index) => {
        setFaixasCep(faixasCep.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!currentOpcao.titulo.trim()) {
            toast({ title: 'Título obrigatório', description: 'Informe o título da opção de frete.', variant: 'destructive' });
            return;
        }

        try {
            setIsSaving(true);
            
            const dataToSave = {
                ...currentOpcao,
                localidades: localidades,
                faixas_cep: faixasCep,
            };

            if (isEditing) {
                await opcaoFreteService.update(currentOpcao.id, dataToSave);
                toast({ title: 'Sucesso!', description: 'Opção de frete atualizada.' });
            } else {
                await opcaoFreteService.create(dataToSave);
                toast({ title: 'Sucesso!', description: 'Opção de frete criada.' });
            }
            
            await loadData();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Erro ao salvar opção de frete:', error);
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
        if (!confirm('Tem certeza que deseja excluir esta opção de frete?')) return;
        
        try {
            await opcaoFreteService.delete(id);
            await loadData();
            toast({ title: 'Sucesso!', description: 'Opção de frete removida.' });
        } catch (error) {
            console.error('Erro ao excluir opção de frete:', error);
            toast({ 
                title: 'Erro ao excluir', 
                description: error.response?.data?.message || 'Ocorreu um erro ao excluir.', 
                variant: 'destructive' 
            });
        }
    };

    return (
        <>
            <div className="p-4 md:p-6 space-y-6">
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-3">
                            <Truck size={28} className="text-primary hidden sm:block" />
                            <div>
                                <CardTitle className="text-xl sm:text-2xl">Opções de Frete</CardTitle>
                                <CardDescription className="text-sm">
                                    Cadastre e gerencie as opções de frete disponíveis no sistema.
                                </CardDescription>
                            </div>
                        </div>
                        <Button onClick={() => handleOpenModal(null)} className="w-full sm:w-auto">
                            <PlusCircle size={18} className="mr-2" /> Nova Opção de Frete
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[calc(100vh-18rem)]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Título</TableHead>
                                        <TableHead>Prazo</TableHead>
                                        <TableHead>Taxa</TableHead>
                                        <TableHead>Tipo Limite</TableHead>
                                        <TableHead className="text-center">Ativo</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                <div className="flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                                                    <span>Carregando opções de frete...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : opcoesFrete.length > 0 ? (
                                        opcoesFrete.map(opcao => (
                                            <TableRow key={opcao.id} className="hover:bg-muted/50">
                                                <TableCell className="font-medium">{opcao.titulo}</TableCell>
                                                <TableCell>{opcao.prazo_entrega} dia(s)</TableCell>
                                                <TableCell>R$ {parseFloat(opcao.taxa_entrega || 0).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {opcao.tipo_limite_geografico === 'localidade' ? 'Localidade' : 
                                                         opcao.tipo_limite_geografico === 'cep' ? 'CEP' : 'Distância'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Switch
                                                        checked={opcao.ativo}
                                                        onCheckedChange={async () => {
                                                            try {
                                                                await opcaoFreteService.update(opcao.id, { ativo: !opcao.ativo });
                                                                await loadData();
                                                            } catch (error) {
                                                                toast({ title: 'Erro ao alterar status', variant: 'destructive' });
                                                            }
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(opcao)}>
                                                        <Edit size={16} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(opcao.id)} className="text-red-500">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                Nenhuma opção de frete cadastrada.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Modal de Cadastro/Edição */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Editar Opção de Frete' : 'Nova Opção de Frete'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="titulo">Título *</Label>
                                <Input 
                                    id="titulo" 
                                    value={currentOpcao?.titulo || ''} 
                                    onChange={(e) => setCurrentOpcao({ ...currentOpcao, titulo: e.target.value })}
                                    placeholder="Ex: Motoboy"
                                />
                            </div>
                            <div>
                                <Label htmlFor="prazo_entrega">Prazo de Entrega (dias) *</Label>
                                <Input 
                                    id="prazo_entrega" 
                                    type="number"
                                    min="1"
                                    value={currentOpcao?.prazo_entrega || 1} 
                                    onChange={(e) => setCurrentOpcao({ ...currentOpcao, prazo_entrega: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="descricao">Descrição</Label>
                            <Textarea 
                                id="descricao" 
                                value={currentOpcao?.descricao || ''} 
                                onChange={(e) => setCurrentOpcao({ ...currentOpcao, descricao: e.target.value })}
                                placeholder="Descrição opcional"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="taxa_entrega">Taxa de Entrega (R$)</Label>
                                <Input 
                                    id="taxa_entrega" 
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={currentOpcao?.taxa_entrega || 0} 
                                    onChange={(e) => setCurrentOpcao({ ...currentOpcao, taxa_entrega: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="pedido_minimo">Pedido Mínimo (R$)</Label>
                                <Input 
                                    id="pedido_minimo" 
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={currentOpcao?.pedido_minimo || ''} 
                                    onChange={(e) => setCurrentOpcao({ ...currentOpcao, pedido_minimo: e.target.value ? parseFloat(e.target.value) : null })}
                                    placeholder="Opcional"
                                />
                            </div>
                            <div>
                                <Label htmlFor="ordem">Ordem</Label>
                                <Input 
                                    id="ordem" 
                                    type="number"
                                    min="0"
                                    value={currentOpcao?.ordem || 0} 
                                    onChange={(e) => setCurrentOpcao({ ...currentOpcao, ordem: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="peso_minimo">Peso Mínimo (kg)</Label>
                                <Input 
                                    id="peso_minimo" 
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={currentOpcao?.peso_minimo || ''} 
                                    onChange={(e) => setCurrentOpcao({ ...currentOpcao, peso_minimo: e.target.value ? parseFloat(e.target.value) : null })}
                                    placeholder="Ex: 0.300 = 300g"
                                />
                            </div>
                            <div>
                                <Label htmlFor="peso_maximo">Peso Máximo (kg)</Label>
                                <Input 
                                    id="peso_maximo" 
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={currentOpcao?.peso_maximo || ''} 
                                    onChange={(e) => setCurrentOpcao({ ...currentOpcao, peso_maximo: e.target.value ? parseFloat(e.target.value) : null })}
                                    placeholder="Ex: 20"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="tamanho_minimo">Tamanho Mínimo (cm)</Label>
                                <Input 
                                    id="tamanho_minimo" 
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={currentOpcao?.tamanho_minimo || ''} 
                                    onChange={(e) => setCurrentOpcao({ ...currentOpcao, tamanho_minimo: e.target.value ? parseFloat(e.target.value) : null })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="tamanho_maximo">Tamanho Máximo (cm)</Label>
                                <Input 
                                    id="tamanho_maximo" 
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={currentOpcao?.tamanho_maximo || ''} 
                                    onChange={(e) => setCurrentOpcao({ ...currentOpcao, tamanho_maximo: e.target.value ? parseFloat(e.target.value) : null })}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="tipo_limite_geografico">Tipo de Limitação Geográfica *</Label>
                            <Select 
                                value={currentOpcao?.tipo_limite_geografico || 'localidade'} 
                                onValueChange={(value) => setCurrentOpcao({ ...currentOpcao, tipo_limite_geografico: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="localidade">Por Localidade (Estado/Cidade/Bairro)</SelectItem>
                                    <SelectItem value="cep">Por Faixa de CEP</SelectItem>
                                    <SelectItem value="distancia">Por Distância (km)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Localidades */}
                        {currentOpcao?.tipo_limite_geografico === 'localidade' && (
                            <div className="space-y-2 border p-4 rounded-md">
                                <Label className="flex items-center gap-2">
                                    <MapPin size={16} />
                                    Localidades
                                </Label>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                    <Select value={novaLocalidade.estado} onValueChange={(value) => setNovaLocalidade({ ...novaLocalidade, estado: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Todos</SelectItem>
                                            {estados.map(estado => (
                                                <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input 
                                        placeholder="Cidade" 
                                        value={novaLocalidade.cidade}
                                        onChange={(e) => setNovaLocalidade({ ...novaLocalidade, cidade: e.target.value })}
                                    />
                                    <Input 
                                        placeholder="Bairro" 
                                        value={novaLocalidade.bairro}
                                        onChange={(e) => setNovaLocalidade({ ...novaLocalidade, bairro: e.target.value })}
                                    />
                                    <Button type="button" onClick={handleAddLocalidade} size="sm">
                                        <Plus size={16} className="mr-1" /> Adicionar
                                    </Button>
                                </div>
                                {localidades.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {localidades.map((loc, index) => (
                                            <div key={index} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                                                <span>
                                                    {loc.estado && `${loc.estado} » `}
                                                    {loc.cidade && `${loc.cidade} » `}
                                                    {loc.bairro || 'Todos'}
                                                </span>
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveLocalidade(index)} className="h-6 w-6">
                                                    <X size={14} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Faixas de CEP */}
                        {currentOpcao?.tipo_limite_geografico === 'cep' && (
                            <div className="space-y-2 border p-4 rounded-md">
                                <Label className="flex items-center gap-2">
                                    <Package size={16} />
                                    Faixas de CEP
                                </Label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <Input 
                                        placeholder="CEP Início" 
                                        value={novaFaixaCep.cep_inicio}
                                        onChange={(e) => setNovaFaixaCep({ ...novaFaixaCep, cep_inicio: e.target.value.replace(/\D/g, '') })}
                                    />
                                    <Input 
                                        placeholder="CEP Fim" 
                                        value={novaFaixaCep.cep_fim}
                                        onChange={(e) => setNovaFaixaCep({ ...novaFaixaCep, cep_fim: e.target.value.replace(/\D/g, '') })}
                                    />
                                    <Button type="button" onClick={handleAddFaixaCep} size="sm">
                                        <Plus size={16} className="mr-1" /> Adicionar
                                    </Button>
                                </div>
                                {faixasCep.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {faixasCep.map((faixa, index) => (
                                            <div key={index} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                                                <span>{faixa.cep_inicio} até {faixa.cep_fim}</span>
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveFaixaCep(index)} className="h-6 w-6">
                                                    <X size={14} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="ativo">Ativo</Label>
                                <p className="text-xs text-muted-foreground">Se está disponível no sistema</p>
                            </div>
                            <Switch 
                                id="ativo"
                                checked={currentOpcao?.ativo ?? true} 
                                onCheckedChange={(checked) => setCurrentOpcao({ ...currentOpcao, ativo: checked })}
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
                            ) : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default OpcoesFretePage;
