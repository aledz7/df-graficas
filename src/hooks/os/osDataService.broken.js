import { safeJsonParse, safeParseFloat } from '@/lib/utils';
import { initialOrdemServicoState, initialOrdemServicoStateSync } from './osConstants';
import { createNewOSWithSequentialId } from './osIdService';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';
import { apiDataManager } from '@/lib/apiDataManager';
import { osService, produtoService, clienteService } from '@/services/api';
import { contaReceberService } from '@/services/api';
import { baixarEstoqueAcabamentosOS } from './osLogic';

// Função para buscar OS da API primeiro, depois localStorage como fallback
export const loadOSFromAPI = async (osId) => {
  try {
    if (!osId || osId === 'undefined' || osId === 'null') {
      console.warn('⚠️ [loadOSFromAPI] ID da OS inválido:', osId);
      return null;
    }
    
    const response = await osService.getById(osId);
    
    let osData = null;
    
    if (response && response.data) {
      osData = response.data;
    } else if (response && response.id_os) {
      // API retorna dados diretamente sem wrapper 'data'
      osData = response;
    }
    
    if (osData) {
      
      // Converter dados da API para o formato esperado pelo frontend
      const osFormatada = {
        ...initialOrdemServicoStateSync(),
        id: osData.id || osData.ID || null,
        id_os: osData.id_os,
        cliente_info: osData.cliente || osData.cliente_info || null,
        cliente_nome_manual: osData.cliente_nome_manual || '',
        vendedor_id: osData.vendedor_id,
        vendedor_nome: osData.vendedor_nome || '',
        data_criacao: osData.data_criacao,
        // Backend usa data_prevista_entrega; frontend usa data_previsao_entrega
        data_previsao_entrega: osData.data_prevista_entrega || osData.data_previsao_entrega || null,
        maquina_impressao_id: osData.maquina_impressao_id || null,
        status_os: osData.status_os,
        status_pagamento: osData.status_pagamento || 'Pendente',
        valor_total_os: safeParseFloat(osData.valor_total_os),
        desconto_terceirizado_percentual: String(osData.desconto_terceirizado_percentual || '0'),
        desconto_geral_tipo: osData.desconto_geral_tipo || 'percentual',
        desconto_geral_valor: String(osData.desconto_geral_valor || '0'),
        frete_valor: String(osData.frete_valor || '0'),
        observacoes_gerais_os: osData.observacoes || '',
        observacoes_cliente_para_nota: osData.observacoes_cliente_para_nota || '',
        data_finalizacao_os: osData.data_finalizacao_os,
        data_ultima_modificacao: osData.data_ultima_modificacao,
        data_validade: osData.data_validade,
        itens: Array.isArray(osData.itens) ? osData.itens.map(item => {
          console.log('🔍 [loadOSFromAPI] Processando item:', {
            nome: item.nome_servico_produto || item.nome_produto,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total: item.valor_total,
            subtotal_item: item.subtotal_item,
            largura: item.largura,
            altura: item.altura,
            produto: item.produto,
            detalhes: item.detalhes
          });
          
          // Derivar valores numéricos base
          const quantidadeNum = parseFloat(String(item.quantidade ?? 0).toString().replace(',', '.')) || 0;
          const larguraNum = parseFloat(String(item.largura ?? 0).toString().replace(',', '.')) || 0;
          const alturaNum = parseFloat(String(item.altura ?? 0).toString().replace(',', '.')) || 0;
          const valorTotalNum = safeParseFloat(item.valor_total || item.subtotal_item || 0);

          let valorUnitario = item.valor_unitario;
          let valorUnitarioM2 = item.valor_unitario_m2;

          // Calcular subtotal de acabamentos a partir dos selecionados (se existirem)
          let subtotalAcabamentos = 0;
          try {
            const acabSelArr = item.acabamentos ? (typeof item.acabamentos === 'string' ? JSON.parse(item.acabamentos) : item.acabamentos) : [];
            if (Array.isArray(acabSelArr)) {
              const area = larguraNum * alturaNum;
              const perimetro = 2 * (larguraNum + alturaNum);
              for (const a of acabSelArr) {
                const tipo = a?.tipo_aplicacao || a?.tipo || 'area_total';
                const vM2 = safeParseFloat(a?.valor_m2 || a?.valor, 0);
                const vUn = safeParseFloat(a?.valor_un || 0, 0);
                if (tipo === 'area_total') {
                  subtotalAcabamentos += vM2 * area * (quantidadeNum || 1);
                } else if (tipo === 'unidade') {
                  subtotalAcabamentos += vUn * (quantidadeNum || 1);
                } else if (tipo === 'perimetro' || tipo === 'metro_linear') {
                  const unit = vM2 || vUn || 0;
                  subtotalAcabamentos += unit * perimetro * (quantidadeNum || 1);
                }
              }
            }
          } catch (e) {}

          // Com subtotal de acabamentos calculado, derivar valores unitários BASE (somente produto)
          if ((valorUnitario === null || valorUnitario === undefined || Number(valorUnitario) === 0) && item.tipo_item === 'unidade') {
            const baseTotal = Math.max(0, valorTotalNum - subtotalAcabamentos);
            valorUnitario = quantidadeNum > 0 ? (baseTotal / (quantidadeNum || 1)) : 0;
          }

          if ((valorUnitarioM2 === null || valorUnitarioM2 === undefined || Number(valorUnitarioM2) === 0) && item.tipo_item === 'm2') {
            const areaTotal = larguraNum * alturaNum * (quantidadeNum || 1);
            const baseTotal = Math.max(0, valorTotalNum - subtotalAcabamentos);
            valorUnitarioM2 = areaTotal > 0 ? (baseTotal / areaTotal) : 0;
          }

          // Extrair observação do item vinda do backend (em detalhes ou campo dedicado)
          let observacaoItem = '';
          try {
            if (item.observacao_item) {
              observacaoItem = String(item.observacao_item);
            } else if (item.detalhes && typeof item.detalhes === 'object' && item.detalhes !== null) {
              observacaoItem = String(item.detalhes.observacao_item || '');
            }
          } catch (e) {}

          return {
            ...item,
            produto_id: item.produto_id,
            nome_servico_produto: item.nome_servico_produto || item.nome_produto || '',
            tipo_item: item.tipo_item,
            quantidade: String(item.quantidade || '0').replace('.', ','),
            valor_unitario: String(valorUnitario || 0).replace('.', ','),
            valor_unitario_m2: String(valorUnitarioM2 || valorUnitario || 0).replace('.', ','),
            subtotal_item: valorTotalNum,
            largura: String(item.largura || '0').replace('.', ','),
            altura: String(item.altura || '0').replace('.', ','),
            acabamentos_selecionados: item.acabamentos ? (typeof item.acabamentos === 'string' ? JSON.parse(item.acabamentos) : item.acabamentos) : [],
            subtotal_acabamentos: subtotalAcabamentos,
            observacao_item: observacaoItem,
            detalhes: (item.detalhes && typeof item.detalhes === 'object') ? item.detalhes : (observacaoItem ? { observacao_item: observacaoItem } : {})
          };
        }) : [],
        pagamentos: Array.isArray(osData.pagamentos) ? osData.pagamentos.map(p => ({
          ...p,
          valorOriginal: safeParseFloat(p.valorOriginal || p.valor),
          valorFinal: safeParseFloat(p.valorFinal || p.valor),
        })) : [],
      };
      
      return osFormatada;
    } else {
      console.warn('⚠️ [loadOSFromAPI] Resposta da API vazia ou inválida');
      return null;
    }
  } catch (error) {
    console.error('❌ [loadOSFromAPI] Erro ao buscar OS da API:', error);
    console.error('❌ [loadOSFromAPI] Detalhes do erro:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    // Se der erro na API, continuar para tentar no localStorage
  }
  
  return null;
};

export const loadOSFromLocalStorage = async (osId) => {
  const osSalvas = await apiDataManager.getDataAsArray('ordens_servico_salvas', []);
  const osEncontrada = osSalvas.find(os => os.id_os === osId);
  if (!osEncontrada) {
    console.warn('OS não encontrada no localStorage para o id:', osId);
    return null;
  }
  if (osEncontrada) {
    return {
      ...initialOrdemServicoStateSync(), 
      ...osEncontrada,
      id: osEncontrada.id || null,
      itens: Array.isArray(osEncontrada.itens) ? osEncontrada.itens.map(item => ({
        ...item,
        subtotal_item: safeParseFloat(item.subtotal_item),
        subtotal_acabamentos: safeParseFloat(item.subtotal_acabamentos),
        valor_unitario_m2: String(item.valor_unitario_m2 || '0').replace('.',','),
        valor_unitario: String(item.valor_unitario || '0').replace('.',','),
        largura: String(item.largura || '0').replace('.',','),
        altura: String(item.altura || '0').replace('.',','),
      })) : [], 
      pagamentos: Array.isArray(osEncontrada.pagamentos) ? osEncontrada.pagamentos.map(p => ({
        ...p,
        valorOriginal: safeParseFloat(p.valorOriginal || p.valor),
        valorFinal: safeParseFloat(p.valorFinal || p.valor),
      })) : [],
      cliente_info: osEncontrada.cliente_info || null,
      valor_total_os: safeParseFloat(osEncontrada.valor_total_os),
      desconto_terceirizado_percentual: String(osEncontrada.desconto_terceirizado_percentual || '0'),
      desconto_geral_tipo: osEncontrada.desconto_geral_tipo || 'percentual',
      desconto_geral_valor: String(osEncontrada.desconto_geral_valor || '0'),
      frete_valor: String(osEncontrada.frete_valor || '0'),
    };
  }
  return null;
};

// Função principal que tenta API primeiro, depois localStorage
export const loadOS = async (osId) => {
  
  // Primeiro, tentar buscar da API
  const osFromAPI = await loadOSFromAPI(osId);
  if (osFromAPI) {
    return osFromAPI;
  }
  
  // Se não encontrou na API, tentar no localStorage
  const osFromLocal = await loadOSFromLocalStorage(osId);
  if (osFromLocal) {
    return osFromLocal;
  }
  
  console.warn('OS não encontrada nem na API nem no localStorage:', osId);
  return null;
};

// Função de teste para debug do valor total
export const testValorTotalOS = (osData) => {
  
  const valorProcessado = safeParseFloat(osData.valor_total_os);
  
  // Simular o que acontece no mapeamento para API
  const osParaAPI = {
    valor_total_os: valorProcessado
  };
  
  // Teste adicional: verificar se o valor é válido
  const isValidValue = !isNaN(valorProcessado) && valorProcessado > 0;
  
  return valorProcessado;
};

export const saveOSToLocalStorage = async (osData, options = {}) => {
  const osSalvas = await apiDataManager.getDataAsArray('ordens_servico_salvas', []);
  let id_os = osData.id_os;
  if (!id_os) {
    id_os = `OS-${Date.now()}-${uuidv4().slice(0,4)}`;
  }
  const indexExistente = osSalvas.findIndex(os => os.id_os === id_os);
  
  const osCompletaParaSalvar = {
    ...initialOrdemServicoStateSync(), 
    ...osData,
    id_os,
    id: osData.id || null,
    data_ultima_modificacao: new Date().toISOString(),
    data_validade: osData.status_os === 'Orçamento Salvo' || osData.status_os === 'Orçamento Salvo (Editado)' 
                   ? addDays(new Date(osData.data_criacao || new Date()), 15).toISOString() 
                   : osData.data_validade || null,
    itens: Array.isArray(osData.itens) ? osData.itens.map(item => ({
        ...item,
        subtotal_item: safeParseFloat(item.subtotal_item),
        subtotal_acabamentos: safeParseFloat(item.subtotal_acabamentos),
        valor_unitario_m2: String(item.valor_unitario_m2 || '0').replace('.',','),
        valor_unitario: String(item.valor_unitario || '0').replace('.',','),
        largura: String(item.largura || '0').replace('.',','),
        altura: String(item.altura || '0').replace('.',','),
    })) : [],
    pagamentos: Array.isArray(osData.pagamentos) ? osData.pagamentos.map(p => ({
        ...p,
        valorOriginal: safeParseFloat(p.valorOriginal || p.valor),
        valorFinal: safeParseFloat(p.valorFinal || p.valor),
    })) : [],
    valor_total_os: safeParseFloat(osData.valor_total_os),
    desconto_terceirizado_percentual: String(osData.desconto_terceirizado_percentual || '0'),
    desconto_geral_tipo: osData.desconto_geral_tipo || 'percentual',
    desconto_geral_valor: String(osData.desconto_geral_valor || '0'),
    frete_valor: String(osData.frete_valor || '0'),
  };

  // Tentar salvar na API Laravel primeiro
  try {
    // Log de debug removido para evitar problemas de performance
    
    // Detectar funcionário por: isFuncionario, tipo_pessoa, ou formato do ID (funcionario_*)
    const isFuncionario = osCompletaParaSalvar.cliente_info?.isFuncionario || 
                         osCompletaParaSalvar.cliente_info?.tipo_pessoa === 'funcionario' || 
                         osCompletaParaSalvar.cliente_info?.tipo_cadastro_especial === 'Funcionário' ||
                         (osCompletaParaSalvar.cliente_info?.id && osCompletaParaSalvar.cliente_info.id.toString().startsWith('funcionario_'));
    
    // Log de debug removido para evitar problemas de performance
    
    // Para funcionários, não criar cliente - apenas usar funcionario_id
    // Para clientes normais, verificar se o ID é válido
    if (!isFuncionario && (!osCompletaParaSalvar.cliente_info?.id || isNaN(parseInt(osCompletaParaSalvar.cliente_info.id)))) {
      try {
        // Apenas para clientes normais, resolver o cliente_id
        const clienteIdNum = parseInt(osCompletaParaSalvar.cliente_info?.id);
        if (!isNaN(clienteIdNum)) {
          osCompletaParaSalvar.cliente_info = { ...(osCompletaParaSalvar.cliente_info || {}), id: clienteIdNum };
        }
      } catch (e) {
        console.warn('Erro ao processar cliente normal na OS:', e);
      }
    }
    
    // Extrair funcionario_id para a API
    let funcionarioIdParaAPI = null;
    if (isFuncionario) {
      funcionarioIdParaAPI = osCompletaParaSalvar.cliente_info?.funcionario_id;
      if (!funcionarioIdParaAPI && osCompletaParaSalvar.cliente_info?.id && osCompletaParaSalvar.cliente_info.id.toString().startsWith('funcionario_')) {
        funcionarioIdParaAPI = osCompletaParaSalvar.cliente_info.id.toString().replace('funcionario_', '');
      }
      // Verificar também tipo_cadastro_especial
      if (!funcionarioIdParaAPI && osCompletaParaSalvar.cliente_info?.tipo_cadastro_especial === 'Funcionário' && osCompletaParaSalvar.cliente_info?.funcionario_id_associado) {
        funcionarioIdParaAPI = osCompletaParaSalvar.cliente_info.funcionario_id_associado;
      }
      
      // Log de debug removido para evitar problemas de performance
    }
    
    // Preparar dados para a API Laravel
    const osParaAPI = {
      id_os: osCompletaParaSalvar.id_os,
      cliente_id: isFuncionario ? null : (osCompletaParaSalvar.cliente_info?.id || null),
      funcionario_id: funcionarioIdParaAPI,
      cliente_info: osCompletaParaSalvar.cliente_info || null,
      cliente_nome_manual: osCompletaParaSalvar.cliente_nome_manual || '',
      vendedor_id: osCompletaParaSalvar.vendedor_id,
      vendedor_nome: osCompletaParaSalvar.vendedor_nome || '',
      data_criacao: osCompletaParaSalvar.data_criacao,
      // Enviar no campo esperado pelo backend
      data_prevista_entrega: osCompletaParaSalvar.data_previsao_entrega || null,
      maquina_impressao_id: osCompletaParaSalvar.maquina_impressao_id || null,
      status_os: osCompletaParaSalvar.status_os,
      status_pagamento: osCompletaParaSalvar.status_pagamento || 'Pendente',
      valor_total_os: osCompletaParaSalvar.valor_total_os,
      desconto_terceirizado_percentual: parseFloat(osCompletaParaSalvar.desconto_terceirizado_percentual) || 0,
      desconto_geral_tipo: osCompletaParaSalvar.desconto_geral_tipo || 'percentual',
      desconto_geral_valor: parseFloat(osCompletaParaSalvar.desconto_geral_valor) || 0,
      frete_valor: parseFloat(osCompletaParaSalvar.frete_valor) || 0,
      observacoes_gerais_os: osCompletaParaSalvar.observacoes || '',
      observacoes: osCompletaParaSalvar.observacoes_gerais_os || osCompletaParaSalvar.observacoes || '',
      observacoes_cliente_para_nota: osCompletaParaSalvar.observacoes_cliente_para_nota || '',
      data_finalizacao_os: osCompletaParaSalvar.data_finalizacao_os || null,
      data_ultima_modificacao: osCompletaParaSalvar.data_ultima_modificacao,
      data_validade: osCompletaParaSalvar.data_validade || null,
      itens: osCompletaParaSalvar.itens.map(item => {
        // Preparar detalhes incluindo observação do item
        let detalhes = item.detalhes || {};
        if (item.observacao_item && item.observacao_item.trim()) {
          if (typeof detalhes === 'string') {
            try {
              detalhes = JSON.parse(detalhes);
            } catch (e) {
              detalhes = {};
            }
          }
          if (typeof detalhes === 'object' && detalhes !== null) {
            detalhes.observacao_item = item.observacao_item;
          } else {
            detalhes = { observacao_item: item.observacao_item };
          }
        }
        
        return {
          produto_id: item.produto_id || null,
          nome_servico_produto: item.nome_servico_produto || item.nome_produto || '',
          tipo_item: item.tipo_item,
          quantidade: parseFloat(String(item.quantidade || '0').replace(',', '.')) || 0,
          valor_unitario: parseFloat(String(item.valor_unitario || '0').replace(',', '.')) || 0,
          valor_total: parseFloat(item.subtotal_item) || 0,
          largura: parseFloat(String(item.largura || '0').replace(',', '.')) || 0,
          altura: parseFloat(String(item.altura || '0').replace(',', '.')) || 0,
          acabamentos: JSON.stringify(item.acabamentos_selecionados || []),
          detalhes: detalhes
        };
      }),
      pagamentos: osCompletaParaSalvar.pagamentos || []
    };

    // Log dos dados sendo enviados para debug
    console.log('📊 Dados da OS sendo enviados para API:', {
      cliente_id: osParaAPI.cliente_id,
      funcionario_id: osParaAPI.funcionario_id,
      is_funcionario: osParaAPI.cliente_info?.isFuncionario,
      valor_total_os: osParaAPI.valor_total_os
    });

    // Se já existir na API, atualizar; caso contrário, criar
    let response;
    try {
      console.log('🔍 OS - Verificando se OS existe:', osParaAPI.id_os);
      await osService.getById(osParaAPI.id_os);
      console.log('✅ OS - OS encontrada, atualizando:', osParaAPI.id_os);
      response = await osService.update(osParaAPI.id_os, osParaAPI);
    } catch (e) {
      if (e?.response?.status === 404) {
        console.log('🆕 OS - OS não encontrada, criando nova:', osParaAPI.id_os);
        response = await osService.create(osParaAPI);
      } else {
        console.error('❌ OS - Erro ao buscar OS:', e);
        throw e;
      }
    }
    
    // Se a API retornou um ID diferente, usar esse ID
    if (response.data?.id_os) {
      osCompletaParaSalvar.id_os = response.data.id_os;
    }
    if (response.data?.id) {
      osCompletaParaSalvar.id = response.data.id;
    }
    
    // Verificar se a OS foi salva corretamente
    if (!response.data || !response.data.id_os) {
      console.warn('⚠️ OS pode não ter sido salva corretamente na API');
    } 
    
  } catch (error) {
    console.error('Erro ao salvar OS na API Laravel:', error);
    
    // Tratar erro de ID duplicado
    if (error.response?.status === 409 && error.response?.data?.error === 'duplicate_id_os') {
      console.warn('⚠️ [saveOSToLocalStorage] ID da OS duplicado, gerando novo ID...');
      // Gerar novo ID e tentar novamente
      const novoId = `OS-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      osCompletaParaSalvar.id_os = novoId;
      
      try {
        const retryResponse = await osService.create(osParaAPI);
        if (retryResponse && retryResponse.data) {
          osCompletaParaSalvar.id_os = retryResponse.data.id_os;
          osCompletaParaSalvar.id = retryResponse.data.id;
          console.log('✅ [saveOSToLocalStorage] OS salva na API com novo ID:', {
            id: retryResponse.data.id,
            id_os: retryResponse.data.id_os
          });
        }
      } catch (retryError) {
        console.error('❌ [saveOSToLocalStorage] Erro ao salvar com novo ID:', retryError);
        throw retryError;
      }
    } else {
      throw error;
    }
  }

  // Salvar no localStorage (sempre, como backup)
  if (indexExistente > -1) {
    osSalvas[indexExistente] = osCompletaParaSalvar;
  } else {
    osSalvas.push(osCompletaParaSalvar);
  }
  await apiDataManager.setItem('ordens_servico_salvas', osSalvas);

  // Criar contas a receber para pagamentos com Crediário
  // Permitir pular efeitos financeiros em atualizações de OS finalizada (edição sem alterar status)
  if (!options?.skipFinanceSideEffects && (osCompletaParaSalvar.status_os === 'Finalizada' || osCompletaParaSalvar.status_os === 'Entregue')) {
    const pagamentosCrediario = osCompletaParaSalvar.pagamentos?.filter(p => p.metodo === 'Crediário') || []; 
    
    // Verificar se é funcionário - funcionários não devem ter contas a receber
    const isFuncionario = osCompletaParaSalvar.cliente_info?.isFuncionario || 
                         osCompletaParaSalvar.cliente_info?.tipo_pessoa === 'funcionario' || 
                         osCompletaParaSalvar.cliente_info?.tipo_cadastro_especial === 'Funcionário' ||
                         (osCompletaParaSalvar.cliente_info?.id && osCompletaParaSalvar.cliente_info.id.toString().startsWith('funcionario_'));
    
    if (isFuncionario) {
      console.log('ℹ️ OS de funcionário finalizada - não criando contas a receber:', {
        id_os: osCompletaParaSalvar.id_os,
        funcionario_id: osCompletaParaSalvar.cliente_info?.funcionario_id,
        cliente_info: osCompletaParaSalvar.cliente_info
      });
    }
    
    if (pagamentosCrediario.length > 0 && !isFuncionario && osCompletaParaSalvar.cliente_info?.id && osCompletaParaSalvar.cliente_info.id !== 'null' && osCompletaParaSalvar.cliente_info.id !== null) {
      // Verificar se já existem contas a receber para esta OS para evitar duplicatas
      let contasJaCriadas = false;
      try {
        const contasExistentes = await contaReceberService.getContasReceber({
          os_id: osCompletaParaSalvar.id,
          cliente_id: osCompletaParaSalvar.cliente_info.id
        });
        
        if (contasExistentes && contasExistentes.data && contasExistentes.data.length > 0) {
          console.log('ℹ️ Contas a receber já existem para esta OS:', {
            os_id: osCompletaParaSalvar.id,
            contas_existentes: contasExistentes.data.length
          });
          contasJaCriadas = true;
        }
      } catch (error) {
        console.warn('Erro ao verificar contas existentes, continuando com criação:', error);
      }

      if (!contasJaCriadas) {
        for (const pagamento of pagamentosCrediario) {
          try {
          // Usar a data de vencimento configurada pelo usuário ou calcular padrão (30 dias)
          const dataVencimento = pagamento.dataVencimento 
            ? new Date(pagamento.dataVencimento + 'T00:00:00')
            : addDays(new Date(osCompletaParaSalvar.data_finalizacao_os || new Date()), 30);
          
          // Validar se a data de vencimento é válida
          if (isNaN(dataVencimento.getTime())) {
            throw new Error('Data de vencimento inválida para conta a receber');
          }
          
          const valorConta = parseFloat(pagamento.valorFinal || pagamento.valor);
          
          if (isNaN(valorConta) || valorConta <= 0) {
            throw new Error(`Valor inválido para conta a receber: ${pagamento.valorFinal || pagamento.valor}`);
          }
          
          // Preparar observações da OS
          const observacoesOS = osCompletaParaSalvar.observacoes_gerais_os || osCompletaParaSalvar.observacoes || '';
          const observacoesItens = (osCompletaParaSalvar.itens || [])
            .filter(item => item.observacoes && item.observacoes.trim())
            .map(item => `${item.nome_servico_produto || 'Item'}: ${item.observacoes}`)
            .join('\n');
          
          // Combinar observações da OS e dos itens
          const observacoesCombinadas = [];
          if (observacoesOS.trim()) {
            observacoesCombinadas.push(`OS: ${observacoesOS}`);
          }
          if (observacoesItens.trim()) {
            observacoesCombinadas.push(`Itens:\n${observacoesItens}`);
          }
          
          const observacoesFinal = observacoesCombinadas.length > 0 
            ? observacoesCombinadas.join('\n\n')
            : `Ordem de Serviço: ${osCompletaParaSalvar.id_os}\nCliente: ${osCompletaParaSalvar.cliente_info.nome}\nParcelas: ${pagamento.parcelas || 1}x\nValor por parcela: R$ ${(valorConta / (pagamento.parcelas || 1)).toFixed(2)}`;

          const contaReceberData = {
            cliente_id: parseInt(osCompletaParaSalvar.cliente_info.id), // Garantir que é número
            os_id: osCompletaParaSalvar.id, // Usar o ID numérico da OS (campo 'id' da tabela)
            descricao: `OS #${osCompletaParaSalvar.id_os ? String(osCompletaParaSalvar.id_os).slice(-6) : 'N/A'} - Crediário (${pagamento.parcelas || 1}x)`,
            valor_original: parseFloat(valorConta), // Garantir que é número
            data_vencimento: dataVencimento.toISOString().split('T')[0], // Formato YYYY-MM-DD
            data_emissao: new Date().toISOString().split('T')[0],
            observacoes: observacoesFinal
          };

          // Validar dados antes de enviar
          if (!contaReceberData.cliente_id || !contaReceberData.valor_original || !contaReceberData.data_vencimento) {
            throw new Error(`Dados inválidos para conta a receber: cliente_id=${contaReceberData.cliente_id}, valor_original=${contaReceberData.valor_original}, data_vencimento=${contaReceberData.data_vencimento}`);
          }
          
          try {
            // Criar na API Laravel
            const response = await contaReceberService.create(contaReceberData);
          } catch (apiError) {
            console.error('❌ Erro ao criar conta a receber na API:', apiError);
            console.error('❌ Detalhes do erro:', {
              message: apiError.message,
              response: apiError.response?.data,
              status: apiError.response?.status,
              statusText: apiError.response?.statusText
            });
            throw apiError;
          }
          
        } catch (error) {
          console.error('Erro ao criar conta a receber na API:', error);
          // Não criar fallback local - deixar que o erro seja tratado pelo usuário
          throw new Error(`Erro ao criar conta a receber: ${error.message || 'Erro desconhecido'}`);
        }
      }
    }
  }

  if (!options?.skipFinanceSideEffects && (osCompletaParaSalvar.status_os === 'Finalizada' || osCompletaParaSalvar.status_os === 'Entregue')) {
    // Registrar consumo interno para funcionário, se aplicável
    try {
      const info = osCompletaParaSalvar.cliente_info || {};
      const isFuncionario = info.isFuncionario || 
                           info.tipo_pessoa === 'funcionario' || 
                           info.tipo_cadastro_especial === 'Funcionário' ||
                           (info.id && info.id.toString().startsWith('funcionario_'));
      
      // Extrair funcionario_id de diferentes fontes possíveis
      let funcionarioId = info.funcionario_id || info.funcionario_id_associado;
      if (!funcionarioId && info.id && info.id.toString().startsWith('funcionario_')) {
        funcionarioId = info.id.toString().replace('funcionario_', '');
      }
      
      // Garantir que funcionarioId seja um número
      if (funcionarioId && typeof funcionarioId === 'string') {
        funcionarioId = parseInt(funcionarioId);
      }
      
      // Log de debug removido para evitar problemas de performance
      
      // Só contabilizar consumo interno se houver pagamentos em Crediário
      const temPagamentoCrediario = osCompletaParaSalvar.pagamentos?.some(pag => pag.metodo === 'Crediário');
      
      if (isFuncionario && funcionarioId && temPagamentoCrediario) {
        console.log('✅ Consumo interno detectado para OS com Crediário - será registrado via API');
        // O consumo interno será registrado via API do backend, não no localStorage
      } else if (isFuncionario && funcionarioId && !temPagamentoCrediario) {
        console.log('ℹ️ Consumo interno detectado para OS, mas sem Crediário - NÃO será contabilizado');
        // Não contabilizar consumo interno quando não há Crediário
      }
    } catch (e) {
      console.warn('Falha ao registrar consumo interno (OS):', e);
    }
    
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
    
    const categoriaOS = categoriasFluxo.find(cat => cat?.nome?.toLowerCase().includes('venda de serviços gráficos')) || null;

    // Garantir que pagamentos é um array válido
    const pagamentos = Array.isArray(osCompletaParaSalvar.pagamentos) ? osCompletaParaSalvar.pagamentos : [];
    
    pagamentos.forEach(pag => {
        const novoLancamento = {
            id: `fluxo-os-${osCompletaParaSalvar.id_os}-${pag.metodo.replace(/\s+/g, '-')}-${Date.now()}`,
            data: new Date().toISOString(),
                                descricao: `OS #${osCompletaParaSalvar.id_os ? String(osCompletaParaSalvar.id_os).slice(-6) : 'N/A'} (${pag.metodo}${pag.parcelas ? ` ${pag.parcelas}x` : ''})`,
            valor: safeParseFloat(pag.valorFinal || pag.valor),
            tipo: 'entrada',
            categoria_id: categoriaOS ? categoriaOS.id : '',
            conta_bancaria_id: pag.conta_destino_id || pag.contaBancariaId || '',
            cliente_fornecedor_id: osCompletaParaSalvar.cliente_info?.id || '',
            origem_id: osCompletaParaSalvar.id_os,
            origem_tipo: 'OS',
            vendedor_id: osCompletaParaSalvar.vendedor_id || null,
            forma_pagamento: pag.metodo,
            detalhes_pagamento: {
              parcelas: pag.parcelas,
              maquinaInfo: pag.maquinaInfo,
              taxaInfo: pag.taxaInfo,
              valorOriginal: pag.valorOriginal,
            }
        };
        lancamentosFluxo.push(novoLancamento);
    });
    await apiDataManager.setItem('lancamentosFluxoCaixa', lancamentosFluxo);
  }
  return osCompletaParaSalvar; 
};


