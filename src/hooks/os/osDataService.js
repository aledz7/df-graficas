import { safeJsonParse, safeParseFloat } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';
import { initialOrdemServicoState, initialOrdemServicoStateSync } from './osConstants';
import { osService, acabamentoService } from '@/services/api';
import { calcularSubtotalItem, garantirIdsItensOS } from './osLogic';
import { formatDateForBackend } from '@/utils/dateUtils';

// Funções exportadas individualmente
export const loadOSFromAPI = async (osId) => {
  console.log('🔍 [loadOSFromAPI] called with:', osId);
  try {
    console.log('🔍 [loadOSFromAPI] Fazendo chamada para osService.getById...');
    const response = await osService.getById(osId);
    console.log('✅ [loadOSFromAPI] Resposta da API:', response);
    
    // A resposta da API já contém os dados da OS diretamente
    // Não precisa acessar response.data, pois o response JÁ É a OS
    if (response && (response.id || response.id_os)) {
      console.log('✅ [loadOSFromAPI] OS encontrada na API:', { 
        id: response.id, 
        id_os: response.id_os,
        cliente_id: response.cliente_id,
        itens_count: response.itens ? response.itens.length : 0,
        itens: response.itens
      });
      return response;
    } else {
      console.log('❌ [loadOSFromAPI] Resposta da API não contém dados válidos da OS');
      return null;
    }
  } catch (error) {
    console.error('❌ [loadOSFromAPI] Erro ao carregar OS da API:', error);
    console.error('❌ [loadOSFromAPI] Detalhes do erro:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return null;
  }
};

export const loadOSFromLocalStorage = async (osId) => {
  console.log('🔍 [loadOSFromLocalStorage] called with:', osId);
  try {
    const ordensServico = await apiDataManager.getDataAsArray('ordens_servico_salvas');
    console.log('🔍 [loadOSFromLocalStorage] Total OSs no localStorage:', ordensServico.length);
    
    // Log das primeiras OSs para debug
    if (ordensServico.length > 0) {
      console.log('🔍 [loadOSFromLocalStorage] Primeiras OSs:', ordensServico.slice(0, 3).map(os => ({
        id: os.id,
        id_os: os.id_os,
        cliente_nome: os.cliente_nome_manual || os.cliente_info?.nome
      })));
    }
    
    const osEncontrada = ordensServico.find(os => os.id_os === osId || os.id === osId) || null;
    
    if (osEncontrada) {
      console.log('✅ [loadOSFromLocalStorage] OS encontrada:', {
        id: osEncontrada.id,
        id_os: osEncontrada.id_os,
        cliente_id: osEncontrada.cliente_id,
        itens_count: osEncontrada.itens ? osEncontrada.itens.length : 0,
        status: osEncontrada.status_os
      });
    } else {
      console.log('❌ [loadOSFromLocalStorage] OS não encontrada no localStorage');
    }
    
    return osEncontrada;
  } catch (error) {
    console.error('❌ [loadOSFromLocalStorage] Erro ao carregar OS do localStorage:', error);
    return null;
  }
};

export const loadOS = async (osId) => {
  console.log('🔍 [loadOS] called with:', osId, typeof osId);
  if (!osId) {
    console.log('❌ [loadOS] osId está vazio ou null');
    return null;
  }
  
  // Tentar carregar da API primeiro
  let osData = await loadOSFromAPI(osId);
  
  if (osData) {
    console.log('✅ [loadOS] OS encontrada na API:', { id: osData.id, id_os: osData.id_os, itens_count: osData.itens ? osData.itens.length : 0 });
    return osData;
  }
  
  // Se não encontrou na API, tentar localStorage
  console.log('🔍 [loadOS] API não retornou dados, tentando localStorage...');
  osData = await loadOSFromLocalStorage(osId);
  
  if (osData) {
    console.log('✅ [loadOS] OS encontrada no localStorage:', { 
      id: osData.id, 
      id_os: osData.id_os, 
      itens_count: osData.itens ? osData.itens.length : 0,
      status: osData.status_os,
      isLocalOnly: true // Flag para indicar que é apenas local
    });
    
    // CRÍTICO: Se a OS do localStorage não tem id mas tem id_os, tentar buscar da API
    // Isso garante que mesmo se você demorar para finalizar, o id será atualizado
    if (!osData.id && osData.id_os) {
      console.log('⚠️ [loadOS] OS do localStorage sem id, tentando buscar da API pelo id_os:', osData.id_os);
      try {
        const osDaAPI = await loadOSFromAPI(osData.id_os);
        if (osDaAPI && osDaAPI.id) {
          // Atualizar o id da OS do localStorage com o id da API
          osData.id = osDaAPI.id;
          // Atualizar também no localStorage para próxima vez
          await saveOSToLocalStorage(osData);
          console.log('✅ [loadOS] ID atualizado da API:', osData.id);
        }
      } catch (e) {
        console.warn('⚠️ [loadOS] Erro ao buscar id da API, mantendo OS do localStorage:', e);
      }
    }
    
    // Marcar a OS como "apenas local" para tratamento especial
    osData.isLocalOnly = true;
  } else {
    console.log('❌ [loadOS] OS não encontrada nem na API nem no localStorage');
  }
  
  return osData;
};

export const testValorTotalOS = (osData) => {
  console.log('testValorTotalOS called with:', osData);
  return true;
};

export const saveOSToAPI = async (osData, options = {}) => {
  console.log('saveOSToAPI called with:', osData, options);
  let savedOSData; // Declarar no escopo da função
  
  try {
    // Função para converter valores com vírgula para ponto decimal
    const sanitizeNumericValue = (value) => {
      if (typeof value === 'string') {
        return value.replace(',', '.');
      }
      return value;
    };

    // Função para extrair funcionario_id quando cliente é um funcionário
    const extractFuncionarioId = (clienteId, clienteInfo) => {
      // Se o cliente_id começa com "funcionario_", extrair o ID numérico
      if (clienteId && typeof clienteId === 'string' && clienteId.startsWith('funcionario_')) {
        const funcionarioId = clienteId.replace('funcionario_', '');
        console.log('🔧 [saveOSToAPI] Funcionário detectado, extraindo ID:', {
          clienteId,
          funcionarioId: parseInt(funcionarioId)
        });
        return parseInt(funcionarioId);
      }
      
      // Se cliente_info tem funcionario_id, usar ele
      if (clienteInfo && clienteInfo.funcionario_id) {
        console.log('🔧 [saveOSToAPI] Funcionário ID encontrado em cliente_info:', clienteInfo.funcionario_id);
        return parseInt(clienteInfo.funcionario_id);
      }
      
      return null;
    };

    // Buscar máquinas do localStorage se necessário (para OS finalizadas sem máquina)
    let maquinaPadraoId = null;
    if ((osData.status_os === 'Finalizada' || osData.status_os === 'Entregue') && !osData.maquina_impressao_id) {
      try {
        const maquinas = safeJsonParse(await apiDataManager.getItem('maquinas'), []);
        if (Array.isArray(maquinas) && maquinas.length > 0) {
          maquinaPadraoId = maquinas[0].id;
          console.log('🔧 [saveOSToAPI] Máquina padrão encontrada:', maquinaPadraoId);
        }
      } catch (e) {
        console.warn('⚠️ [saveOSToAPI] Erro ao buscar máquinas do localStorage:', e);
      }
    }

    // Preparar dados para enviar para a API
    // Função auxiliar para converter undefined em null
    const cleanValue = (value) => value === undefined ? null : value;
    
    // Preparar funcionario_id ANTES de criar o objeto
    // Prioridade: usar ID do usuário logado
    let funcionarioIdFinal = null;
    
    // Tentar obter o ID do usuário logado da API
    try {
      const { authService } = await import('@/services/api');
      const userData = await authService.checkAuth();
      if (userData && userData.id) {
        funcionarioIdFinal = userData.id;
        console.log('✅ [saveOSToAPI] Usando ID do usuário logado como funcionario_id:', funcionarioIdFinal);
      }
    } catch (e) {
      console.warn('⚠️ [saveOSToAPI] Erro ao buscar usuário logado da API, tentando localStorage:', e);
      // Fallback: tentar obter do localStorage
      try {
        const userData = await apiDataManager.getItem('user');
        if (userData) {
          const user = safeJsonParse(userData, null);
          if (user && user.id) {
            funcionarioIdFinal = user.id;
            console.log('✅ [saveOSToAPI] Usando ID do usuário logado do localStorage:', funcionarioIdFinal);
          }
        }
      } catch (localError) {
        console.warn('⚠️ [saveOSToAPI] Erro ao buscar usuário do localStorage:', localError);
      }
    }
    
    // Se não conseguiu obter do usuário logado, tentar outras fontes
    if (!funcionarioIdFinal) {
      funcionarioIdFinal = osData.funcionario_id;
      if (!funcionarioIdFinal) {
        funcionarioIdFinal = extractFuncionarioId(osData.cliente_id, osData.cliente_info);
      }
    }
    
    // Garantir que seja null ao invés de undefined
    if (funcionarioIdFinal === undefined) {
      funcionarioIdFinal = null;
    }
    
    // Garantir que numero_os esteja presente antes de salvar
    // Se a OS não tem numero_os válido (nova ou existente), gerar um número
    // Também verificar se o numero_os é um timestamp (número muito grande > 1.000.000)
    // IMPORTANTE: Orçamentos devem seguir a mesma lógica de OS normais
    const numeroOS = parseInt(osData.numero_os, 10);
    const isTimestamp = !isNaN(numeroOS) && numeroOS > 1000000;
    const numeroOSValido = osData.numero_os && 
                           osData.numero_os !== 0 && 
                           osData.numero_os !== null && 
                           osData.numero_os !== undefined &&
                           !isTimestamp; // Se for timestamp, considerar inválido
    
    if (!numeroOSValido) {
      try {
        // Para orçamentos e OS normais, usar a mesma lógica: buscar do backend
        // Tentar obter o próximo número diretamente do backend primeiro
        try {
          const { osService } = await import('@/services/api');
          const responseProximoNumero = await osService.getProximoNumero();
          const numeroServidor = responseProximoNumero?.numero_os ?? responseProximoNumero?.data?.numero_os;
          
          if (numeroServidor !== undefined && numeroServidor !== null) {
            const numeroConvertido = parseInt(numeroServidor, 10);
            if (!isNaN(numeroConvertido) && numeroConvertido > 0 && numeroConvertido < 1000000) {
              osData.numero_os = numeroConvertido;
              if (!osData.id_os || isTimestamp) {
                osData.id_os = `OS-${numeroConvertido}`;
              }
              console.log('🔢 [saveOSToAPI] Usando numero_os do servidor (aplicado para orçamentos e OS normais):', {
                numero_os: numeroConvertido,
                id_os: osData.id_os,
                status_os: osData.status_os
              });
            }
          }
        } catch (erroServidor) {
          console.warn('⚠️ [saveOSToAPI] Falha ao obter próximo número do servidor, usando fallback local:', erroServidor);
        }
        
        // Se não conseguiu obter do servidor, usar getNextOSId como fallback
        if (!osData.numero_os || osData.numero_os === 0) {
          const { getNextOSId } = await import('./osIdService');
          let novoNumero = await getNextOSId();
          
          // Verificar se o número retornado também é timestamp
          // Se for, buscar o maior numero_os válido do banco e incrementar
          if (novoNumero > 1000000) {
            console.warn('⚠️ [saveOSToAPI] getNextOSId retornou timestamp, usando alternativa:', novoNumero);
            // Se a OS já tem id, usar baseado no id
            if (osData.id && osData.id > 0 && osData.id < 1000000) {
              novoNumero = osData.id;
            } else {
              // Buscar o maior numero_os válido do banco e incrementar
              // IMPORTANTE: Incluir orçamentos na busca (não filtrar por status)
              try {
                const { osService } = await import('@/services/api');
                const response = await osService.getAll({ 
                  per_page: 1, 
                  page: 1, 
                  orderBy: 'numero_os', 
                  orderDirection: 'desc' 
                });
                const ultimaOS = response?.data?.data?.[0] || response?.data?.[0];
                if (ultimaOS && ultimaOS.numero_os && ultimaOS.numero_os > 0 && ultimaOS.numero_os < 1000000) {
                  novoNumero = ultimaOS.numero_os + 1;
                  console.log('🔢 [saveOSToAPI] Usando último numero_os do banco + 1 (incluindo orçamentos):', {
                    ultimo_numero: ultimaOS.numero_os,
                    novo_numero: novoNumero,
                    status_ultima_os: ultimaOS.status_os
                  });
                } else {
                  // Fallback: buscar do backend diretamente
                  console.warn('⚠️ [saveOSToAPI] Não encontrou numero_os válido, deixando backend gerar');
                  novoNumero = null; // Deixar backend gerar
                }
              } catch (e) {
                console.error('❌ [saveOSToAPI] Erro ao buscar último numero_os do banco:', e);
                novoNumero = null; // Deixar backend gerar
              }
            }
          }
          
          if (novoNumero && novoNumero > 0 && novoNumero < 1000000) {
            osData.numero_os = novoNumero;
            // Se o numero_os anterior era timestamp ou não existia, atualizar id_os também
            if (isTimestamp || !osData.id_os) {
              osData.id_os = `OS-${novoNumero}`;
              console.log('🔢 [saveOSToAPI] Atualizando id_os baseado no novo numero_os:', {
                numero_os_anterior: isTimestamp ? numeroOS : 'não existia',
                novo_numero_os: novoNumero,
                novo_id_os: osData.id_os
              });
            }
            console.log('🔢 [saveOSToAPI] Gerando numero_os para OS (orçamento ou normal):', {
              numero_os: novoNumero,
              id_os: osData.id_os,
              status_os: osData.status_os,
              is_nova_os: !osData.id,
              id_existente: osData.id,
              era_timestamp: isTimestamp
            });
          } else {
            // Se não conseguiu gerar número válido, deixar backend gerar
            console.log('🔢 [saveOSToAPI] Não foi possível gerar numero_os válido, deixando backend gerar sequencialmente');
          }
        }
      } catch (error) {
        console.error('❌ [saveOSToAPI] Erro ao gerar numero_os:', error);
        // Continuar sem numero_os - o backend vai gerar usando resolverNumeroSequencial
        // que já inclui orçamentos na busca do maior número
      }
    }
    
    // Criar dataToSend SEM o spread inicial para evitar sobrescrever funcionario_id
    // Construir objeto manualmente para garantir controle total sobre os campos
    // Campos permitidos baseados no fillable do modelo OrdemServico
    const camposPermitidosOS = [
      'id_os',
      'numero_os',
      'cliente_id',
      'funcionario_id',
      'cliente_info',
      'status_os',
      'valor_total_os',
      'desconto_terceirizado_percentual',
      'desconto_geral_tipo',
      'desconto_geral_valor',
      'frete_valor',
      'data_criacao',
      'data_finalizacao_os',
      'data_validade',
      'data_prevista_entrega',
      'observacoes',
      'observacoes_gerais_os',
      'observacoes_cliente_para_nota',
      'maquina_impressao_id',
      'vendedor_id',
      'vendedor_nome',
      'pagamentos',
      'dados_producao',
      'tipo_origem',
      'dados_consumo_material',
      'tenant_id' // Será preenchido pelo backend
    ];
    
    let dataToSend = {
      // Campos básicos - DEFINIR funcionario_id PRIMEIRO para garantir que não seja sobrescrito
      funcionario_id: funcionarioIdFinal, // CRÍTICO: definir primeiro antes de qualquer spread
      cliente_id: cleanValue(osData.cliente_id || null),
      cliente_info: cleanValue(osData.cliente_info || null),
      status_os: osData.status_os || 'Em Aberto',
      valor_total_os: parseFloat(sanitizeNumericValue(osData.valor_total_os)) || 0,
      
      // Sanitizar itens para garantir que valores numéricos estejam corretos
      itens: (osData.itens || []).map(item => {
        const acabamentosParaEnviar = Array.isArray(item.acabamentos_selecionados) ? item.acabamentos_selecionados : (item.acabamentos || []);
        
        console.log('🔧 [saveOSToAPI] Mapeando item para envio:', {
          nome: item.nome_servico_produto || item.nome_produto,
          acabamentos_selecionados: item.acabamentos_selecionados,
          acabamentos_original: item.acabamentos,
          acabamentos_final: acabamentosParaEnviar
        });
        
        // Criar itemParaEnviar apenas com campos que existem no banco (fillable do OrdemServicoItem)
        // Campos permitidos baseados no fillable do modelo OrdemServicoItem
        const camposPermitidosItem = [
          'ordem_servico_id', // Será preenchido pelo backend
          'produto_id',
          'nome_servico_produto',
          'tipo_item',
          'quantidade',
          'valor_unitario',
          'valor_total',
          'largura',
          'altura',
          'acabamentos',
          'detalhes',
          'tenant_id', // Será preenchido pelo backend
          'id_item_os',
          'consumo_material_utilizado',
          'consumo_largura_peca',
          'consumo_altura_peca',
          'consumo_quantidade_solicitada',
          'consumo_largura_chapa',
          'consumo_altura_chapa',
          'consumo_valor_unitario_chapa',
          'consumo_pecas_por_chapa',
          'consumo_chapas_necessarias',
          'consumo_custo_total',
          'consumo_custo_unitario',
          'consumo_aproveitamento_percentual'
        ];
        
        const itemParaEnviar = {};
        
        // Adicionar apenas campos permitidos
        camposPermitidosItem.forEach(campo => {
          if (item[campo] !== undefined) {
            itemParaEnviar[campo] = item[campo];
          }
        });
        
        // Mapear campos específicos
        itemParaEnviar.produto_id = item.produto_id || null;
        itemParaEnviar.nome_servico_produto = item.nome_servico_produto || item.nome_produto || '';
        itemParaEnviar.tipo_item = item.tipo_item || 'unidade';
        itemParaEnviar.quantidade = sanitizeNumericValue(item.quantidade) || 1;
        itemParaEnviar.valor_unitario = sanitizeNumericValue(item.valor_unitario) || 0;
        itemParaEnviar.valor_total = parseFloat(sanitizeNumericValue(item.valor_total || item.subtotal_item)) || 0;
        itemParaEnviar.largura = item.largura ? sanitizeNumericValue(item.largura) : null;
        itemParaEnviar.altura = item.altura ? sanitizeNumericValue(item.altura) : null;
        itemParaEnviar.acabamentos = acabamentosParaEnviar;
        itemParaEnviar.detalhes = item.detalhes || null;
        itemParaEnviar.id_item_os = item.id_item_os || null;
        
        // IMPORTANTE: Remover qualquer campo que não esteja na lista de campos permitidos
        // Isso garante que campos extras (como campos temporários do frontend) não sejam enviados ao backend
        const camposFinais = Object.keys(itemParaEnviar);
        camposFinais.forEach(campo => {
          if (!camposPermitidosItem.includes(campo)) {
            console.warn(`⚠️ [saveOSToAPI] Removendo campo não permitido do item: ${campo}`);
            delete itemParaEnviar[campo];
          }
        });
        
        // Limpar campos de consumo de material - remover undefined e valores inválidos
        const camposConsumo = [
          'consumo_material_utilizado',
          'consumo_largura_peca',
          'consumo_altura_peca',
          'consumo_quantidade_solicitada',
          'consumo_largura_chapa',
          'consumo_altura_chapa',
          'consumo_valor_unitario_chapa',
          'consumo_pecas_por_chapa'
        ];
        
        camposConsumo.forEach(campo => {
          if (itemParaEnviar[campo] === undefined) {
            delete itemParaEnviar[campo];
          } else if (itemParaEnviar[campo] === null || itemParaEnviar[campo] === '') {
            // Manter null se for null ou string vazia, mas remover se for undefined
            itemParaEnviar[campo] = null;
          }
        });
        
        console.log('✅ [saveOSToAPI] Item final a ser enviado:', {
          nome: itemParaEnviar.nome_servico_produto || itemParaEnviar.nome_produto,
          acabamentos: itemParaEnviar.acabamentos,
          tem_acabamentos: itemParaEnviar.acabamentos && itemParaEnviar.acabamentos.length > 0
        });
        
        return itemParaEnviar;
      }),
      
      pagamentos: Array.isArray(osData.pagamentos) ? osData.pagamentos : [],
      // Só enviar dados_producao se houver dados específicos, senão deixar o backend definir automaticamente
      dados_producao: (osData.dados_producao && typeof osData.dados_producao === 'object' && 
                      (osData.dados_producao.status_producao || 
                       osData.dados_producao.prazo_estimado || 
                       osData.dados_producao.observacoes_internas || 
                       (osData.dados_producao.fotos_producao && osData.dados_producao.fotos_producao.length > 0))) 
        ? osData.dados_producao 
        : undefined,
      // Para OS finalizadas, garantir que campos obrigatórios estejam presentes
      // O backend exige: data_prevista_entrega, maquina_impressao_id, observacoes_gerais_os
      data_prevista_entrega: cleanValue((() => {
        if (osData.data_prevista_entrega) return osData.data_prevista_entrega;
        if (osData.data_previsao_entrega) return osData.data_previsao_entrega;
        // Se for OS finalizada e não tiver data prevista, usar data de finalização ou data atual
        if (osData.status_os === 'Finalizada' || osData.status_os === 'Entregue') {
          return osData.data_finalizacao_os || formatDateForBackend();
        }
        return null;
      })()),
      maquina_impressao_id: cleanValue(osData.maquina_impressao_id || maquinaPadraoId || null),
      id_os: cleanValue(osData.id_os || null),
      numero_os: osData.numero_os !== undefined && osData.numero_os !== null 
        ? (typeof osData.numero_os === 'number' ? osData.numero_os : parseInt(osData.numero_os, 10))
        : undefined,
      vendedor_id: cleanValue(osData.vendedor_id || null),
      vendedor_nome: cleanValue(osData.vendedor_nome || null),
      observacoes: cleanValue(osData.observacoes || null),
      // Para OS finalizadas, garantir que observacoes_gerais_os não seja null (pode ser string vazia)
      observacoes_gerais_os: (() => {
        if (osData.observacoes_gerais_os !== null && osData.observacoes_gerais_os !== undefined) {
          return String(osData.observacoes_gerais_os);
        }
        // Backend exige string: para OS finalizada usar string vazia
        if (osData.status_os === 'Finalizada' || osData.status_os === 'Entregue') {
          return '';
        }
        return '';
      })(),

      desconto_terceirizado_percentual: parseFloat(sanitizeNumericValue(osData.desconto_terceirizado_percentual)) || 0,
      desconto_geral_tipo: cleanValue(osData.desconto_geral_tipo || 'percentual'),
      desconto_geral_valor: parseFloat(sanitizeNumericValue(osData.desconto_geral_valor)) || 0,
      frete_valor: parseFloat(sanitizeNumericValue(osData.frete_valor)) || 0,
      data_criacao: cleanValue(osData.data_criacao || formatDateForBackend()),
      data_finalizacao_os: cleanValue(osData.data_finalizacao_os || null),
      data_validade: cleanValue(osData.data_validade || null),
      // Campos de consumo de material
      tipo_origem: cleanValue(osData.tipo_origem || null),
      dados_consumo_material: cleanValue(osData.dados_consumo_material || null),
      evoluir_para_producao: osData.evoluir_para_producao
    };
    
    // FILTRAR: Remover campos que NÃO estão no fillable do modelo (manter itens e evoluir_para_producao)
    // Isso evita erros de "Column not found" no banco
    const camposEnviados = Object.keys(dataToSend);
    const camposParaRemover = camposEnviados.filter(campo => !camposPermitidosOS.includes(campo) && campo !== 'itens' && campo !== 'evoluir_para_producao');
    
    if (camposParaRemover.length > 0) {
      console.warn('⚠️ [saveOSToAPI] Removendo campos que não existem no banco:', camposParaRemover);
      camposParaRemover.forEach(campo => {
        delete dataToSend[campo];
      });
    }
    
    // Remover todos os campos undefined do objeto final
    Object.keys(dataToSend).forEach(key => {
      if (dataToSend[key] === undefined) {
        delete dataToSend[key];
      }
    });
    
    // Remover campos que não existem no banco de dados
    // tipo_origem e dados_consumo_material não existem na tabela ordens_servico
    const camposInexistentes = ['tipo_origem', 'dados_consumo_material'];
    camposInexistentes.forEach(campo => {
      if (dataToSend[campo] !== undefined) {
        delete dataToSend[campo];
      }
    });
    
    // GARANTIR que funcionario_id NÃO seja undefined - FORÇAR o valor correto
    // Isso é crítico porque o backend pode rejeitar undefined
    // Se funcionarioIdFinal foi calculado corretamente, usar ele; senão, usar null
    if (funcionarioIdFinal !== undefined && funcionarioIdFinal !== null) {
      dataToSend.funcionario_id = funcionarioIdFinal;
    } else {
      dataToSend.funcionario_id = null;
    }
    
    // Garantir que todos os campos críticos não sejam undefined
    const camposCriticos = ['cliente_id', 'funcionario_id', 'maquina_impressao_id'];
    camposCriticos.forEach(campo => {
      if (dataToSend[campo] === undefined) {
        dataToSend[campo] = null;
      }
    });
    
    // ÚLTIMA VERIFICAÇÃO: garantir que funcionario_id está presente e não é undefined
    if (dataToSend.funcionario_id === undefined) {
      console.error('❌ [saveOSToAPI] ERRO CRÍTICO: funcionario_id ainda está undefined após todas as verificações!');
      dataToSend.funcionario_id = funcionarioIdFinal !== undefined ? funcionarioIdFinal : null;
    }
    
    // Log de verificação do funcionario_id antes de enviar
    console.log('🔍 [saveOSToAPI] Verificação final - funcionario_id:', {
      valor: dataToSend.funcionario_id,
      tipo: typeof dataToSend.funcionario_id,
      isUndefined: dataToSend.funcionario_id === undefined,
      isNull: dataToSend.funcionario_id === null,
      funcionarioIdFinal_original: funcionarioIdFinal,
      funcionarioIdFinal_tipo: typeof funcionarioIdFinal
    });
    
    // Log do payload completo ANTES do envio para debug
    console.log('📦 [saveOSToAPI] Payload completo antes do envio:', JSON.stringify(dataToSend, null, 2));

    console.log('📊 [saveOSToAPI] Dados sendo enviados para API:', {
      id: osData.id,
      id_os: osData.id_os,
      status_os: dataToSend.status_os,
      itens_count: dataToSend.itens?.length || 0,
      valor_total_os: dataToSend.valor_total_os,
      data_prevista_entrega: dataToSend.data_prevista_entrega,
      maquina_impressao_id: dataToSend.maquina_impressao_id,
      observacoes_gerais_os: dataToSend.observacoes_gerais_os,
      cliente_id: dataToSend.cliente_id,
      funcionario_id: dataToSend.funcionario_id,
      pagamentos_count: dataToSend.pagamentos?.length || 0,
      tipo_origem: dataToSend.tipo_origem,
      dados_consumo_material: dataToSend.dados_consumo_material
    });
    
    // Log detalhado dos itens para debug
    if (dataToSend.itens && dataToSend.itens.length > 0) {
      console.log('📦 [saveOSToAPI] Detalhes dos itens:', dataToSend.itens.map(item => ({
        nome: item.nome_servico_produto || item.nome_produto,
        tipo_item: item.tipo_item,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        subtotal_item: item.subtotal_item,
        produto_id: item.produto_id,
        acabamentos_count: item.acabamentos?.length || 0
      })));
    }
    
    // Função auxiliar para garantir funcionario_id antes de qualquer chamada API
    const garantirFuncionarioId = () => {
      if (dataToSend.funcionario_id === undefined) {
        console.error('❌ [saveOSToAPI] funcionario_id undefined antes do envio! Corrigindo...');
        dataToSend.funcionario_id = funcionarioIdFinal !== undefined ? funcionarioIdFinal : null;
      }
      console.log('✅ [saveOSToAPI] funcionario_id confirmado:', dataToSend.funcionario_id);
      // Log do payload exato que será enviado
      console.log('📤 [saveOSToAPI] Payload exato antes do envio:', {
        funcionario_id: dataToSend.funcionario_id,
        tipo_funcionario_id: typeof dataToSend.funcionario_id,
        payload_completo: JSON.parse(JSON.stringify(dataToSend))
      });
    };
    
    // CRÍTICO: Verificar se estamos realmente criando uma nova OS ou editando
    // Se temos um id mas o numero_os é diferente do que está no banco, pode ser que estamos criando uma nova OS
    // e o id está "sobrando" do estado anterior (ex: estava editando OS 717, depois criou nova OS 717)
    let isRealmenteEditando = false;
    let response = null;
    
    // Se temos id, SEMPRE tentar atualizar primeiro (não criar nova OS)
    if (osData.id && !options.forceCreate) {
      try {
        console.log('🔄 [saveOSToAPI] Tentando atualizar OS existente com id:', osData.id);
        garantirFuncionarioId();
        
        try {
          console.log('📤 [saveOSToAPI] Enviando requisição de atualização para API...');
          response = await osService.update(osData.id, dataToSend);
          console.log('📥 [saveOSToAPI] Resposta recebida da atualização:', {
            temResponse: !!response,
            responseType: typeof response,
            responseValue: response
          });
          
          // Verificar se a resposta é válida
          if (!response) {
            console.error('❌ [saveOSToAPI] Resposta vazia da atualização!');
            throw new Error('Resposta vazia da atualização');
          }
          
          isRealmenteEditando = true;
          console.log('✅ [saveOSToAPI] OS atualizada com sucesso:', osData.id, { 
            response: !!response, 
            responseType: typeof response,
            responseData: response?.data ? 'tem data' : 'sem data',
            isRealmenteEditando,
            responseKeys: response ? Object.keys(response) : []
          });
          // IMPORTANTE: Se a atualização foi bem-sucedida, pular toda a lógica de criação
          // e ir direto para o final da função
          // Não continuar para o bloco de criação abaixo
        } catch (innerError) {
          // Se houver erro na atualização, relançar para ser tratado pelo catch externo
          console.error('❌ [saveOSToAPI] Erro interno na atualização:', innerError);
          console.error('❌ [saveOSToAPI] Stack trace do erro interno:', innerError?.stack);
          throw innerError;
        }
      } catch (updateError) {
        console.error('❌ [saveOSToAPI] Erro ao atualizar OS:', updateError);
        console.error('❌ [saveOSToAPI] Detalhes do erro:', {
          message: updateError?.message,
          status: updateError?.response?.status,
          data: updateError?.response?.data
        });
        // Se o erro for 404, a OS não existe mais - tentar criar nova
        if (updateError.response?.status === 404) {
          console.warn('⚠️ [saveOSToAPI] OS não encontrada ao atualizar (404). Removendo id para criar nova OS.');
          delete osData.id;
          delete dataToSend.id;
          isRealmenteEditando = false;
          // Não definir response aqui, deixar o código continuar para criar nova OS
        } else {
          // Outro erro - re-lançar para ser tratado
          throw updateError;
        }
      }
    }
    
    // Se já atualizamos com sucesso, pular toda a lógica de criação e ir direto para processar resposta
    // IMPORTANTE: Verificar se já temos uma resposta de atualização antes de tentar criar nova OS
    console.log('🔍 [saveOSToAPI] Estado antes de verificar criação:', { 
      isRealmenteEditando, 
      temResponse: !!response, 
      temId: !!osData.id, 
      temIdOs: !!osData.id_os,
      responseValue: response
    });
    
    // CRÍTICO: Se já atualizamos com sucesso, NÃO entrar no bloco de criação
    // Se temos resposta de atualização, pular toda a lógica de criação
    if (isRealmenteEditando && response) {
      console.log('✅ [saveOSToAPI] Atualização bem-sucedida, pulando lógica de criação', {
        isRealmenteEditando,
        temResponse: !!response,
        responseType: typeof response,
        responseValue: response
      });
      // Pular toda a lógica de criação abaixo e ir direto para processar resposta
      // Não fazer mais nada, apenas processar a resposta abaixo
      // Pular para o final da função onde processamos a resposta
    } else if (!isRealmenteEditando && !response) {
      console.log('🆕 [saveOSToAPI] Criando nova OS (sem id numérico)');
      garantirFuncionarioId();
      
      // Se tiver id_os, o backend verificará se já existe e gerará um novo se necessário
      // Não precisamos buscar manualmente no frontend para evitar converter criação em atualização indesejada
      response = await osService.create(dataToSend);
    }
    
    // Se isRealmenteEditando é true e response está definido, já atualizamos com sucesso
    // e não precisamos fazer mais nada, apenas processar a resposta abaixo
    // IMPORTANTE: Se já atualizamos, não devemos ter entrado no bloco de criação acima
    
    console.log('✅ OS salva na API com sucesso:', response, {
      isRealmenteEditando,
      temResponse: !!response,
      responseType: typeof response
    });
    
    // Garantir que estamos retornando o objeto OS correto
    savedOSData = response?.data || response;
    
    // CRÍTICO: Garantir que o id sempre esteja presente no objeto retornado
    // Se o backend retornou o id diretamente na resposta, usar ele
    if (!savedOSData.id && response?.data?.id) {
      savedOSData.id = response.data.id;
    }
    // Se ainda não tem id mas temos no osData original, preservar
    if (!savedOSData.id && osData.id) {
      savedOSData.id = osData.id;
      console.log('🔧 [saveOSToAPI] Preservando id do osData original:', osData.id);
    }

    // Atualizar contador sequencial local com o número retornado pelo backend
    if (savedOSData?.numero_os) {
      try {
        await apiDataManager.setItem('ultimo_id_os', savedOSData.numero_os.toString());
      } catch (contadorError) {
        console.warn('⚠️ [saveOSToAPI] Falha ao atualizar contador local de OS:', contadorError);
      }
    }

    // Se por algum motivo o backend não retornou o id numérico,
    // buscar pela id_os para hidratar o campo id (evita exibir N/A/Novo)
    if (savedOSData && !savedOSData.id && savedOSData.id_os) {
      try {
        // Tentar buscar pelo numero_os primeiro se disponível
        if (savedOSData.numero_os && savedOSData.numero_os > 0 && savedOSData.numero_os < 1000000) {
          const osList = await osService.getAll({ 
            numero_os: savedOSData.numero_os,
            per_page: 1 
          });
          const osEncontrada = osList?.data?.data?.[0] || osList?.data?.[0];
          if (osEncontrada && osEncontrada.id) {
            savedOSData = { ...savedOSData, id: osEncontrada.id };
            console.log('✅ [saveOSToAPI] ID encontrado pelo numero_os:', osEncontrada.id);
          }
        }
        
        // Se ainda não tem id, tentar buscar pelo id_os
        if (!savedOSData.id) {
          const fetchByCodigo = await osService.getById(savedOSData.id_os);
          if (fetchByCodigo && fetchByCodigo.id) {
            savedOSData = { ...savedOSData, id: fetchByCodigo.id };
            console.log('✅ [saveOSToAPI] ID encontrado pelo id_os:', fetchByCodigo.id);
          } else if (fetchByCodigo?.data?.id) {
            savedOSData = { ...savedOSData, id: fetchByCodigo.data.id };
            console.log('✅ [saveOSToAPI] ID encontrado pelo id_os (data.id):', fetchByCodigo.data.id);
          }
        }
      } catch (e) {
        console.warn('⚠️ [saveOSToAPI] Erro ao buscar id pelo id_os/numero_os:', e);
        // Ignorar erro silenciosamente; manter savedOSData como está
      }
    }
    
    // Log final para garantir que o id está presente
    console.log('📋 [saveOSToAPI] Dados finais retornados:', {
      id: savedOSData?.id,
      id_os: savedOSData?.id_os,
      numero_os: savedOSData?.numero_os,
      status_os: savedOSData?.status_os
    });
    
    // Preservar campos que não existem no banco mas são usados localmente
    // tipo_origem é usado para identificar origem (consumo_material, PDV, etc)
    if (osData.tipo_origem) {
      savedOSData.tipo_origem = osData.tipo_origem;
    }
    // dados_consumo_material também é usado localmente para listas de consumo
    if (osData.dados_consumo_material) {
      savedOSData.dados_consumo_material = osData.dados_consumo_material;
    }
    
    // Também salvar no localStorage como backup/cache
    await saveOSToLocalStorage(savedOSData, options);
    
    // Disparar evento para atualizar páginas que mostram histórico
    window.dispatchEvent(new CustomEvent('osSalva', { detail: savedOSData }));
    
    return savedOSData;
  } catch (error) {
    console.error('❌ Erro ao salvar OS na API:', error);
    console.error('❌ Detalhes do erro:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      method: error.config?.method
    });
    
    // Se for erro 500, logar os dados enviados para debug
    if (error.response?.status === 500) {
      // Log do erro completo do backend
      const errorMessage = error.response?.data?.message || '';
      console.error('❌ [saveOSToAPI] Erro 500 - Resposta completa do backend:', {
        error_data: error.response?.data,
        error_message: errorMessage,
        error_message_completo: errorMessage, // Mensagem completa não truncada
        error_exception: error.response?.data?.exception,
        error_file: error.response?.data?.file,
        error_line: error.response?.data?.line,
        error_trace: error.response?.data?.trace?.slice(0, 5) // Primeiras 5 linhas do trace
      });
      
      // Tentar extrair o nome da coluna do erro SQL
      if (errorMessage.includes('Column not found') || errorMessage.includes('Unknown column')) {
        const columnMatch = errorMessage.match(/Unknown column ['`]?([^'`\s]+)['`]?/i);
        if (columnMatch) {
          console.error('❌ [saveOSToAPI] COLUNA QUE NÃO EXISTE NO BANCO:', columnMatch[1]);
        }
      }
      
      // Tentar recuperar dataToSend se ainda estiver no escopo, senão usar osData
      const dadosEnviados = typeof dataToSend !== 'undefined' ? dataToSend : osData;
      console.error('❌ [saveOSToAPI] Erro 500 - Dados que causaram o erro:', {
        status_os: dadosEnviados.status_os,
        valor_total_os: dadosEnviados.valor_total_os,
        cliente_id: dadosEnviados.cliente_id,
        funcionario_id: dadosEnviados.funcionario_id,
        funcionario_id_tipo: typeof dadosEnviados.funcionario_id,
        funcionarioIdFinal_original: typeof funcionarioIdFinal !== 'undefined' ? funcionarioIdFinal : 'N/A',
        itens_count: dadosEnviados.itens?.length || 0,
        data_prevista_entrega: dadosEnviados.data_prevista_entrega || dadosEnviados.data_previsao_entrega,
        maquina_impressao_id: dadosEnviados.maquina_impressao_id,
        observacoes_gerais_os: dadosEnviados.observacoes_gerais_os,
        // Log completo do objeto dataToSend para debug
        dataToSend_keys: Object.keys(dadosEnviados || {}),
        dataToSend_funcionario_id: dadosEnviados?.funcionario_id
      });
    }
    
    // Tratar erro de ID duplicado - gerar novo ID e tentar novamente
    if (error.response?.status === 409 && error.response?.data?.error === 'duplicate_id_os') {
      console.warn('⚠️ [saveOSToAPI] ID duplicado detectado! Gerando novo ID e tentando novamente...');
      console.log('🔄 [saveOSToAPI] ID duplicado:', osData.id_os);
      
      try {
        // Importar função para gerar novo ID
        const { getNextOSId } = await import('./osIdService');
        
        // Gerar novo ID
        const novoIdNumero = await getNextOSId();
        const novoIdOS = `OS-${novoIdNumero}`;
        
        console.log('✅ [saveOSToAPI] Novo ID gerado:', novoIdOS);
        
        // Atualizar dados com novo ID
        const osDataComNovoId = {
          ...osData,
          id_os: novoIdOS,
          numero_os: novoIdNumero,
          id: undefined // Limpar ID para garantir que vai criar nova OS
        };
        
        const dataToSendNovo = {
          ...dataToSend,
          id_os: novoIdOS,
          numero_os: novoIdNumero
        };
        
        // Tentar salvar novamente com novo ID
        console.log('🔄 [saveOSToAPI] Tentando salvar com novo ID...');
        response = await osService.create(dataToSendNovo);
        
        console.log('✅ [saveOSToAPI] OS salva com sucesso usando novo ID:', response);
        
        // Retornar OS salva com o novo ID
        savedOSData = response?.data || response;
        
        // Preservar campos que não existem no banco mas são usados localmente
        if (osData.tipo_origem) {
          savedOSData.tipo_origem = osData.tipo_origem;
        }
        if (osData.dados_consumo_material) {
          savedOSData.dados_consumo_material = osData.dados_consumo_material;
        }
        
        // Salvar no localStorage
        await saveOSToLocalStorage(savedOSData, options);
        
        return savedOSData;
        
      } catch (retryError) {
        console.error('❌ [saveOSToAPI] Erro ao salvar com novo ID:', retryError);
        // Continuar para o fallback localStorage
      }
    }
    
    // IMPORTANTE: NÃO fazer fallback silencioso para localStorage quando a API falhar
    // O usuário precisa saber que a OS não foi salva no banco de dados
    // Criar mensagem de erro amigável para o usuário
    let mensagemErro = 'Erro ao salvar OS no servidor.';
    
    // Extrair mensagem mais específica do erro
    if (error.response?.data?.message) {
      const msgBackend = error.response.data.message;
      
      // Verificar se é erro de constraint de unicidade
      if (msgBackend.includes('Duplicate entry') && msgBackend.includes('id_os')) {
        mensagemErro = 'Erro: O número da OS já existe. Tente novamente para gerar um novo número.';
      } else if (msgBackend.includes('Duplicate entry')) {
        mensagemErro = 'Erro: Registro duplicado. Verifique os dados e tente novamente.';
      } else {
        // Usar mensagem do backend se disponível
        mensagemErro = `Erro do servidor: ${msgBackend.substring(0, 200)}`;
      }
    } else if (error.message) {
      mensagemErro = `Erro: ${error.message}`;
    }
    
    console.error('❌ [saveOSToAPI] Falha ao salvar OS - NÃO fazendo fallback silencioso:', mensagemErro);
    
    // Lançar erro para que o frontend mostre a mensagem correta ao usuário
    throw new Error(mensagemErro);
  }
};

