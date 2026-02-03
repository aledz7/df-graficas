import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocation, useNavigate } from 'react-router-dom';
import EnvelopamentoFormLeft from '@/components/envelopamento/EnvelopamentoFormLeft';
import EnvelopamentoFormRight from '@/components/envelopamento/EnvelopamentoFormRight';
import EnvelopamentoActions from '@/components/envelopamento/EnvelopamentoActions';
import PartesModal from '@/components/envelopamento/PartesModal';
import EnvelopamentoClienteModal from '@/components/envelopamento/EnvelopamentoClienteModal';
import EnvelopamentoProdutoModal from '@/components/envelopamento/EnvelopamentoProdutoModal';
import EnvelopamentoPagamentoModal from '@/components/envelopamento/EnvelopamentoPagamentoModal';
import EnvelopamentoDocumentModal from '@/components/envelopamento/EnvelopamentoDocumentModal';
import { useEnvelopamento } from '@/hooks/useEnvelopamento';
import { generatePdfFromElement, printElement } from '@/lib/osDocumentGenerator'; 
import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';
import { restoreOrcamentoFromStorage } from '@/hooks/envelopamento/envelopamentoState';
import { calcularOrcamentoCompleto } from '@/hooks/envelopamento/envelopamentoCalculos';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { envelopamentoService } from '@/services/envelopamentoApi';

