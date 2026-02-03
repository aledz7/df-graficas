import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, ListChecks, ChevronDown, ChevronRight, Palette, Ruler, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { productCategoryService, corService, tamanhoService, subcategoriaService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AttributeManager = ({ attributeName, attributeKey, toast }) => {
    const [items, setItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState({ id: null, nome: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Determinar qual serviço usar com base no attributeKey
    const getService = () => {
        if (attributeKey === 'cores') return corService;
        if (attributeKey === 'tamanhos') return tamanhoService;
        return null;
    };
    
    const service = getService();

    useEffect(() => {
        loadItems();
    }, [attributeKey]);
    
    const loadItems = async () => {
        setLoading(true);
        try {
            if (service) {
                const response = await service.getAll();
                // Usar a mesma lógica das páginas que funcionam (CoresPage e TamanhosPage)
                const itemsData = response.data?.data?.data || response.data?.data || response.data || [];
                setItems(Array.isArray(itemsData) ? itemsData : []);
            } else {
                // Fallback para localStorage se não houver serviço correspondente
                const storedItems = JSON.parse(await apiDataManager.getItem(attributeKey) || '[]');
                setItems(Array.isArray(storedItems) ? storedItems : []);
            }
        } catch (error) {
            console.error(`Erro ao carregar ${attributeName}:`, error);
            toast({ 
                title: `Erro ao carregar ${attributeName}`, 
                description: `Não foi possível carregar os dados do servidor.`, 
                variant: 'destructive' 
            });
            // Em caso de erro, garantir que items seja um array vazio
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setIsEditing(true);
            setCurrentItem(item);
        } else {
            setIsEditing(false);
            setCurrentItem({ id: null, nome: '' });
        }
        setIsModalOpen(true);
    };
    
    const handleSave = async () => {
        if (!currentItem.nome.trim()) {
            toast({ title: 'Nome inválido', description: `O nome do ${attributeName.toLowerCase()} não pode ser vazio.`, variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            if (service) {
                // Usar o serviço da API
                if (isEditing) {
                    // Atualizar item existente
                    await service.update(currentItem.id, { nome: currentItem.nome });
                    toast({ title: 'Sucesso', description: `${attributeName} atualizado.` });
                } else {
                    // Criar novo item
                    await service.create({ nome: currentItem.nome });
                    toast({ title: 'Sucesso', description: `Novo ${attributeName.toLowerCase()} adicionado.` });
                }
                // Recarregar os itens para garantir consistência
                await loadItems();
            } else {
                // Fallback para localStorage
                let newItems = [...items];
                if (isEditing) {
                    newItems = newItems.map(item => item.id === currentItem.id ? currentItem : item);
                    toast({ title: 'Sucesso', description: `${attributeName} atualizado.` });
                } else {
                    newItems.push({ id: `${attributeKey}-${Date.now()}`, nome: currentItem.nome });
                    toast({ title: 'Sucesso', description: `Novo ${attributeName.toLowerCase()} adicionado.` });
                }
                setItems(newItems);
                await apiDataManager.setItem(attributeKey, newItems);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(`Erro ao salvar ${attributeName}:`, error);
            toast({ 
                title: `Erro ao salvar ${attributeName}`, 
                description: `Não foi possível salvar os dados no servidor.`, 
                variant: 'destructive' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        setLoading(true);
        try {
            if (service) {
                // Usar o serviço da API
                await service.delete(id);
                toast({ title: 'Sucesso', description: `${attributeName} removido.` });
                // Recarregar os itens para garantir consistência
                await loadItems();
            } else {
                // Fallback para localStorage
                const newItems = items.filter(item => item.id !== id);
                setItems(newItems);
                await apiDataManager.setItem(attributeKey, newItems);
                toast({ title: 'Sucesso', description: `${attributeName} removido.` });
            }
        } catch (error) {
            console.error(`Erro ao excluir ${attributeName}:`, error);
            toast({ 
                title: `Erro ao excluir ${attributeName}`, 
                description: `Não foi possível excluir os dados do servidor.`, 
                variant: 'destructive' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <CardContent>
            <Button onClick={() => handleOpenModal()} className="mb-4" disabled={loading}>
                <PlusCircle size={18} className="mr-2" /> Novo {attributeName}
            </Button>
            <ScrollArea className="h-[calc(100vh-22rem)]">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2">Carregando {attributeName.toLowerCase()}...</span>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!Array.isArray(items) || items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center py-4">Nenhum {attributeName.toLowerCase()} encontrado</TableCell>
                                </TableRow>
                            ) : (
                                items.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.nome}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)} disabled={loading}><Edit size={16} /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-500" disabled={loading}><Trash2 size={16} /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </ScrollArea>
             <Dialog open={isModalOpen} onOpenChange={(open) => !loading && setIsModalOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditing ? `Editar ${attributeName}` : `Novo ${attributeName}`}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="item-name">Nome</Label>
                        <Input 
                            id="item-name" 
                            value={currentItem.nome} 
                            onChange={(e) => setCurrentItem({ ...currentItem, nome: e.target.value })} 
                            disabled={loading}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" disabled={loading}>Cancelar</Button>
                        </DialogClose>
                        <Button 
                            onClick={handleSave} 
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                isEditing ? 'Salvar Alterações' : `Criar ${attributeName}`
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </CardContent>
    );
};

const CategoryManager = ({ toast }) => {
    const [categories, setCategories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState({ id: null, nome: '', parentId: null });
    const [isEditing, setIsEditing] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadCategories();
    }, []);
    
    const loadCategories = async () => {
        setLoading(true);
        try {
            // Carregar categorias principais
            const categoriesResponse = await productCategoryService.getAll();
            
            // Processar categorias
            let categoriesData = [];
            if (categoriesResponse && categoriesResponse.data) {
                categoriesData = Array.isArray(categoriesResponse.data) ? 
                    categoriesResponse.data : categoriesResponse.data.data || [];
            }
            
            // Carregar subcategorias para cada categoria
            const categoriesWithSubs = await Promise.all(categoriesData.map(async (category) => {
                try {
                    // Buscar subcategorias para esta categoria
                    const subsResponse = await subcategoriaService.porCategoria(category.id);
                    
                    // O backend retorna dados paginados: { success: true, message: "...", data: { data: [...], current_page: 1, ... } }
                    const subcategoriasData = subsResponse.data?.data?.data || subsResponse.data?.data || subsResponse.data || [];
                    const subcategorias = Array.isArray(subcategoriasData) ? subcategoriasData : [];
       
                    // Retornar categoria com suas subcategorias
                    return {
                        ...category,
                        subcategorias: subcategorias
                    };
                } catch (error) {
                    console.error(`Erro ao carregar subcategorias para categoria ${category.id}:`, error);
                    return {
                        ...category,
                        subcategorias: []
                    };
                }
            }));
            
            setCategories(categoriesWithSubs);
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            toast({ 
                title: 'Erro ao carregar categorias', 
                description: 'Não foi possível carregar as categorias do servidor.', 
                variant: 'destructive' 
            });
            setCategories([]); // Garante que categories seja sempre um array
        } finally {
            setLoading(false);
        }
    };

    const saveCategories = async (newCategories) => {
        setLoading(true);
        try {
            // Atualiza o estado local imediatamente para melhor UX
            setCategories(newCategories);
            
            // Se estamos editando, fazemos um update
            if (isEditing && currentCategory.id) {
                await productCategoryService.update(currentCategory.id, currentCategory);
            } 
            // Se estamos criando uma nova categoria
            else {
                await productCategoryService.create(currentCategory);
            }
            
            // Recarrega as categorias do servidor para garantir consistência
            await loadCategories();
        } catch (error) {
            console.error('Erro ao salvar categoria:', error);
            toast({ 
                title: 'Erro ao salvar categoria', 
                description: 'Não foi possível salvar a categoria no servidor.', 
                variant: 'destructive' 
            });
            // Recarrega as categorias para restaurar o estado consistente
            await loadCategories();
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (category = null, parentId = null) => {
        if (category) {
            setIsEditing(true);
            setCurrentCategory({ id: category.id, nome: category.nome, tipo: category.tipo || '', parentId: parentId });
        } else {
            setIsEditing(false);
            setCurrentCategory({ id: null, nome: '', tipo: '', parentId });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentCategory.nome.trim()) {
            toast({ title: 'Nome inválido', description: 'O nome da categoria não pode ser vazio.', variant: 'destructive' });
            return;
        }

        if (!currentCategory.tipo) {
            toast({ title: 'Tipo obrigatório', description: 'Por favor, selecione um tipo para a categoria.', variant: 'destructive' });
            return;
        }

        try {
            setLoading(true);
            if (isEditing) {
                // Verificar se estamos editando uma subcategoria (tem parentId) ou uma categoria principal
                if (currentCategory.parentId) {
                    // Enviar apenas o campo nome atualizado para a subcategoria
                    const updateData = {
                        nome: currentCategory.nome
                    };
                    
                    await subcategoriaService.update(currentCategory.id, updateData);
                    toast({ title: 'Sucesso', description: 'Subcategoria atualizada.' });
                    
                    // Expandir automaticamente a categoria pai para mostrar a subcategoria atualizada
                    setExpandedCategories(prev => ({ ...prev, [currentCategory.parentId]: true }));
                } else {
                    // Buscar a categoria atual para obter todos os campos
                    const existingCategory = categories.find(cat => cat.id === currentCategory.id);
                    
                    if (!existingCategory) {
                        throw new Error('Categoria não encontrada');
                    }
                    
                    // Enviar apenas o campo nome atualizado, mantendo os outros campos inalterados
                    const updateData = {
                        nome: currentCategory.nome,
                        tipo: currentCategory.tipo
                    };
                    
                    await productCategoryService.update(currentCategory.id, updateData);
                    toast({ title: 'Sucesso', description: 'Categoria atualizada.' });
                }
                
                // Forçar recarregamento completo das categorias para atualizar a UI
                await loadCategories();
            } else if (currentCategory.parentId) {
                try {
                    // Criar nova subcategoria
                    const response = await subcategoriaService.create({
                        nome: currentCategory.nome
                    });
                    toast({ title: 'Sucesso', description: 'Nova subcategoria adicionada.' });
                    
                    // Expandir automaticamente a categoria pai para mostrar a nova subcategoria
                    setExpandedCategories(prev => ({ ...prev, [currentCategory.parentId]: true }));
                    
                    // Recarregar categorias para mostrar a nova subcategoria
                    await loadCategories();
                } catch (error) {
                    toast({ 
                        title: 'Erro ao criar subcategoria', 
                        description: 'Não foi possível criar a subcategoria. ' + (error.response?.data?.message || ''),
                        variant: 'destructive' 
                    });
                }
            } else {
                // Criar nova categoria principal
                await productCategoryService.create({
                    nome: currentCategory.nome,
                    tipo: currentCategory.tipo
                });
                toast({ title: 'Sucesso', description: 'Nova categoria adicionada.' });
            }
            
            // Recarregar categorias do servidor
            await loadCategories();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Erro ao salvar categoria:', error);
            
            let errorMessage = 'Não foi possível salvar a categoria no servidor.';
            
            if (error.response?.status === 400) {
                if (error.response?.data?.message?.includes('Duplicate entry') || 
                    error.response?.data?.message?.includes('duplicate')) {
                    errorMessage = 'Já existe uma categoria com este nome. Por favor, escolha um nome diferente.';
                } else {
                    errorMessage = error.response?.data?.message || errorMessage;
                }
            } else if (error.response?.status === 422) {
                errorMessage = 'Dados inválidos. Verifique os campos obrigatórios.';
            }
            
            toast({ 
                title: 'Erro ao salvar categoria', 
                description: errorMessage, 
                variant: 'destructive' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, parentId = null) => {
        try {
            setLoading(true);
            
            if (parentId) {
                // Se tem parentId, é uma subcategoria
                await subcategoriaService.delete(id);
                toast({ title: 'Sucesso', description: 'Subcategoria removida.' });
            } else {
                // Se não tem parentId, é uma categoria principal
                await productCategoryService.delete(id);
                toast({ title: 'Sucesso', description: 'Categoria removida.' });
            }
            
            // Recarregar categorias do servidor
            await loadCategories();
        } catch (error) {
            console.error('Erro ao excluir categoria:', error);
            toast({ 
                title: 'Erro ao excluir categoria', 
                description: 'Não foi possível excluir a categoria do servidor.', 
                variant: 'destructive' 
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (categoryId) => {
        setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
    };

    return (
        <CardContent>
             <Button onClick={() => handleOpenModal(null, null)} className="mb-4" disabled={loading}>
                <PlusCircle size={18} className="mr-2" /> Nova Categoria Principal
            </Button>
            {loading && <div className="text-center py-2 text-muted-foreground">Carregando...</div>}
            <ScrollArea className="h-[calc(100vh-22rem)]">
                {!Array.isArray(categories) || categories.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">Nenhuma categoria encontrada</div>
                ) : (
                    categories.map(cat => (
                    <div key={cat.id} className="border-b last:border-b-0">
                        <div className="flex items-center justify-between p-2 hover:bg-accent">
                            <div className="flex items-center">
                                <Button variant="ghost" size="icon" onClick={() => toggleExpand(cat.id)} className="h-8 w-8">
                                    {(cat.subcategorias && cat.subcategorias.length > 0) ? (
                                        expandedCategories[cat.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                                    ) : <span className="w-8"></span>}
                                </Button>
                                <span className="font-medium">{cat.nome}</span>
                            </div>
                            <div className="space-x-1">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenModal(null, cat.id)} title="Adicionar Subcategoria" className="text-blue-600"><PlusCircle size={16} /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenModal(cat, null)} title="Editar Categoria"><Edit size={16} /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} title="Deletar Categoria" className="text-red-500"><Trash2 size={16} /></Button>
                            </div>
                        </div>
                        <AnimatePresence>
                            {expandedCategories[cat.id] && cat.subcategorias && cat.subcategorias.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="pl-10 space-y-1 py-1"
                                >
                                    {/* Renderizar subcategorias */}
                                    {cat.subcategorias.map(sub => (
                                        <div key={sub.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50">
                                            <span className="ml-6 text-sm">{sub.nome}</span>
                                            <div className="space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenModal(sub, cat.id)} title="Editar Subcategoria"><Edit size={14} /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(sub.id, cat.id)} title="Deletar Subcategoria" className="text-red-500"><Trash2 size={14} /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))
                )}
            </ScrollArea>
             <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
                        <DialogDescription>{currentCategory.parentId ? `Adicionando subcategoria em "${categories.find(c => c.id === currentCategory.parentId)?.nome}"` : 'Crie uma nova categoria principal.'}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="category-name">Nome</Label>
                        <Input id="category-name" value={currentCategory.nome} onChange={(e) => setCurrentCategory({ ...currentCategory, nome: e.target.value })} />
                    </div>
                    <div className="py-4">
                        <Label htmlFor="category-type">Tipo</Label>
                        <Select value={currentCategory.tipo} onValueChange={(value) => setCurrentCategory({ ...currentCategory, tipo: value })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="produto">Produto</SelectItem>
                                <SelectItem value="financeiro">Financeiro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleSave}>{isEditing ? 'Salvar Alterações' : 'Criar Categoria'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </CardContent>
    )
}

const CategoriasPage = () => {
    const { toast } = useToast();

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-3">
                        <ListChecks size={28} className="text-primary" />
                        <div>
                            <CardTitle className="text-2xl">Gestão de Categorias e Atributos</CardTitle>
                            <CardDescription>Organize seus produtos e os atributos para as variações.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <Tabs defaultValue="categorias" className="w-full">
                    <TabsList className="m-6">
                        <TabsTrigger value="categorias"><ListChecks className="mr-2 h-4 w-4" />Categorias</TabsTrigger>
                        <TabsTrigger value="cores"><Palette className="mr-2 h-4 w-4" />Cores</TabsTrigger>
                        <TabsTrigger value="tamanhos"><Ruler className="mr-2 h-4 w-4" />Tamanhos</TabsTrigger>
                    </TabsList>
                    <TabsContent value="categorias">
                        <CategoryManager toast={toast} />
                    </TabsContent>
                    <TabsContent value="cores">
                        <AttributeManager attributeName="Cor" attributeKey="cores" toast={toast}/>
                    </TabsContent>
                    <TabsContent value="tamanhos">
                        <AttributeManager attributeName="Tamanho" attributeKey="tamanhos" toast={toast}/>
                    </TabsContent>
                </Tabs>
            </Card>
        </div>
    );
};

export default CategoriasPage;