export const saveOSToLocalStorage = async (osData, options = {}) => {
  console.log('saveOSToLocalStorage called with:', osData, options);
  try {
    const ordensServico = await apiDataManager.getDataAsArray('ordens_servico_salvas');
    const index = ordensServico.findIndex(os => os.id_os === osData.id_os);
    
    if (index >= 0) {
      ordensServico[index] = osData;
    } else {
      ordensServico.push(osData);
    }
    
    await apiDataManager.setItem('ordens_servico_salvas', ordensServico);
    return osData;
  } catch (error) {
    console.error('Erro ao salvar OS no localStorage:', error);
    return null;
  }
};

export const loadInitialOSContext = async (locationState, currentOSId, vendedorAtual) => {
  
  
  try {
    let ordemServico = null;
    let clienteSelecionado = null;
    let isOSFinalizada = false;
    let toastMessage = null;

    // Se há um ID específico para carregar
    if (currentOSId) {
      const osData = await loadOS(currentOSId);
      if (osData) {
        console.log('✅ [loadInitialOSContext] OS carregada:', {
          id: osData.id,
          id_os: osData.id_os,
          cliente_id: osData.cliente_id,
          cliente_info: osData.cliente_info,
          itens_count: osData.itens ? osData.itens.length : 0,
          itens: osData.itens,
          isLocalOnly: osData.isLocalOnly
        });
        
        // Processar itens para garantir que tenham subtotal_item calculado
        if (osData.itens && Array.isArray(osData.itens)) {
          // Carregar configurações de acabamentos para cálculo
          let acabamentosConfig = [];
          try {
            const resp = await acabamentoService.getAll();
            const arr = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : (Array.isArray(resp?.data?.data) ? resp.data.data : []));
            acabamentosConfig = arr;
          } catch (err) {
            console.warn('Falha ao carregar acabamentos da API:', err);
          }
          
          osData.itens = osData.itens.map(item => {
            // Mapear acabamentos do backend para acabamentos_selecionados do frontend
            const itemComAcabamentos = {
              ...item,
              acabamentos_selecionados: Array.isArray(item.acabamentos) ? item.acabamentos : 
                                      (Array.isArray(item.acabamentos_selecionados) ? item.acabamentos_selecionados : [])
            };
            
            // IMPORTANTE: Para itens de consumo de material, ignorar temporariamente o consumo_custo_total do banco
            // ao carregar, para forçar o cálculo por área até que o item seja editado
            // Isso garante que o subtotal seja calculado corretamente antes da edição
            const temConsumoMaterial = itemComAcabamentos.consumo_material_utilizado || 
                                      itemComAcabamentos.consumo_largura_peca || 
                                      itemComAcabamentos.consumo_altura_peca;
            
            // Se tem consumo de material, temporariamente zerar consumo_custo_total para forçar cálculo por área
            // O consumo_custo_total só será usado após editar e salvar
            const itemParaCalcular = temConsumoMaterial ? {
              ...itemComAcabamentos,
              consumo_custo_total: null, // Zerar temporariamente para forçar cálculo por área
              consumo_custo_unitario: null
            } : itemComAcabamentos;
            
            // IMPORTANTE: SEMPRE usar o valor_total do banco como subtotal_item
            // O valor_total vem da coluna valor_total da tabela ordens_servico_itens
            // Não recalcular - usar exatamente o valor que está salvo no banco
            const subtotalDoBanco = parseFloat(itemComAcabamentos.valor_total || itemComAcabamentos.subtotal_item || 0);
            
            // Usar sempre o valor do banco, sem recalcular
            const subtotalFinal = subtotalDoBanco;
            
            console.log('💰 [loadInitialOSContext] Usando subtotal do banco (valor_total):', {
              nome: itemComAcabamentos.nome_servico_produto || itemComAcabamentos.nome_produto,
              valor_total_banco: itemComAcabamentos.valor_total,
              subtotal_item_banco: itemComAcabamentos.subtotal_item,
              subtotal_final: subtotalFinal,
              observacao: 'Subtotal carregado diretamente do banco (coluna valor_total da tabela ordens_servico_itens)'
            });
            
            // IMPORTANTE: Retornar o item com subtotal_item = valor_total do banco
            // Não recalcular - usar exatamente o valor que está salvo no banco
            return { 
              ...itemComAcabamentos, // Preservar todos os valores originais do banco, incluindo consumo_custo_total
              subtotal_item: subtotalFinal,
              valor_total: subtotalFinal // Garantir que valor_total também está correto
            };
          });
        }
        
        // Garantir que todos os itens tenham id_item_os único
        const osDataComIds = garantirIdsItensOS(osData);
        console.log('✅ [loadInitialOSContext] IDs dos itens garantidos:', {
          itens_ids: osDataComIds.itens?.map(i => ({ 
            id_item_os: i.id_item_os, 
            id: i.id, 
            nome: i.nome_servico_produto || i.nome_produto 
          })) || []
        });
        
        // IMPORTANTE: Preservar o valor_total_os do banco quando existir e for válido
        // Não recalcular para evitar alterações indesejadas ao editar
        const valorTotalDoBanco = parseFloat(osDataComIds.valor_total_os || 0);
        if (valorTotalDoBanco > 0) {
          console.log('✅ [loadInitialOSContext] Preservando valor_total_os do banco:', {
            valor_total_os: valorTotalDoBanco,
            id: osDataComIds.id,
            id_os: osDataComIds.id_os
          });
          // Garantir que o valor_total_os seja preservado
          osDataComIds.valor_total_os = valorTotalDoBanco;
        }
        
        // Se a OS está apenas no localStorage, tentar sincronizar
        if (osDataComIds.isLocalOnly) {
          console.log('⚠️ [loadInitialOSContext] OS encontrada apenas no localStorage, tentando sincronizar...');
          toastMessage = {
            title: "OS não sincronizada",
            description: "Esta OS existe apenas localmente. Será sincronizada automaticamente ao salvar.",
            variant: "warning"
          };
        }
        
        ordemServico = osDataComIds;
        clienteSelecionado = osDataComIds.cliente_info || null;
        isOSFinalizada = osDataComIds.status_os === 'Finalizada' || osDataComIds.status_os === 'Entregue';
      } else {
        console.log('❌ [loadInitialOSContext] OS não foi carregada');
        toastMessage = {
          title: "OS não encontrada",
          description: `A ordem de serviço ${currentOSId} não foi encontrada.`,
          variant: "destructive"
        };
      }
    }
    
    // Se há dados vindos da calculadora
    if (locationState?.fromCalculadora && locationState?.calculadoraData) {
      try {
        const novaOS = await initialOrdemServicoState();
        const calculadoraData = locationState.calculadoraData;
        
        ordemServico = {
          ...novaOS,
          cliente_info: calculadoraData.cliente || null,
          cliente_nome_manual: calculadoraData.cliente?.nome || '',
          itens: calculadoraData.itens || [],
          valor_total_os: calculadoraData.valor_total || 0,
          observacoes_gerais_os: calculadoraData.observacoes || '',
          vendedor_id: vendedorAtual?.id || null,
          vendedor_nome: vendedorAtual?.nome || '',
        };
        
        clienteSelecionado = calculadoraData.cliente || null;
      } catch (error) {
        console.error('Erro ao processar dados da calculadora:', error);
      }
    }
    
    // Se não há OS para carregar, criar uma nova
    if (!ordemServico) {
      try {
        ordemServico = await initialOrdemServicoState();
        ordemServico.vendedor_id = vendedorAtual?.id || null;
        ordemServico.vendedor_nome = vendedorAtual?.nome || '';
      } catch (error) {
        console.error('Erro ao criar nova OS, usando versão síncrona:', error);
        ordemServico = initialOrdemServicoStateSync();
        ordemServico.vendedor_id = vendedorAtual?.id || null;
        ordemServico.vendedor_nome = vendedorAtual?.nome || '';
      }
    }

    return {
      ordemServico,
      clienteSelecionado,
      isOSFinalizada,
      toastMessage
    };
    
  } catch (error) {
    console.error('Erro em loadInitialOSContext:', error);
    
    // Em caso de erro, retornar pelo menos uma OS vazia
    const ordemServicoFallback = initialOrdemServicoStateSync();
    ordemServicoFallback.vendedor_id = vendedorAtual?.id || null;
    ordemServicoFallback.vendedor_nome = vendedorAtual?.nome || '';
    
    return {
      ordemServico: ordemServicoFallback,
      clienteSelecionado: null,
      isOSFinalizada: false,
      toastMessage: {
        title: "Erro ao carregar",
        description: "Ocorreu um erro ao carregar os dados. Uma nova OS foi criada.",
        variant: "destructive"
      }
    };
  }
};

