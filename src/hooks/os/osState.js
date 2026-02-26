import { useState, useCallback, useEffect, useRef } from 'react';
import { initialServicoM2State, initialProdutoUnidadeState, initialOrdemServicoState, initialOrdemServicoStateSync } from '@/hooks/os/osConstants';
import { createNewOSWithSequentialId } from './osIdService';
import { calcularSubtotalItem, calcularTotalOS, garantirIdsItensOS } from './osLogic';
import { safeJsonParse, safeParseFloat } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { apiDataManager } from '@/lib/apiDataManager';
import { acabamentoService, produtoService, calculadoraService } from '@/services/api';

const PRODUTOS_CACHE_KEY = 'produtos';
const PRODUTOS_LAST_SYNC_KEY = 'produtos_last_sync';
const ACABAMENTOS_CACHE_KEY = 'acabamentos_config';
const ACABAMENTOS_LAST_SYNC_KEY = 'acabamentos_last_sync';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

const parseTimestamp = (value) => {
  if (!value) return 0;

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 0;

    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return typeof parsed === 'number' ? parsed : 0;
      } catch {
        return 0;
      }
    }

    const parsed = parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === 'object') {
    try {
      const parsed = JSON.parse(JSON.stringify(value));
      if (typeof parsed === 'number') {
        return parsed;
      }
    } catch {
      return 0;
    }
  }

  return 0;
};

const shouldRefreshCache = async (timestampKey, forceWhenMissing = false) => {
  try {
    const timestampRaw = await apiDataManager.getItem(timestampKey);
    const lastSync = parseTimestamp(timestampRaw);
    if (!lastSync) {
      return true;
    }
    return Date.now() - lastSync > CACHE_TTL_MS || forceWhenMissing;
  } catch (error) {
    console.warn(`⚠️ [useOSStateManagement] Falha ao ler timestamp ${timestampKey}:`, error);
    return true;
  }
};

