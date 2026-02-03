import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useOSStateManagement } from './os/osState';
import { useOSHandlers } from './os/osHandlers';
import { loadInitialOSContext, loadOS } from './os/osDataService';
import { safeJsonParse } from '@/lib/utils';
import { initialOrdemServicoState } from './os/osConstants';
import { apiDataManager } from '@/lib/apiDataManager';
import { acabamentoService, maquinaService, empresaService } from '@/services/api';

export const useOrdemServico = ({ vendedorAtual }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const documentRef = useRef();
  const finalizeModalOpenedRef = useRef(false);
  const osCarregadaParaFinalizarRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); 
  const [viewOnly, setViewOnly] = useState(false);
  
  // Detectar viewOnly do state da navegação
  useEffect(() => {
    if (location.state?.viewOnly) {
      setViewOnly(true);
    }
  }, [location.state]);
  
  const toggleViewMode = useCallback(() => {
    setViewOnly(prev => {
      const newViewMode = !prev;
      
      toast({
        title: newViewMode ? "Modo Visualização" : "Modo Edição",
        description: newViewMode ? "Agora você está visualizando a OS em modo somente leitura." : "Agora você pode editar a OS.",
        duration: 2000
      });
      
      return newViewMode;
    });
  }, [toast]);

  const [logoUrl, setLogoUrl] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [maquinas, setMaquinas] = useState([]);
  const [empresaSettings, setEmpresaSettings] = useState({});
  const [contasBancarias, setContasBancarias] = useState([]);
  const locationKey = location.key;
  const searchParamsKey = searchParams.toString();

  const {
    ordemServico, setOrdemServico,
    itemAtual, setItemAtual,
    clienteSelecionado, setClienteSelecionado,
    isOSFinalizada, setIsOSFinalizada,
    isEditingItem, setIsEditingItem,
    isClienteModalOpen, setIsClienteModalOpen,
    isPagamentoModalOpen, setIsPagamentoModalOpen,
    isDocumentModalOpen, setIsDocumentModalOpen,
    acabamentosConfig, setAcabamentosConfig,
    produtosCadastrados,
    produtosCarregados,
    isCarregandoProdutos,
    carregarProdutosSeNecessario,
    resetOrdemServico,
    handleItemChange,
    totaisOS, 
  } = useOSStateManagement(vendedorAtual);

  const handlers = useOSHandlers(
    ordemServico, setOrdemServico,
    itemAtual, setItemAtual,
    clienteSelecionado, setClienteSelecionado,
    setIsOSFinalizada, setIsEditingItem,
    acabamentosConfig, produtosCadastrados,
    setIsClienteModalOpen, setIsPagamentoModalOpen, setIsDocumentModalOpen,
    setIsSaving, 
    documentRef, vendedorAtual, totaisOS,
    maquinas
  );
  
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!isMounted) return;
      
      // Debug: verificar state da navegação
      console.log('🔍 [useOrdemServico] loadData iniciado:', {
        locationState: location.state,
        osIdFromUrl: params.id,
        finalize: location.state?.finalize,
        osCarregadaParaFinalizar: osCarregadaParaFinalizarRef.current
      });
      
      // Se já carregamos uma OS para finalizar e o modal foi aberto, não recarregar
      // Isso evita que os campos sejam limpos quando o useEffect é executado novamente
      if (osCarregadaParaFinalizarRef.current && !location.state?.finalize) {
        console.log('⏸️ [useOrdemServico] OS já carregada para finalização, pulando recarregamento');
        return;
      }
      
      try {
        const [
          empresaResponse,
          acabamentosResponse,
          maquinasResponse
        ] = await Promise.allSettled([
          empresaService.get(),
          acabamentoService.getAll(),
          maquinaService.getAll()
        ]);

        if (!isMounted) return;

        let settings = {};
        if (empresaResponse.status === 'fulfilled') {
          const empresaData = empresaResponse.value?.data?.data || {};
          settings = {
            nomeFantasia: empresaData.nome_fantasia || 'Sua Empresa',
            razaoSocial: empresaData.razao_social || '',
            cnpj: empresaData.cnpj || '',
            inscricaoEstadual: empresaData.inscricao_estadual || '',
            inscricaoMunicipal: empresaData.inscricao_municipal || '',
            email: empresaData.email || '',
            telefone: empresaData.telefone || '',
            whatsapp: empresaData.whatsapp || '',
            enderecoCompleto: empresaData.endereco_completo || '',
            instagram: empresaData.instagram || '',
            site: empresaData.site || '',
            logoUrl: empresaData.logo_url || '',
            nomeSistema: empresaData.nome_sistema || 'Sistema Gráficas',
            mensagemPersonalizadaRodape: empresaData.mensagem_rodape || 'Obrigado pela preferência!',
            senhaSupervisor: empresaData.senha_supervisor || '',
            termosServico: empresaData.termos_servico || '',
            politicaPrivacidade: empresaData.politica_privacidade || '',
          };
          await apiDataManager.setItem('empresaSettings', settings);
          if (empresaData.logo_url) {
            await apiDataManager.setItem('logoUrl', empresaData.logo_url);
          }
        } else {
          const settingsStr = await apiDataManager.getItem('empresaSettings');
          settings = safeJsonParse(settingsStr, {});
        }

        setEmpresaSettings(settings);
        const storedLogo = await apiDataManager.getItem('logoUrl');
        setLogoUrl(storedLogo || '');
        setNomeEmpresa(settings.nomeFantasia || 'Sua Empresa');

        let acabamentosArray = [];
        if (acabamentosResponse.status === 'fulfilled') {
          const rawAcabamentos = acabamentosResponse.value?.data ?? [];
          acabamentosArray = Array.isArray(rawAcabamentos) ? rawAcabamentos : [];
          await apiDataManager.setItem('acabamentos_config', acabamentosArray);
        } else {
          const cachedAcabamentos = await apiDataManager.getItem('acabamentos_config');
          acabamentosArray = safeJsonParse(cachedAcabamentos, []);
        }
        if (!isMounted) return;
        setAcabamentosConfig(acabamentosArray);

        let maquinasArray = [];
        if (maquinasResponse.status === 'fulfilled') {
          const rawMaquinas = maquinasResponse.value?.data ?? [];
          maquinasArray = Array.isArray(rawMaquinas) ? rawMaquinas : [];
          await apiDataManager.setItem('maquinas', maquinasArray);
        } else {
          const cachedMaquinas = await apiDataManager.getItem('maquinas');
          maquinasArray = safeJsonParse(cachedMaquinas, []);
        }
        if (!isMounted) return;
        setMaquinas(maquinasArray);

        const contasBancariasStr = await apiDataManager.getItem('contasBancarias');
        if (!isMounted) return;
        setContasBancarias(safeJsonParse(contasBancariasStr, []));

        if (!isMounted) return;
        // Novo: ler id da URL e viewOnly da query
        const osIdFromUrl = params.id;
        const viewOnlyFromQuery = searchParams.get('viewOnly') === 'true';
        const editModeFromQuery = searchParams.get('edit') === 'true';
        // Se veio em modo edição forçada, garantir que não ficará somente leitura
        setViewOnly(editModeFromQuery ? false : viewOnlyFromQuery);

        // Não carregar contexto inicial se há dados da calculadora
        let initialContext = null;
        if (!location.state?.fromCalculadora) {
          if (osIdFromUrl) {
            // Carregar OS pelo id da URL
            initialContext = await loadInitialOSContext({ osId: osIdFromUrl }, osIdFromUrl, vendedorAtual);
          } else if (location.state?.osId) {
            // Carregar OS específica via state (ex: botão Finalizar no histórico)
            initialContext = await loadInitialOSContext(location.state, location.state.osId, vendedorAtual);
          } else {
            // Nova OS - não tentar carregar nenhuma OS existente
            initialContext = await loadInitialOSContext(null, null, vendedorAtual);
          }
          
          if (!isMounted) return;
          
          if (initialContext.ordemServico) {
            setOrdemServico(initialContext.ordemServico);
          }
          if (initialContext.clienteSelecionado !== undefined) {
            setClienteSelecionado(initialContext.clienteSelecionado);
          }
          if (initialContext.isOSFinalizada !== undefined) {
            // Se veio com ?edit=true, permitir edição mesmo para OS finalizada
            setIsOSFinalizada(editModeFromQuery ? false : initialContext.isOSFinalizada);
          }
          if (initialContext.toastMessage) {
            toast(initialContext.toastMessage);
          }
        }
        
        // Se veio com finalize: true, abrir o modal de pagamento
        // Fazer isso DEPOIS de carregar a OS e ANTES de limpar o state
        const shouldFinalize = location.state?.finalize === true && !finalizeModalOpenedRef.current;
        console.log('🔍 [useOrdemServico] Verificando se deve finalizar:', {
          shouldFinalize,
          locationStateFinalize: location.state?.finalize,
          alreadyOpened: finalizeModalOpenedRef.current,
          hasInitialContext: !!initialContext,
          hasOrdemServico: !!initialContext?.ordemServico
        });
        
        if (shouldFinalize) {
          const osParaFinalizar = initialContext?.ordemServico;
          if (osParaFinalizar) {
            // Marcar que já carregamos uma OS para finalizar
            osCarregadaParaFinalizarRef.current = true;
            // Marcar que já tentamos abrir o modal para evitar múltiplas tentativas
            finalizeModalOpenedRef.current = true;
            
            console.log('✅ [useOrdemServico] Abrindo modal de pagamento para finalizar OS:', {
              osId: osParaFinalizar.id || osParaFinalizar.id_os,
              status: osParaFinalizar.status_os,
              itens_count: osParaFinalizar.itens?.length || 0
            });
            // Aguardar um pouco para garantir que a OS foi carregada completamente no estado
            setTimeout(() => {
              if (isMounted) {
                setIsPagamentoModalOpen(true);
                console.log('✅ [useOrdemServico] Modal de pagamento aberto via setTimeout');
              } else {
                console.warn('⚠️ [useOrdemServico] Componente desmontado, não abrindo modal');
              }
            }, 500);
          } else {
            console.warn('⚠️ [useOrdemServico] Tentativa de finalizar OS, mas OS não foi carregada:', {
              osId: location.state?.osId,
              hasInitialContext: !!initialContext,
              initialContextKeys: initialContext ? Object.keys(initialContext) : []
            });
          }
        }
        
        // Só limpar o state se for navegação de OS (osId), não da calculadora
        // Mas não limpar se for para finalizar (finalize: true), pois precisamos manter o estado
        // NÃO limpar o state quando finalize: true para evitar recarregamento que limpa os campos
        if (location.state?.osId && !location.state?.fromCalculadora && !location.state?.finalize) {
          navigate(location.pathname, { replace: true, state: {} });
        }
        // Não limpar o state quando finalize: true - deixar o React Router gerenciar naturalmente
        // Isso evita que o useEffect seja disparado novamente e limpe os campos

      } catch(error) {
        if (!isMounted) return;
        console.error('Erro ao carregar dados iniciais:', error);
        toast({ 
          title: "Erro ao Carregar", 
          description: "Ocorreu um erro ao carregar os dados iniciais da OS.", 
          variant: "destructive" 
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
            
    setIsLoading(true);
    loadData();
    
    return () => {
      isMounted = false;
      // Resetar as refs quando o componente desmontar ou quando locationKey mudar
      // Mas só resetar se não estivermos finalizando uma OS
      if (!location.state?.finalize) {
        finalizeModalOpenedRef.current = false;
        osCarregadaParaFinalizarRef.current = false;
      }
    };
  }, [params.id, searchParamsKey, vendedorAtual, locationKey]);

  // Memoizar as funções para evitar re-renderizações desnecessárias
  const memoizedHandlers = useMemo(() => handlers, [
    handlers
  ]);

  return {
    ordemServico, setOrdemServico,
    itemAtual, setItemAtual,
    clienteSelecionado, setClienteSelecionado,
    isOSFinalizada, setIsOSFinalizada,
    isEditingItem, setIsEditingItem,
    logoUrl, nomeEmpresa,
    acabamentosConfig, maquinas, produtosCadastrados,
    produtosCarregados,
    isCarregandoProdutos,
    carregarProdutosSeNecessario,
    empresaSettings, contasBancarias,
    documentRef,
    isLoading, isSaving, 
    viewOnly,
    toggleViewMode,
    resetOrdemServico,
    handleItemChange,
    totaisOS,
    isClienteModalOpen, setIsClienteModalOpen,
    isPagamentoModalOpen, setIsPagamentoModalOpen,
    isDocumentModalOpen, setIsDocumentModalOpen,
    ...memoizedHandlers,
  };
};