export const moverParaLixeiraOS = async (os, justificativa, deletedBy, registrarAcaoCallback) => {
  console.log('moverParaLixeiraOS called with:', os, justificativa, deletedBy, registrarAcaoCallback);
  try {
    // Deletar a OS na API (soft delete)
    console.log('🗑️ [moverParaLixeiraOS] Deletando OS na API:', os.id_os);
    await osService.delete(os.id_os);
    
    // Remover do localStorage (não salvar, remover!)
    console.log('🗑️ [moverParaLixeiraOS] Removendo OS do localStorage');
    const osSalvas = await apiDataManager.getDataAsArray('ordens_servico_salvas', []);
    // Normalizar IDs para comparação (string vs number)
    const osIdOs = os.id_os ? String(os.id_os) : null;
    const osId = os.id ? String(os.id) : null;
    const osNumeroOs = os.numero_os ? String(os.numero_os) : null;
    
    const novasOsSalvas = osSalvas.filter(o => {
      // Comparar id_os (normalizado para string)
      if (osIdOs && o.id_os && String(o.id_os) === osIdOs) return false;
      // Comparar id (normalizado para string)
      if (osId && o.id && String(o.id) === osId) return false;
      // Comparar numero_os (normalizado para string)
      if (osNumeroOs && o.numero_os && String(o.numero_os) === osNumeroOs) return false;
      return true;
    });
    
    await apiDataManager.setItem('ordens_servico_salvas', novasOsSalvas);
    console.log('✅ [moverParaLixeiraOS] OS removida do localStorage:', {
      antes: osSalvas.length,
      depois: novasOsSalvas.length,
      removidas: osSalvas.length - novasOsSalvas.length
    });
    
    // Registrar ação se callback fornecido
    if (registrarAcaoCallback) {
      registrarAcaoCallback(`OS ${os.id_os} movida para lixeira`, 'delete');
    }
    
    // Disparar evento para atualizar páginas que mostram histórico
    window.dispatchEvent(new CustomEvent('osDeletada', { detail: { id: os.id, id_os: os.id_os } }));
    
    console.log('✅ [moverParaLixeiraOS] OS deletada com sucesso');
    return { success: true, id_os: os.id_os };
  } catch (error) {
    console.error('❌ Erro ao mover OS para lixeira:', error);
    throw error;
  }
};

