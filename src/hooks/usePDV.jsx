import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { safeJsonParse, isPromocaoAtiva, loadDataWithGetItem } from '@/lib/utils';
import { useAuditoria } from '@/hooks/useAuditoria';
import { salvarDocumentoPDV, baixarEstoquePDV, registrarDescontoFuncionarioPDV } from '@/hooks/pdv/pdvDataService';
import { produtoService, clienteService, corService, tamanhoService, categoriaService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateForBackend } from '@/utils/dateUtils';


const CAIXA_ATUAL_KEY = 'caixa_atual';
const HISTORICO_VENDAS_PDV_KEY = 'historico_vendas_pdv';
const ORCAMENTOS_PDV_KEY = 'orcamentosPDV';
const CLIENTES_KEY = 'clientes';
const PRODUTOS_KEY = 'produtos';
const VENDEDOR_ATUAL_ID_KEY = 'vendedorAtualId';
const FUNCIONARIOS_KEY = 'funcionarios';
const PRODUCT_COLORS_KEY = 'productColors';
const PRODUCT_SIZES_KEY = 'productSizes';


export const usePDV = (vendedorAtualProp) => {
  const { toast } = useToast();
  const { registrarAcao } = useAuditoria();
  const { user } = useAuth();
  const [vendedorAtual, setVendedorAtual] = useState(vendedorAtualProp);
  
  const [carrinho, setCarrinho] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [desconto, setDesconto] = useState({ tipo: 'percent', valor: '' });
  
  // Log inicial do estado do desconto
  
  // Wrapper para setDesconto com logs
  const setDescontoWithLog = (novoDesconto) => {
    setDesconto(novoDesconto);
  };
  const [observacoes, setObservacoes] = useState('');
  
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [productColors, setProductColors] = useState([]);
  const [productSizes, setProductSizes] = useState([]);

  const [subtotal, setSubtotal] = useState(0);
  const [descontoAplicado, setDescontoAplicado] = useState(0);
  const [valorTotal, setValorTotal] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [documentoAtualId, setDocumentoAtualId] = useState(null);

  const calcularSubtotal = useCallback(() => {
    const subtotal = carrinho.reduce((acc, item) => {
        const preco = parseFloat(item.preco_venda_aplicado || item.preco_venda_unitario || 0);
        // Garantir que a quantidade seja sempre um número válido
        let qtd = 0;
        if (typeof item.quantidade === 'number') {
          qtd = item.quantidade;
        } else if (typeof item.quantidade === 'string') {
          qtd = parseFloat(item.quantidade.replace(',', '.')) || 0;
        } else {
          qtd = parseFloat(String(item.quantidade || 0).replace(',', '.')) || 0;
        }
        const itemSubtotal = preco * qtd;
        return acc + itemSubtotal;
    }, 0);
    return subtotal;
  }, [carrinho]);

  const calcularDescontoValor = useCallback(() => {
    const sub = calcularSubtotal();
    const valorDescontoStr = String(desconto.valor || '0').trim();
    const valorDescontoNum = valorDescontoStr === '' ? 0 : parseFloat(valorDescontoStr.replace(',', '.')) || 0;
    let novoDescontoAplicado = 0;
    
    if (desconto.tipo === 'percent') {
      novoDescontoAplicado = sub * (valorDescontoNum / 100);
    } else if (desconto.tipo === 'fixed') { // tipo 'fixed'
      novoDescontoAplicado = valorDescontoNum;
    } else {
    }
    
    const resultado = Math.max(0, Math.min(novoDescontoAplicado, sub));
    return resultado;
  }, [desconto, calcularSubtotal]);


  const calcularTotais = useCallback(() => {
    const novoSubtotal = calcularSubtotal();
    setSubtotal(novoSubtotal);

    const novoDescontoAplicado = calcularDescontoValor();
    setDescontoAplicado(novoDescontoAplicado);

    const novoValorTotal = novoSubtotal - novoDescontoAplicado;
    setValorTotal(novoValorTotal);
  }, [calcularSubtotal, calcularDescontoValor]);


  useEffect(() => {
        const loadData = async () => {
            try {
                // Buscar produtos - SEMPRE buscar da API para garantir estoque atualizado
                try {
                    let produtosArray = [];
                    
                    // Sempre buscar da API primeiro para ter dados atualizados
                    try {
                        const produtosResponse = await produtoService.getAll('?per_page=1000');
                        const produtosData = produtosResponse.data?.data?.data || produtosResponse.data?.data || produtosResponse.data || [];
                        produtosArray = Array.isArray(produtosData) ? produtosData : [];
                        
                        // Atualizar o cache com os dados mais recentes
                        await apiDataManager.setItem('produtos', JSON.stringify(produtosArray));
                    } catch (apiError) {
                        console.warn('⚠️ Erro ao buscar produtos da API, tentando cache:', apiError);
                        // Se falhar, usar cache como fallback
                        produtosArray = await apiDataManager.getDataAsArray('produtos', []);
                    }
                    
                    // Helper para verificar se produto está ativo (aceita diferentes formatos)
                    const isProdutoAtivo = (p) => {
                        if (p.status === true || p.status === 1) return true;
                        if (p.status === false || p.status === 0) return false;
                        if (typeof p.status === 'string') {
                            const statusLower = p.status.toLowerCase().trim();
                            return statusLower === 'ativo' || statusLower === 'true' || statusLower === '1';
                        }
                        // Se status não estiver definido, considerar como ativo por padrão
                        return p.status !== false && p.status !== 0;
                    };
                    
                    const produtosFiltrados = produtosArray.filter(p => isProdutoAtivo(p));
                    setProdutos(produtosFiltrados);
                } catch(error) {
                    console.error('❌ Erro ao buscar produtos:', error);
                    setProdutos([]);
                }
                
                // Buscar clientes da API
                try {
                    const clientesResponse = await clienteService.getAll();
                    
                    // Corrigir estrutura de resposta se necessário
                    const clientesData = clientesResponse.data?.data?.data || clientesResponse.data?.data || clientesResponse.data || clientesResponse || [];
                    
                    if (Array.isArray(clientesData)) {
                        setClientes(clientesData);
                    } else {
                        console.warn('⚠️ Clientes não é um array:', clientesData);
                        setClientes([]);
                    }
                } catch(error) {
                    console.error('❌ Erro ao buscar clientes:', error);
                    setClientes([]);
                }

                // Buscar funcionários através do apiDataManager (dados_usuario)
                try {
                    const funcionariosData = await apiDataManager.getData('funcionarios', []);
                    
                    if (Array.isArray(funcionariosData)) {
                        setFuncionarios(funcionariosData);
                    } else {
                        console.warn('⚠️ Funcionários não é um array:', funcionariosData);
                        // Dados padrão para funcionários
                        const funcionariosPadrao = [
                            { id: 'func1', nome: 'MASTER', cargo: 'Gerente', comissao: 5, login: 'MASTER', senha: '5CAS', permite_receber_comissao: true, salarioBase: '3000.00', vales: [], faltas: [], permite_desconto_consumo_interno: true, status: 'Ativo' }
                        ];
                        setFuncionarios(funcionariosPadrao);
                    }
                } catch(error) {
                    console.error('❌ Erro ao buscar funcionários:', error);
                    // Dados padrão para funcionários em caso de erro
                    const funcionariosPadrao = [
                        { id: 'func1', nome: 'MASTER', cargo: 'Gerente', comissao: 5, login: 'MASTER', senha: '5CAS', permite_receber_comissao: true, salarioBase: '3000.00', vales: [], faltas: [], permite_desconto_consumo_interno: true, status: 'Ativo' }
                    ];
                    setFuncionarios(funcionariosPadrao);
                }
                
                // Buscar cores da API
                try {
                    const coresResponse = await corService.getAll();
                    const coresData = coresResponse.data?.data?.data || coresResponse.data?.data || coresResponse.data || [];
                    setProductColors(Array.isArray(coresData) ? coresData : []);
                } catch(error) {
                    console.error('Erro ao carregar cores:', error);
                    setProductColors([]);
                }
                
                // Buscar tamanhos da API
                try {
                    const tamanhosResponse = await tamanhoService.getAll();
                    const tamanhosData = tamanhosResponse.data?.data?.data || tamanhosResponse.data?.data || tamanhosResponse.data || [];
                    setProductSizes(Array.isArray(tamanhosData) ? tamanhosData : []);
                } catch(error) {
                    console.error('Erro ao carregar tamanhos:', error);
                    setProductSizes([]);
                }
                
                // Buscar categorias da API
                try {
                    const categoriasResponse = await categoriaService.getAll();
                    const categoriasData = categoriasResponse.data?.data?.data || categoriasResponse.data?.data || categoriasResponse.data || [];
                    setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
                } catch(error) {
                    console.error('Erro ao carregar categorias:', error);
                    setCategorias([]);
                }
            } catch(error) {
                console.error('Erro ao carregar dados:', error);
                toast({
                    title: "Erro",
                    description: "Erro ao carregar dados. Tente novamente.",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, [vendedorAtualProp, toast]);

  useEffect(() => {
    calcularTotais();
  }, [carrinho, desconto, calcularTotais]);

  const getNomeVariacao = useCallback((varId, type) => {
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
  }, [productColors, productSizes]);

  const addProdutoAoCarrinho = useCallback((produto, quantidade = 1, variacaoSelecionada = null) => {
    if (!produto || !produto.id) {
        toast({ title: "Erro", description: "Produto inválido.", variant: "destructive" });
        return;
    }
    
    // Verificar se o produto é composto
    const isComposto = produto.isComposto || produto.is_composto;
    
    
    // Para produtos com variações, sempre controlar estoque da variação específica
    // Produtos compostos só não controlam estoque se não tiverem variações
    const temVariacoes = produto.variacoes && Array.isArray(produto.variacoes) && produto.variacoes.length > 0;
    
    // SEMPRE controlar estoque para produtos com variações
    let deveControlarEstoque = true; // Por padrão, sempre controlar estoque
    
    // Só não controlar estoque se for produto composto SEM variações
    if (isComposto && !temVariacoes) {
        deveControlarEstoque = false;
    }
    
    let itemParaAdicionar = {
        id_produto: produto.id,
        nome: produto.nome,
        codigo_produto: produto.codigo_produto,
        unidadeMedida: produto.unidade_medida || produto.unidadeMedida,
        preco_venda_unitario: parseFloat(produto.preco_venda || 0),
        preco_custo_unitario: parseFloat(produto.preco_custo || 0),
        quantidade: quantidade,
        imagem_principal: produto.imagem_principal || '',
        variacao: null,
        controlar_estoque: deveControlarEstoque,
        isNovoDoXml: false,
        isComposto: isComposto,
        composicao: produto.composicao || [],
    };

    const promo = isPromocaoAtiva(produto);
    if (promo && parseFloat(produto.preco_promocional) > 0) {
        itemParaAdicionar.preco_venda_unitario = parseFloat(produto.preco_promocional);
        itemParaAdicionar.promocao_info = {
            preco_original: parseFloat(produto.preco_venda),
            preco_promocional: parseFloat(produto.preco_promocional),
        };
    }
    
    let estoqueDisponivel = parseFloat(produto.estoque || 0);
    let variacaoIdNoCarrinho = produto.id; // ID único para o item no carrinho

    if (variacaoSelecionada) {
        estoqueDisponivel = parseFloat(variacaoSelecionada.estoque_var || 0);
        
        // Determinar o preço da variação
        let precoVariacao = parseFloat(variacaoSelecionada.preco_var || 0);
        let precoBase = precoVariacao > 0 ? precoVariacao : parseFloat(produto.preco_venda || 0);
        
        // Se há promoção ativa e a variação não tem preço específico, usar o preço promocional do produto
        if (promo && parseFloat(produto.preco_promocional || 0) > 0 && precoVariacao === 0) {
            itemParaAdicionar.preco_venda_unitario = parseFloat(produto.preco_promocional);
            itemParaAdicionar.promocao_info = {
                preco_original: parseFloat(produto.preco_venda),
                preco_promocional: parseFloat(produto.preco_promocional),
            };
        } else {
            itemParaAdicionar.preco_venda_unitario = precoBase;
        }

        itemParaAdicionar.variacao = {
            id: variacaoSelecionada.id ?? variacaoSelecionada.id_variacao,
            id_variacao: variacaoSelecionada.id ?? variacaoSelecionada.id_variacao,
            cor: variacaoSelecionada.cor,
            tamanho: variacaoSelecionada.tamanho,
            nome: variacaoSelecionada.nome,
            nomeDisplay: variacaoSelecionada.nome || `${getNomeVariacao(variacaoSelecionada.cor, 'cor')} / ${getNomeVariacao(variacaoSelecionada.tamanho, 'tamanho')}`,
        };
        itemParaAdicionar.imagem_principal = variacaoSelecionada.imagem_url || produto.imagem_principal || '';
        variacaoIdNoCarrinho = `${produto.id}-${variacaoSelecionada.id}`;
    }
    
    itemParaAdicionar.preco_venda_aplicado = itemParaAdicionar.preco_venda_unitario;



    // Verificar estoque se deve controlar estoque e não há estoque suficiente
    const deveBloquear = itemParaAdicionar.controlar_estoque && estoqueDisponivel < quantidade;
    
    if (deveBloquear) {
        toast({
            title: "Estoque Insuficiente",
            description: `Produto ${itemParaAdicionar.nome} ${itemParaAdicionar.variacao ? `(${itemParaAdicionar.variacao.nome})` : ''} possui apenas ${estoqueDisponivel} em estoque.`,
            variant: "destructive",
            duration: 5000
        });
        return;
    }

    setCarrinho(prevCarrinho => {
        const itemExistenteIndex = prevCarrinho.findIndex(item => (item.variacao ? `${item.id_produto}-${item.variacao.id_variacao}` : item.id_produto) === variacaoIdNoCarrinho);

        if (itemExistenteIndex > -1) {
            const novoCarrinho = [...prevCarrinho];
            const qtdAtual = parseFloat(String(novoCarrinho[itemExistenteIndex].quantidade).replace(',', '.'));
            const novaQtd = qtdAtual + quantidade;
            
            const deveBloquearExistente = itemParaAdicionar.controlar_estoque && estoqueDisponivel < novaQtd;
            
            console.log('🔄 ITEM EXISTENTE NO CARRINHO:', {
                produto: itemParaAdicionar.nome,
                variacao: itemParaAdicionar.variacao?.nome,
                qtdAtual: qtdAtual,
                quantidade: quantidade,
                novaQtd: novaQtd,
                estoqueDisponivel: estoqueDisponivel,
                controlar_estoque: itemParaAdicionar.controlar_estoque,
                deveBloquear: deveBloquearExistente,
                status: deveBloquearExistente ? '🚫 BLOQUEADO' : '✅ PERMITIDO'
            });
            
            if (deveBloquearExistente) {
                toast({
                    title: "Estoque Insuficiente",
                    description: `Você já tem ${qtdAtual} no carrinho. Não há estoque para adicionar mais ${quantidade} de ${itemParaAdicionar.nome} ${itemParaAdicionar.variacao ? `(${itemParaAdicionar.variacao.nome})` : ''}. Total em estoque: ${estoqueDisponivel}.`,
                    variant: "destructive",
                    duration: 7000
                });
                return prevCarrinho; // Não altera o carrinho
            }
            novoCarrinho[itemExistenteIndex].quantidade = novaQtd;
            return novoCarrinho;
        } else {
            return [...prevCarrinho, itemParaAdicionar];
        }
    });
    toast({
        title: "Produto Adicionado",
        description: `${itemParaAdicionar.nome} ${itemParaAdicionar.variacao ? `(${itemParaAdicionar.variacao.nome})` : ''} adicionado ao carrinho.`,
        className: "bg-green-600 text-white",
    });
  }, [toast, getNomeVariacao]);
  
  const limparCarrinhoEState = useCallback(() => {
    setCarrinho([]);
    setClienteSelecionado(null);
    setDesconto({ tipo: 'percent', valor: '' });
    setObservacoes('');
    setDocumentoAtualId(null);
  }, []);

  const finalizarDocumento = async (
    pagamentosRecebidos = [],
    tipoDocumento = 'venda',
    clienteNomeLivre = '',
    preVendaId = null,
    dadosPontos = null,
    orcamentoOrigemId = null
  ) => {
    if (carrinho.length === 0) {
      toast({ title: "Carrinho Vazio", description: "Adicione produtos ao carrinho para finalizar.", variant: "destructive" });
      return null;
    }
    
    // Se é uma edição de pré-venda, usar o ID existente, senão gerar novo
    // Para conversão de orçamento, usar o ID do orçamento original
    const idDocumento = preVendaId || (orcamentoOrigemId && tipoDocumento === 'venda' ? orcamentoOrigemId : `doc-${tipoDocumento === 'venda' ? 'v' : 'o'}-${Date.now()}`);
    setDocumentoAtualId(idDocumento);

    // Usar o usuário logado como vendedor se não houver vendedorAtual
    const vendedorInfo = vendedorAtual || { 
      id: user?.id || 'sistema', 
      nome: user?.name || 'Sistema' 
    };
    
    
    const clienteFinal = clienteSelecionado 
      ? { id: clienteSelecionado.id, nome: clienteSelecionado.nome_completo || clienteSelecionado.nome, cpf_cnpj: clienteSelecionado.cpf_cnpj, tipo_cadastro_especial: clienteSelecionado.tipo_cadastro_especial, funcionario_id_associado: clienteSelecionado.funcionario_id_associado } 
      : (clienteNomeLivre ? { id: null, nome: clienteNomeLivre, cpf_cnpj: null } : null);
    
    
    const caixaAberto = safeJsonParse(await apiDataManager.getItem(CAIXA_ATUAL_KEY));
    const currentSubtotal = calcularSubtotal();
    const currentDescontoAplicado = calcularDescontoValor();
    const currentValorTotal = currentSubtotal - currentDescontoAplicado;

    // Ajustar totais considerando desconto por pontos (se houver)
    const descontoPontos = dadosPontos && parseFloat(dadosPontos.descontoPontosAplicado || 0) > 0
      ? parseFloat(dadosPontos.descontoPontosAplicado)
      : 0;
    const totalConsiderandoPontos = Math.max(0, currentValorTotal - descontoPontos);
    const descontoAplicadoTotal = currentDescontoAplicado + descontoPontos;

    const documentoParaSalvar = {
      id: idDocumento,
      caixa_id: tipoDocumento === 'venda' && caixaAberto ? caixaAberto.id : null,
      data_emissao: formatDateForBackend(),
      data_validade: tipoDocumento === 'orcamento' ? formatDateForBackend(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)) : null, // 5 dias para orçamento
      cliente: clienteFinal,
      cliente_nome: clienteFinal?.nome, 
      vendedor_id: vendedorInfo.id,
      vendedor_nome: vendedorInfo.nome,
      itens: carrinho.map(item => ({
        id_produto: item.id_produto, 
        nome: item.nome, 
        quantidade: parseFloat(String(item.quantidade).replace(',', '.')) || 0,
        preco_venda_unitario: parseFloat(item.preco_venda_aplicado || item.preco_venda_unitario || 0),
        preco_custo_unitario: parseFloat(item.preco_custo_unitario || 0),
        unidadeMedida: item.unidadeMedida,
        variacao: item.variacao, 
        imagem_principal: item.imagem_principal || '',
        promocao_info: item.promocao_info,
      })),
      subtotal: currentSubtotal,
      desconto: {
        tipo: desconto.tipo,
        valor: parseFloat(String(desconto.valor).replace(',', '.')) || 0,
        // Somar o desconto normal com o desconto proveniente de pontos
        valor_aplicado: descontoAplicadoTotal,
      },
      // Total já considerando o desconto por pontos, para evitar "Restante em Aberto"
      total: totalConsiderandoPontos, 
      pagamentos: tipoDocumento === 'venda' ? pagamentosRecebidos.map(p => ({ ...p, valor: parseFloat(p.valor||0), valorFinal: parseFloat(p.valorFinal||p.valor||0) })) : [],
      observacoes: observacoes,
      status: tipoDocumento === 'venda' ? 'Finalizado' : 'Pendente', 
      tipo: tipoDocumento === 'venda' ? 'Venda PDV' : 'Orçamento PDV',
      origem_venda: 'PDV',
      // Informações para identificar se é uma edição
      isEdicao: !!preVendaId,
      preVendaId: preVendaId,
      orcamentoId: orcamentoOrigemId || null,
      // Dados de pontos
      dadosPontos: dadosPontos,
    };
    
    if (tipoDocumento === 'venda') {
        const totalPagoDoc = documentoParaSalvar.pagamentos.reduce((acc, p) => acc + (p.valorFinal || p.valor), 0);
        documentoParaSalvar.saldo_pendente = Math.max(0, documentoParaSalvar.total - totalPagoDoc);
    }


    if (tipoDocumento === 'venda') {
        // REMOVIDO: baixarEstoquePDV - o backend já controla o estoque via API
        // A baixa local de estoque causava duplicação (baixava duas vezes)
        // const estoqueAtualizado = await baixarEstoquePDV(carrinho, (novosProdutos) => setProdutos(novosProdutos.filter(p => p.status === true)), registrarAcao, idDocumento);
        // if (!estoqueAtualizado) {
        //     setDocumentoAtualId(null);
        //     return null; 
        // }
        
        if (clienteFinal?.tipo_cadastro_especial === 'Funcionário' && clienteFinal.funcionario_id_associado) {
            await registrarDescontoFuncionarioPDV(documentoParaSalvar, clienteFinal, funcionarios, toast);
        }
    }
    
    const documentoSalvo = await salvarDocumentoPDV(
      documentoParaSalvar, 
      tipoDocumento, 
      await loadDataWithGetItem(HISTORICO_VENDAS_PDV_KEY, []),
      await loadDataWithGetItem(ORCAMENTOS_PDV_KEY, []),
      null, 
      null, 
      registrarAcao,
      vendedorAtual
    );

    // Atualizar o documento com os dados retornados da API (venda_id, codigo_venda)
    if (documentoSalvo) {
      documentoParaSalvar.venda_id = documentoSalvo.venda_id;
      documentoParaSalvar.codigo_venda = documentoSalvo.codigo_venda;
      // Atualizar também o ID se necessário
      if (documentoSalvo.venda_id && !documentoParaSalvar.id) {
        documentoParaSalvar.id = documentoSalvo.venda_id;
      }
    }

    // Atualizar produtos da API após finalizar venda para refletir estoque atualizado
    if (tipoDocumento === 'venda') {
        try {
            const produtosResponse = await produtoService.getAll('?per_page=1000');
            const produtosData = produtosResponse.data?.data?.data || produtosResponse.data?.data || produtosResponse.data || [];
            const produtosArray = Array.isArray(produtosData) ? produtosData : [];
            const produtosFiltrados = produtosArray.filter(p => p.status === true);
            setProdutos(produtosFiltrados);
            await apiDataManager.setItem('produtos', JSON.stringify(produtosArray));
        } catch (error) {
            console.error('❌ Erro ao atualizar produtos após venda:', error);
        }
    }

    // Mensagem específica para edição de pré-venda
    if (preVendaId) {
      toast({
        title: "Pré-venda Atualizada!",
                        description: `Pré-venda ${idDocumento ? String(idDocumento).slice(-6) : 'N/A'} convertida em venda e atualizada com sucesso.`,
        className: "bg-green-600 text-white",
      });
    } else {
      toast({
        title: tipoDocumento === 'venda' ? "Venda Finalizada!" : "Orçamento Salvo!",
                        description: `${tipoDocumento === 'venda' ? 'Venda' : 'Orçamento'} ${idDocumento ? String(idDocumento).slice(-6) : 'N/A'} ${tipoDocumento === 'venda' ? 'registrada' : 'salvo'} com sucesso.`,
        className: "bg-green-600 text-white",
      });
    }
    
    return documentoParaSalvar; 
  };

  return {
    isLoading,
    produtos,
    categorias, 
    clientes,
    carrinho,
    setCarrinho,
    desconto,
    setDesconto: setDescontoWithLog,
    observacoes,
    setObservacoes,
    clienteSelecionado,
    setClienteSelecionado,
    setClientes,
    addProdutoAoCarrinho,
    limparCarrinhoEState,
    finalizarDocumento,
    getNomeVariacao,
    productColors,
    productSizes,
    documentoAtualId,
    vendedorAtual,
    subtotal,
    descontoAplicado,
    valorTotal,
    calcularSubtotal, 
    calcularDescontoValor,
  };
};
