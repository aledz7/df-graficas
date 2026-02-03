import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';
import api from '@/config/axios';
import { 
  getInitialOrcamentoComSettings,
  prepareOrcamentoForStorage,
  restoreOrcamentoFromStorage,
  createNewOrcamento
} from './envelopamento/envelopamentoState';
import { calcularOrcamentoCompleto } from './envelopamento/envelopamentoCalculos';
import { createEnvelopamentoHandlers } from './envelopamento/envelopamentoHandlers';
import { useAuditoria } from './useAuditoria';
import { envelopamentoService } from '@/services/envelopamentoApi';
import { calculadoraService } from '@/services/api';

const ORCAMENTO_STORAGE_KEY = 'envelopamentoOrcamentoAtual'; // Para novo orçamento

export const useEnvelopamento = ({ vendedorAtual, orcamentoInicial = null, skipRascunhoLoad = false, shouldSkipRascunho = null }) => {
  const { toast } = useToast();
  const { registrarAcao } = useAuditoria();
  const [adminSettings, setAdminSettings] = useState({});
  const [backendSettings, setBackendSettings] = useState({});
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3; // Máximo de 3 tentativas
  const initialOrcamentoStateRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [orcamento, setOrcamentoInternal] = useState(() => {
         // Valores vazios até carregar do banco
         const defaultAdminSettings = {}; // Não precisamos mais de configurações padrão fixas
     
     if (orcamentoInicial) { // Se um orçamento inicial é fornecido (para edição)
       const restored = restoreOrcamentoFromStorage(orcamentoInicial, defaultAdminSettings);
       initialOrcamentoStateRef.current = restored; 
       return calcularOrcamentoCompleto(restored, defaultAdminSettings);
     }
     
     // Para novo orçamento, inicializa com estado padrão sem ID
     // O rascunho será carregado da API no useEffect
     const initialState = {
       id: null,
       codigo_orcamento: null,
       nome_orcamento: '',
       cliente: { id: '', nome: '', cpf_cnpj: '' },
       selectedPecas: [],
       pecaAvulsa: { descricao: '', alturaM: '', larguraM: '', quantidade: '' },
       produto: null,
       areaTotalM2: 0,
       custoTotalMaterial: 0,
       // Os serviços adicionais são carregados dinamicamente do banco
       custoTotalAdicionais: 0,
       observacao: '',
       status: 'Rascunho',
       data_criacao: new Date().toISOString(),
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
     initialOrcamentoStateRef.current = initialState;
     return initialState;
   });
  
  // Carregar configurações administrativas da tabela admin_configuracoes
  useEffect(() => {
    const loadAdminSettings = async () => {
      try {
        // Aguardar um pouco para garantir que a autenticação esteja completa
        //await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar se há token antes de fazer a requisição
        const token = apiDataManager.getToken();
        
        if (!token) {
          console.warn('useEnvelopamento - Nenhum token encontrado, pulando carregamento de serviços');
          return;
        }
        
        // Buscar serviços adicionais ativos da tabela servicos_adicionais
        let backendSettings;
        
        try {
          // Usar o serviço de envelopamento para buscar serviços do tipo envelopamento
          const response = await api.get('/api/servicos-adicionais');
          
          if (response.data.success && response.data.data) {
            backendSettings = { servicosAdicionais: response.data.data };
            console.log('useEnvelopamento - Serviços carregados:', response.data.data);
          } else {
            console.warn('useEnvelopamento - Resposta da API não contém dados válidos:', response.data);
            backendSettings = { servicosAdicionais: [] };
          }
        } catch (fetchError) {
          console.error('useEnvelopamento - Erro ao buscar serviços adicionais:', fetchError);
          backendSettings = { servicosAdicionais: [] };
        }
        
        // Definir as configurações carregadas
        setAdminSettings(backendSettings);
        setBackendSettings(backendSettings);
        
      } catch (error) {
        console.error('useEnvelopamento - Erro geral ao carregar configurações:', error);
        
        // Incrementar contador de tentativas
        setRetryCount(prev => prev + 1);
        
        // Só tentar novamente se não atingiu o máximo de tentativas
        if (retryCount < maxRetries) {
          console.warn(`useEnvelopamento - Tentativa ${retryCount + 1}/${maxRetries}, tentando novamente em 5 segundos...`);
          setTimeout(() => {
            loadAdminSettings();
          }, 5000);
        } else {
          console.warn('useEnvelopamento - Máximo de tentativas atingido, definindo configurações vazias');
          setAdminSettings({ servicosAdicionais: [] });
        }
      }
    };

    loadAdminSettings();
  }, []);

  // Efeito para carregar rascunho da API quando for um novo orçamento
  const loadingRef = useRef(false);

  useEffect(() => {
    
    // Verificar se deve pular o carregamento do rascunho
    const shouldSkip = shouldSkipRascunho ? shouldSkipRascunho() : skipRascunhoLoad;
    
    // Não carregar rascunho se um orçamento inicial foi fornecido ou se foi solicitado para pular
    if (orcamentoInicial || shouldSkip) {
      return;
    }

    // Adicionar um pequeno delay para garantir que o componente esteja totalmente montado
    const timer = setTimeout(() => {
      const loadRascunho = async () => {
        // Evita carregamentos duplicados
        if (loadingRef.current) return;
        
        // Verificar novamente se deve pular o carregamento
        const shouldSkipAgain = shouldSkipRascunho ? shouldSkipRascunho() : skipRascunhoLoad;
        if (shouldSkipAgain) {
          return;
        }
        
        try {
          loadingRef.current = true;
          setLoading(true);
          
          const rascunho = await envelopamentoService.carregarRascunhoOrcamento();
          if (rascunho) {
            // Usar as configurações já carregadas ou deixar vazio se ainda não foram carregadas
            const settingsToUse = Object.keys(adminSettings).length > 0 ? adminSettings : {};
            const restored = restoreOrcamentoFromStorage(rascunho, settingsToUse);
            initialOrcamentoStateRef.current = restored;
            setOrcamentoInternal(prev => {
              // Evita atualização desnecessária se o estado for igual
              if (prev.id === restored.id && prev.status === restored.status) {
                return prev;
              }
              return calcularOrcamentoCompleto(restored, settingsToUse);
            });
          } 
        } catch (error) {
          console.error('❌ Erro ao carregar rascunho de orçamento da API:', error);
        } finally {
          setLoading(false);
          loadingRef.current = false;
        }
      };

      loadRascunho();
    }, 100);

    return () => {
      clearTimeout(timer);
      loadingRef.current = true; // Previne carregamentos durante cleanup
    };
  }, [orcamentoInicial, skipRascunhoLoad, shouldSkipRascunho, adminSettings]);

  const setOrcamento = useCallback((updater) => {
    setOrcamentoInternal(prevOrcamento => {
      const newOrcamento = typeof updater === 'function' ? updater(prevOrcamento) : updater;
      const calculado = calcularOrcamentoCompleto(newOrcamento, adminSettings);
      return calculado;
    });
  }, [adminSettings]);

  useEffect(() => {
    // Recalcular o orçamento quando houver mudanças
    const orcamentoCalculado = calcularOrcamentoCompleto(orcamento, adminSettings);
    setOrcamentoInternal(orcamentoCalculado); 
  }, [
    JSON.stringify(orcamento.selectedPecas), 
    // Observar mudanças nos serviços adicionais das peças
    JSON.stringify(orcamento.selectedPecas?.map(peca => peca.servicosAdicionais)),
    orcamento.produto?.id, 
    orcamento.desconto,
    orcamento.descontoTipo,
    orcamento.frete,
    adminSettings
  ]);

  // Estado para controlar o salvamento do rascunho
  const [salvandoRascunho, setSalvandoRascunho] = useState(false);
  const salvamentoTimeoutRef = useRef(null);

  // Efeito para salvar rascunho na API com debounce
  useEffect(() => {
    // Não salvar se for um orçamento existente em edição
    if (orcamentoInicial || !orcamento || !orcamento.id) {
      return;
    }

    // Não salvar se o orçamento for um rascunho de edição (não é um novo orçamento)
    if (orcamento.id && typeof orcamento.id === 'string' && !orcamento.id.startsWith('env-draft-') && !orcamento.id.startsWith('rascunho_env_')) {
      return;
    }

    // Não salvar se o orçamento não tiver mudanças significativas
    if (
      !orcamento.selectedPecas.length &&
      !orcamento.cliente?.nome &&
      !orcamento.produto?.id &&
      !orcamento.nome_orcamento &&
      !orcamento.observacao
    ) {
      return;
    }

    // Limpa o timeout anterior se houver
    if (salvamentoTimeoutRef.current) {
      clearTimeout(salvamentoTimeoutRef.current);
    }

    // Define um novo timeout para salvar o rascunho após 2 segundos de inatividade
    salvamentoTimeoutRef.current = setTimeout(() => {
      setSalvandoRascunho(true);
      const orcamentoParaSalvar = prepareOrcamentoForStorage(orcamento, adminSettings);
      
      envelopamentoService.salvarRascunhoOrcamento(orcamentoParaSalvar)
        .then(() => {
          // Rascunho salvo com sucesso
        })
        .catch(error => {
          console.error("❌ Erro ao salvar rascunho de orçamento na API:", error);
          // Não mostrar toast para erros de API temporários, apenas log
          if (error.response?.status !== 500 && error.response?.status !== 422) {
            toast({
              title: "Erro ao salvar rascunho",
              description: "Não foi possível salvar o rascunho do orçamento. Tente novamente mais tarde.",
              variant: "destructive",
              duration: 5000,
            });
          }
        })
        .finally(() => {
          setSalvandoRascunho(false);
        });
    }, 2000); // 2 segundos de debounce

    // Cleanup function
    return () => {
      if (salvamentoTimeoutRef.current) {
        clearTimeout(salvamentoTimeoutRef.current);
      }
    };
  }, [
    orcamento.id, 
    orcamento.nome_orcamento, 
    orcamento.cliente, 
    orcamento.selectedPecas, 
    orcamento.produto, 
    orcamento.observacao,
    orcamento.data_criacao,
    orcamentoInicial, 
    toast
  ]);
  
  const resetFullState = useCallback(async () => {
    if (orcamentoInicial) { // Se estiver editando, reseta para o estado inicial do orçamento carregado
        const restored = restoreOrcamentoFromStorage(orcamentoInicial, adminSettings);
        setOrcamentoInternal(calcularOrcamentoCompleto(restored, adminSettings));
    } else { // Se for um novo orçamento, reseta para um estado completamente novo
        // Limpa o rascunho na API
        envelopamentoService.salvarRascunhoOrcamento(null)
          .catch(error => {
            console.error("Erro ao limpar rascunho de orçamento na API:", error);
            // Em caso de erro, apenas log, não interromper o fluxo
          });
          
        const novoEstadoInicial = await getInitialOrcamentoComSettings(adminSettings, true); // Gerar novo ID apenas quando resetar
        initialOrcamentoStateRef.current = novoEstadoInicial; 
        setOrcamentoInternal(novoEstadoInicial); 
    }
  }, [adminSettings, orcamentoInicial]);

  const handlers = createEnvelopamentoHandlers(
    orcamento, 
    setOrcamento, 
    adminSettings, 
    vendedorAtual, 
    initialOrcamentoStateRef, 
    toast, 
    resetFullState,
    registrarAcao
    );

  return {
    orcamento,
    setOrcamento, 
    adminSettings,
    handlers,
    initialOrcamentoState: initialOrcamentoStateRef.current,
    salvandoRascunho,
  };
};