export const baixarEstoqueOS = async (itens, isDevolucao = false, registrarAcaoCallback, referenciaId) => {
  console.log('baixarEstoqueOS called with:', itens, isDevolucao, registrarAcaoCallback, referenciaId);
  try {
    // Esta função seria implementada para baixar estoque dos produtos
    // Por enquanto, apenas registrar a ação
    if (registrarAcaoCallback) {
      const acao = isDevolucao ? 'Devolução de estoque' : 'Baixa de estoque';
      registrarAcaoCallback(`${acao} para ${itens.length} itens`, isDevolucao ? 'stock_return' : 'stock_out');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao baixar estoque:', error);
    return false;
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
    baixarEstoqueOS,
    saveOSToAPI
  };
};

// Função para sincronizar OS do localStorage com a API
export const syncOSWithAPI = async (osData) => {
  console.log('🔄 [syncOSWithAPI] Iniciando sincronização da OS:', osData.id_os);
  
  try {
    // Função para extrair funcionario_id quando cliente é um funcionário
    const extractFuncionarioId = (clienteId, clienteInfo) => {
      // Se o cliente_id começa com "funcionario_", extrair o ID numérico
      if (clienteId && typeof clienteId === 'string' && clienteId.startsWith('funcionario_')) {
        const funcionarioId = clienteId.replace('funcionario_', '');
        console.log('🔧 [syncOSWithAPI] Funcionário detectado, extraindo ID:', {
          clienteId,
          funcionarioId: parseInt(funcionarioId)
        });
        return parseInt(funcionarioId);
      }
      
      // Se cliente_info tem funcionario_id, usar ele
      if (clienteInfo && clienteInfo.funcionario_id) {
        console.log('🔧 [syncOSWithAPI] Funcionário ID encontrado em cliente_info:', clienteInfo.funcionario_id);
        return parseInt(clienteInfo.funcionario_id);
      }
      
      return null;
    };

    // Preparar dados para envio à API
    const osParaAPI = {
      cliente_id: osData.cliente_id || null,
      funcionario_id: osData.funcionario_id || extractFuncionarioId(osData.cliente_id, osData.cliente_info),
      vendedor_id: osData.vendedor_id || null,
      status_os: osData.status_os || 'Orçamento Salvo',
      valor_total_os: parseFloat(osData.valor_total_os || 0),
      observacoes_gerais_os: osData.observacoes_gerais_os || '',
      observacoes_cliente_para_nota: osData.observacoes_cliente_para_nota || '',
      data_prevista_entrega: osData.data_prevista_entrega || null,
      data_validade: osData.data_validade || null,
      desconto_geral_valor: parseFloat(osData.desconto_geral_valor || 0),
      desconto_terceirizado_percentual: parseFloat(osData.desconto_terceirizado_percentual || 0),
      frete_valor: parseFloat(osData.frete_valor || 0),
      cliente_info: osData.cliente_info || null,
      cliente_nome_manual: osData.cliente_nome_manual || '',
      itens: Array.isArray(osData.itens) ? osData.itens : [],
      pagamentos: Array.isArray(osData.pagamentos) ? osData.pagamentos : [],
      // Só enviar dados_producao se houver dados específicos, senão deixar o backend definir automaticamente
      dados_producao: (osData.dados_producao && typeof osData.dados_producao === 'object' && 
                      (osData.dados_producao.status_producao || 
                       osData.dados_producao.prazo_estimado || 
                       osData.dados_producao.observacoes_internas || 
                       (osData.dados_producao.fotos_producao && osData.dados_producao.fotos_producao.length > 0))) 
        ? osData.dados_producao 
        : undefined,
      maquina_impressao_id: osData.maquina_impressao_id || null
    };
    
    console.log('🔄 [syncOSWithAPI] Dados preparados para API:', {
      status_os: osParaAPI.status_os,
      valor_total_os: osParaAPI.valor_total_os,
      itens_count: osParaAPI.itens.length,
      cliente_id: osParaAPI.cliente_id
    });
    
    // Criar a OS na API
    const response = await osService.create(osParaAPI);
    
    if (response && response.data) {
      console.log('✅ [syncOSWithAPI] OS sincronizada com sucesso:', {
        id: response.data.id,
        id_os: response.data.id_os,
        status: response.data.status_os
      });
      
      // Atualizar a OS no localStorage com os dados da API
      const osAtualizada = {
        ...osData,
        id: response.data.id,
        id_os: response.data.id_os,
        synced: true,
        sync_date: formatDateForBackend(),
        isLocalOnly: false
      };
      
      await saveOSToLocalStorage(osAtualizada);
      
      return response.data;
    } else {
      throw new Error('Resposta da API inválida');
    }
    
  } catch (error) {
    console.error('❌ [syncOSWithAPI] Erro na sincronização:', error);
    throw error;
  }
};

export default useOSDataService;
