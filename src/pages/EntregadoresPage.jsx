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
import { PlusCircle, Edit, Trash2, User, Phone, Wallet, Building2, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { entregadorService } from '@/services/api';
import api from '@/services/api';

const EntregadoresPage = () => {
    const { toast } = useToast();
    const [entregadores, setEntregadores] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEntregador, setCurrentEntregador] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const response = await entregadorService.getAll();
            setEntregadores(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Erro ao carregar entregadores:', error);
            toast({ 
                title: 'Erro ao carregar dados', 
                description: 'Ocorreu um erro ao carregar os entregadores.', 
                variant: 'destructive' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const loadFuncionarios = async () => {
        try {
            const response = await api.get('/api/funcionarios');
            setFuncionarios(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
        }
    };

    useEffect(() => {
        loadData();
        loadFuncionarios();
    }, []);

    const handleOpenModal = (entregador = null) => {
        if (entregador) {
            setIsEditing(true);
            setCurrentEntregador(entregador);
        } else {
            setIsEditing(false);
            setCurrentEntregador({
                nome: '',
                telefone: '',
                tipo: 'terceirizado',
                valor_padrao_entrega: null,
                chave_pix: '',
                funcionario_id: null,
                ativo: true,
                observacoes: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentEntregador.nome.trim()) {
            toast({ title: 'Nome obrigatório', description: 'Informe o nome do entregador.', variant: 'destructive' });
            return;
        }

        try {
            setIsSaving(true);
            
            const dataToSave = {
                ...currentEntregador,
                valor_padrao_entrega: currentEntregador.valor_padrao_entrega ? parseFloat(currentEntregador.valor_padrao_entrega) : null,
            };

            if (isEditing) {
                await entregadorService.update(currentEntregador.id, dataToSave);
                toast({ title: 'Sucesso!', description: 'Entregador atualizado.' });
            } else {
                await entregadorService.create(dataToSave);
                toast({ title: 'Sucesso!', description: 'Entregador criado.' });
            }
            
            await loadData();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Erro ao salvar entregador:', error);
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
        if (!confirm('Tem certeza que deseja excluir este entregador?')) return;
        
        try {
            await entregadorService.delete(id);
            await loadData();
            toast({ title: 'Sucesso!', description: 'Entregador removido.' });
        } catch (error) {
            console.error('Erro ao excluir entregador:', error);
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
                            <User size={28} className="text-primary hidden sm:block" />
                            <div>
                                <CardTitle className="text-xl sm:text-2xl">Entregadores</CardTitle>
                                <CardDescription className="text-sm">
                                    Cadastre e gerencie os entregadores (motoboys) do sistema.
                                </CardDescription>
                            </div>
                        </div>
                        <Button onClick={() => handleOpenModal(null)} className="w-full sm:w-auto">
                            <PlusCircle size={18} className="mr-2" /> Novo Entregador
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[calc(100vh-18rem)]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Valor Padrão</TableHead>
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
                                                    <span>Carregando entregadores...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : entregadores.length > 0 ? (
                                        entregadores.map(entregador => (
                                            <TableRow key={entregador.id} className="hover:bg-muted/50">
                                                <TableCell className="font-medium">{entregador.nome}</TableCell>
                                                <TableCell>{entregador.telefone || '-'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={entregador.tipo === 'proprio' ? 'default' : 'secondary'}>
                                                        {entregador.tipo === 'proprio' ? 'Próprio' : 'Terceirizado'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {entregador.valor_padrao_entrega 
                                                        ? `R$ ${parseFloat(entregador.valor_padrao_entrega).toFixed(2)}` 
                                                        : '-'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Switch
                                                        checked={entregador.ativo}
                                                        onCheckedChange={async () => {
                                                            try {
                                                                await entregadorService.update(entregador.id, { ativo: !entregador.ativo });
                                                                await loadData();
                                                            } catch (error) {
                                                                toast({ title: 'Erro ao alterar status', variant: 'destructive' });
                                                            }
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(entregador)}>
                                                        <Edit size={16} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(entregador.id)} className="text-red-500">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                Nenhum entregador cadastrado.
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
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Editar Entregador' : 'Novo Entregador'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="nome">Nome *</Label>
                            <Input 
                                id="nome" 
                                value={currentEntregador?.nome || ''} 
                                onChange={(e) => setCurrentEntregador({ ...currentEntregador, nome: e.target.value })}
                                placeholder="Nome do entregador"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="telefone">Telefone</Label>
                                <Input 
                                    id="telefone" 
                                    value={currentEntregador?.telefone || ''} 
                                    onChange={(e) => setCurrentEntregador({ ...currentEntregador, telefone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                            <div>
                                <Label htmlFor="tipo">Tipo *</Label>
                                <Select 
                                    value={currentEntregador?.tipo || 'terceirizado'} 
                                    onValueChange={(value) => setCurrentEntregador({ ...currentEntregador, tipo: value, funcionario_id: value === 'proprio' ? currentEntregador?.funcionario_id : null })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="terceirizado">Terceirizado</SelectItem>
                                        <SelectItem value="proprio">Próprio</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {currentEntregador?.tipo === 'proprio' && (
                            <div>
                                <Label htmlFor="funcionario_id">Funcionário</Label>
                                <Select 
                                    value={currentEntregador?.funcionario_id?.toString() || ''} 
                                    onValueChange={(value) => setCurrentEntregador({ ...currentEntregador, funcionario_id: value ? parseInt(value) : null })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o funcionário" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Nenhum</SelectItem>
                                        {funcionarios.map(func => (
                                            <SelectItem key={func.id} value={func.id.toString()}>{func.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="valor_padrao_entrega">Valor Padrão por Entrega (R$)</Label>
                                <Input 
                                    id="valor_padrao_entrega" 
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={currentEntregador?.valor_padrao_entrega || ''} 
                                    onChange={(e) => setCurrentEntregador({ ...currentEntregador, valor_padrao_entrega: e.target.value ? parseFloat(e.target.value) : null })}
                                    placeholder="Opcional"
                                />
                            </div>
                            <div>
                                <Label htmlFor="chave_pix">Chave PIX</Label>
                                <Input 
                                    id="chave_pix" 
                                    value={currentEntregador?.chave_pix || ''} 
                                    onChange={(e) => setCurrentEntregador({ ...currentEntregador, chave_pix: e.target.value })}
                                    placeholder="Para pagamento terceirizado"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="observacoes">Observações</Label>
                            <Textarea 
                                id="observacoes" 
                                value={currentEntregador?.observacoes || ''} 
                                onChange={(e) => setCurrentEntregador({ ...currentEntregador, observacoes: e.target.value })}
                                placeholder="Observações sobre o entregador"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="ativo">Ativo</Label>
                                <p className="text-xs text-muted-foreground">Se está disponível no sistema</p>
                            </div>
                            <Switch 
                                id="ativo"
                                checked={currentEntregador?.ativo ?? true} 
                                onCheckedChange={(checked) => setCurrentEntregador({ ...currentEntregador, ativo: checked })}
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

export default EntregadoresPage;
