import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Settings, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiDataManager } from '../lib/apiDataManager';
import { maquinaService } from '../services/api';

const initialMaquinaState = { id: null, nome: '', funcao: '', largura: '', ativo: true };

const MaquinasPage = () => {
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
                
                // Tentar carregar da API primeiro
                try {
                    const response = await maquinaService.getAll();
                    const maquinasArray = response.data || [];
                    setMaquinas(maquinasArray);
                    // Atualizar também o cache local para uso offline
                    await apiDataManager.setItem('maquinas', maquinasArray);
                } catch (error) {
                    console.error('❌ Erro ao carregar máquinas da API:', error);
                    // Fallback para dados locais em caso de erro
                    const storedData = await apiDataManager.getItem('maquinas');
                    const maquinasArray = Array.isArray(storedData) ? storedData : [];
                    setMaquinas(maquinasArray);
                    
                    toast({
                        title: "Aviso",
                        description: "Usando dados locais. Conexão com o servidor não disponível.",
                        variant: "warning"
                    });
                }
            } catch (error) {
                console.error('❌ Erro geral ao carregar máquinas:', error);
                setMaquinas([]);
                toast({ 
                    title: 'Erro ao carregar dados', 
                    description: 'Ocorreu um erro ao carregar as máquinas.', 
                    variant: 'destructive' 
                });
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, [toast]);

    const saveData = async (newData) => {
        try {
            setMaquinas(newData);
            await apiDataManager.setItem('maquinas', newData);
        } catch (error) {
            console.error('❌ Erro ao salvar máquinas:', error);
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
            setCurrentMaquina({ ...initialMaquinaState, id: null });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentMaquina.nome.trim()) {
            toast({ title: 'Nome inválido', description: 'O nome da máquina é obrigatório.', variant: 'destructive' });
            return;
        }
        
        try {
            let savedMaquina;
            
            if (isEditing) {
                // Atualizar máquina existente
                const response = await maquinaService.update(currentMaquina.id, currentMaquina);
                savedMaquina = response.data;
                toast({ title: 'Sucesso!', description: 'Máquina atualizada.' });
            } else {
                // Criar nova máquina
                const response = await maquinaService.create(currentMaquina);
                savedMaquina = response.data;
                toast({ title: 'Sucesso!', description: 'Máquina criada.' });
            }
            
            // Atualizar a lista de máquinas
            const updatedMaquinas = isEditing
                ? maquinas.map(m => m.id === currentMaquina.id ? savedMaquina : m)
                : [...maquinas, savedMaquina];
            
            setMaquinas(updatedMaquinas);
            await apiDataManager.setItem('maquinas', updatedMaquinas);
            setIsModalOpen(false);
        } catch (error) {
            console.error('❌ Erro ao salvar máquina:', error);
            toast({
                title: "Erro",
                description: "Não foi possível salvar a máquina. Tente novamente.",
                variant: "destructive"
            });
        }
    };

    const handleDelete = async (id) => {
        try {
            await maquinaService.delete(id);
            const updatedMaquinas = maquinas.filter(m => m.id !== id);
            setMaquinas(updatedMaquinas);
            await apiDataManager.setItem('maquinas', updatedMaquinas);
            toast({ title: 'Sucesso!', description: 'Máquina removida.' });
        } catch (error) {
            console.error('❌ Erro ao excluir máquina:', error);
            toast({
                title: "Erro",
                description: "Não foi possível excluir a máquina. Tente novamente.",
                variant: "destructive"
            });
        }
    };

    return (
        <>
            <div className="p-4 md:p-6 space-y-6">
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-3">
                            <Settings size={28} className="text-primary hidden sm:block" />
                            <div>
                                <CardTitle className="text-xl sm:text-2xl">Cadastro de Máquinas</CardTitle>
                                <CardDescription className="text-sm">Gerencie suas máquinas de produção e equipamentos.</CardDescription>
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
                                            <span>Carregando máquinas...</span>
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
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Nome / Marca</p>
                                                        <p className="font-semibold text-base break-words">{maq.nome}</p>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">Função</p>
                                                            <p className="text-sm font-medium break-words">{maq.funcao}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">Largura</p>
                                                            <p className="text-sm font-medium">{maq.largura}</p>
                                                        </div>
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
                                            <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                            <p>Nenhuma máquina cadastrada.</p>
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
                                            <TableHead>Nome / Marca</TableHead>
                                            <TableHead>Função</TableHead>
                                            <TableHead>Largura</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    <div className="flex items-center justify-center">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                                                        <span>Carregando máquinas...</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : Array.isArray(maquinas) && maquinas.length > 0 ? (
                                            maquinas.map(maq => (
                                                <TableRow key={maq.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <TableCell className="font-medium">{maq.nome}</TableCell>
                                                    <TableCell>{maq.funcao}</TableCell>
                                                    <TableCell>{maq.largura}</TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(maq)}><Edit size={16} /></Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(maq.id)} className="text-red-500"><Trash2 size={16} /></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    Nenhuma máquina cadastrada.
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Editar Máquina' : 'Nova Máquina'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="maquina-nome">Nome / Marca</Label>
                            <Input id="maquina-nome" value={currentMaquina.nome} onChange={(e) => setCurrentMaquina({ ...currentMaquina, nome: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="maquina-funcao">Função / Descrição</Label>
                            <Input id="maquina-funcao" value={currentMaquina.funcao} onChange={(e) => setCurrentMaquina({ ...currentMaquina, funcao: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="maquina-largura">Largura de Impressão/Trabalho</Label>
                            <Input id="maquina-largura" value={currentMaquina.largura} onChange={(e) => setCurrentMaquina({ ...currentMaquina, largura: e.target.value })} placeholder="Ex: 160 cm"/>
                        </div>
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

export default MaquinasPage;