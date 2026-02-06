import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Trash2, Search, FileText, Printer, CircleDollarSign, CheckCircle2, PackageCheck, AlertTriangle, FilePlus, History, CalendarDays, CalendarClock, Loader2, FileEdit, ChevronLeft, ChevronRight, Play, Calculator, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { safeJsonParse, cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import DeleteWithJustificationModal from '@/components/utils/DeleteWithJustificationModal.jsx';
import { moverParaLixeiraOS } from '@/hooks/os/osDataService';
import OSDocumentModal from '@/components/os/OSDocumentModal.jsx';
import { useReactToPrint } from 'react-to-print';
import { apiDataManager } from '@/lib/apiDataManager';
import { osService, empresaService } from '@/services/api';
import { calcularSubtotalItem } from '@/hooks/os/osLogic.js';

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, startOfDay, endOfDay, isBefore, isValid, startOfToday, endOfToday } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatarDadosConsumoMaterialParaDescricao } from '@/utils/consumoMaterialUtils';
import { useActionPermissions } from '@/components/PermissionGate';

const OSHistoricoPage = ({ vendedorAtual }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Verificar permissões para ações específicas
  const { canCreate, canEdit, canDelete, canCancel, canChangeStatus } = useActionPermissions('acessar_os', {
    create: 'os_criar',
    edit: 'os_editar',
    delete: 'os_excluir',
    cancel: 'os_cancelar',
    changeStatus: 'os_alterar_status'
  });
  
  const [ordensServico, setOrdensServico] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchId, setSearchId] = useState('');
  const [searchCliente, setSearchCliente] = useState('');
  const [searchProduto, setSearchProduto] = useState('');
  const [searchAcabamento, setSearchAcabamento] = useState('');
  const [searchObs, setSearchObs] = useState('');
  const [filteredOS, setFilteredOS] = useState([]);
  const [osToDelete, setOsToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [statusFilter, setStatusFilter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalItems, setTotalItems] = useState(0);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSearchId('');
    setSearchCliente('');
    setSearchProduto('');
    setSearchAcabamento('');
    setSearchObs('');
    setStatusFilter(null);
    setDateRange({ from: undefined, to: undefined });
    setCurrentPage(1); // Resetar para primeira página
  };

  const [isNotinhaModalOpen, setIsNotinhaModalOpen] = useState(false);
  const [selectedOsForNotinha, setSelectedOsForNotinha] = useState(null);
  const notinhaRef = useRef();
  const [logoUrl, setLogoUrl] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [empresaSettings, setEmpresaSettings] = useState({});
  const [contasBancarias, setContasBancarias] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [isConsumoMaterialDetailsModalOpen, setIsConsumoMaterialDetailsModalOpen] = useState(false);
  const [selectedOsForConsumoDetails, setSelectedOsForConsumoDetails] = useState(null);

  const handlePrintNotinha = useReactToPrint({
    content: () => notinhaRef.current,
                    documentTitle: `Notinha_OS_${selectedOsForNotinha?.id_os ? String(selectedOsForNotinha.id_os).slice(-6) : 'OS'}`,
    pageStyle: `
      @page {
        size: 80mm 120mm; 
        margin: 3mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .printable-content {
          font-size: 8pt !important;
          line-height: 1.2 !important;
        }
        .printable-content h2, .printable-content h3 {
          font-size: 10pt !important;
          margin-bottom: 2px !important;
        }
        .printable-content p, .printable-content li, .printable-content td, .printable-content th {
          font-size: 7pt !important;
          margin-bottom: 1px !important;
        }
        .printable-content table {
          width: 100% !important;
        }
        .printable-content img {
          max-height: 30px !important;
        }
      }
    `
  });

  // Usar useRef para evitar recriação desnecessária da função
  const filtersRef = useRef({ searchId, searchCliente, searchProduto, searchAcabamento, searchObs, searchTerm, statusFilter, dateRange });
  filtersRef.current = { searchId, searchCliente, searchProduto, searchAcabamento, searchObs, searchTerm, statusFilter, dateRange };
  
  // Debug dos filtros
  console.log('🔍 [DEBUG] Estado dos filtros:', {
    searchId,
    searchTerm,
    searchCliente,
    searchProduto,
    searchAcabamento,
    searchObs
  });

  const loadOrdensServico = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const filters = filtersRef.current;
      
      // Preparar parâmetros para a API
      const params = {
        page: page.toString(),
        per_page: perPage.toString()
      };
      
      if (filters.searchId) {
        params.id = filters.searchId;
        console.log('🔍 [DEBUG] Buscando por ID:', filters.searchId);
        console.log('🔍 [DEBUG] Parâmetros completos:', params);
        console.log('🔍 [DEBUG] Tipo do ID:', typeof filters.searchId);
      }
      if (filters.searchCliente) params.cliente = filters.searchCliente;
      if (filters.searchProduto) params.produto = filters.searchProduto;
      if (filters.searchAcabamento) params.acabamento = filters.searchAcabamento;
      if (filters.searchObs) params.obs = filters.searchObs;
      if (filters.searchTerm && !filters.searchId) {
        params.search = filters.searchTerm;
        console.log('🔍 [DEBUG] Busca geral ativada:', filters.searchTerm);
      }
      
      if (filters.statusFilter && filters.statusFilter.length > 0) {
        params.status = filters.statusFilter.join(',');
      }
      
      if (filters.dateRange.from && isValid(filters.dateRange.from)) {
        params.data_inicio = format(filters.dateRange.from, 'yyyy-MM-dd');
      }
      
      if (filters.dateRange.to && isValid(filters.dateRange.to)) {
        params.data_fim = format(filters.dateRange.to, 'yyyy-MM-dd');
      }
      
      // Buscar ordens de serviço da API Laravel
      console.log('🚀 [DEBUG] Chamando API com parâmetros:', params);
      const response = await osService.getAll(params);
      console.log('📥 [DEBUG] Resposta da API:', response);
      
      // Extrair dados da resposta da API
      let ordensArray = response.data || [];
      const metaData = response.meta || {};
      
      // Criar um Set com TODOS os identificadores das OS já retornadas pela API
      // A API pode retornar tanto 'id' (numérico) quanto 'id_os' (string), então precisamos verificar ambos
      const identificadoresDaAPI = new Set();
      ordensArray.forEach(os => {
        // Adicionar id_os se existir
        if (os.id_os) {
          identificadoresDaAPI.add(String(os.id_os));
        }
        // Adicionar id se existir
        if (os.id) {
          identificadoresDaAPI.add(String(os.id));
        }
        // Também adicionar numero_os se existir (pode ser usado como identificador)
        if (os.numero_os) {
          identificadoresDaAPI.add(String(os.numero_os));
        }
      });
      
      // Mesclar com dados do localStorage para incluir OS salvas localmente que ainda não estão no banco
      try {
        const localData = safeJsonParse(await apiDataManager.getItem('ordens_servico_salvas'), []);
        if (Array.isArray(localData) && localData.length > 0) {
          // Adicionar apenas OS do localStorage que não estão na API
          // CRÍTICO: Se a OS tem id (foi salva na API), ela já deveria estar na lista retornada
          // Se não está, pode ter sido deletada - não adicionar do localStorage
          const osLocaisNaoNaAPI = localData.filter(os => {
            const idOs = os.id_os ? String(os.id_os) : null;
            const id = os.id ? String(os.id) : null;
            const numeroOs = os.numero_os ? String(os.numero_os) : null;
            
            // Se qualquer um dos identificadores já existe na API, não adicionar
            if (idOs && identificadoresDaAPI.has(idOs)) return false;
            if (id && identificadoresDaAPI.has(id)) return false;
            if (numeroOs && identificadoresDaAPI.has(numeroOs)) return false;
            
            // CRÍTICO: Se a OS tem id (foi salva na API), mas não está na lista retornada,
            // significa que foi deletada ou não passou nos filtros
            // Não adicionar do localStorage nesse caso
            if (id) {
              console.log('⚠️ [OSHistoricoPage] OS com id encontrada no localStorage mas não na API (provavelmente deletada):', id);
              return false;
            }
            
            // Só adicionar OSs que ainda não foram salvas na API (sem id)
            // Essas são OSs que foram criadas localmente mas ainda não foram sincronizadas
            return !!(idOs || numeroOs);
          });
          
          if (osLocaisNaoNaAPI.length > 0) {
            console.log(`📦 [OSHistoricoPage] Adicionando ${osLocaisNaoNaAPI.length} OS do localStorage que não estão na API`);
            ordensArray = [...ordensArray, ...osLocaisNaoNaAPI];
          }
        }
      } catch (localError) {
        console.warn('⚠️ [OSHistoricoPage] Erro ao mesclar dados locais:', localError);
      }
      
      // Remover duplicatas finais baseado em id_os, id ou numero_os (caso ainda existam)
      const identificadoresVistos = new Set();
      ordensArray = ordensArray.filter(os => {
        const idOs = os.id_os ? String(os.id_os) : null;
        const id = os.id ? String(os.id) : null;
        const numeroOs = os.numero_os ? String(os.numero_os) : null;
        
        // Verificar se já vimos qualquer um dos identificadores
        if (idOs && identificadoresVistos.has(idOs)) return false;
        if (id && identificadoresVistos.has(id)) return false;
        if (numeroOs && identificadoresVistos.has(numeroOs)) return false;
        
        // Adicionar todos os identificadores ao Set
        if (idOs) identificadoresVistos.add(idOs);
        if (id) identificadoresVistos.add(id);
        if (numeroOs) identificadoresVistos.add(numeroOs);
        
        return true;
      });
      
      // Carregar configurações de acabamentos
      const acabamentosConfigStr = await apiDataManager.getItem('acabamentos_config');
      const acabamentosConfig = JSON.parse(acabamentosConfigStr || '[]');
      
      // Processar cada OS para garantir que os valores estejam corretos
      const ordensProcessadas = Array.isArray(ordensArray) ? ordensArray.map(os => {
        // Log temporário para verificar dados de consumo de material
        if (os.tipo_origem === 'consumo_material' || (os.dados_consumo_material && Object.keys(os.dados_consumo_material).length > 0)) {
          console.log('✅ [DEBUG] OS com consumo de material encontrada:', {
            id: os.id,
            id_os: os.id_os,
            tipo_origem: os.tipo_origem,
            dados_consumo_material: os.dados_consumo_material
          });
        }
        
        let valorApi = parseFloat(os.valor_total_os ?? 0);
        valorApi = isNaN(valorApi) ? 0 : valorApi;

        if (os.itens && Array.isArray(os.itens)) {
          os.itens = os.itens.map(item => {
            // IMPORTANTE: Preservar o valor_total ou subtotal_item do banco quando existir
            // Não recalcular se já existe um valor válido, para evitar alterações indesejadas
            const subtotalDoBanco = parseFloat(item.valor_total ?? item.subtotal_item ?? 0) || 0;
            
            if (subtotalDoBanco > 0) {
              // Preservar o valor do banco
              return { 
                ...item, 
                subtotal_item: subtotalDoBanco,
                valor_total: subtotalDoBanco // Garantir que valor_total também está correto
              };
            }
            
            // Só recalcular se realmente não houver valor válido
            if (!item.subtotal_item || parseFloat(item.subtotal_item) === 0) {
              const subtotalCalculado = calcularSubtotalItem(item, acabamentosConfig);
              return { 
                ...item, 
                subtotal_item: subtotalCalculado,
                valor_total: subtotalCalculado // Garantir que valor_total também está correto
              };
            }
            
            return { 
              ...item, 
              subtotal_item: parseFloat(item.subtotal_item) || 0,
              valor_total: parseFloat(item.subtotal_item) || 0 // Garantir que valor_total também está correto
            };
          });

          // IMPORTANTE: Preservar o valor_total_os da API quando existir e for válido
          // Não recalcular se o valor da API já está correto, para evitar alterações indesejadas
          // Só recalcular se o valor da API estiver ausente ou inválido
          if (!valorApi || valorApi <= 0) {
            // Recalcular valor total da OS somente se não houver valor válido da API
            const subtotalItens = os.itens.reduce((acc, item) => acc + (parseFloat(item.valor_total ?? item.subtotal_item ?? 0) || 0), 0);
            const descontoTerceirizado = subtotalItens * (parseFloat(os.desconto_terceirizado_percentual || 0) / 100);
            const subtotalAposTerceirizado = subtotalItens - descontoTerceirizado;
            
            // Calcular desconto geral baseado no tipo (percentual ou reais)
            // IMPORTANTE: O desconto geral percentual deve ser aplicado sobre o subtotal APÓS o desconto terceirizado
            let descontoGeral = 0;
            const tipoDescontoGeral = os.desconto_geral_tipo || 'percentual';
            const valorDescontoGeralInput = parseFloat(os.desconto_geral_valor || 0);
            
            if (tipoDescontoGeral === 'percentual') {
              descontoGeral = (subtotalAposTerceirizado * valorDescontoGeralInput) / 100;
            } else {
              descontoGeral = valorDescontoGeralInput;
            }
            
            const freteValor = parseFloat(os.frete_valor || 0) || 0;
            const calculado = subtotalAposTerceirizado - descontoGeral + freteValor;
            valorApi = calculado;
          }
        }

        return { ...os, valor_total_os: parseFloat((valorApi || 0).toFixed(2)) };
      }) : [];
      
      // Ordenar por data de criação
      const ordensOrdenadas = ordensProcessadas.sort((a, b) => 
        new Date(b.data_criacao || 0) - new Date(a.data_criacao || 0)
      );
      
      setOrdensServico(ordensOrdenadas);
      
      // Atualizar informações de paginação
      setCurrentPage(metaData.current_page || 1);
      setTotalPages(metaData.last_page || 1);
      setTotalItems(metaData.total || ordensOrdenadas.length);
      
              // Buscar configurações da empresa
        try {
          const empresaResponse = await empresaService.get();
          const empresaData = empresaResponse.data.data || {};
          setEmpresaSettings(empresaData);
          setNomeEmpresa(empresaData.nome_fantasia || empresaData.nomeFantasia || 'Sua Empresa');
          if (empresaData.logo_url || empresaData.logoUrl) {
            setLogoUrl(empresaData.logo_url || empresaData.logoUrl);
          }
        } catch (empresaError) {
        console.error('Erro ao carregar dados da empresa:', empresaError);
        // Fallback para dados locais
        const storedLogo = await apiDataManager.getItem('logoUrl');
        if (storedLogo) setLogoUrl(storedLogo);
        const empresaSettings = safeJsonParse(await apiDataManager.getItem('empresaSettings'), {});
        setEmpresaSettings(empresaSettings);
        setNomeEmpresa(empresaSettings.nomeFantasia || 'Sua Empresa');
      }
      
      // Carregar contas bancárias e máquinas
      try {
        const [contasData, maquinasData] = await Promise.all([
          apiDataManager.getItem('contasBancarias'),
          apiDataManager.getItem('maquinas')
        ]);
        setContasBancarias(safeJsonParse(contasData, []));
        setMaquinas(safeJsonParse(maquinasData, []));
      } catch (error) {
        console.error('Erro ao carregar contas bancárias ou máquinas:', error);
        setContasBancarias([]);
        setMaquinas([]);
      }
      
    } catch (error) {
      console.error('Erro ao carregar ordens de serviço da API:', error);
      
      // Fallback para dados locais em caso de erro
      const data = safeJsonParse(await apiDataManager.getItem('ordens_servico_salvas'), []);
      const ordensArray = Array.isArray(data) ? data : [];
      
      // Aplicar filtros localmente quando usando fallback
      let ordensFiltradas = ordensArray;
      
      // Filtrar por data localmente
      if (dateRange.from && isValid(dateRange.from)) {
        const dataInicio = startOfDay(dateRange.from);
        ordensFiltradas = ordensFiltradas.filter(os => {
          const dataOS = parseISO(os.data_criacao);
          return isValid(dataOS) && dataOS >= dataInicio;
        });
      }
      
      if (dateRange.to && isValid(dateRange.to)) {
        const dataFim = endOfDay(dateRange.to);
        ordensFiltradas = ordensFiltradas.filter(os => {
          const dataOS = parseISO(os.data_criacao);
          return isValid(dataOS) && dataOS <= dataFim;
        });
      }
      
      // Filtros locais específicos
      if (searchId) {
        const term = searchId.toString().trim();
        ordensFiltradas = ordensFiltradas.filter(os =>
          os.numero_os?.toString() === term || os.id?.toString() === term
        );
      }
      if (searchCliente) {
        const term = searchCliente.toLowerCase();
        ordensFiltradas = ordensFiltradas.filter(os =>
          os.cliente?.nome?.toLowerCase().includes(term) ||
          os.cliente?.nome_completo?.toLowerCase().includes(term) ||
          os.cliente_info?.nome?.toLowerCase().includes(term) ||
          os.cliente_info?.nome_completo?.toLowerCase().includes(term) ||
          os.cliente_nome_manual?.toLowerCase().includes(term)
        );
      }
      if (searchProduto) {
        const term = searchProduto.toLowerCase();
        ordensFiltradas = ordensFiltradas.filter(os => Array.isArray(os.itens) && os.itens.some(i =>
          i.nome_servico_produto?.toLowerCase().includes(term) || i.nome_produto?.toLowerCase().includes(term)
        ));
      }
      if (searchAcabamento) {
        const term = searchAcabamento.toLowerCase();
        ordensFiltradas = ordensFiltradas.filter(os => Array.isArray(os.itens) && os.itens.some(i =>
          searchInAcabamentos(i.acabamentos, term) || searchInAcabamentos(i.acabamentos_selecionados, term)
        ));
      }
      if (searchObs) {
        const term = searchObs.toLowerCase();
        ordensFiltradas = ordensFiltradas.filter(os =>
          os.observacoes_gerais_os?.toLowerCase().includes(term) ||
          os.observacoes_cliente_para_nota?.toLowerCase().includes(term) ||
          (Array.isArray(os.itens) && os.itens.some(i => {
            let det = '';
            if (typeof i.detalhes === 'string') det = i.detalhes;
            else if (typeof i.detalhes === 'object') det = JSON.stringify(i.detalhes);
            return det.toLowerCase().includes(term);
          }))
        );
      }
      
      // Filtrar por status localmente
      if (statusFilter && statusFilter.length > 0) {
        ordensFiltradas = ordensFiltradas.filter(os =>
          statusFilter.includes(os.status_os)
        );
      }
      

      
      setOrdensServico(ordensFiltradas.sort((a, b) => new Date(b.data_criacao || 0) - new Date(a.data_criacao || 0)));
      
      // Carregar configurações locais
      const storedLogo = await apiDataManager.getItem('logoUrl');
      if (storedLogo) setLogoUrl(storedLogo);
      const empresaSettings = safeJsonParse(await apiDataManager.getItem('empresaSettings'), {});
      setEmpresaSettings(empresaSettings);
      setNomeEmpresa(empresaSettings.nomeFantasia || 'Sua Empresa');
      
      // Carregar contas bancárias e máquinas localmente
      try {
        const [contasData, maquinasData] = await Promise.all([
          apiDataManager.getItem('contasBancarias'),
          apiDataManager.getItem('maquinas')
        ]);
        setContasBancarias(safeJsonParse(contasData, []));
        setMaquinas(safeJsonParse(maquinasData, []));
      } catch (error) {
        console.error('Erro ao carregar contas bancárias ou máquinas:', error);
        setContasBancarias([]);
        setMaquinas([]);
      }
      
      toast({
        title: 'Aviso',
        description: 'Usando dados locais. Conexão com o servidor não disponível.',
        variant: 'warning'
      });
    } finally {
      setIsLoading(false);
    }
  }, [perPage, toast]); // Agora só depende de perPage e toast, os filtros são lidos do ref

  // Inicialização única para gerenciar estado de navegação
  useEffect(() => {
    if (!hasInitialized) {
      if (location.state?.filterStatus) {
        setStatusFilter(location.state.filterStatus);
        // Manter o filtro de data padrão (hoje) quando vem do dashboard
        // setDateRange({ from: undefined, to: undefined }); // REMOVIDO - mantém data atual
        navigate(location.pathname, { replace: true, state: {} }); 
      }
      setHasInitialized(true);
    }
  }, [location.state, navigate, hasInitialized]);

  // Carregar dados inicialmente
  useEffect(() => {
    if (hasInitialized) {
      loadOrdensServico(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized]);

  // Recarregar dados quando filtros mudarem
  useEffect(() => {
    if (!hasInitialized) return;
    
    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // Resetar para primeira página ao filtrar
      loadOrdensServico(1);
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, searchId, searchCliente, searchProduto, searchAcabamento, searchObs, hasInitialized]);

  // Recarregar dados quando filtros de data e status mudarem (sem debounce)
  useEffect(() => {
    if (!hasInitialized) return;
    
    setCurrentPage(1); // Resetar para primeira página ao filtrar
    loadOrdensServico(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateRange, hasInitialized]);

  // Listener para recarregar quando uma OS for salva ou deletada
  useEffect(() => {
    const handleOSSalva = () => {
      console.log('🔄 [OSHistoricoPage] Evento de OS salva recebido, recarregando lista...');
      loadOrdensServico(currentPage);
    };
    
    const handleOSDeletada = () => {
      console.log('🗑️ [OSHistoricoPage] Evento de OS deletada recebido, recarregando lista...');
      loadOrdensServico(currentPage);
    };

    window.addEventListener('osSalva', handleOSSalva);
    window.addEventListener('osFinalizada', handleOSSalva);
    window.addEventListener('osDeletada', handleOSDeletada);
    
    // Cleanup
    return () => {
      window.removeEventListener('osSalva', handleOSSalva);
      window.removeEventListener('osFinalizada', handleOSSalva);
      window.removeEventListener('osDeletada', handleOSDeletada);
    };
  }, [loadOrdensServico, currentPage]);

  // Função auxiliar para busca local em acabamentos
  const searchInAcabamentos = (acabamentos, searchTerm) => {
    if (!acabamentos) return false;
    
    // Se for string JSON, tentar fazer parse
    if (typeof acabamentos === 'string') {
      try {
        const parsed = JSON.parse(acabamentos);
        if (Array.isArray(parsed)) {
          return parsed.some(acab => 
            acab?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            acab?.nome_acabamento?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        return acabamentos.toLowerCase().includes(searchTerm.toLowerCase());
      } catch {
        return acabamentos.toLowerCase().includes(searchTerm.toLowerCase());
      }
    }
    
    // Se for array
    if (Array.isArray(acabamentos)) {
      return acabamentos.some(acab => 
        acab?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acab?.nome_acabamento?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return false;
  };

  // Função auxiliar para busca local abrangente
  const searchInOS = (os, searchTerm) => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    
    // Buscar em campos básicos da OS
    if (os.id_os?.toString().toLowerCase().includes(term) ||
        os.observacoes_gerais_os?.toLowerCase().includes(term) ||
        os.observacoes_cliente_para_nota?.toLowerCase().includes(term)) {
      return true;
    }
    
    // Buscar em dados do cliente
    if (os.cliente?.nome_completo?.toLowerCase().includes(term) ||
        os.cliente?.apelido_fantasia?.toLowerCase().includes(term) ||
        os.cliente_info?.nome_completo?.toLowerCase().includes(term) ||
        os.cliente_info?.nome?.toLowerCase().includes(term) ||
        os.cliente_nome_manual?.toLowerCase().includes(term)) {
      return true;
    }
    
    // Buscar nos itens
    if (Array.isArray(os.itens)) {
      return os.itens.some(item => {
        // Converter detalhes para string se for objeto
        let detalhesText = '';
        if (item.detalhes) {
          if (typeof item.detalhes === 'string') {
            detalhesText = item.detalhes;
          } else if (typeof item.detalhes === 'object') {
            detalhesText = JSON.stringify(item.detalhes);
          }
        }
        
        return item.nome_servico_produto?.toLowerCase().includes(term) ||
               item.nome_produto?.toLowerCase().includes(term) ||
               detalhesText.toLowerCase().includes(term) ||
               searchInAcabamentos(item.acabamentos, term) ||
               searchInAcabamentos(item.acabamentos_selecionados, term);
      });
    }
    
    return false;
  };

  // Sincronizar filteredOS com ordensServico sempre que houver mudanças
  useEffect(() => {
    setFilteredOS(ordensServico);
  }, [ordensServico]); // Executa sempre que ordensServico mudar

  const handleViewOS = (os) => {
    navigate(`/operacional/ordens-servico/${os.id_os}?viewOnly=true`);
  };

  const handleFinalizeOS = (os) => {
    // Usar id se existir, senão usar id_os
    const osId = os.id || os.id_os;
    if (!osId) {
      toast({
        title: "Erro",
        description: "ID da OS não encontrado. Não é possível finalizar.",
        variant: "destructive"
      });
      return;
    }
    navigate('/operacional/ordens-servico', { state: { osId: osId, finalize: true } });
  };


  const handleDeleteOS = (e, os) => {
    e.preventDefault();
    e.stopPropagation();
    setOsToDelete(os);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteOS = async (justificativa) => {
    if (!osToDelete) {
      setIsDeleteModalOpen(false);
      return;
    }
    
    // Salvar referência da OS antes de fechar o modal
    const osToDeleteRef = osToDelete;
    
    // Fechar modal imediatamente
    setIsDeleteModalOpen(false);
    setOsToDelete(null);
    
    // Remover da lista local IMEDIATAMENTE (sem await)
    // Normalizar IDs para comparação robusta
    const osIdOs = osToDeleteRef.id_os ? String(osToDeleteRef.id_os) : null;
    const osId = osToDeleteRef.id ? String(osToDeleteRef.id) : null;
    const osNumeroOs = osToDeleteRef.numero_os ? String(osToDeleteRef.numero_os) : null;
    
    setOrdensServico(prevOS => prevOS.filter(os => {
      // Comparar id_os (normalizado para string)
      if (osIdOs && os.id_os && String(os.id_os) === osIdOs) return false;
      // Comparar id (normalizado para string)
      if (osId && os.id && String(os.id) === osId) return false;
      // Comparar numero_os (normalizado para string)
      if (osNumeroOs && os.numero_os && String(os.numero_os) === osNumeroOs) return false;
      return true;
    }));
    
    setFilteredOS(prevOS => prevOS.filter(os => {
      // Comparar id_os (normalizado para string)
      if (osIdOs && os.id_os && String(os.id_os) === osIdOs) return false;
      // Comparar id (normalizado para string)
      if (osId && os.id && String(os.id) === osId) return false;
      // Comparar numero_os (normalizado para string)
      if (osNumeroOs && os.numero_os && String(os.numero_os) === osNumeroOs) return false;
      return true;
    }));
    
    // Atualizar contadores
    setTotalItems(prev => Math.max(0, prev - 1));
    
    // Mostrar sucesso IMEDIATAMENTE
    toast({ 
      title: 'OS excluída com sucesso', 
      description: `OS ${osToDeleteRef.numero_os || osToDeleteRef.id || osToDeleteRef.id_os || 'N/A'} removida da lista.` 
    });
    
    // Processar exclusão em background (sem bloquear a UI)
    try {
      await moverParaLixeiraOS(osToDeleteRef, justificativa, vendedorAtual, () => {});
      console.log('[OS] Excluída com sucesso:', osToDeleteRef.id_os);
      
      // CRÍTICO: Recarregar a lista da API para garantir sincronização
      // Isso garante que mesmo se houver cache ou outras fontes, a lista será atualizada
      await loadOrdensServico(currentPage);
    } catch (error) {
      console.error('[OS] Erro na exclusão:', error);
      // Mesmo com erro, recarregar a lista para garantir sincronização
      await loadOrdensServico(currentPage);
    }
  };

  const handleOpenNotinhaModal = (os) => {
    setSelectedOsForNotinha(os);
    setIsNotinhaModalOpen(true);
  };

  const getStatusBadge = (status, dataValidade) => {
    const isOrcamento = status === 'Orçamento Salvo' || status === 'Orçamento Salvo (Editado)';
    let isExpirado = false;
    if (isOrcamento && dataValidade) {
        try {
            const validadeDate = parseISO(dataValidade);
            if (isValid(validadeDate)) {
                isExpirado = isBefore(validadeDate, startOfDay(new Date()));
            }
        } catch (e) {
            console.error("Erro ao parsear data de validade:", dataValidade, e);
        }
    }


    if (isExpirado) {
        return <Badge variant="destructive" className="bg-red-700 hover:bg-red-800"><CalendarClock className="mr-1 h-3 w-3" /> Expirado</Badge>;
    }

    switch (status) {
      case 'Finalizada':
        return <Badge variant="success" className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Finalizada</Badge>;
      case 'Orçamento Salvo':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><History className="mr-1 h-3 w-3" /> Orçamento</Badge>;
       case 'Orçamento Salvo (Editado)':
        return <Badge variant="outline" className="border-orange-500 text-orange-600"><AlertTriangle className="mr-1 h-3 w-3" /> Editado</Badge>;
      case 'Entregue':
        return <Badge variant="info" className="bg-blue-500 hover:bg-blue-600"><PackageCheck className="mr-1 h-3 w-3" /> Entregue</Badge>;
      case 'Aguardando Produção':
      case 'Em Produção':
      case 'Aguardando Aprovação Cliente':
        return <Badge variant="warning" className="bg-yellow-500 hover:bg-yellow-600">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusProducaoBadge = (statusProducao, statusOS) => {
    const isOrcamento = statusOS === 'Orçamento Salvo' || statusOS === 'Orçamento Salvo (Editado)';

    if (isOrcamento) {
      return <Badge variant="outline" className="border-gray-400 text-gray-500">Não aplicável</Badge>;
    }

    if (!statusProducao) {
      return <Badge variant="outline" className="border-gray-400 text-gray-500">Não definido</Badge>;
    }

    switch (statusProducao) {
      case 'Em Produção':
        return <Badge variant="warning" className="bg-yellow-500 hover:bg-yellow-600">Em Produção</Badge>;
      case 'Pronto para Entrega':
        return <Badge variant="info" className="bg-blue-500 hover:bg-blue-600">Pronto para Entrega</Badge>;
      case 'Aguardando Entrega':
        return <Badge variant="info" className="bg-blue-500 hover:bg-blue-600">Aguardando Entrega</Badge>;
      case 'Entregue':
        return <Badge variant="success" className="bg-green-500 hover:bg-green-600">Entregue</Badge>;
      case 'Aguardando Produção':
        return <Badge variant="outline" className="border-orange-500 text-orange-600">Aguardando Produção</Badge>;
      default:
        return <Badge variant="secondary">{statusProducao}</Badge>;
    }
  };

  const getPagamentoCell = (os) => {
    const status = os.status_os;
    if (status !== 'Finalizada' && status !== 'Entregue') {
      return <span className="text-gray-400 text-sm">—</span>;
    }
    const valorTotal = parseFloat(os.valor_total_os) || 0;
    const pagamentos = os.pagamentos || [];
    const totalPago = Array.isArray(pagamentos)
      ? pagamentos.reduce((acc, p) => acc + (parseFloat(p.valorFinal ?? p.valor) || 0), 0)
      : 0;
    const faltando = Math.max(0, valorTotal - totalPago);
    if (faltando <= 0.01) {
      return <Badge variant="success" className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Pago</Badge>;
    }
    return (
      <Badge variant="destructive" className="bg-amber-600 hover:bg-amber-700">
        <AlertTriangle className="mr-1 h-3 w-3" />
        Falta concluir (R$ {faltando.toFixed(2)})
      </Badge>
    );
  };

  const handleEditOS = (os) => {
    // Usar id_os se existir, senão usar id
    const osId = os.id_os || os.id;
    
    if (!osId) {
      toast({
        title: "Erro",
        description: "ID da OS não encontrado. Não é possível editar.",
        variant: "destructive"
      });
      return;
    }
    
    navigate(`/operacional/ordens-servico/${osId}?edit=true`);
  };

  const handleReabrirConsumoMaterial = (os) => {
    if (!os.dados_consumo_material) {
      toast({
        title: "Erro",
        description: "Esta OS não possui dados de consumo de material.",
        variant: "destructive"
      });
      return;
    }
    
    // Navegar para a página de OS com os dados de consumo de material
    navigate('/operacional/ordens-servico', {
      state: {
        reabrirConsumoMaterial: true,
        dadosConsumoMaterial: os.dados_consumo_material,
        ordemServico: os
      }
    });
  };

  const handleViewConsumoMaterialDetails = (os) => {
    if (!os.dados_consumo_material) {
      toast({
        title: "Erro",
        description: "Esta OS não possui dados de consumo de material.",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedOsForConsumoDetails(os);
    setIsConsumoMaterialDetailsModalOpen(true);
  };

  // Funções para controle de paginação
  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadOrdensServico(page);
  };
  
  const handlePerPageChange = (newPerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
    loadOrdensServico(1);
  };

  // Função para renderizar os números das páginas
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Se temos poucas páginas, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Lógica para mostrar páginas relevantes
      if (currentPage <= 3) {
        // Mostrar as primeiras páginas
        for (let i = 1; i <= maxVisiblePages; i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        // Mostrar as últimas páginas
        for (let i = totalPages - maxVisiblePages + 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Mostrar páginas ao redor da atual
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }
    
    return pages;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 space-y-6 flex-1 flex flex-col overflow-hidden min-h-0"
    >
      <div className="flex flex-col">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Histórico de Ordens de Serviço</h1>
        <div className="w-full mt-4 space-y-3">
          {/* Linha de campos de busca separados com o mesmo visual */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {/* Busca geral */}
            <div className="relative w-full">
            <Input
              type="search"
                placeholder="🔍 Buscar geral "
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-gray-700 pr-8 ring-2 ring-blue-200 focus:ring-blue-400"
              />
              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            {/* ID e Cliente */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative w-full">
                <Input
                  placeholder="🎯buscar por ID"
                  value={searchId}
                  onChange={(e) => {
                    setSearchId(e.target.value);
                    console.log('✏️ [DEBUG] Campo ID alterado para:', e.target.value);
                  }}
                  className="w-full bg-white dark:bg-gray-700 pr-8 ring-2 ring-green-200 focus:ring-green-400"
                />
                <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <div className="relative w-full">
                <Input
                  placeholder="Cliente"
                  value={searchCliente}
                  onChange={(e) => setSearchCliente(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 pr-8 ring-2 ring-blue-200 focus:ring-blue-400"
                />
                <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            {/* Produto/Serviço e Acabamento/Obs */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative w-full">
                <Input
                  placeholder="Produto/Serviço"
                  value={searchProduto}
                  onChange={(e) => setSearchProduto(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 pr-8 ring-2 ring-blue-200 focus:ring-blue-400"
                />
                <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <div className="relative w-full">
                <Input
                  placeholder="Acabamento/Obs"
                  value={searchAcabamento}
                  onChange={(e) => setSearchAcabamento(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 pr-8 ring-2 ring-blue-200 focus:ring-blue-400"
            />
            <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Linha de filtros de data e ações */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Popover>
              <div className="relative w-full md:w-[260px]">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <PopoverTrigger asChild>
                  <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                      "w-full justify-start text-left font-normal bg-white dark:bg-gray-700 ring-2 ring-blue-200 focus:ring-blue-400 h-10 pl-9 pr-3 border-0",
                          !dateRange.from && "text-muted-foreground"
                      )}
                  >
                      {dateRange.from && isValid(dateRange.from) ? (
                          dateRange.to && isValid(dateRange.to) ? (
                              <>{format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}</>
                          ) : (
                              format(dateRange.from, "dd/MM/yy")
                          )
                      ) : (
                          <span>Selecione o período</span>
                      )}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={(range) => {
                          if (range?.from && !isValid(range.from)) range.from = undefined;
                          if (range?.to && !isValid(range.to)) range.to = undefined;
                          setDateRange(range || { from: undefined, to: undefined });
                      }}
                      numberOfMonths={2}
                  />
              </PopoverContent>
              </div>
            </Popover>
            <Button 
              variant="outline" 
              onClick={() => setDateRange({ from: startOfToday(), to: endOfToday() })}
              title="Buscar por hoje"
              className="px-3 w-full sm:w-auto"
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              onClick={handleClearAllFilters}
              title="Limpar filtro de data"
              className="px-3 w-full sm:w-auto"
            >
              Limpar
            </Button>
            <Button onClick={() => navigate('/operacional/ordens-servico')} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white w-full sm:w-auto">
              <FilePlus className="mr-2 h-5 w-5" /> Nova OS
            </Button>
          </div>
        </div>
      </div>

      {/* Feedback de resultados da busca */}
      {(searchTerm || searchId || searchCliente || searchProduto || searchAcabamento || searchObs) && (
        <div className="text-sm text-gray-600 dark:text-gray-400 px-1">
          {filteredOS.length === 0 ? (
            <span className="text-orange-600 dark:text-orange-400">
              ⚠️ Nenhuma OS encontrada
            </span>
          ) : filteredOS.length === 1 ? (
            <span className="text-green-600 dark:text-green-400">
              ✓ 1 OS encontrada
            </span>
          ) : (
            <span className="text-blue-600 dark:text-blue-400">
              ✓ {filteredOS.length} OSs encontradas
            </span>
          )}
        </div>
      )}

      {/* Visualização em Cards para Mobile */}
      <div className="md:hidden flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-1">
            {isLoading ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span>Carregando ordens de serviço...</span>
                </div>
              </div>
            ) : filteredOS.length > 0 ? (
              filteredOS.map((os) => (
                <motion.div
                  key={os.id_os}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="space-y-3">
                    {/* ID e Status */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ID</p>
                        <p className="font-semibold text-lg">{os.numero_os || os.id || 'N/A'}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {getStatusBadge(os.status_os, os.data_validade)}
                        {getStatusProducaoBadge(os.dados_producao?.status_producao, os.status_os)}
                        {(os.status_os === 'Finalizada' || os.status_os === 'Entregue') && (
                          <div className="mt-1">{getPagamentoCell(os)}</div>
                        )}
                      </div>
                    </div>

                    {/* Cliente */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Cliente</p>
                      <p className="font-medium">{os.cliente?.nome || os.cliente?.nome_completo || os.cliente_info?.nome || os.cliente_nome_manual || 'N/A'}</p>
                    </div>

                    {/* Datas */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Data Criação</p>
                        <p className="text-sm">{isValid(parseISO(os.data_criacao)) ? format(parseISO(os.data_criacao), 'dd/MM/yyyy') : 'Data inválida'}</p>
                      </div> */}
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Data/Hora</p>
                        <p className="text-sm">{os.data_criacao ? 
                            (() => {
                              try {
                                return isValid(parseISO(os.data_criacao)) ? format(parseISO(os.data_criacao), 'dd/MM/yyyy HH:mm') : 'Data inválida';
                              } catch (e) {
                                return 'Data inválida';
                              }
                            })() 
                            : 'Data não informada'
                          }</p>
                      </div>
                    </div>

                    {/* Total */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        R$ {(parseFloat(os.valor_total_os) || 0).toFixed(2)}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          // Verificar se tem dados de consumo de material
                          const temTipoOrigem = os.tipo_origem === 'consumo_material';
                          const temDadosConsumo = os.dados_consumo_material && (
                            typeof os.dados_consumo_material === 'object' ? 
                              Object.keys(os.dados_consumo_material).length > 0 : 
                              !!os.dados_consumo_material
                          );
                          return temTipoOrigem || temDadosConsumo;
                        })() && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewConsumoMaterialDetails(os)} 
                              className="flex-1 text-blue-500 hover:text-blue-600 border-blue-300 hover:border-blue-400"
                            >
                              <Info className="mr-1 h-4 w-4" />
                              Detalhes
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleReabrirConsumoMaterial(os)} 
                              className="flex-1 text-purple-500 hover:text-purple-600 border-purple-300 hover:border-purple-400"
                            >
                              <Calculator className="mr-1 h-4 w-4" />
                              Reabrir
                            </Button>
                          </>
                        )}
                        {canEdit && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditOS(os)} 
                            className="flex-1"
                          >
                            <FileEdit className="mr-1 h-4 w-4" />
                            Editar
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewOS(os)} 
                          className="flex-1"
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Ver
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenNotinhaModal(os)} 
                          className="flex-1 text-blue-500 hover:text-blue-600 border-blue-300 hover:border-blue-400"
                        >
                          <Printer className="mr-1 h-4 w-4" />
                          Imprimir
                        </Button>
                        {canChangeStatus && os.status_os !== 'Finalizada' && os.status_os !== 'Entregue' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleFinalizeOS(os)} 
                            className="flex-1 text-green-500 hover:text-green-600 border-green-300 hover:border-green-400"
                          >
                            <CircleDollarSign className="mr-1 h-4 w-4" />
                            Finalizar
                          </Button>
                        )}
                        {canDelete && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => handleDeleteOS(e, os)} 
                            className="flex-1 text-red-500 hover:text-red-600 border-red-300 hover:border-red-400"
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Excluir
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Nenhuma Ordem de Serviço encontrada.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Visualização em Tabela para Desktop */}
      <div className="hidden md:block flex-1 min-h-0">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10">
              <TableRow>
                <TableHead>ID</TableHead>
                {/* <TableHead>Data Criação</TableHead> */}
                <TableHead>Cliente</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Status Produção</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                           {isLoading ? (
                 <TableRow>
                   <TableCell colSpan={8} className="text-center py-10 text-gray-500 dark:text-gray-400">
                     <div className="flex items-center justify-center space-x-2">
                       <Loader2 className="h-5 w-5 animate-spin" />
                       <span>Carregando ordens de serviço...</span>
                     </div>
                   </TableCell>
                 </TableRow>
              ) : filteredOS.length > 0 ? (
                filteredOS.map((os) => (
                  <TableRow key={os.id_os} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <TableCell className="font-medium">{os.numero_os || os.id || 'N/A'}</TableCell>
                    {/* <TableCell>{isValid(parseISO(os.data_criacao)) ? format(parseISO(os.data_criacao), 'dd/MM/yyyy') : 'Data inválida'}</TableCell> */}
                    <TableCell>{os.cliente?.nome || os.cliente?.nome_completo || os.cliente_info?.nome || os.cliente_nome_manual || 'N/A'}</TableCell>
                    <TableCell>{os.data_criacao ? 
                        (() => {
                          try {
                            return isValid(parseISO(os.data_criacao)) ? format(parseISO(os.data_criacao), 'dd/MM/yyyy HH:mm') : 'Data inválida';
                          } catch (e) {
                            return 'Data inválida';
                          }
                        })() 
                        : 'Data não informada'
                      }</TableCell>
                    <TableCell>R$ {(parseFloat(os.valor_total_os) || 0).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(os.status_os, os.data_validade)}</TableCell>
                    <TableCell>{getStatusProducaoBadge(os.dados_producao?.status_producao, os.status_os)}</TableCell>
                    <TableCell>{getPagamentoCell(os)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        {(() => {
                          // Verificar se tem dados de consumo de material
                          const temTipoOrigem = os.tipo_origem === 'consumo_material';
                          const temDadosConsumo = os.dados_consumo_material && (
                            typeof os.dados_consumo_material === 'object' ? 
                              Object.keys(os.dados_consumo_material).length > 0 : 
                              !!os.dados_consumo_material
                          );
                          return temTipoOrigem || temDadosConsumo;
                        })() && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleViewConsumoMaterialDetails(os)} title="Ver Detalhes do Consumo de Material" className="text-blue-500 hover:text-blue-600">
                              <Info className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleReabrirConsumoMaterial(os)} title="Reabrir Consumo de Material" className="text-purple-500 hover:text-purple-600">
                              <Calculator className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => handleEditOS(os)} title="Editar OS">
                            <FileEdit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleViewOS(os)} title="Visualizar OS">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenNotinhaModal(os)} title="Imprimir Notinha" className="text-blue-500 hover:text-blue-600">
                          <Printer className="h-4 w-4" />
                        </Button>
                        {canChangeStatus && os.status_os !== 'Finalizada' && os.status_os !== 'Entregue' && (
                          <Button variant="ghost" size="icon" onClick={() => handleFinalizeOS(os)} title="Finalizar OS" className="text-green-500 hover:text-green-600">
                             <CircleDollarSign className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={(e) => handleDeleteOS(e, os)} title="Excluir" className="text-red-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-500 dark:text-gray-400">
                    Nenhuma Ordem de Serviço encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      
      {/* Componente de Paginação */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Mostrando {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, totalItems)} de {totalItems} ordens de serviço
            </span>
            <select 
              value={perPage} 
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="ml-2 px-2 py-1 border rounded bg-background"
            >
              <option value={10}>10 por página</option>
              <option value={15}>15 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            <div className="flex items-center gap-1">
              {renderPageNumbers().map((pageNumber) => (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNumber)}
                  className="w-8 h-8 p-0"
                >
                  {pageNumber}
                </Button>
              ))}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="px-2">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    className="w-8 h-8 p-0"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <DeleteWithJustificationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteOS}
        title="Excluir Ordem de Serviço"
        description="Tem certeza que deseja mover esta OS para a lixeira? Esta ação requer uma justificativa e sua senha."
        requirePassword={true} 
        vendedorAtual={vendedorAtual}
      />
      {selectedOsForNotinha && (
        <OSDocumentModal
          isOpen={isNotinhaModalOpen}
          setIsOpen={setIsNotinhaModalOpen}
          documento={selectedOsForNotinha}
          logoUrl={logoUrl}
          nomeEmpresa={nomeEmpresa}
          documentRef={notinhaRef}
          onGerarPdf={() => {
            toast({ title: "Funcionalidade Indisponível", description: "A geração de PDF para notinha será implementada em breve.", variant: "info" });
          }}
          empresaSettings={empresaSettings}
          contasBancarias={contasBancarias}
          maquinas={maquinas}
        />
      )}

      {/* Modal de Detalhes do Consumo de Material */}
      <Dialog open={isConsumoMaterialDetailsModalOpen} onOpenChange={setIsConsumoMaterialDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Detalhes do Consumo de Material
            </DialogTitle>
            <DialogDescription>
              Informações detalhadas do consumo de material desta Ordem de Serviço
            </DialogDescription>
          </DialogHeader>
          
          {selectedOsForConsumoDetails && (() => {
            const os = selectedOsForConsumoDetails;
            const dadosConsumo = os.dados_consumo_material || {};
            const item = os.itens && os.itens.length > 0 ? os.itens[0] : null;
            
            // Funções auxiliares para formatação
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

            const materialNome = item?.consumo_material_utilizado || dadosConsumo?.material_utilizado || 'Não informado';
            const larguraPeca = safeParse(item?.consumo_largura_peca || dadosConsumo?.largura_peca, 0);
            const alturaPeca = safeParse(item?.consumo_altura_peca || dadosConsumo?.altura_peca, 0);
            const larguraChapa = safeParse(item?.consumo_largura_chapa || dadosConsumo?.largura_chapa, 0);
            const alturaChapa = safeParse(item?.consumo_altura_chapa || dadosConsumo?.altura_chapa, 0);
            const quantidadeSolicitada = formatInt(item?.consumo_quantidade_solicitada || dadosConsumo?.quantidade_solicitada);
            const valorChapa = safeParse(item?.consumo_valor_unitario_chapa || dadosConsumo?.valor_unitario_chapa, 0);
            const pecasPorChapa = formatInt(item?.consumo_pecas_por_chapa || 0);
            const chapasNecessarias = formatInt(item?.consumo_chapas_necessarias || 0);
            const custoTotal = safeParse(item?.consumo_custo_total || 0, 0);
            const custoUnitario = safeParse(item?.consumo_custo_unitario || 0, 0);
            const aproveitamento = safeParse(item?.consumo_aproveitamento_percentual || 0, 0);
            const areaPecaM2 = (larguraPeca / 100) * (alturaPeca / 100);
            const metrosQuadradosUtilizados = areaPecaM2 * quantidadeSolicitada;
            const areaChapaM2 = (larguraChapa / 100) * (alturaChapa / 100);
            const metrosQuadradosDisponiveis = areaChapaM2 * chapasNecessarias;
            const metrosQuadradosSobrando = Math.max(metrosQuadradosDisponiveis - metrosQuadradosUtilizados, 0);
            const acabamentos = item?.acabamentos_selecionados || dadosConsumo?.acabamentos_selecionados || [];
            const subtotalAcabamentos = safeParse(item?.subtotal_acabamentos || dadosConsumo?.subtotal_acabamentos, 0);

            return (
              <div className="space-y-6 mt-4">
                {/* Material Utilizado */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Material Utilizado</h3>
                  <p className="text-lg text-blue-800 dark:text-blue-300">{materialNome}</p>
                </div>

                {/* Dimensões da Peça */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Dimensões da Peça</h4>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {larguraPeca > 0 && alturaPeca > 0 ? (
                        <>
                          {formatDecimal(larguraPeca)} cm × {formatDecimal(alturaPeca)} cm
                          <span className="block text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Área: {formatDecimal(areaPecaM2, 4)} m²
                          </span>
                        </>
                      ) : (
                        'Não informado'
                      )}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Dimensões da Chapa</h4>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {larguraChapa > 0 && alturaChapa > 0 ? (
                        <>
                          {formatDecimal(larguraChapa)} cm × {formatDecimal(alturaChapa)} cm
                          <span className="block text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Área: {formatDecimal(areaChapaM2, 4)} m²
                          </span>
                        </>
                      ) : (
                        'Não informado'
                      )}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quantidade Solicitada</h4>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {quantidadeSolicitada} peça(s)
                    </p>
                  </div>
                </div>

                {/* Cálculos */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-200 mb-1">Peças por chapa</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-50">{pecasPorChapa}</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-200 mb-1">Chapas necessárias</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-50">{chapasNecessarias}</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-700 dark:text-green-200 mb-1">Custo total do material</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-50">
                      R$ {formatCurrency(custoTotal)}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-700 dark:text-green-200 mb-1">Custo unitário por peça</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-50">
                      R$ {formatCurrency(custoUnitario)}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-200 mt-1">
                      Aproveitamento: {formatDecimal(aproveitamento, 2)}%
                    </p>
                  </div>
                </div>

                {/* Metros Quadrados */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-100/70 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-700">
                    <p className="text-xs text-blue-700 dark:text-blue-200 mb-1">m² necessários</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-50">
                      {formatDecimal(metrosQuadradosUtilizados, 3)}
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-100/70 dark:bg-emerald-900/30 rounded-lg border border-emerald-300 dark:border-emerald-700">
                    <p className="text-xs text-emerald-700 dark:text-emerald-200 mb-1">m² disponíveis</p>
                    <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-50">
                      {formatDecimal(metrosQuadradosDisponiveis, 3)}
                    </p>
                  </div>
                  <div className="p-4 bg-amber-100/70 dark:bg-amber-900/30 rounded-lg border border-amber-300 dark:border-amber-700">
                    <p className="text-xs text-amber-700 dark:text-amber-200 mb-1">m² que sobram</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-50">
                      {formatDecimal(metrosQuadradosSobrando, 3)}
                    </p>
                  </div>
                </div>

                {/* Valor da Chapa */}
                {valorChapa > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Valor Unitário da Chapa</h4>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      R$ {formatCurrency(valorChapa)}
                    </p>
                  </div>
                )}

                {/* Acabamentos */}
                {acabamentos.length > 0 && (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-3">Acabamentos Selecionados</h3>
                    <div className="space-y-2">
                      {acabamentos.map((acab, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {acab.nome || 'Acabamento sem nome'}
                          </span>
                          {acab.valor_m2 || acab.valor_un ? (
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              R$ {formatCurrency(acab.valor_m2 || acab.valor_un)}
                              {acab.valor_m2 ? '/m²' : '/un'}
                            </span>
                          ) : null}
                        </div>
                      ))}
                      {subtotalAcabamentos > 0 && (
                        <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700 flex items-center justify-between">
                          <span className="font-semibold text-purple-900 dark:text-purple-200">Subtotal dos Acabamentos</span>
                          <span className="text-lg font-bold text-purple-900 dark:text-purple-50">
                            R$ {formatCurrency(subtotalAcabamentos)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default OSHistoricoPage;