const EnvelopamentoPage = ({ vendedorAtual, logoUrl, nomeEmpresa }) => {
  const { toast } = useToast();
  const [orcamentoCarregadoParaFinalizacao, setOrcamentoCarregadoParaFinalizacao] = useState(false);
  const skipRascunhoRef = useRef(false);
  
  // Definir skipRascunhoRef como true se há parâmetros de finalização no estado da navegação
  const location = useLocation();
  const navigate = useNavigate();
  
  if (location.state?.finalize && !skipRascunhoRef.current) {
    skipRascunhoRef.current = true;
  }
  
  const { 
    orcamento, 
    setOrcamento, 
    adminSettings, 
    handlers,
  } = useEnvelopamento({ 
    vendedorAtual, 
    orcamentoInicial: null,
    shouldSkipRascunho: () => {
      return skipRascunhoRef.current;
    }
  });

  const documentRef = useRef(null);
  const timeoutRef = useRef(null);
  
  const [isPartesModalOpen, setIsPartesModalOpen] = useState(false);
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [isProdutoModalOpen, setIsProdutoModalOpen] = useState(false);
  const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState(false);
  
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [documentoFinal, setDocumentoFinal] = useState(null);
  const [shouldOpenPagamentoModal, setShouldOpenPagamentoModal] = useState(false);
  const [produtoModalPecaId, setProdutoModalPecaId] = useState(null);

  const [partesModalConfig, setPartesModalConfig] = useState({
    initialView: 'search',
    manageOnly: false,
    allowMultiple: true,
  });

  // Carregar orçamento para FINALIZAÇÃO (não edição) via state do react-router
  // A EDIÇÃO agora é feita em EditarOrcamentoEnvelopamentoPage
  useEffect(() => {
        const loadData = async () => {
    const state = location.state;
    
    if (state?.orcamento && state?.finalize) { // Se veio orçamento completo para finalizar
      try {
        const orcamentoParaCarregar = state.orcamento;
        
        if (orcamentoParaCarregar) {
          setOrcamentoCarregadoParaFinalizacao(true);
          skipRascunhoRef.current = true; // Definir o ref para true
          
          const restored = restoreOrcamentoFromStorage(orcamentoParaCarregar, adminSettings);
          const calculado = calcularOrcamentoCompleto(restored, adminSettings);
          
          setOrcamento(calculado);
          
          // Verificar se o orçamento foi definido corretamente
          setTimeout(() => {
          }, 100);
          
          toast({ title: 'Orçamento Carregado para Finalização', description: `Finalizando o orçamento ${calculado.codigo_orcamento}` });
          
          // Marcar para abrir o modal de pagamento quando o orçamento estiver totalmente carregado
          setShouldOpenPagamentoModal(true);
        } else {
          console.error('❌ Orçamento não encontrado no state');
          toast({ 
            title: 'Orçamento não encontrado', 
            description: 'Não foi possível carregar o orçamento para finalização.',
            variant: 'destructive' 
          });
        }
      } catch (error) {
        console.error('❌ Erro ao carregar orçamento:', error);
        toast({ 
          title: 'Erro ao carregar orçamento', 
          description: 'Não foi possível carregar o orçamento para finalização.',
          variant: 'destructive' 
        });
      }
      
      // Limpa o state da navegação para evitar recarregamento em refresh
      navigate(location.pathname, { replace: true, state: {} }); 
    } else if (state?.orcamentoId && state?.finalize) { // Fallback para orcamentoId (compatibilidade)
      try {
        const response = await envelopamentoService.getById(state.orcamentoId);
        const orcamentoParaCarregar = response.data;
        
        if (orcamentoParaCarregar) {
          setOrcamentoCarregadoParaFinalizacao(true);
          skipRascunhoRef.current = true;
          
          const restored = restoreOrcamentoFromStorage(orcamentoParaCarregar, adminSettings);
          const calculado = calcularOrcamentoCompleto(restored, adminSettings);
          
          setOrcamento(calculado);
          
          setTimeout(() => {
          }, 100);
          
          toast({ title: 'Orçamento Carregado para Finalização', description: `Finalizando o orçamento ${calculado.codigo_orcamento}` });
          
          setShouldOpenPagamentoModal(true);
        } else {
          console.error('❌ Orçamento não encontrado:', state.orcamentoId);
          toast({ 
            title: 'Orçamento não encontrado', 
            description: 'Não foi possível carregar o orçamento para finalização.',
            variant: 'destructive' 
          });
        }
      } catch (error) {
        console.error('❌ Erro ao carregar orçamento:', error);
        toast({ 
          title: 'Erro ao carregar orçamento', 
          description: 'Não foi possível carregar o orçamento para finalização.',
          variant: 'destructive' 
        });
      }
      
      navigate(location.pathname, { replace: true, state: {} }); 
    } else if (state?.orcamentoId && !state?.finalize) {
      // Se veio um orcamentoId mas não é para finalizar, redireciona para a página de edição
      navigate(`/operacional/envelopamento/editar/${state.orcamentoId}`, { replace: true, state: { orcamentoId: state.orcamentoId } });
    }
  
        };
        
        loadData();
    }, [location.state, navigate, setOrcamento, toast, adminSettings]);

  // Observar quando o orçamento estiver totalmente carregado para abrir o modal de pagamento
  useEffect(() => {
    if (shouldOpenPagamentoModal) {
      if (orcamento.orcamentoTotal > 0 && 
          orcamento.produto?.id && 
          orcamento.selectedPecas?.length > 0) {
        
        // Limpar timeout se existir
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        setIsPagamentoModalOpen(true);
        setShouldOpenPagamentoModal(false); // Reset do flag
      } else if (!timeoutRef.current) {
        // Timeout de segurança - abre o modal após 2 segundos mesmo que não tenha todos os dados
        timeoutRef.current = setTimeout(() => {
          setIsPagamentoModalOpen(true);
          setShouldOpenPagamentoModal(false);
          timeoutRef.current = null;
        }, 2000);
      }
    }
    
    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [shouldOpenPagamentoModal, orcamento.orcamentoTotal, orcamento.produto, orcamento.selectedPecas]);


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
    if (produtoModalPecaId) {
      // Se há um pecaId, atualizar apenas essa peça
      const pecaHandler = handlers.handleUpdatePecaProduto(produtoModalPecaId);
      pecaHandler.onSelectProduto(produto);
      setProdutoModalPecaId(null); // Limpar o pecaId
    } else {
      // Se não há pecaId, adicionar como produto sem medidas
      handlers.handleAddProdutoSemMedidas(produto);
    }
    setIsProdutoModalOpen(false);
  };

  const handleOpenProdutoModalForPeca = (pecaId) => {
    setProdutoModalPecaId(pecaId);
    setIsProdutoModalOpen(true);
  };

  const handleSaveRascunho = async () => {
    try {
      const orcamentoSalvo = await handlers.handleSalvarRascunho();
      if (orcamentoSalvo) {
        // Opcional: navegar para histórico ou manter na página
      }
    } catch (error) {
      console.error('❌ Erro ao salvar rascunho:', error);
      toast({
        title: "Erro ao salvar rascunho",
        description: "Não foi possível salvar o rascunho. Tente novamente.",
        variant: "destructive",
      });
    }
  };
  
  const validateOrcamentoParaFinalizar = useCallback(async () => {
    if (!orcamento.cliente?.nome) {
      toast({ title: "Cliente não informado", description: "Por favor, busque e selecione um cliente.", variant: "destructive" });
      return false;
    }
    
    if (!orcamento.observacao?.trim()) {
      toast({ title: "Observações não preenchidas", description: "O campo Observações é obrigatório. Por favor, preencha as observações antes de finalizar.", variant: "destructive" });
      return false;
    }
    
    if (!Array.isArray(orcamento.selectedPecas) || orcamento.selectedPecas.length === 0) {
      toast({ title: "Nenhuma peça selecionada", description: "Adicione pelo menos uma peça ao orçamento.", variant: "destructive" });
      return false;
    }
    
    // Verificar se cada peça tem um produto selecionado
    const pecasSemProduto = orcamento.selectedPecas.filter(peca => !peca.produto?.id);
    
    if (pecasSemProduto.length > 0) {
      const nomesPecas = pecasSemProduto.map(peca => peca.parte?.nome || 'Peça sem nome').join(', ');
      toast({ 
        title: "Produtos não selecionados", 
        description: `As seguintes peças não têm produto selecionado: ${nomesPecas}. Por favor, selecione um produto para cada peça.`, 
        variant: "destructive" 
      });
      return false;
    }
    
    // Verificar estoque para cada produto individual
    try {
      const produtoService = (await import('@/services/api')).produtoService;
      
      for (const peca of orcamento.selectedPecas) {
        const produto = peca.produto;
        if (!produto) continue;
        
        // Calcular área necessária para esta peça
        const alturaM = parseFloat(String(peca.parte?.altura || '0').replace(',', '.')) || 0;
        const larguraM = parseFloat(String(peca.parte?.largura || '0').replace(',', '.')) || 0;
        const quantidade = parseInt(peca.quantidade, 10) || 0;
        const areaPeca = alturaM * larguraM * quantidade;
        
        // Verificar apenas produtos em m²
        if ((produto.unidade_medida || produto.unidadeMedida) === 'm2' || produto.tipo_produto === 'm2') {
          
          try {
            const response = await produtoService.getById(produto.id);
            const produtoAtualizado = response.data;
            
            if (produtoAtualizado) {
              const dadosProduto = produtoAtualizado.data || produtoAtualizado;
              const estoqueRealAtual = parseFloat(String(dadosProduto.estoque || dadosProduto.estoque_disponivel || '0').replace(',','.'));
              

              if (estoqueRealAtual < areaPeca) {
                toast({
                  title: "Estoque Insuficiente!",
                  description: `Produto ${produto.nome} (peça: ${peca.parte?.nome}) tem ${estoqueRealAtual.toFixed(2).replace('.',',')} ${produto.unidade_medida || produto.unidadeMedida} em estoque. Necessário: ${areaPeca.toFixed(2).replace('.',',')} ${produto.unidade_medida || produto.unidadeMedida}.`,
                  variant: "destructive",
                  duration: 7000,
                });
                return false;
              }
            } else {
              console.error('❌ Produto não encontrado na API:', produto.nome);
              toast({
                title: "Erro ao verificar estoque",
                description: `Não foi possível verificar o estoque do produto ${produto.nome}. Tente novamente.`,
                variant: "destructive",
                duration: 5000,
              });
              return false;
            }
          } catch (error) {
            console.error('❌ Erro ao verificar estoque na API para', produto.nome, ':', error);
            
            // Se for erro de autenticação, usar dados locais temporariamente
            if (error.response?.status === 401) {
              console.warn('⚠️ Erro de autenticação, usando dados locais temporariamente para', produto.nome);
              const estoqueLocal = parseFloat(String(produto.estoqueDisponivel || '0').replace(',','.'));
              if (estoqueLocal < areaPeca) {
                toast({
                  title: "Estoque Insuficiente!",
                  description: `Produto ${produto.nome} (peça: ${peca.parte?.nome}) tem ${estoqueLocal.toFixed(2).replace('.',',')} ${produto.unidade_medida || produto.unidadeMedida} em estoque. Necessário: ${areaPeca.toFixed(2).replace('.',',')} ${produto.unidade_medida || produto.unidadeMedida}.`,
                  variant: "destructive",
                  duration: 7000,
                });
                return false;
              }
            } else {
              toast({
                title: "Erro ao verificar estoque",
                description: `Não foi possível conectar com o servidor para verificar o estoque do produto ${produto.nome}. Tente novamente.`,
                variant: "destructive",
                duration: 5000,
              });
              return false;
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro geral ao verificar estoque:', error);
      toast({
        title: "Erro ao verificar estoque",
        description: "Não foi possível verificar o estoque dos produtos. Tente novamente.",
        variant: "destructive",
        duration: 5000,
      });
      return false;
    }
    
    return true;
  }, [orcamento, toast]);


  const handleOpenFinalizeModal = async () => {
    const isValid = await validateOrcamentoParaFinalizar();
    
    if (isValid) {
      setIsPagamentoModalOpen(true);
    }
  };

  const handleConfirmarPagamentoEFinalizar = async (pagamentos) => {
    try {
      
      const orcamentoFinalizado = await handlers.handleFinalizarPagamentoEConfirmar(pagamentos);
      
      
      if (orcamentoFinalizado) {
        setDocumentoFinal(orcamentoFinalizado);
        setIsPagamentoModalOpen(false); 
        setIsDocumentModalOpen(true); 
        handlers.resetOrcamento();
        
        toast({
          title: "Orçamento Finalizado!",
          description: `Orçamento ${orcamentoFinalizado.codigo_orcamento || orcamentoFinalizado.id} salvo com sucesso!`,
          variant: "default"
        });
      } else {
        console.error('❌ Orçamento finalizado é null ou undefined');
        toast({
          title: "Erro ao Finalizar",
          description: "Não foi possível finalizar o orçamento. Verifique os dados.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao finalizar orçamento:', error);
      toast({
        title: "Erro ao Finalizar",
        description: "Não foi possível finalizar o orçamento. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleGeneratePdfPreview = async () => {
    const isValid = await validateOrcamentoParaFinalizar();
    if (!isValid) return; 
    
    // Debug: verificar dados do orçamento antes de criar docData
    console.log('handleGeneratePdfPreview - Orçamento completo:', orcamento);
    console.log('handleGeneratePdfPreview - Desconto:', orcamento.desconto, 'Tipo:', orcamento.descontoTipo, 'Calculado:', orcamento.descontoCalculado);
    console.log('handleGeneratePdfPreview - Frete:', orcamento.frete);
    
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
        pagamentos: [],
        // Garantir que os campos de desconto e frete sejam incluídos
        desconto: orcamento.desconto || 0,
        descontoTipo: orcamento.descontoTipo || 'percentual',
        descontoCalculado: orcamento.descontoCalculado || 0,
        frete: orcamento.frete || 0
    };
    
    console.log('handleGeneratePdfPreview - docData final:', docData);
    
    setDocumentoFinal(docData);
    setIsDocumentModalOpen(true);
  };
  
  const handleGerarPdfDocumento = async () => {
    if(documentRef.current && documentoFinal){
      await generatePdfFromElement(documentRef.current, `orcamento_envelopamento_${documentoFinal.id}.pdf`);
    } else {
      toast({ title: "Erro", description: "Não foi possível gerar o PDF.", variant: "destructive"});
    }
  };
  
  const handleImpressaoDocumento = async () => {
     if(documentRef.current && documentoFinal){
      await printElement(documentRef.current, `Orçamento Envelopamento ${documentoFinal.id}`);
    } else {
      toast({ title: "Erro", description: "Não foi possível imprimir.", variant: "destructive"});
    }
  };

  const handleNovoOrcamento = () => {
    handlers.resetOrcamento(); 
    setIsDocumentModalOpen(false);
    setDocumentoFinal(null);
  }

  return (
    <>
      <div className="flex flex-col h-screen p-0 m-0 overflow-hidden bg-gray-100 dark:bg-gray-900">
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

          <ScrollArea className="lg:w-[55%] xl:w-3/5 p-4 bg-gray-50 dark:bg-gray-900">
            <EnvelopamentoFormRight
              orcamento={orcamento}
              adminSettings={adminSettings}
              onUpdatePecaQuantidade={handlers.handleUpdatePecaQuantidade}
              onRemovePeca={handlers.handleRemovePeca}
              onOpenPartesModal={handleOpenPartesModal}
              onUpdatePecaServicosAdicionais={handlers.handleUpdatePecaServicosAdicionais}
              onUpdatePecaMedidas={handlers.handleUpdatePecaMedidas}
              onUpdatePecaProduto={handleOpenProdutoModalForPeca}
              onUpdatePecaProdutoDireto={handlers.handleUpdatePecaProdutoDireto}
            />
          </ScrollArea>
        </div>
        
        <EnvelopamentoActions
          orcamentoTotal={orcamento.orcamentoTotal}
          onGeneratePdf={handleGeneratePdfPreview}
          onSaveProgress={handleSaveRascunho}
          onFinalizeOrcamento={handleOpenFinalizeModal}
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
        onOpenChange={setIsProdutoModalOpen}
        onSelectProduto={handleProductSelect}
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
        handleNovoOrcamento={handleNovoOrcamento}
      />
    </>
  );
};

export default EnvelopamentoPage;