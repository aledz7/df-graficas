import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';
import { formatDateForBackend } from '@/utils/dateUtils';

let contadorEnvelopamento = 0;
let contadorInicializado = false;
let contadorPromise = null;

// Inicializar contador de forma assíncrona
const initializeContador = async () => {
  
  if (contadorPromise) {
    await contadorPromise;
    return;
  }
  
  if (contadorInicializado && !isNaN(contadorEnvelopamento)) {
    return;
  }
  
  contadorPromise = (async () => {
    try {
      const valorSalvo = await apiDataManager.getItem('contador_envelopamento_global');
      
      // Garantir que o valor seja um número válido
      const valorNumerico = parseInt(valorSalvo || '0', 10);
      contadorEnvelopamento = isNaN(valorNumerico) ? 0 : valorNumerico;
      
      // Se o contador for inválido, resetar para 0
      if (isNaN(contadorEnvelopamento)) {
        console.warn('⚠️ Contador inválido detectado, resetando para 0');
        contadorEnvelopamento = 0;
        await apiDataManager.setItem('contador_envelopamento_global', '0');
      }
      
      contadorInicializado = true;
    } catch (error) {
      console.error('❌ Erro ao inicializar contador:', error);
      contadorEnvelopamento = 0;
      contadorInicializado = true;
      await apiDataManager.setItem('contador_envelopamento_global', '0');
    } finally {
      contadorPromise = null;
    }
  })();
  
  await contadorPromise;
};

// Inicializar imediatamente
// initializeContador(); // Comentado para evitar problemas de loop

export const getNextEnvelopamentoId = async (prefix = 'ENV-') => {
  
  await initializeContador(); // Garantir que o contador está inicializado
  
  // Verificar se o contador foi inicializado corretamente
  if (!contadorInicializado || isNaN(contadorEnvelopamento) || contadorEnvelopamento === null || contadorEnvelopamento === undefined) {
    contadorEnvelopamento = 0;
    contadorInicializado = true;
    await apiDataManager.setItem('contador_envelopamento_global', '0');
  }
  
  // Garantir que o contador seja um número válido
  const contadorAtual = parseInt(contadorEnvelopamento, 10);
  if (isNaN(contadorAtual)) {
    console.error('❌ Contador ainda é NaN após verificação, forçando para 0');
    contadorEnvelopamento = 0;
  } else {
    contadorEnvelopamento = contadorAtual;
  }
  
  contadorEnvelopamento = contadorEnvelopamento + 1;
  
  // Verificar se o contador incrementado é válido
  if (isNaN(contadorEnvelopamento)) {
    console.error('❌ Contador se tornou NaN após incremento, resetando para 1');
    contadorEnvelopamento = 1;
  }
  
  try {
    // Adicionar um pequeno delay para evitar chamadas muito rápidas
    await new Promise(resolve => setTimeout(resolve, 100));
    await apiDataManager.setItem('contador_envelopamento_global', contadorEnvelopamento.toString());
  } catch (error) {
    console.error('❌ Erro ao salvar contador:', error);
  }
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const counter = String(contadorEnvelopamento).padStart(4, '0');
  
  // Verificar se algum valor é NaN antes de gerar o ID
  if (isNaN(year) || isNaN(month) || isNaN(day) || counter === 'NaN' || counter.includes('NaN')) {
    console.error('❌ Valores inválidos detectados na geração do ID:', { year, month, day, counter });
    const timestamp = Date.now();
    const id = `${prefix}${timestamp}`;
    return id;
  }
  
  const id = `${prefix}${year}${month}${day}-${counter}`;
  
  return id;
};


export const getInitialPecaAvulsaState = () => ({
  descricao: '',
  alturaM: '',
  larguraM: '',
  quantidade: '',
});

