import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, Package, Share2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { motion } from 'framer-motion';
import { calcularEstoqueTotal } from '@/utils/estoqueUtils';

// Função para obter a URL completa da imagem
export const getImageUrl = (path) => {
  if (!path) return null;
  
  // Obter a URL base da API do ambiente
  const apiBaseUrl = import.meta.env.VITE_API_URL;
  
  // Se o caminho já começar com /storage, não adicionar novamente
  if (path.startsWith('/storage')) {
    return `${apiBaseUrl}${path}`;
  }
  
  // Se o caminho começar com tenants/, adicionar /storage/ antes
  if (path.startsWith('tenants/')) {
    return `${apiBaseUrl}/storage/${path}`;
  }
  
  return `${apiBaseUrl}/storage/${path}`;
};


const ProdutoList = ({ 
    produtos, 
    onEdit, 
    onDelete, 
    onShare,
    selectedProdutos, 
    setSelectedProdutos 
}) => {
    const [produtoParaDeletar, setProdutoParaDeletar] = React.useState(null);

    const handleDeleteConfirm = () => {
        if (produtoParaDeletar) {
            onDelete(produtoParaDeletar);
            setProdutoParaDeletar(null);
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedProdutos(produtos.map(p => p.id));
        } else {
            setSelectedProdutos([]);
        }
    };

    const handleSelectRow = (produtoId, checked) => {
        if (checked) {
            setSelectedProdutos(prev => [...prev, produtoId]);
        } else {
            setSelectedProdutos(prev => prev.filter(id => id !== produtoId));
        }
    };

    const isAllSelected = produtos.length > 0 && selectedProdutos.length === produtos.length;

    return (
        <>
            <Card className="flex-grow flex flex-col">
                <CardContent className="p-0 flex-grow">
                    {/* Visualização em Cards para Mobile */}
                    <div className="md:hidden">
                        <ScrollArea className="h-full">
                            <div className="space-y-4 p-4 pr-2">
                                {produtos.length > 0 ? produtos.map(produto => (
                                    <motion.div
                                        key={produto.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border ${
                                            selectedProdutos.includes(produto.id) ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <Checkbox
                                                    checked={selectedProdutos.includes(produto.id)}
                                                    onCheckedChange={(checked) => handleSelectRow(produto.id, checked)}
                                                    aria-label={`Selecionar ${produto.nome}`}
                                                    className="mt-1 flex-shrink-0"
                                                />
                                                {produto.imagem_principal ? (
                                                    <img src={getImageUrl(produto.imagem_principal)} alt={produto.nome} className="h-16 w-16 object-cover rounded-md border flex-shrink-0" />
                                                ) : (
                                                    <div className="h-16 w-16 flex items-center justify-center bg-muted rounded-md flex-shrink-0">
                                                        <Package className="h-8 w-8 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-base break-words mb-1">{produto.nome}</p>
                                                    <Badge variant={produto.status ? 'default' : 'destructive'} className="text-xs">
                                                        {produto.status ? 'Ativo' : 'Inativo'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Código</p>
                                                    <p className="text-sm font-medium">{produto.codigo_produto}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Estoque</p>
                                                    <p className="text-sm font-medium">{calcularEstoqueTotal(produto).toString()}</p>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Preço de Venda</p>
                                                <p className="text-lg font-bold text-primary">R$ {parseFloat(produto.preco_venda || 0).toFixed(2)}</p>
                                            </div>

                                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex gap-2">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => onShare(produto)}
                                                        className="flex-1 text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                                                    >
                                                        <Share2 className="mr-2 h-4 w-4" />
                                                        Compartilhar
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => onEdit(produto)}
                                                        className="flex-1 text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                                                    >
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Editar
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => setProdutoParaDeletar(produto)}
                                                        className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )) : (
                                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                        <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                        <p>Nenhum produto encontrado.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Visualização em Tabela para Desktop */}
                    <div className="hidden md:block h-full">
                        <ScrollArea className="h-full">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card z-10">
                                    <TableRow>
                                        <TableHead className="w-12 text-center">
                                            <Checkbox
                                                checked={isAllSelected}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Selecionar todos"
                                            />
                                        </TableHead>
                                        <TableHead className="w-16 text-center">Imagem</TableHead>
                                        <TableHead>Produto</TableHead>
                                        <TableHead>Código</TableHead>
                                        <TableHead className="text-center">Estoque</TableHead>
                                        <TableHead className="text-right">Preço de Venda</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {produtos.length > 0 ? produtos.map(produto => (
                                        <TableRow key={produto.id} data-state={selectedProdutos.includes(produto.id) ? 'selected' : ''} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={selectedProdutos.includes(produto.id)}
                                                    onCheckedChange={(checked) => handleSelectRow(produto.id, checked)}
                                                    aria-label={`Selecionar ${produto.nome}`}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center">
                                                    {produto.imagem_principal ? (
                                                        <img src={getImageUrl(produto.imagem_principal)} alt={produto.nome} className="h-10 w-10 object-cover rounded-md border" />
                                                    ) : (
                                                        <div className="h-10 w-10 flex items-center justify-center bg-muted rounded-md">
                                                            <Package className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{produto.nome}</TableCell>
                                            <TableCell>{produto.codigo_produto}</TableCell>
                                            <TableCell className="text-center">
                                                {calcularEstoqueTotal(produto).toString()}
                                            </TableCell>
                                            <TableCell className="text-right">R$ {parseFloat(produto.preco_venda || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={produto.status ? 'default' : 'destructive'}>
                                                    {produto.status ? 'Ativo' : 'Inativo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        onClick={() => onShare(produto)}
                                                        title="Compartilhar produto"
                                                    >
                                                        <Share2 className="h-4 w-4" />
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => onEdit(produto)}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-500" onClick={() => setProdutoParaDeletar(produto)}><Trash2 className="mr-2 h-4 w-4"/>Deletar</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center">Nenhum produto encontrado.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={!!produtoParaDeletar} onOpenChange={(open) => {
                if (!open) setProdutoParaDeletar(null);
            }}>
                <AlertDialogContent className="w-[95vw] sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso irá deletar permanentemente o produto "{produtoParaDeletar?.nome}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="w-full sm:w-auto bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default ProdutoList;