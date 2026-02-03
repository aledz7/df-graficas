import { apiDataManager } from '@/lib/apiDataManager';
import { v4 as uuidv4 } from 'uuid';
import { safeParseFloat, safeParseInt } from '@/lib/utils';

export const obterDimensoesItemParaAcabamento = (item) => {
    if (!item) {
        return {
            largura: 0,
            altura: 0,
        };
    }

    const larguraPreferencial = item.largura_item_final ?? item.largura;
    const alturaPreferencial = item.altura_item_final ?? item.altura;

    let largura = safeParseFloat(larguraPreferencial, 0);
    let altura = safeParseFloat(alturaPreferencial, 0);

    // IMPORTANTE: Os valores de consumo_largura_peca e consumo_altura_peca agora são salvos em metros no banco
    // Não é mais necessário converter de centímetros para metros
    if (!(largura > 0)) {
        const larguraPecaM = safeParseFloat(item.consumo_largura_peca, 0);
        if (larguraPecaM > 0) {
            largura = larguraPecaM; // Já está em metros
        }
    }

    if (!(altura > 0)) {
        const alturaPecaM = safeParseFloat(item.consumo_altura_peca, 0);
        if (alturaPecaM > 0) {
            altura = alturaPecaM; // Já está em metros
        }
    }

    return {
        largura,
        altura,
    };
};

export const calcularConsumoProdutoVinculadoAcabamento = (item, acabamentoDef) => {
    console.log('=== DEBUG: calcularConsumoProdutoVinculadoAcabamento ===');
    console.log('item:', item);
    console.log('acabamentoDef:', acabamentoDef);
    
    if (!item || !acabamentoDef || !acabamentoDef.produto_vinculado_id) {
        console.log('Retornando 0 - item, acabamentoDef ou produto_vinculado_id inválidos');
        return 0;
    }

    // Usa dimensões finais quando presentes (ex.: após refiles ou ajustes)
    const { largura, altura } = obterDimensoesItemParaAcabamento(item);
    const quantidadeItem = safeParseInt(item.quantidade, 1);
    const quantidadeSolicitada = safeParseInt(item.consumo_quantidade_solicitada, 0);
    const quantidadeBase = quantidadeSolicitada > 0 ? quantidadeSolicitada : quantidadeItem;
    const qtdProdPorUnidAcab = safeParseFloat(acabamentoDef.quantidade_produto_por_unidade_acabamento, 1);
    
    console.log('largura:', largura);
    console.log('altura:', altura);
    console.log('quantidadeItem:', quantidadeItem);
    console.log('quantidadeSolicitada:', quantidadeSolicitada);
    console.log('quantidadeBase:', quantidadeBase);
    console.log('qtdProdPorUnidAcab:', qtdProdPorUnidAcab);
    console.log('tipo_aplicacao:', acabamentoDef.tipo_aplicacao);
    
    let consumoProduto = 0;

    if (acabamentoDef.tipo_aplicacao === 'area_total') {
        consumoProduto = largura * altura * quantidadeBase * qtdProdPorUnidAcab;
        console.log('Cálculo area_total:', `${largura} * ${altura} * ${quantidadeBase} * ${qtdProdPorUnidAcab} = ${consumoProduto}`);
    } else if (acabamentoDef.tipo_aplicacao === 'perimetro' || acabamentoDef.tipo_aplicacao === 'metro_linear') {
        consumoProduto = (2 * (largura + altura)) * quantidadeBase * qtdProdPorUnidAcab;
        console.log('Cálculo perimetro/metro_linear:', `(2 * (${largura} + ${altura})) * ${quantidadeBase} * ${qtdProdPorUnidAcab} = ${consumoProduto}`);
    } else if (acabamentoDef.tipo_aplicacao === 'unidade') {
        consumoProduto = quantidadeBase * qtdProdPorUnidAcab;
        console.log('Cálculo unidade:', `${quantidadeBase} * ${qtdProdPorUnidAcab} = ${consumoProduto}`);
    }
    
    const resultado = isNaN(consumoProduto) ? 0 : consumoProduto;
    console.log('consumoProduto final:', resultado);
    console.log('=== FIM DEBUG: calcularConsumoProdutoVinculadoAcabamento ===');
    
    return resultado;
};