export const getInitialOrcamentoComSettings = async (adminSettings = {}, generateNewId = true) => {
  const novoId = generateNewId ? await getNextEnvelopamentoId('env-draft-') : null;
  return {
    id: novoId,
    nome_orcamento: '',
    cliente: { id: '', nome: '', cpf_cnpj: '' },
    selectedPecas: [],
    pecaAvulsa: getInitialPecaAvulsaState(),
    produto: null,
    // cor: '', // Removido, pois cor_opcional está em produto
    areaTotalM2: 0,
    custoTotalMaterial: 0,
    // Não precisamos mais da estrutura antiga dos adicionais
    // Os serviços são carregados dinamicamente do banco
    custoTotalAdicionais: 0,
    // margemLucro: '100', // Removido, cálculo direto do preço de venda do produto
    // valorSugerido: 0, // Removido
    // valorFinalCliente: 0, // Removido, será o orcamentoTotal
    observacao: '',
    status: 'Rascunho', // Status inicial
    data: formatDateForBackend(),
    vendedor_id: null,
    vendedor_nome: '',
    pagamentos: [],
    orcamentoTotal: 0,
    // Campos de desconto e frete
    desconto: 0,
    descontoTipo: 'percentual',
    descontoCalculado: 0,
    frete: 0,
  };
};

export const createNewOrcamento = async (adminSettings = {}) => {
  return await getInitialOrcamentoComSettings(adminSettings, true); // Gerar ID para novo orçamento
};

