export const calcularOrcamentoCompleto = (currentOrcamento, adminSettings = {}) => {
  
  let areaTotalM2 = 0;
  let custoTotalAdicionaisCalculado = 0;
  let custoTotalMaterial = 0;
  
  if (Array.isArray(currentOrcamento.selectedPecas)) {
    currentOrcamento.selectedPecas.forEach(item => {
      const alturaM = parseFloat(String(item.parte?.altura || '0').replace(',', '.')) || 0;
      const larguraM = parseFloat(String(item.parte?.largura || '0').replace(',', '.')) || 0;
      const quantidade = parseInt(item.quantidade, 10) || 0;
      const areaPeca = alturaM * larguraM * quantidade;
      
      // Só adicionar à área total se não for um produto sem medidas
      if (!item.parte?.isProdutoSemMedidas) {
        areaTotalM2 += areaPeca;
      }

      // Calcular custo do material para esta peça específica
      const produtoPeca = item.produto || currentOrcamento.produto;
      if (produtoPeca) {
        const temPromocao = produtoPeca.promocao_ativa && parseFloat(produtoPeca.preco_promocional || 0) > 0;
        const precoMetroQuadrado = temPromocao 
          ? parseFloat(String(produtoPeca.preco_promocional || '0').replace(',', '.')) || 0
          : parseFloat(String(produtoPeca.preco_venda || produtoPeca.valorMetroQuadrado || produtoPeca.preco_m2 || '0').replace(',', '.')) || 0;
        
        
        let custoMaterialPeca = 0;
        
        // Se for produto sem medidas, calcular por quantidade
        if (item.parte?.isProdutoSemMedidas) {
          custoMaterialPeca = precoMetroQuadrado * quantidade;
        } else {
          // Produto com medidas, calcular por área
          custoMaterialPeca = areaPeca * precoMetroQuadrado;
        }
        
        custoTotalMaterial += custoMaterialPeca;
      }

      // Calcular serviços adicionais para esta peça específica
      // Os serviços agora vêm do banco e são calculados baseados na sua unidade
      if (item.servicosAdicionais && typeof item.servicosAdicionais === 'object') {
        Object.entries(item.servicosAdicionais).forEach(([servicoKey, checked]) => {
          if (checked) {
            // O servicoKey agora é o ID do serviço no banco
            // Precisamos buscar o preço do serviço nos adminSettings
            if (adminSettings.servicosAdicionais) {
              const servico = adminSettings.servicosAdicionais.find(s => s.id.toString() === servicoKey);
              if (servico) {
                const valorServico = parseFloat(servico.preco) || 0;
                let custoServicoPeca = 0;
                
                // Calcular baseado na unidade do serviço
                if (servico.unidade === 'm²' || servico.unidade === 'm2') {
                  // Serviços por m²: multiplicar pela área da peça (só se não for produto sem medidas)
                  if (item.parte?.isProdutoSemMedidas) {
                    // Para produtos sem medidas, não aplicar serviços por m²
                    custoServicoPeca = 0;
                  } else {
                    custoServicoPeca = valorServico * areaPeca;
                  }
                } else if (servico.unidade === 'unidade' || servico.unidade === 'un') {
                  // Serviços por unidade: multiplicar pela quantidade
                  custoServicoPeca = valorServico * quantidade;
                } else {
                  // Para outras unidades, assumir por m² como padrão (só se não for produto sem medidas)
                  if (item.parte?.isProdutoSemMedidas) {
                    custoServicoPeca = 0;
                  } else {
                    custoServicoPeca = valorServico * areaPeca;
                  }
                }
                
                custoTotalAdicionaisCalculado += custoServicoPeca;
              }
            }
          }
        });
      }
    });
  }

  // Não precisamos mais da estrutura antiga dos adicionais
  // Os serviços são gerenciados dinamicamente no frontend

  // Calcular desconto e frete
  const descontoValor = parseFloat(String(currentOrcamento.desconto || '0').replace(',', '.')) || 0;
  const descontoTipo = currentOrcamento.descontoTipo || 'percentual';
  const frete = parseFloat(String(currentOrcamento.frete || '0').replace(',', '.')) || 0;
  
  // Calcular subtotal antes do desconto
  const subtotal = custoTotalMaterial + custoTotalAdicionaisCalculado;
  
  // Calcular desconto baseado no tipo
  let descontoCalculado = 0;
  if (descontoTipo === 'percentual') {
    // Desconto percentual
    descontoCalculado = (subtotal * descontoValor) / 100;
  } else {
    // Desconto em valor fixo
    descontoCalculado = descontoValor;
  }
  
  // Total final: Material + Adicionais - Desconto + Frete
  const orcamentoTotal = subtotal - descontoCalculado + frete;


  return {
    ...currentOrcamento,
    areaTotalM2: parseFloat(areaTotalM2.toFixed(4)) || 0,
    custoTotalMaterial: parseFloat(custoTotalMaterial.toFixed(2)) || 0,
    // Não precisamos mais da estrutura antiga dos adicionais
    custoTotalAdicionais: parseFloat(custoTotalAdicionaisCalculado.toFixed(2)) || 0,
    desconto: parseFloat(descontoValor.toFixed(2)) || 0,
    descontoTipo: descontoTipo,
    descontoCalculado: parseFloat(descontoCalculado.toFixed(2)) || 0,
    frete: parseFloat(frete.toFixed(2)) || 0,
    orcamentoTotal: parseFloat(Math.max(0, orcamentoTotal).toFixed(2)) || 0, // Evita totais negativos
  };
};