export const calcularSubtotalItem = (item, acabamentosConfig) => {
    if (!item) return 0;
    
    let subtotalBase = 0;
    const quantidade = safeParseInt(item.quantidade, 1);
    const acabamentosSelecionados = Array.isArray(item.acabamentos_selecionados) ? item.acabamentos_selecionados : [];
    const { largura: larguraAcabamento, altura: alturaAcabamento } = obterDimensoesItemParaAcabamento(item);
    const areaAcabamento = larguraAcabamento * alturaAcabamento;
    const perimetroAcabamento = (larguraAcabamento > 0 && alturaAcabamento > 0) ? 2 * (larguraAcabamento + alturaAcabamento) : 0;
    const quantidadeSolicitada = safeParseInt(item.consumo_quantidade_solicitada, 0);
    const multiplicadorQuantidade = quantidadeSolicitada > 0 ? quantidadeSolicitada : quantidade;
    
    // Se há dados de consumo de material, usar o custo do material em vez de calcular por área
    // IMPORTANTE: O consumo_custo_total é APENAS o custo do material (chapas), NÃO inclui acabamentos
    // Os acabamentos serão SOMADOS ao subtotal base depois (não substituídos)
    const temConsumoMaterial = item.consumo_custo_total !== undefined && item.consumo_custo_total !== null && item.consumo_custo_total !== '';
    const custoMaterialConsumo = temConsumoMaterial ? safeParseFloat(item.consumo_custo_total, 0) : 0;
    const custoUnitarioConsumo = safeParseFloat(item.consumo_custo_unitario, 0);
    const quantidadeSolicitadaConsumo = safeParseInt(item.consumo_quantidade_solicitada, 0);
    const subtotalAcabamentosConsumo = safeParseFloat(item.subtotal_acabamentos, 0);
    
    console.log('🔍 [calcularSubtotalItem] Verificando consumo de material:', {
        temConsumoMaterial,
        consumo_custo_total: item.consumo_custo_total,
        consumo_custo_unitario: item.consumo_custo_unitario,
        custoMaterialConsumo,
        custoUnitarioConsumo,
        quantidade: quantidade,
        quantidadeSolicitadaConsumo,
        tipo_item: item.tipo_item
    });
    
    if (item.tipo_item === 'm2') {
        // IMPORTANTE: Para itens de consumo de material, usar consumo_custo_total APENAS após editar
        // Se o item ainda não foi editado (não tem consumo_custo_total válido), calcular por área normalmente
        const temConsumoMaterial = item.consumo_material_utilizado || 
                                  item.consumo_largura_peca || 
                                  item.consumo_altura_peca;
        
        const consumoCustoTotal = safeParseFloat(item.consumo_custo_total, 0);
        const temConsumoCustoTotalValido = consumoCustoTotal > 0;
        
        // Só usar consumo_custo_total se o item tem consumo de material E já foi editado (tem consumo_custo_total válido salvo)
        if (temConsumoMaterial && temConsumoCustoTotalValido) {
            // Item já foi editado - usar o consumo_custo_total que foi salvo
            // IMPORTANTE: O consumo_custo_total JÁ inclui os acabamentos (foi calculado assim no modal)
            subtotalBase = consumoCustoTotal;
            console.log('💰 [calcularSubtotalItem] Item editado - usando consumo_custo_total como subtotal:', {
                consumo_custo_total: item.consumo_custo_total,
                consumo_custo_total_parsed: consumoCustoTotal,
                subtotalBase,
                acabamentos_selecionados: Array.isArray(item.acabamentos_selecionados) ? item.acabamentos_selecionados.length : 0,
                observacao: 'Subtotal baseado no custo total do material (item já foi editado e salvo). O consumo_custo_total JÁ inclui acabamentos.'
            });
        } else {
            // Item ainda não foi editado ou não tem consumo de material - calcular por área normalmente
            const largura = safeParseFloat(item.largura);
            const altura = safeParseFloat(item.altura);
            const valorUnitarioM2 = safeParseFloat(item.valor_unitario_m2);
            const area = largura * altura;
            subtotalBase = area * quantidade * valorUnitarioM2;
            console.log('📐 [calcularSubtotalItem] Calculando subtotal por área:', {
                largura,
                altura,
                area,
                quantidade,
                valorUnitarioM2,
                subtotalBase,
                temConsumoMaterial,
                temConsumoCustoTotalValido,
                observacao: temConsumoMaterial ? 'Item com consumo de material mas ainda não editado - calculando por área' : 'Subtotal calculado por área × quantidade × valor_unitario_m2'
            });
        }
        
        // IMPORTANTE: Para itens de consumo de material EDITADOS, o consumo_custo_total JÁ inclui acabamentos
        // Portanto, NÃO adicionar acabamentos novamente ao subtotalBase
        // Para itens sem consumo de material ou que ainda não foram editados, adicionar acabamentos normalmente
        const temConsumoMaterialComCusto = temConsumoMaterial && temConsumoCustoTotalValido;
        const deveAdicionarAcabamentos = !temConsumoMaterialComCusto;
        
        if (deveAdicionarAcabamentos && acabamentosSelecionados.length > 0 && Array.isArray(acabamentosConfig)) {
            console.log('🔍 [calcularSubtotalItem] Adicionando acabamentos:', {
                quantidadeAcabamentos: acabamentosSelecionados.length,
                subtotalBaseAntes: subtotalBase,
                areaAcabamento,
                perimetroAcabamento,
                multiplicadorQuantidade
            });
            
            acabamentosSelecionados.forEach((acabamento, index) => {
                const acabamentoDef = acabamentosConfig.find(ac => ac.id === acabamento.id);
                if (acabamentoDef) {
                    let valorAcabamento = 0;
                    let valorCalculado = 0;
                    
                    // Em nossa configuração, os preços vêm como valor_m2 e valor_un
                    if (acabamentoDef.tipo_aplicacao === 'area_total') {
                        const valorM2 = safeParseFloat(acabamentoDef.valor_m2 || acabamentoDef.valor);
                        // Garantir que o valor não seja negativo
                        const valorM2Positivo = Math.max(0, valorM2);
                        valorAcabamento = valorM2Positivo;
                        valorCalculado = areaAcabamento * multiplicadorQuantidade * valorM2Positivo;
                        subtotalBase += valorCalculado;
                        
                        console.log(`✅ [calcularSubtotalItem] Acabamento ${index + 1} (area_total):`, {
                            nome: acabamentoDef.nome || acabamento.nome,
                            valorM2,
                            areaAcabamento,
                            multiplicadorQuantidade,
                            valorCalculado,
                            subtotalBaseApos: subtotalBase
                        });
                    } else if (acabamentoDef.tipo_aplicacao === 'perimetro' || acabamentoDef.tipo_aplicacao === 'metro_linear') {
                        const valorLinear = safeParseFloat(acabamentoDef.valor_m2 || acabamentoDef.valor_un || acabamentoDef.valor);
                        // Garantir que o valor não seja negativo
                        const valorLinearPositivo = Math.max(0, valorLinear);
                        valorAcabamento = valorLinearPositivo;
                        valorCalculado = perimetroAcabamento * multiplicadorQuantidade * valorLinearPositivo;
                        subtotalBase += valorCalculado;
                        
                        console.log(`✅ [calcularSubtotalItem] Acabamento ${index + 1} (perimetro/metro_linear):`, {
                            nome: acabamentoDef.nome || acabamento.nome,
                            valorLinear,
                            perimetroAcabamento,
                            multiplicadorQuantidade,
                            valorCalculado,
                            subtotalBaseApos: subtotalBase
                        });
                    } else if (acabamentoDef.tipo_aplicacao === 'unidade') {
                        const valorUn = safeParseFloat(acabamentoDef.valor_un || acabamentoDef.valor);
                        // Garantir que o valor não seja negativo
                        const valorUnPositivo = Math.max(0, valorUn);
                        valorAcabamento = valorUnPositivo;
                        valorCalculado = multiplicadorQuantidade * valorUnPositivo;
                        subtotalBase += valorCalculado;
                        
                        console.log(`✅ [calcularSubtotalItem] Acabamento ${index + 1} (unidade):`, {
                            nome: acabamentoDef.nome || acabamento.nome,
                            valorUn,
                            multiplicadorQuantidade,
                            valorCalculado,
                            subtotalBaseApos: subtotalBase
                        });
                    }
                    
                    // Verificar se o valor calculado é negativo (isso indicaria um problema)
                    if (valorCalculado < 0) {
                        console.error('❌ [calcularSubtotalItem] ATENÇÃO: Valor de acabamento calculado é NEGATIVO!', {
                            acabamento: acabamentoDef.nome || acabamento.nome,
                            valorCalculado,
                            valorAcabamento,
                            tipo_aplicacao: acabamentoDef.tipo_aplicacao
                        });
                    }
                } else {
                    console.warn(`⚠️ [calcularSubtotalItem] Acabamento ${index + 1} não encontrado na configuração:`, acabamento.id);
                }
            });
            
            console.log('✅ [calcularSubtotalItem] Subtotal final após SOMAR acabamentos:', {
                subtotalBaseFinal: subtotalBase,
                quantidadeAcabamentos: acabamentosSelecionados.length,
                acabamentos: acabamentosSelecionados.map(a => a.nome || a.id)
            });
        } else {
            console.log('ℹ️ [calcularSubtotalItem] Nenhum acabamento selecionado, subtotal base:', subtotalBase);
        }
    } else if (item.tipo_item === 'unidade') {
        const valorUnitario = safeParseFloat(item.valor_unitario);
        subtotalBase = quantidade * valorUnitario;
        
        // Adicionar valor dos acabamentos para itens do tipo unidade
        if (acabamentosSelecionados.length > 0 && Array.isArray(acabamentosConfig)) {
            acabamentosSelecionados.forEach(acabamento => {
                const acabamentoDef = acabamentosConfig.find(ac => ac.id === acabamento.id);
                if (acabamentoDef) {
                    const valorUn = safeParseFloat(acabamentoDef.valor_un || acabamentoDef.valor);
                    subtotalBase += quantidade * valorUn;
                }
            });
        }
    }
    
    const resultado = isNaN(subtotalBase) ? 0 : parseFloat(subtotalBase.toFixed(2));
    return resultado;
};


