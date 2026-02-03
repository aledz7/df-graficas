import { apiDataManager } from '@/lib/apiDataManager';
import { safeJsonParse } from '@/lib/utils';
import { addDays, isValid, parseISO } from 'date-fns'; // Adicionado isValid e parseISO
import { getNextEnvelopamentoId } from './envelopamentoState'; // Modificado para pegar de state
import { produtoService, clienteService } from '@/services/api';
import { envelopamentoService } from '@/services/envelopamentoApi'; // Corrigido o import
import { formatDateForBackend } from '@/utils/dateUtils';


export const salvarOrcamentoEnvelopamentoRascunho = async (orcamento, vendedorAtual) => {
  try {

    // Gerar código único se não existir
    let codigoOrcamento = orcamento.codigo_orcamento;
    if (!codigoOrcamento) {
      try {
        codigoOrcamento = await envelopamentoService.getNextCodigo();
      } catch (error) {
        console.error('❌ Erro ao gerar código:', error);
        // Fallback para código temporário
        codigoOrcamento = `RASCUNHO-${Date.now()}`;
      }
    }

    // Preparar dados para a API
    const dadosParaAPI = {
      ...orcamento,
      codigo_orcamento: codigoOrcamento,
      status: 'Rascunho',
      data_criacao: orcamento.data_criacao || formatDateForBackend(),
      vendedor_id: vendedorAtual?.id,
      vendedor_nome: vendedorAtual?.nome,
      funcionario_id: (orcamento.cliente?.isFuncionario || orcamento.cliente?.tipo_pessoa === 'funcionario')
        ? (orcamento.cliente?.funcionario_id || null)
        : null,
      // Mapear campos do frontend para o banco
      selected_pecas: orcamento.selectedPecas,
      custo_total_material: orcamento.custoTotalMaterial,
      custo_total_adicionais: orcamento.custoTotalAdicionais,
      orcamento_total: orcamento.orcamentoTotal,
      valor_total: orcamento.orcamentoTotal || orcamento.valor_total || 0, // Campo obrigatório para o backend
      area_total_m2: orcamento.areaTotalM2,
      observacao: orcamento.observacao,
      nome_orcamento: orcamento.nome_orcamento || 'Rascunho de Orçamento',
      cliente: orcamento.cliente,
      produto: orcamento.produto,
      // Atualizar adicionais baseado nos serviços realmente aplicados às peças
      adicionais: (() => {
        const adicionaisAtualizados = { ...orcamento.adicionais };
        
        // Verificar quais serviços estão sendo usados nas peças
        const servicosUsados = new Set();
        if (Array.isArray(orcamento.selectedPecas)) {
          orcamento.selectedPecas.forEach(peca => {
            if (peca.servicosAdicionais && typeof peca.servicosAdicionais === 'object') {
              Object.entries(peca.servicosAdicionais).forEach(([key, servico]) => {
                if (servico && servico.checked) {
                  servicosUsados.add(key);
                }
              });
            }
          });
        }
        
        // Atualizar o status checked dos adicionais baseado no uso real
        Object.keys(adicionaisAtualizados).forEach(key => {
          if (adicionaisAtualizados[key] && typeof adicionaisAtualizados[key] === 'object') {
            adicionaisAtualizados[key].checked = servicosUsados.has(key);
          }
        });
        
        return adicionaisAtualizados;
      })(),
      pagamentos: orcamento.pagamentos || []
    };

    // Se tem ID e não é rascunho, atualiza
    if (orcamento.id && (
      // Se é um número (ID do banco)
      (typeof orcamento.id === 'number') ||
      // Se é uma string que não é rascunho
      (typeof orcamento.id === 'string' && !orcamento.id.startsWith('env-draft-') && !orcamento.id.startsWith('rascunho_env_'))
    )) {
      console.log('🔄 Atualizando orçamento existente na API:', { id: orcamento.id, dados: dadosParaAPI });
      const resultado = await envelopamentoService.update(orcamento.id, dadosParaAPI);
      console.log('✅ Orçamento atualizado com sucesso:', resultado);
      return resultado.data || resultado;
    } else {
      console.log('🔄 Criando novo orçamento na API:', dadosParaAPI);
      const resultado = await envelopamentoService.create(dadosParaAPI);
      console.log('✅ Novo orçamento criado com sucesso:', resultado);
      return resultado.data || resultado;
    }
  } catch (error) {
    console.error('❌ Erro ao salvar rascunho na API:', error);
    
    // Fallback para localStorage em caso de erro
    const orcamentosSalvos = await apiDataManager.getDataAsArray('envelopamentosOrcamentos', []);
    
    let idParaSalvar = orcamento.id;
    if (!idParaSalvar || (typeof idParaSalvar === 'string' && (idParaSalvar.startsWith('env-draft-') || idParaSalvar.startsWith('rascunho_env_')))) {
      idParaSalvar = await getNextEnvelopamentoId('rascunho_env_');
    }

    const dataOrcamento = orcamento.data && isValid(parseISO(orcamento.data)) ? parseISO(orcamento.data) : new Date();

    const orcamentoParaSalvar = {
      ...orcamento,
      id: idParaSalvar,
      status: 'Rascunho',
      vendedor_id: vendedorAtual?.id,
      vendedor_nome: vendedorAtual?.nome,
      data: dataOrcamento.toISOString(),
      data_validade: addDays(dataOrcamento, 15).toISOString(),
    };

    const existingIndex = orcamentosSalvos.findIndex(o => o.id === idParaSalvar);
    if (existingIndex > -1) {
      orcamentosSalvos[existingIndex] = orcamentoParaSalvar;
    } else {
      orcamentosSalvos.push(orcamentoParaSalvar);
    }
    await apiDataManager.setItem('envelopamentosOrcamentos', orcamentosSalvos);
    return orcamentoParaSalvar;
  }
};


