import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OSItemForm from '@/components/os/OSItemForm';
import OSProdutoUnidadeForm from '@/components/os/OSProdutoUnidadeForm';
import OSItensTable from '@/components/os/OSItensTable';
import { Ruler, Package, Calculator } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OSItemTabsSection = ({ 
    itemAtual, 
    onItemChange, 
    onAdicionarItem, 
    acabamentosConfig, 
    itensOS, 
    onRemoverItem, 
    onEditarItem,
    onDuplicarItem,
    isOSFinalizada,
    produtosCadastrados,
    produtosCarregados,
    onRequestProdutos,
    isCarregandoProdutos,
    onUpdateItem, 
    onCancelEdit, 
    isEditing,
    viewOnly,
    ordemServico,
    clienteSelecionado,
    vendedorAtual,
    onFinalizarOSDoConsumoMaterial,
    isSaving,
    dadosConsumoMaterialParaReabrir,
    reabrirConsumoMaterial
}) => {
  const [activeTab, setActiveTab] = useState('m2');
  const [consumoMaterialModalTrigger, setConsumoMaterialModalTrigger] = useState(0);
  const shouldOpenAfterTabChange = useRef(false);
  const timeoutIdsRef = useRef([]);

  const isDisabled = useMemo(() => isOSFinalizada || viewOnly, [isOSFinalizada, viewOnly]);

  const scheduleTimeout = (callback, delay) => {
    const timeoutId = setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
      callback();
    }, delay);
    timeoutIdsRef.current.push(timeoutId);
    return timeoutId;
  };

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
      timeoutIdsRef.current = [];
    };
  }, []);

  const handleOpenConsumoMaterial = (e) => {
    // Prevenir abertura acidental - só abrir se for um clique real do mouse
    if (e && e.type !== 'click' && e.type !== 'mousedown') {
      return;
    }
    
    // Prevenir propagação de eventos
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Se estiver na aba de produtos, mudar para a aba m² primeiro e marcar para abrir depois
    if (activeTab === 'unidade') {
      shouldOpenAfterTabChange.current = true;
      setActiveTab('m2');
    } else {
      // Se já estiver na aba m², abrir o modal diretamente
      setConsumoMaterialModalTrigger(prev => prev + 1);
    }
  };

  // Abrir o modal quando a aba mudar para m2 APENAS se foi solicitado pelo botão
  useEffect(() => {
    if (activeTab === 'm2' && shouldOpenAfterTabChange.current) {
      shouldOpenAfterTabChange.current = false; // Resetar a flag
      // Pequeno delay para garantir que o OSItemForm esteja renderizado
      scheduleTimeout(() => {
        setConsumoMaterialModalTrigger(prev => prev + 1);
      }, 150);
    }
  }, [activeTab]);

  // Efeito para reabrir o modal quando vier dados para reabrir
  // Usar ref para evitar múltiplas aberturas
  const hasReopenedRef = useRef(false);
  
  useEffect(() => {
    // Só reabrir se houver flag explícita e dados, e se ainda não tiver sido reaberto
    if (reabrirConsumoMaterial && dadosConsumoMaterialParaReabrir && !hasReopenedRef.current) {
      hasReopenedRef.current = true;
      setConsumoMaterialModalTrigger(prev => prev + 1);
    }
    
    // Resetar a flag quando reabrirConsumoMaterial for false
    if (!reabrirConsumoMaterial) {
      hasReopenedRef.current = false;
    }
  }, [reabrirConsumoMaterial, dadosConsumoMaterialParaReabrir]);

  // Efeito para abrir automaticamente o modal de consumo de material quando editar um item que tem origem "Consumo de Material"
  const hasOpenedConsumoModalRef = useRef(false);
  const lastItemIdRef = useRef(null);
  const itemEditCounterRef = useRef(0);
  const modalFechadoAposAtualizacaoRef = useRef(false);
  const lastUpdateTimestampRef = useRef(0);
  const pendingOpenRef = useRef(null); // Ref para armazenar tentativa de abertura pendente
  
  // Efeito separado para quando isEditing muda para true - garante que o modal abra mesmo se houver timing issues
  useEffect(() => {
    if (isEditing && itemAtual && itemAtual.tipo_item === 'm2' && itemAtual.id_item_os) {
      const itemIdAtual = itemAtual.id_item_os;
      
      // Verificar se o item tem dados de consumo de material
      const temLarguraAlturaPeca = itemAtual.consumo_largura_peca && itemAtual.consumo_altura_peca;
      const temLarguraAlturaChapa = itemAtual.consumo_largura_chapa && itemAtual.consumo_altura_chapa;
      const temQuantidadeSolicitada = itemAtual.consumo_quantidade_solicitada;
      const temPecasPorChapa = itemAtual.consumo_pecas_por_chapa;
      const temChapasNecessarias = itemAtual.consumo_chapas_necessarias;
      
      const temConsumoMaterial = (temLarguraAlturaPeca || temLarguraAlturaChapa) && 
                                 (temQuantidadeSolicitada || temPecasPorChapa || temChapasNecessarias);
      
      if (temConsumoMaterial) {
        // Se é um item diferente ou ainda não abriu, marcar para abrir
        if (lastItemIdRef.current !== itemIdAtual || !hasOpenedConsumoModalRef.current) {
          // Verificar se não foi fechado recentemente
          const agora = Date.now();
          if (!modalFechadoAposAtualizacaoRef.current || (agora - lastUpdateTimestampRef.current) >= 2000) {
            pendingOpenRef.current = itemIdAtual;
            
            // Resetar flags
            if (lastItemIdRef.current !== itemIdAtual) {
              hasOpenedConsumoModalRef.current = false;
              lastItemIdRef.current = itemIdAtual;
              itemEditCounterRef.current = 0;
              modalFechadoAposAtualizacaoRef.current = false;
            }
          }
        }
      }
    }
  }, [isEditing, itemAtual?.id_item_os, itemAtual?.tipo_item]);
  
  // Efeito principal para abrir o modal quando todas as condições estiverem prontas
  useEffect(() => {
    // Verificar se o item tem dados de consumo de material (origem "Consumo de Material")
    if (itemAtual && itemAtual.tipo_item === 'm2' && itemAtual.id_item_os) {
      const itemIdAtual = itemAtual.id_item_os;
      const agora = Date.now();
      
      // Se o modal foi fechado após atualização recentemente (últimos 2 segundos), não reabrir
      if (modalFechadoAposAtualizacaoRef.current && (agora - lastUpdateTimestampRef.current) < 2000) {
        return;
      }
      
      // Verificar se o item tem dados de consumo de material (origem "Consumo de Material")
      const temLarguraAlturaPeca = itemAtual.consumo_largura_peca && itemAtual.consumo_altura_peca;
      const temLarguraAlturaChapa = itemAtual.consumo_largura_chapa && itemAtual.consumo_altura_chapa;
      const temQuantidadeSolicitada = itemAtual.consumo_quantidade_solicitada;
      const temPecasPorChapa = itemAtual.consumo_pecas_por_chapa;
      const temChapasNecessarias = itemAtual.consumo_chapas_necessarias;
      
      // Item tem origem "Consumo de Material" se tiver dados estruturados de consumo
      const temConsumoMaterial = (temLarguraAlturaPeca || temLarguraAlturaChapa) && 
                                 (temQuantidadeSolicitada || temPecasPorChapa || temChapasNecessarias);
      
   
      
      // Se o item tem origem "Consumo de Material" e está em modo de edição, abrir o modal
      // Verificar tanto a flag hasOpenedConsumoModalRef quanto pendingOpenRef para garantir abertura
      const deveAbrir = temConsumoMaterial && 
                       isEditing && 
                       (pendingOpenRef.current === itemIdAtual || !hasOpenedConsumoModalRef.current);
      
      if (deveAbrir) {
        hasOpenedConsumoModalRef.current = true;
        pendingOpenRef.current = null; // Limpar flag pendente
        
        // Garantir que estamos na aba m²
        if (activeTab !== 'm2') {
          setActiveTab('m2');
          // Aguardar a aba mudar antes de abrir o modal
          scheduleTimeout(() => {
            setConsumoMaterialModalTrigger(prev => prev + 1);
          }, 200);
        } else {
          // Pequeno delay para garantir que o componente esteja pronto
          scheduleTimeout(() => {
            setConsumoMaterialModalTrigger(prev => prev + 1);
          }, 100);
        }
      }
    } else {
      // Resetar a flag quando o item mudar ou não tiver mais dados de consumo
      if (!itemAtual || !itemAtual.id_item_os) {
        hasOpenedConsumoModalRef.current = false;
        lastItemIdRef.current = null;
        itemEditCounterRef.current = 0;
        pendingOpenRef.current = null;
      }
    }
  }, [itemAtual?.id_item_os, itemAtual?.tipo_item, activeTab, isEditing]);
  
  // Resetar a flag quando isEditing mudar para false (modal foi fechado ou edição cancelada)
  useEffect(() => {
    if (!isEditing && lastItemIdRef.current) {
      // Edição foi cancelada ou finalizada
      // Se o item ainda existe e tem origem "Consumo de Material", pode ter sido uma atualização
      // Marcar que o modal foi fechado após atualização para evitar reabrir imediatamente
      if (itemAtual && itemAtual.tipo_item === 'm2' && itemAtual.id_item_os === lastItemIdRef.current) {
        const temLarguraAlturaPeca = itemAtual.consumo_largura_peca && itemAtual.consumo_altura_peca;
        const temLarguraAlturaChapa = itemAtual.consumo_largura_chapa && itemAtual.consumo_altura_chapa;
        const temQuantidadeSolicitada = itemAtual.consumo_quantidade_solicitada;
        const temPecasPorChapa = itemAtual.consumo_pecas_por_chapa;
        const temChapasNecessarias = itemAtual.consumo_chapas_necessarias;
        const temConsumoMaterial = (temLarguraAlturaPeca || temLarguraAlturaChapa) && 
                                   (temQuantidadeSolicitada || temPecasPorChapa || temChapasNecessarias);
        
        if (temConsumoMaterial) {
          // Item ainda tem origem "Consumo de Material", provavelmente foi uma atualização
          modalFechadoAposAtualizacaoRef.current = true;
          lastUpdateTimestampRef.current = Date.now();
        }
      }
      
      // Resetar flag para permitir reabrir em edições futuras
      hasOpenedConsumoModalRef.current = false;
      itemEditCounterRef.current = 0;
    }
  }, [isEditing, itemAtual]);

  const handleEditItemWrapper = (item) => {
    // Chamar a função original de edição
    onEditarItem(item);

    // Verificar se o item tem dados de consumo de material para abrir o modal automaticamente
    const temLarguraAlturaPeca = item.consumo_largura_peca && item.consumo_altura_peca;
    const temLarguraAlturaChapa = item.consumo_largura_chapa && item.consumo_altura_chapa;
    const temQuantidadeSolicitada = item.consumo_quantidade_solicitada;
    const temPecasPorChapa = item.consumo_pecas_por_chapa;
    const temChapasNecessarias = item.consumo_chapas_necessarias;
    
    const temConsumoMaterial = (temLarguraAlturaPeca || temLarguraAlturaChapa) && 
                               (temQuantidadeSolicitada || temPecasPorChapa || temChapasNecessarias);

    if (temConsumoMaterial) {
        // Resetar flags para forçar a abertura
        modalFechadoAposAtualizacaoRef.current = false;
        hasOpenedConsumoModalRef.current = true; // Marcamos como já tratado para evitar duplicidade com useEffect
        
        if (activeTab === 'unidade') {
            shouldOpenAfterTabChange.current = true;
            setActiveTab('m2');
        } else {
            // Pequeno delay para garantir que o state do itemAtual tenha propagado
            scheduleTimeout(() => {
                setConsumoMaterialModalTrigger(prev => prev + 1);
            }, 100);
        }
    }
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-xl font-semibold text-gray-700 dark:text-gray-200">
              Itens da Ordem de Serviço
            </span>
            <div className="flex items-center gap-3">
              {!viewOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenConsumoMaterial}
                  onMouseDown={(e) => {
                    // Prevenir que o evento de mouse down cause problemas
                    e.stopPropagation();
                  }}
                  onKeyDown={(e) => {
                    // Só abrir se for Enter ou Space, e prevenir comportamento padrão
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenConsumoMaterial(e);
                    }
                  }}
                  className="border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-900 dark:text-blue-200"
                  disabled={isDisabled}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Consumo de Material
                </Button>
              )}
              {!viewOnly && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="m2" className="text-sm">Serviços (m²)</TabsTrigger>
                    <TabsTrigger value="unidade" className="text-sm">Produtos (Unidade)</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="m2" className="mt-0">
              <OSItemForm
                itemAtual={itemAtual}
                onItemChange={onItemChange}
                onAdicionarItem={onAdicionarItem}
                onUpdateItem={onUpdateItem}
                onCancelEdit={onCancelEdit}
                isEditing={isEditing}
                produtosCadastrados={produtosCadastrados}
                produtosCarregados={produtosCarregados}
                onRequestProdutos={onRequestProdutos}
                isCarregandoProdutos={isCarregandoProdutos}
                acabamentosConfig={acabamentosConfig}
                isOSFinalizada={isOSFinalizada}
                viewOnly={viewOnly}
                consumoMaterialModalTrigger={consumoMaterialModalTrigger}
                ordemServico={ordemServico}
                clienteSelecionado={clienteSelecionado}
                vendedorAtual={vendedorAtual}
                onFinalizarOSDoConsumoMaterial={onFinalizarOSDoConsumoMaterial}
                isSaving={isSaving}
                dadosConsumoMaterialParaReabrir={dadosConsumoMaterialParaReabrir}
                reabrirConsumoMaterial={reabrirConsumoMaterial}
              />
            </TabsContent>
            <TabsContent value="unidade" className="mt-0">
              <OSProdutoUnidadeForm
                itemAtual={itemAtual}
                onItemChange={onItemChange}
                onAdicionarItem={onAdicionarItem}
                onUpdateItem={onUpdateItem}
                onCancelEdit={onCancelEdit}
                isEditing={isEditing}
                produtosCadastrados={produtosCadastrados}
                produtosCarregados={produtosCarregados}
                onRequestProdutos={onRequestProdutos}
                isCarregandoProdutos={isCarregandoProdutos}
                acabamentosConfig={acabamentosConfig}
                isOSFinalizada={isOSFinalizada}
                viewOnly={viewOnly}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AnimatePresence>
        {itensOS.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }} 
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            <OSItensTable 
              itens={itensOS} 
              onRemoveItem={onRemoverItem} 
              onEditItem={handleEditItemWrapper}
              onDuplicateItem={onDuplicarItem}
              isOSFinalizada={isOSFinalizada}
              viewOnly={viewOnly}
              produtosCadastrados={produtosCadastrados}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OSItemTabsSection;