export const calcularTotalOS = async (ordemServico, clienteSelecionado = null) => {
    console.log('🚀 [calcularTotalOS] Iniciando cálculo:', {
        tem_ordemServico: !!ordemServico,
        itens_array: Array.isArray(ordemServico?.itens),
        quantidade_itens: ordemServico?.itens?.length || 0,
        valor_total_os_salvo: ordemServico?.valor_total_os,
        itens: ordemServico?.itens
    });
    
    const defaultTotals = {
        subtotalServicosM2: 0,
        subtotalProdutosUnidade: 0,
        totalAcabamentos: 0,
        subtotalGeral: 0,
        descontoTerceirizado: 0,
        descontoGeral: 0,
        totalGeral: 0,
        custoTotalProdutosVinculadosAcabamentos: 0,
    };

    if (!ordemServico || !Array.isArray(ordemServico.itens)) {
        console.log('⚠️ [calcularTotalOS] Retornando totais padrão: ordemServico ou itens inválidos');
        return defaultTotals;
    }

    if (ordemServico.itens.length === 0) {
        console.log('⚠️ [calcularTotalOS] Retornando totais padrão: nenhum item na OS');
        return defaultTotals;
    }
    
    // IMPORTANTE: Sempre recalcular o total com base nos valores atuais dos itens
    // Não preservar valor_total_os salvo para garantir que os valores atualizados sejam usados
    const valorTotalSalvo = safeParseFloat(ordemServico.valor_total_os, 0);
    const temValorTotalSalvo = valorTotalSalvo > 0;
    
    if (temValorTotalSalvo) {
        console.log('ℹ️ [calcularTotalOS] OS tem valor_total_os salvo, mas recalculando com valores atuais:', {
            valor_total_os_salvo: valorTotalSalvo,
            observacao: 'Recalculando para garantir que valores atualizados sejam usados'
        });
    }
    
    let subtotalServicosM2 = 0;
    let subtotalProdutosUnidade = 0;
    let totalAcabamentos = 0;
    let custoTotalProdutosVinculadosAcabamentos = 0;
    let subtotalGeralItens = 0;

    const acabamentosConfig = JSON.parse(await apiDataManager.getItem('acabamentos_config') || '[]');

    ordemServico.itens.forEach((item, index) => {
        const quantidade = safeParseInt(item.quantidade, 1);
        const itemAcabamentosSelecionados = Array.isArray(item.acabamentos_selecionados) ? item.acabamentos_selecionados : [];

        if (item.tipo_item === 'm2') {
            const largura = safeParseFloat(item.largura);
            const altura = safeParseFloat(item.altura);
            const valorUnitarioM2 = safeParseFloat(item.valor_unitario_m2);

            const area = largura * altura;
            const subtotalBaseServicoM2 = area * quantidade * valorUnitarioM2;
            subtotalServicosM2 += isNaN(subtotalBaseServicoM2) ? 0 : subtotalBaseServicoM2;

            const subtotalApenasAcabamentosDoItem = safeParseFloat(item.subtotal_acabamentos);
            totalAcabamentos += isNaN(subtotalApenasAcabamentosDoItem) ? 0 : subtotalApenasAcabamentosDoItem;

            // Usar o subtotal_item já calculado (que inclui acabamentos) em vez de recalcular
            const subtotalItemCalculado = safeParseFloat(item.subtotal_item);
            
            console.log('📊 [calcularTotalOS] Item m²:', {
                index,
                nome: item.nome_produto || item.nome_servico_produto,
                subtotal_item_original: item.subtotal_item,
                subtotal_item_calculado: subtotalItemCalculado,
                tipo_subtotal: typeof item.subtotal_item,
                subtotalGeralItens_antes: subtotalGeralItens
            });
            
            subtotalGeralItens += isNaN(subtotalItemCalculado) ? 0 : subtotalItemCalculado;

            if (itemAcabamentosSelecionados.length > 0) {
                itemAcabamentosSelecionados.forEach(acabSel => {
                    if (Array.isArray(acabamentosConfig)) {
                        const acabDef = acabamentosConfig.find(ac => ac.id === acabSel.id);
                        if (acabDef && acabDef.produto_vinculado_id) {
                            const custoProdutoVinculado = safeParseFloat(acabDef.produto_vinculado_custo);
                            const consumoProduto = calcularConsumoProdutoVinculadoAcabamento(item, acabDef);
                            const custoAcabamento = consumoProduto * custoProdutoVinculado;
                            custoTotalProdutosVinculadosAcabamentos += isNaN(custoAcabamento) ? 0 : custoAcabamento;
                        }
                    }
                });
            }

        } else if (item.tipo_item === 'unidade') {
            const valorUnitario = safeParseFloat(item.valor_unitario);
            const subtotalBaseUnidade = quantidade * valorUnitario;
            const subtotalApenasAcabamentosDoItem = safeParseFloat(item.subtotal_acabamentos);
            totalAcabamentos += isNaN(subtotalApenasAcabamentosDoItem) ? 0 : subtotalApenasAcabamentosDoItem;

            // Usar o subtotal_item já calculado (que inclui acabamentos) em vez de recalcular
            const subtotalItemCalculado = safeParseFloat(item.subtotal_item);
            
            console.log('📊 [calcularTotalOS] Item unidade:', {
                index,
                nome: item.nome_produto || item.nome_servico_produto,
                subtotal_item_original: item.subtotal_item,
                subtotal_item_calculado: subtotalItemCalculado,
                tipo_subtotal: typeof item.subtotal_item,
                subtotalGeralItens_antes: subtotalGeralItens
            });
            
            subtotalProdutosUnidade += isNaN(subtotalBaseUnidade) ? 0 : subtotalBaseUnidade;
            subtotalGeralItens += isNaN(subtotalItemCalculado) ? 0 : subtotalItemCalculado;
        }
    });

    let descontoTerceirizadoValor = 0;
    if (clienteSelecionado && clienteSelecionado.classificacao_cliente === 'Terceirizado') {
        const descontoPercentualTerceirizado = safeParseFloat(ordemServico.desconto_terceirizado_percentual || clienteSelecionado.desconto_fixo_os_terceirizado, 0);
        if (descontoPercentualTerceirizado > 0) {
            descontoTerceirizadoValor = (subtotalGeralItens * descontoPercentualTerceirizado) / 100;
            descontoTerceirizadoValor = isNaN(descontoTerceirizadoValor) ? 0 : descontoTerceirizadoValor;
        }
    }
    
    const subtotalAposTerceirizado = subtotalGeralItens - descontoTerceirizadoValor;
    
    let descontoGeralValorCalculado = 0;
    const tipoDescontoGeral = ordemServico.desconto_geral_tipo || 'percentual';
    const valorDescontoGeralInput = safeParseFloat(ordemServico.desconto_geral_valor, 0);

    if (tipoDescontoGeral === 'percentual') {
        descontoGeralValorCalculado = (subtotalAposTerceirizado * valorDescontoGeralInput) / 100;
    } else { 
        descontoGeralValorCalculado = valorDescontoGeralInput;
    }
    descontoGeralValorCalculado = isNaN(descontoGeralValorCalculado) ? 0 : descontoGeralValorCalculado;

    // Adicionar frete ao cálculo
    const freteValor = safeParseFloat(ordemServico.frete_valor, 0);
    const totalGeralCalculado = subtotalAposTerceirizado - descontoGeralValorCalculado + freteValor;
    
    // IMPORTANTE: Sempre usar o valor recalculado para garantir que os valores atualizados sejam refletidos
    // Não preservar valor_total_os salvo, pois quando itens são editados, precisamos recalcular
    const totalGeralFinal = totalGeralCalculado;
    
    if (temValorTotalSalvo && Math.abs(valorTotalSalvo - totalGeralCalculado) > 0.01) {
        console.log('⚠️ [calcularTotalOS] Valor recalculado difere do salvo:', {
            valor_total_os_salvo: valorTotalSalvo,
            totalGeral_calculado: totalGeralCalculado,
            diferenca: Math.abs(valorTotalSalvo - totalGeralCalculado),
            observacao: 'Usando valor recalculado com valores atualizados dos itens'
        });
    }

    console.log('💰 [calcularTotalOS] Resumo final:', {
        subtotalGeralItens,
        descontoTerceirizadoValor,
        subtotalAposTerceirizado,
        descontoGeralValorCalculado,
        freteValor,
        totalGeral_calculado: totalGeralCalculado,
        totalGeral_final: totalGeralFinal,
        valor_total_os_salvo: valorTotalSalvo,
        usando_valor_salvo: temValorTotalSalvo,
        quantidade_itens: ordemServico.itens.length
    });

    const resultado = {
        subtotalServicosM2: isNaN(subtotalServicosM2) ? 0 : parseFloat(subtotalServicosM2.toFixed(2)),
        subtotalProdutosUnidade: isNaN(subtotalProdutosUnidade) ? 0 : parseFloat(subtotalProdutosUnidade.toFixed(2)),
        totalAcabamentos: isNaN(totalAcabamentos) ? 0 : parseFloat(totalAcabamentos.toFixed(2)),
        subtotalGeral: isNaN(subtotalGeralItens) ? 0 : parseFloat(subtotalGeralItens.toFixed(2)), 
        descontoTerceirizado: isNaN(descontoTerceirizadoValor) ? 0 : parseFloat(descontoTerceirizadoValor.toFixed(2)),
        descontoGeral: isNaN(descontoGeralValorCalculado) ? 0 : parseFloat(descontoGeralValorCalculado.toFixed(2)),
        frete: isNaN(freteValor) ? 0 : parseFloat(freteValor.toFixed(2)),
        totalGeral: isNaN(totalGeralFinal) ? 0 : parseFloat(totalGeralFinal.toFixed(2)),
        custoTotalProdutosVinculadosAcabamentos: isNaN(custoTotalProdutosVinculadosAcabamentos) ? 0 : parseFloat(custoTotalProdutosVinculadosAcabamentos.toFixed(2)),
    };

    return resultado;
};