export const finalizarOrcamentoEnvelopamento = async (orcamentoFinalizado, registrarAcaoCallback, vendedorAtual) => {
  // Usar a nova API em vez do localStorage
  try {
            // Log para debug do cliente recebido
        console.log('🔍 Cliente recebido no Envelopamento:', {
          cliente: orcamentoFinalizado.cliente,
          isFuncionario: orcamentoFinalizado.cliente?.isFuncionario,
          tipo_pessoa: orcamentoFinalizado.cliente?.tipo_pessoa,
          id: orcamentoFinalizado.cliente?.id,
          funcionario_id: orcamentoFinalizado.cliente?.funcionario_id
        });
        
        // Log para debug da estrutura completa do orçamento
        console.log('🔍 Estrutura completa do orçamento:', {
          codigo_orcamento: orcamentoFinalizado.codigo_orcamento,
          codigoOrcamento: orcamentoFinalizado.codigoOrcamento,
          nome_orcamento: orcamentoFinalizado.nome_orcamento,
          nomeOrcamento: orcamentoFinalizado.nomeOrcamento,
          orcamento_total: orcamentoFinalizado.orcamento_total,
          orcamentoTotal: orcamentoFinalizado.orcamentoTotal,
          valor_total: orcamentoFinalizado.valor_total,
          selectedPecas: orcamentoFinalizado.selectedPecas,
          selected_pecas: orcamentoFinalizado.selected_pecas,
          keys: Object.keys(orcamentoFinalizado)
        });
        
        // Detectar funcionário por: isFuncionario, tipo_pessoa, ou formato do ID (funcionario_*)
        const isFuncionario = orcamentoFinalizado.cliente?.isFuncionario || 
                             orcamentoFinalizado.cliente?.tipo_pessoa === 'funcionario' || 
                             orcamentoFinalizado.cliente?.tipo_cadastro_especial === 'Funcionário' ||
                             (orcamentoFinalizado.cliente?.id && orcamentoFinalizado.cliente.id.toString().startsWith('funcionario_'));
        
        // Para funcionários, não criar cliente - apenas usar funcionario_id
        // Para clientes normais, verificar se o ID é válido
        if (!isFuncionario && (!orcamentoFinalizado.cliente?.id || isNaN(parseInt(orcamentoFinalizado.cliente.id)))) {
          try {
            // Apenas para clientes normais, resolver o cliente_id
            const clienteIdNum = parseInt(orcamentoFinalizado.cliente?.id);
            if (!isNaN(clienteIdNum)) {
              orcamentoFinalizado.cliente = { ...(orcamentoFinalizado.cliente || {}), id: clienteIdNum };
            }
          } catch (e) {
            console.warn('Erro ao processar cliente normal no Envelopamento:', e);
          }
        }
    // Extrair funcionario_id para a API
    let funcionarioIdParaAPI = null;
    if (isFuncionario) {
      funcionarioIdParaAPI = orcamentoFinalizado.cliente?.funcionario_id;
      if (!funcionarioIdParaAPI && orcamentoFinalizado.cliente?.id && orcamentoFinalizado.cliente.id.toString().startsWith('funcionario_')) {
        funcionarioIdParaAPI = orcamentoFinalizado.cliente.id.toString().replace('funcionario_', '');
      }
      // Verificar também tipo_cadastro_especial
      if (!funcionarioIdParaAPI && orcamentoFinalizado.cliente?.tipo_cadastro_especial === 'Funcionário' && orcamentoFinalizado.cliente?.funcionario_id_associado) {
        funcionarioIdParaAPI = orcamentoFinalizado.cliente.funcionario_id_associado;
      }
      
      console.log('🔍 Extração do funcionario_id para API (Envelopamento):', {
        isFuncionario: isFuncionario,
        funcionario_id_original: orcamentoFinalizado.cliente?.funcionario_id,
        funcionario_id_associado: orcamentoFinalizado.cliente?.funcionario_id_associado,
        tipo_cadastro_especial: orcamentoFinalizado.cliente?.tipo_cadastro_especial,
        id_cliente_info: orcamentoFinalizado.cliente?.id,
        funcionarioIdParaAPI: funcionarioIdParaAPI,
        funcionarioIdParaAPIType: typeof funcionarioIdParaAPI
      });
    }
    
    // Log dos dados sendo enviados para debug
    console.log('📊 Dados do Envelopamento sendo enviados para API:', {
      cliente: orcamentoFinalizado.cliente,
      funcionario_id: funcionarioIdParaAPI,
      funcionario_id_type: typeof funcionarioIdParaAPI,
      is_funcionario: isFuncionario,
      tipo_pessoa: orcamentoFinalizado.cliente?.tipo_pessoa,
      id_cliente: orcamentoFinalizado.cliente?.id,
      id_cliente_type: typeof orcamentoFinalizado.cliente?.id
    });

    // Preparar dados para a API
    const dadosParaAPI = {
      ...orcamentoFinalizado,
      funcionario_id: funcionarioIdParaAPI,
      // Garantir que os campos obrigatórios estejam presentes
      codigo_orcamento: orcamentoFinalizado.codigo_orcamento || orcamentoFinalizado.codigoOrcamento || `ENV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      valor_total: orcamentoFinalizado.orcamento_total || orcamentoFinalizado.valor_total || 0,
      cliente_id: isFuncionario ? null : (orcamentoFinalizado.cliente?.id || null),
      // Mapear campos do frontend para o banco
      selected_pecas: orcamentoFinalizado.selectedPecas || orcamentoFinalizado.selected_pecas || [],
      custo_total_material: orcamentoFinalizado.custoTotalMaterial || orcamentoFinalizado.custo_total_material || 0,
      custo_total_adicionais: orcamentoFinalizado.custoTotalAdicionais || orcamentoFinalizado.custo_total_adicionais || 0,
      orcamento_total: orcamentoFinalizado.orcamentoTotal || orcamentoFinalizado.orcamento_total || 0,
      area_total_m2: orcamentoFinalizado.areaTotalM2 || orcamentoFinalizado.area_total_m2 || 0,
      // Campos de desconto e frete
      desconto: orcamentoFinalizado.desconto || 0,
      desconto_tipo: orcamentoFinalizado.descontoTipo || 'percentual',
      desconto_calculado: orcamentoFinalizado.descontoCalculado || 0,
      frete: orcamentoFinalizado.frete || 0,
      observacao: orcamentoFinalizado.observacao || '',
      nome_orcamento: orcamentoFinalizado.nome_orcamento || orcamentoFinalizado.nomeOrcamento || 'Envelopamento',
      cliente: orcamentoFinalizado.cliente || {},
      produto: orcamentoFinalizado.produto || [],
      adicionais: orcamentoFinalizado.adicionais || {},
      pagamentos: orcamentoFinalizado.pagamentos || [],
      status: 'Finalizado',
      data: orcamentoFinalizado.data, // Data de finalização (já vem atualizada do handler)
      data_criacao: orcamentoFinalizado.data_criacao || formatDateForBackend(), // Preserva a data de criação original
      vendedor_id: vendedorAtual?.id,
      vendedor_nome: vendedorAtual?.nome,
    };
    
    console.log('📤 Dados finais sendo enviados para API:', {
      codigo_orcamento: dadosParaAPI.codigo_orcamento,
      codigo_orcamento_type: typeof dadosParaAPI.codigo_orcamento,
      valor_total: dadosParaAPI.valor_total,
      funcionario_id: dadosParaAPI.funcionario_id,
      cliente_id: dadosParaAPI.cliente_id,
      status: dadosParaAPI.status,
      nome_orcamento: dadosParaAPI.nome_orcamento,
      desconto: dadosParaAPI.desconto,
      desconto_tipo: dadosParaAPI.desconto_tipo,
      desconto_calculado: dadosParaAPI.desconto_calculado,
      frete: dadosParaAPI.frete
    });
    
    // Salvar na nova API
    let resultado;
    if (orcamentoFinalizado.id && typeof orcamentoFinalizado.id === 'number') {
      // Se tem ID numérico, atualizar primeiro e depois finalizar
      resultado = await envelopamentoService.update(orcamentoFinalizado.id, dadosParaAPI);
      // Chamar o método finalizar para criar a conta a receber
      resultado = await envelopamentoService.finalizar(orcamentoFinalizado.id, dadosParaAPI);
    } else {
      // Se não tem ID ou é string, criar novo e depois finalizar
      resultado = await envelopamentoService.create(dadosParaAPI);
      // Chamar o método finalizar para criar a conta a receber
      if (resultado.data?.id || resultado.id) {
        const id = resultado.data?.id || resultado.id;
        resultado = await envelopamentoService.finalizar(id, dadosParaAPI);
      }
    }
    // Log da resposta da API
    console.log('🔍 Resposta da API Envelopamento:', {
      resultado: resultado,
      resultadoData: resultado?.data,
      resultadoId: resultado?.data?.id,
      resultadoCodigo: resultado?.data?.codigo_orcamento
    });
    
    // Alguns endpoints retornam {success, data}, outros retornam diretamente o objeto salvo
    const orcamentoSalvo = (resultado && (resultado.data || resultado)) || orcamentoFinalizado;
    

    // Baixar estoque do material e composições usando o payload local
    // (garante presença de selectedPecas/produto mesmo que a API não retorne todos os campos)
    await baixarEstoqueEnvelopamento(
      orcamentoFinalizado,
      null,
      false,
      registrarAcaoCallback,
      `Envelopamento ${orcamentoSalvo.codigo_orcamento || orcamentoSalvo.id}`
    );

    let lancamentosFluxo = await apiDataManager.getDataAsArray('lancamentosFluxoCaixa', []);
    let categoriasFluxo = await apiDataManager.getDataAsArray('categoriasFluxoCaixa', []);
    
    // Garantir que ambos sejam arrays válidos
    if (!Array.isArray(lancamentosFluxo)) {
      console.warn('lancamentosFluxo não é um array válido, inicializando como array vazio');
      lancamentosFluxo = [];
    }
    if (!Array.isArray(categoriasFluxo)) {
      console.warn('categoriasFluxo não é um array válido, inicializando como array vazio');
      categoriasFluxo = [];
    }
    
    const categoriaEnvelopamento = categoriasFluxo.find(cat => cat.nome.toLowerCase().includes('serviço de envelopamento') || cat.nome.toLowerCase().includes('envelopamento'));

    if (Array.isArray(orcamentoSalvo.pagamentos)) {
      orcamentoSalvo.pagamentos.forEach(pag => {
          const novoLancamento = {
              id: `fluxo-env-${orcamentoSalvo.id}-${pag.metodo}-${Date.now()}`,
              data: formatDateForBackend(),
              descricao: `Envelopamento #${orcamentoSalvo.codigo_orcamento || (orcamentoSalvo.id ? orcamentoSalvo.id.toString().slice(-6) : 'N/A')} (${pag.metodo})`,
              valor: parseFloat(pag.valorFinal || pag.valorOriginal || pag.valor || 0),
              tipo: 'entrada',
              categoria_id: categoriaEnvelopamento ? categoriaEnvelopamento.id : '',
              conta_bancaria_id: pag.contaBancariaId || '',
              cliente_fornecedor_id: orcamentoSalvo.cliente?.id || '',
              origem_id: orcamentoSalvo.id,
              origem_tipo: 'Envelopamento',
              vendedor_id: vendedorAtual?.id,
          };
          lancamentosFluxo.push(novoLancamento);
      });
    }
    await apiDataManager.setItem('lancamentosFluxoCaixa', lancamentosFluxo);

    // Registrar consumo interno (funcionário) se aplicável
    // Só contabilizar consumo interno se houver pagamentos em Crediário
    try {
      const info = orcamentoSalvo.cliente || {};
      // Usar a variável isFuncionario já calculada ou verificar pelos campos
      const isFuncionarioParaConsumo = isFuncionario || info.isFuncionario || info.tipo_pessoa === 'funcionario' || info.tipo_cadastro_especial === 'Funcionário';
      const funcionarioId = funcionarioIdParaAPI || info.funcionario_id || info.funcionario_id_associado;
      
      const temPagamentoCrediario = orcamentoSalvo.pagamentos?.some(pag => pag.metodo === 'Crediário');
      
      if (isFuncionarioParaConsumo && funcionarioId && temPagamentoCrediario) {
        console.log('✅ Consumo interno detectado para Envelopamento com Crediário - será registrado via API');
        // O consumo interno será registrado via API do backend, não no localStorage
      } else if (isFuncionarioParaConsumo && funcionarioId && !temPagamentoCrediario) {
        console.log('ℹ️ Consumo interno detectado para Envelopamento, mas sem Crediário - NÃO será contabilizado');
        // Não contabilizar consumo interno quando não há Crediário
      }
    } catch (e) {
      console.warn('Falha ao registrar consumo interno (Envelopamento):', e);
    }
    
    if (registrarAcaoCallback) {
      registrarAcaoCallback(
        'finalizar_orcamento_envelopamento',
        'Envelopamento',
        orcamentoSalvo.id,
        null, 
        orcamentoSalvo
      );
    }
    return orcamentoSalvo;
  } catch (error) {
    console.error('Erro ao finalizar orçamento:', error);
    throw error;
  }
};


