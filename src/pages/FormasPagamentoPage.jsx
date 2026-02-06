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
import { PlusCircle, Edit, Trash2, CreditCard, Smartphone, Banknote, QrCode, Wallet, DollarSign, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { formaPagamentoService } from '@/services/formaPagamentoService';

const iconOptions = [
    { value: 'credit-card', label: 'Cartão de Crédito', icon: CreditCard },
    { value: 'smartphone', label: 'PIX/Mobile', icon: Smartphone },
    { value: 'banknote', label: 'Dinheiro', icon: Banknote },
    { value: 'qr-code', label: 'QR Code', icon: QrCode },
    { value: 'wallet', label: 'Carteira Digital', icon: Wallet },
    { value: 'dollar-sign', label: 'Outros', icon: DollarSign },
];

const getIconComponent = (iconValue) => {
    const option = iconOptions.find(opt => opt.value === iconValue);
    if (option) {
        const IconComponent = option.icon;
        return <IconComponent className="h-4 w-4" />;
    }
    return <CreditCard className="h-4 w-4" />;
};

const initialFormaPagamentoState = { 
    id: null, 
    nome: '', 
    codigo: '', 
    icone: 'credit-card', 
    ativo: true, 
    exibir_catalogo: true,
    ordem: 0 
};

const FormasPagamentoPage = () => {
    const { toast } = useToast();
    const [formasPagamento, setFormasPagamento] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentForma, setCurrentForma] = useState(initialFormaPagamentoState);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const response = await formaPagamentoService.getAll();
            setFormasPagamento(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar formas de pagamento:', error);
            toast({ 
                title: 'Erro ao carregar dados', 
                description: 'Ocorreu um erro ao carregar as formas de pagamento.', 
                variant: 'destructive' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenModal = (forma = null) => {
        if (forma) {
            setIsEditing(true);
            setCurrentForma(forma);
        } else {
            setIsEditing(false);
            const maxOrdem = formasPagamento.length > 0 
                ? Math.max(...formasPagamento.map(f => f.ordem || 0)) + 1 
                : 1;
            setCurrentForma({ ...initialFormaPagamentoState, ordem: maxOrdem });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentForma.nome.trim()) {
            toast({ title: 'Nome inválido', description: 'Informe o nome da forma de pagamento.', variant: 'destructive' });
            return;
        }

        try {
            setIsSaving(true);
            
            const dataToSave = {
                nome: currentForma.nome,
                codigo: currentForma.codigo || currentForma.nome.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                icone: currentForma.icone,
                ativo: currentForma.ativo,
                exibir_catalogo: currentForma.exibir_catalogo,
                ordem: currentForma.ordem
            };

            if (isEditing) {
                await formaPagamentoService.update(currentForma.id, dataToSave);
                toast({ title: 'Sucesso!', description: 'Forma de pagamento atualizada.' });
            } else {
                await formaPagamentoService.create(dataToSave);
                toast({ title: 'Sucesso!', description: 'Forma de pagamento criada.' });
            }
            
            await loadData();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Erro ao salvar forma de pagamento:', error);
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
        if (!confirm('Tem certeza que deseja excluir esta forma de pagamento?')) return;
        
        try {
            await formaPagamentoService.delete(id);
            await loadData();
            toast({ title: 'Sucesso!', description: 'Forma de pagamento removida.' });
        } catch (error) {
            console.error('Erro ao excluir forma de pagamento:', error);
            toast({ 
                title: 'Erro ao excluir', 
                description: error.response?.data?.message || 'Ocorreu um erro ao excluir.', 
                variant: 'destructive' 
            });
        }
    };

    const handleToggleAtivo = async (forma) => {
        try {
            await formaPagamentoService.update(forma.id, { ativo: !forma.ativo });
            await loadData();
            toast({ 
                title: 'Sucesso!', 
                description: `Forma de pagamento ${!forma.ativo ? 'ativada' : 'desativada'}.` 
            });
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            toast({ title: 'Erro ao alterar status', variant: 'destructive' });
        }
    };

    const handleToggleCatalogo = async (forma) => {
        try {
            await formaPagamentoService.update(forma.id, { exibir_catalogo: !forma.exibir_catalogo });
            await loadData();
            toast({ 
                title: 'Sucesso!', 
                description: `Forma de pagamento ${!forma.exibir_catalogo ? 'exibida' : 'ocultada'} no catálogo.` 
            });
        } catch (error) {
            console.error('Erro ao alterar exibição:', error);
            toast({ title: 'Erro ao alterar exibição', variant: 'destructive' });
        }
    };

    return (
        <>
            <div className="p-4 md:p-6 space-y-6">
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-3">
                            <CreditCard size={28} className="text-primary hidden sm:block" />
                            <div>
                                <CardTitle className="text-xl sm:text-2xl">Formas de Pagamento</CardTitle>
                                <CardDescription className="text-sm">
                                    Gerencie as formas de pagamento disponíveis no sistema e no catálogo público.
                                </CardDescription>
                            </div>
                        </div>
                        <Button 
                            onClick={() => handleOpenModal(null)}
                            className="w-full sm:w-auto"
                        >
                            <PlusCircle size={18} className="mr-2" /> Nova Forma de Pagamento
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
                                            <span>Carregando formas de pagamento...</span>
                                        </div>
                                    ) : formasPagamento.length > 0 ? (
                                        formasPagamento.map((forma) => (
                                            <motion.div
                                                key={forma.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-card rounded-lg shadow-md p-4 border"
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {getIconComponent(forma.icone)}
                                                            <span className="font-semibold text-base">{forma.nome}</span>
                                                        </div>
                                                        <Badge variant={forma.ativo ? "default" : "secondary"}>
                                                            {forma.ativo ? 'Ativo' : 'Inativo'}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">Exibir no Catálogo:</span>
                                                        <Switch
                                                            checked={forma.exibir_catalogo}
                                                            onCheckedChange={() => handleToggleCatalogo(forma)}
                                                        />
                                                    </div>

                                                    <div className="pt-3 border-t">
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                onClick={() => handleOpenModal(forma)}
                                                                className="flex-1"
                                                            >
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Editar
                                                            </Button>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                onClick={() => handleDelete(forma.id)}
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
                                            <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                            <p>Nenhuma forma de pagamento cadastrada.</p>
                                            <p className="text-sm mt-2">Clique em "Nova Forma de Pagamento" para adicionar.</p>
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
                                            <TableHead className="w-12">Ordem</TableHead>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Código</TableHead>
                                            <TableHead className="text-center">Ativo</TableHead>
                                            <TableHead className="text-center">Exibir no Catálogo</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    <div className="flex items-center justify-center">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                                                        <span>Carregando formas de pagamento...</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : formasPagamento.length > 0 ? (
                                            formasPagamento.map(forma => (
                                                <TableRow key={forma.id} className="hover:bg-muted/50">
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <GripVertical className="h-4 w-4" />
                                                            {forma.ordem}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {getIconComponent(forma.icone)}
                                                            <span className="font-medium">{forma.nome}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {forma.codigo}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Switch
                                                            checked={forma.ativo}
                                                            onCheckedChange={() => handleToggleAtivo(forma)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Switch
                                                            checked={forma.exibir_catalogo}
                                                            onCheckedChange={() => handleToggleCatalogo(forma)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(forma)}>
                                                            <Edit size={16} />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => handleDelete(forma.id)} 
                                                            className="text-red-500"
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    <div className="text-muted-foreground">
                                                        <p>Nenhuma forma de pagamento cadastrada.</p>
                                                        <p className="text-sm mt-1">Clique em "Nova Forma de Pagamento" para adicionar.</p>
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="forma-nome">Nome *</Label>
                            <Input 
                                id="forma-nome" 
                                value={currentForma.nome} 
                                onChange={(e) => setCurrentForma({ ...currentForma, nome: e.target.value })}
                                placeholder="Ex: Cartão de Crédito"
                            />
                        </div>
                        
                        <div>
                            <Label htmlFor="forma-codigo">Código (opcional)</Label>
                            <Input 
                                id="forma-codigo" 
                                value={currentForma.codigo} 
                                onChange={(e) => setCurrentForma({ ...currentForma, codigo: e.target.value })}
                                placeholder="Ex: cartao_credito"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Se não informado, será gerado automaticamente.
                            </p>
                        </div>

                        <div>
                            <Label>Ícone</Label>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                {iconOptions.map(option => {
                                    const IconComponent = option.icon;
                                    return (
                                        <Button
                                            key={option.value}
                                            type="button"
                                            variant={currentForma.icone === option.value ? "default" : "outline"}
                                            size="sm"
                                            className="flex items-center gap-2"
                                            onClick={() => setCurrentForma({ ...currentForma, icone: option.value })}
                                        >
                                            <IconComponent className="h-4 w-4" />
                                            <span className="text-xs">{option.label}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="forma-ordem">Ordem de exibição</Label>
                            <Input 
                                id="forma-ordem" 
                                type="number"
                                min="0"
                                value={currentForma.ordem} 
                                onChange={(e) => setCurrentForma({ ...currentForma, ordem: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="forma-ativo">Ativo</Label>
                                <p className="text-xs text-muted-foreground">Se está disponível no sistema</p>
                            </div>
                            <Switch 
                                id="forma-ativo"
                                checked={currentForma.ativo} 
                                onCheckedChange={(checked) => setCurrentForma({ ...currentForma, ativo: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="forma-catalogo">Exibir no Catálogo Público</Label>
                                <p className="text-xs text-muted-foreground">Se aparece como opção no checkout</p>
                            </div>
                            <Switch 
                                id="forma-catalogo"
                                checked={currentForma.exibir_catalogo} 
                                onCheckedChange={(checked) => setCurrentForma({ ...currentForma, exibir_catalogo: checked })}
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

export default FormasPagamentoPage;
