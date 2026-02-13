import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { usePDV } from '@/hooks/usePDV';
import PDVProductGrid from '@/components/pdv/PDVProductGrid.jsx';
import PDVCartSection from '@/components/pdv/PDVCartSection.jsx';
import PDVVariationsModal from '@/components/pdv/PDVVariationsModal.jsx';
import PDVCustomerModal from '@/components/pdv/PDVCustomerModal.jsx';
import OSPagamentoModal from '@/components/os/OSPagamentoModal.jsx';
import PDVReciboModal from '@/components/pdv/PDVReciboModal';
import { generatePdfFromElement, printElement } from '@/lib/osDocumentGenerator';
import { apiDataManager } from '@/lib/apiDataManager';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const PDVPage = ({ vendedorAtual }) => {
    const { toast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();

    const {
        isLoading, produtos, categorias, clientes, carrinho, desconto, observacoes, clienteSelecionado,
        setClientes, addProdutoAoCarrinho, 
        limparCarrinhoEState, finalizarDocumento, getNomeVariacao,
        productColors, productSizes, setCarrinho, setDesconto, setObservacoes, setClienteSelecionado,
        valorTotal, subtotal, totalComDesconto, calcularSubtotal, calcularDescontoValor 
    } = usePDV(vendedorAtual);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduto, setSelectedProduto] = useState(null);
    const [isVariacaoModalOpen, setIsVariacaoModalOpen] = useState(false);
    const [selectedVariacaoDetails, setSelectedVariacaoDetails] = useState(null);
    const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
    const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState(false);
    const [modoDocumento, setModoDocumento] = useState('venda');
    const [clienteNomeLivre, setClienteNomeLivre] = useState('');
    const [isReciboModalOpen, setIsReciboModalOpen] = useState(false);
    const [documentoSelecionado, setDocumentoSelecionado] = useState(null);
    const reciboRef = useRef(null);
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [isEdicaoPreVenda, setIsEdicaoPreVenda] = useState(false);
    const [preVendaId, setPreVendaId] = useState(null);
    const barcodeHandledRef = useRef(false);
    const [orcamentoEmConversaoId, setOrcamentoEmConversaoId] = useState(null);
    const orcamentoLoadedRef = useRef(false);
    const preVendaLoadedRef = useRef(false);
    const [activeTab, setActiveTab] = useState('produtos'); // 'produtos' ou 'carrinho'
    const [frete, setFrete] = useState(null);
    
    const handleProdutoClick = useCallback((produto) => {
        if (!produto || !produto.id) {
            toast({ title: "Erro", description: "Produto inválido selecionado.", variant: "destructive" });
            return;
        }

        const estoquePrincipal = parseFloat(produto.estoque || 0);
        
        // Verificar se o produto tem variações com estoque - versão mais robusta
        let variacoesComEstoque = false;
        if (produto.variacoes_ativa && Array.isArray(produto.variacoes) && produto.variacoes.length > 0) {
            const variacoesComEstoqueCount = produto.variacoes.filter(v => {
                const estoque = parseFloat(v.estoque_var || 0);
                return estoque > 0;
            }).length;
            variacoesComEstoque = variacoesComEstoqueCount > 0;
        }
        
        // Verificar se o produto é composto (kit/serviço)
        const isComposto = produto.isComposto || produto.is_composto;
        
        // Se não tem variações ativas e tem estoque principal, adicionar diretamente
        if (!produto.variacoes_ativa && estoquePrincipal > 0) {
            addProdutoAoCarrinho(produto, 1, null);
            // Mudar para aba do carrinho em mobile após adicionar produto
            if (window.innerWidth < 1024) { // lg breakpoint
                setActiveTab('carrinho');
            }
        } 
        // Se tem variações ativas e tem variações com estoque, abrir modal de variações
        else if (produto.variacoes_ativa && variacoesComEstoque) {
            setSelectedProduto(produto);
            setSelectedVariacaoDetails(null); // Reset da seleção anterior
            setIsVariacaoModalOpen(true);
        }
        // Se tem variações ativas mas não tem variações com estoque, mostrar erro específico
        else if (produto.variacoes_ativa && !variacoesComEstoque) {
            const numVariacoes = Array.isArray(produto.variacoes) ? produto.variacoes.length : 0;
            const variacoesComEstoqueCount = Array.isArray(produto.variacoes) ? produto.variacoes.filter(v => parseFloat(v.estoque_var || 0) > 0).length : 0;
            toast({ 
                title: "Variações Sem Estoque", 
                description: `O produto ${produto.nome} possui ${numVariacoes} variação(ões), mas nenhuma tem estoque disponível (${variacoesComEstoqueCount} com estoque).`, 
                variant: "destructive" 
            });
        } 
        // Se é um produto composto, adicionar diretamente (não controla estoque próprio)
        else if (isComposto) {
            addProdutoAoCarrinho(produto, 1, null);
            // Mudar para aba do carrinho em mobile após adicionar produto
            if (window.innerWidth < 1024) { // lg breakpoint
                setActiveTab('carrinho');
            }
        }
        // Caso contrário, produto sem estoque
        else {
            toast({ title: "Sem Estoque", description: `O produto ${produto.nome} está sem estoque.`, variant: "destructive" });
        }
    }, [toast, addProdutoAoCarrinho, setActiveTab]);

	useEffect(() => {
		if (!location.state?.orcamentoData || orcamentoLoadedRef.current) return;
		if (location.state?.orcamentoData) {
            const { id, itens, clienteId, clienteNome, obs_pedido, descontoTipo, descontoValor } = location.state.orcamentoData;
            // Buscar cliente considerando tanto string quanto number
            const cliente = clientes.find(c => 
                c.id === clienteId || 
                c.id === parseInt(clienteId) || 
                c.id === String(clienteId)
            );
            

            const itensCarrinho = itens.map(item => ({
              ...item,
              id: item.id_produto, 
              nome: item.nome,
              preco_venda_unitario: item.preco_venda_aplicado,
              quantidade: item.quantidade,
              variacao: item.variacao,
              imagem_principal: item.imagem_principal,
            }));

            setCarrinho(itensCarrinho);
            if (cliente) {
                setClienteSelecionado(cliente);
            } else if (clienteId) {
                // Se não encontrou o cliente na lista, mas tem o clienteId, criar um objeto cliente temporário
                setClienteSelecionado({
                    id: clienteId,
                    nome: clienteNome || 'Cliente não encontrado',
                    nome_completo: clienteNome || 'Cliente não encontrado',
                    cpf_cnpj: null,
                    telefone: null,
                    email: null
                });
            } else {
                setClienteNomeLivre(clienteNome);
            }
			setObservacoes(obs_pedido);
			setDesconto({ tipo: descontoTipo, valor: descontoValor });
			// Guardar o ID do orçamento para conversão e já alternar para venda
			setOrcamentoEmConversaoId(id);
			setModoDocumento('venda');

            orcamentoLoadedRef.current = true;
			navigate(location.pathname, { replace: true, state: {} });
            toast({ title: 'Orçamento Carregado', description: `Orçamento ${id} pronto para edição ou venda.` });
        }
    }, [location.state, clientes, navigate, setCarrinho, setClienteSelecionado, setObservacoes, setDesconto, toast]);

    // Carregar dados de venda para finalização
    useEffect(() => {
        if (!location.state?.vendaData || orcamentoLoadedRef.current) return;
        if (location.state?.vendaData) {
            const { id, itens, clienteId, clienteNome, obs_pedido, descontoTipo, descontoValor } = location.state.vendaData;
            
            // Buscar cliente considerando tanto string quanto number
            const cliente = clientes.find(c => 
                c.id === clienteId || 
                c.id === parseInt(clienteId) || 
                c.id === String(clienteId)
            );
            
            const itensCarrinho = itens.map(item => {
                // Normalizar quantidade: converter string "2.000" para número 2
                const qtdNormalizada = typeof item.quantidade === 'string' 
                    ? parseFloat(item.quantidade.replace(',', '.')) || 0
                    : parseFloat(item.quantidade) || 0;
                
                return {
                    ...item,
                    id: item.id_produto, 
                    nome: item.nome,
                    preco_venda_unitario: item.preco_venda_aplicado,
                    quantidade: qtdNormalizada,
                    variacao: item.variacao,
                    imagem_principal: item.imagem_principal,
                };
            });

            setCarrinho(itensCarrinho);
            if (cliente) {
                setClienteSelecionado(cliente);
            } else if (clienteId) {
                // Se não encontrou o cliente na lista, mas tem o clienteId, criar um objeto cliente temporário
                setClienteSelecionado({
                    id: clienteId,
                    nome: clienteNome || 'Cliente não encontrado',
                    nome_completo: clienteNome || 'Cliente não encontrado',
                    cpf_cnpj: null,
                    telefone: null,
                    email: null
                });
            } else {
                setClienteNomeLivre(clienteNome);
            }
            setObservacoes(obs_pedido);
            setDesconto({ tipo: descontoTipo, valor: descontoValor });
            // Já alternar para venda
            setModoDocumento('venda');

            orcamentoLoadedRef.current = true;
            navigate(location.pathname, { replace: true, state: {} });
            toast({ title: 'Venda Carregada', description: `Venda ${id} pronta para finalização.` });
        }
    }, [location.state, clientes, navigate, setCarrinho, setClienteSelecionado, setObservacoes, setDesconto, toast]);

    // Carregar dados de pré-venda para edição
    useEffect(() => {
        if (!location.state?.preVendaData || preVendaLoadedRef.current) return;
        if (location.state?.preVendaData) {
            const { id, itens, clienteId, clienteNome, obs_pedido, descontoTipo, descontoValor, modoDocumento, isEdicao } = location.state.preVendaData;
            
            
            // Definir se é uma edição
            setIsEdicaoPreVenda(isEdicao || false);
            setPreVendaId(id);
            
            // Buscar cliente considerando tanto string quanto number
            const cliente = clientes.find(c => 
                c.id === clienteId || 
                c.id === parseInt(clienteId) || 
                c.id === String(clienteId)
            );
            

            const itensCarrinho = itens.map(item => {
                // Normalizar quantidade: converter string "2.000" para número 2
                const qtdNormalizada = typeof item.quantidade === 'string' 
                    ? parseFloat(item.quantidade.replace(',', '.')) || 0
                    : parseFloat(item.quantidade) || 0;
                
                return {
                    ...item,
                    id: item.id_produto, 
                    nome: item.nome,
                    preco_venda_unitario: item.preco_venda_aplicado,
                    quantidade: qtdNormalizada,
                    variacao: item.variacao,
                    imagem_principal: item.imagem_principal,
                };
            });

            setCarrinho(itensCarrinho);
            if (cliente) {
                setClienteSelecionado(cliente);
            } else if (clienteId) {
                // Se não encontrou o cliente na lista, mas tem o clienteId, criar um objeto cliente temporário
                setClienteSelecionado({
                    id: clienteId,
                    nome: clienteNome || 'Cliente não encontrado',
                    nome_completo: clienteNome || 'Cliente não encontrado',
                    cpf_cnpj: null,
                    telefone: null,
                    email: null
                });
            } else {
                setClienteNomeLivre(clienteNome);
            }
            setObservacoes(obs_pedido);
            setDesconto({ tipo: descontoTipo, valor: descontoValor });
            setModoDocumento(modoDocumento);

            // Limpar o estado após carregar os dados
            preVendaLoadedRef.current = true;
            navigate(location.pathname, { replace: true, state: {} });
            toast({ 
                title: 'Pré-venda Carregada', 
                description: `Pré-venda ${id} carregada para edição.`, 
                duration: 3000 
            });
        }
    }, [location.state, clientes, navigate, setCarrinho, setClienteSelecionado, setObservacoes, setDesconto, setModoDocumento, toast]); 

    useEffect(() => {
        const loadEmpresaSettings = async () => {
            try {
                const settings = await apiDataManager.getItem('empresaSettings');
                if (settings) {
                    setEmpresaSettings(JSON.parse(settings));
                }
            } catch (error) {
                console.error('Erro ao carregar configurações da empresa:', error);
            }
        };
        loadEmpresaSettings();
    }, []);

  // Detectar leitura de código de barras no campo de busca e adicionar produto/variação automaticamente
  useEffect(() => {
    const raw = (searchTerm || '').trim();
    if (raw.length < 8) {
      barcodeHandledRef.current = false;
      return;
    }

    // Evitar processamento duplo durante a leitura do scanner
    if (barcodeHandledRef.current) return;

    const codigo = raw.toLowerCase();
    // Procurar produto ou variação cuja string de código corresponda exatamente
    let produtoEncontrado = null;
    let variacaoEncontrada = null;
    for (const p of produtos || []) {
      if (!p?.status) continue;
      if (
        (p.codigo_barras && String(p.codigo_barras).toLowerCase() === codigo) ||
        (p.codigo_produto && String(p.codigo_produto).toLowerCase() === codigo)
      ) {
        produtoEncontrado = p;
        break;
      }
      if (p.variacoes_ativa && Array.isArray(p.variacoes)) {
        const v = p.variacoes.find(vr => String(vr.codigo_barras || '').toLowerCase() === codigo);
        if (v) {
          produtoEncontrado = p;
          variacaoEncontrada = v;
          break;
        }
      }
    }

    if (produtoEncontrado) {
      barcodeHandledRef.current = true;
      addProdutoAoCarrinho(produtoEncontrado, 1, variacaoEncontrada || null);
      // Limpar o campo de busca após adicionar
      setSearchTerm('');
      // Liberar o lock pouco depois para próximas leituras
      setTimeout(() => { barcodeHandledRef.current = false; }, 200);
    }
  }, [searchTerm, produtos, addProdutoAoCarrinho]);
    
    const handleTransformarEmOS = () => {
        if (carrinho.length === 0) {
            toast({ title: "Carrinho Vazio", description: "Adicione produtos antes de transformar em O.S.", variant: "destructive" });
            return;
        }
        if (!clienteSelecionado && !clienteNomeLivre) {
            toast({ title: "Cliente não informado", description: "Selecione ou informe um cliente.", variant: "destructive" });
            return;
        }

        // Converter itens do carrinho para formato de OS
        const itensOS = carrinho.map((item, index) => {
            const idItemOS = `item-${Date.now()}-${index}`;
            return {
                id_item_os: idItemOS,
                nome_servico_produto: item.nome || 'Produto sem nome',
                tipo_item: 'unidade', // PDV trabalha com unidades
                quantidade: parseFloat(item.quantidade) || 1,
                valor_unitario: parseFloat(item.preco_venda_aplicado || item.preco_venda_unitario || 0),
                subtotal_item: (parseFloat(item.quantidade) || 1) * (parseFloat(item.preco_venda_aplicado || item.preco_venda_unitario || 0)),
                produto_id: item.id_produto || null,
                variacao_selecionada: item.variacao || null,
                observacoes: item.observacoes || ''
            };
        });

        // Preparar dados do cliente
        const clienteInfo = clienteSelecionado ? {
            id: clienteSelecionado.id,
            nome: clienteSelecionado.nome_completo || clienteSelecionado.nome,
            nome_completo: clienteSelecionado.nome_completo || clienteSelecionado.nome,
            email: clienteSelecionado.email || '',
            telefone: clienteSelecionado.telefone || '',
            cpf_cnpj: clienteSelecionado.cpf_cnpj || ''
        } : null;

        // Calcular valores
        const subtotalCalculado = calcularSubtotal();
        const descontoValor = calcularDescontoValor();
        const valorTotalCalculado = valorTotal;
        const freteValor = frete ? parseFloat(frete.valor_frete || 0) : 0;

        // Navegar para a página de OS com os dados
        navigate('/operacional/ordens-servico', {
            state: {
                fromPDV: true,
                cliente: clienteInfo,
                clienteNome: clienteNomeLivre || clienteInfo?.nome,
                itens: itensOS,
                observacoes_gerais_os: observacoes || '',
                valor_total_os: valorTotalCalculado + freteValor,
                subtotal: subtotalCalculado,
                desconto: descontoValor,
                desconto_geral_tipo: desconto.tipo || 'percentual',
                desconto_geral_valor: desconto.valor || 0,
                frete_valor: freteValor,
                frete: frete
            }
        });
    };

    const handleFinalizarDocumentoAction = async () => {
        if (carrinho.length === 0) {
            toast({ title: "Carrinho Vazio", description: "Adicione produtos antes de finalizar.", variant: "destructive" });
            return;
        }
        if (!clienteSelecionado && !clienteNomeLivre) {
            toast({ title: "Cliente não informado", description: "Selecione ou informe um cliente.", variant: "destructive" });
            return;
        }
        
        // Verificar se é uma edição de pré-venda
        if (modoDocumento === 'venda') {
            // Para edição de pré-venda ou nova venda, abrir modal de pagamento
            setIsPagamentoModalOpen(true);
        } else { 
            const orcamento = await finalizarDocumento(
                [], 
                'orcamento', 
                clienteNomeLivre,
                null,
                null,
                null,
                frete
            );
            if (orcamento) {
                limparCarrinhoEState();
                setClienteNomeLivre('');
                
                // Toast com opções para o usuário
                toast({
                    title: "Orçamento Salvo com Sucesso!",
                    description: "O que deseja fazer agora?",
                    action: (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => navigate('/operacional/pdv')}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                            >
                                Novo Pedido
                            </button>
                            <button 
                                onClick={() => {
                                    setDocumentoSelecionado(orcamento);
                                    setIsReciboModalOpen(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                            >
                                Ver Orçamento
                            </button>
                        </div>
                    ),
                    duration: 5000,
                });
            }
        }
    };

	const handleConfirmarPagamento = async (pagamentosRecebidos, dadosPontos = null) => {
        // Debug temporário para rastrear duplicação
        console.log('🔍 DEBUG FINALIZAÇÃO:', {
            isEdicaoPreVenda,
            preVendaId,
            orcamentoEmConversaoId,
            carrinho: carrinho.length,
            cliente: clienteSelecionado?.nome || clienteNomeLivre
        });
        
        try {
            let doc;
            if (isEdicaoPreVenda && preVendaId) {
                console.log('🔄 ATUALIZANDO PRÉ-VENDA EXISTENTE:', preVendaId);
                // Atualizar a pré-venda existente
                doc = await finalizarDocumento(
                    pagamentosRecebidos, 
                    'venda', 
                    clienteNomeLivre,
					preVendaId, // Passar o ID da pré-venda para atualização
					dadosPontos,
					orcamentoEmConversaoId, // manter referência caso tenha vindo de orçamento
					frete
                );
            } else {
                console.log('🆕 CRIANDO NOVA VENDA');
                // Criar nova venda
                doc = await finalizarDocumento(
                    pagamentosRecebidos, 
                    'venda', 
                    clienteNomeLivre,
					null,
					dadosPontos,
					orcamentoEmConversaoId,
					frete
                );
            }
            
            if (doc) {
                console.log('✅ VENDA FINALIZADA COM SUCESSO:', doc.id);
                // Pré-venda do catálogo: o registro foi atualizado no lugar (não criado outro), não é necessário deletar
                
                setIsPagamentoModalOpen(false);
                limparCarrinhoEState();
                setClienteNomeLivre('');
                
				// Limpar estados de edição para evitar duplicação
                console.log('🧹 LIMPANDO ESTADOS DE EDIÇÃO');
                setIsEdicaoPreVenda(false);
                setPreVendaId(null);
				setOrcamentoEmConversaoId(null);
                
                // Abrir recibo automaticamente
                setDocumentoSelecionado(doc);
                setIsReciboModalOpen(true);
                
                // Toast simples informando o sucesso
                const title = isEdicaoPreVenda ? "Pré-venda Finalizada com Sucesso!" : "Venda Finalizada com Sucesso!";
                toast({
                    title: title,
                    description: "Recibo aberto automaticamente.",
                    duration: 3000,
                });
            }
        } catch (error) {
            console.error('Erro ao finalizar venda:', error);
            toast({
                title: "Erro ao Finalizar Venda",
                description: error.message || "Ocorreu um erro ao finalizar a venda. Verifique se o cliente está selecionado.",
                variant: "destructive",
                duration: 5000,
            });
        }
    };

    const handleNovoPedido = () => {
        console.log('🔄 NOVO PEDIDO - LIMPANDO TUDO');
        limparCarrinhoEState();
        setClienteNomeLivre('');
        setFrete(null);
        // Limpar estados de edição para evitar duplicação
        setIsEdicaoPreVenda(false);
        setPreVendaId(null);
        setOrcamentoEmConversaoId(null);
        console.log('✅ NOVO PEDIDO - ESTADOS LIMPOS');
    }

    const handleGerarPdfRecibo = async () => {
        if (!documentoSelecionado || !reciboRef.current) return;
        try {
            await generatePdfFromElement(reciboRef.current, `${documentoSelecionado.tipo || 'Documento'}_${documentoSelecionado.id || 'N/A'}.pdf`);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
        }
    };
    
    const handleImpressaoRecibo = async () => {
        if (!documentoSelecionado || !reciboRef.current) return;
        try {
            await printElement(reciboRef.current, `${documentoSelecionado.tipo || 'Documento'} ${documentoSelecionado.id || 'N/A'}`);
        } catch (error) {
            console.error('Erro ao imprimir:', error);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row h-screen bg-gray-100 dark:bg-gray-900">
            {/* Tabs para Mobile */}
            <div className="lg:hidden flex border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                <button
                    onClick={() => setActiveTab('produtos')}
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                        activeTab === 'produtos'
                            ? 'bg-orange-500 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                    Produtos {produtos.length > 0 && `(${produtos.length})`}
                </button>
                <button
                    onClick={() => setActiveTab('carrinho')}
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
                        activeTab === 'carrinho'
                            ? 'bg-orange-500 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                    Carrinho
                    {carrinho.length > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                            {carrinho.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Grid de Produtos - Visível sempre no desktop, controlado por tab no mobile */}
            <div className={`${activeTab === 'produtos' ? 'flex' : 'hidden'} lg:flex flex-1 min-w-0`}>
                <PDVProductGrid 
                    produtos={produtos}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    handleProdutoClick={handleProdutoClick}
                    categorias={categorias}
                />
            </div>

            {/* Seção do Carrinho - Visível sempre no desktop, controlado por tab no mobile */}
            <div className={`${activeTab === 'carrinho' ? 'flex' : 'hidden'} lg:flex`}>
                <PDVCartSection
                    carrinho={carrinho}
                    setCarrinho={setCarrinho}
                    productColors={productColors}
                    productSizes={productSizes}
                    produtos={produtos}
                    desconto={desconto}
                    setDesconto={setDesconto}
                    observacoes={observacoes}
                    setObservacoes={setObservacoes}
                    clienteSelecionado={clienteSelecionado}
                    clienteNomeLivre={clienteNomeLivre}
                    setClienteNomeLivre={setClienteNomeLivre}
                    setIsClienteModalOpen={setIsClienteModalOpen}
                    calcularSubtotal={calcularSubtotal}
                    calcularDescontoValor={calcularDescontoValor}
                    valorTotal={valorTotal} 
                    handleFinalizarDocumento={handleFinalizarDocumentoAction}
                    handleCancelarVenda={handleNovoPedido}
                    modoDocumento={modoDocumento}
                    setModoDocumento={setModoDocumento}
                    frete={frete}
                    setFrete={setFrete}
                    handleTransformarEmOS={handleTransformarEmOS}
                />
            </div>

            <PDVVariationsModal
                isOpen={isVariacaoModalOpen}
                setIsOpen={setIsVariacaoModalOpen}
                produto={selectedProduto}
                selectedVariacaoDetails={selectedVariacaoDetails}
                setSelectedVariacaoDetails={setSelectedVariacaoDetails}
                addProdutoAoCarrinho={addProdutoAoCarrinho}
                getNomeVariacao={getNomeVariacao}
                carrinho={carrinho}
            />

            <PDVCustomerModal
                isOpen={isClienteModalOpen}
                setIsOpen={setIsClienteModalOpen}
                clientes={clientes}
                setClientes={setClientes}
                setClienteSelecionado={setClienteSelecionado}
                setClienteNomeLivre={setClienteNomeLivre}
            />

            <OSPagamentoModal
                open={isPagamentoModalOpen}
                onOpenChange={setIsPagamentoModalOpen}
                totalOS={valorTotal} 
                onConfirmPagamento={handleConfirmarPagamento}
                clienteId={clienteSelecionado?.id}
                vendedorAtual={vendedorAtual}
            />

            {documentoSelecionado && (
                <PDVReciboModal
                    isOpen={isReciboModalOpen}
                    setIsOpen={setIsReciboModalOpen}
                    reciboRef={reciboRef}
                    documento={documentoSelecionado}
                    logoUrl={empresaSettings?.logoUrl || ''}
                    nomeEmpresa={empresaSettings?.nomeFantasia || ''}
                    empresaSettings={empresaSettings}
                    produtos={produtos}
                    productColors={productColors}
                    productSizes={productSizes}
                    getNomeVariacao={getNomeVariacao}
                    handleImpressaoRecibo={handleImpressaoRecibo}
                    handleGerarPdfRecibo={handleGerarPdfRecibo}
                    handleNovoPedido={() => {
                        setIsReciboModalOpen(false);
                        navigate('/operacional/pdv');
                    }} 
                />
            )}
        </motion.div>
    );
};

export default PDVPage;