export const baixarEstoqueEnvelopamento = async (orcamento, setProdutosCallback, isDevolucao = false, registrarAcaoCallback, referenciaId) => {


  // Normalizar origem das peças (camelCase ou snake_case)
  const pecasOrigem = Array.isArray(orcamento.selectedPecas)
    ? orcamento.selectedPecas
    : (Array.isArray(orcamento.selected_pecas) ? orcamento.selected_pecas : []);

  // Verificar se há peças com produtos
  if (!Array.isArray(pecasOrigem) || pecasOrigem.length === 0) {
    console.warn('❌ Nenhuma peça encontrada no orçamento');
    return; // Não é erro, apenas não há produtos para baixar
  }

  // Considerar produto informado na peça OU um produto global do orçamento
  const pecasComProduto = pecasOrigem.filter(peca => {
    const produtoPeca = peca.produto || orcamento.produto || null;
    return produtoPeca && (produtoPeca.id || produtoPeca.produto_id);
  });
  
  if (pecasComProduto.length === 0) {
    console.warn('❌ Nenhuma peça com produto válido encontrada');
    return; // Não é erro, apenas não há produtos para baixar
  }



  // Processar cada produto individual
  for (const peca of pecasComProduto) {
    const produto = peca.produto || orcamento.produto; // fallback para produto global
    
    // Verificar se o produto é em m² (aceita vários formatos vindos da API)
    const unidade = (produto.unidadeMedida || produto.unidade_medida || produto.tipo_produto || '').toString().toLowerCase();
    const trataComoM2 = unidade === 'm2' || unidade === 'metro_quadrado' || (!!produto.preco_m2 && parseFloat(produto.preco_m2) > 0);
    if (trataComoM2) {
      try {
        // Calcular área necessária para esta peça
        const alturaM = parseFloat(String(peca.parte?.altura || '0').replace(',', '.')) || 0;
        const larguraM = parseFloat(String(peca.parte?.largura || '0').replace(',', '.')) || 0;
        const quantidade = parseInt(peca.quantidade, 10) || 0;
        const areaPeca = alturaM * larguraM * quantidade;



        // Buscar o produto atual da API
        const produtoId = produto.id || produto.produto_id;
        const produtoResponse = await produtoService.getById(produtoId);
        const produtoAtual = produtoResponse.data;
        
        if (produtoAtual) {
          // A API retorna {success: true, message: "...", data: {...}}
          // Precisamos acessar produtoAtual.data para pegar os dados reais do produto
          const dadosProduto = produtoAtual.data || produtoAtual;
          const produtoOriginal = JSON.parse(JSON.stringify(dadosProduto));
          const estoqueAtual = parseFloat(String(dadosProduto.estoque || '0').replace(',','.'));
          const composicaoArray = Array.isArray(dadosProduto.composicao) ? dadosProduto.composicao : [];
          

          const novoEstoque = isDevolucao
            ? estoqueAtual + areaPeca
            : Math.max(0, estoqueAtual - areaPeca);
          
          // Atualizar o estoque do produto via API
          const produtoAtualizado = {
            estoque: novoEstoque.toFixed(2) // Enviar como string decimal com ponto
          };
          

          
          await produtoService.update(dadosProduto.id, produtoAtualizado);
          
          // Registrar a ação se necessário
          if (registrarAcaoCallback) {
            const acaoTipo = isDevolucao ? 'devolucao_estoque_envelopamento' : 'baixa_estoque_envelopamento';
            registrarAcaoCallback(
              acaoTipo,
              'Produto (m²)',
              produtoOriginal.id,
              { estoque_anterior: produtoOriginal.estoque },
              { estoque_atual: produtoAtualizado.estoque },
              `${isDevolucao ? 'Devolução' : 'Baixa'} de ${areaPeca.toFixed(2).replace('.',',')}m² de estoque para ${referenciaId || `Envelopamento ${orcamento.id}`} (Peça: ${peca.parte?.nome})`
            );
          }

          // Se o produto possui composição, baixar estoque dos componentes também
          if (composicaoArray.length > 0) {
            for (const componente of composicaoArray) {
              try {
                const componenteId = componente.produtoId || componente.id || componente.produto_id;
                if (!componenteId) continue;
                const componenteQtdPorUnidade = parseFloat(String(componente.quantidade || '0').replace(',','.')) || 0;
                if (componenteQtdPorUnidade <= 0) continue;
                // Consumo proporcional à área da peça
                const consumoComponente = componenteQtdPorUnidade * areaPeca;
                const compResp = await produtoService.getById(componenteId);
                const compDataWrap = compResp.data || {};
                const compData = compDataWrap.data || compDataWrap;
                const estoqueAtualComp = parseFloat(String(compData.estoque || '0').replace(',','.'));
                const novoEstoqueComp = isDevolucao
                  ? estoqueAtualComp + consumoComponente
                  : Math.max(0, estoqueAtualComp - consumoComponente);
                await produtoService.update(componenteId, { estoque: novoEstoqueComp.toFixed(2) });
                if (registrarAcaoCallback) {
                  const acaoTipoComp = isDevolucao ? 'devolucao_estoque_componente_envelopamento' : 'baixa_estoque_componente_envelopamento';
                  registrarAcaoCallback(
                    acaoTipoComp,
                    'Produto Componente',
                    componenteId,
                    { estoque_anterior: estoqueAtualComp },
                    { estoque_atual: novoEstoqueComp.toFixed(2) },
                    `${isDevolucao ? 'Devolução' : 'Baixa'} de ${consumoComponente.toFixed(2).replace('.',',')} un/m² do componente ${compData.nome || componente.nome || componenteId} para ${referenciaId || `Envelopamento ${orcamento.id}`}`
                  );
                }
              } catch (compErr) {
                console.error('Erro ao atualizar estoque do componente na composição:', compErr);
              }
            }
          }
        } else {
          console.error('❌ Produto não encontrado na API:', produto.id);
          throw new Error(`Produto com ID ${produto.id} não encontrado`);
        }
      } catch (error) {
        console.error('Erro ao atualizar estoque do produto', produto.nome, ':', error);
        throw new Error(`Falha ao ${isDevolucao ? 'devolver' : 'baixar'} estoque do produto ${produto.nome}: ${error.message}`);
      }
    }
  }

  // Atualizar a UI se necessário (apenas uma vez no final)
  if (typeof setProdutosCallback === 'function') {
    try {
      // Buscar todos os produtos atualizados
      const todosResponse = await produtoService.getAll();
      const produtosData = todosResponse.data?.data?.data || todosResponse.data?.data || todosResponse.data || [];
      const produtosArray = Array.isArray(produtosData) ? produtosData : [];
      setProdutosCallback(produtosArray.filter(p => p.status === true));
    } catch (error) {
      console.error('Erro ao atualizar lista de produtos na UI:', error);
    }
  }
};

