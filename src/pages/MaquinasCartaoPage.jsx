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
import { PlusCircle, Edit, Trash2, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiDataManager } from '../lib/apiDataManager';

const initialMaquinaState = { id: null, nome: '', taxas: [] };
const taxaTipos = ['Débito', 'Crédito à Vista', 'Crédito Parcelado'];

const MaquinasCartaoPage = () => {
    const { toast } = useToast();
    const [maquinas, setMaquinas] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMaquina, setCurrentMaquina] = useState(initialMaquinaState);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                
                // Usar getData() que é mais robusto e lida diretamente com os dados da API
                const storedData = await apiDataManager.getData('maquinasCartao', []);
                
                // Extrair os dados da resposta da API se necessário
                let parsedData = [];
                if (Array.isArray(storedData)) {
                    parsedData = storedData;
                } else if (storedData && storedData.data && Array.isArray(storedData.data)) {
                    parsedData = storedData.data;
                } else if (storedData && Array.isArray(storedData.success)) {
                    // Fallback caso a estrutura seja diferente
                    parsedData = [];
                }
                
                setMaquinas(parsedData);
            } catch (error) {
                console.error('❌ Erro ao carregar máquinas de cartão:', error);
                setMaquinas([]);
                toast({ 
                    title: 'Erro ao carregar dados', 
                    description: 'Ocorreu um erro ao carregar as máquinas de cartão.', 
                    variant: 'destructive' 
                });
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, []);

    const saveData = async (newData) => {
        try {
            setMaquinas(newData);
            await apiDataManager.setData('maquinasCartao', newData);
        } catch (error) {
            console.error('❌ Erro ao salvar máquinas de cartão:', error);
            toast({ 
                title: 'Erro ao salvar', 
                description: 'Ocorreu um erro ao salvar os dados.', 
                variant: 'destructive' 
            });
        }
    };

    const handleOpenModal = (maquina = null) => {
        if (maquina) {
            setIsEditing(true);
            setCurrentMaquina(maquina);
        } else {
            setIsEditing(false);
            setCurrentMaquina({ ...initialMaquinaState, id: `mc-${Date.now()}`, taxas: [{ id: `t-${Date.now()}`, tipo: 'Débito', parcelas: 1, valor: '' }] });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!currentMaquina.nome.trim()) {
            toast({ title: 'Nome inválido', variant: 'destructive' });
            return;
        }
        if (currentMaquina.taxas.some(t => !t.tipo || !t.parcelas || !t.valor)) {
            toast({ title: 'Taxas incompletas', description: 'Preencha todos os campos de todas as taxas.', variant: 'destructive' });
            return;
        }

        // Garantir que maquinas seja um array
        const currentMaquinas = Array.isArray(maquinas) ? maquinas : [];
        const newData = isEditing
            ? currentMaquinas.map(m => m.id === currentMaquina.id ? currentMaquina : m)
            : [...currentMaquinas, currentMaquina];
        
        saveData(newData);
        toast({ title: 'Sucesso!', description: 'Máquina de cartão salva.' });
        setIsModalOpen(false);
    };
    
    const handleDelete = (id) => {
        // Garantir que maquinas seja um array
        const currentMaquinas = Array.isArray(maquinas) ? maquinas : [];
        saveData(currentMaquinas.filter(m => m.id !== id));
        toast({ title: 'Sucesso!', description: 'Máquina removida.' });
    };

    const handleTaxaChange = (index, field, value) => {
        const newTaxas = [...currentMaquina.taxas];
        newTaxas[index][field] = value;
        if (field === 'tipo' && value !== 'Crédito Parcelado') {
          newTaxas[index]['parcelas'] = 1;
        }
        setCurrentMaquina({ ...currentMaquina, taxas: newTaxas });
    };

    const addTaxa = () => {
        setCurrentMaquina({ ...currentMaquina, taxas: [...currentMaquina.taxas, { id: `t-${Date.now()}`, tipo: 'Crédito Parcelado', parcelas: 2, valor: '' }] });
    };

    const removeTaxa = (index) => {
        const newTaxas = currentMaquina.taxas.filter((_, i) => i !== index);
        setCurrentMaquina({ ...currentMaquina, taxas: newTaxas });
    };

    return (
        <>
            <div className="p-4 md:p-6 space-y-6">
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-3">
                            <CreditCard size={28} className="text-primary hidden sm:block" />
                            <div>
                                <CardTitle className="text-xl sm:text-2xl">Máquinas de Cartão e Taxas</CardTitle>
                                <CardDescription className="text-sm">Gerencie suas máquinas de cartão e as taxas de parcelamento.</CardDescription>
                            </div>
                        </div>
                        <Button 
                            onClick={() => handleOpenModal(null)}
                            className="w-full sm:w-auto"
                        >
                            <PlusCircle size={18} className="mr-2" /> Nova Máquina
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
                                            <span>Carregando máquinas de cartão...</span>
                                        </div>
                                    ) : Array.isArray(maquinas) && maquinas.length > 0 ? (
                                        maquinas.map((maq) => (
                                            <motion.div
                                                key={maq.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
                                            >
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Nome da Máquina</p>
                                                        <p className="font-semibold text-base break-words">{maq.nome}</p>
                                                    </div>
                                                    
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Taxas Configuradas</p>
                                                        <p className="text-sm font-medium">{maq.taxas?.length || 0} taxa(s) configurada(s)</p>
                                                    </div>

                                                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                onClick={() => handleOpenModal(maq)}
                                                                className="flex-1 text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                                                            >
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Editar
                                                            </Button>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                onClick={() => handleDelete(maq.id)}
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
                                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                            <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                            <p>Nenhuma máquina de cartão cadastrada.</p>
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
                                            <TableHead>Nome da Máquina</TableHead>
                                            <TableHead>Taxas Config...</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center">
                                                    <div className="flex items-center justify-center">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                                                        <span>Carregando máquinas de cartão...</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : Array.isArray(maquinas) && maquinas.length > 0 ? (
                                            maquinas.map(maq => (
                                                <TableRow key={maq.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <TableCell className="font-medium">{maq.nome}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {maq.taxas?.length || 0} taxa(s) configurada(s)
                                                    </TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(maq)}><Edit size={16} /></Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(maq.id)} className="text-red-500"><Trash2 size={16} /></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center">
                                                    Nenhuma máquina de cartão cadastrada.
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
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Editar Máquina' : 'Nova Máquina de Cartão'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="maquina-nome">Nome da Máquina</Label>
                            <Input id="maquina-nome" value={currentMaquina.nome} onChange={(e) => setCurrentMaquina({ ...currentMaquina, nome: e.target.value })} />
                        </div>
                        <Card>
                            <CardHeader><CardTitle className="text-base">Configuração de Taxas</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="max-h-64 overflow-y-auto border rounded-md p-2">
                                    {currentMaquina.taxas.map((taxa, index) => (
                                        <div key={taxa.id} className="grid grid-cols-4 gap-2 items-center p-2 border rounded-md mb-2 last:mb-0">
                                            <Select value={taxa.tipo} onValueChange={(val) => handleTaxaChange(index, 'tipo', val)}>
                                                <SelectTrigger><SelectValue placeholder="Tipo"/></SelectTrigger>
                                                <SelectContent>{taxaTipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <Input type="number" placeholder="Parcelas" value={taxa.parcelas} onChange={(e) => handleTaxaChange(index, 'parcelas', parseInt(e.target.value))} disabled={taxa.tipo !== 'Crédito Parcelado'}/>
                                            <Input type="number" placeholder="Taxa (%)" value={taxa.valor} onChange={(e) => handleTaxaChange(index, 'valor', e.target.value)} />
                                            <Button variant="ghost" size="icon" onClick={() => removeTaxa(index)} className="text-red-500"><Trash2 size={16}/></Button>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" onClick={addTaxa} className="w-full mt-2"><PlusCircle size={16} className="mr-2"/> Adicionar Taxa</Button>
                            </CardContent>
                        </Card>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleSave}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default MaquinasCartaoPage;