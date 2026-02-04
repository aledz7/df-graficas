import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Package, Search, Image as ImageIcon, CheckCircle, AlertCircle, Tag, ShoppingCart, Plus, Minus, Trash2, X, Share2, Copy, MessageCircle, Send, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isPromocaoAtiva } from '@/lib/utils';
import { categoriaService, produtoService, configuracaoService, corService, tamanhoService, empresaService, productCategoryService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { getImageUrl } from '@/lib/imageUtils';
import { calcularEstoqueTotal, temEstoqueDisponivel, getTextoDisponibilidadeEstoque } from '@/utils/estoqueUtils';
import CompartilharProdutoModal from '@/components/produtos/CompartilharProdutoModal';

const CatalogoPublicoPage = () => {
    const { tenantId, produtoId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Inicializar estados a partir dos parâmetros da URL
    const [produtos, setProdutos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [filteredProdutos, setFilteredProdutos] = useState([]);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categoria') || 'all');
    const [empresa, setEmpresa] = useState({ nomeFantasia: '', logoUrl: '' });
    const [loading, setLoading] = useState(true);
    const [carrinho, setCarrinho] = useState([]);
    const [tenantError, setTenantError] = useState(false);
    const [produtoSelecionado, setProdutoSelecionado] = useState(null);
    const [showProdutoModal, setShowProdutoModal] = useState(false);
    const [quantidadeSelecionada, setQuantidadeSelecionada] = useState(1);
    const [variacaoSelecionada, setVariacaoSelecionada] = useState(null);
    const [productColors, setProductColors] = useState([]);
    const [productSizes, setProductSizes] = useState([]);
    const [produtoEspecifico, setProdutoEspecifico] = useState(null);
    const [isLoadingProdutoEspecifico, setIsLoadingProdutoEspecifico] = useState(false);
    const [produtoParaCompartilhar, setProdutoParaCompartilhar] = useState(null);
    const [isCompartilharModalOpen, setIsCompartilharModalOpen] = useState(false);
    const [isCompartilharPaginaModalOpen, setIsCompartilharPaginaModalOpen] = useState(false);
    const [isProdutoAdicionadoModalOpen, setIsProdutoAdicionadoModalOpen] = useState(false);
    const [produtoAdicionado, setProdutoAdicionado] = useState(null);
    const { toast } = useToast();

    // Carregar carrinho do localStorage quando a página for carregada
    useEffect(() => {
        const carrinhoSalvo = JSON.parse(localStorage.getItem('carrinho') || '[]');
        setCarrinho(carrinhoSalvo);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setTenantError(false);
            try {
                // Se estamos visualizando um produto específico
                if (produtoId) {
                    setIsLoadingProdutoEspecifico(true);
                    try {
                        console.log('Carregando produto específico ID:', produtoId);
                        // Usar rota pública para buscar produto específico
                        const produtoResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/public/produtos/${produtoId}`);
                        const produtoData = await produtoResponse.json();
                        console.log('Resposta da API do produto:', produtoData);
                        
                        // Verificar se a resposta foi bem-sucedida
                        if (!produtoData.success) {
                            throw new Error(produtoData.message || 'Produto não encontrado');
                        }
                        
                        const produto = produtoData.data;
                        console.log('Produto processado:', produto);
                        
                        // Verificar se o produto tem dados válidos
                        if (!produto || !produto.id) {
                            throw new Error('Produto não encontrado ou dados inválidos');
                        }
                        
                        setProdutoEspecifico(produto);
                        setProdutos([produto]);
                        setFilteredProdutos([produto]);
                        
                        // Carregar dados da empresa para o produto específico (usar rota pública se tiver tenantId)
                        // Tentar usar tenantId da URL primeiro, depois do produto
                        const tenantIdParaEmpresa = tenantId || produto.tenant_id;
                        try {
                            if (tenantIdParaEmpresa) {
                                const empresaResponse = await empresaService.getByTenant(tenantIdParaEmpresa);
                                const empresaData = empresaResponse.data.data || empresaResponse.data || {};
                                const nomeFantasia = empresaData.nome_fantasia || 
                                                   empresaData.nomeFantasia || 
                                                   empresaData.razao_social || 
                                                   empresaData.razaoSocial || 
                                                   'Minha Empresa';
                                const logoUrl = empresaData.logo_url || 
                                              empresaData.logoUrl || 
                                              empresaData.logo || 
                                              '';
                                setEmpresa({ nomeFantasia, logoUrl });
                            } else {
                                // Se não tiver tenantId, usar valores padrão
                                setEmpresa({ nomeFantasia: 'Minha Empresa', logoUrl: '' });
                            }
                        } catch (empresaError) {
                            console.warn('Erro ao carregar dados da empresa:', empresaError);
                            setEmpresa({ nomeFantasia: 'Minha Empresa', logoUrl: '' });
                        }
                        
                        setCategorias([]); // Não precisamos de categorias para produto específico
                    } catch (error) {
                        console.error('Erro ao carregar produto específico:', error);
                        console.error('Detalhes do erro:', {
                            message: error.message,
                            response: error.response?.data,
                            status: error.response?.status
                        });
                        setTenantError(true);
                        toast({
                            title: 'Produto não encontrado',
                            description: 'O produto solicitado não foi encontrado ou não está disponível.',
                            variant: 'destructive'
                        });
                        return;
                    } finally {
                        setIsLoadingProdutoEspecifico(false);
                    }
                } else {
                    // Carregamento normal do catálogo
                    let produtosResponse, categoriasResponse, empresaResponse;
                    
                    if (tenantId) {
                        // Carregar dados específicos do tenant
                        try {
                            produtosResponse = await produtoService.getByTenant(tenantId);
                            categoriasResponse = await categoriaService.getByTenant(tenantId);
                            empresaResponse = await empresaService.getByTenant(tenantId);
                            
                            // Carregar cores e tamanhos
                            // const coresResponse = await corService.getAll();
                            // const tamanhosResponse = await tamanhoService.getAll();
                            // setProductColors(coresResponse.data || []);
                            // setProductSizes(tamanhosResponse.data || []);
                        } catch (tenantErr) {
                            console.error('Erro ao carregar dados do tenant:', tenantErr);
                            setTenantError(true);
                            toast({
                                title: 'Tenant não encontrado',
                                description: 'O catálogo solicitado não foi encontrado.',
                                variant: 'destructive'
                            });
                            return;
                        }
                    } else {
                        // Carregar dados gerais (comportamento original)
                        produtosResponse = await produtoService.getAll();
                        categoriasResponse = await productCategoryService.getAll();
                        // Não carregar empresa se não tiver tenantId (rota protegida não deve ser usada em catálogo público)
                        empresaResponse = null;
                    }
                    
                    // Processar produtos
                    const produtosData = produtosResponse.data?.data?.data || produtosResponse.data?.data || produtosResponse.data || [];
                    const produtosArray = Array.isArray(produtosData) ? produtosData : [];
                    const produtosAtivos = produtosArray.filter(p => p.status === true);
                    setProdutos(produtosAtivos);
                    setFilteredProdutos(produtosAtivos);
                    
                    // Processar categorias
                    // A API retorna: { success: true, message: "...", data: [...] }
                    const categoriasData = categoriasResponse.data?.data || categoriasResponse.data || [];
                    const categoriasArray = Array.isArray(categoriasData) ? categoriasData : [];
                    setCategorias(categoriasArray);
                    
                    // Processar dados da empresa
                    try {
                        if (empresaResponse) {
                            const empresaData = empresaResponse.data.data || empresaResponse.data || {};
                            
                            // Mapear os dados da empresa para o formato esperado
                            const nomeFantasia = empresaData.nome_fantasia || 
                                               empresaData.nomeFantasia || 
                                               empresaData.razao_social || 
                                               empresaData.razaoSocial || 
                                               'Minha Empresa';
                            
                            const logoUrl = empresaData.logo_url || 
                                          empresaData.logoUrl || 
                                          empresaData.logo || 
                                          '';
                            
                            setEmpresa({ nomeFantasia, logoUrl });
                        } else {
                            // Se não tiver empresaResponse (sem tenantId), usar valores padrão
                            setEmpresa({ nomeFantasia: 'Minha Empresa', logoUrl: '' });
                        }
                    } catch (empresaError) {
                        console.warn('Erro ao carregar dados da empresa da API:', empresaError);
                        setEmpresa({ nomeFantasia: 'Minha Empresa', logoUrl: '' });
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                toast({
                    title: 'Erro ao carregar dados',
                    description: 'Não foi possível carregar os produtos da API.',
                    variant: 'destructive'
                });
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [toast, tenantId, produtoId]);

    // Função para atualizar a URL com os filtros
    const updateURL = (newSearchTerm, newCategory) => {
        const params = new URLSearchParams();
        if (newSearchTerm) {
            params.set('search', newSearchTerm);
        }
        if (newCategory && newCategory !== 'all') {
            params.set('categoria', newCategory);
        }
        setSearchParams(params);
    };

    // Função para lidar com mudança na busca
    const handleSearchChange = (value) => {
        setSearchTerm(value);
        updateURL(value, selectedCategory);
    };

    // Função para lidar com mudança na categoria
    const handleCategoryChange = (value) => {
        setSelectedCategory(value);
        updateURL(searchTerm, value);
    };

    // Função para limpar todos os filtros
    const clearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('all');
        setSearchParams({});
    };

    useEffect(() => {
        let results = produtos;
        if (selectedCategory !== 'all') {
            results = results.filter(p => String(p.categoria_id) === String(selectedCategory));
        }
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            results = results.filter(p => 
                p.nome.toLowerCase().includes(lowerSearchTerm) ||
                (p.descricao_curta && p.descricao_curta.toLowerCase().includes(lowerSearchTerm))
            );
        }
        setFilteredProdutos(results);
    }, [searchTerm, selectedCategory, produtos]);

    // Sincronizar com parâmetros da URL quando a página for carregada
    useEffect(() => {
        const urlSearch = searchParams.get('search') || '';
        const urlCategory = searchParams.get('categoria') || 'all';
        
        if (urlSearch !== searchTerm) {
            setSearchTerm(urlSearch);
        }
        if (urlCategory !== selectedCategory) {
            setSelectedCategory(urlCategory);
        }
    }, [searchParams]);

    // Função para obter nome das variações
    const getNomeVariacao = (varId, type) => {
        if (!varId) return 'N/A';
        if (type === 'cor') {
            const cor = productColors.find(c => c.id === varId);
            return cor ? cor.nome : varId;
        }
        if (type === 'tamanho') {
            const tamanho = productSizes.find(s => s.id === varId);
            return tamanho ? tamanho.nome : varId;
        }
        return varId;
    };

    // Função para calcular estoque disponível
    const calcularEstoqueDisponivel = (produto, variacao = null) => {
        if (variacao) {
            return variacao.estoque_var || 0;
        }
        return produto.estoque_atual || produto.estoque || 0;
    };

    // Funções do carrinho
    const abrirModalProduto = (produto) => {
        setProdutoSelecionado(produto);
        setQuantidadeSelecionada(1);
        setVariacaoSelecionada(null);
        setShowProdutoModal(true);
    };

    // Garantir que quantidadeSelecionada não exceda o estoque disponível
    useEffect(() => {
        if (produtoSelecionado) {
            const estoqueDisponivel = calcularEstoqueDisponivel(produtoSelecionado, variacaoSelecionada);
            if (quantidadeSelecionada > estoqueDisponivel) {
                setQuantidadeSelecionada(Math.max(1, estoqueDisponivel));
            }
        }
    }, [produtoSelecionado, variacaoSelecionada, quantidadeSelecionada]);

    // Resetar quantidade quando variação mudar
    useEffect(() => {
        if (variacaoSelecionada && produtoSelecionado) {
            const estoqueDisponivel = calcularEstoqueDisponivel(produtoSelecionado, variacaoSelecionada);
            setQuantidadeSelecionada(Math.min(quantidadeSelecionada, estoqueDisponivel));
        }
    }, [variacaoSelecionada]);

    const adicionarAoCarrinho = (produto, quantidade = 1, variacao = null) => {
        let precoFinal = parseFloat(isPromocaoAtiva(produto) ? produto.preco_promocional : produto.preco_venda || 0);
        let nomeCompleto = produto.nome;
        let estoqueDisponivel = produto.estoque_atual || produto.estoque;
        
        // Se tem variação selecionada, usar preço e estoque da variação
        if (variacao) {
            // Se a variação tem preço específico, usar ele. Senão, usar o preço do produto (que já considera promoção)
            precoFinal = parseFloat(variacao.preco_var || precoFinal || 0);
            estoqueDisponivel = variacao.estoque_var || 0;
            const corNome = getNomeVariacao(variacao.cor, 'cor');
            const tamanhoNome = getNomeVariacao(variacao.tamanho, 'tamanho');
            nomeCompleto = `${produto.nome} - ${variacao.nome || `${corNome}/${tamanhoNome}`}`;
        }
        
        // Verificar estoque disponível
        if (estoqueDisponivel < quantidade) {
            toast({
                title: 'Estoque insuficiente',
                description: `Apenas ${estoqueDisponivel} unidade(s) disponível(is).`,
                variant: 'destructive'
            });
            return;
        }
        
        setCarrinho(prev => {
            // Criar ID único considerando variação
            const itemId = variacao ? `${produto.id}-${variacao.id || variacao.cor}-${variacao.tamanho}` : produto.id;
            const itemExistente = prev.find(item => item.id === itemId);
            
            // Garantir que tenant_id seja sempre incluído
            const tenantIdParaItem = tenantId || produto.tenant_id || produto.tenantId;
            
            if (itemExistente) {
                return prev.map(item => 
                    item.id === itemId 
                        ? { 
                            ...item, 
                            quantidade: item.quantidade + quantidade,
                            // Garantir que tenant_id esteja presente (adicionar se não tiver)
                            tenant_id: item.tenant_id || item.tenantId || tenantIdParaItem
                        }
                        : item
                );
            } else {
                return [...prev, {
                    id: itemId,
                    produtoId: produto.id,
                    nome: nomeCompleto,
                    preco: parseFloat(precoFinal || 0),
                    quantidade: quantidade,
                    imagem: produto.imagem_principal,
                    estoque: estoqueDisponivel,
                    variacao: variacao,
                    tenant_id: tenantIdParaItem // Incluir tenantId para uso no checkout
                }];
            }
        });
        
        // Mostrar modal de confirmação
        setProdutoAdicionado({
            nome: nomeCompleto,
            quantidade: quantidade,
            preco: precoFinal
        });
        setIsProdutoAdicionadoModalOpen(true);
    };

    const adicionarDoModal = () => {
        if (produtoSelecionado) {
            // Se tem variações ativas e nenhuma variação foi selecionada, mostrar erro
            if (produtoSelecionado.variacoes_ativa && Array.isArray(produtoSelecionado.variacoes) && produtoSelecionado.variacoes.length > 0 && !variacaoSelecionada) {
                toast({
                    title: 'Selecione uma variação',
                    description: 'Este produto possui variações. Selecione uma opção antes de adicionar ao carrinho.',
                    variant: 'destructive'
                });
                return;
            }
            
            adicionarAoCarrinho(produtoSelecionado, quantidadeSelecionada, variacaoSelecionada);
            setShowProdutoModal(false);
            setProdutoSelecionado(null);
            setQuantidadeSelecionada(1);
        }
    };

    const removerDoCarrinho = (produtoId) => {
        setCarrinho(prev => prev.filter(item => item.id !== produtoId));
    };

    const atualizarQuantidade = (produtoId, novaQuantidade) => {
        if (novaQuantidade <= 0) {
            removerDoCarrinho(produtoId);
            return;
        }
        
        setCarrinho(prev => prev.map(item => 
            item.id === produtoId 
                ? { ...item, quantidade: novaQuantidade }
                : item
        ));
    };

    const calcularTotal = () => {
        return carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
    };

    const handleCompartilharProduto = (produto) => {
        setProdutoParaCompartilhar(produto);
        setIsCompartilharModalOpen(true);
    };

    const handleCompartilharPagina = () => {
        setIsCompartilharPaginaModalOpen(true);
    };


    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
            <header className="bg-background shadow-sm sticky top-0 z-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center">
                    <div className="flex items-center space-x-3 mb-4 sm:mb-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2"
                            title="Ir para o sistema"
                        >
                            <Home className="h-4 w-4" />
                        </Button>
                        {empresa.logoUrl ? (
                             <img src={getImageUrl(empresa.logoUrl)} alt={`Logo de ${empresa.nomeFantasia}`} className="h-12 w-auto object-contain" />
                        ) : (
                            <>
                                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                                   <Package className="h-6 w-6 text-primary" />
                                </div>
                                <h1 className="text-2xl font-bold text-foreground">{empresa.nomeFantasia}</h1>
                            </>
                        )}
                    </div>
                    {!produtoId && (
                        <div className="w-full sm:w-auto flex items-center space-x-4">
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    placeholder="Buscar produto..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="pl-10 w-full"
                                />
                            </div>
                            <Select value={selectedCategory} onValueChange={handleCategoryChange} disabled={loading}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Categorias">
                                        {selectedCategory === 'all' 
                                            ? 'Todas as Categorias' 
                                            : categorias.find(cat => String(cat.id) === String(selectedCategory))?.nome || 'Selecione'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Categorias</SelectItem>
                                    {Array.isArray(categorias) && categorias.map(cat => (
                                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.nome}</SelectItem>
                                    ))}
                                    {loading && <SelectItem value="loading" disabled>Carregando...</SelectItem>}
                                </SelectContent>
                            </Select>
                            
                            {/* Botão para limpar filtros */}
                            {(searchTerm || selectedCategory !== 'all') && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={clearFilters}
                                    className="flex items-center gap-2"
                                >
                                    <X className="h-4 w-4" />
                                    Limpar Filtros
                                </Button>
                            )}
                            
                            {/* Botão para compartilhar página */}
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleCompartilharPagina()}
                                className="flex items-center gap-2"
                                title="Compartilhar catálogo"
                            >
                                <Share2 className="h-4 w-4" />
                                Compartilhar
                            </Button>
                        </div>
                    )}
                    
                    {/* Botão do carrinho */}
                    <Button 
                        variant="outline" 
                        className="relative"
                        onClick={() => {
                            // Salvar carrinho no localStorage
                            localStorage.setItem('carrinho', JSON.stringify(carrinho));
                            // Navegar para checkout
                            navigate(`/checkout${tenantId ? `/${tenantId}` : ''}`, { 
                                state: { carrinho: carrinho } 
                            });
                        }}
                    >
                        <ShoppingCart className="h-5 w-5" />
                        {carrinho.length > 0 && (
                            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
                                {carrinho.reduce((total, item) => total + item.quantidade, 0)}
                            </Badge>
                        )}
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Indicadores de filtros ativos */}
                {!produtoId && (searchTerm || selectedCategory !== 'all') && (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">Filtros ativos:</span>
                        {searchTerm && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                Busca: "{searchTerm}"
                                <button 
                                    onClick={() => handleSearchChange('')}
                                    className="ml-1 hover:text-destructive"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                        {selectedCategory !== 'all' && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                Categoria: {categorias.find(cat => String(cat.id) === String(selectedCategory))?.nome || selectedCategory}
                                <button 
                                    onClick={() => handleCategoryChange('all')}
                                    className="ml-1 hover:text-destructive"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                    </div>
                )}
                
                <ScrollArea className="h-[calc(100vh-12rem)]">
                    {tenantError ? (
                        <div className="text-center py-20">
                            <div className="mx-auto h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="mt-4 text-lg font-medium text-foreground">
                                {produtoId ? 'Produto não encontrado' : 'Empresa não encontrada'}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {produtoId ? 'O produto solicitado não foi encontrado ou não está disponível.' : 'A empresa solicitada não foi encontrada ou não está disponível.'}
                            </p>
                        </div>
                    ) : loading || isLoadingProdutoEspecifico ? (
                        <div className="text-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                            <h3 className="mt-4 text-lg font-medium text-foreground">
                                {produtoId ? 'Carregando produto...' : 'Carregando produtos...'}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {produtoId ? 'Aguarde enquanto carregamos o produto.' : 'Aguarde enquanto carregamos o catálogo.'}
                            </p>
                        </div>
                    ) : filteredProdutos.length > 0 ? (
                        <motion.div 
                            layout
                            className={produtoId ? "grid grid-cols-1 max-w-2xl mx-auto gap-6" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"}>
                            <AnimatePresence>
                                {filteredProdutos.map((produto, index) => {
                                    const temPromo = isPromocaoAtiva(produto);
                                    let precoFinal = parseFloat(temPromo ? produto.preco_promocional : produto.preco_venda || 0);

                                    return (
                                        <motion.div
                                            key={produto.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            transition={{ duration: 0.3, delay: index * 0.05 }}
                                        >
                                            <Card className={`overflow-hidden h-full flex flex-col group transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer ${produtoId ? 'border-2 border-primary shadow-lg' : ''}`} onClick={() => abrirModalProduto(produto)}>
                                                <CardHeader className="p-0 relative">
                                                    {temPromo && (
                                                        <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10 flex items-center">
                                                            <Tag size={12} className="mr-1"/> PROMO
                                                        </div>
                                                    )}
                                                    <div className="aspect-square w-full overflow-hidden bg-muted">
                                                        {produto.imagem_principal ? (
                                                            <img 
                                                              src={getImageUrl(produto.imagem_principal)} 
                                                              alt={produto.nome} 
                                                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                                              onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                                              }} 
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <ImageIcon className="w-16 h-16 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-4 flex-grow flex flex-col justify-between">
                                                   <div>
                                                        <CardTitle className={`${produtoId ? 'text-xl' : 'text-base'} font-bold truncate group-hover:text-primary leading-tight`} title={produto.nome}>{produto.nome}</CardTitle>
                                                        {temEstoqueDisponivel(produto) ? (
                                                            <p className="text-xs text-green-600 flex items-center mt-1"><CheckCircle size={12} className="mr-1"/> {getTextoDisponibilidadeEstoque(produto)}</p>
                                                        ) : (
                                                            <p className="text-xs text-red-600 flex items-center mt-1"><AlertCircle size={12} className="mr-1"/> Sem estoque</p>
                                                        )}
                                                   </div>
                                                   <div className="mt-4">
                                                        <div className="text-right mb-2">
                                                            {temPromo && (
                                                                <span className="text-sm line-through text-muted-foreground mr-2">
                                                                    R$ {parseFloat(produto.preco_venda || 0).toFixed(2)}
                                                                </span>
                                                            )}
                                                            <span className={`${produtoId ? 'text-3xl' : 'text-xl'} font-extrabold ${temPromo ? 'text-primary' : 'text-foreground'}`}>
                                                                R$ {parseFloat(precoFinal || 0).toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    
                                                                    // Se o produto tem variações ativas, abrir modal para selecionar
                                                                    if (produto.variacoes_ativa && Array.isArray(produto.variacoes) && produto.variacoes.length > 0) {
                                                                        toast({
                                                                            title: 'Produto com variações',
                                                                            description: 'Este produto possui variações. Por favor, selecione uma opção.',
                                                                            variant: 'default'
                                                                        });
                                                                        // Abrir o modal do produto para o usuário escolher a variação
                                                                        abrirModalProduto(produto);
                                                                        return;
                                                                    }
                                                                    
                                                                    // Carregar carrinho existente do localStorage
                                                                    const carrinhoExistente = JSON.parse(localStorage.getItem('carrinho') || '[]');
                                                                    const novoCarrinho = [...carrinhoExistente];
                                                                    let precoFinal = parseFloat(isPromocaoAtiva(produto) ? produto.preco_promocional : produto.preco_venda || 0);
                                                                    let nomeCompleto = produto.nome;
                                                                    let estoqueDisponivel = produto.estoque_atual || produto.estoque;
                                                                    
                                                                    // Verificar estoque disponível
                                                                    if (estoqueDisponivel < 1) {
                                                                        toast({
                                                                            title: 'Estoque insuficiente',
                                                                            description: `Apenas ${estoqueDisponivel} unidade(s) disponível(is).`,
                                                                            variant: 'destructive'
                                                                        });
                                                                        return;
                                                                    }
                                                                    
                                                                    // Criar item do carrinho
                                                                    const itemId = produto.id;
                                                                    const itemExistente = novoCarrinho.find(item => item.id === itemId);
                                                                    const quantidadeAtualNoCarrinho = itemExistente ? itemExistente.quantidade : 0;
                                                                    const novaQuantidadeTotal = quantidadeAtualNoCarrinho + 1;
                                                                    
                                                                    // Verificar se a nova quantidade total não excede o estoque disponível
                                                                    if (novaQuantidadeTotal > estoqueDisponivel) {
                                                                        toast({
                                                                            title: 'Estoque insuficiente',
                                                                            description: `Estoque disponível: ${estoqueDisponivel} unidade(s). Você já tem ${quantidadeAtualNoCarrinho} no carrinho.`,
                                                                            variant: 'destructive'
                                                                        });
                                                                        return;
                                                                    }
                                                                    
                                                                    if (itemExistente) {
                                                                        novoCarrinho.forEach(item => {
                                                                            if (item.id === itemId) {
                                                                                item.quantidade = novaQuantidadeTotal;
                                                                            }
                                                                        });
                                                                    } else {
                                                                        novoCarrinho.push({
                                                                            id: itemId,
                                                                            produtoId: produto.id,
                                                                            nome: nomeCompleto,
                                                                            preco: parseFloat(precoFinal || 0),
                                                                            quantidade: 1,
                                                                            imagem: produto.imagem_principal,
                                                                            estoque: estoqueDisponivel,
                                                                            variacao: null,
                                                                            tenant_id: tenantId || produto.tenant_id || produto.tenantId // Incluir tenantId para uso no checkout
                                                                        });
                                                                    }
                                                                    
                                                                    // Atualizar estado do carrinho
                                                                    setCarrinho(novoCarrinho);
                                                                    
                                                                    // Salvar carrinho no localStorage
                                                                    localStorage.setItem('carrinho', JSON.stringify(novoCarrinho));
                                                                    
                                                                    // Navegar para checkout
                                                                    navigate(`/checkout${tenantId ? `/${tenantId}` : ''}`, { 
                                                                        state: { carrinho: novoCarrinho } 
                                                                    });
                                                                }}
                                                                disabled={parseFloat(produto.estoque_atual || produto.estoque) <= 0}
                                                                className="flex-1"
                                                                size={produtoId ? "default" : "sm"}
                                                            >
                                                                <ShoppingCart className={`${produtoId ? 'h-5 w-5' : 'h-4 w-4'} mr-2`} />
                                                                {produtoId ? 'Comprar' : 'Comprar'}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCompartilharProduto(produto);
                                                                }}
                                                                size={produtoId ? "default" : "sm"}
                                                                className="px-3"
                                                                title="Compartilhar produto"
                                                            >
                                                                <Share2 className={`${produtoId ? 'h-5 w-5' : 'h-4 w-4'}`} />
                                                            </Button>
                                                        </div>
                                                   </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    )
                                })}
                            </AnimatePresence>
                        </motion.div>
                    ) : (
                        <div className="text-center py-20">
                            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-2 text-sm font-medium text-foreground">Nenhum produto encontrado</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Tente ajustar sua busca ou filtro de categoria.</p>
                        </div>
                    )}
                </ScrollArea>
            </main>

            {/* Modal de Detalhes do Produto */}
			<Dialog open={showProdutoModal} onOpenChange={setShowProdutoModal}>
				<DialogContent className="max-w-2xl w-[90vw] sm:w-[800px] max-h-[90vh] overflow-y-auto">
                    {produtoSelecionado && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">{produtoSelecionado.nome}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                {/* Imagem do produto */}
                                <div className="aspect-square w-full max-w-[200px] sm:max-w-sm mx-auto overflow-hidden rounded-lg bg-muted">
                                    {(variacaoSelecionada?.imagem || variacaoSelecionada?.imagem_url || variacaoSelecionada?.imagem_principal || produtoSelecionado.imagem_principal) ? (
                                        <img 
                                            src={getImageUrl(variacaoSelecionada?.imagem || variacaoSelecionada?.imagem_url || variacaoSelecionada?.imagem_principal || produtoSelecionado.imagem_principal)} 
                                            alt={produtoSelecionado.nome} 
                                            className="w-full h-full object-cover" 
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                            }} 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-16 h-16 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>

                                {/* Informações do produto */}
                                <div className="space-y-3">
                                    {/* Descrição */}
                                    {produtoSelecionado.descricao_curta && (
                                        <div>
                                            <h4 className="font-medium text-sm text-muted-foreground mb-1">Descrição</h4>
                                            <p className="text-sm">{produtoSelecionado.descricao_curta}</p>
                                        </div>
                                    )}

                                    {/* Seção de Variações */}
                                    {produtoSelecionado?.variacoes_ativa && Array.isArray(produtoSelecionado.variacoes) && produtoSelecionado.variacoes.length > 0 && (
                                        <div>
                                            <h4 className="font-medium text-sm text-muted-foreground mb-2">Variações Disponíveis</h4>
                                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                                                {produtoSelecionado.variacoes.map((variacao, index) => {
                                                    const corNome = getNomeVariacao(variacao.cor, 'cor');
                                                    const tamanhoNome = getNomeVariacao(variacao.tamanho, 'tamanho');
                                                    const estoqueVar = variacao.estoque_var || 0;
                                                    // Se a variação tem preço específico, usar ele. Senão, usar o preço do produto (que já considera promoção)
                                                    const precoVar = parseFloat(
                                                        variacao.preco_var || 
                                                        (isPromocaoAtiva(produtoSelecionado) ? produtoSelecionado.preco_promocional : produtoSelecionado.preco_venda) || 0
                                                    );
                                                    const isSelected = variacaoSelecionada === variacao;
                                                    const isOutOfStock = estoqueVar <= 0;
                                                    
                                                    return (
                                                        <button
                                                            key={index}
                                                            onClick={() => !isOutOfStock && setVariacaoSelecionada(variacao)}
                                                            disabled={isOutOfStock}
                                                            className={`p-3 border rounded-lg text-left transition-all duration-200 ${
                                                                isSelected 
                                                                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                                                                    : isOutOfStock 
                                                                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {/* Imagem da variação - sempre visível */}
                                                                <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                                                    {(variacao.imagem || variacao.imagem_url || variacao.imagem_principal) ? (
                                                                        <img 
                                                                            src={getImageUrl(variacao.imagem || variacao.imagem_url || variacao.imagem_principal)} 
                                                                            alt={variacao.nome || `${corNome} / ${tamanhoNome}`}
                                                                            className="w-full h-full object-cover" 
                                                                            onError={(e) => { 
                                                                                e.currentTarget.style.display = 'none';
                                                                                e.currentTarget.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center">
                                                                            <ImageIcon className="w-8 h-8 text-gray-300" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Informações da variação */}
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="font-medium text-gray-900 mb-1">
                                                                        {variacao.nome || `${corNome} / ${tamanhoNome}`}
                                                                    </div>
                                                                    <div className="text-sm text-gray-600 mb-1">
                                                                        Estoque: {estoqueVar} {isOutOfStock && '(Esgotado)'}
                                                                    </div>
                                                                    <div className="font-bold text-green-600">
                                                                        R$ {precoVar.toFixed(2)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Estoque */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Disponibilidade:</span>
                                        {temEstoqueDisponivel(produtoSelecionado) ? (
                                            <span className="text-sm text-green-600 flex items-center">
                                                <CheckCircle size={16} className="mr-1"/> 
                                                {getTextoDisponibilidadeEstoque(produtoSelecionado)}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-red-600 flex items-center">
                                                <AlertCircle size={16} className="mr-1"/> 
                                                Sem estoque
                                            </span>
                                        )}
                                    </div>

                                    {/* Preço */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Preço:</span>
                                        <div className="text-right">
                                            {isPromocaoAtiva(produtoSelecionado) && (
                                                <span className="text-sm line-through text-muted-foreground mr-2">
                                                    R$ {parseFloat(produtoSelecionado.preco_venda || 0).toFixed(2)}
                                                </span>
                                            )}
                                            <span className={`text-lg font-bold ${
                                                isPromocaoAtiva(produtoSelecionado) ? 'text-primary' : 'text-foreground'
                                            }`}>
                                                R$ {parseFloat(
                                                    isPromocaoAtiva(produtoSelecionado) 
                                                        ? produtoSelecionado.preco_promocional 
                                                        : produtoSelecionado.preco_venda || 0
                                                ).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Controle de quantidade */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Quantidade:</span>
                                        <div className="flex items-center space-x-3">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setQuantidadeSelecionada(Math.max(1, quantidadeSelecionada - 1))}
                                                disabled={quantidadeSelecionada <= 1}
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="text-lg font-medium w-12 text-center">
                                                {quantidadeSelecionada}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setQuantidadeSelecionada(quantidadeSelecionada + 1)}
                                                disabled={quantidadeSelecionada >= calcularEstoqueDisponivel(produtoSelecionado, variacaoSelecionada)}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {calcularEstoqueDisponivel(produtoSelecionado, variacaoSelecionada) > 0 && (
                                            <span className="text-xs text-muted-foreground ml-2">
                                                (Estoque: {calcularEstoqueDisponivel(produtoSelecionado, variacaoSelecionada)})
                                            </span>
                                        )}
                                    </div>

                                    {/* Total */}
                                    <div className="border-t pt-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-base font-medium">Total:</span>
                                            <span className="text-xl font-bold text-primary">
                                                R$ {(
                                                    parseFloat(
                                                        isPromocaoAtiva(produtoSelecionado) 
                                                            ? produtoSelecionado.preco_promocional 
                                                            : produtoSelecionado.preco_venda || 0
                                                    ) * quantidadeSelecionada
                                                ).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="flex gap-2">
                                <Button variant="outline" onClick={() => setShowProdutoModal(false)}>
                                    Fechar
                                </Button>
                                <Button 
                                    onClick={() => {
                                        if (produtoSelecionado) {
                                            // Se tem variações ativas e nenhuma variação foi selecionada, mostrar erro
                                            if (produtoSelecionado.variacoes_ativa && Array.isArray(produtoSelecionado.variacoes) && produtoSelecionado.variacoes.length > 0 && !variacaoSelecionada) {
                                                toast({
                                                    title: 'Selecione uma variação',
                                                    description: 'Este produto possui variações. Selecione uma opção antes de adicionar ao carrinho.',
                                                    variant: 'destructive'
                                                });
                                                return;
                                            }
                                            
                                            // Carregar carrinho existente do localStorage
                                            const carrinhoExistente = JSON.parse(localStorage.getItem('carrinho') || '[]');
                                            const novoCarrinho = [...carrinhoExistente];
                                            let precoFinal = parseFloat(isPromocaoAtiva(produtoSelecionado) ? produtoSelecionado.preco_promocional : produtoSelecionado.preco_venda || 0);
                                            let nomeCompleto = produtoSelecionado.nome;
                                            let estoqueDisponivel = produtoSelecionado.estoque_atual || produtoSelecionado.estoque;
                                            
                                            // Se tem variação selecionada, usar preço e estoque da variação
                                            if (variacaoSelecionada) {
                                                precoFinal = parseFloat(variacaoSelecionada.preco_var || precoFinal || 0);
                                                estoqueDisponivel = variacaoSelecionada.estoque_var || 0;
                                                const corNome = getNomeVariacao(variacaoSelecionada.cor, 'cor');
                                                const tamanhoNome = getNomeVariacao(variacaoSelecionada.tamanho, 'tamanho');
                                                nomeCompleto = `${produtoSelecionado.nome} - ${variacaoSelecionada.nome || `${corNome}/${tamanhoNome}`}`;
                                            }
                                            
                                            // Criar item do carrinho
                                            const itemId = variacaoSelecionada ? `${produtoSelecionado.id}-${variacaoSelecionada.id || variacaoSelecionada.cor}-${variacaoSelecionada.tamanho}` : produtoSelecionado.id;
                                            const itemExistente = novoCarrinho.find(item => item.id === itemId);
                                            const quantidadeAtualNoCarrinho = itemExistente ? itemExistente.quantidade : 0;
                                            const novaQuantidadeTotal = quantidadeAtualNoCarrinho + quantidadeSelecionada;
                                            
                                            // Verificar estoque disponível considerando quantidade já no carrinho
                                            if (novaQuantidadeTotal > estoqueDisponivel) {
                                                toast({
                                                    title: 'Estoque insuficiente',
                                                    description: `Estoque disponível: ${estoqueDisponivel} unidade(s). Você já tem ${quantidadeAtualNoCarrinho} no carrinho.`,
                                                    variant: 'destructive'
                                                });
                                                return;
                                            }
                                            
                                            if (itemExistente) {
                                                novoCarrinho.forEach(item => {
                                                    if (item.id === itemId) {
                                                        item.quantidade = novaQuantidadeTotal;
                                                    }
                                                });
                                            } else {
                                                novoCarrinho.push({
                                                    id: itemId,
                                                    produtoId: produtoSelecionado.id,
                                                    nome: nomeCompleto,
                                                    preco: parseFloat(precoFinal || 0),
                                                    quantidade: quantidadeSelecionada,
                                                    imagem: produtoSelecionado.imagem_principal,
                                                    estoque: estoqueDisponivel,
                                                    variacao: variacaoSelecionada,
                                                    tenant_id: tenantId || produtoSelecionado.tenant_id || produtoSelecionado.tenantId // Incluir tenantId para uso no checkout
                                                });
                                            }
                                            
                                            // Atualizar estado do carrinho
                                            setCarrinho(novoCarrinho);
                                            
                                            // Salvar carrinho no localStorage
                                            localStorage.setItem('carrinho', JSON.stringify(novoCarrinho));
                                            
                                            // Fechar modal
                                            setShowProdutoModal(false);
                                            setProdutoSelecionado(null);
                                            setQuantidadeSelecionada(1);
                                            
                                            // Navegar para checkout
                                            navigate(`/checkout${tenantId ? `/${tenantId}` : ''}`, { 
                                                state: { carrinho: novoCarrinho } 
                                            });
                                        }
                                    }}
                                    disabled={parseFloat(produtoSelecionado.estoque_atual || produtoSelecionado.estoque) <= 0}
                                    className="flex-1"
                                >
                                    <ShoppingCart className="h-4 w-4 mr-2" />
                                    Comprar
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>


            <CompartilharProdutoModal
                isOpen={isCompartilharModalOpen}
                onClose={() => {
                    setIsCompartilharModalOpen(false);
                    setProdutoParaCompartilhar(null);
                }}
                produto={produtoParaCompartilhar}
            />


            {/* Modal para compartilhar página */}
            <Dialog open={isCompartilharPaginaModalOpen} onOpenChange={setIsCompartilharPaginaModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Share2 className="h-5 w-5" />
                            Compartilhar Catálogo
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="link-pagina">Link do catálogo:</Label>
                            <div className="flex gap-2 mt-2">
                                <Input
                                    id="link-pagina"
                                    value={`https://sistema-graficas.dfinformatica.net/catalogo-publico${tenantId ? `/${tenantId}` : ''}`}
                                    readOnly
                                    className="flex-1"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`https://sistema-graficas.dfinformatica.net/catalogo-publico${tenantId ? `/${tenantId}` : ''}`);
                                        toast({
                                            title: 'Link copiado!',
                                            description: 'O link do catálogo foi copiado para a área de transferência.',
                                        });
                                    }}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        
                        <div>
                            <Label htmlFor="mensagem-pagina">Mensagem personalizada:</Label>
                            <Textarea
                                id="mensagem-pagina"
                                placeholder="Adicione uma mensagem personalizada..."
                                value={`Confira nosso catálogo de produtos: https://sistema-graficas.dfinformatica.net/catalogo-publico${tenantId ? `/${tenantId}` : ''}`}
                                onChange={(e) => {}}
                                className="mt-2"
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    const url = `https://wa.me/?text=${encodeURIComponent(`Confira nosso catálogo de produtos: https://sistema-graficas.dfinformatica.net/catalogo-publico${tenantId ? `/${tenantId}` : ''}`)}`;
                                    window.open(url, '_blank');
                                }}
                            >
                                <Send className="h-4 w-4 mr-2" />
                                WhatsApp
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    const url = `https://t.me/share/url?url=${encodeURIComponent(`https://sistema-graficas.dfinformatica.net/catalogo-publico${tenantId ? `/${tenantId}` : ''}`)}&text=${encodeURIComponent('Confira nosso catálogo de produtos!')}`;
                                    window.open(url, '_blank');
                                }}
                            >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Telegram
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsCompartilharPaginaModalOpen(false)}
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Produto Adicionado */}
            <Dialog open={isProdutoAdicionadoModalOpen} onOpenChange={setIsProdutoAdicionadoModalOpen}>
                <DialogContent className="max-w-md text-center">
                    <DialogHeader>
                        <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-green-600">
                            Produto Adicionado! 🎉
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {produtoAdicionado && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="font-medium text-sm text-gray-700 mb-1">
                                    {produtoAdicionado.nome}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Quantidade: {produtoAdicionado.quantidade} • R$ {produtoAdicionado.preco.toFixed(2)}
                                </p>
                            </div>
                        )}
                        <p className="text-gray-600">
                            O produto foi adicionado ao seu carrinho com sucesso!
                        </p>
                    </div>
                    <DialogFooter className="flex flex-col gap-2">
                        <Button 
                            onClick={() => {
                                setIsProdutoAdicionadoModalOpen(false);
                                // Salvar carrinho no localStorage
                                localStorage.setItem('carrinho', JSON.stringify(carrinho));
                                // Navegar para checkout
                                navigate(`/checkout${tenantId ? `/${tenantId}` : ''}`, { 
                                    state: { carrinho: carrinho } 
                                });
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Ir para Checkout
                        </Button>
                        <Button 
                            variant="outline"
                            onClick={() => {
                                setIsProdutoAdicionadoModalOpen(false);
                            }}
                            className="w-full"
                        >
                            Continuar Comprando
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Toaster />
        </div>
    );
};

export default CatalogoPublicoPage;