export const prepareOrcamentoForStorage = (orcamento, adminSettings = {}) => {
  // Remove campos que não precisam ser persistidos no rascunho ou são melhor re-gerados
  const { pecaAvulsa, ...restOfOrcamento } = orcamento;
  
  console.log('prepareOrcamentoForStorage - orçamento de entrada:', orcamento);
  console.log('prepareOrcamentoForStorage - Desconto:', orcamento.desconto, 'Tipo:', orcamento.descontoTipo, 'Calculado:', orcamento.descontoCalculado, 'Frete:', orcamento.frete);
  
  // Obter lista de serviços adicionais para mapear IDs para nomes
  const servicosList = adminSettings?.servicosAdicionais || [];
  
  // Coletar todos os serviços adicionais aplicados (sem duplicatas)
  const servicosAplicadosMap = new Map();
  if (Array.isArray(orcamento.selectedPecas)) {
    orcamento.selectedPecas.forEach(peca => {
      if (peca.servicosAdicionais && typeof peca.servicosAdicionais === 'object') {
        Object.entries(peca.servicosAdicionais).forEach(([servicoKey, checked]) => {
          const isChecked = typeof checked === 'object' ? Boolean(checked?.checked) : Boolean(checked);
          if (isChecked && !servicosAplicadosMap.has(servicoKey)) {
            // Buscar o serviço na lista para obter o nome
            const servico = servicosList.find(s => {
              if (!s || !s.id) return false;
              return String(s.id) === String(servicoKey) || Number(s.id) === Number(servicoKey);
            });
            
            // Se já tem nome no objeto (novo formato), usar ele
            const nomeServico = (typeof checked === 'object' && checked?.nome) 
              ? checked.nome 
              : (servico?.nome || `Serviço ${servicoKey}`);
            
            servicosAplicadosMap.set(servicoKey, {
              id: servico?.id || servicoKey,
              nome: nomeServico
            });
          }
        });
      }
    });
  }
  
  // Converter Map para Array
  const servicosAdicionaisAplicados = Array.from(servicosAplicadosMap.values());
  
  const prepared = {
    ...restOfOrcamento,
    selectedPecas: Array.isArray(orcamento.selectedPecas) ? orcamento.selectedPecas.map(peca => {
      // Processar serviços adicionais para incluir nome junto com ID
      const servicosProcessados = {};
      if (peca.servicosAdicionais && typeof peca.servicosAdicionais === 'object') {
        Object.entries(peca.servicosAdicionais).forEach(([servicoKey, checked]) => {
          const isChecked = typeof checked === 'object' ? Boolean(checked?.checked) : Boolean(checked);
          if (isChecked) {
            // Se já tem nome no objeto (novo formato), usar ele
            if (typeof checked === 'object' && checked !== null && checked.nome) {
              servicosProcessados[servicoKey] = {
                id: checked.id || servicoKey,
                nome: checked.nome,
                checked: true
              };
            } else {
              // Buscar o serviço na lista para obter o nome
              const servico = servicosList.find(s => {
                if (!s || !s.id) return false;
                return String(s.id) === String(servicoKey) || Number(s.id) === Number(servicoKey);
              });
              
              // Salvar como objeto com id e nome
              if (servico && servico.nome) {
                servicosProcessados[servicoKey] = {
                  id: servico.id,
                  nome: servico.nome,
                  checked: true
                };
              } else {
                // Se não encontrou o nome, tentar buscar no cache local
                try {
                  const cacheKey = 'servicos_adicionais_envelopamento_cache';
                  const cachedServicos = localStorage.getItem(cacheKey);
                  if (cachedServicos) {
                    const parsed = JSON.parse(cachedServicos);
                    if (Array.isArray(parsed.data)) {
                      const servicoCache = parsed.data.find(s => {
                        if (!s || !s.id) return false;
                        return String(s.id) === String(servicoKey) || Number(s.id) === Number(servicoKey);
                      });
                      if (servicoCache && servicoCache.nome) {
                        servicosProcessados[servicoKey] = {
                          id: servicoCache.id,
                          nome: servicoCache.nome,
                          checked: true
                        };
                      } else {
                        // Último recurso: salvar com ID e nome genérico
                        servicosProcessados[servicoKey] = {
                          id: servicoKey,
                          nome: `Serviço ${servicoKey}`,
                          checked: true
                        };
                      }
                    }
                  } else {
                    // Último recurso: salvar com ID e nome genérico
                    servicosProcessados[servicoKey] = {
                      id: servicoKey,
                      nome: `Serviço ${servicoKey}`,
                      checked: true
                    };
                  }
                } catch (e) {
                  // Último recurso: salvar com ID e nome genérico
                  servicosProcessados[servicoKey] = {
                    id: servicoKey,
                    nome: `Serviço ${servicoKey}`,
                    checked: true
                  };
                }
              }
            }
          }
        });
      }
      
      return {
        id: peca.id, // UUID do item na lista
        parte: { // Apenas os dados essenciais da parte
          id: peca.parte.id, // UUID da parte (do catálogo ou avulsa)
          nome: peca.parte.nome,
          altura: peca.parte.altura, // Já deve estar como string formatada
          largura: peca.parte.largura, // Já deve estar como string formatada
          isAvulsa: !!peca.parte.isAvulsa,
          imagem: peca.parte.imagem, // Base64 ou null
          imagem_url_externa: peca.parte.imagem_url_externa // URL ou null
        },
        quantidade: String(peca.quantidade),
        servicosAdicionais: servicosProcessados, // Serviços adicionais com nome incluído
      };
    }) : [],
    produto: orcamento.produto ? { // Apenas dados essenciais do produto
      id: orcamento.produto.id,
      nome: orcamento.produto.nome,
      valorMetroQuadrado: orcamento.produto.valorMetroQuadrado, // Já deve ser número
      estoqueDisponivel: orcamento.produto.estoqueDisponivel, // Já deve ser número
      unidadeMedida: orcamento.produto.unidade_medida || orcamento.produto.unidadeMedida,
      cor_opcional: orcamento.produto.cor_opcional,
      preco_venda: orcamento.produto.preco_venda,
      preco_m2: orcamento.produto.preco_m2,
      promocao_ativa: orcamento.produto.promocao_ativa || false,
      preco_promocional: orcamento.produto.preco_promocional || null,
      preco_original: orcamento.produto.preco_original || orcamento.produto.preco_venda,
    } : null,
    // Não precisamos mais da estrutura antiga dos adicionais
    // Os serviços são salvos dentro de cada peça em selectedPecas
    // adicionais: orcamento.adicionais, // Removido - estrutura antiga
    // Campos de desconto e frete
    desconto: orcamento.desconto || 0,
    descontoTipo: orcamento.descontoTipo || 'percentual',
    descontoCalculado: orcamento.descontoCalculado || 0,
    frete: orcamento.frete || 0,
    // Serviços adicionais aplicados (array com id e nome de cada serviço)
    // Salvar tanto em servicosAdicionaisAplicados quanto em adicionais (coluna existente)
    servicosAdicionaisAplicados: servicosAdicionaisAplicados,
    adicionais: servicosAdicionaisAplicados, // Salvar também na coluna adicionais que já existe
    // Campos calculados necessários para o backend
    orcamentoTotal: orcamento.orcamentoTotal || 0,
    valor_total: orcamento.orcamentoTotal || orcamento.valor_total || 0, // Campo obrigatório para o backend
    // Não salvar outros campos calculados como areaTotalM2, custoTotalMaterial, custoTotalAdicionais,
    // eles serão recalculados ao carregar.
  };
  
  console.log('prepareOrcamentoForStorage - dados preparados:', prepared);
  console.log('prepareOrcamentoForStorage - Campos finais - Desconto:', prepared.desconto, 'Tipo:', prepared.descontoTipo, 'Calculado:', prepared.descontoCalculado, 'Frete:', prepared.frete);
  
  return prepared;
};