export const useOSStateManagement = (vendedorAtual) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [ordemServico, setOrdemServicoRaw] = useState(null);
  const [itemAtual, setItemAtual] = useState(initialServicoM2State());
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [isOSFinalizada, setIsOSFinalizada] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  
  // Wrapper para setOrdemServico que garante que todos os itens tenham id_item_os
  const setOrdemServico = useCallback((osOuFuncao) => {
    setOrdemServicoRaw(prevOS => {
      // Se for uma função, executá-la primeiro
      const novaOS = typeof osOuFuncao === 'function' ? osOuFuncao(prevOS) : osOuFuncao;
      
      // Garantir que todos os itens tenham id_item_os
      // Só fazer isso se houver itens e se pelo menos um item não tiver id_item_os
      if (novaOS && Array.isArray(novaOS.itens) && novaOS.itens.length > 0) {
        const itensSemId = novaOS.itens.filter(item => !item.id_item_os);
        
        // Se todos os itens já têm id_item_os, não precisamos fazer nada
        if (itensSemId.length === 0) {
          return novaOS;
        }
        
        // Se algum item não tem id_item_os, garantir IDs
        const osComIds = garantirIdsItensOS(novaOS);
        return osComIds;
      }
      
      return novaOS;
    });
  }, []);

  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);

  const [acabamentosConfig, setAcabamentosConfig] = useState([]);
  const [produtosCadastrados, setProdutosCadastrados] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [produtosCarregados, setProdutosCarregados] = useState(false);
  const [isCarregandoProdutos, setIsCarregandoProdutos] = useState(false);
  const produtosCarregamentoPromiseRef = useRef(null);

  const fetchAcabamentosFromAPI = useCallback(async () => {
    try {
      const response = await acabamentoService.getAll();
      const dados = response?.data || [];
      await apiDataManager.setItem(ACABAMENTOS_CACHE_KEY, dados);
      await apiDataManager.setItem(ACABAMENTOS_LAST_SYNC_KEY, Date.now());
      const array = Array.isArray(dados) ? dados : [];
      if (isMountedRef.current) {
        setAcabamentosConfig(array);
      }
      return array;
    } catch (error) {
      console.error('❌ [useOSStateManagement] Erro ao carregar acabamentos da API:', error);
      return [];
    }
  }, []);

  const fetchProdutosFromBackend = useCallback(async () => {
    try {
      console.log('🔄 [useOSStateManagement] Buscando produtos da API (paginado)...');
      const produtosAcumulados = [];
      let currentPage = 1;
      let lastPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await produtoService.getAll(`?per_page=1000&page=${currentPage}`);

        let responseData = response;
        if (response?.data !== undefined) {
          responseData = response.data;
        }

        let produtosData = [];
        let metaData = {};

        if (responseData?.data !== undefined && Array.isArray(responseData.data)) {
          produtosData = responseData.data;
          metaData = responseData.meta || {};
        } else if (Array.isArray(responseData)) {
          produtosData = responseData;
          metaData = {};
        } else if (responseData && typeof responseData === 'object') {
          produtosData = Array.isArray(responseData.data) ? responseData.data : [];
          metaData = responseData.meta || {};
        }

        const produtosPage = Array.isArray(produtosData) ? produtosData : [];
        produtosAcumulados.push(...produtosPage);

        lastPage = metaData.last_page || metaData.total_pages || 1;

        if (produtosPage.length === 0) {
          hasMore = false;
        } else if (lastPage > 1) {
          hasMore = currentPage < lastPage;
        } else {
          hasMore = produtosPage.length >= 1000;
        }

        console.log(`📦 [useOSStateManagement] Página ${currentPage}/${lastPage}: ${produtosPage.length} produtos. Total acumulado: ${produtosAcumulados.length}.`);

        currentPage++;

        if (currentPage > 100) {
          console.warn('⚠️ [useOSStateManagement] Limite de páginas atingido. Parando busca para evitar loop.');
          break;
        }
      }

      let servicosAdicionais = [];
      try {
        const servicosResponse = await calculadoraService.getServicosAdicionais();
        if (servicosResponse?.data?.data) {
          servicosAdicionais = servicosResponse.data.data;
        }
      } catch (servicosError) {
        console.warn('⚠️ [useOSStateManagement] Erro ao carregar serviços adicionais:', servicosError);
      }

      const acabamentosServicos = Array.isArray(acabamentosConfig)
        ? acabamentosConfig.map(acab => ({
            id: `acab_${acab.id}`,
            nome: acab.nome_acabamento,
            preco_venda: acab.valor_m2 || '0',
            unidadeMedida: 'm²',
            tipo_produto: 'm2',
            estoque: 999999,
            codigo_produto: `ACAB-${acab.id}`,
            categoria_nome: 'Acabamentos',
            imagem_principal: null,
            sku: `ACAB-${acab.id}`,
            descricao: acab.observacoes || `Acabamento: ${acab.nome_acabamento}`,
            isAcabamento: true,
            acabamento_original: acab
          }))
        : [];

      const servicosNormalizados = servicosAdicionais.map(servico => ({
        id: `servico_${servico.id}`,
        nome: servico.nome,
        preco_venda: servico.preco,
        unidadeMedida: servico.unidade || 'm²',
        tipo_produto: 'm2',
        estoque: 999999,
        codigo_produto: `SERV-${servico.id}`,
        categoria_nome: 'Serviços Adicionais',
        imagem_principal: null,
        sku: `SERV-${servico.id}`,
        descricao: servico.descricao,
        isServicoAdicional: true,
        servico_original: servico
      }));

      const produtosComServicos = [
        ...produtosAcumulados,
        ...servicosNormalizados,
        ...acabamentosServicos
      ];

      await apiDataManager.setItem(PRODUTOS_CACHE_KEY, produtosComServicos);
      await apiDataManager.setItem(PRODUTOS_LAST_SYNC_KEY, Date.now());
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [useOSStateManagement] Produtos atualizados (incluindo serviços/acabamentos): ${produtosComServicos.length}`);
      }

      if (isMountedRef.current) {
        setProdutosCadastrados(produtosComServicos);
        setProdutosCarregados(true);
      }

      return produtosComServicos;
    } catch (error) {
      console.error('❌ [useOSStateManagement] Erro ao carregar produtos da API:', error);
      if (isMountedRef.current) {
        setProdutosCarregados(false);
      }
      throw error;
    }
  }, [acabamentosConfig]);

  // Initialize OS without ID (will be generated by backend when saved)
  useEffect(() => {
    const initializeOS = () => {
      if (!ordemServico) {
        
        const novaOS = initialOrdemServicoStateSync();
        if (vendedorAtual) {
          novaOS.vendedor_id = vendedorAtual.id;
          novaOS.vendedor_nome = vendedorAtual.nome;
        }
       
        setOrdemServico(novaOS);
      }
    };
    
    initializeOS();
  }, [vendedorAtual]);

  const carregarProdutosSeNecessario = useCallback(async ({ forceRefresh = false } = {}) => {
    if (produtosCarregamentoPromiseRef.current) {
      return produtosCarregamentoPromiseRef.current;
    }

    const executarCarga = async () => {
      try {
        if (!forceRefresh && produtosCadastrados.length > 0) {
          const lastSyncRaw = await apiDataManager.getItem(PRODUTOS_LAST_SYNC_KEY);
          const lastSync = parseTimestamp(lastSyncRaw);
          const expirado = !lastSync || (Date.now() - lastSync > CACHE_TTL_MS);

          if (!expirado) {
            if (isMountedRef.current) {
              setProdutosCarregados(true);
            }
            return produtosCadastrados;
          }
        }

        const cachedProdutosStr = await apiDataManager.getItem(PRODUTOS_CACHE_KEY);
        const cachedProdutos = safeJsonParse(cachedProdutosStr, []);
        const cachedTimestampRaw = await apiDataManager.getItem(PRODUTOS_LAST_SYNC_KEY);
        const cacheExpirado = Date.now() - parseTimestamp(cachedTimestampRaw) > CACHE_TTL_MS;

        if (cachedProdutos.length > 0 && !forceRefresh) {
          if (isMountedRef.current) {
            setProdutosCadastrados(cachedProdutos);
            setProdutosCarregados(true);
          }

          if (cacheExpirado) {
            fetchProdutosFromBackend().catch(error => {
              console.error('❌ [useOSStateManagement] Atualização assíncrona de produtos falhou:', error);
            });
          }

          return cachedProdutos;
        }

        const produtosAtualizados = await fetchProdutosFromBackend();
        return produtosAtualizados;
      } catch (error) {
        console.error('❌ [useOSStateManagement] Falha ao carregar produtos:', error);
        if (isMountedRef.current && produtosCadastrados.length === 0) {
          setProdutosCarregados(false);
        }
        throw error;
      } finally {
        if (isMountedRef.current) {
          setIsCarregandoProdutos(false);
        }
      }
    };

    const promessa = executarCarga().finally(() => {
      produtosCarregamentoPromiseRef.current = null;
    });

    produtosCarregamentoPromiseRef.current = promessa;
    setIsCarregandoProdutos(true);
    return promessa;
  }, [fetchProdutosFromBackend, produtosCadastrados]);

  // Initialize async data (lazy for produtos)
  useEffect(() => {
    const initializeData = async () => {
      try {
        const [cachedAcabamentosStr, cachedProdutosStr] = await Promise.all([
          apiDataManager.getItem(ACABAMENTOS_CACHE_KEY),
          apiDataManager.getItem(PRODUTOS_CACHE_KEY),
        ]);

        const cachedAcabamentos = safeJsonParse(cachedAcabamentosStr, []);
        const cachedProdutos = safeJsonParse(cachedProdutosStr, []);

        if (isMountedRef.current) {
          if (cachedAcabamentos.length) {
            setAcabamentosConfig(cachedAcabamentos);
          }
          if (cachedProdutos.length) {
            setProdutosCadastrados(cachedProdutos);
            setProdutosCarregados(true);
          }
        }

        const refreshAcabamentos = await shouldRefreshCache(ACABAMENTOS_LAST_SYNC_KEY, cachedAcabamentos.length === 0);
        if (refreshAcabamentos) {
          await fetchAcabamentosFromAPI();
        }

        if (isMountedRef.current) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('❌ [useOSStateManagement] Error initializing OS state:', error);
        if (isMountedRef.current) {
          setAcabamentosConfig(prev => Array.isArray(prev) ? prev : []);
          setProdutosCadastrados(prev => Array.isArray(prev) ? prev : []);
          setProdutosCarregados(false);
          setIsInitialized(true);
        }
      }
    };

    if (!isInitialized) {
      initializeData();
    }
  }, [fetchAcabamentosFromAPI, isInitialized]);

  const resetOrdemServico = useCallback(async () => {
    const novoEstadoOS = initialOrdemServicoStateSync();
    if (vendedorAtual) {
      novoEstadoOS.vendedor_id = vendedorAtual.id;
      novoEstadoOS.vendedor_nome = vendedorAtual.nome;
    }
    setOrdemServico(novoEstadoOS);
    setItemAtual(initialServicoM2State());
    setClienteSelecionado(null);
    
    setIsOSFinalizada(false);
    setIsEditingItem(false);
    navigate('/operacional/ordens-servico', { replace: true });
    toast({ title: "Nova OS", description: "Campos limpos para uma nova Ordem de Serviço." });
  }, [navigate, toast, vendedorAtual]);

  const handleItemChange = useCallback((field, value, resetFormType = false) => {
    setItemAtual(prev => {
      let updatedItem;
      if (resetFormType) {
        updatedItem = value === 'unidade' ? initialProdutoUnidadeState() : initialServicoM2State();
      } else {
        updatedItem = { ...prev, [field]: value };
      }

      if (['largura', 'altura', 'quantidade', 'valor_unitario', 'valor_unitario_m2', 'acabamentos_selecionados'].includes(field) || resetFormType) {
        const subtotal = calcularSubtotalItem(updatedItem, acabamentosConfig);
        return { ...updatedItem, subtotal_item: isNaN(subtotal) ? 0 : subtotal };
      }
      return updatedItem;
    });
  }, [acabamentosConfig]);

  const [totaisCalculados, setTotaisCalculados] = useState({
    subtotalServicosM2: 0,
    subtotalProdutosUnidade: 0,
    totalAcabamentos: 0,
    subtotalGeral: 0,
    descontoTerceirizado: 0,
    descontoGeral: 0,
    frete: 0,
    totalGeral: 0,
    custoTotalProdutosVinculadosAcabamentos: 0,
  });

  // Calcular totais de forma assíncrona
  // IMPORTANTE: Calcular totais sempre que ordemServico mudar, mesmo se não estiver totalmente inicializado
  // pois os itens já podem estar sendo adicionados antes da inicialização completa
  const ordemServicoHashRef = useRef(null);
  const clienteIdRef = useRef(null);
  const calculandoRef = useRef(false);
  
  useEffect(() => {
    // Evitar múltiplas execuções simultâneas
    if (calculandoRef.current) {
      return;
    }
    
    const calcularTotais = async () => {
      // Criar um hash simples baseado apenas nos dados essenciais para comparação rápida
      const itensHash = ordemServico?.itens?.map(i => 
        `${i.id_item_os || ''}-${safeParseFloat(i.subtotal_item, 0)}-${safeParseFloat(i.quantidade, 0)}`
      ).join('|') || '';
      const freteValor = safeParseFloat(ordemServico?.frete_valor, 0);
      const descontoGeralValor = safeParseFloat(ordemServico?.desconto_geral_valor, 0);
      const descontoGeralTipo = ordemServico?.desconto_geral_tipo || 'percentual';
      const descontoTerceirizadoPercent = safeParseFloat(ordemServico?.desconto_terceirizado_percentual, 0);
      const ordemServicoHash = ordemServico 
        ? `${ordemServico.id || ordemServico.id_os || 'new'}-${ordemServico.itens?.length || 0}-${itensHash}-${freteValor}-${descontoGeralValor}-${descontoGeralTipo}-${descontoTerceirizadoPercent}`
        : null;
      const clienteId = clienteSelecionado?.id || null;
      
      // Verificar se realmente mudou para evitar recálculos desnecessários
      if (ordemServicoHash === ordemServicoHashRef.current && clienteId === clienteIdRef.current && ordemServicoHashRef.current !== null) {
        return; // Não recalcular se nada mudou
      }
      
      ordemServicoHashRef.current = ordemServicoHash;
      clienteIdRef.current = clienteId;
      calculandoRef.current = true;
      
      try {
   
        
        // Calcular mesmo se não estiver inicializado, desde que tenha ordemServico e itens
        if (ordemServico && Array.isArray(ordemServico.itens)) {
          const calculatedTotals = await calcularTotalOS(ordemServico, clienteSelecionado);

          
          setTotaisCalculados({
            subtotalServicosM2: safeParseFloat(calculatedTotals.subtotalServicosM2),
            subtotalProdutosUnidade: safeParseFloat(calculatedTotals.subtotalProdutosUnidade),
            totalAcabamentos: safeParseFloat(calculatedTotals.totalAcabamentos),
            subtotalGeral: safeParseFloat(calculatedTotals.subtotalGeral),
            descontoTerceirizado: safeParseFloat(calculatedTotals.descontoTerceirizado),
            descontoGeral: safeParseFloat(calculatedTotals.descontoGeral),
            frete: safeParseFloat(calculatedTotals.frete),
            totalGeral: safeParseFloat(calculatedTotals.totalGeral),
            custoTotalProdutosVinculadosAcabamentos: safeParseFloat(calculatedTotals.custoTotalProdutosVinculadosAcabamentos),
          });
        }
      } catch (error) {
        console.error('❌ Erro ao calcular totais:', error);
      } finally {
        calculandoRef.current = false;
      }
    };

    calcularTotais();
  }, [ordemServico, clienteSelecionado, isInitialized]);

  const totaisOS = useCallback(() => {
    return totaisCalculados;
  }, [totaisCalculados]);

  return {
    ordemServico, setOrdemServico,
    itemAtual, setItemAtual,
    clienteSelecionado, setClienteSelecionado,
    isOSFinalizada, setIsOSFinalizada,
    isEditingItem, setIsEditingItem,
    isClienteModalOpen, setIsClienteModalOpen,
    isPagamentoModalOpen, setIsPagamentoModalOpen,
    isDocumentModalOpen, setIsDocumentModalOpen,
    acabamentosConfig, setAcabamentosConfig,
    produtosCadastrados, setProdutosCadastrados,
    produtosCarregados,
    isCarregandoProdutos,
    carregarProdutosSeNecessario,
    resetOrdemServico,
    handleItemChange,
    totaisOS,
  };
};