export const moverParaLixeiraEnvelopamento = async (orcamento, justificativa, deletedBy, registrarAcaoCallback) => {
      const lixeira = await apiDataManager.getDataAsArray('lixeira', []);
  const itemExcluido = {
    type: 'Envelopamento',
    data: orcamento,
    deletedAt: formatDateForBackend(),
    justification: justificativa,
    deletedBy: deletedBy?.nome || 'N/A',
  };
  lixeira.push(itemExcluido);
  await apiDataManager.setItem('lixeira', lixeira);

      const orcamentosSalvos = await apiDataManager.getDataAsArray('envelopamentosOrcamentos', []);
  const novosOrcamentos = orcamentosSalvos.filter(o => o.id !== orcamento.id);
  await apiDataManager.setItem('envelopamentosOrcamentos', novosOrcamentos);
  
  if(orcamento.status === 'Finalizado' && orcamento.produto){
      baixarEstoqueEnvelopamento(orcamento, null, true, registrarAcaoCallback, `Devolução por exclusão Envelopamento ${orcamento.id}`);
  }
  
  // Remover na API Laravel (se existir)
  try {
    if (orcamento?.id) {
      await envelopamentoService.delete(orcamento.id);
    }
  } catch (apiDeleteError) {
    console.warn('[Envelopamento] Falha ao excluir na API:', apiDeleteError);
  }
  
  if (registrarAcaoCallback) {
    registrarAcaoCallback('excluir_para_lixeira', 'Envelopamento', orcamento.id, orcamento, null, justificativa);
  }
  return novosOrcamentos;
};