export const loadInitialOSContext = async (locationState, currentOSId, vendedorAtual) => {
  if (locationState?.osId) {
    const osParaEditar = await loadOS(locationState.osId);
    if (osParaEditar) {
      return {
        ordemServico: { ...osParaEditar, isEditandoViaHistorico: true },
        clienteSelecionado: osParaEditar.cliente_info || null,
        isOSFinalizada: osParaEditar.status_os === 'Finalizada' || osParaEditar.status_os === 'Entregue',
        toastMessage: { title: 'OS Carregada', description: `Visualizando a OS ${osParaEditar.id_os ? String(osParaEditar.id_os).slice(-6) : 'N/A'}` }
      };
    } else {
      console.warn('⚠️ [loadInitialOSContext] OS não encontrada via locationState.osId:', locationState.osId);
    }
  } else if (currentOSId && currentOSId !== initialOrdemServicoStateSync().id_os) {
    const osExistente = await loadOS(currentOSId);
    if (osExistente) {
      return {
          ordemServico: osExistente,
          clienteSelecionado: osExistente.cliente_info || null,
          isOSFinalizada: osExistente.status_os === 'Finalizada' || osExistente.status_os === 'Entregue',
          toastMessage: null
      };
    } else {
      console.warn('⚠️ [loadInitialOSContext] OS não encontrada via currentOSId:', currentOSId);
    }
  }
  
  const osBase = initialOrdemServicoStateSync();
  if (vendedorAtual) {
    osBase.vendedor_id = vendedorAtual.id;
    osBase.vendedor_nome = vendedorAtual.nome;
  }
  return {
      ordemServico: osBase,
      clienteSelecionado: null,
      isOSFinalizada: false,
      toastMessage: null 
  };
};

