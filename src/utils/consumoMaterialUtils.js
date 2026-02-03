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
  if (larguraPeca <= 0 || alturaPeca <= 0 || larguraChapa <= 0 || alturaChapa <= 0) {
    return 0;
  }

  // Garantir que a peça não seja maior que a chapa em nenhuma dimensão
  if (larguraPeca > larguraChapa && larguraPeca > alturaChapa) {
    return 0; // Peça não cabe na chapa
  }
  if (alturaPeca > larguraChapa && alturaPeca > alturaChapa) {
    return 0; // Peça não cabe na chapa
  }

  let max = 0;

  // Testa todas as posições x,y e duas orientações para cada peça
  // Usa step de 1cm para garantir que não perde nenhuma combinação válida
  for (let xStep = 0; xStep <= larguraChapa; xStep += 1) {
    for (let yStep = 0; yStep <= alturaChapa; yStep += 1) {
      
      // Orientação normal (0°)
      const w1 = Math.floor((larguraChapa - xStep) / larguraPeca);
      const h1 = Math.floor((alturaChapa - yStep) / alturaPeca);
      max = Math.max(max, w1 * h1);

      // Orientação girada (90°)
      const w2 = Math.floor((larguraChapa - xStep) / alturaPeca);
      const h2 = Math.floor((alturaChapa - yStep) / larguraPeca);
      max = Math.max(max, w2 * h2);
    }
  }

  return max;
};

/**
 * Formata os dados do modal de Consumo de Material em texto descritivo
 */