export const adicionarItemOS = (ordemServico, itemAtual, acabamentosConfig) => {
    // Calcular subtotal ANTES de formatar, garantindo que o item tenha valores numéricos corretos
    console.log('🔍 [adicionarItemOS] Item recebido para adicionar:', {
        tipo_item: itemAtual.tipo_item,
        consumo_custo_total: itemAtual.consumo_custo_total,
        consumo_material_utilizado: itemAtual.consumo_material_utilizado,
        valor_unitario_m2: itemAtual.valor_unitario_m2,
        quantidade: itemAtual.quantidade,
        largura: itemAtual.largura,
        altura: itemAtual.altura
    });
    
    const subtotal = calcularSubtotalItem(itemAtual, acabamentosConfig);
    
    console.log('💰 [adicionarItemOS] Calculando subtotal:', {
        tipo_item: itemAtual.tipo_item,
        valor_unitario: itemAtual.valor_unitario,
        valor_unitario_m2: itemAtual.valor_unitario_m2,
        quantidade: itemAtual.quantidade,
        consumo_custo_total: itemAtual.consumo_custo_total,
        subtotal_calculado: subtotal,
        isNaN: isNaN(subtotal)
    });
    
    // Preservar id_item_os existente se já existir (ex: quando vem do modal de consumo de material)
    // Só gerar novo id se não existir ou for string vazia
    const idItemOS = (itemAtual.id_item_os && 
                      typeof itemAtual.id_item_os === 'string' && 
                      itemAtual.id_item_os.trim() !== '') 
        ? itemAtual.id_item_os 
        : uuidv4();
    
    const novoItem = {
        ...itemAtual,
        id_item_os: idItemOS, 
        // Garantir que subtotal_item seja SEMPRE um número, não string
        subtotal_item: isNaN(subtotal) ? 0 : parseFloat(subtotal.toFixed(2)),
        acabamentos_selecionados: Array.isArray(itemAtual.acabamentos_selecionados) ? itemAtual.acabamentos_selecionados : [],
    };
    
    console.log('✅ [adicionarItemOS] Item adicionado:', {
        id_item_os: novoItem.id_item_os,
        nome: novoItem.nome_produto || novoItem.nome_servico_produto,
        subtotal_item: novoItem.subtotal_item,
        tipo_subtotal: typeof novoItem.subtotal_item
    });
    
    return {
        ...ordemServico,
        itens: [...(ordemServico.itens || []), novoItem],
    };
};