export const moverParaLixeiraOS = async (os, justificativa, deletedBy, registrarAcaoCallback) => {
  // Primeiro, mover para lixeira local
  const lixeira = await apiDataManager.getDataAsArray('lixeira', []);
  const itemExcluido = {
    type: 'OS',
    data: os,
    deletedAt: new Date().toISOString(),
    justification: justificativa,
    deletedBy: deletedBy?.nome || 'N/A',
  };
  lixeira.push(itemExcluido);
  await apiDataManager.setItem('lixeira', lixeira);

  // Remover das OS salvas localmente
  const osSalvas = await apiDataManager.getDataAsArray('ordens_servico_salvas', []);
  const novasOsSalvas = osSalvas.filter(o => o.id_os !== os.id_os);
  await apiDataManager.setItem('ordens_servico_salvas', novasOsSalvas);
  
  // Devolver estoque se necessário (apenas localmente)
  if (os.status_os === 'Finalizada' || os.status_os === 'Entregue') {
    await baixarEstoqueOS(os.itens, true, registrarAcaoCallback, `Devolução por exclusão OS ${os.id_os}`); 
  }

  // Registrar ação localmente
  if (registrarAcaoCallback) {
    registrarAcaoCallback('excluir_para_lixeira', 'OS', os.id_os, os, null, justificativa);
  }
  
  // Tentar excluir na API em background (não bloquear a exclusão local)
  (async () => {
    try {
      console.log('[OS] Tentando excluir na API:', os.id_os || os.id);
      if (os?.id_os) {
        await osService.delete(os.id_os);
        console.log('[OS] Excluída na API com sucesso:', os.id_os);
      } else if (os?.id) {
        await osService.delete(os.id);
        console.log('[OS] Excluída na API com sucesso:', os.id);
      }
    } catch (apiDeleteError) {
      console.warn('[OS] Falha ao excluir OS na API (não crítico):', apiDeleteError);
      // Não relançar o erro - a exclusão local já foi feita
    }
  })();
  
  return novasOsSalvas;
};

