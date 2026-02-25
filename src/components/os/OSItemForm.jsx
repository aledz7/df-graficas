import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Search, XCircle, Save, X, Ruler, DollarSign, Package, Sparkles, CheckCircle2, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import OSProdutoLookupModal from '@/components/os/OSProdutoLookupModal.jsx';
import { ProductAutocompleteSimple } from '@/components/ui/product-autocomplete-simple';
import { cn } from '@/lib/utils';
import { initialServicoM2State } from '@/hooks/os/osConstants';
import { calcularSubtotalItem, obterDimensoesItemParaAcabamento, calcularConsumoProdutoVinculadoAcabamento } from '@/hooks/os/osLogic';
import { isEstoqueNoLimiteMinimo, podeConsumirAreaEstoque } from '@/utils/estoqueUtils';
import OSVariationsModal from '@/components/os/OSVariationsModal';

const safeParseFloat = (value, defaultValue = 0) => {
  if (!value && value !== 0) return defaultValue;
  const strValue = String(value)
    .trim()
    .replace(/\s/g, '');

  let normalized = strValue;

  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',') && !normalized.includes('.')) {
    normalized = normalized.replace(',', '.');
  }

  const num = parseFloat(normalized);
  return isNaN(num) ? defaultValue : num;
};

const formatToDisplay = (value, precision = 2) => {
    const num = safeParseFloat(value);
    // Limitar o número de casas decimais para evitar valores muito longos
    const limitedNum = Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision);
    return limitedNum.toFixed(precision).replace('.', ',');
};

const sanitizeDecimalInput = (value = '') => {
  if (value === null || value === undefined) return '';
  const strValue = typeof value === 'string' ? value : String(value);
  return strValue.replace(/[^0-9.,]/g, '');
};
const sanitizeIntegerInput = (value = '') => {
  if (value === null || value === undefined) return '';
  const strValue = typeof value === 'string' ? value : String(value);
  return strValue.replace(/[^0-9]/g, '');
};

