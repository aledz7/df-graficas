import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Package, Tag, ImageOff } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { produtoService } from '@/services/api';
import { getImageUrl } from '@/lib/imageUtils';

const MarketplaceProdutoModal = ({ open, onOpenChange, onSelectProduto }) => {
    const [produtos, setProdutos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (open) {
                setIsLoading(true);
                try {
                    const response = await produtoService.getAll('?per_page=1000');
                    const produtosData = response.data?.data?.data || response.data?.data || response.data || [];
                    const produtosArray = Array.isArray(produtosData) ? produtosData : [];

                    // Filter active products
                    const isActive = (p) => p.status === true || p.status === 1 || String(p.status).toLowerCase() === 'ativo';
                    const produtosFiltrados = produtosArray.filter(isActive);

                    setProdutos(produtosFiltrados);
                } catch (error) {
                    console.error('Erro ao carregar produtos:', error);
                    toast({
                        title: "Erro ao carregar produtos",
                        description: "Não foi possível carregar a lista de produtos.",
                        variant: "destructive"
                    });
                    setProdutos([]);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        loadData();
    }, [open, toast]);

    const filteredProdutos = produtos.filter(p =>
        p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo_produto?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (produto) => {
        const precoBase = parseFloat(produto.preco_venda || 0);
        const precoPromocional = parseFloat(produto.preco_promocional || 0);
        const temPromocao = produto.promocao_ativa && precoPromocional > 0;
        const precoFinal = temPromocao ? precoPromocional : precoBase;

        onSelectProduto({
            id: produto.id,
            nome: produto.nome,
            preco_unitario: precoFinal,
            imagem: produto.imagem_principal,
            codigo: produto.codigo_produto
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Catálogo de Produtos</DialogTitle>
                    <DialogDescription>Selecione um produto para a venda.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <ScrollArea className="flex-grow mt-4">
                    {isLoading ? (
                        <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-full">
                            <Package size={48} className="mb-4" />
                            <p>Carregando produtos...</p>
                        </div>
                    ) : filteredProdutos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredProdutos.map(produto => (
                                <Card key={produto.id} className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col" onClick={() => handleSelect(produto)}>
                                    <CardContent className="p-3 flex flex-col flex-grow">
                                        <div className="relative">
                                            {produto.promocao_ativa && parseFloat(produto.preco_promocional || 0) > 0 && (
                                                <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-semibold px-2 py-0.5 rounded-bl-md z-10">
                                                    <Tag size={12} className="inline mr-1" />PROMO
                                                </div>
                                            )}
                                            {produto.imagem_principal ? (
                                                <img
                                                    src={getImageUrl(produto.imagem_principal)}
                                                    alt={produto.nome}
                                                    className="w-full h-32 object-contain rounded-t-md bg-gray-100 dark:bg-gray-800"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        const fallback = document.createElement('div');
                                                        fallback.className = 'w-full h-32 flex items-center justify-center bg-gray-100 rounded';
                                                        fallback.innerHTML = '<svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z"></path></svg>';
                                                        e.target.parentElement.appendChild(fallback);
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-32 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-t-md">
                                                    <ImageOff className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-2 flex flex-col flex-grow">
                                            <p className="font-semibold text-sm leading-snug flex-grow">{produto.nome}</p>
                                            <div className="mt-2">
                                                <p className="text-xs text-muted-foreground">
                                                    Estoque: {parseFloat(produto.estoque || 0)} {produto.unidade_medida}
                                                </p>
                                                <p className={`text-base font-bold mt-1 ${produto.promocao_ativa && parseFloat(produto.preco_promocional || 0) > 0 ? 'text-orange-500' : 'text-green-600 dark:text-green-400'}`}>
                                                    R$ {parseFloat(produto.promocao_ativa && parseFloat(produto.preco_promocional || 0) > 0 ? produto.preco_promocional : produto.preco_venda || 0).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-full">
                            <Package size={48} className="mb-4" />
                            <p>Nenhum produto encontrado.</p>
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default MarketplaceProdutoModal;