// Função auxiliar para garantir que um item tenha um id_item_os único
export const garantirIdItemOS = (item) => {
    if (!item.id_item_os || item.id_item_os === null || item.id_item_os === undefined) {
        const novoId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.warn('⚠️ [garantirIdItemOS] Item sem id_item_os, gerando novo:', {
            itemNome: item.nome_servico_produto || item.nome_produto,
            novoId
        });
        return { ...item, id_item_os: novoId };
    }
    return item;
};

// Função auxiliar para garantir que todos os itens de uma OS tenham id_item_os único
export const garantirIdsItensOS = (ordemServico) => {
    if (!ordemServico || !Array.isArray(ordemServico.itens)) {
        return ordemServico;
    }
    
    const itensComIds = ordemServico.itens.map(item => garantirIdItemOS(item));

    const itensDeduplicados = [];
    const indicePorIdItem = new Map();

    const parseDateToTimestamp = (value) => {
        if (!value) return 0;
        const timestamp = Date.parse(value);
        return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    itensComIds.forEach(item => {
        const chave = item.id_item_os;

        if (!chave) {
            itensDeduplicados.push(item);
            return;
        }

        if (!indicePorIdItem.has(chave)) {
            indicePorIdItem.set(chave, itensDeduplicados.length);
            itensDeduplicados.push(item);
            return;
        }

        const indiceExistente = indicePorIdItem.get(chave);
        const itemExistente = itensDeduplicados[indiceExistente];

        const existenteTemIdBanco = !!itemExistente?.id;
        const itemTemIdBanco = !!item?.id;

        let substituir = false;

        if (!existenteTemIdBanco && itemTemIdBanco) {
            substituir = true;
        } else if (existenteTemIdBanco === itemTemIdBanco) {
            const existenteAtualizado = parseDateToTimestamp(itemExistente?.updated_at || itemExistente?.created_at);
            const itemAtualizado = parseDateToTimestamp(item?.updated_at || item?.created_at);

            if (itemAtualizado > existenteAtualizado) {
                substituir = true;
            } else if (itemAtualizado === existenteAtualizado) {
                const existenteIdNumerico = parseFloat(itemExistente?.id) || 0;
                const itemIdNumerico = parseFloat(item?.id) || 0;
                if (itemIdNumerico > existenteIdNumerico) {
                    substituir = true;
                }
            }
        }

        if (substituir) {
            console.warn('⚠️ [garantirIdsItensOS] Item duplicado encontrado, substituindo pelo mais recente:', {
                id_item_os: chave,
                itemExistente,
                itemNovo: item
            });
            itensDeduplicados[indiceExistente] = item;
        } else {
            console.warn('⚠️ [garantirIdsItensOS] Item duplicado encontrado, mantendo o existente:', {
                id_item_os: chave,
                itemExistente,
                itemNovo: item
            });
        }
    });

    if (itensDeduplicados.length !== itensComIds.length) {
        console.log('✅ [garantirIdsItensOS] Itens deduplicados:', {
            quantidade_original: itensComIds.length,
            quantidade_final: itensDeduplicados.length,
            ids: itensDeduplicados.map(i => i.id_item_os)
        });
    }

    return {
        ...ordemServico,
        itens: itensDeduplicados
    };
};

export const atualizarItemOS = (ordemServico, itemAtualizado, acabamentosConfig) => {
    const itensExistentes = Array.isArray(ordemServico.itens) ? ordemServico.itens : [];
    
    // Garantir que o item atualizado tenha um id_item_os
    const itemComId = garantirIdItemOS(itemAtualizado);
    
    // IMPORTANTE: Se o itemAtualizado já tem subtotal_item calculado e válido, usar ele
    // Caso contrário, recalcular usando calcularSubtotalItem
    // Isso garante que o subtotal calculado no OSItemForm (que inclui acabamentos corretamente) seja preservado
    const subtotalItemJaCalculado = safeParseFloat(itemAtualizado.subtotal_item, 0);
    const temSubtotalValido = subtotalItemJaCalculado > 0;
    const subtotal = temSubtotalValido 
        ? subtotalItemJaCalculado 
        : calcularSubtotalItem(itemComId, acabamentosConfig);
    
    console.log('🔍 [atualizarItemOS] Atualizando item:', {
        id_item_os: itemComId.id_item_os,
        id_item_os_original: itemAtualizado.id_item_os,
        itensExistentesIds: itensExistentes.map(i => i.id_item_os),
        subtotal_item_original: itemAtualizado.subtotal_item,
        subtotal_item_parsed: subtotalItemJaCalculado,
        subtotal_calculado: calcularSubtotalItem(itemComId, acabamentosConfig),
        subtotal_final: subtotal,
        usando_subtotal_original: temSubtotalValido,
        itemAtualizado: itemComId
    });
    
    // Se o item não tinha id_item_os, não poderemos encontrá-lo na lista
    // Neste caso, usamos o id do banco de dados ou outros identificadores
    let itemEncontrado = false;
    const itensAtualizados = itensExistentes.map(item => {
        // Tentar múltiplas formas de identificar o item
        // Comparar como strings para evitar problemas de tipo
        const itemIdItemOS = String(item.id_item_os || '').trim();
        const itemComIdIdItemOS = String(itemComId.id_item_os || '').trim();
        const itemId = String(item.id || '').trim();
        const itemComIdId = String(itemComId.id || '').trim();
        
        const isItemParaAtualizar = 
            (itemComIdIdItemOS && itemIdItemOS === itemComIdIdItemOS) ||
            (itemComIdId && itemId === itemComIdId) ||
            (itemComIdId && itemIdItemOS === itemComIdId);
        
        console.log(`🔍 [atualizarItemOS] Comparando item:`, {
            item_id_item_os: itemIdItemOS,
            item_id: itemId,
            itemComId_id_item_os: itemComIdIdItemOS,
            itemComId_id: itemComIdId,
            match: isItemParaAtualizar
        });
        
        if (isItemParaAtualizar) {
            itemEncontrado = true;
            // Substituir completamente o item com as novas informações
            const itemSubstituido = { 
                ...itemComId, 
                subtotal_item: isNaN(subtotal) ? 0 : subtotal, 
                acabamentos_selecionados: Array.isArray(itemComId.acabamentos_selecionados) ? itemComId.acabamentos_selecionados : [],
                // Garantir que todos os campos de consumo sejam atualizados
                consumo_material_utilizado: itemComId.consumo_material_utilizado,
                consumo_largura_peca: itemComId.consumo_largura_peca,
                consumo_altura_peca: itemComId.consumo_altura_peca,
                consumo_quantidade_solicitada: itemComId.consumo_quantidade_solicitada,
                consumo_largura_chapa: itemComId.consumo_largura_chapa,
                consumo_altura_chapa: itemComId.consumo_altura_chapa,
                consumo_valor_unitario_chapa: itemComId.consumo_valor_unitario_chapa,
                consumo_custo_total: itemComId.consumo_custo_total,
                consumo_custo_unitario: itemComId.consumo_custo_unitario,
                consumo_pecas_por_chapa: itemComId.consumo_pecas_por_chapa,
                consumo_chapas_necessarias: itemComId.consumo_chapas_necessarias,
                consumo_aproveitamento_percentual: itemComId.consumo_aproveitamento_percentual,
            };
            
            console.log('✅ [atualizarItemOS] Item substituído:', {
                id_item_os: itemSubstituido.id_item_os,
                largura: itemSubstituido.largura,
                altura: itemSubstituido.altura,
                quantidade: itemSubstituido.quantidade,
                valor_unitario_m2: itemSubstituido.valor_unitario_m2,
                consumo_largura_peca: itemSubstituido.consumo_largura_peca,
                consumo_altura_peca: itemSubstituido.consumo_altura_peca,
                consumo_custo_total: itemSubstituido.consumo_custo_total,
                subtotal_item: itemSubstituido.subtotal_item
            });
            
            return itemSubstituido;
        }
        
        return item;
    });
    
    // Se o item não foi encontrado, adicionar ao final (pode ter sido perdido por algum motivo)
    if (!itemEncontrado && itemComId.id_item_os) {
        console.warn('⚠️ [atualizarItemOS] Item não encontrado na lista, adicionando ao final:', {
            id_item_os: itemComId.id_item_os,
            id: itemComId.id,
            itensExistentesIds: itensExistentes.map(i => i.id_item_os),
            subtotal_item: subtotal
        });
        itensAtualizados.push({
            ...itemComId,
            subtotal_item: isNaN(subtotal) ? 0 : subtotal,
            acabamentos_selecionados: Array.isArray(itemComId.acabamentos_selecionados) ? itemComId.acabamentos_selecionados : [],
            consumo_material_utilizado: itemComId.consumo_material_utilizado,
            consumo_largura_peca: itemComId.consumo_largura_peca,
            consumo_altura_peca: itemComId.consumo_altura_peca,
            consumo_quantidade_solicitada: itemComId.consumo_quantidade_solicitada,
            consumo_largura_chapa: itemComId.consumo_largura_chapa,
            consumo_altura_chapa: itemComId.consumo_altura_chapa,
            consumo_valor_unitario_chapa: itemComId.consumo_valor_unitario_chapa,
            consumo_custo_total: itemComId.consumo_custo_total,
            consumo_custo_unitario: itemComId.consumo_custo_unitario,
            consumo_pecas_por_chapa: itemComId.consumo_pecas_por_chapa,
            consumo_chapas_necessarias: itemComId.consumo_chapas_necessarias,
            consumo_aproveitamento_percentual: itemComId.consumo_aproveitamento_percentual,
        });
    }
    
    console.log('✅ [atualizarItemOS] Itens após atualização:', {
        original: itensExistentes.length,
        atualizado: itensAtualizados.length,
        itemEncontrado,
        itensIds: itensAtualizados.map(i => ({ id_item_os: i.id_item_os, id: i.id }))
    });
    
    return {
        ...ordemServico,
        itens: itensAtualizados,
    };
};

export const removerItemOS = (ordemServico, itemId) => {
    const itensExistentes = Array.isArray(ordemServico.itens) ? ordemServico.itens : [];
    return {
        ...ordemServico,
        itens: itensExistentes.filter(item => item.id_item_os !== itemId),
    };
};

export const baixarEstoqueAcabamentosOS = (ordemServico, produtosCadastradosEntrada, acabamentosConfigEntrada, isDevolucao = false) => {
    console.log('=== DEBUG: baixarEstoqueAcabamentosOS ===');
    console.log('ordemServico:', ordemServico);
    console.log('produtosCadastradosEntrada:', produtosCadastradosEntrada);
    console.log('acabamentosConfigEntrada:', acabamentosConfigEntrada);
    console.log('isDevolucao:', isDevolucao);
    
    let produtosAtualizados = [...produtosCadastradosEntrada];
    const acabamentosConfig = [...acabamentosConfigEntrada];
    
    const itensDaOS = Array.isArray(ordemServico.itens) ? ordemServico.itens : [];
    console.log('itensDaOS:', itensDaOS);

    itensDaOS.forEach((item, index) => {
        console.log(`--- Processando item ${index} ---`);
        console.log('item:', item);
        
        const itemAcabamentosSelecionados = Array.isArray(item.acabamentos_selecionados) ? item.acabamentos_selecionados : [];
        console.log('itemAcabamentosSelecionados:', itemAcabamentosSelecionados);
        
        if (item.tipo_item === 'm2' && itemAcabamentosSelecionados.length > 0) {
            console.log('Item é m2 e tem acabamentos selecionados');
            
            itemAcabamentosSelecionados.forEach((acabSel, acabIndex) => {
                console.log(`--- Processando acabamento ${acabIndex} ---`);
                console.log('acabSel:', acabSel);
                
                if (Array.isArray(acabamentosConfig)) {
                    const acabDef = acabamentosConfig.find(ac => ac.id === acabSel.id);
                    console.log('acabDef encontrado:', acabDef);
                    
                    if (acabDef && acabDef.produto_vinculado_id) {
                        console.log('Acabamento tem produto vinculado:', acabDef.produto_vinculado_id);
                        
                        const produtoIndex = produtosAtualizados.findIndex(p => p.id === acabDef.produto_vinculado_id);
                        console.log('produtoIndex:', produtoIndex);
                        
                        if (produtoIndex > -1) {
                            const produto = { ...produtosAtualizados[produtoIndex] };
                            console.log('produto antes da baixa:', produto);
                            
                            const consumoProduto = calcularConsumoProdutoVinculadoAcabamento(item, acabDef);
                            console.log('consumoProduto calculado:', consumoProduto);
                            
                            const estoqueAtual = safeParseFloat(produto.estoque);
                            console.log('estoqueAtual:', estoqueAtual);
                            
                            const novoEstoque = isDevolucao 
                                ? estoqueAtual + consumoProduto
                                : Math.max(0, estoqueAtual - consumoProduto);
                            console.log('novoEstoque:', novoEstoque);
                            
                            produto.estoque = isNaN(novoEstoque) ? '0.00' : novoEstoque.toFixed(Math.max(2, ((produto.unidade_medida || produto.unidadeMedida) === 'unidade' ? 0 : 3) ));
                            console.log('produto após baixa:', produto);
                            
                            produtosAtualizados[produtoIndex] = produto;
                        } else {
                            console.log('Produto não encontrado no array de produtos');
                        }
                    } else {
                        console.log('Acabamento não tem produto vinculado ou acabDef não encontrado');
                    }
                } else {
                    console.log('acabamentosConfig não é um array válido');
                }
            });
        } else {
            console.log('Item não é m2 ou não tem acabamentos selecionados');
        }
    });
    
    console.log('produtosAtualizados finais:', produtosAtualizados);
    console.log('=== FIM DEBUG: baixarEstoqueAcabamentosOS ===');
    
    return produtosAtualizados;
};