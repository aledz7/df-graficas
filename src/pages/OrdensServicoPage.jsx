import React, { useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOrdemServico } from '@/hooks/useOrdemServico';
import { clienteService } from '@/services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

import OSClienteModal from '@/components/os/OSClienteModal';
import OSPagamentoModal from '@/components/os/OSPagamentoModal';
import OSDocumentModal from '@/components/os/OSDocumentModal';
import ClienteForm from '@/components/clientes/ClienteForm'; 

import OSHeader from '@/components/os/pageSections/OSHeader';
import OSClienteSection from '@/components/os/pageSections/OSClienteSection';
import OSItemTabsSection from '@/components/os/pageSections/OSItemTabsSection';
import OSResumoSide from '@/components/os/OSResumoSide';
import { Loader2, RotateCcw } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const OrdensServicoPage = ({ vendedorAtual }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    
    // Estado para termo de busca inicial do cliente
    const [clienteSearchTerm, setClienteSearchTerm] = useState('');
    
    // Debug logs removidos para evitar loop infinito
    const processedCalculadoraRef = useRef(false);
    const {
        ordemServico,
        setOrdemServico,
        itemAtual,
        clienteSelecionado,
        isOSFinalizada,
        isEditingItem,
        logoUrl,
        nomeEmpresa,
        acabamentosConfig,
        maquinas,
        produtosCadastrados,
        produtosCarregados,
        isCarregandoProdutos,
        carregarProdutosSeNecessario,
        empresaSettings,
        contasBancarias,
        documentRef,
        isLoading,
        isSaving, 
        viewOnly,
        toggleViewMode,
        handleClienteSelecionado,
        handleItemChange,
        handleAdicionarItem,
        handleUpdateItem,
        handleRemoverItem,
        handleEditarItem,
        handleDuplicarItem,
        handleCancelEditItem,
        handleSalvarOrcamento,
        handleConfirmarPagamentoOS, 
        handleGerarPdfDocumento,
        handleImpressaoDocumento,
        handleUploadArteFinal,
        handleAtualizarOSFinalizada,
        handleFinalizarOSDoConsumoMaterial,
        resetOrdemServico,
        totaisOS,
        isClienteModalOpen, 
        setIsClienteModalOpen,
        isPagamentoModalOpen, 
        setIsPagamentoModalOpen,
        isDocumentModalOpen, 
        setIsDocumentModalOpen,
        checkEstoqueAcabamento,
        // Autosave
        showRascunhoModal,
        rascunhoData,
        handleRecuperarRascunho,
        handleDescartarRascunho,
    } = useOrdemServico({ vendedorAtual });

    useEffect(() => {
        // Detectar se deve reabrir o modal de Consumo de Material
        if (location.state && location.state.reabrirConsumoMaterial && location.state.dadosConsumoMaterial) {
            // Disparar o trigger do modal de consumo de material
            // Isso será feito através do OSItemTabsSection
            // Por enquanto, vamos apenas processar uma vez
            if (!processedCalculadoraRef.current) {
                processedCalculadoraRef.current = true;
                // Os dados serão passados para o OSItemTabsSection via props
            }
        }
    }, [location.state]);

    useEffect(() => {
        if (location.state && location.state.fromCalculadora && !processedCalculadoraRef.current) {
            processedCalculadoraRef.current = true;
            
            // Processar cliente se existir
            let clienteProcessado = null;
            if (location.state.cliente && location.state.cliente.nome) {
                clienteProcessado = {
                    id: location.state.cliente.id || null,
                    nome: location.state.cliente.nome,
                    nome_completo: location.state.cliente.nome,
                    email: location.state.cliente.email || '',
                    telefone: location.state.cliente.telefone || '',
                    cpf_cnpj: location.state.cliente.cpf_cnpj || ''
                };
            }
            
            // Processar serviços adicionais para o formato esperado pela OS
            const servicosProcessados = (location.state.servicosAdicionais || []).map(servico => ({
                id: servico.id || `serv-${Date.now()}-${Math.random()}`,
                nome: servico.nome || servico.nome_servico || 'Serviço sem nome',
                preco: servico.preco || servico.valor || servico.valor_m2 || 0,
                unidade: servico.unidade || 'm²',
                descricao: servico.descricao || `Serviço adicional: ${servico.nome || servico.nome_servico || 'Serviço sem nome'}`,
                ativo: servico.ativo !== false
            }));
            
            // Processar itens para garantir que tenham a estrutura correta
            const dadosCalc = location.state?.dadosCalculo?.dados_calculo || {};
            const resultadoCalc = {
              quantidade: location.state?.valorTotal ? (dadosCalc?.resultado?.quantidade || 0) : (dadosCalc?.resultado?.quantidade || 0),
              valorMaterial: location.state?.valorMaterial ?? dadosCalc?.resultado?.valorMaterial,
              valorServicos: location.state?.valorServicos ?? dadosCalc?.resultado?.valorServicos,
              valorTotal: location.state?.valorTotal ?? dadosCalc?.resultado?.valorTotal
            };
            const itensProcessados = (location.state.itens || []).map(item => {
                const tipoItem = item.tipo_item || 'm2';
                const larguraNum = parseFloat(item.largura) || 0;
                const alturaNum = parseFloat(item.altura) || 0;
                // Tentar corrigir o valor/m² de itens antigos salvos com preco_venda em vez de preco_m2
                const areaItem = larguraNum * alturaNum;
                const valorM2Salvo = parseFloat(item.valor_unitario_m2 ?? item.valor_unitario ?? 0) || 0;
                let valorM2 = valorM2Salvo;
                if (tipoItem === 'm2') {
                  const valorMaterialCalc = parseFloat(resultadoCalc?.valorMaterial) || 0;
                  const valorM2Derivado = areaItem > 0 ? (valorMaterialCalc / areaItem) : 0;
                  if (valorM2Derivado > 0 && (valorM2 === 0 || valorM2 > valorM2Derivado * 3)) {
                    // Usa o valor derivado do cálculo quando o salvo parece estar inflado (ex.: preco_venda)
                    valorM2 = valorM2Derivado;
                  }
                }
                // Importante: itens vindos da calculadora representam a área total.
                // Para não explodir o total na OS, a quantidade de itens m² deve ser 1.
                const quantidadeAjustada = tipoItem === 'm2' ? 1 : (parseInt(item.quantidade) || 1);
                // Recalcular o subtotal quando for m² para garantir consistência com o cálculo salvo
                let subtotalAjustado;
                if (tipoItem === 'm2') {
                  const valorTotalCalc = parseFloat(resultadoCalc?.valorTotal) || 0;
                  const valorMaterialCalc = parseFloat(resultadoCalc?.valorMaterial) || 0;
                  const baseDoItem = valorTotalCalc > 0 ? valorTotalCalc : valorMaterialCalc;
                  if (baseDoItem > 0 && areaItem > 0) {
                    // Forçar o subtotal a ser exatamente o valor total calculado na calculadora
                    subtotalAjustado = baseDoItem;
                    valorM2 = baseDoItem / areaItem;
                  } else {
                    subtotalAjustado = larguraNum * alturaNum * valorM2;
                  }
                } else {
                  subtotalAjustado = parseFloat(item.subtotal_item) || (quantidadeAjustada * (parseFloat(item.valor_unitario) || 0));
                }

                return {
                  ...item,
                  id_item_os: item.id || `item-${Date.now()}-${Math.random()}`,
                  nome_servico_produto: item.nome_servico_produto || item.nome || 'Item sem nome',
                  tipo_item: tipoItem,
                  quantidade: quantidadeAjustada,
                  valor_unitario: item.valor_unitario || item.valor_unitario_m2 || 0,
                  valor_unitario_m2: valorM2,
                  largura: larguraNum,
                  altura: alturaNum,
                  subtotal_item: subtotalAjustado,
                  produto_id: item.produto_id || null,
                  acabamentos_selecionados: item.acabamentos_selecionados || [],
                  observacoes: item.observacoes || ''
                };
            });
            
            // Processar produtos para garantir que tenham a estrutura correta
            const produtosProcessados = (location.state.produtos || []).map(produto => ({
                ...produto,
                id: produto.id || `prod-${Date.now()}-${Math.random()}`,
                nome: produto.nome || 'Produto sem nome',
                codigo_produto: produto.codigo_produto || produto.codigo || '',
                preco_venda: produto.preco_venda || produto.preco || 0,
                preco_m2: produto.preco_m2 || produto.preco_venda || 0,
                unidade_medida: produto.unidade_medida || 'm²',
                quantidade: produto.quantidade || 1,
                valor_total: produto.valor_total || 0
            }));
            
            
            const novoEstado = {
                ...ordemServico,
                itens: itensProcessados,
                produtos: produtosProcessados,
                servicosAdicionais: servicosProcessados,
                cliente_nome_manual: clienteProcessado ? '' : (location.state.cliente?.nome || ''),
                cliente_id: clienteProcessado?.id || null,
                cliente_info: clienteProcessado || null
            };
            
            
            setOrdemServico(novoEstado);
            
            // Se há cliente processado, selecioná-lo
            if (clienteProcessado) {
                handleClienteSelecionado(clienteProcessado);
            }
            
            // Limpar o state após processar os dados da calculadora
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state?.fromCalculadora, setOrdemServico, handleClienteSelecionado, navigate]);

    // Reset da ref quando não há dados da calculadora
    useEffect(() => {
        if (!location.state?.fromCalculadora) {
            processedCalculadoraRef.current = false;
        }
    }, [location.state]);

    const [isNovoClienteModalOpen, setIsNovoClienteModalOpen] = useState(false);

    // Log de debug removido para evitar loop infinito

    const handleOpenNovoClienteModal = () => {
      setIsClienteModalOpen(false); 
      setIsNovoClienteModalOpen(true);
    };
  
    const handleCloseNovoClienteModal = () => {
      setIsNovoClienteModalOpen(false);
    };
  
    const handleSaveNovoCliente = async (novoCliente) => {
      try {
        // Salvar o cliente na API
        const clienteSalvo = await clienteService.create(novoCliente);
        
        // Selecionar o cliente recém-criado
        handleClienteSelecionado(clienteSalvo); 
        setIsNovoClienteModalOpen(false);
        toast({ 
          title: "Cliente Salvo!", 
          description: `${clienteSalvo.nome || clienteSalvo.nome_completo} foi cadastrado e selecionado.` 
        });
      } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        toast({ 
          title: "Erro", 
          description: "Erro ao salvar o cliente. Tente novamente.", 
          variant: "destructive" 
        });
      }
    };

    if (isLoading) {
        return (
          <div className="flex flex-1 justify-center items-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Carregando dados da OS...</p>
          </div>
        );
    }
    
    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-var(--header-height))]">
            <ScrollArea className="flex-1 p-4 md:p-6 space-y-6 bg-slate-50 dark:bg-slate-900">
                <OSHeader 
                    ordemServicoId={ordemServico.id || ordemServico.id_os} 
                    viewOnly={viewOnly}
                    toggleViewMode={toggleViewMode}
                />
                
                <OSClienteSection 
                    clienteSelecionado={clienteSelecionado}
                    ordemServico={ordemServico}
                    setOrdemServico={setOrdemServico}
                    handleOpenClienteModal={(searchTerm = '') => {
                        setClienteSearchTerm(searchTerm);
                        setIsClienteModalOpen(true);
                    }}
                    handleClearCliente={() => handleClienteSelecionado(null)}
                    isSaving={isSaving}
                    viewOnly={viewOnly}
                />

                <OSItemTabsSection
                    itemAtual={itemAtual}
                    onItemChange={handleItemChange}
                    onAdicionarItem={handleAdicionarItem}
                    onUpdateItem={handleUpdateItem}
                    onCancelEdit={handleCancelEditItem}
                    isEditing={isEditingItem}
                    produtosCadastrados={produtosCadastrados}
                    produtosCarregados={produtosCarregados}
                    onRequestProdutos={carregarProdutosSeNecessario}
                    isCarregandoProdutos={isCarregandoProdutos}
                    acabamentosConfig={acabamentosConfig}
                    itensOS={ordemServico.itens || []}
                    onRemoverItem={handleRemoverItem}
                    onEditarItem={handleEditarItem}
                    onDuplicarItem={handleDuplicarItem}
                    isOSFinalizada={isOSFinalizada || isSaving}
                    viewOnly={viewOnly}
                    ordemServico={ordemServico}
                    clienteSelecionado={clienteSelecionado}
                    vendedorAtual={vendedorAtual}
                    onFinalizarOSDoConsumoMaterial={handleFinalizarOSDoConsumoMaterial}
                    isSaving={isSaving}
                    dadosConsumoMaterialParaReabrir={location.state?.dadosConsumoMaterial}
                    reabrirConsumoMaterial={location.state?.reabrirConsumoMaterial}
                />
            </ScrollArea>

            <OSResumoSide
                ordemServico={ordemServico}
                setOrdemServico={setOrdemServico}
                totaisOS={totaisOS}
                maquinas={maquinas}
                acabamentosConfig={acabamentosConfig}
                itemAtual={itemAtual}
                onItemChange={handleItemChange}
                isOSFinalizada={isOSFinalizada}
                onSalvarOrcamento={handleSalvarOrcamento}
                onFinalizarOS={() => setIsPagamentoModalOpen(true)}
                onAtualizarOSFinalizada={handleAtualizarOSFinalizada}
                onGerarPdf={handleGerarPdfDocumento}
                onImprimir={handleImpressaoDocumento}
                onNovaOS={resetOrdemServico}
                onUploadArteFinal={handleUploadArteFinal}
                isSaving={isSaving}
                clienteSelecionado={clienteSelecionado}
                checkEstoqueAcabamento={checkEstoqueAcabamento}
                produtosCadastrados={produtosCadastrados}
                viewOnly={viewOnly}
            />

            <OSClienteModal 
              isOpen={isClienteModalOpen} 
              onClose={() => {
                setIsClienteModalOpen(false);
                setClienteSearchTerm('');
              }} 
              onClienteSelecionado={(cliente) => {
                handleClienteSelecionado(cliente);
                setClienteSearchTerm('');
              }}
              onOpenNovoCliente={handleOpenNovoClienteModal}
              initialSearchTerm={clienteSearchTerm}
            />
            <OSPagamentoModal 
                open={isPagamentoModalOpen} 
                onOpenChange={setIsPagamentoModalOpen} 
                totalOS={totaisOS().totalGeral}
                totaisOS={totaisOS()}
                onConfirmPagamento={handleConfirmarPagamentoOS}
                osId={ordemServico?.id_os || ordemServico?.id}
                clienteId={clienteSelecionado?.id}
                vendedorAtual={vendedorAtual}
                isSaving={isSaving}
                pagamentosExistentes={ordemServico?.pagamentos}
            />
            {isDocumentModalOpen && ordemServico && (
                <OSDocumentModal
                    isOpen={isDocumentModalOpen}
                    setIsOpen={(open) => {
                        setIsDocumentModalOpen(open);
                        // Garantir que o modal seja completamente desmontado
                        if (!open) {
                            setTimeout(() => {
                                document.body.style.pointerEvents = '';
                                document.body.style.overflow = '';
                            }, 100);
                        }
                    }}
                    documentRef={documentRef}
                    documento={ordemServico} 
                    logoUrl={logoUrl}
                    nomeEmpresa={nomeEmpresa}
                    onGerarPdf={handleGerarPdfDocumento}
                    empresaSettings={empresaSettings}
                    contasBancarias={contasBancarias}
                    maquinas={maquinas}
                    vendedorAtual={vendedorAtual}
                />
            )}
            <ClienteForm
                isOpen={isNovoClienteModalOpen}
                onClose={handleCloseNovoClienteModal}
                onSave={handleSaveNovoCliente}
                clienteEmEdicao={null}
            />

            {/* Modal de Recuperação de Rascunho */}
            <Dialog open={showRascunhoModal} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5 text-blue-500" />
                            Rascunho Encontrado
                        </DialogTitle>
                        <DialogDescription>
                            Foi encontrado um rascunho não salvo. Deseja recuperá-lo?
                        </DialogDescription>
                    </DialogHeader>
                    {rascunhoData && (
                        <div className="p-4 bg-muted rounded-lg space-y-2">
                            <p className="text-sm">
                                <span className="font-medium">Cliente:</span>{' '}
                                {rascunhoData.clienteSelecionado?.nome || 
                                 rascunhoData.clienteSelecionado?.nome_completo || 
                                 rascunhoData.ordemServico?.cliente_nome_manual || 
                                 'Não informado'}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">Itens:</span>{' '}
                                {rascunhoData.qtdItens} item(s)
                            </p>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Salvo em:</span>{' '}
                                {format(new Date(rascunhoData.timestamp), 'dd/MM/yyyy HH:mm')}
                            </p>
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={handleDescartarRascunho}>
                            Descartar
                        </Button>
                        <Button onClick={handleRecuperarRascunho}>
                            Recuperar Rascunho
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default OrdensServicoPage;