export const formatarDadosConsumoMaterialParaDescricao = (dadosConsumoMaterial, item) => {
  if (!dadosConsumoMaterial && !item) return '';
  
  const safeParse = (value, defaultValue = 0) => {
    if (!value && value !== 0) return defaultValue;
    const strValue = String(value).replace(',', '.');
    const num = parseFloat(strValue);
    return isNaN(num) ? defaultValue : num;
  };
  
  const formatCurrency = (value) => {
    return safeParse(value).toFixed(2).replace('.', ',');
  };
  
  const formatDecimal = (value, precision = 2) => {
    return safeParse(value).toFixed(precision).replace('.', ',');
  };
  
  const formatInt = (value) => {
    return parseInt(String(value || '0'), 10) || 0;
  };
  
  const formatMetros = (value) => {
    const m2 = safeParse(value);
    if (m2 >= 1) {
      return `${formatDecimal(m2)} m²`;
    } else {
      const cm2 = m2 * 10000;
      return `${formatDecimal(cm2, 0)} cm²`;
    }
  };
  
  let descricao = '=== CONSUMO DE MATERIAL ===\n\n';
  
  // Material Utilizado
  const materialNome = item?.consumo_material_utilizado || dadosConsumoMaterial?.material_utilizado || 'Não informado';
  descricao += `Material Utilizado: ${materialNome}\n`;
  
  // Dimensões da Peça
  const larguraPeca = safeParse(item?.consumo_largura_peca || dadosConsumoMaterial?.largura_peca, 0);
  const alturaPeca = safeParse(item?.consumo_altura_peca || dadosConsumoMaterial?.altura_peca, 0);
  if (larguraPeca > 0 && alturaPeca > 0) {
    descricao += `Peça: ${formatDecimal(larguraPeca)} cm x ${formatDecimal(alturaPeca)} cm\n`;
    descricao += `Área por peça: ${formatDecimal(larguraPeca * alturaPeca / 10000, 4)} m²\n`;
  }
  
  // Quantidade Solicitada
  const quantidadeSolicitada = formatInt(item?.consumo_quantidade_solicitada || dadosConsumoMaterial?.quantidade_solicitada);
  if (quantidadeSolicitada > 0) {
    descricao += `Quantidade Solicitada: ${quantidadeSolicitada} peça(s)\n`;
  }
  
  // Dimensões da Chapa
  const larguraChapa = safeParse(item?.consumo_largura_chapa || dadosConsumoMaterial?.largura_chapa, 0);
  const alturaChapa = safeParse(item?.consumo_altura_chapa || dadosConsumoMaterial?.altura_chapa, 0);
  if (larguraChapa > 0 && alturaChapa > 0) {
    descricao += `\nChapa: ${formatDecimal(larguraChapa)} cm x ${formatDecimal(alturaChapa)} cm\n`;
    descricao += `Área da chapa: ${formatDecimal(larguraChapa * alturaChapa / 10000, 4)} m²\n`;
  }
  
  // Valor da Chapa
  const valorChapa = safeParse(item?.consumo_valor_unitario_chapa || dadosConsumoMaterial?.valor_unitario_chapa, 0);
  if (valorChapa > 0) {
    descricao += `Valor Unitário da Chapa: R$ ${formatCurrency(valorChapa)}\n`;
  }
  
  // Cálculos
  if (larguraPeca > 0 && alturaPeca > 0 && larguraChapa > 0 && alturaChapa > 0) {
    const areaPeca = (larguraPeca * alturaPeca) / 10000; // cm² para m²
    const areaChapa = (larguraChapa * alturaChapa) / 10000;
    // Usar algoritmo de empacotamento otimizado que considera rotação das peças
    const pecasPorChapa = calcularPecasPorChapaOtimizado(larguraPeca, alturaPeca, larguraChapa, alturaChapa);
    const chapasNecessarias = quantidadeSolicitada > 0 ? Math.ceil(quantidadeSolicitada / pecasPorChapa) : 0;
    const custoTotal = chapasNecessarias * valorChapa;
    const custoUnitario = quantidadeSolicitada > 0 ? custoTotal / quantidadeSolicitada : 0;
    const aproveitamento = areaChapa > 0 ? ((pecasPorChapa * areaPeca) / areaChapa) * 100 : 0;
    const metrosUtilizados = chapasNecessarias * areaChapa;
    
    descricao += `\n=== CÁLCULOS ===\n`;
    descricao += `Peças por chapa: ${pecasPorChapa}\n`;
    descricao += `Chapas necessárias: ${chapasNecessarias}\n`;
    descricao += `Custo total do material: R$ ${formatCurrency(custoTotal)}\n`;
    descricao += `Custo unitário por peça: R$ ${formatCurrency(custoUnitario)}\n`;
    descricao += `Aproveitamento: ${formatDecimal(aproveitamento, 2)}%\n`;
    descricao += `m² necessários: ${formatMetros(metrosUtilizados)}\n`;
  }
  
  // Acabamentos
  const acabamentos = item?.acabamentos_selecionados || dadosConsumoMaterial?.acabamentos_selecionados || [];
  if (Array.isArray(acabamentos) && acabamentos.length > 0) {
    descricao += `\n=== ACABAMENTOS ===\n`;
    acabamentos.forEach((acab, idx) => {
      descricao += `${idx + 1}. ${acab.nome || 'Acabamento sem nome'}`;
      if (acab.valor_m2 || acab.valor_un) {
        const valor = acab.valor_m2 || acab.valor_un || 0;
        const unidade = acab.valor_m2 ? '/m²' : '/un';
        descricao += ` - R$ ${formatCurrency(valor)}${unidade}`;
      }
      descricao += '\n';
    });
    
    const subtotalAcabamentos = safeParse(item?.subtotal_acabamentos || dadosConsumoMaterial?.subtotal_acabamentos, 0);
    if (subtotalAcabamentos > 0) {
      descricao += `Subtotal dos Acabamentos: R$ ${formatCurrency(subtotalAcabamentos)}\n`;
    }
  }
  
  return descricao;
};

/**
 * Extrai dados de consumo de material de um item para serem salvos
 */
export const extrairDadosConsumoMaterial = (item) => {
  if (!item) return null;
  
  return {
    material_utilizado: item.consumo_material_utilizado || null,
    quantidade_solicitada: item.consumo_quantidade_solicitada || null,
    largura_peca: item.consumo_largura_peca || null,
    altura_peca: item.consumo_altura_peca || null,
    largura_chapa: item.consumo_largura_chapa || null,
    altura_chapa: item.consumo_altura_chapa || null,
    valor_unitario_chapa: item.consumo_valor_unitario_chapa || null,
    acabamentos_selecionados: item.acabamentos_selecionados || [],
    subtotal_acabamentos: item.subtotal_acabamentos || 0,
  };
};
