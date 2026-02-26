import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Search, XCircle, Save, X, Package, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import OSProdutoLookupModal from '@/components/os/OSProdutoLookupModal.jsx';
import { ProductAutocompleteSimple } from '@/components/ui/product-autocomplete-simple';
import { cn } from '@/lib/utils';
import { initialProdutoUnidadeState } from '@/hooks/os/osConstants';
import { calcularSubtotalItem } from '@/hooks/os/osLogic';
import OSVariationsModal from '@/components/os/OSVariationsModal';
import { isEstoqueNoLimiteMinimo, podeConsumirEstoque } from '@/utils/estoqueUtils';

const safeParseFloat = (value, defaultValue = 0) => {
  const strValue = String(value || '0').replace(',', '.');
  const num = parseFloat(strValue);
  return isNaN(num) ? defaultValue : num;
};

const formatToDisplay = (value, precision = 2) => {
    const num = safeParseFloat(value);
    return num.toFixed(precision).replace('.', ',');
};

const isProdutoDigital = (produto) => {
  if (!produto) return false;
  return produto.is_digital === true || produto.is_digital === 1 || produto.is_digital === '1';
};

const OSProdutoUnidadeForm = ({ 
  itemAtual, 
  onItemChange, 
  onAdicionarItem, 
  onUpdateItem,
  onCancelEdit,
  isEditing,
  produtosCadastrados,
  produtosCarregados,
  onRequestProdutos,
  isCarregandoProdutos,
  acabamentosConfig,
  isOSFinalizada,
  viewOnly,
}) => {
  const { toast } = useToast();
  const [currentProduto, setCurrentProduto] = useState(itemAtual && itemAtual.tipo_item === 'unidade' ? itemAtual : initialProdutoUnidadeState());
  const [produtoBaseInfo, setProdutoBaseInfo] = useState(null);
  const [isVariationsModalOpen, setIsVariationsModalOpen] = useState(false);

  const isDisabled = isOSFinalizada || viewOnly;

  const solicitarProdutos = useCallback(() => {
    if (typeof onRequestProdutos === 'function') {
      try {
        const resultado = onRequestProdutos();
        if (resultado && typeof resultado.then === 'function') {
          resultado.catch(error => {
            console.error('❌ [OSProdutoUnidadeForm] Erro ao carregar produtos sob demanda:', error);
          });
        }
      } catch (error) {
        console.error('❌ [OSProdutoUnidadeForm] Erro ao solicitar produtos:', error);
      }
    }
  }, [onRequestProdutos]);

  useEffect(() => {
    if (itemAtual && itemAtual.tipo_item === 'unidade') {
      setCurrentProduto(itemAtual);
      if (itemAtual.produto_id && Array.isArray(produtosCadastrados)) {
        const base = produtosCadastrados.find(p => p.id === itemAtual.produto_id);
        setProdutoBaseInfo(base || null);
      } else {
        setProdutoBaseInfo(null);
      }
    } else if (!isEditing) {
      setCurrentProduto(initialProdutoUnidadeState());
      setProdutoBaseInfo(null);
    }
  }, [itemAtual, isEditing, produtosCadastrados]);

  useEffect(() => {
    if (isEditing && itemAtual?.produto_id && !produtosCarregados) {
      solicitarProdutos();
    }
  }, [isEditing, itemAtual?.produto_id, produtosCarregados, solicitarProdutos]);

  useEffect(() => {
    if (!currentProduto || currentProduto.tipo_item !== 'unidade') return;
    const subtotal = calcularSubtotalItem(currentProduto, acabamentosConfig);
    onItemChange('subtotal_item', subtotal);
    
    // Calcular subtotal apenas dos acabamentos para produtos do tipo unidade
    let subtotalApenasAcabamentos = 0;
    if (currentProduto.acabamentos_selecionados && currentProduto.acabamentos_selecionados.length > 0 && Array.isArray(acabamentosConfig)) {
        currentProduto.acabamentos_selecionados.forEach(acabSelecionado => {
            const acabamentoDef = acabamentosConfig.find(a => a.id === acabSelecionado.id);
            if (acabamentoDef) {
                let valorAcabamento = 0;
                let quantidadeAcabamento = 0;
                const quantidadeItem = safeParseFloat(currentProduto.quantidade, 1);

                if (acabamentoDef.tipo_aplicacao === 'unidade') {
                    valorAcabamento = safeParseFloat(acabamentoDef.valor_un);
                    quantidadeAcabamento = 1;
                } else if (acabamentoDef.tipo_aplicacao === 'area_total') {
                    // Para produtos por unidade, usar área padrão de 1m² se não especificado
                    const areaPadrao = 1;
                    valorAcabamento = safeParseFloat(acabamentoDef.valor_m2);
                    quantidadeAcabamento = areaPadrao;
                } else if (acabamentoDef.tipo_aplicacao === 'perimetro' || acabamentoDef.tipo_aplicacao === 'metro_linear') {
                    // Para produtos por unidade, usar perímetro padrão se não especificado
                    const perimetroPadrao = 4; // 1m x 1m = 4m de perímetro
                    valorAcabamento = safeParseFloat(acabamentoDef.valor_m2 || acabamentoDef.valor_un);
                    quantidadeAcabamento = perimetroPadrao;
                }
                const calcAcab = quantidadeAcabamento * quantidadeItem * valorAcabamento;
                subtotalApenasAcabamentos += isNaN(calcAcab) ? 0 : calcAcab;
            }
        });
    }
    const finalSubtotalAcab = isNaN(subtotalApenasAcabamentos) ? 0 : parseFloat(subtotalApenasAcabamentos.toFixed(2));
    if(currentProduto.subtotal_acabamentos !== finalSubtotalAcab) {
        onItemChange('subtotal_acabamentos', finalSubtotalAcab);
    }
  }, [currentProduto, onItemChange, acabamentosConfig]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (!currentProduto) return;

    if (name === 'valor_unitario' && currentProduto.valor_unitario_bloqueado) {
      return; 
    }
    
    if (name === 'quantidade') {
      const regex = /^\d*$/;
      if (regex.test(value)) {
        onItemChange(name, value);
      }
      return;
    }
    onItemChange(name, value);
  };

  const handleValorUnitarioChange = (e) => {
    onItemChange('valor_unitario', e.target.value);
  };

  const handleValorUnitarioBlur = (e) => {
    onItemChange('valor_unitario', formatToDisplay(e.target.value));
  };

  const validarEstoqueQuantidade = (quantidade) => {
    if (!currentProduto?.produto_id || !Array.isArray(produtosCadastrados)) {
      return { valido: true };
    }

    const produtoSelecionado = produtosCadastrados.find(p => p.id === currentProduto.produto_id);
    if (!produtoSelecionado) {
      return { valido: true };
    }

    if (isProdutoDigital(produtoSelecionado)) {
      return { valido: true };
    }

    const estoqueAtual = safeParseFloat(produtoSelecionado.estoque);
    const quantidadeSolicitada = parseInt(quantidade, 10);

    // Verificar se há estoque suficiente
    if (quantidadeSolicitada > estoqueAtual) {
      return {
        valido: false,
        mensagem: `Estoque insuficiente! Disponível: ${estoqueAtual.toFixed(0)} ${produtoSelecionado.unidade_medida || 'un'}. Solicitado: ${quantidadeSolicitada}.`
      };
    }

    // Verificar se estoque está no limite mínimo
    if (isEstoqueNoLimiteMinimo(produtoSelecionado)) {
      return {
        valido: false,
        mensagem: `O produto "${produtoSelecionado.nome}" está no limite mínimo de estoque (${produtoSelecionado.estoque_minimo} ${produtoSelecionado.unidade_medida || 'un'}). Não é possível adicionar novos itens até que o estoque seja reposto.`
      };
    }

    // Verificar se o consumo não levará o estoque abaixo do mínimo
    if (!podeConsumirEstoque(produtoSelecionado, quantidadeSolicitada)) {
      return {
        valido: false,
        mensagem: `Consumir ${quantidadeSolicitada} unidades levaria o estoque abaixo do mínimo (${produtoSelecionado.estoque_minimo} ${produtoSelecionado.unidade_medida || 'un'}). Estoque atual: ${estoqueAtual.toFixed(0)} ${produtoSelecionado.unidade_medida || 'un'}.`
      };
    }

    return { valido: true };
  };

  const handleQuantidadeBlur = (e) => {
    const { name, value } = e.target;
    
    if (name === 'quantidade') {
      const intValue = parseInt(value, 10);
      
      if (value === '' || isNaN(intValue) || intValue <= 0) {
        onItemChange(name, '1');
      } else {
        // Validar estoque antes de atualizar a quantidade
        const validacaoEstoque = validarEstoqueQuantidade(String(intValue));
        
        if (!validacaoEstoque.valido) {
          toast({
            title: "Estoque Insuficiente",
            description: validacaoEstoque.mensagem,
            variant: "destructive",
            duration: 8000
          });
          
          // Alert temporário para garantir que a mensagem apareça
          alert(`❌ ESTOQUE INSUFICIENTE!\n\n${validacaoEstoque.mensagem}`);
          
          // Ajustar para o estoque máximo disponível
          if (currentProduto?.produto_id && Array.isArray(produtosCadastrados)) {
            const produtoSelecionado = produtosCadastrados.find(p => p.id === currentProduto.produto_id);
            if (produtoSelecionado) {
              const estoqueAtual = safeParseFloat(produtoSelecionado.estoque);
              const estoqueMinimo = safeParseFloat(produtoSelecionado.estoque_minimo);
              const quantidadeMaxima = Math.max(0, Math.floor(estoqueAtual - estoqueMinimo));
              const quantidadeAjustada = Math.min(intValue, quantidadeMaxima);
              onItemChange(name, String(quantidadeAjustada));
            }
          }
        } else {
          onItemChange(name, String(intValue));
        }
      }
    }
  };

  const handleProdutoSelecionado = (produto) => {
    if (produto) {
      setProdutoBaseInfo(produto);
      let novoValorProduto = formatToDisplay(produto.preco_venda || 0);
      let valorBloqueado = safeParseFloat(produto.preco_venda) > 0;
      let valorOrigem = "preço de venda";
      let toastMessage = `${produto.nome}. Valor (R$ ${novoValorProduto}) carregado.`;
      if (valorBloqueado) {
        toastMessage = `${produto.nome}. Valor (R$ ${novoValorProduto} originado do ${valorOrigem}) carregado e bloqueado.`;
      }

      // Sempre carregar o produto base primeiro
      onItemChange('produto_id', produto.id);
      onItemChange('nome_produto', produto.nome);
      onItemChange('imagem_url', produto.imagem_principal || '');
      onItemChange('valor_unitario', novoValorProduto);
      onItemChange('valor_unitario_bloqueado', valorBloqueado);
      onItemChange('quantidade', '1');
      onItemChange('valor_produto_origem', valorOrigem);
      onItemChange('tipo_item', 'unidade');
      onItemChange('variacao_selecionada', null);
      toast({ title: "Produto Selecionado", description: toastMessage, duration: 5000 });
    }
  };

  const handleProdutoSelecionadoModal = (produto) => {
    handleProdutoSelecionado(produto);
  };

  const handleVariacaoSelecionada = (variacao) => {
    if (produtoBaseInfo && variacao) {
      // Se a variação tem preço específico, usar ele. Senão, usar o preço do produto (que já considera promoção)
      const precoVariacao = parseFloat(variacao.preco_var || 0);
      const precoProduto = parseFloat(produtoBaseInfo.preco_venda || 0);
      const precoPromocional = parseFloat(produtoBaseInfo.preco_promocional || 0);
      
      // Determinar qual preço usar
      let precoFinal = 0;
      if (precoVariacao > 0) {
        precoFinal = precoVariacao;
      } else if (produtoBaseInfo.promocao_ativa && precoPromocional > 0) {
        precoFinal = precoPromocional;
      } else {
        precoFinal = precoProduto;
      }
      
      const novoValorProduto = formatToDisplay(precoFinal);
      const valorBloqueado = precoVariacao > 0 || (produtoBaseInfo.promocao_ativa && precoPromocional > 0);
      const valorOrigem = precoVariacao > 0 ? "preço da variação" : (produtoBaseInfo.promocao_ativa && precoPromocional > 0 ? "preço promocional" : "preço de venda base");
      let toastMessage = `${produtoBaseInfo.nome} (${variacao.nome}). Valor (R$ ${novoValorProduto}) carregado.`;
      if (valorBloqueado) {
        toastMessage = `${produtoBaseInfo.nome} (${variacao.nome}). Valor (R$ ${novoValorProduto} originado do ${valorOrigem}) carregado e bloqueado.`;
      }

      onItemChange('nome_produto', `${produtoBaseInfo.nome} (${variacao.nome})`);
      onItemChange('imagem_url', variacao.imagem_url_preview || variacao.imagem_url || produtoBaseInfo.imagem_principal || '');
      onItemChange('valor_unitario', novoValorProduto);
      onItemChange('valor_unitario_bloqueado', valorBloqueado);
      onItemChange('valor_produto_origem', valorOrigem);
      onItemChange('variacao_selecionada', {
        id_variacao: variacao.id_variacao,
        nome: variacao.nome,
        sku: variacao.sku,
        codigo_barras: variacao.codigo_barras,
      });
      toast({ title: "Variação Selecionada", description: toastMessage, duration: 5000 });
    }
    setIsVariationsModalOpen(false);
  };
  
  const handleClearProdutoSelecionado = () => {
    setProdutoBaseInfo(null);
    onItemChange('produto_id', null);
    onItemChange('nome_produto', '');
    onItemChange('imagem_url', '');
    onItemChange('valor_unitario', '0,00');
    onItemChange('valor_unitario_bloqueado', false);
    onItemChange('quantidade', '1'); 
    onItemChange('valor_produto_origem', '');
    onItemChange('tipo_item', 'unidade');
    onItemChange('variacao_selecionada', null);
    toast({ title: "Seleção de Produto Limpa" });
  };

  const handleSubmit = () => {
    // Validar estoque antes de submeter
    if (currentProduto?.produto_id && Array.isArray(produtosCadastrados)) {
      const validacaoEstoque = validarEstoqueQuantidade(currentProduto.quantidade);
      if (!validacaoEstoque.valido) {
        toast({
          title: "Estoque Insuficiente",
          description: validacaoEstoque.mensagem,
          variant: "destructive",
          duration: 8000
        });
        return;
      }
    }

    if (isEditing) {
      if (typeof onUpdateItem === 'function') onUpdateItem();
    } else {
      if (typeof onAdicionarItem === 'function') onAdicionarItem();
    }
  };

  if (!currentProduto) {
    return (
      <Card className="shadow-lg border-border">
        <CardHeader><CardTitle>Carregando formulário do produto...</CardTitle></CardHeader>
        <CardContent><p>Aguarde...</p></CardContent>
      </Card>
    );
  }
  
  const subtotalItemDisplay = formatToDisplay(currentProduto.subtotal_item);
  const valorUnitarioDisplay = String(currentProduto.valor_unitario || '').replace('.',',');
  const produtosUnidadeParaModal = useMemo(() => {
    if (!Array.isArray(produtosCadastrados)) return [];
    return produtosCadastrados.filter((p) => (
      p.unidadeMedida === 'unidade' ||
      (p.unidadeMedida !== 'm2' && p.unidadeMedida !== 'metro_linear')
    ));
  }, [produtosCadastrados]);


  return (
    <Card className="shadow-lg border-border">
      <CardHeader>
        <CardTitle className="flex items-center">
            <Package size={20} className="mr-2 text-primary"/> 
            {isEditing ? 'Editando Produto (Unidade)' : 'Adicionar Produto (Unidade)'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
            <div className="min-w-0">
                <Label htmlFor="nome_produto">Nome do Produto <span className="text-red-500">*</span></Label>
                <ProductAutocompleteSimple
                    id="nome_produto"
                    value={currentProduto.nome_produto || ''} 
                    onChange={handleInputChange}
                    onSelect={handleProdutoSelecionado}
                    onFocus={solicitarProdutos}
                    placeholder="Digite o nome do produto..." 
                    disabled={isDisabled || (currentProduto.produto_id && currentProduto.valor_unitario_bloqueado)}
                    produtos={Array.isArray(produtosCadastrados) ? produtosCadastrados : []}
                    className={cn((currentProduto.produto_id && currentProduto.valor_unitario_bloqueado) && 'bg-muted dark:bg-muted/50')}
                    tipoProduto="unidade"
                />
                {!produtosCarregados && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {isCarregandoProdutos ? 'Carregando produtos cadastrados...' : 'Os produtos serão carregados ao buscar ou abrir a base.'}
                  </p>
                )}
            </div>
            <div className="flex items-end gap-2 md:pt-6">
              <OSProdutoLookupModal
                produtosCadastrados={produtosUnidadeParaModal}
                onSelectProduto={handleProdutoSelecionadoModal}
                onOpen={solicitarProdutos}
              >
                  <Button variant="outline" className="h-10 px-4 whitespace-nowrap" disabled={isDisabled}>
                      <Search size={18} className="mr-2"/> Buscar Produto
                  </Button>
              </OSProdutoLookupModal>
              {currentProduto.produto_id !== null && (
                  <Button variant="ghost" size="icon" onClick={handleClearProdutoSelecionado} title="Limpar produto selecionado" className="h-10 w-10 text-red-500 hover:text-red-600 shrink-0" disabled={isDisabled}>
                      <XCircle size={20} />
                  </Button>
              )}
            </div>
        </div>
        
        {/* Botão para escolher variação - só aparece se o produto tem variações */}
        {produtoBaseInfo && produtoBaseInfo.variacoes_ativa && produtoBaseInfo.variacoes && produtoBaseInfo.variacoes.length > 0 && (
          <div className="flex justify-start">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setIsVariationsModalOpen(true)}
              disabled={isDisabled}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 hover:text-blue-800"
            >
              <Package size={16} className="mr-2" />
              Escolher Variação
            </Button>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="quantidade_un">Quantidade <span className="text-red-500">*</span></Label>
            <Input 
              id="quantidade_un" 
              name="quantidade" 
              type="text" 
              value={currentProduto.quantidade === '0' ? '' : (currentProduto.quantidade || '')} 
              onChange={handleInputChange} 
              onBlur={handleQuantidadeBlur}
              placeholder="1" 
              disabled={isDisabled}
            />
          </div>
          <div>
            <Label htmlFor="valor_unitario">Valor Unitário (R$) <span className="text-red-500">*</span></Label>
            <Input 
              id="valor_unitario" 
              name="valor_unitario" 
              type="text" 
              value={valorUnitarioDisplay} 
              onChange={handleValorUnitarioChange}
              onBlur={handleValorUnitarioBlur} 
              placeholder="0,00"
              readOnly={currentProduto.valor_unitario_bloqueado || isDisabled}
              className={cn((currentProduto.valor_unitario_bloqueado || isDisabled) && 'bg-muted dark:bg-muted/50 cursor-not-allowed font-semibold')}
              disabled={isDisabled}
            />
            {currentProduto.valor_unitario_bloqueado && currentProduto.valor_produto_origem && (
              <p className="text-xs text-muted-foreground mt-1">Valor originado do {currentProduto.valor_produto_origem} do produto.</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="observacao_item_un">Observações do Item</Label>
          <Textarea id="observacao_item_un" name="observacao_item" value={currentProduto.observacao_item || ''} onChange={handleInputChange} placeholder="Ex: cor específica, embalagem especial..." disabled={isDisabled} />
        </div>
        
        <div className="p-3 bg-green-50 dark:bg-green-900/40 rounded-md border border-green-200 dark:border-green-700 flex items-center justify-between">
            <div className="flex items-center">
                <DollarSign size={20} className="mr-3 text-green-600 dark:text-green-400"/>
                <span className="text-lg font-semibold text-green-800 dark:text-green-300">Valor Total do Produto:</span>
            </div>
            <span className="text-2xl font-bold text-green-800 dark:text-green-300">
                R$ {subtotalItemDisplay}
            </span>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          {isEditing && (
            <Button variant="outline" onClick={onCancelEdit} disabled={isDisabled}>
              <X size={18} className="mr-2" /> Cancelar Edição
            </Button>
          )}
          <Button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600 text-white" disabled={isDisabled}>
            {isEditing ? <Save size={18} className="mr-2" /> : <PlusCircle size={18} className="mr-2" />}
            {isEditing ? 'Atualizar Produto' : 'Adicionar à Ordem'}
          </Button>
        </div>
      </CardContent>
      {produtoBaseInfo && produtoBaseInfo.variacoes_ativa && produtoBaseInfo.variacoes && produtoBaseInfo.variacoes.length > 0 && (
        <OSVariationsModal
          isOpen={isVariationsModalOpen}
          onClose={() => setIsVariationsModalOpen(false)}
          variations={produtoBaseInfo.variacoes}
          onSelectVariacao={handleVariacaoSelecionada}
          productName={produtoBaseInfo.nome}
        />
      )}
    </Card>
  );
};

export default OSProdutoUnidadeForm;