export const baixarEstoqueOS = async (itens, isDevolucao = false, registrarAcaoCallback, referenciaId) => {
  const produtosAtualizados = await apiDataManager.getDataAsArray('produtos', []);
  // Snapshot para detectar o que mudou e sincronizar com a API
  const produtosAntes = JSON.parse(JSON.stringify(produtosAtualizados));
  // Carregar configuração de acabamentos da chave correta
  const acabamentosConfig = await apiDataManager.getDataAsArray('acabamentos_config', []);
  let modificouEstoque = false;

  // Processar itens principais
  itens.forEach(itemOS => {
    if (itemOS.tipo_item === 'unidade' && itemOS.produto_id) { 
      const produtoIndex = produtosAtualizados.findIndex(p => p.id === itemOS.produto_id);
      if (produtoIndex > -1) {
        const produtoOriginal = JSON.parse(JSON.stringify(produtosAtualizados[produtoIndex]));
        let estoqueModificadoParaItem = false;
        const quantidade = safeParseFloat(itemOS.quantidade);

        if (itemOS.variacao_selecionada?.id_variacao) {
          const variacaoIndex = produtosAtualizados[produtoIndex].variacoes.findIndex(v => v.id_variacao === itemOS.variacao_selecionada.id_variacao);
          if (variacaoIndex > -1) {
            const estoqueVarAtual = safeParseFloat(produtosAtualizados[produtoIndex].variacoes[variacaoIndex].estoque_var);
            produtosAtualizados[produtoIndex].variacoes[variacaoIndex].estoque_var = isDevolucao 
              ? estoqueVarAtual + quantidade
              : Math.max(0, estoqueVarAtual - quantidade);
            modificouEstoque = true;
            estoqueModificadoParaItem = true;
          }
        } else {
          const estoqueAtual = safeParseFloat(produtosAtualizados[produtoIndex].estoque);
          produtosAtualizados[produtoIndex].estoque = isDevolucao
            ? estoqueAtual + quantidade
            : Math.max(0, estoqueAtual - quantidade);
          modificouEstoque = true;
          estoqueModificadoParaItem = true;
        }
        
        if (estoqueModificadoParaItem && registrarAcaoCallback) {
          const acaoTipo = isDevolucao ? 'devolucao_estoque_os' : 'baixa_estoque_os';
          registrarAcaoCallback(
              acaoTipo,
              'Produto',
              produtoOriginal.id,
              { estoque_anterior: produtoOriginal.estoque, variacao_anterior: itemOS.variacao_selecionada ? produtoOriginal.variacoes.find(v => v.id_variacao === itemOS.variacao_selecionada.id_variacao)?.estoque_var : undefined },
              { estoque_atual: produtosAtualizados[produtoIndex].estoque, variacao_atual: itemOS.variacao_selecionada ? produtosAtualizados[produtoIndex].variacoes.find(v => v.id_variacao === itemOS.variacao_selecionada.id_variacao)?.estoque_var : undefined },
              `${isDevolucao ? 'Devolução' : 'Baixa'} de estoque para ${referenciaId}`
          );
        }
      }
    } else if (itemOS.tipo_item === 'm2' && (itemOS.id_produto_principal || itemOS.produto_id) ) {
      const idPrincipal = itemOS.id_produto_principal || itemOS.produto_id;
      const produtoIndex = produtosAtualizados.findIndex(p => p.id === idPrincipal);
      if (produtoIndex > -1) {
          const produtoOriginal = JSON.parse(JSON.stringify(produtosAtualizados[produtoIndex]));
          const areaTotal = safeParseFloat(itemOS.largura_item_final || itemOS.largura) * 
                            safeParseFloat(itemOS.altura_item_final || itemOS.altura) * 
                            safeParseFloat(itemOS.quantidade);
          if (areaTotal > 0) {
              const estoqueAtual = safeParseFloat(produtosAtualizados[produtoIndex].estoque);
              produtosAtualizados[produtoIndex].estoque = isDevolucao
                  ? estoqueAtual + areaTotal
                  : Math.max(0, estoqueAtual - areaTotal);
              modificouEstoque = true;

              if (registrarAcaoCallback) {
                  const acaoTipo = isDevolucao ? 'devolucao_estoque_os_m2' : 'baixa_estoque_os_m2';
                  registrarAcaoCallback(
                      acaoTipo,
                      'Produto (m²)',
                      produtoOriginal.id,
                      { estoque_anterior: produtoOriginal.estoque },
                      { estoque_atual: produtosAtualizados[produtoIndex].estoque },
                      `${isDevolucao ? 'Devolução' : 'Baixa'} de ${areaTotal.toFixed(2)}m² de estoque para ${referenciaId}`
                  );
              }
          }
      }
    }
  });

  // Processar acabamentos dos itens
  const produtosComAcabamentos = baixarEstoqueAcabamentosOS(
    { itens: itens }, 
    produtosAtualizados, 
    acabamentosConfig,
    isDevolucao
  );

  // Atualizar produtos se houve modificações
  if (modificouEstoque || JSON.stringify(produtosComAcabamentos) !== JSON.stringify(produtosAtualizados)) {
    await apiDataManager.setItem('produtos', produtosComAcabamentos);

    // Sincronizar alterações de estoque com o backend (API Laravel)
    try {
      const produtosDepois = produtosComAcabamentos;

      const mudouVariacoes = (antes = [], depois = []) => {
        if (!Array.isArray(antes) && !Array.isArray(depois)) return false;
        const mapAntes = new Map((antes || []).map(v => [v.id_variacao, String(v.estoque_var)]));
        const mapDepois = new Map((depois || []).map(v => [v.id_variacao, String(v.estoque_var)]));
        if (mapAntes.size !== mapDepois.size) return true;
        for (const [id, est] of mapDepois.entries()) {
          if (mapAntes.get(id) !== est) return true;
        }
        return false;
      };

      const produtosParaAtualizar = [];
      for (const pDepois of produtosDepois) {
        const pAntes = produtosAntes.find(p => p.id === pDepois.id);
        if (!pAntes) continue;
        const estoqueAntes = String(pAntes.estoque ?? '0');
        const estoqueDepois = String(pDepois.estoque ?? '0');
        const variacoesAlteradas = mudouVariacoes(pAntes.variacoes, pDepois.variacoes);
        if (estoqueAntes !== estoqueDepois || variacoesAlteradas) {
          produtosParaAtualizar.push({
            id: pDepois.id,
            data: {
              estoque: pDepois.estoque,
              variacoes: Array.isArray(pDepois.variacoes) ? pDepois.variacoes : undefined,
            }
          });
        }
      }

      // Disparar atualizações em paralelo (limitado pelo navegador/backend)
      await Promise.all(
        produtosParaAtualizar.map(pu => produtoService.update(pu.id, pu.data).catch(err => {
          console.error('[OS] Falha ao sincronizar estoque do produto', pu.id, err);
        }))
      );
    } catch (syncError) {
      console.error('[OS] Erro ao sincronizar estoque com API', syncError);
    }
  }
};

// Hook principal que expõe todas as funcionalidades
const useOSDataService = () => {
  return {
    loadOSFromAPI,
    loadOSFromLocalStorage,
    loadOS,
    testValorTotalOS,
    saveOSToLocalStorage,
    loadInitialOSContext,
    moverParaLixeiraOS,
    baixarEstoqueOS
  };
};

export default useOSDataService;