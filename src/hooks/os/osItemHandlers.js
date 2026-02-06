import { useToast } from '@/components/ui/use-toast';
import { initialServicoM2State, initialProdutoUnidadeState } from '@/hooks/os/osConstants';
import { adicionarItemOS, atualizarItemOS, calcularConsumoProdutoVinculadoAcabamento, removerItemOS as removerItemOSLogic, obterDimensoesItemParaAcabamento } from './osLogic';
import { useCallback } from 'react';
import { isEstoqueNoLimiteMinimo, podeConsumirEstoque, podeConsumirAreaEstoque } from '@/utils/estoqueUtils';
import { safeParseFloat } from '@/lib/utils';

export const useOSItemHandlers = (
  ordemServico, setOrdemServico,
  itemAtual, setItemAtual,
  setIsEditingItem,
  acabamentosConfig, produtosCadastrados
) => {
  const { toast } = useToast();

  const checkEstoqueAcabamento = useCallback((acabamentoId, itemParaVerificar = itemAtual) => {
    // TODAS as validações removidas - sempre permitir seleção de acabamentos
    return true;
  }, []);

  const handleAdicionarItem = useCallback((itemRecebido = null) => {
    console.log('🟢 [handleAdicionarItem] Chamado:', {
      tem_itemRecebido: !!itemRecebido,
      tipo_item: itemRecebido?.tipo_item || itemAtual?.tipo_item,
      produto_id: itemRecebido?.produto_id || itemAtual?.produto_id,
      nome: itemRecebido?.nome_servico_produto || itemRecebido?.nome_produto || itemAtual?.nome_servico_produto || itemAtual?.nome_produto
    });
    
    // Usar o item recebido como parâmetro ou fallback para itemAtual
    const itemBase = itemRecebido || itemAtual;
    if (!itemBase || !itemBase.tipo_item) {
      console.error('❌ [handleAdicionarItem] Item inválido:', { itemBase, itemRecebido, itemAtual });
      toast({ 
        title: "Erro", 
        description: "Item inválido para adicionar. Verifique se todos os campos obrigatórios foram preenchidos.", 
        variant: "destructive" 
      });
      return;
    }
    
    // Se recebeu um item completo (do modal, por exemplo), resetar o formulário DEPOIS de processar
    // Isso garante que o item seja adicionado corretamente antes de resetar
    const deveResetarFormulario = !!itemRecebido && itemRecebido.tipo_item;

    const quantidadeItem = parseInt(itemBase.quantidade, 10) || 1;
    // Preservar id_item_os existente se já existir (ex: quando vem do modal de consumo de material)
    // Só gerar novo id se não existir ou for string vazia
    const idItemOS = (itemBase.id_item_os && 
                      typeof itemBase.id_item_os === 'string' && 
                      itemBase.id_item_os.trim() !== '') 
        ? itemBase.id_item_os 
        : `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Fazer cópia profunda para evitar mutações que afetem o item original
    const itemParaAdicionar = { 
      ...itemBase, 
      quantidade: String(quantidadeItem),
      id_item_os: idItemOS,
      // Copiar arrays e objetos aninhados para evitar compartilhamento de referências
      acabamentos_selecionados: Array.isArray(itemBase.acabamentos_selecionados) 
        ? itemBase.acabamentos_selecionados.map(acab => ({ ...acab }))
        : [],
      variacao_selecionada: itemBase.variacao_selecionada 
        ? { ...itemBase.variacao_selecionada }
        : null,
      detalhes: Array.isArray(itemBase.detalhes)
        ? [...itemBase.detalhes]
        : itemBase.detalhes,
    };

    // Validações básicas
    if (itemParaAdicionar.tipo_item === 'm2') {
      console.log('🔍 [handleAdicionarItem] Validando item m²:', {
        produto_id: itemParaAdicionar.produto_id,
        altura: itemParaAdicionar.altura,
        largura: itemParaAdicionar.largura,
        valor_unitario_m2: itemParaAdicionar.valor_unitario_m2,
        tem_produto: !!itemParaAdicionar.produto_id,
        tem_altura: !!itemParaAdicionar.altura,
        tem_largura: !!itemParaAdicionar.largura,
        tem_valor: !!itemParaAdicionar.valor_unitario_m2
      });
      
      // Converter valores do formato brasileiro (vírgula) para formato numérico
      const altura = parseFloat(String(itemParaAdicionar.altura || '0').replace(',', '.'));
      const largura = parseFloat(String(itemParaAdicionar.largura || '0').replace(',', '.'));
      const valorM2 = parseFloat(String(itemParaAdicionar.valor_unitario_m2 || '0').replace(',', '.'));
      
      // Validar dimensões (altura e largura são obrigatórias)
      if (!itemParaAdicionar.altura || !itemParaAdicionar.largura || isNaN(altura) || isNaN(largura) || altura <= 0 || largura <= 0) {
        console.error('❌ [handleAdicionarItem] Validação falhou: dimensões inválidas', {
          altura: itemParaAdicionar.altura,
          largura: itemParaAdicionar.largura,
          altura_parseada: altura,
          largura_parseada: largura
        });
        toast({ title: "Dimensões inválidas", description: "Para serviços M², preencha altura e largura válidas maiores que zero.", variant: "destructive" });
        return;
      }
      
      // produto_id não é obrigatório se o item vem do modal (pode ser material não cadastrado)
      // valor_unitario_m2 é obrigatório, mas pode ser 0 se veio do modal
      if (!itemParaAdicionar.valor_unitario_m2 || itemParaAdicionar.valor_unitario_m2 === '0,00' || itemParaAdicionar.valor_unitario_m2 === '0.00' || (isNaN(valorM2) || valorM2 <= 0)) {
        // Se veio do modal e não tem valor, usar 0 como padrão (pode ser preenchido depois)
        if (itemRecebido) {
          console.warn('⚠️ [handleAdicionarItem] Item do modal sem valor_unitario_m2, usando 0 como padrão');
          itemParaAdicionar.valor_unitario_m2 = '0,00';
        } else {
          console.error('❌ [handleAdicionarItem] Validação falhou: valor unitário m² inválido', {
            valor_unitario_m2: itemParaAdicionar.valor_unitario_m2,
            valor_parseado: valorM2
          });
          toast({ title: "Valor unitário necessário", description: "Para serviços M², preencha o valor por m².", variant: "destructive" });
          return;
        }
      }
    } else if (itemParaAdicionar.tipo_item === 'unidade') {
      // Validar se produto_id está preenchido
      if (!itemParaAdicionar.produto_id) {
        toast({ title: "Campos incompletos", description: "Para produtos por unidade, selecione um produto.", variant: "destructive" });
        return;
      }
      // Validar se valor_unitario está preenchido
      const valorUnitarioStr = String(itemParaAdicionar.valor_unitario || '').trim();
      if (!valorUnitarioStr || valorUnitarioStr === '' || valorUnitarioStr === '0,00' || valorUnitarioStr === '0.00') {
        toast({ title: "Campos incompletos", description: "Para produtos por unidade, preencha o valor unitário do produto.", variant: "destructive" });
        return;
      }
      // Validar se o valor é numérico válido
      const valorUnitarioNum = parseFloat(valorUnitarioStr.replace(',', '.'));
      if (isNaN(valorUnitarioNum)) {
        toast({ title: "Valor inválido", description: "O valor unitário deve ser um número válido.", variant: "destructive" });
        return;
      }
    }

    // Verificar se o produto já existe na OS com as mesmas características
    const itensExistentes = Array.isArray(ordemServico?.itens) ? ordemServico.itens : [];
    
    console.log('🔍 VERIFICAÇÃO DE DUPLICATAS:');
    console.log('📦 Item para adicionar:', {
      produto_id: itemParaAdicionar.produto_id,
      tipo_item: itemParaAdicionar.tipo_item,
      variacao_selecionada: itemParaAdicionar.variacao_selecionada,
      nome_produto: itemParaAdicionar.nome_produto,
      altura: itemParaAdicionar.altura,
      largura: itemParaAdicionar.largura
    });
    console.log('📦 Variação completa do item novo:', JSON.stringify(itemParaAdicionar.variacao_selecionada, null, 2));
    console.log('📋 Itens existentes na OS:', itensExistentes.map(item => ({
      produto_id: item.produto_id,
      tipo_item: item.tipo_item,
      variacao_selecionada: item.variacao_selecionada,
      nome_produto: item.nome_produto,
      altura: item.altura,
      largura: item.largura
    })));
    itensExistentes.forEach((item, index) => {
      console.log(`📋 Variação completa do item ${index}:`, JSON.stringify(item.variacao_selecionada, null, 2));
    });
    
    const produtoJaExiste = itensExistentes.find(item => {
      // IMPORTANTE: Se o item novo tem dados de consumo de material (vem do modal de consumo),
      // permitir adicionar mesmo que tenha o mesmo produto e medidas, pois são itens diferentes
      // com diferentes quantidades ou dados de consumo
      const itemNovoTemConsumoMaterial = itemParaAdicionar.consumo_material_utilizado || 
                                         itemParaAdicionar.consumo_quantidade_solicitada ||
                                         itemParaAdicionar.consumo_largura_peca ||
                                         itemParaAdicionar.consumo_altura_peca;
      
      if (itemNovoTemConsumoMaterial) {
        // Para itens de consumo de material, verificar se é realmente o mesmo item
        // comparando o id_item_os (se estiver editando) ou permitir adicionar como novo item
        if (itemParaAdicionar.id_item_os && item.id_item_os === itemParaAdicionar.id_item_os) {
          // É o mesmo item (está editando), não é duplicata
          return false;
        }
        // Se não tem id_item_os ou são diferentes, permitir adicionar como novo item
        // mesmo que tenha o mesmo produto e medidas, pois são itens diferentes de consumo
        return false;
      }
      
      // Verificar se é o mesmo produto e tipo
      // Se produto_id for null em ambos, comparar pelo nome do material
      if (item.tipo_item !== itemParaAdicionar.tipo_item) {
        return false;
      }
      
      // Se ambos têm produto_id, comparar por produto_id
      if (item.produto_id && itemParaAdicionar.produto_id) {
        if (item.produto_id !== itemParaAdicionar.produto_id) {
          return false;
        }
      } else if (item.produto_id || itemParaAdicionar.produto_id) {
        // Um tem produto_id e outro não, são diferentes
        return false;
      } else {
        // Ambos não têm produto_id, comparar pelo nome do material
        const nomeExistente = item.nome_servico_produto || item.nome_produto || '';
        const nomeNovo = itemParaAdicionar.nome_servico_produto || itemParaAdicionar.nome_produto || '';
        if (nomeExistente.toLowerCase().trim() !== nomeNovo.toLowerCase().trim()) {
          return false;
        }
      }
      
      // Para itens do tipo 'm2', verificar também as dimensões
      // Permitir adicionar o mesmo produto se as medidas forem diferentes
      if (item.tipo_item === 'm2') {
        const alturaExistente = parseFloat(String(item.altura || '0').replace(',', '.'));
        const larguraExistente = parseFloat(String(item.largura || '0').replace(',', '.'));
        const alturaNova = parseFloat(String(itemParaAdicionar.altura || '0').replace(',', '.'));
        const larguraNova = parseFloat(String(itemParaAdicionar.largura || '0').replace(',', '.'));
        
        // Se as dimensões são diferentes, permitir adicionar
        if (alturaExistente !== alturaNova || larguraExistente !== larguraNova) {
          return false;
        }
      }
      
      // Verificar variações - ambos devem ter a mesma variação (ou ambos sem variação)
      // Usar codigo_barras como identificador único da variação, já que id_variacao pode não existir
      const variacaoExistente = item.variacao_selecionada?.codigo_barras || item.variacao_selecionada?.id_variacao;
      const variacaoNova = itemParaAdicionar.variacao_selecionada?.codigo_barras || itemParaAdicionar.variacao_selecionada?.id_variacao;
      
      console.log('🔍 COMPARANDO VARIAÇÕES:', {
        variacaoExistente,
        variacaoNova,
        saoIguais: variacaoExistente === variacaoNova,
        itemExistente: {
          produto_id: item.produto_id,
          nome: item.nome_produto,
          variacao: item.variacao_selecionada,
          altura: item.altura,
          largura: item.largura
        },
        itemNovo: {
          produto_id: itemParaAdicionar.produto_id,
          nome: itemParaAdicionar.nome_produto,
          variacao: itemParaAdicionar.variacao_selecionada,
          altura: itemParaAdicionar.altura,
          largura: itemParaAdicionar.largura
        }
      });
      
      // Se ambos têm variação, comparar os IDs
      if (variacaoExistente && variacaoNova) {
        return variacaoExistente === variacaoNova;
      }
      
      // Se ambos não têm variação, são considerados iguais
      if (!variacaoExistente && !variacaoNova) {
        return true;
      }
      
      // Se um tem variação e outro não, são diferentes
      return false;
    });
    
    console.log('🔍 RESULTADO DA VERIFICAÇÃO:', {
      produtoJaExiste: !!produtoJaExiste,
      itemEncontrado: produtoJaExiste
    });

    if (produtoJaExiste) {
      toast({ 
        title: "Produto Já Adicionado", 
        description: `Este produto com as mesmas características já foi adicionado à OS. Para alterar a quantidade, edite o item existente na lista.`, 
        variant: "destructive",
        duration: 6000
      });
      return;
    }

    // Verificar estoque para produtos
    if (itemParaAdicionar.produto_id) {
      const produtoSelecionado = Array.isArray(produtosCadastrados) ? produtosCadastrados.find(p => p.id === itemParaAdicionar.produto_id) : null;
      
      if (produtoSelecionado) {
        // Verificar se estoque está no limite mínimo
        if (isEstoqueNoLimiteMinimo(produtoSelecionado)) {
          toast({ 
            title: "Estoque no Limite Mínimo", 
            description: `O produto "${produtoSelecionado.nome}" está no limite mínimo de estoque (${produtoSelecionado.estoque_minimo} ${produtoSelecionado.unidade_medida || 'un'}). Não é possível adicionar novos itens até que o estoque seja reposto.`, 
            variant: "destructive",
            duration: 8000
          });
          return;
        }

        if (itemParaAdicionar.tipo_item === 'm2' && produtoSelecionado.unidadeMedida === 'm2') {
          const estoqueAtual = parseFloat(String(produtoSelecionado.estoque || '0').replace(',', '.'));
          const estoqueMinimo = parseFloat(String(produtoSelecionado.estoque_minimo || '0').replace(',', '.'));
          const areaNecessaria = parseFloat(String(itemParaAdicionar.altura || '0').replace(',', '.')) * parseFloat(String(itemParaAdicionar.largura || '0').replace(',', '.')) * quantidadeItem;
          
          // Verificar se há estoque suficiente (considerando o mínimo)
          const estoqueDisponivel = Math.max(0, estoqueAtual - estoqueMinimo);
          
          if (areaNecessaria > estoqueDisponivel) {
            toast({ 
              title: "Estoque Insuficiente", 
              description: `Produto "${produtoSelecionado.nome}": Estoque disponível: ${estoqueDisponivel.toFixed(3).replace('.',',')} m² (considerando estoque mínimo de ${estoqueMinimo.toFixed(3).replace('.',',')} m²). Área solicitada: ${areaNecessaria.toFixed(3).replace('.',',')} m².`, 
              variant: "destructive",
              duration: 9000
            });
            return;
          }
          
          if (areaNecessaria > estoqueAtual) {
            toast({ 
              title: "Estoque Insuficiente", 
              description: `Produto "${produtoSelecionado.nome}": Estoque atual: ${estoqueAtual.toFixed(3).replace('.',',')} m². Área solicitada: ${areaNecessaria.toFixed(3).replace('.',',')} m².`, 
              variant: "destructive",
              duration: 9000
            });
            return;
          }
        } else if (itemParaAdicionar.tipo_item === 'unidade') {
          const estoqueAtual = parseFloat(String(produtoSelecionado.estoque || '0').replace(',', '.'));
          const estoqueMinimo = parseFloat(String(produtoSelecionado.estoque_minimo || '0').replace(',', '.'));
          
          // Verificar se há estoque suficiente (considerando o mínimo)
          const estoqueDisponivel = Math.max(0, estoqueAtual - estoqueMinimo);
          
          if (quantidadeItem > estoqueDisponivel) {
            toast({ 
              title: "Estoque Insuficiente", 
              description: `Produto "${produtoSelecionado.nome}": Estoque disponível: ${estoqueDisponivel.toFixed(0)} unidades (considerando estoque mínimo de ${estoqueMinimo.toFixed(0)}). Solicitado: ${quantidadeItem}.`, 
              variant: "destructive",
              duration: 9000
            });
            return;
          }
          
          if (quantidadeItem > estoqueAtual) {
            toast({ 
              title: "Estoque Insuficiente", 
              description: `Produto "${produtoSelecionado.nome}": Estoque atual: ${estoqueAtual.toFixed(0)} unidades. Solicitado: ${quantidadeItem}.`, 
              variant: "destructive",
              duration: 9000
            });
            return;
          }
        }
      }
    }

    // Verificar estoque para acabamentos
    if (itemParaAdicionar.acabamentos_selecionados && itemParaAdicionar.acabamentos_selecionados.length > 0) {
      for (const acabSel of itemParaAdicionar.acabamentos_selecionados) {
        if (!checkEstoqueAcabamento(acabSel.id, itemParaAdicionar)) return;
      }
    }

    // Formatar valores para salvar
    // Garantir que valor_unitario seja preservado corretamente (formato brasileiro com vírgula)
    const formatarValorBr = (valor) => {
      if (!valor || valor === '' || valor === null || valor === undefined) {
        return '0,00';
      }
      const strValor = String(valor);
      // Se já tem vírgula, apenas garantir formato correto
      if (strValor.includes(',')) {
        return strValor.replace(/\./g, ''); // Remove pontos, mantém vírgula
      }
      // Se tem ponto, substituir por vírgula
      return strValor.replace('.', ',');
    };

    const itemFormatadoParaSalvar = {
      ...itemParaAdicionar,
      altura: itemParaAdicionar.altura ? String(itemParaAdicionar.altura).replace('.',',') : '',
      largura: itemParaAdicionar.largura ? String(itemParaAdicionar.largura).replace('.',',') : '',
      valor_unitario_m2: formatarValorBr(itemParaAdicionar.valor_unitario_m2),
      valor_unitario: formatarValorBr(itemParaAdicionar.valor_unitario),
      // Garantir que subtotal_item seja preservado como número para cálculo
      // O subtotal_item será recalculado em adicionarItemOS, então não formatamos aqui
    };

    console.log('🔍 [handleAdicionarItem] Item formatado antes de adicionar:', {
      produto_id: itemFormatadoParaSalvar.produto_id,
      tipo_item: itemFormatadoParaSalvar.tipo_item,
      valor_unitario: itemFormatadoParaSalvar.valor_unitario,
      quantidade: itemFormatadoParaSalvar.quantidade,
      subtotal_item_atual: itemFormatadoParaSalvar.subtotal_item
    });

    setOrdemServico(prevOS => adicionarItemOS(prevOS, itemFormatadoParaSalvar, acabamentosConfig));
    
    // Resetar formulário após adicionar o item
    // Isso garante que os campos não sejam preenchidos quando o item vem do modal
    setItemAtual(itemParaAdicionar.tipo_item === 'unidade' ? initialProdutoUnidadeState() : initialServicoM2State());
    
    console.log('✅ [handleAdicionarItem] Item adicionado com sucesso:', {
      nome: itemFormatadoParaSalvar.nome_servico_produto || itemFormatadoParaSalvar.nome_produto,
      produto_id: itemFormatadoParaSalvar.produto_id,
      tipo_item: itemFormatadoParaSalvar.tipo_item,
      subtotal_item: itemFormatadoParaSalvar.subtotal_item
    });
    
    toast({ title: "Item Adicionado", description: "O item foi adicionado à Ordem de Serviço." });
  }, [itemAtual, ordemServico, produtosCadastrados, acabamentosConfig, setOrdemServico, setItemAtual, checkEstoqueAcabamento, toast]);

  const handleUpdateItem = useCallback((itemParaAtualizar) => {
    // Verificar se é item de consumo de material (pode não ter produto_id)
    const temConsumoMaterial = itemParaAtualizar.consumo_material_utilizado || 
                              itemParaAtualizar.consumo_largura_peca || 
                              itemParaAtualizar.consumo_altura_peca;
    
    // Validações básicas
    if (itemParaAtualizar.tipo_item === 'm2') {
      // Para itens de consumo de material, produto_id não é obrigatório
      // Mas altura, largura e valor_unitario_m2 ainda são necessários
      if (!temConsumoMaterial && !itemParaAtualizar.produto_id) {
        toast({ title: "Campos incompletos", description: "Para serviços M², preencha: produto, altura, largura e valor por m².", variant: "destructive" });
        return;
      }
      
      if (!itemParaAtualizar.altura || !itemParaAtualizar.largura) {
        toast({ title: "Dimensões necessárias", description: "Para serviços M², preencha altura e largura.", variant: "destructive" });
        return;
      }
      
      // valor_unitario_m2 pode ser 0 para itens de consumo de material (será calculado)
      if (!temConsumoMaterial && (!itemParaAtualizar.valor_unitario_m2 || itemParaAtualizar.valor_unitario_m2 === '0,00' || itemParaAtualizar.valor_unitario_m2 === '0.00')) {
        toast({ title: "Valor necessário", description: "Para serviços M², preencha o valor por m².", variant: "destructive" });
        return;
      }
      
      // Converter valores do formato brasileiro (vírgula) para formato numérico
      let altura = parseFloat(String(itemParaAtualizar.altura || '0').replace(',', '.'));
      let largura = parseFloat(String(itemParaAtualizar.largura || '0').replace(',', '.'));
      
      // Para itens de consumo de material, pode usar dimensões da peça (em cm) se altura/largura não estiverem preenchidas
      if (temConsumoMaterial && (altura <= 0 || largura <= 0)) {
        const alturaPeca = parseFloat(String(itemParaAtualizar.consumo_altura_peca || '0').replace(',', '.')) / 100;
        const larguraPeca = parseFloat(String(itemParaAtualizar.consumo_largura_peca || '0').replace(',', '.')) / 100;
        if (altura <= 0 && alturaPeca > 0) altura = alturaPeca;
        if (largura <= 0 && larguraPeca > 0) largura = larguraPeca;
      }
      
      if (isNaN(altura) || isNaN(largura) || altura <= 0 || largura <= 0) {
        toast({ title: "Dimensões inválidas", description: "Altura e largura devem ser números válidos maiores que zero. Para consumo de material, use as dimensões da peça.", variant: "destructive" });
        return;
      }
    } else if (itemParaAtualizar.tipo_item === 'unidade') {
      if (!itemParaAtualizar.produto_id || !itemParaAtualizar.valor_unitario) {
        toast({ title: "Campos incompletos", description: "Para produtos por unidade, preencha: produto e valor unitário.", variant: "destructive" });
        return;
      }
    }

    // Verificar estoque para produtos (apenas se tiver produto_id)
    // Itens de consumo de material podem não ter produto_id
    if (itemParaAtualizar.tipo_item === 'm2' && itemParaAtualizar.produto_id && !temConsumoMaterial) {
      const produtoSelecionado = Array.isArray(produtosCadastrados) ? produtosCadastrados.find(p => p.id === itemParaAtualizar.produto_id) : null;
      if (produtoSelecionado && produtoSelecionado.unidadeMedida === 'm2') {
        // Verificar se estoque está no limite mínimo
        if (isEstoqueNoLimiteMinimo(produtoSelecionado)) {
          toast({ 
            title: "Estoque no Limite Mínimo", 
            description: `O produto "${produtoSelecionado.nome}" está no limite mínimo de estoque (${produtoSelecionado.estoque_minimo} ${produtoSelecionado.unidade_medida || 'un'}). Não é possível atualizar itens até que o estoque seja reposto.`, 
            variant: "destructive",
            duration: 8000
          });
          return;
        }

        const estoqueAtualProduto = parseFloat(String(produtoSelecionado.estoque || '0').replace(',', '.'));
        // Usar altura e largura já calculadas acima
        const alturaParaEstoque = parseFloat(String(itemParaAtualizar.altura || '0').replace(',', '.'));
        const larguraParaEstoque = parseFloat(String(itemParaAtualizar.largura || '0').replace(',', '.'));
        const quantidade = parseInt(itemParaAtualizar.quantidade, 10);
        const areaTotalNecessaria = alturaParaEstoque * larguraParaEstoque * quantidade;

        const itemOriginalNaOS = ordemServico.itens.find(i => i.id_item_os === itemParaAtualizar.id_item_os);
        let areaOriginalConsumidaPeloItem = 0;
        if (itemOriginalNaOS && itemOriginalNaOS.produto_id === itemParaAtualizar.produto_id) {
            const alturaOriginal = parseFloat(String(itemOriginalNaOS.altura || '0').replace(',', '.'));
            const larguraOriginal = parseFloat(String(itemOriginalNaOS.largura || '0').replace(',', '.'));
            const quantidadeOriginal = parseInt(itemOriginalNaOS.quantidade, 10);
            areaOriginalConsumidaPeloItem = alturaOriginal * larguraOriginal * quantidadeOriginal;
        }
        
        const estoqueDisponivelConsiderandoOriginal = estoqueAtualProduto + areaOriginalConsumidaPeloItem;

        // Verificar se o consumo não levará o estoque abaixo do mínimo
        const estoqueAposConsumo = estoqueDisponivelConsiderandoOriginal - areaTotalNecessaria;
        if (estoqueAposConsumo < parseFloat(String(produtoSelecionado.estoque_minimo || '0').replace(',', '.'))) {
          toast({ 
            title: "Consumo Excederia Estoque Mínimo", 
            description: `Produto "${produtoSelecionado.nome}": Consumir ${areaTotalNecessaria.toFixed(3).replace('.',',')} m² levaria o estoque abaixo do mínimo (${produtoSelecionado.estoque_minimo} m²). Estoque após consumo: ${estoqueAposConsumo.toFixed(3).replace('.',',')} m².`, 
            variant: "destructive",
            duration: 8000
          });
          return;
        }

        if (areaTotalNecessaria > estoqueDisponivelConsiderandoOriginal) {
          toast({ title: "Estoque Insuficiente para Serviço M²", description: `Produto base ${produtoSelecionado.nome}: Estoque atual: ${estoqueAtualProduto.toFixed(3).replace('.',',')} m². Área solicitada: ${areaTotalNecessaria.toFixed(3).replace('.',',')} m². (Disponível considerando devolução do item original: ${estoqueDisponivelConsiderandoOriginal.toFixed(3).replace('.',',')} m²)`, variant: "destructive", duration: 9000 });
          return;
        }
      }
    } else if (itemParaAtualizar.tipo_item === 'unidade' && itemParaAtualizar.produto_id) {
      const produtoSelecionado = Array.isArray(produtosCadastrados) ? produtosCadastrados.find(p => p.id === itemParaAtualizar.produto_id) : null;
      if (produtoSelecionado) {
        // Verificar se estoque está no limite mínimo
        if (isEstoqueNoLimiteMinimo(produtoSelecionado)) {
          toast({ 
            title: "Estoque no Limite Mínimo", 
            description: `O produto "${produtoSelecionado.nome}" está no limite mínimo de estoque (${produtoSelecionado.estoque_minimo} ${produtoSelecionado.unidade_medida || 'un'}). Não é possível atualizar itens até que o estoque seja reposto.`, 
            variant: "destructive",
            duration: 8000
          });
          return;
        }

        const estoqueAtualProduto = parseFloat(String(produtoSelecionado.estoque || '0').replace(',', '.'));
        const quantidadeSolicitada = parseInt(itemParaAtualizar.quantidade, 10);
        
        const itemOriginalNaOS = ordemServico.itens.find(i => i.id_item_os === itemParaAtualizar.id_item_os);
        const quantidadeOriginalConsumidaPeloItem = itemOriginalNaOS && itemOriginalNaOS.produto_id === itemParaAtualizar.produto_id ? parseInt(itemOriginalNaOS.quantidade, 10) : 0;
        
        const estoqueDisponivelConsiderandoOriginal = estoqueAtualProduto + quantidadeOriginalConsumidaPeloItem;

        // Verificar se o consumo não levará o estoque abaixo do mínimo
        const estoqueAposConsumo = estoqueDisponivelConsiderandoOriginal - quantidadeSolicitada;
        if (estoqueAposConsumo < parseFloat(String(produtoSelecionado.estoque_minimo || '0').replace(',', '.'))) {
          toast({ 
            title: "Consumo Excederia Estoque Mínimo", 
            description: `Produto "${produtoSelecionado.nome}": Consumir ${quantidadeSolicitada} unidades levaria o estoque abaixo do mínimo (${produtoSelecionado.estoque_minimo} ${produtoSelecionado.unidade_medida || 'un'}). Estoque após consumo: ${estoqueAposConsumo.toFixed(2).replace('.',',')} ${produtoSelecionado.unidade_medida || 'un'}.`, 
            variant: "destructive",
            duration: 8000
          });
          return;
        }

        if (quantidadeSolicitada > estoqueDisponivelConsiderandoOriginal) {
          toast({ title: "Estoque Insuficiente", description: `Produto ${produtoSelecionado.nome}: Estoque atual: ${estoqueAtualProduto.toFixed(2).replace('.',',')}. Solicitado: ${quantidadeSolicitada}. (Disponível considerando devolução do item original: ${estoqueDisponivelConsiderandoOriginal.toFixed(2).replace('.',',')})`, variant: "destructive", duration: 9000 });
          return;
        }
      }
    }

    if (itemParaAtualizar.tipo_item === 'm2' && itemParaAtualizar.acabamentos_selecionados) {
      for (const acabSel of itemParaAtualizar.acabamentos_selecionados) {
        if (!checkEstoqueAcabamento(acabSel.id, itemParaAtualizar)) return;
      }
    }
    
    // Formatar valores para salvar
    // Garantir que valor_unitario seja preservado corretamente (formato brasileiro com vírgula)
    const formatarValorBr = (valor) => {
      if (!valor || valor === '' || valor === null || valor === undefined) {
        return '0,00';
      }
      const strValor = String(valor);
      // Se já tem vírgula, apenas garantir formato correto
      if (strValor.includes(',')) {
        return strValor.replace(/\./g, ''); // Remove pontos, mantém vírgula
      }
      // Se tem ponto, substituir por vírgula
      return strValor.replace('.', ',');
    };
    
    // Fazer cópia profunda para evitar mutações que afetem o item original
    const itemFormatadoParaSalvar = {
        ...itemParaAtualizar,
        altura: itemParaAtualizar.altura ? String(itemParaAtualizar.altura).replace('.',',') : '',
        largura: itemParaAtualizar.largura ? String(itemParaAtualizar.largura).replace('.',',') : '',
        valor_unitario_m2: formatarValorBr(itemParaAtualizar.valor_unitario_m2),
        valor_unitario: formatarValorBr(itemParaAtualizar.valor_unitario),
        // Copiar arrays e objetos aninhados para evitar compartilhamento de referências
        acabamentos_selecionados: Array.isArray(itemParaAtualizar.acabamentos_selecionados) 
          ? itemParaAtualizar.acabamentos_selecionados.map(acab => ({ ...acab }))
          : [],
        variacao_selecionada: itemParaAtualizar.variacao_selecionada 
          ? { ...itemParaAtualizar.variacao_selecionada }
          : null,
        detalhes: Array.isArray(itemParaAtualizar.detalhes)
          ? [...itemParaAtualizar.detalhes]
          : itemParaAtualizar.detalhes,
    }
    
    console.log('🔍 [handleUpdateItem] Atualizando item na OS:', {
        id_item_os: itemFormatadoParaSalvar.id_item_os,
        id: itemFormatadoParaSalvar.id,
        altura: itemFormatadoParaSalvar.altura,
        largura: itemFormatadoParaSalvar.largura,
        quantidade: itemFormatadoParaSalvar.quantidade,
        valor_unitario_m2: itemFormatadoParaSalvar.valor_unitario_m2,
        consumo_largura_peca: itemFormatadoParaSalvar.consumo_largura_peca,
        consumo_altura_peca: itemFormatadoParaSalvar.consumo_altura_peca,
        consumo_custo_total: itemFormatadoParaSalvar.consumo_custo_total,
        subtotal_item: itemFormatadoParaSalvar.subtotal_item,
        preservouId: itemFormatadoParaSalvar.id_item_os === itemParaAtualizar.id_item_os
    });

    setOrdemServico(prevOS => {
        console.log('🔍 [handleUpdateItem] OS antes da atualização:', {
            itens_count: prevOS.itens?.length,
            itens_ids: prevOS.itens?.map(i => ({ id_item_os: i.id_item_os, id: i.id, largura: i.largura, altura: i.altura }))
        });
        const osAtualizada = atualizarItemOS(prevOS, itemFormatadoParaSalvar, acabamentosConfig);
        console.log('✅ [handleUpdateItem] OS após atualização:', {
            itens_count: osAtualizada.itens?.length,
            itens_ids: osAtualizada.itens?.map(i => ({ id_item_os: i.id_item_os, id: i.id, largura: i.largura, altura: i.altura, consumo_largura_peca: i.consumo_largura_peca, consumo_altura_peca: i.consumo_altura_peca, subtotal_item: i.subtotal_item }))
        });
        return osAtualizada;
    });
    setItemAtual(itemParaAtualizar.tipo_item === 'unidade' ? initialProdutoUnidadeState() : initialServicoM2State());
    setIsEditingItem(false);
  }, [ordemServico, acabamentosConfig, produtosCadastrados, setOrdemServico, setItemAtual, setIsEditingItem, checkEstoqueAcabamento, toast]);

  const handleRemoverItem = useCallback((itemId) => {
    setOrdemServico(prevOS => removerItemOSLogic(prevOS, itemId));
    toast({ title: "Item Removido", description: "O item foi removido da Ordem de Serviço." });
    if (itemAtual && itemAtual.id_item_os === itemId) {
      setItemAtual(itemAtual.tipo_item === 'unidade' ? initialProdutoUnidadeState() : initialServicoM2State());
      setIsEditingItem(false);
    }
  }, [itemAtual, setOrdemServico, setItemAtual, setIsEditingItem, toast]);

  const handleEditarItem = useCallback((itemParaEditar) => {
    console.log('🔍 [handleEditarItem] Iniciando edição do item:', {
        id_item_os: itemParaEditar.id_item_os,
        nome: itemParaEditar.nome_servico_produto || itemParaEditar.nome_produto,
        altura: itemParaEditar.altura,
        largura: itemParaEditar.largura
    });
    
    // Verificar se o item tem origem "Consumo de Material"
    // IMPORTANTE: Um item tem origem "Consumo de Material" se tiver os campos ESPECÍFICOS de consumo preenchidos
    // Não basta ter apenas consumo_material_utilizado (que pode ser preenchido com o nome do produto)
    // Precisa ter pelo menos: largura_peca E altura_peca OU largura_chapa E altura_chapa
    const temLarguraAlturaPeca = itemParaEditar.consumo_largura_peca && itemParaEditar.consumo_altura_peca;
    const temLarguraAlturaChapa = itemParaEditar.consumo_largura_chapa && itemParaEditar.consumo_altura_chapa;
    const temQuantidadeSolicitada = itemParaEditar.consumo_quantidade_solicitada;
    const temPecasPorChapa = itemParaEditar.consumo_pecas_por_chapa;
    const temChapasNecessarias = itemParaEditar.consumo_chapas_necessarias;
    
    // Item tem origem "Consumo de Material" se tiver dados estruturados de consumo
    const temOrigemConsumoMaterial = (temLarguraAlturaPeca || temLarguraAlturaChapa) && 
                                     (temQuantidadeSolicitada || temPecasPorChapa || temChapasNecessarias);
    
    console.log('🔍 [handleEditarItem] Verificando origem do item:', {
        temOrigemConsumoMaterial,
        consumo_material_utilizado: itemParaEditar.consumo_material_utilizado,
        tipo_item: itemParaEditar.tipo_item
    });
    
    // Fazer uma cópia profunda para evitar mutações que afetem outros itens
    const itemCopiado = {
        ...itemParaEditar,
        altura: String(itemParaEditar.altura || '0').replace(',', '.'),
        largura: String(itemParaEditar.largura || '0').replace(',', '.'),
        valor_unitario_m2: String(itemParaEditar.valor_unitario_m2 || '0').replace(',', '.'),
        valor_unitario: String(itemParaEditar.valor_unitario || '0').replace(',', '.'),
        // Copiar arrays e objetos aninhados para evitar compartilhamento de referências
        acabamentos_selecionados: Array.isArray(itemParaEditar.acabamentos_selecionados) 
          ? itemParaEditar.acabamentos_selecionados.map(acab => ({ ...acab }))
          : [],
        variacao_selecionada: itemParaEditar.variacao_selecionada 
          ? { ...itemParaEditar.variacao_selecionada }
          : null,
        detalhes: Array.isArray(itemParaEditar.detalhes)
          ? [...itemParaEditar.detalhes]
          : itemParaEditar.detalhes,
    };
    
    console.log('✅ [handleEditarItem] Item copiado para edição:', {
        id_item_os: itemCopiado.id_item_os,
        preservouId: itemCopiado.id_item_os === itemParaEditar.id_item_os,
        temOrigemConsumoMaterial
    });
    
    // Se o item tem origem "Consumo de Material", definir itemAtual e isEditingItem como true
    // para que o modal seja aberto automaticamente pelo OSItemTabsSection
    // O formulário principal "Editando Serviço/Item (m²)" NÃO será preenchido (isso é feito no OSItemForm)
    if (temOrigemConsumoMaterial && itemParaEditar.tipo_item === 'm2') {
      console.log('✅ [handleEditarItem] Item tem origem "Consumo de Material" - abrindo modal de consumo');
      setItemAtual(itemCopiado);
      // Definir isEditingItem como true para que o OSItemTabsSection detecte e abra o modal
      setIsEditingItem(true);
    } else {
      // Se o item NÃO tem origem "Consumo de Material", preencher o formulário principal normalmente
      console.log('✅ [handleEditarItem] Item NÃO tem origem "Consumo de Material" - preenchendo formulário principal');
      setItemAtual(itemCopiado);
      setIsEditingItem(true);
    }
  }, [setItemAtual, setIsEditingItem]);

  const handleCancelEditItem = useCallback(() => {
    setItemAtual(itemAtual.tipo_item === 'unidade' ? initialProdutoUnidadeState() : initialServicoM2State());
    setIsEditingItem(false);
  }, [itemAtual.tipo_item, setItemAtual, setIsEditingItem]);

  const handleClonarMedidas = useCallback((itemOrigem, itemDestino) => {
    // Validar que ambos os itens são do tipo m²
    if (itemOrigem.tipo_item !== 'm2' || itemDestino.tipo_item !== 'm2') {
      toast({ 
        title: "Erro", 
        description: "A clonagem de medidas só é permitida para itens do tipo m².", 
        variant: "destructive" 
      });
      return;
    }

    // Validar que o item origem tem medidas válidas
    const larguraOrigem = safeParseFloat(itemOrigem.largura, 0);
    const alturaOrigem = safeParseFloat(itemOrigem.altura, 0);
    
    if (larguraOrigem <= 0 || alturaOrigem <= 0) {
      toast({ 
        title: "Erro", 
        description: "O item de origem não possui medidas válidas para clonagem.", 
        variant: "destructive" 
      });
      return;
    }

    // Criar cópia do item destino com as medidas clonadas
    const itemAtualizado = {
      ...itemDestino,
      largura: String(larguraOrigem).replace('.', ','),
      altura: String(alturaOrigem).replace('.', ','),
    };

    // Atualizar o item na OS usando handleUpdateItem
    handleUpdateItem(itemAtualizado);

    toast({ 
      title: "Medidas Clonadas", 
      description: `As medidas (${Math.round(larguraOrigem * 100)}cm x ${Math.round(alturaOrigem * 100)}cm) foram clonadas com sucesso.` 
    });
  }, [handleUpdateItem, toast]);

  // Handler para duplicar um item completo
  const handleDuplicarItem = useCallback((itemParaDuplicar) => {
    if (!itemParaDuplicar) {
      toast({ 
        title: "Erro", 
        description: "Item inválido para duplicação.", 
        variant: "destructive" 
      });
      return;
    }

    // Gerar novo id_item_os para o item duplicado
    const novoIdItemOS = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Criar cópia profunda do item
    const itemDuplicado = {
      ...itemParaDuplicar,
      id_item_os: novoIdItemOS,
      // Limpar campos que devem ser únicos
      id: null,
      // Copiar arrays e objetos aninhados para evitar compartilhamento de referências
      acabamentos_selecionados: Array.isArray(itemParaDuplicar.acabamentos_selecionados) 
        ? itemParaDuplicar.acabamentos_selecionados.map(acab => ({ ...acab }))
        : [],
      variacao_selecionada: itemParaDuplicar.variacao_selecionada 
        ? { ...itemParaDuplicar.variacao_selecionada }
        : null,
      detalhes: Array.isArray(itemParaDuplicar.detalhes)
        ? [...itemParaDuplicar.detalhes]
        : itemParaDuplicar.detalhes,
    };

    // Adicionar o item duplicado à OS
    setOrdemServico(prev => ({
      ...prev,
      itens: [...(prev.itens || []), itemDuplicado]
    }));

    toast({ 
      title: "Item Duplicado", 
      description: `O item "${itemParaDuplicar.nome_servico_produto || itemParaDuplicar.nome_produto || 'Item'}" foi duplicado com sucesso.` 
    });
  }, [setOrdemServico, toast]);

  return {
    checkEstoqueAcabamento,
    handleAdicionarItem,
    handleUpdateItem,
    handleRemoverItem,
    handleEditarItem,
    handleCancelEditItem,
    handleClonarMedidas,
    handleDuplicarItem,
  };
};