export const restoreOrcamentoFromStorage = (savedOrcamento, adminSettings) => {
  console.log('restoreOrcamentoFromStorage - adminSettings recebidos:', adminSettings);
  console.log('restoreOrcamentoFromStorage - savedOrcamento.adicionais:', savedOrcamento?.adicionais);
  
  // Criar estado inicial diretamente sem chamar getInitialOrcamentoComSettings
  const initial = {
    id: null, // Não gerar ID aqui para evitar loop infinito
    nome_orcamento: '',
    cliente: { id: '', nome: '', cpf_cnpj: '' },
    selectedPecas: [],
    pecaAvulsa: getInitialPecaAvulsaState(),
    produto: null,
    areaTotalM2: 0,
    custoTotalMaterial: 0,
    // Não precisamos mais da estrutura antiga dos adicionais
    // Os serviços são carregados dinamicamente do banco
    custoTotalAdicionais: 0,
    observacao: '',
    status: 'Rascunho',
    data: formatDateForBackend(),
    vendedor_id: null,
    vendedor_nome: '',
    pagamentos: [],
    orcamentoTotal: 0,
    // Campos de desconto e frete
    desconto: 0,
    descontoTipo: 'percentual',
    descontoCalculado: 0,
    frete: 0,
  };
  
  // Obter valores corretos dos adminSettings para os serviços adicionais
  // Os serviços adicionais são carregados dinamicamente do banco
  console.log('restoreOrcamentoFromStorage - adicionais:', initial.adicionais);
  
  // Mescla o estado salvo com o inicial, priorizando o salvo, mas garantindo estrutura
  const restored = {
    ...initial, // Base com estrutura correta
    ...savedOrcamento, // Sobrescreve com os dados salvos
    pecaAvulsa: getInitialPecaAvulsaState(), // Sempre reseta pecaAvulsa
    // Não precisamos mais da estrutura antiga dos adicionais
    // Os serviços são carregados dinamicamente do banco
    selectedPecas: Array.isArray(savedOrcamento.selectedPecas) ? savedOrcamento.selectedPecas.map(p => ({
        ...p, // Mantém id do item na lista e quantidade
        parte: { ...p.parte }, // Mantém os dados da parte
        servicosAdicionais: p.servicosAdicionais || {}, // Mantém serviços adicionais por peça
    })) : [],
    produto: savedOrcamento.produto || null,
    data: savedOrcamento.data || formatDateForBackend(),
    // Campos calculados como areaTotalM2, orcamentoTotal, etc., serão recalculados pelo useEffect no useEnvelopamento
  };

  console.log('restoreOrcamentoFromStorage - resultado final:', restored);
  console.log('restoreOrcamentoFromStorage - adicionais finais:', restored.adicionais);

  // Mantém o ID original do orçamento salvo, não gera novo ID para evitar loop infinito
  // Se o ID for inválido ou nulo, será tratado no useEnvelopamento

  return restored;
};