const extractMeasurementsFromName = (nome) => {
  const nomeStr = (nome ?? '').toString();
  if (!nomeStr.trim()) {
    return {
      baseName: '',
      measurementText: '',
      widthRaw: null,
      heightRaw: null,
      unit: null,
    };
  }

  const measurementPattern = /(?:(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)(?:\s*(cm|mm|m))?)/i;
  const match = measurementPattern.exec(nomeStr);

  if (!match) {
    return {
      baseName: nomeStr.trim(),
      measurementText: '',
      widthRaw: null,
      heightRaw: null,
      unit: null,
    };
  }

  const measurementText = match[0].trim();
  const antes = nomeStr.slice(0, match.index);
  const depois = nomeStr.slice(match.index + match[0].length);
  const baseName = `${antes} ${depois}`.replace(/\s{2,}/g, ' ').trim();

  const parseNumero = (valor) => {
    if (!valor) return null;
    const parsed = parseFloat(valor.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    baseName: baseName || nomeStr.trim(),
    measurementText,
    widthRaw: parseNumero(match[1]),
    heightRaw: parseNumero(match[2]),
    unit: match[3] ? match[3].toLowerCase() : null,
  };
};

const convertMeasurementToMeters = (valor, unidade) => {
  if (valor === null || valor === undefined) return null;
  const numero = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
  if (!Number.isFinite(numero)) return null;

  const unidadeNormalizada = unidade ? unidade.toLowerCase() : null;

  if (!unidadeNormalizada) {
    if (numero > 10) {
      return numero / 100; // assumir centímetros
    }
    return numero; // assumir metros
  }

  switch (unidadeNormalizada) {
    case 'mm':
      return numero / 1000;
    case 'cm':
      return numero / 100;
    case 'm':
      return numero;
    default:
      return numero;
  }
};

const buildMaterialDescricao = (nome, larguraValor, alturaValor) => {
  const {
    baseName,
    measurementText,
    widthRaw,
    heightRaw,
    unit,
  } = extractMeasurementsFromName(nome);

  const nomePrincipal = baseName || (nome ?? '').toString().trim();

  const larguraNumerica = safeParseFloat(larguraValor);
  const alturaNumerica = safeParseFloat(alturaValor);

  const unidadeMedida = unit || 'm';
  const formatarMedida = (numero) => `${numero.toFixed(2).replace('.', ',')}${unidadeMedida}`;

  const partes = [];
  if (larguraNumerica > 0) {
    partes.push(formatarMedida(larguraNumerica));
  }
  if (alturaNumerica > 0) {
    partes.push(formatarMedida(alturaNumerica));
  }

  if (partes.length > 0) {
    if (nomePrincipal) {
      return `${nomePrincipal} (${partes.join(' x ')})`;
    }
    return partes.join(' x ');
  }

  const larguraNome = convertMeasurementToMeters(widthRaw, unit);
  const alturaNome = convertMeasurementToMeters(heightRaw, unit);
  if (larguraNome !== null && alturaNome !== null) {
    const larguraNomeDisplay = formatarMedida(larguraNome);
    const alturaNomeDisplay = formatarMedida(alturaNome);
    if (nomePrincipal) {
      return `${nomePrincipal} (${larguraNomeDisplay} x ${alturaNomeDisplay})`;
    }
    return `${larguraNomeDisplay} x ${alturaNomeDisplay}`;
  }

  if (measurementText) {
    const measurementNormalized = measurementText.replace(/\s+/g, '').toUpperCase();
    if (nomePrincipal) {
      return `${nomePrincipal} (${measurementNormalized})`;
    }
    return measurementNormalized;
  }

  return nomePrincipal;
};


const calcularCustoAcabamentosSelecionados = (item, acabamentosConfig, areaTotalPecas = null) => {
  if (!item || item.tipo_item !== 'm2' || !Array.isArray(acabamentosConfig)) {
    return 0;
  }

  const acabamentosSelecionados = Array.isArray(item.acabamentos_selecionados)
    ? item.acabamentos_selecionados
    : [];

  if (acabamentosSelecionados.length === 0) {
    return 0;
  }

  // Se areaTotalPecas foi fornecida (consumo de material), usar ela diretamente
  // Caso contrário, calcular área × quantidade normalmente
  const temConsumoMaterial = areaTotalPecas !== null && areaTotalPecas > 0;
  let area, perimetro, multiplicadorQuantidade;
  
  if (temConsumoMaterial) {
    // Para consumo de material, usar a área total das peças fornecida
    area = areaTotalPecas;
    // Para perimetro, ainda precisamos calcular com base nas dimensões da peça
    const temConsumoDimensoes = item.consumo_largura_peca && item.consumo_altura_peca;
    if (temConsumoDimensoes) {
      const larguraPecaCm = safeParseFloat(item.consumo_largura_peca, 0);
      const alturaPecaCm = safeParseFloat(item.consumo_altura_peca, 0);
      const largura = larguraPecaCm >= 10 ? larguraPecaCm / 100 : larguraPecaCm;
      const altura = alturaPecaCm >= 10 ? alturaPecaCm / 100 : alturaPecaCm;
      perimetro = largura > 0 && altura > 0 ? 2 * (largura + altura) : 0;
      const quantidadeSolicitada = parseInt(sanitizeIntegerInput(item.consumo_quantidade_solicitada || ''), 10) || 0;
      multiplicadorQuantidade = quantidadeSolicitada > 0 ? quantidadeSolicitada : 1;
    } else {
      perimetro = 0;
      multiplicadorQuantidade = 1;
    }
  } else {
    // Para itens normais, calcular área e perimetro normalmente
    const temConsumoMaterial = item.consumo_largura_peca && item.consumo_altura_peca;
    let largura, altura;
    
    if (temConsumoMaterial) {
      const larguraPecaCm = safeParseFloat(item.consumo_largura_peca, 0);
      const alturaPecaCm = safeParseFloat(item.consumo_altura_peca, 0);
      largura = larguraPecaCm >= 10 ? larguraPecaCm / 100 : larguraPecaCm;
      altura = alturaPecaCm >= 10 ? alturaPecaCm / 100 : alturaPecaCm;
    } else {
      const dimensoes = obterDimensoesItemParaAcabamento(item);
      largura = dimensoes.largura;
      altura = dimensoes.altura;
    }
    
    area = largura * altura;
    perimetro = largura > 0 && altura > 0 ? 2 * (largura + altura) : 0;
    const quantidadeItem = parseInt(sanitizeIntegerInput(item.quantidade || ''), 10) || 0;
    const quantidadeItensValida = quantidadeItem > 0 ? quantidadeItem : 1;
    const quantidadeSolicitada = parseInt(sanitizeIntegerInput(item.consumo_quantidade_solicitada || ''), 10) || 0;
    multiplicadorQuantidade = quantidadeSolicitada > 0 ? quantidadeSolicitada : quantidadeItensValida;
  }

  let custoTotal = 0;

  acabamentosSelecionados.forEach((acabSelecionado) => {
    const acabamentoDef = acabamentosConfig.find((def) => def.id === acabSelecionado.id);
    if (!acabamentoDef) {
      return;
    }

    // SEMPRE usar VALOR de venda (valor_m2/valor_un) do acabamentoDef, não custo
    // Isso garante que o valor calculado seja consistente com o que será usado no formulário principal
    const valorM2Raw = acabamentoDef.valor_m2 || acabamentoDef.valor || '0';
    const valorM2 = safeParseFloat(valorM2Raw, 0);
    const valorUnRaw = acabamentoDef.valor_un || acabamentoDef.valor || '0';
    const valorUn = safeParseFloat(valorUnRaw, 0);

    // SEMPRE usar valor de venda do acabamento, nunca custo do produto vinculado
    // O "Custo total do material" deve usar o valor de venda para consistência
    if (acabamentoDef.tipo_aplicacao === 'area_total') {
      if (valorM2 > 0 && area > 0) {
        // Se areaTotalPecas foi fornecida, ela já inclui a quantidade, não multiplicar novamente
        const custoArea = (areaTotalPecas !== null) ? (area * valorM2) : (area * multiplicadorQuantidade * valorM2);
        custoTotal += isNaN(custoArea) ? 0 : custoArea;
      }
    } else if (acabamentoDef.tipo_aplicacao === 'perimetro' || acabamentoDef.tipo_aplicacao === 'metro_linear') {
      if (perimetro > 0 && valorM2 > 0) {
        const custoLinear = perimetro * multiplicadorQuantidade * valorM2;
        custoTotal += isNaN(custoLinear) ? 0 : custoLinear;
      }
    } else if (acabamentoDef.tipo_aplicacao === 'unidade') {
      if (valorUn > 0) {
        const custoPorUnidade = multiplicadorQuantidade * valorUn;
        custoTotal += isNaN(custoPorUnidade) ? 0 : custoPorUnidade;
      }
    }
  });

  const custoFinal = isNaN(custoTotal) ? 0 : parseFloat(custoTotal.toFixed(2));
  
  console.log('💰 [calcularCustoAcabamentosSelecionados] Cálculo de acabamentos:', {
    temConsumoMaterial: areaTotalPecas !== null,
    areaTotalPecas,
    area,
    perimetro,
    multiplicadorQuantidade,
    acabamentosSelecionados: acabamentosSelecionados.length,
    custoTotal: custoFinal,
    observacao: areaTotalPecas !== null 
      ? 'Usando área total das peças fornecida (consumo de material)' 
      : 'Calculando área × quantidade normalmente'
  });
  
  return custoFinal;
};

/**
 * Calcula o número máximo de peças que cabem em uma chapa usando algoritmo de empacotamento otimizado
 * Usa bruteforce para testar TODAS as combinações possíveis de posições e orientações
 * Garante que cada peça caiba completamente na chapa com suas medidas exatas
 * @param {number} larguraPeca - Largura da peça em cm
 * @param {number} alturaPeca - Altura da peça em cm
 * @param {number} larguraChapa - Largura da chapa em cm
 * @param {number} alturaChapa - Altura da chapa em cm
 * @returns {number} Número máximo de peças que cabem na chapa (inteiras, sem corte)
 */
const calcularPecasPorChapaOtimizado = (larguraPeca, alturaPeca, larguraChapa, alturaChapa) => {
  // Garantir que todos os valores sejam números válidos
  const lp = Number(larguraPeca) || 0;
  const ap = Number(alturaPeca) || 0;
  const lc = Number(larguraChapa) || 0;
  const ac = Number(alturaChapa) || 0;
  
  if (lp <= 0 || ap <= 0 || lc <= 0 || ac <= 0) {
    console.log('⚠️ [calcularPecasPorChapaOtimizado] Valores inválidos:', { lp, ap, lc, ac });
    return 0;
  }

  // Verificar se a peça cabe na chapa (considerando rotação)
  const pecaCabeNormal = lp <= lc && ap <= ac;
  const pecaCabeRotacionada = lp <= ac && ap <= lc;
  
  if (!pecaCabeNormal && !pecaCabeRotacionada) {
    console.log('⚠️ [calcularPecasPorChapaOtimizado] Peça não cabe na chapa:', {
      peca: `${lp}x${ap}`,
      chapa: `${lc}x${ac}`,
      cabeNormal: pecaCabeNormal,
      cabeRotacionada: pecaCabeRotacionada
    });
    return 0;
  }

  let max = 0;

  // Testa todas as posições x,y e duas orientações para cada peça
  // Usa step de 1cm para garantir que não perde nenhuma combinação válida
  for (let xStep = 0; xStep <= lc; xStep += 1) {
    for (let yStep = 0; yStep <= ac; yStep += 1) {
      
      // Orientação normal (0°)
      const w1 = Math.floor((lc - xStep) / lp);
      const h1 = Math.floor((ac - yStep) / ap);
      max = Math.max(max, w1 * h1);

      // Orientação girada (90°)
      const w2 = Math.floor((lc - xStep) / ap);
      const h2 = Math.floor((ac - yStep) / lp);
      max = Math.max(max, w2 * h2);
    }
  }

  console.log('✅ [calcularPecasPorChapaOtimizado] Resultado:', {
    entrada: { peca: `${lp}x${ap}`, chapa: `${lc}x${ac}` },
    resultado: max
  });

  return max;
};


const OSItemForm = ({ 
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
  consumoMaterialModalTrigger,
  ordemServico,
  clienteSelecionado,
  vendedorAtual,
  onFinalizarOSDoConsumoMaterial,
  isSaving,
  dadosConsumoMaterialParaReabrir,
  reabrirConsumoMaterial,
}) => {
  const { toast } = useToast();
  
  // Função auxiliar para verificar se item tem origem "Consumo de Material"
  const verificarOrigemConsumoMaterial = useCallback((item) => {
    if (!item || item.tipo_item !== 'm2') return false;
    const temLarguraAlturaPeca = item.consumo_largura_peca && item.consumo_altura_peca;
    const temLarguraAlturaChapa = item.consumo_largura_chapa && item.consumo_altura_chapa;
    const temQuantidadeSolicitada = item.consumo_quantidade_solicitada;
    const temPecasPorChapa = item.consumo_pecas_por_chapa;
    const temChapasNecessarias = item.consumo_chapas_necessarias;
    return (temLarguraAlturaPeca || temLarguraAlturaChapa) && 
           (temQuantidadeSolicitada || temPecasPorChapa || temChapasNecessarias);
  }, []);
  
  const [currentServico, setCurrentServico] = useState(() => {
    // Garantir que o estado inicial sempre tenha tipo_item válido
    // IMPORTANTE: Se o item tem origem "Consumo de Material", NÃO preencher o formulário
    if (itemAtual && itemAtual.tipo_item === 'm2') {
      // Verificar inline se tem origem "Consumo de Material"
      const temLarguraAlturaPeca = itemAtual.consumo_largura_peca && itemAtual.consumo_altura_peca;
      const temLarguraAlturaChapa = itemAtual.consumo_largura_chapa && itemAtual.consumo_altura_chapa;
      const temQuantidadeSolicitada = itemAtual.consumo_quantidade_solicitada;
      const temPecasPorChapa = itemAtual.consumo_pecas_por_chapa;
      const temChapasNecessarias = itemAtual.consumo_chapas_necessarias;
      const temOrigemConsumo = (temLarguraAlturaPeca || temLarguraAlturaChapa) && 
                               (temQuantidadeSolicitada || temPecasPorChapa || temChapasNecessarias);
      
      if (temOrigemConsumo) {
        // Item tem origem "Consumo de Material", não preencher formulário principal
        return initialServicoM2State();
      }
      return itemAtual;
    }
    return initialServicoM2State();
  });
  const [produtoBaseInfo, setProdutoBaseInfo] = useState(null);
  const [isVariationsModalOpen, setIsVariationsModalOpen] = useState(false);
  const [isConsumoMaterialModalOpen, setIsConsumoMaterialModalOpen] = useState(false);
  const [isClonarConsumoModalOpen, setIsClonarConsumoModalOpen] = useState(false);
  const [produtoSelecionadoParaConsumo, setProdutoSelecionadoParaConsumo] = useState(null);
  const materialFoiEditadoRef = useRef(false);
  // Ref para rastrear se o currentServico foi restaurado manualmente após fechar o modal
  const currentServicoRestauradoRef = useRef(false);
  // Ref para rastrear se os campos foram limpos manualmente
  const camposConsumoLimposRef = useRef(false);

  const isDisabled = isOSFinalizada || viewOnly;

  const solicitarProdutos = useCallback(() => {
    if (typeof onRequestProdutos === 'function') {
      try {
        const resultado = onRequestProdutos();
        if (resultado && typeof resultado.then === 'function') {
          resultado.catch(error => {
            console.error('❌ [OSItemForm] Erro ao carregar produtos sob demanda:', error);
          });
        }
      } catch (error) {
        console.error('❌ [OSItemForm] Erro ao solicitar produtos:', error);
      }
    }
  }, [onRequestProdutos]);

  // Abrir modal quando o trigger mudar (quando o botão do header for clicado)
  // Usar ref para rastrear o último trigger processado
  const lastTriggerRef = useRef(0);
  const itemAtualRef = useRef(itemAtual);
  const isEditingRef = useRef(isEditing);
  
  // Atualizar refs quando os valores mudarem
  useEffect(() => {
    itemAtualRef.current = itemAtual;
    isEditingRef.current = isEditing;
  }, [itemAtual, isEditing]);

  useEffect(() => {
    if (isEditing && itemAtual?.produto_id && !produtosCarregados) {
      solicitarProdutos();
    }
  }, [isEditing, itemAtual?.produto_id, produtosCarregados, solicitarProdutos]);
  
  // Ref para rastrear quando o modal foi fechado após atualização
  const modalFechadoAposAtualizacaoRef = useRef(false);
  const lastModalCloseTimestampRef = useRef(0);
  
  useEffect(() => {
    // Só abrir se o trigger mudou e for maior que 0
    if (consumoMaterialModalTrigger > 0 && consumoMaterialModalTrigger !== lastTriggerRef.current) {
      const agora = Date.now();
      
      // Se o modal foi fechado após atualização recentemente (últimos 2 segundos), não reabrir
      // EXCETO se for uma ação explícita do usuário (isEditing=true indica que o usuário clicou em Editar)
      const isAcaoExplicitaUsuario = isEditingRef.current;
      if (modalFechadoAposAtualizacaoRef.current && (agora - lastModalCloseTimestampRef.current) < 2000 && !isAcaoExplicitaUsuario) {
        console.log('⏸️ [OSItemForm] Modal foi fechado após atualização recente - não reabrindo');
        lastTriggerRef.current = consumoMaterialModalTrigger; // Atualizar para não tentar novamente
        return;
      }
      
      // Se for ação explícita do usuário, resetar as flags de bloqueio
      if (isAcaoExplicitaUsuario) {
        modalFechadoAposAtualizacaoRef.current = false;
        console.log('✅ [OSItemForm] Ação explícita do usuário - resetando flags de bloqueio e abrindo modal');
      }
      
      lastTriggerRef.current = consumoMaterialModalTrigger;
      setIsConsumoMaterialModalOpen(true);
      // NÃO copiar itemAtual para currentServico quando abrir o modal de consumo
      // O modal de consumo deve abrir independentemente do estado de edição
      // Os dados serão carregados pelos useEffects específicos abaixo
      const currentIsEditing = isEditingRef.current;
      if (!currentIsEditing) {
        // Se não estiver editando, inicializar com estado vazio
        setCurrentServico(initialServicoM2State());
      }
      // Se estiver editando, manter o currentServico atual (não sobrescrever)
    }
  }, [consumoMaterialModalTrigger]); // Apenas monitorar o trigger
  
  // Monitorar quando o modal fecha para detectar se foi após atualização
  useEffect(() => {
    if (!isConsumoMaterialModalOpen && lastTriggerRef.current > 0) {
      // Modal foi fechado - verificar se foi após uma atualização bem-sucedida
      // Se o itemAtual ainda existe e tem origem "Consumo de Material", provavelmente foi uma atualização
      if (itemAtual && itemAtual.tipo_item === 'm2' && itemAtual.id_item_os) {
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
          lastModalCloseTimestampRef.current = Date.now();
          console.log('✅ [OSItemForm] Modal fechado após atualização - marcando para não reabrir imediatamente');
          
          // Resetar após 2 segundos para permitir reabrir em edições futuras
          setTimeout(() => {
            modalFechadoAposAtualizacaoRef.current = false;
          }, 2000);
        }
      }
    }
  }, [isConsumoMaterialModalOpen, itemAtual]);

  // Ref para rastrear se os dados já foram carregados quando o modal foi aberto
  const dadosConsumoCarregadosRef = useRef(false);
  
  // Carregar dados de consumo de material do item atual quando o modal abrir
  // Funciona tanto quando está editando quanto quando não está (para visualizar/editar consumo de material existente)
  useEffect(() => {
    // Resetar a flag quando o modal fechar
    if (!isConsumoMaterialModalOpen) {
      dadosConsumoCarregadosRef.current = false;
      camposConsumoLimposRef.current = false; // Resetar a flag de limpeza manual
      return;
    }
    
    // Não carregar dados se os campos foram limpos manualmente
    if (camposConsumoLimposRef.current) {
      return;
    }
    
    // Só carregar os dados uma vez quando o modal abrir, não toda vez que itemAtual mudar
    if (isConsumoMaterialModalOpen && !dadosConsumoCarregadosRef.current) {
      // Tentar buscar o item da ordemServico.itens primeiro (dados mais atualizados)
      // Se não encontrar, usar itemAtual como fallback
      let itemParaCarregar = null;
      
      if (itemAtual && itemAtual.id_item_os && ordemServico && Array.isArray(ordemServico.itens)) {
        // Buscar o item atualizado na OS usando id_item_os
        const itemAtualizadoNaOS = ordemServico.itens.find(i => i.id_item_os === itemAtual.id_item_os);
        if (itemAtualizadoNaOS && itemAtualizadoNaOS.tipo_item === 'm2') {
          itemParaCarregar = itemAtualizadoNaOS;
          console.log('🔄 [OSItemForm] Usando item atualizado da OS:', itemParaCarregar);
        }
      }
      
      // Se não encontrou na OS, usar itemAtual como fallback
      if (!itemParaCarregar && itemAtual && itemAtual.tipo_item === 'm2') {
        itemParaCarregar = itemAtual;
        console.log('🔄 [OSItemForm] Usando itemAtual como fallback:', itemParaCarregar);
      }
      
      if (itemParaCarregar) {
        // Verificar se o item tem dados de consumo de material
        const temDadosConsumo = itemParaCarregar.consumo_material_utilizado || 
                                itemParaCarregar.consumo_largura_peca || 
                                itemParaCarregar.consumo_altura_peca ||
                                itemParaCarregar.consumo_largura_chapa ||
                                itemParaCarregar.consumo_altura_chapa;
        
        if (temDadosConsumo) {
          // Verificar se é item de origem "Consumo de Material"
          const temOrigemConsumoMaterial = itemParaCarregar.consumo_material_utilizado || 
                                          itemParaCarregar.consumo_largura_peca || 
                                          itemParaCarregar.consumo_altura_peca;
          
          console.log('🔄 [OSItemForm] Carregando dados de consumo de material:', {
            id_item_os: itemParaCarregar.id_item_os,
            temOrigemConsumoMaterial,
            largura_peca: itemParaCarregar.consumo_largura_peca,
            altura_peca: itemParaCarregar.consumo_altura_peca,
            largura_chapa: itemParaCarregar.consumo_largura_chapa,
            altura_chapa: itemParaCarregar.consumo_altura_chapa,
            valor_unitario_chapa: itemParaCarregar.consumo_valor_unitario_chapa,
            quantidade_solicitada: itemParaCarregar.consumo_quantidade_solicitada,
            detalhes: itemParaCarregar.detalhes,
            detalhes_tipo: typeof itemParaCarregar.detalhes,
            observacao_item: itemParaCarregar.observacao_item
          });
          
          // Função auxiliar para normalizar valores (já vêm em centímetros, apenas formatar)
          // IMPORTANTE: Os valores já vêm em centímetros do banco, não precisam ser convertidos
          const normalizarValor = (valor) => {
            if (valor === undefined || valor === null || valor === '') return null;
            const numValor = safeParseFloat(valor, 0);
            if (numValor <= 0) return null;
            // Valores já estão em centímetros, apenas retornar o número
            return numValor;
          };
          
          // Atualizar currentServico com os dados de consumo de material (sem afetar outros campos)
          // IMPORTANTE: Os valores já vêm em centímetros do banco, não precisam ser convertidos
          // IMPORTANTE: Detectar se os valores estão em metros ou centímetros
          // Valores muito grandes (> 100) provavelmente estão em centímetros (dados antigos ou erro)
          // Valores menores provavelmente estão em metros (dados novos normalizados)
          // Exemplo: 1.0 = 1 metro = 100cm, 0.1 = 0.1 metro = 10cm
          // Exemplo: 100 = 100cm (dados antigos), 10000 = erro/dupla conversão
          const normalizarValorComDetecao = (valor) => {
            const numValor = normalizarValor(valor);
            if (numValor === null) return null;
            // Se o valor é muito grande (> 10000), pode ser um erro de dupla conversão, então dividir por 100
            if (numValor > 10000) {
              // Provavelmente houve dupla conversão, dividir por 100 para corrigir
              return numValor / 100;
            } else if (numValor >= 10) {
              // Valores >= 10 provavelmente já estão em centímetros (dados antigos ou digitados pelo usuário)
              return numValor;
            } else {
              // Valores < 10 provavelmente estão em metros (dados do banco normalizados)
              // Converter para centímetros: 1.0 metro = 100 cm, 0.5 metro = 50 cm
              return numValor * 100;
            }
          };
          
          const larguraPecaCm = normalizarValorComDetecao(itemParaCarregar.consumo_largura_peca);
          const alturaPecaCm = normalizarValorComDetecao(itemParaCarregar.consumo_altura_peca);
          const larguraChapaCm = normalizarValorComDetecao(itemParaCarregar.consumo_largura_chapa);
          const alturaChapaCm = normalizarValorComDetecao(itemParaCarregar.consumo_altura_chapa);
          
          console.log('🔄 [OSItemForm] Carregando valores de consumo de material (convertendo de metros para centímetros):', {
            temOrigemConsumoMaterial,
            largura_peca_banco: itemParaCarregar.consumo_largura_peca,
            largura_peca_banco_parsed: normalizarValor(itemParaCarregar.consumo_largura_peca),
            largura_peca_convertida_cm: larguraPecaCm,
            altura_peca_banco: itemParaCarregar.consumo_altura_peca,
            altura_peca_banco_parsed: normalizarValor(itemParaCarregar.consumo_altura_peca),
            altura_peca_convertida_cm: alturaPecaCm,
            largura_chapa_banco: itemParaCarregar.consumo_largura_chapa,
            largura_chapa_banco_parsed: normalizarValor(itemParaCarregar.consumo_largura_chapa),
            largura_chapa_convertida_cm: larguraChapaCm,
            altura_chapa_banco: itemParaCarregar.consumo_altura_chapa,
            altura_chapa_banco_parsed: normalizarValor(itemParaCarregar.consumo_altura_chapa),
            altura_chapa_convertida_cm: alturaChapaCm,
            observacao: 'Valores do banco são normalizados: < 10 = metros (×100), >= 10 = centímetros (mantém)'
          });
          
          // IMPORTANTE: Preservar os acabamentos_selecionados do item ao carregar no modal
          // Prioridade: itemParaCarregar > prev > []
          let acabamentosPreservados = [];
          if (Array.isArray(itemParaCarregar.acabamentos_selecionados) && itemParaCarregar.acabamentos_selecionados.length > 0) {
            acabamentosPreservados = itemParaCarregar.acabamentos_selecionados;
          } else if (Array.isArray(itemParaCarregar.acabamentos) && itemParaCarregar.acabamentos.length > 0) {
            // Fallback: tentar usar acabamentos (formato antigo)
            acabamentosPreservados = itemParaCarregar.acabamentos;
          }
          
          console.log('🔄 [OSItemForm] Carregando acabamentos do item para o modal:', {
            item_id: itemParaCarregar.id_item_os,
            acabamentos_selecionados_do_item: itemParaCarregar.acabamentos_selecionados,
            acabamentos_do_item: itemParaCarregar.acabamentos,
            acabamentos_preservados: acabamentosPreservados,
            quantidade: acabamentosPreservados.length
          });
          
          // Normalizar quantidade solicitada: garantir que seja um número inteiro válido
          let quantidadeSolicitadaNormalizada = '';
          if (itemParaCarregar.consumo_quantidade_solicitada !== undefined && itemParaCarregar.consumo_quantidade_solicitada !== null && itemParaCarregar.consumo_quantidade_solicitada !== '') {
            const qtdValor = itemParaCarregar.consumo_quantidade_solicitada;
            // Converter para número e depois para string para remover zeros à esquerda e garantir formato limpo
            const qtdNum = parseInt(String(qtdValor).replace(/[^0-9]/g, ''), 10);
            if (!isNaN(qtdNum) && qtdNum > 0) {
              // Só adicionar se for maior que 0 (não adicionar zeros vazios)
              quantidadeSolicitadaNormalizada = String(qtdNum);
            } else if (qtdNum === 0) {
              // Se for 0, manter vazio para não confundir o usuário
              quantidadeSolicitadaNormalizada = '';
            }
          }
          
          setCurrentServico(prev => ({
            ...prev,
            consumo_material_utilizado: itemParaCarregar.consumo_material_utilizado || prev.consumo_material_utilizado || '',
            consumo_quantidade_solicitada: quantidadeSolicitadaNormalizada || '',
            consumo_largura_peca: larguraPecaCm !== null 
              ? formatToDisplay(larguraPecaCm, 2) 
              : (prev.consumo_largura_peca || ''),
            consumo_altura_peca: alturaPecaCm !== null 
              ? formatToDisplay(alturaPecaCm, 2) 
              : (prev.consumo_altura_peca || ''),
            consumo_largura_chapa: larguraChapaCm !== null 
              ? formatToDisplay(larguraChapaCm, 2) 
              : (prev.consumo_largura_chapa || ''),
            consumo_altura_chapa: alturaChapaCm !== null 
              ? formatToDisplay(alturaChapaCm, 2) 
              : (prev.consumo_altura_chapa || ''),
            consumo_valor_unitario_chapa: itemParaCarregar.consumo_valor_unitario_chapa !== undefined && itemParaCarregar.consumo_valor_unitario_chapa !== null 
              ? String(itemParaCarregar.consumo_valor_unitario_chapa).replace('.', ',') 
              : (prev.consumo_valor_unitario_chapa || ''),
            // IMPORTANTE: Preservar os acabamentos_selecionados do item
            // Se o item tem acabamentos, usar eles; caso contrário, manter os do prev se existirem
            acabamentos_selecionados: acabamentosPreservados.length > 0 
              ? acabamentosPreservados 
              : (Array.isArray(prev.acabamentos_selecionados) && prev.acabamentos_selecionados.length > 0
                ? prev.acabamentos_selecionados
                : []),
            // Carregar observação do item (pode estar em detalhes como string, objeto, array ou observacao_item)
            detalhes: (() => {
              console.log('🔍 [OSItemForm] Carregando detalhes do item:', {
                detalhes_raw: itemParaCarregar.detalhes,
                detalhes_tipo: typeof itemParaCarregar.detalhes,
                detalhes_isArray: Array.isArray(itemParaCarregar.detalhes),
                observacao_item: itemParaCarregar.observacao_item,
                prev_detalhes: prev.detalhes
              });
              
              // Se detalhes é um array, pegar o primeiro elemento
              if (Array.isArray(itemParaCarregar.detalhes) && itemParaCarregar.detalhes.length > 0) {
                const primeiroElemento = itemParaCarregar.detalhes[0];
                // Se o primeiro elemento é uma string, usar ela
                if (typeof primeiroElemento === 'string' && primeiroElemento.trim()) {
                  console.log('✅ [OSItemForm] Detalhes é array, usando primeiro elemento:', primeiroElemento);
                  return primeiroElemento;
                }
                // Se o primeiro elemento é um objeto, tentar extrair observacao_item
                if (typeof primeiroElemento === 'object') {
                  const resultado = primeiroElemento.observacao_item || primeiroElemento.detalhes || '';
                  console.log('✅ [OSItemForm] Detalhes é array de objetos, extraindo:', resultado);
                  return resultado;
                }
              }
              
              // Se detalhes é um objeto (não array), extrair observacao_item
              if (itemParaCarregar.detalhes && typeof itemParaCarregar.detalhes === 'object' && !Array.isArray(itemParaCarregar.detalhes)) {
                const resultado = itemParaCarregar.detalhes.observacao_item || itemParaCarregar.detalhes.detalhes || '';
                console.log('✅ [OSItemForm] Detalhes é objeto, extraindo:', resultado);
                return resultado;
              }
              
              // Se detalhes é uma string, usar diretamente
              if (typeof itemParaCarregar.detalhes === 'string' && itemParaCarregar.detalhes.trim()) {
                console.log('✅ [OSItemForm] Detalhes é string:', itemParaCarregar.detalhes);
                return itemParaCarregar.detalhes;
              }
              
              // Fallback para observacao_item ou string vazia
              const fallback = itemParaCarregar.observacao_item || prev.detalhes || '';
              console.log('✅ [OSItemForm] Usando fallback:', fallback);
              return fallback;
            })(),
          }));
          
          // Marcar que os dados foram carregados
          dadosConsumoCarregadosRef.current = true;
        }
      }
    }
  }, [isConsumoMaterialModalOpen, itemAtual, ordemServico]);

  // Preencher dados quando o modal for aberto com dados para reabrir
  useEffect(() => {
    if (isConsumoMaterialModalOpen && reabrirConsumoMaterial && dadosConsumoMaterialParaReabrir) {
      const dados = dadosConsumoMaterialParaReabrir;
      
      // Preencher campos individualmente
      if (dados.material_utilizado) {
        onItemChange('consumo_material_utilizado', dados.material_utilizado);
      }
      if (dados.quantidade_solicitada !== undefined && dados.quantidade_solicitada !== null) {
        onItemChange('consumo_quantidade_solicitada', String(dados.quantidade_solicitada));
      }
      if (dados.largura_peca !== undefined && dados.largura_peca !== null) {
        onItemChange('consumo_largura_peca', String(dados.largura_peca));
      }
      if (dados.altura_peca !== undefined && dados.altura_peca !== null) {
        onItemChange('consumo_altura_peca', String(dados.altura_peca));
      }
      if (dados.largura_chapa !== undefined && dados.largura_chapa !== null) {
        onItemChange('consumo_largura_chapa', String(dados.largura_chapa));
      }
      if (dados.altura_chapa !== undefined && dados.altura_chapa !== null) {
        onItemChange('consumo_altura_chapa', String(dados.altura_chapa));
      }
      if (dados.valor_unitario_chapa !== undefined && dados.valor_unitario_chapa !== null) {
        onItemChange('consumo_valor_unitario_chapa', String(dados.valor_unitario_chapa));
      }
      if (Array.isArray(dados.acabamentos_selecionados)) {
        onItemChange('acabamentos_selecionados', dados.acabamentos_selecionados);
      }
      if (dados.subtotal_acabamentos !== undefined && dados.subtotal_acabamentos !== null) {
        onItemChange('subtotal_acabamentos', dados.subtotal_acabamentos);
      }
    }
  }, [isConsumoMaterialModalOpen, reabrirConsumoMaterial, dadosConsumoMaterialParaReabrir, onItemChange]);

  useEffect(() => {
    // Não atualizar currentServico se o modal de consumo de material estiver aberto
    // para evitar que as alterações do modal afetem o formulário principal
    if (isConsumoMaterialModalOpen) {
      return;
    }
    
    // Se o currentServico foi restaurado manualmente, não atualizar automaticamente
    if (currentServicoRestauradoRef.current) {
      currentServicoRestauradoRef.current = false;
      return;
    }
    
    // IMPORTANTE: Se o item tem origem "Consumo de Material", NÃO preencher o formulário principal
    // Um item tem origem "Consumo de Material" se tiver os campos ESPECÍFICOS de consumo preenchidos
    // Não basta ter apenas consumo_material_utilizado (que pode ser preenchido com o nome do produto)
    if (itemAtual && itemAtual.tipo_item === 'm2' && itemAtual.id_item_os) {
      const temOrigemConsumoMaterial = verificarOrigemConsumoMaterial(itemAtual);
      
      // Se tem origem "Consumo de Material", NUNCA preencher o formulário principal
      // O modal de consumo será aberto automaticamente pelo OSItemTabsSection
      if (temOrigemConsumoMaterial) {
        console.log('🔄 [OSItemForm] Item tem origem "Consumo de Material" - NÃO preenchendo formulário principal');
        // Manter o formulário vazio sempre que o item tiver origem "Consumo de Material"
        if (currentServico && currentServico.id_item_os === itemAtual.id_item_os) {
          // Se já está preenchido com este item, limpar
          setCurrentServico(initialServicoM2State());
        } else if (!currentServico || !currentServico.id_item_os) {
          // Garantir que o formulário está vazio
          setCurrentServico(initialServicoM2State());
        }
        return; // IMPORTANTE: Retornar aqui para não executar o código abaixo que preenche o formulário
      }
    }
    
    // Só preencher o formulário se o item NÃO tem origem "Consumo de Material"
    if (itemAtual && itemAtual.tipo_item === 'm2') {
      // Formatar valor_unitario_m2 se necessário
      let formattedItem = { ...itemAtual };
      if (itemAtual.valor_unitario_m2) {
        const valorStr = String(itemAtual.valor_unitario_m2);
        const hasManyDecimals = (valorStr.includes(',') && valorStr.split(',')[1] && valorStr.split(',')[1].length > 2) ||
                               (valorStr.includes('.') && valorStr.split('.')[1] && valorStr.split('.')[1].length > 2);
        
        if (hasManyDecimals) {
          const numericValue = safeParseFloat(itemAtual.valor_unitario_m2);
          if (!isNaN(numericValue)) {
            formattedItem.valor_unitario_m2 = formatToDisplay(numericValue, 2);
          }
        }
      }
      
      setCurrentServico(formattedItem);
      
      if (itemAtual.produto_id && Array.isArray(produtosCadastrados)) {
        const base = produtosCadastrados.find(p => p.id === itemAtual.produto_id);
        setProdutoBaseInfo(base || null);
      } else {
        setProdutoBaseInfo(null);
      }
    } else if (!isEditing) {
      // Garantir que sempre tenhamos um estado válido com tipo_item
      const initialState = initialServicoM2State();
      setCurrentServico(itemAtual ? { ...initialState, ...itemAtual } : initialState); 
      setProdutoBaseInfo(null);
    }
    
    // Validação adicional de segurança
    if (currentServico && !currentServico.tipo_item) {
      console.warn('⚠️ currentServico sem tipo_item detectado, resetando para estado inicial');
      setCurrentServico(initialServicoM2State());
    }
  }, [itemAtual, isEditing, produtosCadastrados, isConsumoMaterialModalOpen, verificarOrigemConsumoMaterial]);

  // Corrigir valores com muitas casas decimais
  useEffect(() => {
    if (currentServico && currentServico.valor_unitario_m2) {
      const valorStr = String(currentServico.valor_unitario_m2);
      
      // Verificar se o valor tem mais de 2 casas decimais
      const hasManyDecimals = valorStr.includes(',') && valorStr.split(',')[1] && valorStr.split(',')[1].length > 2;
      const hasManyDecimalsDot = valorStr.includes('.') && valorStr.split('.')[1] && valorStr.split('.')[1].length > 2;
      
      if (hasManyDecimals || hasManyDecimalsDot) {
        const numericValue = safeParseFloat(currentServico.valor_unitario_m2);
        if (!isNaN(numericValue)) {
          const formattedValue = formatToDisplay(numericValue, 2);
          if (formattedValue !== currentServico.valor_unitario_m2) {
            onItemChange('valor_unitario_m2', formattedValue);
          }
        }
      }
    }
  }, [currentServico?.valor_unitario_m2, onItemChange]);

  useEffect(() => {
    if (!itemAtual || itemAtual.tipo_item !== 'm2') {
      materialFoiEditadoRef.current = false;
      return;
    }

    const autoDescricao = buildMaterialDescricao(
      itemAtual.nome_servico_produto,
      itemAtual.largura,
      itemAtual.altura
    );
    const valorAtual = (itemAtual.consumo_material_utilizado ?? '').toString().trim();
    const nomeAtual = (itemAtual.nome_servico_produto ?? '').toString().trim();

    if (!valorAtual || valorAtual === autoDescricao.trim() || valorAtual === nomeAtual) {
      materialFoiEditadoRef.current = false;
    } else {
      materialFoiEditadoRef.current = true;
    }
  }, [itemAtual]);
  
  const calcularArea = useCallback(() => {
    if (!currentServico) return 0;
    const alturaM = safeParseFloat(currentServico.altura);
    const larguraM = safeParseFloat(currentServico.largura);
    
    const area = alturaM * larguraM;
    const result = isNaN(area) ? 0 : area;
    return result;
  }, [currentServico]);

  useEffect(() => {
    if (!currentServico || currentServico.tipo_item !== 'm2') return;
    
    const areaMetros = calcularArea();
    const subtotalComAcabamentos = calcularSubtotalItem(currentServico, acabamentosConfig);
    
    if (currentServico.area_calculada_item !== areaMetros) {
      onItemChange('area_calculada_item', areaMetros);
    }
    if (currentServico.subtotal_item !== subtotalComAcabamentos) {
      onItemChange('subtotal_item', subtotalComAcabamentos);
    }

    // Calcular subtotal dos acabamentos usando SEMPRE o valor de venda (valor_m2/valor_un)
    // Isso garante consistência com o que será usado no formulário principal
    const { largura: larguraAcabamento, altura: alturaAcabamento } = obterDimensoesItemParaAcabamento(currentServico);
    const areaAcabamento = larguraAcabamento * alturaAcabamento;
    const perimetroAcabamento = (larguraAcabamento > 0 && alturaAcabamento > 0) ? 2 * (larguraAcabamento + alturaAcabamento) : 0;
    const quantidadeItem = parseInt(sanitizeIntegerInput(currentServico.quantidade || ''), 10) || 0;
    const quantidadeItemValida = quantidadeItem > 0 ? quantidadeItem : 1;
    const quantidadeSolicitada = parseInt(sanitizeIntegerInput(currentServico.consumo_quantidade_solicitada || ''), 10) || 0;
    // No modal de consumo de material, sempre usar quantidadeSolicitada se disponível, caso contrário usar quantidadeItem
    const multiplicadorQuantidade = quantidadeSolicitada > 0 ? quantidadeSolicitada : quantidadeItemValida;

    let subtotalApenasAcabamentos = 0;
    if (currentServico.acabamentos_selecionados && currentServico.acabamentos_selecionados.length > 0 && Array.isArray(acabamentosConfig)) {
        currentServico.acabamentos_selecionados.forEach(acabSelecionado => {
            const acabamentoDef = acabamentosConfig.find(a => a.id === acabSelecionado.id);
            if (acabamentoDef) {
                // SEMPRE usar valor de venda (valor_m2/valor_un) do acabamentoDef (config), nunca do acabSelecionado
                // O acabSelecionado pode ter valores desatualizados
                let valorAcabamento = 0;
                let quantidadeAcabamento = 0;

                if (acabamentoDef.tipo_aplicacao === 'area_total') {
                    // SEMPRE usar valor_m2 do config (acabamentoDef), nunca do selecionado
                    // O valor do config sempre tem prioridade pois pode ter sido atualizado
                    const valorM2Raw = acabamentoDef.valor_m2 || acabamentoDef.valor || '0';
                    valorAcabamento = safeParseFloat(valorM2Raw, 0);
                    quantidadeAcabamento = areaAcabamento; 
                } else if (acabamentoDef.tipo_aplicacao === 'perimetro' || acabamentoDef.tipo_aplicacao === 'metro_linear') {
                    valorAcabamento = safeParseFloat(acabamentoDef.valor_m2 || acabamentoDef.valor_un || acabamentoDef.valor || acabSelecionado.valor_m2 || 0, 0);
                    quantidadeAcabamento = perimetroAcabamento;
                } else if (acabamentoDef.tipo_aplicacao === 'unidade') {
                    valorAcabamento = safeParseFloat(acabamentoDef.valor_un || acabamentoDef.valor || acabSelecionado.valor_un || 0, 0);
                    quantidadeAcabamento = 1;
                }
                const calcAcab = quantidadeAcabamento * multiplicadorQuantidade * valorAcabamento;
                subtotalApenasAcabamentos += isNaN(calcAcab) ? 0 : calcAcab;
            }
        });
    }
    const finalSubtotalAcab = isNaN(subtotalApenasAcabamentos) ? 0 : parseFloat(subtotalApenasAcabamentos.toFixed(2));
    // Sempre atualizar o subtotal_acabamentos para garantir que use valor de venda
    if(currentServico.subtotal_acabamentos !== finalSubtotalAcab) {
        onItemChange('subtotal_acabamentos', finalSubtotalAcab);
    }

  }, [currentServico, onItemChange, calcularArea, acabamentosConfig]);

  // Calcular hash dos acabamentos para evitar recálculos desnecessários
  const acabamentosConfigHash = useMemo(() => {
    if (!Array.isArray(acabamentosConfig)) return null;
    return acabamentosConfig.map(a => `${a.id}-${a.valor_m2 || a.valor_un || 0}`).join('|');
  }, [acabamentosConfig]);
  
  const acabamentosSelecionadosHash = useMemo(() => {
    if (!Array.isArray(currentServico?.acabamentos_selecionados)) return null;
    return currentServico.acabamentos_selecionados.map(a => a.id).join(',');
  }, [currentServico?.acabamentos_selecionados]);

  const consumoCalculos = useMemo(() => {
    if (!currentServico) {
      return {
        larguraPeca: 0,
        alturaPeca: 0,
        larguraChapa: 0,
        alturaChapa: 0,
        quantidadeSolicitada: 0,
        valorChapa: 0,
        pecasPorChapa: 0,
        chapasNecessarias: 0,
        custoMaterialBase: 0,
        custoMaterialUtilizado: 0,
        custoAcabamentos: 0,
        custoTotal: 0,
        custoUnitario: 0,
        aproveitamentoPercentual: 0,
        possuiDadosSuficientes: false,
        metrosQuadradosUtilizados: 0,
        metrosQuadradosDisponiveis: 0,
        metrosQuadradosSobrando: 0,
      };
    }

    // IMPORTANTE: Os valores em currentServico já estão em CENTÍMETROS
    // Quando carregados do banco, são convertidos pela função normalizarValorComDetecao
    // Quando digitados pelo usuário, já estão em centímetros
    // Não fazer nenhuma conversão adicional aqui - tratar sempre como centímetros
    const larguraPecaCm = safeParseFloat(currentServico.consumo_largura_peca, 0);
    const alturaPecaCm = safeParseFloat(currentServico.consumo_altura_peca, 0);
    const larguraChapaCm = safeParseFloat(currentServico.consumo_largura_chapa, 0);
    const alturaChapaCm = safeParseFloat(currentServico.consumo_altura_chapa, 0);
    const quantidadeSolicitada = parseInt(sanitizeIntegerInput(currentServico.consumo_quantidade_solicitada || ''), 10) || 0;
    const valorChapa = safeParseFloat(currentServico.consumo_valor_unitario_chapa, 0);
    const quantidadeItem = parseInt(sanitizeIntegerInput(currentServico.quantidade || ''), 10) || 0;
    const quantidadeBase = quantidadeSolicitada > 0 ? quantidadeSolicitada : (quantidadeItem > 0 ? quantidadeItem : 0);

    // Verificar se há dados suficientes antes de calcular e logar
    const temDadosMinimos = larguraPecaCm > 0 || alturaPecaCm > 0 || larguraChapaCm > 0 || alturaChapaCm > 0 || quantidadeSolicitada > 0;
    
    // Se não há dados mínimos, retornar valores zerados sem fazer cálculos pesados
    if (!temDadosMinimos) {
      return {
        larguraPeca: larguraPecaCm,
        alturaPeca: alturaPecaCm,
        larguraChapa: larguraChapaCm,
        alturaChapa: alturaChapaCm,
        quantidadeSolicitada,
        valorChapa,
        pecasPorChapa: 0,
        chapasNecessarias: 0,
        custoMaterialBase: 0,
        custoMaterialUtilizado: 0,
        custoAcabamentos: 0,
        custoTotal: 0,
        custoUnitario: 0,
        aproveitamentoPercentual: 0,
        possuiDadosSuficientes: false,
        metrosQuadradosUtilizados: 0,
        metrosQuadradosDisponiveis: 0,
        metrosQuadradosSobrando: 0,
      };
    }

    // Só logar quando há dados para processar
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [consumoCalculos] Valores lidos do currentServico (já em centímetros):', {
      consumo_largura_peca: currentServico.consumo_largura_peca,
      consumo_altura_peca: currentServico.consumo_altura_peca,
      consumo_largura_chapa: currentServico.consumo_largura_chapa,
      consumo_altura_chapa: currentServico.consumo_altura_chapa,
      consumo_quantidade_solicitada: currentServico.consumo_quantidade_solicitada,
      consumo_valor_unitario_chapa: currentServico.consumo_valor_unitario_chapa,
      larguraPeca_cm: larguraPecaCm,
      alturaPeca_cm: alturaPecaCm,
      larguraChapa_cm: larguraChapaCm,
      alturaChapa_cm: alturaChapaCm,
      quantidadeSolicitada_parsed: quantidadeSolicitada,
      valorChapa_parsed: valorChapa
      });
    }

    // Usar algoritmo de empacotamento otimizado que considera rotação das peças
    // IMPORTANTE: Todos os valores devem estar em centímetros
    // IMPORTANTE: Os valores estão em CENTÍMETROS, sempre dividir por 100 para converter para metros
    // Exemplo: 1000 cm = 10 m, então (1000 / 100) = 10 m
    const areaPecaMetros = (larguraPecaCm / 100) * (alturaPecaCm / 100);
    const areaChapaMetros = (larguraChapaCm / 100) * (alturaChapaCm / 100);
    
    // Calcula quantas peças cabem na chapa baseado nas dimensões (largura × altura)
    const pecasPorChapa = calcularPecasPorChapaOtimizado(larguraPecaCm, alturaPecaCm, larguraChapaCm, alturaChapaCm);
    // Chapas necessárias = quantidade solicitada / peças por chapa (arredondado para cima)
    const chapasNecessarias = pecasPorChapa > 0 ? Math.ceil(quantidadeSolicitada / pecasPorChapa) : 0;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📦 [consumoCalculos] Cálculo de chapas necessárias:', {
      larguraPeca_cm: larguraPecaCm,
      alturaPeca_cm: alturaPecaCm,
      larguraChapa_cm: larguraChapaCm,
      alturaChapa_cm: alturaChapaCm,
      areaChapaMetros,
      pecasPorChapa,
      quantidadeSolicitada,
      chapasNecessarias,
      calculo: `${quantidadeSolicitada} peças solicitadas / ${pecasPorChapa} peças por chapa = ${chapasNecessarias} chapa(s) necessária(s)`,
      observacao: 'Peças por chapa é calculado baseado nas dimensões da peça e da chapa (algoritmo de empacotamento)'
      });
      
      console.log('🔍 [consumoCalculos] Valores calculados:', {
        pecasPorChapa,
        chapasNecessarias,
        quantidadeSolicitada,
        quantidadeBase,
        entrada_calcularPecasPorChapaOtimizado: {
          larguraPeca_cm: larguraPecaCm,
          alturaPeca_cm: alturaPecaCm,
          larguraChapa_cm: larguraChapaCm,
          alturaChapa_cm: alturaChapaCm,
          observacao: 'Valores já estão em centímetros (convertidos ao carregar do banco ou digitados pelo usuário)'
        }
      });
      
      console.log('📐 [consumoCalculos] Conversão de dimensões (cm → m²):', {
      larguraPeca_cm: larguraPecaCm,
      alturaPeca_cm: alturaPecaCm,
      larguraChapa_cm: larguraChapaCm,
      alturaChapa_cm: alturaChapaCm,
      areaPecaMetros,
      areaChapaMetros,
      calculo_areaPeca: `(${larguraPecaCm} cm / 100) × (${alturaPecaCm} cm / 100) = ${(larguraPecaCm / 100)} m × ${(alturaPecaCm / 100)} m = ${areaPecaMetros} m²`,
      calculo_areaChapa: `(${larguraChapaCm} cm / 100) × (${alturaChapaCm} cm / 100) = ${(larguraChapaCm / 100)} m × ${(alturaChapaCm / 100)} m = ${areaChapaMetros} m²`
      });
    }
    // Área total das peças solicitadas (área da peça × quantidade)
    const areaTotalSolicitada = quantidadeBase > 0 ? areaPecaMetros * quantidadeBase : 0;
    // Área máxima disponível nas chapas (área da chapa × número de chapas)
    const areaMaximaDisponivel = areaChapaMetros * chapasNecessarias;
    // m² utilizados = área total das peças solicitadas (não o mínimo!)
    const metrosUtilizados = areaTotalSolicitada;
    
    // Custo de material comprado = área da chapa × valor por m² × número de chapas necessárias
    // Exemplo: 0,500 m² × 200 R$/m² × 1 chapa = 100 R$
    const custoMaterialBase = areaChapaMetros > 0 && chapasNecessarias > 0 && valorChapa > 0
      ? areaChapaMetros * valorChapa * chapasNecessarias
      : 0;
    // Custo de material efetivamente utilizado = m² utilizados × valor por m²
    // Exemplo: 0,090 m² × 28 R$/m² = 2,52 R$
    const custoMaterialUtilizado = metrosUtilizados > 0 && valorChapa > 0
      ? metrosUtilizados * valorChapa
      : 0;
    
    // Calcular custo dos acabamentos usando a área total das peças (metrosUtilizados)
    // Os acabamentos são aplicados sobre a área total das peças, não sobre a área da chapa
    const custoAcabamentos = calcularCustoAcabamentosSelecionados(
      currentServico, 
      Array.isArray(acabamentosConfig) ? acabamentosConfig : [],
      metrosUtilizados // Passar a área total das peças para o cálculo
    );
    // O custo total inclui o custo do material + custo dos acabamentos
    const custoTotalBruto = custoMaterialBase + custoAcabamentos;
    const custoTotal = isNaN(custoTotalBruto) ? 0 : custoTotalBruto;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('💰 [consumoCalculos] Cálculo do custo total:', {
      areaChapaMetros,
      valorChapa,
      chapasNecessarias,
      custoMaterialBase,
      custoAcabamentos,
      custoTotalBruto,
      custoTotal,
      calculo: `${areaChapaMetros} m² × ${valorChapa} R$/m² × ${chapasNecessarias} chapa(s) = ${custoMaterialBase} R$`,
      acabamentosSelecionados: Array.isArray(currentServico?.acabamentos_selecionados) ? currentServico.acabamentos_selecionados.length : 0
      });
    }

    // Custo unitário por peça = Custo total do material / (peças por chapa × número de chapas)
    // Exemplo: 100 R$ / (50 peças × 1 chapa) = 2 R$/peça
    const totalPecas = pecasPorChapa > 0 && chapasNecessarias > 0 ? pecasPorChapa * chapasNecessarias : 0;
    const custoUnitarioBruto = totalPecas > 0 ? (custoTotal / totalPecas) : 0;
    const custoUnitario = isNaN(custoUnitarioBruto) ? 0 : custoUnitarioBruto;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('💰 [consumoCalculos] Cálculo do custo unitário:', {
      pecasPorChapa,
      chapasNecessarias,
      totalPecas,
      custoTotal,
      custoUnitario,
      calculo: `${custoTotal} R$ / (${pecasPorChapa} peças × ${chapasNecessarias} chapa(s)) = ${custoUnitario} R$/peça`
      });
    }
    const aproveitamentoPercentual = (pecasPorChapa > 0 && chapasNecessarias > 0)
      ? Math.min((quantidadeSolicitada / (chapasNecessarias * pecasPorChapa)) * 100, 100)
      : 0;

    const possuiDadosSuficientes = larguraPecaCm > 0 && alturaPecaCm > 0 && larguraChapaCm > 0 && alturaChapaCm > 0 && quantidadeSolicitada > 0;

    // m² necessários = área da peça × quantidade solicitada (apenas para visualização do cliente)
    // Exemplo: peça de 10 cm × 10 cm = 0.01 m², quantidade 100 = 0.01 × 100 = 1.0 m² necessários
    const metrosQuadradosNecessarios = possuiDadosSuficientes && areaPecaMetros > 0 && quantidadeSolicitada > 0
      ? parseFloat((areaPecaMetros * quantidadeSolicitada).toFixed(3))
      : 0;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [consumoCalculos] m² necessários (área da peça × quantidade - apenas visualização):', {
      larguraPeca_cm: larguraPecaCm,
      alturaPeca_cm: alturaPecaCm,
      areaPecaMetros,
      quantidadeSolicitada,
      metrosQuadradosNecessarios,
      calculo: `${areaPecaMetros} m² (área da peça) × ${quantidadeSolicitada} (quantidade) = ${metrosQuadradosNecessarios} m²`,
      observacao: 'Este valor é a área total das peças solicitadas, apenas para visualização do cliente'
      });
    }
    // m² disponíveis = área total das chapas necessárias (mesmo que m² necessários)
    const metrosQuadradosDisponiveis = areaMaximaDisponivel;
    // m² utilizados = área efetivamente utilizada pelas peças (área da peça × quantidade)
    const metrosQuadradosUtilizados = possuiDadosSuficientes ? parseFloat(metrosUtilizados.toFixed(3)) : 0;
    
    // m² que sobram = área disponível - área utilizada pelas peças
    const metrosQuadradosSobrando = parseFloat(Math.max(metrosQuadradosDisponiveis - metrosQuadradosUtilizados, 0).toFixed(3));
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [consumoCalculos] Cálculo de m²:', {
      areaChapaMetros,
      chapasNecessarias,
      areaMaximaDisponivel: metrosQuadradosDisponiveis,
      areaTotalSolicitada,
      metrosUtilizados,
      metrosQuadradosNecessarios,
      metrosQuadradosDisponiveis,
      metrosQuadradosUtilizados,
      metrosQuadradosSobrando,
      calculo_sobrando: `${metrosQuadradosDisponiveis} m² disponíveis - ${metrosQuadradosUtilizados} m² utilizados = ${metrosQuadradosSobrando} m² que sobram`
      });
    }

    const resultado = {
      larguraPeca: larguraPecaCm,
      alturaPeca: alturaPecaCm,
      larguraChapa: larguraChapaCm,
      alturaChapa: alturaChapaCm,
      quantidadeSolicitada,
      valorChapa,
      pecasPorChapa,
      chapasNecessarias,
      custoMaterialBase,
      custoMaterialUtilizado,
      custoAcabamentos,
      custoTotal,
      custoUnitario,
      aproveitamentoPercentual,
      possuiDadosSuficientes,
      metrosQuadradosNecessarios,
      metrosQuadradosUtilizados,
      metrosQuadradosDisponiveis,
      metrosQuadradosSobrando,
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [consumoCalculos] Resultado final:', {
        ...resultado,
        possuiDadosSuficientes,
        observacao: possuiDadosSuficientes ? 'Dados suficientes para calcular' : 'Faltam dados para calcular'
      });
    }

    return resultado;
  }, [
    currentServico?.consumo_largura_peca,
    currentServico?.consumo_altura_peca,
    currentServico?.consumo_quantidade_solicitada,
    currentServico?.consumo_largura_chapa,
    currentServico?.consumo_altura_chapa,
    currentServico?.consumo_valor_unitario_chapa,
    acabamentosSelecionadosHash, // Hash dos acabamentos selecionados
    currentServico?.largura,
    currentServico?.altura,
    currentServico?.quantidade,
    acabamentosConfigHash, // Hash da configuração de acabamentos
  ]);

  const {
    pecasPorChapa,
    chapasNecessarias,
    custoMaterialBase,
    custoMaterialUtilizado,
    custoAcabamentos,
    custoTotal,
    custoUnitario,
    aproveitamentoPercentual,
    possuiDadosSuficientes,
    metrosQuadradosNecessarios,
    metrosQuadradosUtilizados,
    metrosQuadradosDisponiveis,
    metrosQuadradosSobrando,
  } = consumoCalculos;

  const valoresCalculadosRef = useRef({ pecasPorChapa: null, chapasNecessarias: null, custoTotal: null });
  
  useEffect(() => {
    if (!currentServico) return;

    // Verificar se os valores realmente mudaram para evitar atualizações desnecessárias
    const valoresAtuais = { pecasPorChapa, chapasNecessarias, custoTotal };
    const valoresAnteriores = valoresCalculadosRef.current;
    
    const pecasMudaram = valoresAnteriores.pecasPorChapa !== pecasPorChapa;
    const chapasMudaram = valoresAnteriores.chapasNecessarias !== chapasNecessarias;
    const custoMudou = Math.abs((valoresAnteriores.custoTotal || 0) - custoTotal) > 0.009;
    
    // Se nada mudou, não fazer nada
    if (!pecasMudaram && !chapasMudaram && !custoMudou && valoresAnteriores.pecasPorChapa !== null) {
      return;
    }
    
    valoresCalculadosRef.current = valoresAtuais;

    // IMPORTANTE: Sempre atualizar os valores calculados quando mudarem
    // Isso garante que quando o item é carregado do banco, os valores sejam recalculados
    // e incluam os acabamentos se necessário
    if (pecasMudaram) {
      const currentPecas = safeParseFloat(currentServico.consumo_pecas_por_chapa, 0);
      if (Math.abs(currentPecas - pecasPorChapa) > 0.009) {
        onItemChange('consumo_pecas_por_chapa', pecasPorChapa);
      }
    }

    if (chapasMudaram) {
      const currentChapas = safeParseFloat(currentServico.consumo_chapas_necessarias, 0);
      if (Math.abs(currentChapas - chapasNecessarias) > 0.009) {
        onItemChange('consumo_chapas_necessarias', chapasNecessarias);
      }
    }

    // IMPORTANTE: Sempre atualizar o consumo_custo_total com o valor calculado quando mudar
    // Isso garante que os acabamentos sejam incluídos mesmo quando o item é carregado do banco
    // O custoTotal do consumoCalculos sempre inclui acabamentos
    if (custoMudou) {
      const currentCustoTotal = safeParseFloat(currentServico.consumo_custo_total, 0);
      const temConsumoMaterial = currentServico.consumo_material_utilizado || 
                                 currentServico.consumo_largura_peca || 
                                 currentServico.consumo_altura_peca;
      const temAcabamentos = Array.isArray(currentServico.acabamentos_selecionados) && 
                            currentServico.acabamentos_selecionados.length > 0;
      
      // IMPORTANTE: Se o item tem consumo de material e acabamentos, SEMPRE atualizar o consumo_custo_total
      // Isso garante que o valor no banco seja atualizado com os acabamentos incluídos
      const deveSempreAtualizar = temConsumoMaterial && temAcabamentos && possuiDadosSuficientes;
      const temDiferenca = Math.abs(currentCustoTotal - custoTotal) > 0.009;
      
      if (temDiferenca || deveSempreAtualizar) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [OSItemForm] Atualizando consumo_custo_total:', {
            valorAntigo: currentCustoTotal,
            valorNovo: custoTotal,
            diferenca: Math.abs(currentCustoTotal - custoTotal),
            temConsumoMaterial,
            temAcabamentos,
            possuiDadosSuficientes,
            sempreAtualizar: deveSempreAtualizar,
            temDiferenca,
            motivo: deveSempreAtualizar ? 'Item tem consumo de material e acabamentos - forçar atualização' : 'Diferença detectada'
          });
        }
        onItemChange('consumo_custo_total', parseFloat(custoTotal.toFixed(2)));
      }
    }

    const currentCustoUnitario = safeParseFloat(currentServico.consumo_custo_unitario, 0);
    if (Math.abs(currentCustoUnitario - custoUnitario) > 0.009) {
      onItemChange('consumo_custo_unitario', parseFloat(custoUnitario.toFixed(2)));
    }

    const currentAproveitamento = safeParseFloat(currentServico.consumo_aproveitamento_percentual, 0);
    if (Math.abs(currentAproveitamento - aproveitamentoPercentual) > 0.09) {
      onItemChange('consumo_aproveitamento_percentual', parseFloat(aproveitamentoPercentual.toFixed(2)));
    }
  }, [currentServico, pecasPorChapa, chapasNecessarias, custoTotal, custoUnitario, aproveitamentoPercentual, onItemChange]);

  const handleDimensionChange = (e) => {
    const { name, value } = e.target;
    if (!currentServico) return;
    
    let formattedValue = value;
    if (name === 'altura' || name === 'largura') {
      formattedValue = value.replace(/[^0-9.,]/g, '');
    }
    onItemChange(name, formattedValue);
  };
  
  const handleDimensionBlur = (e) => {
    const { name, value } = e.target;
    if (!currentServico) return;

    if (name === 'altura' || name === 'largura') {
        const numericValue = safeParseFloat(value);
        const formattedValue = numericValue.toFixed(2).replace('.', ',');
        onItemChange(name, formattedValue);
    }
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (!currentServico) return;

    if (name === 'valor_unitario_m2' && currentServico.valor_unitario_bloqueado) {
      return; 
    }

    if (name === 'quantidade') {
      const regex = /^\d*$/;
      if (regex.test(value)) {
        onItemChange(name, value);
      }
      return;
    }
    
    // Atualizar currentServico localmente para campos que precisam de atualização imediata no modal
    if (name === 'detalhes') {
      setCurrentServico(prev => ({ ...prev, [name]: value }));
    }
    
    onItemChange(name, value);
  };

  const validarEstoqueQuantidadeM2 = (quantidade) => {
    if (!currentServico?.produto_id || !Array.isArray(produtosCadastrados)) {
      return { valido: true };
    }

    const produtoSelecionado = produtosCadastrados.find(p => p.id === currentServico.produto_id);
    
    if (!produtoSelecionado || (produtoSelecionado.unidadeMedida !== 'm2' && produtoSelecionado.unidade_medida !== 'm2')) {
      return { valido: true };
    }

    const estoqueAtual = safeParseFloat(produtoSelecionado.estoque);
    const estoqueMinimo = safeParseFloat(produtoSelecionado.estoque_minimo);
    const quantidadeSolicitada = parseInt(quantidade, 10);
    const quantidadeBase = quantidadeSolicitada > 0 ? quantidadeSolicitada : 1;

    const { largura: larguraCalc, altura: alturaCalc } = obterDimensoesItemParaAcabamento(currentServico);
    const areaUnitaria = larguraCalc > 0 && alturaCalc > 0 ? larguraCalc * alturaCalc : 0;
    const areaNecessaria = areaUnitaria > 0 ? areaUnitaria * quantidadeBase : 0;

    const formatDecimal = (valor, casas = 3) => {
      const numero = parseFloat(valor);
      if (!Number.isFinite(numero)) return '0,000';
      return numero.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
    };

    const formatInteiro = (valor) => {
      const numero = Math.max(0, Math.floor(parseFloat(valor)) || 0);
      return numero.toLocaleString('pt-BR');
    };

    let quantidadeMaxima = null;

    if (areaUnitaria > 0) {
      const pecasTotais = estoqueAtual > 0 ? Math.floor(estoqueAtual / areaUnitaria) : 0;
      const pecasDisponiveisSeguras = Math.max(0, Math.floor(Math.max(estoqueAtual - estoqueMinimo, 0) / areaUnitaria));
      quantidadeMaxima = pecasDisponiveisSeguras;

      if (areaNecessaria > estoqueAtual + 1e-9) {
        return {
          valido: false,
          mensagem: `Estoque insuficiente! Disponível: ${formatInteiro(pecasTotais)} peça(s) (≈ ${formatDecimal(estoqueAtual)} m²). Solicitado: ${formatInteiro(quantidadeBase)} peça(s) (≈ ${formatDecimal(areaNecessaria)} m²).` ,
          quantidadeMaxima: pecasDisponiveisSeguras
        };
      }

      if (isEstoqueNoLimiteMinimo(produtoSelecionado)) {
        return {
          valido: false,
          mensagem: `O produto "${produtoSelecionado.nome}" está no limite mínimo (${formatDecimal(estoqueMinimo)} m²). Reponha o estoque antes de consumir novas peças.`,
          quantidadeMaxima: pecasDisponiveisSeguras
        };
      }

      if (!podeConsumirAreaEstoque(produtoSelecionado, areaNecessaria)) {
        return {
          valido: false,
          mensagem: `Consumir ${formatDecimal(areaNecessaria)} m² (${formatInteiro(quantidadeBase)} peça[s]) reduziria o estoque abaixo do mínimo (${formatDecimal(estoqueMinimo)} m²).`,
          quantidadeMaxima: pecasDisponiveisSeguras
        };
      }
    } else {
      // Sem dimensões válidas: fallback para validar pela quantidade direta (quando estoque é tratado em unidades)
      const estoqueDisponivelUn = Math.max(0, Math.floor(estoqueAtual));
      const estoqueSeguroUn = Math.max(0, Math.floor(estoqueAtual - estoqueMinimo));
      quantidadeMaxima = estoqueSeguroUn;

      if (quantidadeBase > estoqueDisponivelUn) {
        return {
          valido: false,
          mensagem: `Estoque insuficiente! Disponível: ${formatInteiro(estoqueDisponivelUn)} peça(s). Solicitado: ${formatInteiro(quantidadeBase)} peça(s).`,
          quantidadeMaxima: estoqueSeguroUn
        };
      }

      if (isEstoqueNoLimiteMinimo(produtoSelecionado)) {
        return {
          valido: false,
          mensagem: `O produto "${produtoSelecionado.nome}" está no limite mínimo de estoque (${formatInteiro(estoqueMinimo)} peça[s]). Reponha antes de consumir novas peças.`,
          quantidadeMaxima: estoqueSeguroUn
        };
      }

      if (!podeConsumirAreaEstoque(produtoSelecionado, quantidadeBase)) {
        return {
          valido: false,
          mensagem: `Consumir ${formatInteiro(quantidadeBase)} peça(s) levaria o estoque abaixo do mínimo (${formatInteiro(estoqueMinimo)}).`,
          quantidadeMaxima: estoqueSeguroUn
        };
      }
    }

    return { valido: true, quantidadeMaxima };
  };

  const handleQuantidadeBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'quantidade') {
      const intValue = parseInt(value, 10);
      if (value === '' || isNaN(intValue) || intValue <= 0) {
        onItemChange(name, '1');
      } else {
        // Validar estoque antes de atualizar a quantidade
        const validacaoEstoque = validarEstoqueQuantidadeM2(String(intValue));
        if (!validacaoEstoque.valido) {
          toast({
            title: "Estoque Insuficiente",
            description: validacaoEstoque.mensagem,
            variant: "destructive",
            duration: 8000
          });
          // Ajustar para o estoque máximo disponível
          if (currentServico?.produto_id && Array.isArray(produtosCadastrados)) {
            const produtoSelecionado = produtosCadastrados.find(p => p.id === currentServico.produto_id);
            if (produtoSelecionado && produtoSelecionado.unidadeMedida === 'm2') {
              const estoqueAtual = safeParseFloat(produtoSelecionado.estoque);
              const estoqueMinimo = safeParseFloat(produtoSelecionado.estoque_minimo);
              const { largura: larguraCalc, altura: alturaCalc } = obterDimensoesItemParaAcabamento(currentServico);
              const areaItem = larguraCalc > 0 && alturaCalc > 0 ? larguraCalc * alturaCalc : 0;
              let quantidadeMaxima = validacaoEstoque.quantidadeMaxima;
              if ((quantidadeMaxima === null || quantidadeMaxima === undefined) && areaItem > 0) {
                quantidadeMaxima = Math.max(0, Math.floor(Math.max(estoqueAtual - estoqueMinimo, 0) / areaItem));
              }
              if (quantidadeMaxima !== null && quantidadeMaxima !== undefined) {
                const quantidadeAjustada = Math.min(intValue, Math.max(0, quantidadeMaxima));
                onItemChange(name, quantidadeAjustada > 0 ? String(quantidadeAjustada) : '0');
              }
            }
          }
        } else {
          onItemChange(name, String(intValue));
        }
      }
    }
  };
  
  const handleValorUnitarioM2Change = (e) => {
    const { value } = e.target;
    // Permitir apenas números, vírgulas e pontos
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    onItemChange('valor_unitario_m2', cleanValue);
  };

  const handleValorUnitarioM2Blur = (e) => {
    const { value } = e.target;
    if (value && value.trim() !== '') {
      // Formatar apenas se houver um valor válido
      const numericValue = safeParseFloat(value);
      if (!isNaN(numericValue) && numericValue >= 0) {
        // Limitar a 2 casas decimais para valores monetários
        const formattedValue = formatToDisplay(numericValue, 2);
        onItemChange('valor_unitario_m2', formattedValue);
      }
    }
  };

  const handleConsumoDecimalChange = (field) => (e) => {
    if (!currentServico) return;
    const cleanValue = sanitizeDecimalInput(e.target.value);
    // Atualizar currentServico imediatamente para que os cálculos sejam atualizados
    setCurrentServico(prev => ({ ...prev, [field]: cleanValue }));
    onItemChange(field, cleanValue);
  };

  const handleConsumoDecimalBlur = (field) => (e) => {
    if (!currentServico) return;
    const rawValue = sanitizeDecimalInput(e.target.value);
    if (!rawValue) {
      setCurrentServico(prev => ({ ...prev, [field]: '' }));
      onItemChange(field, '');
      return;
    }
    const numericValue = safeParseFloat(rawValue);
    if (!isNaN(numericValue) && numericValue >= 0) {
      // Limitar a 2 casas decimais para evitar muitos zeros
      const formattedValue = formatToDisplay(numericValue, 2);
      setCurrentServico(prev => ({ ...prev, [field]: formattedValue }));
      onItemChange(field, formattedValue);
    } else {
      setCurrentServico(prev => ({ ...prev, [field]: '' }));
      onItemChange(field, '');
    }
  };

  const handleConsumoCurrencyBlur = (field) => (e) => {
    if (!currentServico) return;
    const rawValue = sanitizeDecimalInput(e.target.value);
    if (!rawValue) {
      setCurrentServico(prev => ({ ...prev, [field]: '' }));
      onItemChange(field, '');
      return;
    }
    const numericValue = safeParseFloat(rawValue);
    if (!isNaN(numericValue) && numericValue >= 0) {
      const formattedValue = formatToDisplay(numericValue, 2);
      setCurrentServico(prev => ({ ...prev, [field]: formattedValue }));
      onItemChange(field, formattedValue);
    } else {
      setCurrentServico(prev => ({ ...prev, [field]: '' }));
      onItemChange(field, '');
    }
  };

  const handleConsumoIntegerChange = (field) => (e) => {
    if (!currentServico) return;
    const cleanValue = sanitizeIntegerInput(e.target.value);
    // Atualizar currentServico imediatamente para que os cálculos sejam atualizados
    setCurrentServico(prev => ({ ...prev, [field]: cleanValue }));
    onItemChange(field, cleanValue);
  };

  const handleConsumoIntegerBlur = (field) => (e) => {
    if (!currentServico) return;
    const cleanValue = sanitizeIntegerInput(e.target.value);
    if (!cleanValue) {
      setCurrentServico(prev => ({ ...prev, [field]: '' }));
      onItemChange(field, '');
    } else {
      if (field === 'consumo_quantidade_solicitada') {
        const validacaoEstoque = validarEstoqueQuantidadeM2(cleanValue);
        if (!validacaoEstoque.valido) {
          toast({
            title: "Estoque Insuficiente",
            description: validacaoEstoque.mensagem,
            variant: "destructive",
            duration: 8000
          });
          const quantidadeMaxima = validacaoEstoque.quantidadeMaxima;
          if (quantidadeMaxima !== null && quantidadeMaxima !== undefined) {
            const quantidadeAjustada = Math.max(0, quantidadeMaxima);
            const valorFinal = quantidadeAjustada > 0 ? String(quantidadeAjustada) : '';
            setCurrentServico(prev => ({ ...prev, [field]: valorFinal }));
            onItemChange(field, valorFinal);
            return;
          }
        } else {
          setCurrentServico(prev => ({ ...prev, [field]: cleanValue }));
          onItemChange(field, cleanValue);
          return;
        }
      } else {
        setCurrentServico(prev => ({ ...prev, [field]: cleanValue }));
        onItemChange(field, cleanValue);
      }
    }
  };

  const autoMaterialDescricao = useMemo(() => (
    buildMaterialDescricao(
      currentServico?.nome_servico_produto,
      currentServico?.largura,
      currentServico?.altura
    )
  ), [currentServico?.nome_servico_produto, currentServico?.largura, currentServico?.altura]);

  const medidasExtraidasNome = useMemo(() => (
    extractMeasurementsFromName(currentServico?.nome_servico_produto)
  ), [currentServico?.nome_servico_produto]);

  const larguraMetrosNome = useMemo(() => {
    if (!medidasExtraidasNome) return null;
    return convertMeasurementToMeters(medidasExtraidasNome.widthRaw, medidasExtraidasNome.unit);
  }, [medidasExtraidasNome]);

  const alturaMetrosNome = useMemo(() => {
    if (!medidasExtraidasNome) return null;
    return convertMeasurementToMeters(medidasExtraidasNome.heightRaw, medidasExtraidasNome.unit);
  }, [medidasExtraidasNome]);

  const larguraMetrosProduto = useMemo(() => {
    if (!produtoBaseInfo) return null;
    const larguraCm = safeParseFloat(produtoBaseInfo.medida_chapa_largura_cm, 0);
    return larguraCm > 0 ? larguraCm / 100 : null;
  }, [produtoBaseInfo?.medida_chapa_largura_cm]);

  const alturaMetrosProduto = useMemo(() => {
    if (!produtoBaseInfo) return null;
    const alturaCm = safeParseFloat(produtoBaseInfo.medida_chapa_altura_cm, 0);
    return alturaCm > 0 ? alturaCm / 100 : null;
  }, [produtoBaseInfo?.medida_chapa_altura_cm]);

  const larguraMetrosReferencia = larguraMetrosProduto ?? larguraMetrosNome;
  const alturaMetrosReferencia = alturaMetrosProduto ?? alturaMetrosNome;

  const areaChapaMetros = useMemo(() => {
    if (larguraMetrosReferencia !== null && larguraMetrosReferencia > 0 && alturaMetrosReferencia !== null && alturaMetrosReferencia > 0) {
      return larguraMetrosReferencia * alturaMetrosReferencia;
    }
    return null;
  }, [larguraMetrosReferencia, alturaMetrosReferencia]);

  const consumoLarguraChapaValue = currentServico?.consumo_largura_chapa;
  const consumoAlturaChapaValue = currentServico?.consumo_altura_chapa;
  const consumoValorChapaValue = currentServico?.consumo_valor_unitario_chapa;
  const temServico = Boolean(currentServico);

  useEffect(() => {
    if (!temServico) return;
    if (larguraMetrosReferencia === null || alturaMetrosReferencia === null) return;

    const larguraMetros = larguraMetrosReferencia;
    const alturaMetros = alturaMetrosReferencia;

    if (larguraMetros !== null && larguraMetros > 0) {
      const consumoLarguraAtual = safeParseFloat(consumoLarguraChapaValue);
      if (!consumoLarguraChapaValue || consumoLarguraAtual <= 0) {
        const valorCm = larguraMetros * 100;
        const novoValor = formatToDisplay(valorCm, 2);
        if (novoValor !== consumoLarguraChapaValue) {
          onItemChange('consumo_largura_chapa', novoValor);
        }
      }
    }

    if (alturaMetros !== null && alturaMetros > 0) {
      const consumoAlturaAtual = safeParseFloat(consumoAlturaChapaValue);
      if (!consumoAlturaChapaValue || consumoAlturaAtual <= 0) {
        const valorCm = alturaMetros * 100;
        const novoValor = formatToDisplay(valorCm, 2);
        if (novoValor !== consumoAlturaChapaValue) {
          onItemChange('consumo_altura_chapa', novoValor);
        }
      }
    }
  }, [temServico, larguraMetrosReferencia, alturaMetrosReferencia, consumoLarguraChapaValue, consumoAlturaChapaValue, onItemChange]);

  useEffect(() => {
    if (!temServico) return;
    if (!produtoBaseInfo) return;

    const valorAtual = safeParseFloat(consumoValorChapaValue, 0);
    if (valorAtual > 0) {
      return;
    }

    const candidatosValor = [];
    const tipoPrecificacaoConsumo = (produtoBaseInfo.tipo_precificacao || '').toString().toLowerCase();
    const larguraReferenciaCmConsumo = safeParseFloat(currentServico?.consumo_largura_chapa || produtoBaseInfo.medida_chapa_largura_cm, 0);

    // Priorizar custo real de fornecedor para o consumo
    const precoCusto = safeParseFloat(produtoBaseInfo.preco_custo ?? produtoBaseInfo.precoCusto, 0);
    let precoCustoNormalizado = precoCusto;
    if (precoCusto > 0 && tipoPrecificacaoConsumo === 'metro_linear' && larguraReferenciaCmConsumo > 0) {
      // Converte custo por metro linear para custo por m² (R$/m²)
      precoCustoNormalizado = precoCusto / (larguraReferenciaCmConsumo / 100);
    }
    if (precoCustoNormalizado > 0) candidatosValor.push(precoCustoNormalizado);

    const valorChapaDireto = safeParseFloat(produtoBaseInfo.valor_chapa, 0);
    if (valorChapaDireto > 0) candidatosValor.push(valorChapaDireto);

    const precoChapa = safeParseFloat(produtoBaseInfo.preco_chapa, 0);
    if (precoChapa > 0) candidatosValor.push(precoChapa);

    const precoM2 = safeParseFloat(produtoBaseInfo.preco_m2 ?? produtoBaseInfo.precoM2, 0);
    if (precoM2 > 0) candidatosValor.push(precoM2);

    const precoMetroLinearConsumo = safeParseFloat(produtoBaseInfo.preco_metro_linear, 0);
    if (precoMetroLinearConsumo > 0) candidatosValor.push(precoMetroLinearConsumo);

    const precoVenda = safeParseFloat(produtoBaseInfo.preco_venda ?? produtoBaseInfo.precoVenda, 0);
    if (precoVenda > 0) candidatosValor.push(precoVenda);

    const precoUnitario = safeParseFloat(produtoBaseInfo.preco_unitario ?? produtoBaseInfo.precoUnitario, 0);
    if (precoUnitario > 0) candidatosValor.push(precoUnitario);

    const valorEncontrado = candidatosValor.find(valor => valor > 0);

    if (valorEncontrado !== undefined) {
      const valorFormatado = formatToDisplay(valorEncontrado, 2);
      if (valorFormatado !== consumoValorChapaValue) {
        onItemChange('consumo_valor_unitario_chapa', valorFormatado);
      }
    }
  }, [temServico, produtoBaseInfo, consumoValorChapaValue, areaChapaMetros, currentServico?.consumo_largura_chapa, onItemChange]);

  useEffect(() => {
    if (!currentServico) return;

    // Evita espelhar automaticamente o produto selecionado no campo de consumo.
    if (currentServico.produto_id) {
      return;
    }

    if (!autoMaterialDescricao) {
      if (!materialFoiEditadoRef.current && currentServico.consumo_material_utilizado) {
        onItemChange('consumo_material_utilizado', '');
      }
      return;
    }

    if (materialFoiEditadoRef.current) {
      return;
    }

    const valorAtual = currentServico.consumo_material_utilizado ?? '';
    if (valorAtual !== autoMaterialDescricao) {
      onItemChange('consumo_material_utilizado', autoMaterialDescricao);
    }
  }, [autoMaterialDescricao, currentServico, onItemChange]);

  const handleConsumoMaterialChange = (e) => {
    if (!currentServico) return;
    const novoValor = e.target.value ?? '';
    const autoDescricaoAtual = buildMaterialDescricao(
      currentServico.nome_servico_produto,
      currentServico.largura,
      currentServico.altura
    ).trim();
    const valorNormalizado = novoValor.toString();
    const valorTrim = valorNormalizado.trim();
    materialFoiEditadoRef.current = valorTrim.length > 0 && valorTrim !== autoDescricaoAtual;
    onItemChange('consumo_material_utilizado', valorNormalizado);
  };

  const handleConsumoMaterialInputChange = (e) => {
    // Handler específico para o ProductAutocompleteSimple no modal
    if (!currentServico) return;
    const novoValor = e.target.value ?? '';
    const valorNormalizado = novoValor.toString();
    materialFoiEditadoRef.current = true;
    setCurrentServico(prev => ({ ...prev, consumo_material_utilizado: valorNormalizado }));
    onItemChange('consumo_material_utilizado', valorNormalizado);
  };

  const handleProdutoSelecionado = (produto) => {
    if (produto) {
      materialFoiEditadoRef.current = false;
      setProdutoBaseInfo(produto);
      const unidadeProduto = (produto.unidade_medida || produto.unidadeMedida || produto.tipo_produto || '').toString().toLowerCase();
      const tipoPrecificacaoProduto = (produto.tipo_precificacao || '').toLowerCase();
      
      // Determinar se é produto M2 considerando tipo_precificacao E unidade_medida
      const produtoEhM2PorUnidade = ['m2', 'm²', 'metro', 'metro quadrado'].includes(unidadeProduto);
      const produtoEhM2PorPrecificacao = ['m2_cm2', 'm2_cm2_tabelado', 'metro_linear'].includes(tipoPrecificacaoProduto);
      const produtoEhM2 = produtoEhM2PorUnidade || produtoEhM2PorPrecificacao;
      const novoTipoItem = produtoEhM2 ? 'm2' : 'unidade';

      let novoValorProduto = '0,00';
      let valorBloqueado = false;
      let toastMessage = produtoEhM2
        ? `${produto.nome}. Informe as medidas (m) e o valor para este serviço.`
        : `${produto.nome}. Valor unitário carregado. Ajuste a quantidade, se necessário.`;
      let valorOrigem = produtoEhM2 ? "preço de venda" : "preço unitário";

      const precoM2 = safeParseFloat(produto.preco_m2);
      const precoVenda = safeParseFloat(produto.preco_venda);
      const precoMetroLinear = safeParseFloat(produto.preco_metro_linear);

      // Prioridade de preço baseada em tipo_precificacao:
      // 1. m2_cm2/m2_cm2_tabelado → preco_m2
      // 2. metro_linear → preco_metro_linear
      // 3. Fallback: preco_m2 > preco_metro_linear > preco_venda
      if ((tipoPrecificacaoProduto === 'm2_cm2' || tipoPrecificacaoProduto === 'm2_cm2_tabelado') && precoM2 > 0) {
        novoValorProduto = formatToDisplay(precoM2, 2);
        valorBloqueado = true;
        valorOrigem = "preço por m²";
        toastMessage = `${produto.nome}. Valor (R$ ${novoValorProduto}) originado do ${valorOrigem} carregado e bloqueado. Informe as medidas (m).`;
      } else if (tipoPrecificacaoProduto === 'metro_linear' && precoMetroLinear > 0) {
        novoValorProduto = formatToDisplay(precoMetroLinear, 2);
        valorBloqueado = true;
        valorOrigem = "preço por metro linear";
        toastMessage = `${produto.nome}. Valor (R$ ${novoValorProduto}/m) originado do ${valorOrigem}. Informe o comprimento (m).`;
      } else if (precoM2 > 0) {
        novoValorProduto = formatToDisplay(precoM2, 2);
        valorBloqueado = true;
        valorOrigem = "preço por m²";
        toastMessage = `${produto.nome}. Valor (R$ ${novoValorProduto}) originado do ${valorOrigem} carregado e bloqueado. Informe as medidas (m).`;
      } else if (precoMetroLinear > 0) {
        novoValorProduto = formatToDisplay(precoMetroLinear, 2);
        valorBloqueado = true;
        valorOrigem = "preço por metro linear";
        toastMessage = `${produto.nome}. Valor (R$ ${novoValorProduto}/m) originado do ${valorOrigem}. Informe o comprimento (m).`;
      } else if (precoVenda > 0) { 
         novoValorProduto = formatToDisplay(precoVenda, 2);
         valorBloqueado = true; 
         valorOrigem = produtoEhM2 ? "preço de venda (adaptado para m²)" : "preço unitário";
         toastMessage = produtoEhM2
          ? `${produto.nome} (vendido por ${produto.unidade_medida || produto.unidadeMedida}). Valor (R$ ${novoValorProduto} originado do ${valorOrigem}) carregado e bloqueado. Informe as medidas (m) para cálculo do serviço.`
          : `${produto.nome}. Valor unitário (R$ ${novoValorProduto}) carregado.`;
      }

      onItemChange('produto_id', produto.id);
      onItemChange('nome_servico_produto', produto.nome);
      onItemChange('imagem_url', produto.imagem_principal || '');
      onItemChange('valor_unitario_m2', novoValorProduto);
      onItemChange('valor_unitario', novoValorProduto);
      onItemChange('valor_unitario_bloqueado', valorBloqueado);
      onItemChange('consumo_largura_chapa', '');
      onItemChange('consumo_altura_chapa', '');
      onItemChange('consumo_valor_unitario_chapa', '');
      onItemChange('altura', '');
      onItemChange('largura', '');
      onItemChange('quantidade', '1');
      onItemChange('valor_produto_origem', valorOrigem);
      onItemChange('tipo_item', novoTipoItem);
      onItemChange('variacao_selecionada', null);
      // Passar valor mínimo do produto para aplicar no cálculo de subtotal
      onItemChange('valor_minimo', produto.valor_minimo || null);
      // Armazenar o tipo de precificação para cálculos corretos (metro_linear, m2, unidade, etc.)
      onItemChange('tipo_precificacao', tipoPrecificacaoProduto || '');
      
      toast({ 
        title: novoTipoItem === 'm2' ? "Produto Selecionado como Base (Serviço M²)" : "Produto Selecionado (Unidade)", 
        description: toastMessage,
        variant: "default",
        duration: 7000
      });

      // Verificar se é produto do tipo adesivo/lona para expandir seção de consumo automaticamente
      const nomeLower = (produto.nome || '').toLowerCase();
      const categoriaLower = (produto.categoria?.nome || produto.categoria_nome || '').toLowerCase();
      const isAdesivo = nomeLower.includes('adesivo') || categoriaLower.includes('adesivo');
      const isLona = nomeLower.includes('lona') || categoriaLower.includes('lona');
      const isVinil = nomeLower.includes('vinil') || categoriaLower.includes('vinil');
      
      if (produtoEhM2 && (isAdesivo || isLona || isVinil)) {
        // Pré-preencher o material utilizado com o nome do produto
        onItemChange('consumo_material_utilizado', produto.nome);
        
        // Se o produto tem medidas de chapa definidas, pré-preencher
        if (produto.medida_chapa_largura_cm && produto.medida_chapa_altura_cm) {
          onItemChange('consumo_largura_chapa', String(produto.medida_chapa_largura_cm));
          onItemChange('consumo_altura_chapa', String(produto.medida_chapa_altura_cm));
          if (produto.valor_chapa) {
            onItemChange('consumo_valor_unitario_chapa', String(produto.valor_chapa));
          }
        }
        
        toast({
          title: "Consumo de Material",
          description: `Produto "${produto.nome}" identificado como ${isAdesivo ? 'adesivo' : isLona ? 'lona' : 'vinil'}. Campos de consumo pré-preenchidos.`,
          duration: 5000
        });
      }
    }
  };

  const handleProdutoSelecionadoModal = (produto) => {
    handleProdutoSelecionado(produto);
  };

  const handleMaterialSelecionadoParaConsumo = (produto) => {
    if (!produto || !currentServico) {
      console.warn('⚠️ [OSItemForm] Produto ou currentServico não encontrado:', { produto, currentServico });
      return;
    }
    
    const nomeMaterial = produto.nome || produto.nome_produto || '';
    if (nomeMaterial) {
      materialFoiEditadoRef.current = true;
      camposConsumoLimposRef.current = false; // Resetar a flag quando um novo material for selecionado
      
        // Armazenar o produto selecionado no estado para usar no card de estoque
      setProdutoSelecionadoParaConsumo(produto);
      
      console.log('🔄 [OSItemForm] Produto selecionado para consumo:', {
        nome: nomeMaterial,
        produto_id: produto.id,
        preco_m2: produto.preco_m2,
        valor_chapa: produto.valor_chapa,
        preco_venda: produto.preco_venda,
        medida_chapa_largura_cm: produto.medida_chapa_largura_cm,
        medida_chapa_altura_cm: produto.medida_chapa_altura_cm,
        estoque: produto.estoque,
        todos_campos: Object.keys(produto)
      });
      
      // Se o produto não tem os campos de preço, tentar buscar do array de produtos cadastrados
      let produtoCompleto = produto;
      if ((!produto.preco_m2 || produto.preco_m2 === null || produto.preco_m2 === 0) && 
          (!produto.valor_chapa || produto.valor_chapa === null || produto.valor_chapa === 0) && 
          (!produto.preco_venda || produto.preco_venda === null || produto.preco_venda === 0)) {
        // Tentar encontrar o produto no array de produtos cadastrados
        if (Array.isArray(produtosCadastrados) && produto.id) {
          const produtoEncontrado = produtosCadastrados.find(p => p.id === produto.id || p.id === String(produto.id));
          if (produtoEncontrado) {
            produtoCompleto = { ...produto, ...produtoEncontrado };
            console.log('✅ [OSItemForm] Produto completo encontrado no array:', {
              produto_id: produto.id,
              preco_m2: produtoCompleto.preco_m2,
              valor_chapa: produtoCompleto.valor_chapa,
              preco_venda: produtoCompleto.preco_venda
            });
          }
        }
      }
      
      // Atualizar currentServico com todas as mudanças de uma vez para evitar múltiplas renderizações
      const updates = { consumo_material_utilizado: nomeMaterial };
      
      // Preencher automaticamente as medidas da chapa se o produto tiver
      if (produtoCompleto.medida_chapa_largura_cm !== null && produtoCompleto.medida_chapa_largura_cm !== undefined) {
        let larguraChapaValor = safeParseFloat(produtoCompleto.medida_chapa_largura_cm, 0);
        const alturaChapaValorRaw = safeParseFloat(produtoCompleto.medida_chapa_altura_cm, 0);
        // Se a largura for menor que 1 e a altura for maior que 10, provavelmente a largura está em metros
        // Exemplo: 0.65 m x 100 cm -> converte para 65 cm x 100 cm
        if (larguraChapaValor > 0 && larguraChapaValor < 1 && alturaChapaValorRaw > 10) {
          larguraChapaValor = larguraChapaValor * 100; // Converter metros para centímetros
        }
        const larguraChapa = formatToDisplay(larguraChapaValor, 2);
        updates.consumo_largura_chapa = larguraChapa;
        onItemChange('consumo_largura_chapa', larguraChapa);
      }
      if (produtoCompleto.medida_chapa_altura_cm !== null && produtoCompleto.medida_chapa_altura_cm !== undefined) {
        let alturaChapaValor = safeParseFloat(produtoCompleto.medida_chapa_altura_cm, 0);
        const larguraChapaValorRaw = safeParseFloat(produtoCompleto.medida_chapa_largura_cm, 0);
        // Se a altura for menor que 1 e a largura for maior que 10, provavelmente a altura está em metros
        // Exemplo: 100 cm x 0.65 m -> converte para 100 cm x 65 cm
        if (alturaChapaValor > 0 && alturaChapaValor < 1 && larguraChapaValorRaw > 10) {
          alturaChapaValor = alturaChapaValor * 100; // Converter metros para centímetros
        }
        const alturaChapa = formatToDisplay(alturaChapaValor, 2);
        updates.consumo_altura_chapa = alturaChapa;
        onItemChange('consumo_altura_chapa', alturaChapa);
      }
      
      // Preencher o valor de custo por m² (para consumo de material)
      // Prioridade: preco_custo > preco_m2 > valor_chapa > preco_metro_linear > preco_venda
      const precoM2Raw = produtoCompleto.preco_m2;
      const precoCustoRaw = produtoCompleto.preco_custo ?? produtoCompleto.precoCusto;
      const valorChapaRaw = produtoCompleto.valor_chapa;
      const precoMetroLinearRaw = produtoCompleto.preco_metro_linear;
      const precoVendaRaw = produtoCompleto.preco_venda;
      const tipoPrecificacaoRaw = (produtoCompleto.tipo_precificacao || '').toString().toLowerCase();
      const larguraReferenciaCm = safeParseFloat(currentServico?.consumo_largura_chapa || produtoCompleto.medida_chapa_largura_cm, 0);
      
      // Converter valores para número, considerando null/undefined/vazio como inválido
      // IMPORTANTE: Não usar valores que sejam 0, apenas valores maiores que 0
      const precoCusto = (precoCustoRaw !== null && precoCustoRaw !== undefined && precoCustoRaw !== '' && parseFloat(precoCustoRaw) > 0)
        ? safeParseFloat(precoCustoRaw, 0)
        : null;
      const precoCustoNormalizado = (precoCusto !== null && tipoPrecificacaoRaw === 'metro_linear' && larguraReferenciaCm > 0)
        ? (precoCusto / (larguraReferenciaCm / 100))
        : precoCusto;
      const precoM2 = (precoM2Raw !== null && precoM2Raw !== undefined && precoM2Raw !== '' && parseFloat(precoM2Raw) > 0) 
        ? safeParseFloat(precoM2Raw, 0) 
        : null;
      const valorChapa = (valorChapaRaw !== null && valorChapaRaw !== undefined && valorChapaRaw !== '' && parseFloat(valorChapaRaw) > 0) 
        ? safeParseFloat(valorChapaRaw, 0) 
        : null;
      const precoMetroLinear = (precoMetroLinearRaw !== null && precoMetroLinearRaw !== undefined && precoMetroLinearRaw !== '' && parseFloat(precoMetroLinearRaw) > 0) 
        ? safeParseFloat(precoMetroLinearRaw, 0) 
        : null;
      const precoVenda = (precoVendaRaw !== null && precoVendaRaw !== undefined && precoVendaRaw !== '' && parseFloat(precoVendaRaw) > 0) 
        ? safeParseFloat(precoVendaRaw, 0) 
        : null;
      
      // Determinar qual valor usar (prioridade: preco_custo > preco_m2 > valor_chapa > preco_metro_linear > preco_venda)
      // IMPORTANTE: Usar apenas valores maiores que 0
      let valorParaPreencher = null;
      let origemValor = '';
      if (precoCustoNormalizado !== null && precoCustoNormalizado > 0) {
        valorParaPreencher = precoCustoNormalizado;
        origemValor = tipoPrecificacaoRaw === 'metro_linear' ? 'preco_custo_metro_linear_normalizado_m2' : 'preco_custo';
      } else if (precoM2 !== null && precoM2 > 0) {
        valorParaPreencher = precoM2;
        origemValor = 'preco_m2';
      } else if (valorChapa !== null && valorChapa > 0) {
        valorParaPreencher = valorChapa;
        origemValor = 'valor_chapa';
      } else if (precoMetroLinear !== null && precoMetroLinear > 0) {
        valorParaPreencher = precoMetroLinear;
        origemValor = 'preco_metro_linear';
      } else if (precoVenda !== null && precoVenda > 0) {
        valorParaPreencher = precoVenda;
        origemValor = 'preco_venda';
      }
      
      // Preencher o valor se encontrou algum campo válido
      if (valorParaPreencher !== null) {
        const precoFormatado = formatToDisplay(valorParaPreencher, 2);
        updates.consumo_valor_unitario_chapa = precoFormatado;
        onItemChange('consumo_valor_unitario_chapa', precoFormatado);
        
        console.log('✅ [OSItemForm] Valor por m² preenchido do produto:', {
          produto: nomeMaterial,
          produto_id: produtoCompleto.id,
          preco_custo_raw: precoCustoRaw,
          preco_custo_parsed: precoCusto,
          preco_custo_normalizado_m2: precoCustoNormalizado,
          tipo_precificacao: tipoPrecificacaoRaw,
          largura_referencia_cm: larguraReferenciaCm,
          preco_m2_raw: precoM2Raw,
          preco_m2_parsed: precoM2,
          valor_chapa_raw: valorChapaRaw,
          valor_chapa_parsed: valorChapa,
          preco_metro_linear_raw: precoMetroLinearRaw,
          preco_metro_linear_parsed: precoMetroLinear,
          preco_venda_raw: precoVendaRaw,
          preco_venda_parsed: precoVenda,
          valor_usado: valorParaPreencher,
          origem_valor: origemValor,
          valor_formatado: precoFormatado,
          todos_campos_produto: Object.keys(produtoCompleto)
        });
      } else {
        console.warn('⚠️ [OSItemForm] Produto não possui preço configurado:', {
          produto: nomeMaterial,
          produto_id: produtoCompleto.id,
          preco_m2: precoM2Raw,
          valor_chapa: valorChapaRaw,
          preco_metro_linear: precoMetroLinearRaw,
          preco_venda: precoVendaRaw,
          todos_campos_produto: Object.keys(produtoCompleto)
        });
      }
      
      // Atualizar currentServico com todas as mudanças para atualizar os cálculos imediatamente
      // IMPORTANTE: Fazer isso DEPOIS de calcular todos os valores
      setCurrentServico(prev => {
        const updated = { ...prev, ...updates };
        console.log('🔄 [OSItemForm] currentServico atualizado:', {
          consumo_material_utilizado: updated.consumo_material_utilizado,
          consumo_valor_unitario_chapa: updated.consumo_valor_unitario_chapa,
          consumo_largura_chapa: updated.consumo_largura_chapa,
          consumo_altura_chapa: updated.consumo_altura_chapa
        });
        return updated;
      });
      onItemChange('consumo_material_utilizado', nomeMaterial);
    }
  };

  const handleMaterialSelecionadoModalParaConsumo = (produto) => {
    handleMaterialSelecionadoParaConsumo(produto);
  };

  const handleVariacaoSelecionada = (variacao) => {
    if (produtoBaseInfo && variacao) {
      materialFoiEditadoRef.current = false;
      // Se a variação tem preço específico, usar ele. Senão, usar o preço do produto (que já considera promoção)
      const precoVariacao = parseFloat(variacao.preco_var || 0);
      const precoProduto = parseFloat(produtoBaseInfo.preco_m2 || produtoBaseInfo.preco_metro_linear || produtoBaseInfo.preco_venda || 0);
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

      onItemChange('nome_servico_produto', `${produtoBaseInfo.nome} (${variacao.nome})`);
      onItemChange('imagem_url', variacao.imagem_url_preview || variacao.imagem_url || produtoBaseInfo.imagem_principal || '');
      onItemChange('valor_unitario_m2', novoValorProduto);
      onItemChange('valor_unitario_bloqueado', valorBloqueado);
      onItemChange('valor_produto_origem', valorOrigem);
      onItemChange('consumo_largura_chapa', '');
      onItemChange('consumo_altura_chapa', '');
      onItemChange('consumo_valor_unitario_chapa', '');
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
    materialFoiEditadoRef.current = false;
    onItemChange('produto_id', null);
    onItemChange('nome_servico_produto', '');
    onItemChange('imagem_url', '');
    onItemChange('valor_unitario_m2', '0,00');
    onItemChange('valor_unitario_bloqueado', false);
    onItemChange('altura', '');
    onItemChange('largura', '');
    onItemChange('quantidade', '1');
    onItemChange('consumo_largura_chapa', '');
    onItemChange('consumo_altura_chapa', '');
    onItemChange('consumo_valor_unitario_chapa', '');
    onItemChange('valor_produto_origem', '');
    onItemChange('tipo_item', 'm2');
    onItemChange('variacao_selecionada', null);
    toast({ title: "Seleção de Produto Limpa" });
  };

  const handleClearMaterialUtilizado = () => {
    console.log('🧹 [OSItemForm] Limpando material utilizado...');
    materialFoiEditadoRef.current = false;
    camposConsumoLimposRef.current = true; // Marcar que os campos foram limpos manualmente
    
    // Limpar todos os campos relacionados ao consumo de material de uma vez
    const camposLimpos = {
      consumo_material_utilizado: '',
      consumo_quantidade_solicitada: '',
      consumo_largura_peca: '',
      consumo_altura_peca: '',
      consumo_largura_chapa: '',
      consumo_altura_chapa: '',
      consumo_valor_unitario_chapa: '',
      detalhes: '', // Limpar também a observação
    };
    
    // Atualizar currentServico com todos os campos limpos de uma vez
    setCurrentServico(prev => {
      const updated = {
        ...prev,
        ...camposLimpos
      };
      console.log('🧹 [OSItemForm] currentServico atualizado (limpo):', {
        consumo_material_utilizado: updated.consumo_material_utilizado,
        consumo_quantidade_solicitada: updated.consumo_quantidade_solicitada,
        consumo_largura_peca: updated.consumo_largura_peca,
        consumo_altura_peca: updated.consumo_altura_peca,
        consumo_largura_chapa: updated.consumo_largura_chapa,
        consumo_altura_chapa: updated.consumo_altura_chapa,
        consumo_valor_unitario_chapa: updated.consumo_valor_unitario_chapa,
      });
      return updated;
    });
    
    // Limpar também no estado pai através do onItemChange para cada campo
    // Usar setTimeout para garantir que o setCurrentServico seja processado primeiro
    setTimeout(() => {
      onItemChange('consumo_material_utilizado', '');
      onItemChange('consumo_quantidade_solicitada', '');
      onItemChange('consumo_largura_peca', '');
      onItemChange('consumo_altura_peca', '');
      onItemChange('consumo_largura_chapa', '');
      onItemChange('consumo_altura_chapa', '');
      onItemChange('consumo_valor_unitario_chapa', '');
      onItemChange('detalhes', ''); // Limpar também a observação
    }, 0);
    
    console.log('✅ [OSItemForm] Material utilizado limpo com sucesso');
    toast({ title: "Material Utilizado Limpo", description: "Todos os campos relacionados ao material foram limpos." });
  };

  const handleSubmit = () => {
    // Validação de segurança para evitar erro de tipo_item undefined
    if (!currentServico || !currentServico.tipo_item) {
      toast({ 
        title: "Erro no Formulário", 
        description: "Dados do item não estão completos. Verifique se todos os campos obrigatórios foram preenchidos.", 
        variant: "destructive" 
      });
      return;
    }

    // Validar estoque antes de submeter
    if (currentServico?.produto_id && Array.isArray(produtosCadastrados)) {
      const validacaoEstoque = validarEstoqueQuantidadeM2(currentServico.quantidade);
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

    // CORREÇÃO: Recalcular o subtotal no momento do submit para garantir valor correto
    // Isso evita problemas de sincronização assíncrona do estado
    const alturaParsed = safeParseFloat(currentServico.altura, 0);
    const larguraParsed = safeParseFloat(currentServico.largura, 0);
    const quantidadeParsed = safeParseFloat(currentServico.quantidade, 1);
    const quantidadeValidaSubmit = Number.isFinite(quantidadeParsed) && quantidadeParsed > 0 ? quantidadeParsed : 1;
    const areaTotalSubmit = alturaParsed * larguraParsed * quantidadeValidaSubmit;
    
    // Verificar se tem consumo de material com custo válido
    const temConsumoMaterialSubmit = currentServico.consumo_material_utilizado || 
                                     currentServico.consumo_largura_peca || 
                                     currentServico.consumo_altura_peca;
    const consumoCustoTotalSubmit = safeParseFloat(currentServico.consumo_custo_total, 0);
    const temConsumoCustoTotalValidoSubmit = consumoCustoTotalSubmit > 0;
    
    let subtotalCorrigido;
    const tipoPrecificacaoSubmit = (currentServico.tipo_precificacao || '').toLowerCase();
    if (temConsumoMaterialSubmit && temConsumoCustoTotalValidoSubmit) {
      subtotalCorrigido = consumoCustoTotalSubmit;
    } else {
      const valorUnitarioM2Submit = safeParseFloat(currentServico.valor_unitario_m2, 0);
      if (tipoPrecificacaoSubmit === 'metro_linear') {
        // Para metro linear: comprimento (maior dimensão) × quantidade × preço por metro
        const comprimentoSubmit = Math.max(larguraParsed, alturaParsed);
        subtotalCorrigido = comprimentoSubmit * quantidadeValidaSubmit * valorUnitarioM2Submit;
      } else {
        subtotalCorrigido = areaTotalSubmit * valorUnitarioM2Submit;
      }
      
      // Adicionar acabamentos se houver
      if (currentServico.acabamentos_selecionados && 
          currentServico.acabamentos_selecionados.length > 0 && 
          Array.isArray(acabamentosConfig)) {
        const perimetroSubmit = (larguraParsed > 0 && alturaParsed > 0) ? 2 * (larguraParsed + alturaParsed) : 0;
        
        currentServico.acabamentos_selecionados.forEach(acabSelecionado => {
          const acabamentoDef = acabamentosConfig.find(a => a.id === acabSelecionado.id);
          if (acabamentoDef) {
            let valorAcabamento = 0;
            
            if (acabamentoDef.tipo_aplicacao === 'area_total') {
              const valorM2 = safeParseFloat(acabamentoDef.valor_m2 || acabamentoDef.valor, 0);
              valorAcabamento = areaTotalSubmit * valorM2;
            } else if (acabamentoDef.tipo_aplicacao === 'perimetro' || acabamentoDef.tipo_aplicacao === 'metro_linear') {
              const valorLinear = safeParseFloat(acabamentoDef.valor_m2 || acabamentoDef.valor_un || acabamentoDef.valor, 0);
              valorAcabamento = perimetroSubmit * quantidadeValidaSubmit * valorLinear;
            } else if (acabamentoDef.tipo_aplicacao === 'unidade') {
              const valorUn = safeParseFloat(acabamentoDef.valor_un || acabamentoDef.valor, 0);
              valorAcabamento = quantidadeValidaSubmit * valorUn;
            }
            
            subtotalCorrigido += Math.max(0, valorAcabamento);
          }
        });
      }
    }
    
    // Criar item com subtotal corrigido
    const itemComSubtotalCorrigido = {
      ...currentServico,
      subtotal_item: isNaN(subtotalCorrigido) ? 0 : parseFloat(subtotalCorrigido.toFixed(2)),
      area_calculada_item: isNaN(areaTotalSubmit) ? 0 : parseFloat(areaTotalSubmit.toFixed(3))
    };

    if (isEditing) {
      if (typeof onUpdateItem === 'function') onUpdateItem(itemComSubtotalCorrigido);
    } else {
      if (typeof onAdicionarItem === 'function') onAdicionarItem(itemComSubtotalCorrigido);
    }
  };
  
  if (!currentServico) {
    return (
      <Card className="shadow-lg border-border">
        <CardHeader><CardTitle>Carregando formulário do item...</CardTitle></CardHeader>
        <CardContent><p>Aguarde...</p></CardContent>
      </Card>
    );
  }

  // Calcular área total (área unitária × quantidade) diretamente a partir das dimensões informadas
  const alturaNumerica = safeParseFloat(currentServico.altura, 0);
  const larguraNumerica = safeParseFloat(currentServico.largura, 0);
  const areaUnitaria = Number.isFinite(alturaNumerica * larguraNumerica) ? alturaNumerica * larguraNumerica : 0;
  const quantidade = safeParseFloat(currentServico.quantidade, 1);
  const quantidadeValida = Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1;
  const areaTotal = areaUnitaria * quantidadeValida;
  const ehMetroLinear = (currentServico.tipo_precificacao || '').toLowerCase() === 'metro_linear';
  const comprimentoMetroLinear = Math.max(larguraNumerica, alturaNumerica);
  const areaDisplay = ehMetroLinear 
    ? (Number.isFinite(comprimentoMetroLinear) ? comprimentoMetroLinear.toFixed(3).replace('.', ',') : '0,000')
    : (Number.isFinite(areaTotal) ? areaTotal.toFixed(3).replace('.', ',') : '0,000');
  
  // CORREÇÃO: Calcular o subtotal localmente para exibição imediata
  // Isso garante que o valor exibido sempre reflita os valores atuais de altura, largura, quantidade e valor_m2
  // O cálculo usa a mesma lógica que calcularSubtotalItem, mas com os valores locais para resposta imediata
  const subtotalCalculadoLocal = useMemo(() => {
    // Verificar se tem consumo de material com custo válido
    const temConsumoMaterial = currentServico.consumo_material_utilizado || 
                               currentServico.consumo_largura_peca || 
                               currentServico.consumo_altura_peca;
    const consumoCustoTotal = safeParseFloat(currentServico.consumo_custo_total, 0);
    const temConsumoCustoTotalValido = consumoCustoTotal > 0;
    
    // Se tem consumo de material com custo válido, usar esse custo
    if (temConsumoMaterial && temConsumoCustoTotalValido) {
      return consumoCustoTotal;
    }
    
    // Caso contrário, calcular usando valores locais já parseados
    const valorUnitarioM2 = safeParseFloat(currentServico.valor_unitario_m2, 0);
    const tipoPrecificacaoCalc = (currentServico.tipo_precificacao || '').toLowerCase();
    
    let subtotal;
    if (tipoPrecificacaoCalc === 'metro_linear') {
      // Para metro linear: comprimento (maior dimensão) × quantidade × preço por metro
      const comprimento = Math.max(larguraNumerica, alturaNumerica);
      subtotal = comprimento * quantidadeValida * valorUnitarioM2;
    } else {
      subtotal = areaTotal * valorUnitarioM2;
    }
    
    // Adicionar acabamentos se houver
    if (currentServico.acabamentos_selecionados && 
        currentServico.acabamentos_selecionados.length > 0 && 
        Array.isArray(acabamentosConfig)) {
      const perimetro = (larguraNumerica > 0 && alturaNumerica > 0) ? 2 * (larguraNumerica + alturaNumerica) : 0;
      
      currentServico.acabamentos_selecionados.forEach(acabSelecionado => {
        const acabamentoDef = acabamentosConfig.find(a => a.id === acabSelecionado.id);
        if (acabamentoDef) {
          let valorAcabamento = 0;
          
          if (acabamentoDef.tipo_aplicacao === 'area_total') {
            const valorM2 = safeParseFloat(acabamentoDef.valor_m2 || acabamentoDef.valor, 0);
            valorAcabamento = areaTotal * valorM2;
          } else if (acabamentoDef.tipo_aplicacao === 'perimetro' || acabamentoDef.tipo_aplicacao === 'metro_linear') {
            const valorLinear = safeParseFloat(acabamentoDef.valor_m2 || acabamentoDef.valor_un || acabamentoDef.valor, 0);
            valorAcabamento = perimetro * quantidadeValida * valorLinear;
          } else if (acabamentoDef.tipo_aplicacao === 'unidade') {
            const valorUn = safeParseFloat(acabamentoDef.valor_un || acabamentoDef.valor, 0);
            valorAcabamento = quantidadeValida * valorUn;
          }
          
          subtotal += Math.max(0, valorAcabamento);
        }
      });
    }
    
    return isNaN(subtotal) ? 0 : subtotal;
  }, [currentServico.altura, currentServico.largura, currentServico.quantidade, 
      currentServico.valor_unitario_m2, currentServico.acabamentos_selecionados,
      currentServico.consumo_material_utilizado, currentServico.consumo_largura_peca,
      currentServico.consumo_altura_peca, currentServico.consumo_custo_total,
      currentServico.tipo_precificacao,
      areaTotal, larguraNumerica, alturaNumerica, quantidadeValida, acabamentosConfig]);
  
  const subtotalItemDisplay = Number.isFinite(subtotalCalculadoLocal) 
    ? subtotalCalculadoLocal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';
  const valorVendaItemDisplay = Number.isFinite(subtotalCalculadoLocal)
    ? subtotalCalculadoLocal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 0,00';
  const valorUnitarioM2Display = currentServico.valor_unitario_m2 ? formatToDisplay(currentServico.valor_unitario_m2, 2) : '';
  const pecasPorChapaDisplay = Number.isFinite(pecasPorChapa) ? pecasPorChapa.toLocaleString('pt-BR') : '0';
  const chapasNecessariasDisplay = Number.isFinite(chapasNecessarias) ? chapasNecessarias.toLocaleString('pt-BR') : '0';
  const custoMaterialBaseDisplay = Number.isFinite(custoMaterialBase)
    ? custoMaterialBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 0,00';
  const custoMaterialUtilizadoDisplay = Number.isFinite(custoMaterialUtilizado)
    ? custoMaterialUtilizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 0,00';
  const custoAcabamentosDisplay = Number.isFinite(custoAcabamentos)
    ? custoAcabamentos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 0,00';
  const custoTotalDisplay = Number.isFinite(custoTotal) ? custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
  const custoUnitarioDisplay = Number.isFinite(custoUnitario) ? custoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
  const quantidadeBaseLucro = parseInt(
    sanitizeIntegerInput(currentServico?.consumo_quantidade_solicitada || currentServico?.quantidade || ''),
    10
  ) || 0;
  const lucroTotalMaterial = Number.isFinite(subtotalCalculadoLocal) && Number.isFinite(custoMaterialUtilizado)
    ? subtotalCalculadoLocal - custoMaterialUtilizado
    : 0;
  const lucroUnitarioMaterial = quantidadeBaseLucro > 0 ? (lucroTotalMaterial / quantidadeBaseLucro) : 0;
  const lucroMaterialPositivo = lucroTotalMaterial >= 0;
  const lucroTotalMaterialDisplay = lucroTotalMaterial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const lucroUnitarioMaterialDisplay = lucroUnitarioMaterial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const aproveitamentoDisplay = Number.isFinite(aproveitamentoPercentual) ? `${aproveitamentoPercentual.toFixed(2)}%` : '0%';

  const formatMetrosQuadradosDisplay = useCallback((valor) => {
    if (!Number.isFinite(valor)) return '0.000';
    // Formatar com 3 casas decimais
    return parseFloat(valor).toFixed(3);
  }, []);

  return (
    <>
      {/* Renderizar o Card apenas se o modal NÃO estiver aberto */}
      {!isConsumoMaterialModalOpen && (
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle className="flex items-center">
                <Ruler size={20} className="mr-2 text-primary"/> 
                {isEditing ? 'Editando Serviço/Item (m²)' : 'Adicionar Serviço/Item (m²)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
        <div className="flex items-end space-x-2">
            <div className="flex-grow">
                <Label htmlFor="nome_servico_produto">Nome do Serviço/Produto <span className="text-red-500">*</span></Label>
                <ProductAutocompleteSimple
                    id="nome_servico_produto"
                    value={currentServico.nome_servico_produto || ''} 
                    onChange={handleInputChange}
                    onSelect={handleProdutoSelecionado}
                    onFocus={solicitarProdutos}
                    placeholder="Digite o nome do produto..." 
                    disabled={isDisabled}
                    produtos={Array.isArray(produtosCadastrados) ? produtosCadastrados : []}
                    tipoProduto="m2"
                />
                {!produtosCarregados && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {isCarregandoProdutos ? 'Carregando produtos cadastrados...' : 'Os produtos serão carregados ao buscar ou abrir a base.'}
                  </p>
                )}
            </div>
            <OSProdutoLookupModal produtosCadastrados={produtosCadastrados} onSelectProduto={handleProdutoSelecionadoModal} onOpen={solicitarProdutos}>
                <Button variant="outline" className="h-10 px-3" disabled={isDisabled}>
                    <Search size={18} className="mr-2"/> Buscar Base
                </Button>
            </OSProdutoLookupModal>
            {currentServico.produto_id !== null && (
                <Button variant="ghost" size="icon" onClick={handleClearProdutoSelecionado} title="Limpar produto selecionado" className="h-10 w-10 text-red-500 hover:text-red-600" disabled={isDisabled}>
                    <XCircle size={20} />
                </Button>
            )}
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
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="altura">Altura (m) <span className="text-red-500">*</span></Label>
            <Input id="altura" name="altura" type="text" value={String(currentServico.altura || '').replace('.',',')} onChange={handleDimensionChange} onBlur={handleDimensionBlur} placeholder="0,00" disabled={isDisabled} />
          </div>
          <div>
            <Label htmlFor="largura">Largura (m) <span className="text-red-500">*</span></Label>
            <Input id="largura" name="largura" type="text" value={String(currentServico.largura || '').replace('.',',')} onChange={handleDimensionChange} onBlur={handleDimensionBlur} placeholder="0,00" disabled={isDisabled} />
          </div>
          <div>
            <Label htmlFor="area_calculada_item">{ehMetroLinear ? 'Comprimento (m)' : 'Área Total (m²)'}</Label>
            <Input id="area_calculada_item" name="area_calculada_item" type="text" value={areaDisplay} readOnly className="bg-muted dark:bg-muted/50" />
          </div>
          <div>
            <Label htmlFor="quantidade">Quantidade <span className="text-red-500">*</span></Label>
            <Input 
              id="quantidade" 
              name="quantidade" 
              type="text" 
              value={currentServico.quantidade === '0' ? '' : (currentServico.quantidade || '')} 
              onChange={handleInputChange} 
              onBlur={handleQuantidadeBlur}
              placeholder="1" 
              disabled={isDisabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div>
              <Label htmlFor="valor_unitario_m2">{ehMetroLinear ? 'Valor do Produto (R$/m)' : 'Valor do Produto (R$/m²)'} <span className="text-red-500">*</span></Label>
              <Input 
                id="valor_unitario_m2" 
                name="valor_unitario_m2" 
                type="text" 
                value={valorUnitarioM2Display} 
                onChange={handleValorUnitarioM2Change}
                onBlur={handleValorUnitarioM2Blur}
                placeholder="0,00"
                readOnly={currentServico.valor_unitario_bloqueado || isDisabled}
                className={cn((currentServico.valor_unitario_bloqueado || isDisabled) && 'bg-muted dark:bg-muted/50 cursor-not-allowed font-semibold')}
              />
               {currentServico.valor_unitario_bloqueado && currentServico.valor_produto_origem && (
                <p className="text-xs text-muted-foreground mt-1">Valor originado do {currentServico.valor_produto_origem} do produto.</p>
              )}
            </div>
        </div>

        <div>
          <Label htmlFor="observacao_item">Observações do Item</Label>
          <Textarea id="observacao_item" name="detalhes" value={currentServico.detalhes || ''} onChange={handleInputChange} placeholder="Ex: imprimir em vinil brilho, frente apenas..." disabled={isDisabled} />
        </div>
        
        <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded-md border border-blue-200 dark:border-blue-700 flex items-center justify-between">
            <div className="flex items-center">
                <DollarSign size={20} className="mr-3 text-blue-600 dark:text-blue-400"/>
                <span className="text-lg font-semibold text-blue-800 dark:text-blue-300">Valor Total do Item:</span>
            </div>
            <span className="text-2xl font-bold text-blue-800 dark:text-blue-300">
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
            {isEditing ? 'Atualizar Item' : 'Adicionar à Ordem'}
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
      )}
      
      {/* Modal de Consumo de Material - renderizado sempre, mas só visível quando isConsumoMaterialModalOpen for true */}
      <Dialog 
        open={isConsumoMaterialModalOpen} 
        onOpenChange={(open) => {
          // Só permitir fechar o modal, não abrir através do onOpenChange
          // O modal só deve abrir através do trigger
          if (!open) {
            setIsConsumoMaterialModalOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-900 dark:text-blue-200">Consumo de Material</DialogTitle>
            <DialogDescription>
              Informe os dados da peça e da chapa para calcular automaticamente o consumo e o custo do material.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="modal_consumo_material_utilizado">Material Utilizado</Label>
              <div className="flex items-end space-x-2">
                <div className="flex-grow">
                  <ProductAutocompleteSimple
                    id="modal_consumo_material_utilizado"
                    value={currentServico.consumo_material_utilizado || ''} 
                    onChange={handleConsumoMaterialInputChange}
                    onSelect={handleMaterialSelecionadoParaConsumo}
                    onFocus={solicitarProdutos}
                    placeholder="Digite o nome do material..." 
                    disabled={isDisabled}
                    produtos={Array.isArray(produtosCadastrados) ? produtosCadastrados : []}
                    autoOpenOnFocus={false}
                  />
                </div>
                <OSProdutoLookupModal produtosCadastrados={produtosCadastrados} onSelectProduto={handleMaterialSelecionadoModalParaConsumo} onOpen={solicitarProdutos}>
                  <Button variant="outline" className="h-10 px-3" disabled={isDisabled}>
                    <Search size={18} className="mr-2"/> Buscar Base
                  </Button>
                </OSProdutoLookupModal>
                {currentServico.consumo_material_utilizado && (
                  <Button variant="ghost" size="icon" onClick={handleClearMaterialUtilizado} title="Limpar material selecionado" className="h-10 w-10 text-red-500 hover:text-red-600" disabled={isDisabled}>
                    <XCircle size={20} />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="modal_consumo_quantidade_solicitada">Quantidade Solicitada</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsClonarConsumoModalOpen(true)}
                    className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    disabled={isDisabled}
                    title="Clonar medidas de outro item"
                  >
                    <Copy size={12} className="mr-1" />
                    CLONAR
                  </Button>
                </div>
                <Input
                  id="modal_consumo_quantidade_solicitada"
                  type="text"
                  inputMode="numeric"
                  value={String(currentServico.consumo_quantidade_solicitada ?? '')}
                  onChange={handleConsumoIntegerChange('consumo_quantidade_solicitada')}
                  onBlur={handleConsumoIntegerBlur('consumo_quantidade_solicitada')}
                  placeholder="Ex: 150"
                  disabled={isDisabled}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="modal_consumo_largura_peca">Peça - Largura (cm)</Label>
                  <Input
                    id="modal_consumo_largura_peca"
                    type="text"
                    value={String(currentServico.consumo_largura_peca ?? '')}
                    onChange={handleConsumoDecimalChange('consumo_largura_peca')}
                    onBlur={handleConsumoDecimalBlur('consumo_largura_peca')}
                    placeholder="Ex: 10,00"
                    disabled={isDisabled}
                  />
                </div>
                <div>
                  <Label htmlFor="modal_consumo_altura_peca">Peça - Altura (cm)</Label>
                  <Input
                    id="modal_consumo_altura_peca"
                    type="text"
                    value={String(currentServico.consumo_altura_peca ?? '')}
                    onChange={handleConsumoDecimalChange('consumo_altura_peca')}
                    onBlur={handleConsumoDecimalBlur('consumo_altura_peca')}
                    placeholder="Ex: 10,00"
                    disabled={isDisabled}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="modal_consumo_largura_chapa">Chapa - Largura (cm)</Label>
                  <Input
                    id="modal_consumo_largura_chapa"
                    type="text"
                    value={String(currentServico.consumo_largura_chapa ?? '')}
                    onChange={handleConsumoDecimalChange('consumo_largura_chapa')}
                    onBlur={handleConsumoDecimalBlur('consumo_largura_chapa')}
                    placeholder="Ex: 90,00"
                    disabled={isDisabled}
                  />
                </div>
                <div>
                  <Label htmlFor="modal_consumo_altura_chapa">Chapa - Altura (cm)</Label>
                  <Input
                    id="modal_consumo_altura_chapa"
                    type="text"
                    value={String(currentServico.consumo_altura_chapa ?? '')}
                    onChange={handleConsumoDecimalChange('consumo_altura_chapa')}
                    onBlur={handleConsumoDecimalBlur('consumo_altura_chapa')}
                    placeholder="Ex: 50,00"
                    disabled={isDisabled}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="modal_consumo_valor_unitario_chapa">Valor por m² (R$)</Label>
                <Input
                  id="modal_consumo_valor_unitario_chapa"
                  type="text"
                  value={currentServico?.consumo_valor_unitario_chapa !== null && currentServico?.consumo_valor_unitario_chapa !== undefined && currentServico?.consumo_valor_unitario_chapa !== '' 
                    ? String(currentServico.consumo_valor_unitario_chapa) 
                    : ''}
                  onChange={handleConsumoDecimalChange('consumo_valor_unitario_chapa')}
                  onBlur={handleConsumoCurrencyBlur('consumo_valor_unitario_chapa')}
                  placeholder="Ex: 120,00"
                  disabled={true}
                  readOnly={true}
                  className="bg-muted dark:bg-muted/50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">Valor originado do produto e preenchido automaticamente.</p>
              </div>
              <div className="flex flex-col justify-center text-xs text-muted-foreground space-y-1">
                <p>• Utilize centímetros para as dimensões.</p>
                <p>• Informe o valor da chapa considerando todo o material.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
              <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-xs text-blue-700 dark:text-blue-200">Peças por chapa</p>
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-50">{pecasPorChapaDisplay}</p>
              </div>
              <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-xs text-blue-700 dark:text-blue-200">Chapas necessárias</p>
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-50">{chapasNecessariasDisplay}</p>
              </div>
              <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-xs text-blue-700 dark:text-blue-200">Gasto com material (chapa)</p>
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-50">{custoMaterialBaseDisplay}</p>
                <p className="text-[11px] text-blue-700/70 dark:text-blue-200/70 mt-1">Acabamentos: {custoAcabamentosDisplay}</p>
              </div>
              <div className="rounded-md bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 p-3">
                <p className="text-xs text-cyan-700 dark:text-cyan-200">Custo do material utilizado</p>
                <p className="text-lg font-semibold text-cyan-900 dark:text-cyan-50">{custoMaterialUtilizadoDisplay}</p>
                <p className="text-[11px] text-cyan-700/70 dark:text-cyan-200/70 mt-1">{formatMetrosQuadradosDisplay(metrosQuadradosUtilizados)} m² utilizados</p>
              </div>
              <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-xs text-blue-700 dark:text-blue-200">Custo total (material + acab.)</p>
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-50">{custoTotalDisplay}</p>
                <p className="text-[11px] text-blue-700/70 dark:text-blue-200/70 mt-1">Custo unitário: {custoUnitarioDisplay}/peça</p>
              </div>
              <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-xs text-blue-700 dark:text-blue-200">Aproveitamento</p>
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-50">{aproveitamentoDisplay}</p>
              </div>
              <div className="rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-3">
                <p className="text-xs text-indigo-700 dark:text-indigo-200">Venda deste item</p>
                <p className="text-lg font-semibold text-indigo-900 dark:text-indigo-50">{valorVendaItemDisplay}</p>
              </div>
              <div className={`rounded-md border p-3 ${lucroMaterialPositivo ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                <p className={`text-xs ${lucroMaterialPositivo ? 'text-emerald-700 dark:text-emerald-200' : 'text-red-700 dark:text-red-200'}`}>Lucro sobre material utilizado</p>
                <p className={`text-lg font-semibold ${lucroMaterialPositivo ? 'text-emerald-900 dark:text-emerald-50' : 'text-red-900 dark:text-red-50'}`}>{lucroTotalMaterialDisplay}</p>
                <p className={`text-[11px] mt-1 ${lucroMaterialPositivo ? 'text-emerald-700/70 dark:text-emerald-200/70' : 'text-red-700/70 dark:text-red-200/70'}`}>~ {lucroUnitarioMaterialDisplay}/peça</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-md bg-blue-100/70 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 p-3">
                <p className="text-xs text-blue-700 dark:text-blue-200">m² necessários</p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-50">{formatMetrosQuadradosDisplay(metrosQuadradosNecessarios)}</p>
              </div>
              <div className="rounded-md bg-emerald-100/70 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 p-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-200">m² disponíveis</p>
                <p className="text-lg font-bold text-emerald-900 dark:text-emerald-50">{formatMetrosQuadradosDisplay(metrosQuadradosDisponiveis)}</p>
              </div>
              <div className="rounded-md bg-amber-100/70 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-200">m² que sobram</p>
                <p className="text-lg font-bold text-amber-900 dark:text-amber-50">{formatMetrosQuadradosDisplay(metrosQuadradosSobrando)}</p>
              </div>
              <div className="rounded-md bg-purple-100/70 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 p-3">
                <p className="text-xs text-purple-700 dark:text-purple-200">m² em estoque</p>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-50">
                  {(() => {
                    // Usar o produto armazenado no estado quando foi selecionado
                    if (produtoSelecionadoParaConsumo && produtoSelecionadoParaConsumo.estoque !== undefined && produtoSelecionadoParaConsumo.estoque !== null) {
                      const estoque = safeParseFloat(produtoSelecionadoParaConsumo.estoque, 0);
                      console.log('📦 [Estoque] Usando produto do estado:', {
                        nome: produtoSelecionadoParaConsumo.nome,
                        estoque: estoque
                      });
                      return formatMetrosQuadradosDisplay(estoque);
                    }
                    
                    // Fallback: tentar buscar na lista de produtos cadastrados
                    if (!currentServico.consumo_material_utilizado || !Array.isArray(produtosCadastrados) || produtosCadastrados.length === 0) {
                      return '-';
                    }
                    
                    // Normalizar o nome do material removendo espaços extras
                    const normalizarNome = (nome) => {
                      return nome.toLowerCase().trim().replace(/\s+/g, ' ');
                    };
                    
                    const materialNome = normalizarNome(currentServico.consumo_material_utilizado);
                    const produtoEncontrado = produtosCadastrados.find(p => {
                      if (!p || !p.nome) return false;
                      const produtoNome = normalizarNome(p.nome);
                      const nomeMatch = produtoNome === materialNome;
                      const tipoMatch = p.unidade_medida === 'm2' || p.unidadeMedida === 'm2' || p.tipo_produto === 'm2';
                      return nomeMatch && tipoMatch;
                    });
                    
                    if (!produtoEncontrado) {
                      return '-';
                    }
                    
                    const estoque = safeParseFloat(produtoEncontrado.estoque, 0);
                    return formatMetrosQuadradosDisplay(estoque);
                  })()}
                </p>
              </div>
            </div>

            {!possuiDadosSuficientes && (
              <p className="text-xs text-muted-foreground">Preencha todos os campos acima para calcular o consumo do material.</p>
            )}

            {/* Campo de Observação */}
            <div className="mt-6">
              <Label htmlFor="modal_consumo_observacao">Observações do Item</Label>
              <Textarea 
                id="modal_consumo_observacao" 
                name="detalhes" 
                value={currentServico.detalhes || ''} 
                onChange={handleInputChange} 
                placeholder="Ex: cor específica, acabamento especial, detalhes de aplicação..." 
                disabled={isDisabled}
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Seção de Acabamentos */}
            {currentServico && currentServico.tipo_item === 'm2' && Array.isArray(acabamentosConfig) && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Acabamentos
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Selecione os acabamentos para calcular o valor total
                  </p>
                </div>
                
                <ScrollArea className="h-[220px]">
                  {acabamentosConfig.filter(acab => acab.ativo).length > 0 ? (
                    <div className="space-y-1.5 pr-2">
                      {acabamentosConfig.filter(acab => acab.ativo).map((acabDisp) => {
                        // TODAS as validações removidas - sempre permitir seleção de acabamentos
                        const produtoVinculadoNaoEncontrado = false; // Sempre false - não validar produto vinculado
                        const semEstoque = false; // Sempre false - não limitar por estoque
                        
                        const itemAcabamentosSelecionados = Array.isArray(currentServico.acabamentos_selecionados) ? currentServico.acabamentos_selecionados : [];
                        const isChecked = itemAcabamentosSelecionados.some(a => a.id === acabDisp.id);
                        
                        let valorDisplay = '0.00';
                        let unidadeDisplay = '';
                        if (acabDisp.tipo_aplicacao === 'area_total') {
                          valorDisplay = safeParseFloat(acabDisp.valor_m2 || 0).toFixed(2);
                          unidadeDisplay = '/m²';
                        } else if (acabDisp.tipo_aplicacao === 'metro_linear') {
                          valorDisplay = safeParseFloat(acabDisp.valor_m2 || acabDisp.valor_un || 0).toFixed(2);
                          unidadeDisplay = '/m linear';
                        } else if (acabDisp.tipo_aplicacao === 'unidade') {
                          valorDisplay = safeParseFloat(acabDisp.valor_un || 0).toFixed(2);
                          unidadeDisplay = '/un';
                        }

                        return (
                          <div 
                            key={acabDisp.id} 
                            className={cn(
                              "flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                              isChecked 
                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm" 
                                : "bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/70"
                            )}
                          >
                            <Checkbox
                              id={`acab-consumo-${acabDisp.id}`}
                              checked={isChecked}
                              className="mt-0.5"
                              onCheckedChange={(checked) => {
                                const acabamentosAtuais = Array.isArray(currentServico.acabamentos_selecionados) 
                                  ? currentServico.acabamentos_selecionados 
                                  : [];
                                let novosAcabamentos;

                                if (checked) {
                                  // TODAS as validações removidas - sempre permitir seleção de acabamentos
                                  novosAcabamentos = [...acabamentosAtuais, { 
                                    id: acabDisp.id, 
                                    nome: acabDisp.nome_acabamento, 
                                    valor_m2: safeParseFloat(acabDisp.valor_m2, 0),
                                    valor_un: safeParseFloat(acabDisp.valor_un, 0),
                                    tipo_aplicacao: acabDisp.tipo_aplicacao,
                                  }];
                                } else {
                                  novosAcabamentos = acabamentosAtuais.filter(acab => acab.id !== acabDisp.id);
                                }
                                
                                // Atualizar currentServico imediatamente para que os cálculos sejam atualizados
                                setCurrentServico(prev => ({ ...prev, acabamentos_selecionados: novosAcabamentos }));
                                onItemChange('acabamentos_selecionados', novosAcabamentos);
                                
                                console.log('✅ [Modal Consumo] Acabamentos atualizados:', {
                                  acabamentoId: acabDisp.id,
                                  acabamentoNome: acabDisp.nome_acabamento,
                                  checked,
                                  totalAcabamentos: novosAcabamentos.length,
                                  novosAcabamentos
                                });
                              }}
                              disabled={isDisabled}
                            />
                            <Label 
                              htmlFor={`acab-consumo-${acabDisp.id}`} 
                              className="flex-1 cursor-pointer select-none"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <span className={cn(
                                    "text-sm font-medium block truncate",
                                    isChecked ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-gray-100"
                                  )}>
                                    {acabDisp.nome_acabamento}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {acabDisp.cor_fundo && acabDisp.cor_fundo !== '#ffffff' && (
                                    <div 
                                      className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
                                      style={{ backgroundColor: acabDisp.cor_fundo }}
                                      title="Cor do acabamento"
                                    />
                                  )}
                                  <span className={cn(
                                    "text-sm font-semibold whitespace-nowrap",
                                    isChecked ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"
                                  )}>
                                    R$ {valorDisplay}{unidadeDisplay}
                                  </span>
                                </div>
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum acabamento ativo configurado.
                    </p>
                  )}
                </ScrollArea>
                
                {currentServico.subtotal_acabamentos > 0 && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-700 dark:text-green-200">
                        Subtotal dos Acabamentos
                      </span>
                      <span className="text-lg font-bold text-green-900 dark:text-green-50">
                        R$ {safeParseFloat(currentServico.subtotal_acabamentos || 0).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="mt-6 flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsConsumoMaterialModalOpen(false)}
              disabled={isSaving}
            >
              Fechar
            </Button>
            <Button 
              onClick={() => {
                if (!currentServico || !currentServico.consumo_material_utilizado) {
                  toast({
                    title: "Erro",
                    description: "Preencha o material utilizado antes de finalizar.",
                    variant: "destructive"
                  });
                  return;
                }

                // Converter dimensões de cm para m
                const larguraCm = safeParseFloat(currentServico.consumo_largura_peca, 0);
                const alturaCm = safeParseFloat(currentServico.consumo_altura_peca, 0);
                const larguraM = larguraCm > 0 ? larguraCm / 100 : 0;
                const alturaM = alturaCm > 0 ? alturaCm / 100 : 0;

                // Calcular valor unitário m² baseado APENAS no custo das chapas (sem acabamentos)
                // Os acabamentos são calculados separadamente no formulário principal
                const quantidadeSolicitada = parseInt(currentServico.consumo_quantidade_solicitada || '1', 10) || 1;
                const areaPecaM2 = larguraM * alturaM;
                // O consumo_custo_total inclui acabamentos, então precisamos calcular apenas o custo das chapas
                const larguraChapa = safeParseFloat(currentServico.consumo_largura_chapa, 0);
                const alturaChapa = safeParseFloat(currentServico.consumo_altura_chapa, 0);
                const valorChapa = safeParseFloat(currentServico.consumo_valor_unitario_chapa, 0);
                // Usar algoritmo de empacotamento otimizado que considera rotação das peças
                const pecasPorChapa = calcularPecasPorChapaOtimizado(larguraCm, alturaCm, larguraChapa, alturaChapa);
                const chapasNecessarias = pecasPorChapa > 0 ? Math.ceil(quantidadeSolicitada / pecasPorChapa) : 0;
                const custoApenasChapas = chapasNecessarias * valorChapa;
                const valorUnitarioM2 = areaPecaM2 > 0 && quantidadeSolicitada > 0 
                  ? custoApenasChapas / (areaPecaM2 * quantidadeSolicitada)
                  : 0;

                // Buscar produto pelo nome do material
                let produtoEncontrado = null;
                if (Array.isArray(produtosCadastrados) && currentServico.consumo_material_utilizado) {
                  produtoEncontrado = produtosCadastrados.find(p => 
                    p.nome && p.nome.toLowerCase().trim() === currentServico.consumo_material_utilizado.toLowerCase().trim() &&
                    (p.unidade_medida === 'm2' || p.unidadeMedida === 'm2' || p.tipo_produto === 'm2')
                  );
                  
                  console.log('🔍 [OSItemForm] Buscando produto:', {
                    material_utilizado: currentServico.consumo_material_utilizado,
                    produto_encontrado: produtoEncontrado ? produtoEncontrado.nome : null,
                    produto_id: produtoEncontrado ? produtoEncontrado.id : null
                  });
                }

                const larguraFormatada = larguraM > 0 ? larguraM.toFixed(2).replace('.', ',') : '';
                const alturaFormatada = alturaM > 0 ? alturaM.toFixed(2).replace('.', ',') : '';
                const quantidadeString = String(quantidadeSolicitada);
                let valorUnitarioFormatado = '';
                let valorUnitarioM2Final = 0;

                // Priorizar o valor calculado do custo das chapas
                if (valorUnitarioM2 > 0) {
                  valorUnitarioM2Final = valorUnitarioM2;
                  valorUnitarioFormatado = valorUnitarioM2.toFixed(2).replace('.', ',');
                } else if (produtoEncontrado) {
                  // Se não calculou pelo custo, usar o preço de venda do produto
                  const valorProduto = safeParseFloat(produtoEncontrado.preco_m2 || produtoEncontrado.preco_metro_linear || produtoEncontrado.preco_venda || 0);
                  if (valorProduto > 0) {
                    valorUnitarioM2Final = valorProduto;
                    valorUnitarioFormatado = valorProduto.toFixed(2).replace('.', ',');
                  }
                } else if (isEditing && itemAtual?.valor_unitario_m2) {
                  // Se está editando e não encontrou produto, preservar o valor existente
                  valorUnitarioM2Final = safeParseFloat(itemAtual.valor_unitario_m2, 0);
                  if (valorUnitarioM2Final > 0) {
                    valorUnitarioFormatado = valorUnitarioM2Final.toFixed(2).replace('.', ',');
                  }
                }
                
                console.log('💰 [OSItemForm] Valor unitário m² calculado:', {
                  valorUnitarioM2_calculado: valorUnitarioM2,
                  valorUnitarioM2Final,
                  valorUnitarioFormatado,
                  produtoEncontrado: produtoEncontrado ? produtoEncontrado.nome : null,
                  isEditing,
                  itemAtual_valor_unitario_m2: itemAtual?.valor_unitario_m2
                });

                // IMPORTANTE: Sempre usar os valores calculados do consumoCalculos quando disponíveis
                // Isso garante que os valores sejam atualizados quando o usuário edita
                const custoTotalMaterial = consumoCalculos.custoTotal ?? safeParseFloat(currentServico.consumo_custo_total, 0);
                const custoUnitarioCalculado = consumoCalculos.custoUnitario ?? safeParseFloat(currentServico.consumo_custo_unitario, 0);
                
                console.log('💰 [OSItemForm] Valores de custo calculados:', {
                  consumoCalculos_custoTotal: consumoCalculos.custoTotal,
                  consumoCalculos_custoUnitario: consumoCalculos.custoUnitario,
                  currentServico_custoTotal: currentServico.consumo_custo_total,
                  currentServico_custoUnitario: currentServico.consumo_custo_unitario,
                  custoTotalMaterial_final: custoTotalMaterial,
                  custoUnitarioCalculado_final: custoUnitarioCalculado,
                  observacao: 'Usando valores calculados do consumoCalculos para garantir atualização'
                });

                // Criar item atualizado COM os dados do consumo de material
                // NÃO atualizar os campos do formulário principal (fora do modal)
                // Apenas criar o item completo e adicionar diretamente à lista
                // Validar se temos os dados mínimos necessários antes de criar o item
                if (!larguraFormatada || !alturaFormatada || larguraFormatada === '0,00' || alturaFormatada === '0,00') {
                  toast({
                    title: "Dados incompletos",
                    description: "Preencha a largura e altura da peça antes de finalizar.",
                    variant: "destructive"
                  });
                  return;
                }
                
                // Se não encontrou o produto, ainda podemos adicionar o item sem produto_id
                // mas é melhor avisar o usuário
                if (!produtoEncontrado && currentServico.consumo_material_utilizado) {
                  console.warn('⚠️ [OSItemForm] Produto não encontrado no banco:', currentServico.consumo_material_utilizado);
                  // Não bloquear a adição, mas o produto_id ficará null
                }
                
                // IMPORTANTE: Quando estamos editando um item com origem "Consumo de Material",
                // substituir TODAS as informações com as novas do consumo de material
                // Isso garante que as medidas e valores atualizados sejam aplicados
                const temOrigemConsumoMaterial = isEditing && itemAtual && (
                  itemAtual.consumo_material_utilizado || 
                  itemAtual.consumo_largura_peca || 
                  itemAtual.consumo_altura_peca
                );
                
                // Se tem origem consumo de material, usar as novas informações do modal
                // Caso contrário, preservar os campos originais
                const larguraFinal = temOrigemConsumoMaterial ? larguraFormatada : (isEditing && itemAtual?.largura ? itemAtual.largura : larguraFormatada);
                const alturaFinal = temOrigemConsumoMaterial ? alturaFormatada : (isEditing && itemAtual?.altura ? itemAtual.altura : alturaFormatada);
                const quantidadeFinal = temOrigemConsumoMaterial ? quantidadeString : (isEditing && itemAtual?.quantidade ? itemAtual.quantidade : quantidadeString);
                
                // IMPORTANTE: Sempre usar o valor calculado quando disponível, para garantir atualização
                // Se tem origem consumo de material, SEMPRE usar o valor calculado (atualizado)
                // Isso garante que quando o usuário edita, os valores sejam atualizados
                let valorUnitarioM2FinalString = '';
                if (temOrigemConsumoMaterial) {
                  // Quando está editando item de consumo de material, sempre usar o valor calculado
                  if (valorUnitarioFormatado) {
                    valorUnitarioM2FinalString = valorUnitarioFormatado;
                  } else if (isEditing && itemAtual?.valor_unitario_m2) {
                    // Se não calculou mas está editando, usar o valor existente
                    valorUnitarioM2FinalString = itemAtual.valor_unitario_m2;
                  } else {
                    valorUnitarioM2FinalString = '0,00';
                  }
                } else {
                  // Se não tem origem consumo de material, preservar o valor existente se estiver editando
                  valorUnitarioM2FinalString = isEditing && itemAtual?.valor_unitario_m2 
                    ? itemAtual.valor_unitario_m2 
                    : (valorUnitarioFormatado || currentServico.valor_unitario_m2 || '0,00');
                }
                
                console.log('💰 [OSItemForm] Valor unitário m² final:', {
                  temOrigemConsumoMaterial,
                  valorUnitarioFormatado,
                  valorUnitarioM2FinalString,
                  isEditing,
                  itemAtual_valor_unitario_m2: itemAtual?.valor_unitario_m2
                });
                const nomeFinal = temOrigemConsumoMaterial ? (currentServico.consumo_material_utilizado || 'Material não cadastrado') : (isEditing && itemAtual?.nome_servico_produto ? itemAtual.nome_servico_produto : (currentServico.consumo_material_utilizado || 'Material não cadastrado'));
                const produtoIdFinal = temOrigemConsumoMaterial ? (produtoEncontrado ? produtoEncontrado.id : null) : (isEditing && itemAtual?.produto_id ? itemAtual.produto_id : (produtoEncontrado ? produtoEncontrado.id : null));
                
                const camposParaAtualizar = {
                  nome_servico_produto: nomeFinal,
                  produto_id: produtoIdFinal,
                  largura: larguraFinal,
                  altura: alturaFinal,
                  quantidade: quantidadeFinal,
                  valor_unitario_m2: valorUnitarioM2FinalString,
                  valor_unitario: valorUnitarioM2FinalString,
                  acabamentos_selecionados: Array.isArray(currentServico.acabamentos_selecionados) ? currentServico.acabamentos_selecionados : [],
                  subtotal_acabamentos: currentServico.subtotal_acabamentos !== undefined ? currentServico.subtotal_acabamentos : 0,
                  detalhes: currentServico.detalhes || '',
                  consumo_material_utilizado: currentServico.consumo_material_utilizado,
                  // IMPORTANTE: Converter valores de centímetros para metros antes de salvar
                  // Os valores vêm em cm do formulário, mas devem ser salvos em metros no banco
                  consumo_largura_peca: String(larguraCm / 100), // Converter cm para m
                  consumo_altura_peca: String(alturaCm / 100), // Converter cm para m
                  consumo_quantidade_solicitada: quantidadeString,
                  consumo_largura_chapa: String((safeParseFloat(currentServico.consumo_largura_chapa, 0) / 100)), // Converter cm para m
                  consumo_altura_chapa: String((safeParseFloat(currentServico.consumo_altura_chapa, 0) / 100)), // Converter cm para m
                  consumo_valor_unitario_chapa: String(safeParseFloat(currentServico.consumo_valor_unitario_chapa, 0)),
                  // IMPORTANTE: SEMPRE usar os valores calculados do consumoCalculos para substituir os antigos
                  // Isso garante que o cálculo seja o mesmo feito na hora de criar uma nova OS
                  // Manter como número para cálculos corretos
                  consumo_custo_total: typeof custoTotalMaterial === 'number' ? custoTotalMaterial : safeParseFloat(custoTotalMaterial, 0),
                  consumo_custo_unitario: typeof custoUnitarioCalculado === 'number' ? custoUnitarioCalculado : safeParseFloat(custoUnitarioCalculado, 0),
                  // SEMPRE usar valores calculados do consumoCalculos (mesmo que sejam 0) para substituir os antigos
                  consumo_pecas_por_chapa: String(consumoCalculos.pecasPorChapa ?? 0),
                  consumo_chapas_necessarias: String(consumoCalculos.chapasNecessarias ?? 0),
                  consumo_aproveitamento_percentual: String(consumoCalculos.aproveitamentoPercentual ?? 0),
                  tipo_item: currentServico?.tipo_item || 'm2',
                };
                
                console.log('📦 [OSItemForm] Campos para atualizar:', {
                  ...camposParaAtualizar,
                  tem_produto_id: !!camposParaAtualizar.produto_id,
                  tem_largura: !!camposParaAtualizar.largura,
                  tem_altura: !!camposParaAtualizar.altura,
                  tem_valor_m2: !!camposParaAtualizar.valor_unitario_m2,
                  valores_calculados: {
                    pecasPorChapa: consumoCalculos.pecasPorChapa,
                    chapasNecessarias: consumoCalculos.chapasNecessarias,
                    custoTotal: consumoCalculos.custoTotal,
                    custoUnitario: consumoCalculos.custoUnitario,
                    aproveitamentoPercentual: consumoCalculos.aproveitamentoPercentual
                  },
                  valores_antigos: {
                    pecasPorChapa: currentServico.consumo_pecas_por_chapa,
                    chapasNecessarias: currentServico.consumo_chapas_necessarias,
                    custoTotal: currentServico.consumo_custo_total,
                    custoUnitario: currentServico.consumo_custo_unitario,
                    aproveitamentoPercentual: currentServico.consumo_aproveitamento_percentual
                  },
                  observacao: 'Valores calculados substituem os antigos'
                });

                // Construir o item atualizado garantindo que tenha o id_item_os para atualização correta
                // IMPORTANTE: Preservar o id_item_os do itemAtual para garantir que seja encontrado na lista
                const idItemOSParaAtualizar = isEditing && itemAtual?.id_item_os 
                  ? itemAtual.id_item_os 
                  : (currentServico.id_item_os || itemAtual?.id_item_os || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
                
                const idBancoParaAtualizar = isEditing && itemAtual?.id 
                  ? itemAtual.id 
                  : (currentServico.id || itemAtual?.id);
                
                console.log('🔑 [OSItemForm] Preservando IDs para atualização:', {
                  isEditing,
                  id_item_os_original: itemAtual?.id_item_os,
                  id_item_os_currentServico: currentServico.id_item_os,
                  id_item_os_final: idItemOSParaAtualizar,
                  id_banco_original: itemAtual?.id,
                  id_banco_final: idBancoParaAtualizar
                });
                
                const itemAtualizado = {
                  ...currentServico,
                  ...camposParaAtualizar,
                  // Garantir que o id_item_os seja preservado para atualização correta
                  id_item_os: idItemOSParaAtualizar,
                  // Preservar o id do banco se existir
                  id: idBancoParaAtualizar,
                };

                // Garantir que acabamentos_selecionados seja um array
                if (!Array.isArray(itemAtualizado.acabamentos_selecionados)) {
                  itemAtualizado.acabamentos_selecionados = Array.isArray(currentServico.acabamentos_selecionados) 
                    ? currentServico.acabamentos_selecionados 
                    : [];
                }

                // IMPORTANTE: Garantir que consumo_custo_total seja sempre o valor calculado (que inclui acabamentos)
                // Isso é crítico para o cálculo do subtotal funcionar corretamente
                // O custoTotalMaterial já vem do consumoCalculos.custoTotal, que inclui acabamentos
                itemAtualizado.consumo_custo_total = typeof custoTotalMaterial === 'number' 
                  ? custoTotalMaterial 
                  : safeParseFloat(custoTotalMaterial, 0);
                
                // Garantir que seja um número válido
                if (isNaN(itemAtualizado.consumo_custo_total) || itemAtualizado.consumo_custo_total < 0) {
                  itemAtualizado.consumo_custo_total = 0;
                }
                
                console.log('🔍 [OSItemForm] Antes de calcular subtotal:', {
                  consumo_custo_total: itemAtualizado.consumo_custo_total,
                  tipo: typeof itemAtualizado.consumo_custo_total,
                  custoTotalMaterial,
                  tipo_custoTotalMaterial: typeof custoTotalMaterial,
                  consumoCalculos_custoTotal: consumoCalculos.custoTotal,
                  quantidade: itemAtualizado.quantidade,
                  acabamentos_selecionados: itemAtualizado.acabamentos_selecionados?.length || 0,
                  observacao: 'consumo_custo_total foi atualizado com o valor calculado que inclui acabamentos'
                });
                
                // Calcular subtotal do item
                // IMPORTANTE: O itemAtualizado.consumo_custo_total agora contém o valor correto (inclui acabamentos)
                const subtotalCalculado = calcularSubtotalItem(
                  itemAtualizado,
                  Array.isArray(acabamentosConfig) ? acabamentosConfig : []
                );
                
                console.log('💰 [OSItemForm] Subtotal calculado:', {
                  subtotalCalculado,
                  consumo_custo_total: itemAtualizado.consumo_custo_total,
                  valor_unitario_m2: itemAtualizado.valor_unitario_m2,
                  quantidade: itemAtualizado.quantidade
                });
                
                itemAtualizado.subtotal_item = subtotalCalculado;

                // IMPORTANTE: Salvar os dados originais do item antes de atualizar
                // para poder restaurar o formulário principal depois
                const itemOriginalAntesAtualizacao = isEditing && itemAtual ? { ...itemAtual } : null;
                
                // IMPORTANTE: Adicionar/atualizar o item ANTES de fechar o modal e resetar
                // para garantir que o item seja processado corretamente
                let itemAdicionadoComSucesso = false;
                
                if (isEditing) {
                  if (typeof onUpdateItem === 'function') {
                    // Para edição, passar o item atualizado diretamente
                    console.log('🔄 [OSItemForm] Atualizando item com novas informações:', {
                      id_item_os: itemAtualizado.id_item_os,
                      id: itemAtualizado.id,
                      largura: itemAtualizado.largura,
                      altura: itemAtualizado.altura,
                      quantidade: itemAtualizado.quantidade,
                      valor_unitario_m2: itemAtualizado.valor_unitario_m2,
                      consumo_largura_peca: itemAtualizado.consumo_largura_peca,
                      consumo_altura_peca: itemAtualizado.consumo_altura_peca,
                      consumo_custo_total: itemAtualizado.consumo_custo_total,
                      subtotal_item: itemAtualizado.subtotal_item,
                      temOrigemConsumoMaterial
                    });
                    
                    onUpdateItem(itemAtualizado);
                    itemAdicionadoComSucesso = true;
                    // Marcar que o modal foi fechado após atualização para evitar reabrir imediatamente
                    modalFechadoAposAtualizacaoRef.current = true;
                    lastModalCloseTimestampRef.current = Date.now();
                    console.log('✅ [OSItemForm] Item atualizado - marcando modal como fechado após atualização');
                    toast({
                      title: "Item atualizado",
                      description: "Os dados de consumo foram aplicados ao item.",
                    });
                  }
                } else if (typeof onAdicionarItem === 'function') {
                  // Para adicionar, passar o item atualizado diretamente
                  // O onAdicionarItem já reseta o formulário quando recebe um item completo
                  console.log('🔵 [OSItemForm] Chamando onAdicionarItem com item do modal:', {
                    id_item_os: itemAtualizado.id_item_os,
                    nome: itemAtualizado.nome_servico_produto,
                    produto_id: itemAtualizado.produto_id,
                    tipo_item: itemAtualizado.tipo_item,
                    largura: itemAtualizado.largura,
                    altura: itemAtualizado.altura,
                    quantidade: itemAtualizado.quantidade,
                    consumo_quantidade_solicitada: itemAtualizado.consumo_quantidade_solicitada,
                    consumo_largura_peca: itemAtualizado.consumo_largura_peca,
                    consumo_altura_peca: itemAtualizado.consumo_altura_peca,
                    consumo_material_utilizado: itemAtualizado.consumo_material_utilizado,
                  });
                  
                  // Garantir que o item tenha todos os campos necessários antes de adicionar
                  if (!itemAtualizado.id_item_os) {
                    itemAtualizado.id_item_os = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    console.log('⚠️ [OSItemForm] Gerando novo id_item_os:', itemAtualizado.id_item_os);
                  }
                  
                  if (!itemAtualizado.tipo_item) {
                    itemAtualizado.tipo_item = 'm2';
                  }
                  
                  onAdicionarItem(itemAtualizado);
                  itemAdicionadoComSucesso = true;
                  toast({
                    title: "Item adicionado",
                    description: "O item foi adicionado à Ordem de Serviço com os dados de consumo.",
                  });
                }

                // Só fechar e resetar se o item foi adicionado/atualizado com sucesso
                if (itemAdicionadoComSucesso) {
                  // Fechar o modal
                  setIsConsumoMaterialModalOpen(false);
                  
                  // Se estava editando, restaurar o currentServico com os dados originais salvos
                  // para não afetar o formulário principal com as alterações do consumo de material
                  if (isEditing && itemOriginalAntesAtualizacao) {
                    // Restaurar currentServico com os dados originais do item
                    // Isso garante que o formulário principal não mostre as alterações do consumo de material
                    currentServicoRestauradoRef.current = true;
                    setCurrentServico(itemOriginalAntesAtualizacao);
                  } else {
                    // Se não estava editando, resetar para estado inicial
                    setCurrentServico(initialServicoM2State());
                  }
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isSaving || isOSFinalizada || !currentServico}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Preencher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Clonagem de Consumo */}
      <Dialog open={isClonarConsumoModalOpen} onOpenChange={setIsClonarConsumoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-purple-500" />
              Clonar Medidas de Consumo
            </DialogTitle>
            <DialogDescription>
              Selecione um item que já possui medidas de consumo preenchidas para clonar: Quantidade Solicitada, Peça - Largura e Peça - Altura.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {(() => {
              // Filtrar itens que têm dados de consumo preenchidos
              const itensComConsumo = (ordemServico?.itens || []).filter(item => {
                // Não incluir o item atual se estiver editando
                if (isEditing && itemAtual?.id_item_os && item.id_item_os === itemAtual.id_item_os) {
                  return false;
                }
                
                // Verificar se tem os 3 campos preenchidos
                const temQuantidade = item.consumo_quantidade_solicitada && parseFloat(String(item.consumo_quantidade_solicitada).replace(',', '.')) > 0;
                const temLargura = item.consumo_largura_peca && parseFloat(String(item.consumo_largura_peca).replace(',', '.')) > 0;
                const temAltura = item.consumo_altura_peca && parseFloat(String(item.consumo_altura_peca).replace(',', '.')) > 0;
                
                return temQuantidade && temLargura && temAltura;
              });

              if (itensComConsumo.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum item disponível para clonagem.</p>
                    <p className="text-xs mt-2">
                      Adicione itens com medidas de consumo preenchidas.
                    </p>
                  </div>
                );
              }

              return (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Selecione o item para clonar as medidas:</p>
                    <ScrollArea className="h-[300px] border rounded-lg">
                      <div className="p-2 space-y-2">
                        {itensComConsumo.map((item) => {
                          const getItemNome = (item) => {
                            return item.nome_servico_produto || item.nome_produto || 'Item sem nome';
                          };

                          const formatarMedidas = (item) => {
                            const quantidade = item.consumo_quantidade_solicitada || 0;
                            // Converter valores de metros para centímetros para exibição
                            const normalizarParaExibicao = (valor) => {
                              if (!valor) return 0;
                              const numValor = safeParseFloat(String(valor).replace(',', '.'), 0);
                              if (numValor <= 0) return 0;
                              // Se o valor é muito grande (> 10000), pode ser um erro de dupla conversão
                              if (numValor > 10000) {
                                return numValor / 100;
                              } else if (numValor >= 10) {
                                // Valores >= 10 provavelmente já estão em centímetros
                                return numValor;
                              } else {
                                // Valores < 10 provavelmente estão em metros (dados do banco normalizados)
                                // Converter para centímetros: 0.1 metro = 10 cm, 0.5 metro = 50 cm
                                return numValor * 100;
                              }
                            };
                            const largura = normalizarParaExibicao(item.consumo_largura_peca);
                            const altura = normalizarParaExibicao(item.consumo_altura_peca);
                            return `Qtd: ${quantidade} | ${Math.round(largura)}cm x ${Math.round(altura)}cm`;
                          };

                          return (
                            <button
                              key={item.id_item_os}
                              onClick={() => {
                                // Clonar apenas os 3 campos específicos
                                const quantidade = String(item.consumo_quantidade_solicitada || '');
                                
                                // IMPORTANTE: Converter valores de metros para centímetros ao clonar
                                // Os valores no banco estão em metros, mas o modal espera centímetros
                                const normalizarValorParaClonagem = (valor) => {
                                  if (!valor) return '';
                                  const numValor = safeParseFloat(String(valor).replace(',', '.'), 0);
                                  if (numValor <= 0) return '';
                                  
                                  // Função auxiliar para formatar número removendo zeros desnecessários
                                  const formatarNumero = (num) => {
                                    // Usar toFixed para limitar casas decimais e depois remover zeros à direita
                                    const formatted = num.toFixed(6).replace(/\.?0+$/, '');
                                    return formatted.replace('.', ',');
                                  };
                                  
                                  // Se o valor é muito grande (> 10000), pode ser um erro de dupla conversão
                                  if (numValor > 10000) {
                                    return formatarNumero(numValor / 100);
                                  } else if (numValor >= 10) {
                                    // Valores >= 10 provavelmente já estão em centímetros
                                    return formatarNumero(numValor);
                                  } else {
                                    // Valores < 10 provavelmente estão em metros (dados do banco normalizados)
                                    // Converter para centímetros: 0.1 metro = 10 cm, 0.5 metro = 50 cm
                                    return formatarNumero(numValor * 100);
                                  }
                                };
                                
                                const largura = normalizarValorParaClonagem(item.consumo_largura_peca);
                                const altura = normalizarValorParaClonagem(item.consumo_altura_peca);

                                // Atualizar o currentServico diretamente para que apareça imediatamente no modal
                                setCurrentServico(prev => ({
                                  ...prev,
                                  consumo_quantidade_solicitada: quantidade,
                                  consumo_largura_peca: largura,
                                  consumo_altura_peca: altura,
                                }));

                                // Também atualizar via onItemChange para manter sincronizado com itemAtual
                                onItemChange('consumo_quantidade_solicitada', quantidade);
                                onItemChange('consumo_largura_peca', largura);
                                onItemChange('consumo_altura_peca', altura);

                                setIsClonarConsumoModalOpen(false);
                                
                                // Formatar para exibição no toast (valores já convertidos para cm)
                                const larguraNum = safeParseFloat(largura.replace(',', '.'), 0);
                                const alturaNum = safeParseFloat(altura.replace(',', '.'), 0);
                                toast({
                                  title: "Medidas Clonadas",
                                  description: `Medidas de consumo clonadas com sucesso: Qtd: ${quantidade} | ${Math.round(larguraNum)}cm x ${Math.round(alturaNum)}cm`,
                                });
                              }}
                              className="w-full p-3 text-left border rounded-lg transition-all border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm">{getItemNome(item)}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatarMedidas(item)}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsClonarConsumoModalOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OSItemForm;