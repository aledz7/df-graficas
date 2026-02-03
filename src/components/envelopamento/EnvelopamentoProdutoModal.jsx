import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Package, Tag, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { Link } from 'react-router-dom';
import { produtoService, corService, tamanhoService } from '@/services/api';
import { getImageUrl } from '@/lib/imageUtils';
import EnvelopamentoVariationsModal from './EnvelopamentoVariationsModal';

const EnvelopamentoProdutoModal = ({ open, onOpenChange, onSelectProduto }) => {
    const [produtos, setProdutos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    
    // Estados para modal de variações
    const [isVariationsModalOpen, setIsVariationsModalOpen] = useState(false);
    const [selectedProdutoForVariations, setSelectedProdutoForVariations] = useState(null);
    
    // Estados para cores e tamanhos
    const [productColors, setProductColors] = useState([]);
    const [productSizes, setProductSizes] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            if (open) {
                setIsLoading(true);
                try {
                    const response = await produtoService.getAll('?per_page=1000');
                    const produtosData = response.data?.data?.data || response.data?.data || response.data || [];
                    const produtosArray = Array.isArray(produtosData) ? produtosData : [];
                    
                    // Helpers para normalização
                    const isActive = (p) => p.status === true || p.status === 1 || String(p.status).toLowerCase() === 'ativo';

                    // Filtrar produtos ativos e incluir produtos com variações ativas
                    const produtosFiltrados = produtosArray.filter(p => {
                        if (!isActive(p)) return false;
                        
                        // Incluir produtos normais e produtos com variações ativas
                        return true; // Por enquanto incluir todos os produtos ativos
                        
                        // Opcional: descomentar para filtrar apenas produtos em m²
                        // const unidade = (p.unidade_medida || '').toLowerCase();
                        // const temPrecoM2 = parseFloat(p.preco_m2 || 0) > 0;
                        // return unidade === 'm²' || unidade === 'm2' || unidade === 'metro_quadrado' || temPrecoM2;
                    });

                    console.log('Produtos carregados para envelopamento:', produtosFiltrados.length);
                    console.log('Produtos com variações:', produtosFiltrados.filter(p => p.variacoes_ativa).length);
                    setProdutos(produtosFiltrados);

                    // Carregar cores e tamanhos para variações
                    try {
                        const coresResponse = await corService.getAll();
                        const coresData = coresResponse.data?.data?.data || coresResponse.data?.data || coresResponse.data || [];
                        setProductColors(Array.isArray(coresData) ? coresData : []);
                    } catch(error) {
                        console.error('Erro ao carregar cores:', error);
                        setProductColors([]);
                    }
                    
                    try {
                        const tamanhosResponse = await tamanhoService.getAll();
                        const tamanhosData = tamanhosResponse.data?.data?.data || tamanhosResponse.data?.data || tamanhosResponse.data || [];
                        setProductSizes(Array.isArray(tamanhosData) ? tamanhosData : []);
                    } catch(error) {
                        console.error('Erro ao carregar tamanhos:', error);
                        setProductSizes([]);
                    }
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
        // Verificar se o produto tem variações ativas
        if (produto.variacoes_ativa && Array.isArray(produto.variacoes) && produto.variacoes.length > 0) {
            // Abrir modal de variações
            setSelectedProdutoForVariations(produto);
            setIsVariationsModalOpen(true);
            return;
        }

        // Produto sem variações - processar normalmente
        const estoqueDisponivel = parseFloat(produto.estoque || 0);
        
        // Verificar se há promoção ativa e usar o preço promocional se disponível
        const temPromocao = produto.promocao_ativa && parseFloat(produto.preco_promocional || 0) > 0;
        // Considerar preço m² se existir, senão preço de venda
        const precoBase = parseFloat(produto.preco_venda || 0);
        const precoM2 = parseFloat(produto.preco_m2 || 0);
        const precoVenda = temPromocao
            ? parseFloat(produto.preco_promocional || 0)
            : (precoM2 > 0 ? precoM2 : precoBase);

        if (estoqueDisponivel < 0) {
            toast({
                title: `Estoque Negativo`,
                description: `O produto ${produto.nome} está com estoque negativo. Disponível: ${estoqueDisponivel} ${produto.unidade_medida}.`,
                variant: "destructive",
                duration: 5000
            });
            return;
        }
        if (precoVenda <= 0) {
             toast({
                title: `Preço Inválido`,
                description: `O produto ${produto.nome} está com preço de venda zerado ou inválido. Verifique o cadastro.`,
                variant: "destructive",
                duration: 5000
            });
            return;
        }

        onSelectProduto({
            id: produto.id,
            nome: produto.nome,
            valorMetroQuadrado: precoM2 > 0 ? precoVenda : precoBase,
            estoqueDisponivel: estoqueDisponivel,
            imagem: produto.imagem_principal,
            cor_opcional: produto.cor_opcional,
            unidadeMedida: produto.unidade_medida,
            preco_venda: precoBase > 0 ? precoBase : precoVenda, 
            preco_m2: precoM2 > 0 ? precoVenda : 0,
            promocao_ativa: temPromocao,
            preco_promocional: temPromocao ? precoVenda : null,
            preco_original: temPromocao ? (precoM2 > 0 ? precoM2 : precoBase) : precoVenda
        });
        onOpenChange(false);
    };

    // Função para lidar com a seleção de variação
    const handleVariationSelect = (produtoComVariacao) => {
        onSelectProduto(produtoComVariacao);
        setIsVariationsModalOpen(false);
        onOpenChange(false);
    };

    // Função auxiliar para obter nomes de variações (cores, tamanhos, etc.)
    const getNomeVariacao = (id, tipo) => {
        if (!id) return 'N/A';
        if (tipo === 'cor') {
            const cor = productColors.find(c => c.id === id);
            return cor ? cor.nome : id;
        }
        if (tipo === 'tamanho') {
            const tamanho = productSizes.find(s => s.id === id);
            return tamanho ? tamanho.nome : id;
        }
        return id;
    };

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Catálogo de Produtos (para Envelopamento)</DialogTitle>
                    <DialogDescription>Selecione um produto para o orçamento de envelopamento. </DialogDescription>
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
                                                <Tag size={12} className="inline mr-1"/>PROMO
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
                                                    <ImageOff className="h-16 w-16 text-gray-400 dark:text-gray-500"/>
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-2 flex flex-col flex-grow">
                                            <p className="font-semibold text-sm leading-snug flex-grow">{produto.nome}</p>
                                            {produto.variacoes_ativa && (
                                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                    ✨ Produto com variações ({Array.isArray(produto.variacoes) ? produto.variacoes.length : 0} opções)
                                                </p>
                                            )}
                                            <div className="mt-2">
                                                <p className="text-xs text-muted-foreground">
                                                    Estoque: {parseFloat(produto.estoque || 0)} {produto.unidade_medida}
                                                    {produto.variacoes_ativa && Array.isArray(produto.variacoes) && (
                                                        <span className="ml-1 text-blue-600">
                                                            (+ variações)
                                                        </span>
                                                    )}
                                                </p>
                                                <p className={`text-base font-bold mt-1 ${produto.promocao_ativa && parseFloat(produto.preco_promocional || 0) > 0 ? 'text-orange-500' : 'text-green-600 dark:text-green-400'}`}>
                                                  R$ {parseFloat(produto.promocao_ativa && parseFloat(produto.preco_promocional || 0) > 0 ? produto.preco_promocional : produto.preco_venda || produto.preco_m2 || 0).toFixed(2)}
                                                </p>
                                                {produto.promocao_ativa && parseFloat(produto.preco_promocional || 0) > 0 && parseFloat(produto.preco_venda || produto.preco_m2 || 0) > 0 && (
                                                   <p className="text-xs line-through text-gray-400 dark:text-gray-500">R$ {parseFloat(produto.preco_venda || produto.preco_m2 || 0).toFixed(2)}</p>
                                                )}
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
                            <p className="text-xs mt-1">Verifique se há produtos cadastrados com status "Ativo". Produtos com variações também são suportados.</p>
                        </div>
                    )}
                </ScrollArea>
                {/* <div className="mt-4 border-t pt-4">
                    <p className="text-sm text-center text-muted-foreground">
                        Não encontrou? <Link to="/cadastros/novo-produto" className="text-primary underline" onClick={() => onOpenChange(false)}>Cadastre um novo produto</Link>.
                    </p>
                </div> */}
            </DialogContent>
        </Dialog>
        
        {/* Modal de Variações */}
        <EnvelopamentoVariationsModal
            isOpen={isVariationsModalOpen}
            onClose={() => setIsVariationsModalOpen(false)}
            produto={selectedProdutoForVariations}
            onSelectVariacao={handleVariationSelect}
            getNomeVariacao={getNomeVariacao}
        />
        </>
    );
};

export default EnvelopamentoProdutoModal;