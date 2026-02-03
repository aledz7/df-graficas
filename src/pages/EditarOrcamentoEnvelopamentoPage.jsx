import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';
import { useEnvelopamento } from '@/hooks/useEnvelopamento';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import EnvelopamentoFormLeft from '@/components/envelopamento/EnvelopamentoFormLeft';
import EnvelopamentoFormRight from '@/components/envelopamento/EnvelopamentoFormRight';
import EnvelopamentoActions from '@/components/envelopamento/EnvelopamentoActions';
import PartesModal from '@/components/envelopamento/PartesModal';
import EnvelopamentoClienteModal from '@/components/envelopamento/EnvelopamentoClienteModal';
import EnvelopamentoProdutoModal from '@/components/envelopamento/EnvelopamentoProdutoModal';
import EnvelopamentoPagamentoModal from '@/components/envelopamento/EnvelopamentoPagamentoModal';
import EnvelopamentoDocumentModal from '@/components/envelopamento/EnvelopamentoDocumentModal';
import { generatePdfFromElement, printElement } from '@/lib/osDocumentGenerator';
import { envelopamentoService } from '@/services/envelopamentoApi';
import { authService } from '@/services/api';

const EditarOrcamentoEnvelopamentoPage = ({ vendedorAtual, logoUrl, nomeEmpresa }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { orcamentoId: orcamentoIdFromParams } = useParams();
  
  const [orcamentoInicial, setOrcamentoInicial] = useState(null);
  const [loadingError, setLoadingError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const loadingRef = useRef(false);
  const navigationCleared = useRef(false);

  // Usar o hook apenas depois que o orçamento inicial for carregado
  const { 
    orcamento, 
    setOrcamento, 
    adminSettings, 
    handlers,
    salvandoRascunho
  } = useEnvelopamento({ 
    vendedorAtual, 
    orcamentoInicial 
  });

  // Atualizar o orçamento quando orcamentoInicial mudar
  useEffect(() => {
    if (orcamentoInicial && setOrcamento) {
      
      // Converter dados da API para o formato esperado pelo hook
      const dadosConvertidos = {
        ...orcamentoInicial,
        // Converter selected_pecas para selectedPecas
        selectedPecas: orcamentoInicial.selected_pecas || orcamentoInicial.selectedPecas || [],
        // Converter custo_total_material para custoTotalMaterial
        custoTotalMaterial: parseFloat(orcamentoInicial.custo_total_material || 0),
        // Converter custo_total_adicionais para custoTotalAdicionais
        custoTotalAdicionais: parseFloat(orcamentoInicial.custo_total_adicionais || 0),
        // Converter orcamento_total para orcamentoTotal
        orcamentoTotal: parseFloat(orcamentoInicial.orcamento_total || 0),
        // Converter area_total_m2 para areaTotalM2
        areaTotalM2: parseFloat(orcamentoInicial.area_total_m2 || 0),
        // Garantir que adicionais tenha a estrutura correta
        adicionais: orcamentoInicial.adicionais || {
          aplicacao: { checked: false, valorConfigurado: 10, custoCalculado: 0 },
          remocao: { checked: false, valorConfigurado: 5, custoCalculado: 0 },
          lixamento: { checked: false, valorConfigurado: 8, custoCalculado: 0 },
          transparente: { checked: false, valorConfigurado: 40, custoCalculado: 0 },
        },
        // Garantir que cliente tenha a estrutura correta
        cliente: orcamentoInicial.cliente || { id: '', nome: '', cpf_cnpj: '' },
        // Garantir que produto tenha a estrutura correta
        produto: orcamentoInicial.produto || null,
        // Garantir que pecaAvulsa tenha a estrutura correta
        pecaAvulsa: orcamentoInicial.pecaAvulsa || {
          descricao: '',
          larguraM: '',
          alturaM: '',
          quantidade: '',
        },
        // Garantir que observacao existe
        observacao: orcamentoInicial.observacao || '',
        // Garantir que nome_orcamento existe
        nome_orcamento: orcamentoInicial.nome_orcamento || '',
        // Garantir que status existe
        status: orcamentoInicial.status || 'Rascunho',
        // Garantir que data_criacao existe
        data_criacao: orcamentoInicial.data_criacao || new Date().toISOString(),
      };
      
      setOrcamento(dadosConvertidos);
      
      // Verificar se deve abrir o modal de finalização automaticamente
      if (location.state?.openFinalizeModal && orcamentoInicial) {
        // Usar setTimeout para garantir que o orçamento esteja totalmente carregado
        setTimeout(() => {
          setIsPagamentoModalOpen(true);
          // Limpar o state para evitar que abra novamente em refresh
          navigate(location.pathname, { replace: true, state: { orcamentoId: orcamentoIdFromParams } });
        }, 500);
      }
    }
  }, [orcamentoInicial, setOrcamento, location.state, navigate, orcamentoIdFromParams]);

  const documentRef = useRef(null);
  
  const [isPartesModalOpen, setIsPartesModalOpen] = useState(false);
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [isProdutoModalOpen, setIsProdutoModalOpen] = useState(false);
  const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [documentoFinal, setDocumentoFinal] = useState(null);
  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState(false);
  const [lastSavedOrcamento, setLastSavedOrcamento] = useState(null);

  const [partesModalConfig, setPartesModalConfig] = useState({
    initialView: 'search',
    manageOnly: false,
    allowMultiple: true,
  });

  // Carregar o orçamento inicial apenas uma vez
  useEffect(() => {
    
    const loadData = async () => {
      
      if (loadingRef.current) {
        
        return;
      }
      loadingRef.current = true;

      try {
        setLoadingError('');
        
        // Verificar token e autenticação
        const token = apiDataManager.getToken();
        
        
        // Se não há token, tentar verificar se há sessão ativa
        if (!token) {
          const storedToken = localStorage.getItem('auth_token');
          const rememberMe = localStorage.getItem('remember_me');
          
          if (storedToken) {
            apiDataManager.setToken(storedToken, rememberMe === 'true');
          } else {
            console.error('❌ Nenhum token encontrado - usuário não está logado');
            setLoadingError('Usuário não está logado. Faça login para continuar.');
            return;
          }
        }

        // Testar autenticação
        try {
          const authCheck = await authService.checkAuth();
        } catch (authError) {
          console.error('❌ Erro de autenticação:', authError);
          setLoadingError('Sessão expirada. Faça login novamente.');
          return;
        }

        let orcamentoCarregado = location.state?.orcamento;

        if (!orcamentoCarregado && orcamentoIdFromParams) {
          
          try {
            // Tentar carregar da API primeiro
            const response = await envelopamentoService.getById(orcamentoIdFromParams);
            
            if (response && response.data) {
              orcamentoCarregado = response.data;
            } else if (response && response.success && response.data) {
              // Estrutura alternativa da API
              orcamentoCarregado = response.data;
            } else {
            }
          } catch (apiError) {
            console.error('❌ Erro ao carregar da API:', apiError);
            
            // Se for erro 401, mostrar mensagem específica
            if (apiError.response && apiError.response.status === 401) {
              setLoadingError('Erro de autenticação. Faça login novamente.');
              return;
            }
          }
          
          // Fallback para localStorage se API falhar
          if (!orcamentoCarregado) {
            const orcamentosSalvos = safeJsonParse(await apiDataManager.getItem('envelopamentosOrcamentos'), []);
            orcamentoCarregado = orcamentosSalvos.find(o => o.id == orcamentoIdFromParams || o.id === orcamentoIdFromParams);
          }
        }

        if (!orcamentoCarregado) {
          console.error('❌ Orçamento não encontrado em nenhuma fonte');
          setLoadingError('Orçamento não encontrado. Verifique o ID ou tente novamente a partir da lista.');
          return;
        }

        // Define o orçamento inicial apenas uma vez
        setOrcamentoInicial(orcamentoCarregado);
        
        // Limpa o state da navegação apenas uma vez
        if (location.state?.orcamento && !navigationCleared.current) {
          navigationCleared.current = true;
          navigate(location.pathname, { replace: true, state: {} });
        }
      } catch (error) {
        console.error('Erro ao carregar orçamento:', error);
        setLoadingError('Erro ao carregar orçamento');
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    };

    loadData();

    return () => {
      loadingRef.current = true;
    };
  }, [orcamentoIdFromParams]); // Removido location.state e navigate das dependências

  const handleOpenPartesModal = (initialView = 'search', manageOnly = false, allowMultiple = true) => {
    setPartesModalConfig({ initialView, manageOnly, allowMultiple });
    setIsPartesModalOpen(true);
  };

  const handleSelectPecasDoCatalogo = (novasPecas) => {
    handlers.handleSelectPecasDoCatalogo(novasPecas);
    setIsPartesModalOpen(false);
  };

  const handleSelectCliente = (cliente) => {
    handlers.handleSelectCliente(cliente);
    setIsClienteModalOpen(false);
  };

  const handleProductSelect = (produto) => {
    handlers.handleProductSelect(produto);
    setIsProdutoModalOpen(false);
  };

  const handleUpdatePecaProduto = (pecaId) => {
    // Esta função será chamada quando o usuário clicar no botão de selecionar produto
    // Ela deve abrir o modal de produto e quando um produto for selecionado,
    // atualizar apenas a peça específica
    const handleProdutoSelect = (produtoSelecionado) => {
      const preco = parseFloat(String(produtoSelecionado.valorMetroQuadrado || produtoSelecionado.preco_venda || produtoSelecionado.preco_m2 || '0').replace(',', '.'));
      const estoqueDisponivel = parseFloat(String(produtoSelecionado.estoqueDisponivel || produtoSelecionado.estoque || '0').replace(',', '.'));

      if (estoqueDisponivel < 0 && (produtoSelecionado.unidadeMedida === 'm2' || produtoSelecionado.tipo_produto === 'm2')) {
          toast({
              title: `Estoque Negativo`,
              description: `O produto ${produtoSelecionado.nome} está com estoque negativo. Não é possível selecioná-lo.`,
              variant: "destructive",
              duration: 5000
          });
          return;
      }

      setOrcamento(prev => ({
        ...prev,
        selectedPecas: prev.selectedPecas.map(p =>
          p.id === pecaId 
            ? { 
                ...p, 
                produto: {
                  id: produtoSelecionado.id,
                  nome: produtoSelecionado.nome,
                  valorMetroQuadrado: preco,
                  estoqueDisponivel: estoqueDisponivel,
                  unidadeMedida: produtoSelecionado.unidadeMedida || 'm2',
                  cor_opcional: produtoSelecionado.cor_opcional || '',
                  preco_venda: preco, 
                  preco_m2: preco,
                  promocao_ativa: produtoSelecionado.promocao_ativa || false,
                  preco_promocional: produtoSelecionado.preco_promocional || null,
                  preco_original: produtoSelecionado.preco_original || preco
                }
              }
            : p
        )
      }));

      setIsProdutoModalOpen(false);
    };

    // Armazenar temporariamente o handler para esta peça específica
    window.tempPecaProdutoHandler = handleProdutoSelect;
    setIsProdutoModalOpen(true);
  };

  const handleSaveRascunho = async () => {
    try {
      console.log('🔄 Iniciando salvamento de rascunho...', { orcamentoId: orcamento.id, orcamentoStatus: orcamento.status });
      
      const orcamentoSalvo = await handlers.handleSalvarRascunho();
      
      console.log('✅ Rascunho salvo com sucesso:', orcamentoSalvo);
      
      if (orcamentoSalvo) {
        setLastSavedOrcamento(orcamentoSalvo);
        setIsSaveConfirmModalOpen(true);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar rascunho:', error);
      
      // Log detalhado do erro
      console.error('Detalhes do erro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        orcamentoId: orcamento.id,
        orcamentoStatus: orcamento.status
      });
      
      toast({
        title: "Erro ao salvar",
        description: `Não foi possível salvar o rascunho. ${error.response?.data?.message || error.message}`,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleOpenFinalizeModal = () => {
    // Validar observações antes de abrir o modal de finalização
    if (!orcamento.observacao?.trim()) {
      toast({ 
        title: "Observações não preenchidas", 
        description: "O campo Observações é obrigatório. Por favor, preencha as observações antes de finalizar.", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsPagamentoModalOpen(true);
  };

  const handleConfirmarPagamentoEFinalizar = async (pagamentos) => {
    try {
      const orcamentoFinalizado = await handlers.handleFinalizarPagamentoEConfirmar(pagamentos);
      if (orcamentoFinalizado) {
        setDocumentoFinal(orcamentoFinalizado);
        setIsPagamentoModalOpen(false);
        setIsDocumentModalOpen(true);
      }
    } catch (error) {
      console.error('Erro ao finalizar orçamento:', error);
      const mensagemErro = error?.response?.data?.message || error?.response?.data?.errors?.observacao?.[0] || error?.message || "Não foi possível finalizar o orçamento.";
      toast({
        title: "Erro ao finalizar",
        description: mensagemErro,
        variant: "destructive",
      });
    }
  };

  const handleGeneratePdfPreview = () => {
    
    const docData = {
      ...orcamento,
      id: orcamento.id && (
        // Se é um número (ID do banco), usar o ID
        (typeof orcamento.id === 'number') ||
        // Se é uma string que não é rascunho, usar o ID
        (typeof orcamento.id === 'string' && !(orcamento.id.startsWith('env-draft-') || orcamento.id.startsWith('rascunho_env_')))
      ) ? orcamento.id : `PREVIEW-${Date.now()}`,
      data: orcamento.data || new Date().toISOString(),
      vendedor_id: vendedorAtual?.id,
      vendedor_nome: vendedorAtual?.nome,
      status: 'Preview de Orçamento',
      pagamentos: []
    };
    
    setDocumentoFinal(docData);
    setIsDocumentModalOpen(true);
  };

  const handleGerarPdfDocumento = async () => {
    if (documentRef.current && documentoFinal) {
      await generatePdfFromElement(documentRef.current, `orcamento_envelopamento_${documentoFinal.id}.pdf`);
    } else {
      toast({ title: "Erro", description: "Não foi possível gerar o PDF.", variant: "destructive" });
    }
  };

  const handleImpressaoDocumento = async () => {
    if (documentRef.current && documentoFinal) {
      await printElement(documentRef.current, `Orçamento Envelopamento ${documentoFinal.id}`);
    } else {
      toast({ title: "Erro", description: "Não foi possível imprimir.", variant: "destructive" });
    }
  };

  const handleVoltarParaLista = () => {
    navigate('/operacional/orcamentos-envelopamento');
  };

  const handleContinuarEditando = () => {
    setIsSaveConfirmModalOpen(false);
    setLastSavedOrcamento(null);
  };

  const handleSairDaEdicao = () => {
    setIsSaveConfirmModalOpen(false);
    setLastSavedOrcamento(null);
    navigate('/operacional/orcamentos-envelopamento');
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-gray-700 dark:text-gray-300">Carregando orçamento...</p>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="flex flex-1 justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">{loadingError}</p>
          <Button onClick={handleVoltarParaLista}>Voltar para Lista</Button>
        </div>
      </div>
    );
  }

  if (!orcamentoInicial || !orcamento) {
    return (
      <div className="flex flex-1 justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-gray-700 dark:text-gray-300">Preparando orçamento...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen p-0 m-0 overflow-hidden bg-gray-100 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-md p-3 flex items-center justify-between sticky top-0 z-20">
          <Button variant="outline" onClick={handleVoltarParaLista}>
            <ArrowLeft className="mr-2 h-5 w-5" />
            Voltar para Lista
          </Button>
          <h1 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
            Editando Orçamento: <span className="text-purple-600 dark:text-purple-400">{orcamento.id ? (typeof orcamento.id === 'string' ? orcamento.id.slice(-6) : orcamento.id.toString().slice(-6)) : 'Novo'}</span>
          </h1>
          <div className="w-36"></div>
        </header>

        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
          <ScrollArea className="lg:w-[45%] xl:w-2/5 p-4 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <EnvelopamentoFormLeft
              orcamento={orcamento}
              setOrcamento={setOrcamento}
              adminSettings={adminSettings}
              onOpenPartesModal={() => handleOpenPartesModal('search', false, true)}
              onAddPecaAvulsa={handlers.handleAddPecaAvulsa}
              onOpenClienteModal={() => setIsClienteModalOpen(true)}
              onOpenProdutoModal={() => setIsProdutoModalOpen(true)}
            />
          </ScrollArea>

          <ScrollArea className="lg:w-[55%] xl:w-3/5 p-4 bg-gray-50 dark:bg-gray-850">
            <EnvelopamentoFormRight
              orcamento={orcamento}
              adminSettings={adminSettings}
              onUpdatePecaQuantidade={handlers.handleUpdatePecaQuantidade}
              onRemovePeca={handlers.handleRemovePeca}
              onOpenPartesModal={handleOpenPartesModal}
              onUpdatePecaServicosAdicionais={handlers.handleUpdatePecaServicosAdicionais}
              onUpdatePecaMedidas={handlers.handleUpdatePecaMedidas}
              onUpdatePecaProduto={handleUpdatePecaProduto}
              onUpdatePecaProdutoDireto={handlers.handleUpdatePecaProdutoDireto}
            />
          </ScrollArea>
        </div>

        <EnvelopamentoActions
          orcamentoTotal={orcamento.orcamentoTotal}
          onGeneratePdf={handleGeneratePdfPreview}
          onSaveProgress={handleSaveRascunho}
          onFinalizeOrcamento={handleOpenFinalizeModal}
          salvandoRascunho={salvandoRascunho}
        />
      </div>

      <PartesModal
        open={isPartesModalOpen}
        onOpenChange={setIsPartesModalOpen}
        onSelectPecas={handleSelectPecasDoCatalogo}
        allowMultipleSelection={partesModalConfig.allowMultiple}
        initialView={partesModalConfig.initialView}
        manageModeOnly={partesModalConfig.manageOnly}
      />

      <EnvelopamentoClienteModal
        open={isClienteModalOpen}
        onOpenChange={setIsClienteModalOpen}
        onSelectCliente={handleSelectCliente}
      />

      <EnvelopamentoProdutoModal
        open={isProdutoModalOpen}
        onOpenChange={(open) => {
          setIsProdutoModalOpen(open);
          if (!open) {
            // Limpar o handler temporário quando o modal for fechado
            window.tempPecaProdutoHandler = null;
          }
        }}
        onSelectProduto={window.tempPecaProdutoHandler || handleProductSelect}
      />

      <EnvelopamentoPagamentoModal
        open={isPagamentoModalOpen}
        onOpenChange={setIsPagamentoModalOpen}
        totalOrcamento={orcamento.orcamentoTotal}
        onConfirmPagamento={handleConfirmarPagamentoEFinalizar}
        clienteId={orcamento.cliente?.id}
        vendedorAtual={vendedorAtual}
      />

      <EnvelopamentoDocumentModal
        isOpen={isDocumentModalOpen}
        setIsOpen={setIsDocumentModalOpen}
        documentRef={documentRef}
        documento={documentoFinal}
        logoUrl={logoUrl}
        nomeEmpresa={nomeEmpresa}
        handleGerarPdf={handleGerarPdfDocumento}
        handleImpressao={handleImpressaoDocumento}
        handleNovoOrcamento={() => {
          setIsDocumentModalOpen(false);
          setDocumentoFinal(null);
          navigate('/operacional/envelopamento/orcamentos');
        }}
      />

      {/* Modal de Confirmação de Salvamento */}
      {isSaveConfirmModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Rascunho Salvo com Sucesso!
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Orçamento {lastSavedOrcamento?.id ? (typeof lastSavedOrcamento.id === 'string' ? lastSavedOrcamento.id.slice(-6) : lastSavedOrcamento.id.toString().slice(-6)) : 'N/A'} foi salvo.
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300">
                O que você gostaria de fazer agora?
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleContinuarEditando}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Continuar Editando
              </button>
              <button
                onClick={handleSairDaEdicao}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sair e Voltar ao Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditarOrcamentoEnvelopamentoPage;