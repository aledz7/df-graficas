import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Search, FileText, Printer, ShoppingCart, Trash2, CircleDollarSign, FileQuestion, CheckCircle2, AlertTriangle, CalendarDays, CalendarClock, Edit, RotateCcw, DollarSign, Banknote, Loader2, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { safeJsonParse, cn, formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import PDVReciboModal from '@/components/pdv/PDVReciboModal';

import { generatePdfFromElement, printElement } from '@/lib/osDocumentGenerator';
import DeleteWithJustificationModal from '@/components/utils/DeleteWithJustificationModal.jsx';
import { moverParaLixeiraPDV } from '@/hooks/pdv/pdvDataService';
import { apiDataManager } from '@/lib/apiDataManager';

import { vendaService } from '@/services/api';
import { produtoService } from '@/services/api';
import api from '@/services/api';
import CompartilharModal from '@/components/shared/CompartilharModal';

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, startOfDay, isBefore, isValid, startOfToday } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreditCard, Smartphone } from 'lucide-react';

const PDVHistoricoPage = ({ logoUrl, nomeEmpresa, vendedorAtual }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const PER_PAGE = 20;
  const [documentos, setDocumentos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [documentoSelecionado, setDocumentoSelecionado] = useState(null);
  const [isReciboModalOpen, setIsReciboModalOpen] = useState(false);
  const reciboRef = useRef(null);
  const [documentoToDelete, setDocumentoToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [empresaSettings, setEmpresaSettings] = useState({});
  const [produtos, setProdutos] = useState([]);
  const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState(false);
  const [vendaParaPagamento, setVendaParaPagamento] = useState(null);
  const [isCompartilharModalOpen, setIsCompartilharModalOpen] = useState(false);
  const [vendaIdParaCompartilhar, setVendaIdParaCompartilhar] = useState(null);

  // Refs para acessar valores atuais dentro de callbacks sem criar dependências
  const searchTimerRef = useRef(null);
  const fetchCounterRef = useRef(0);
  const currentPageRef = useRef(1);
  const isInitialMount = useRef(true);
  const searchTermRef = useRef('');
  const dateRangeRef = useRef({ from: undefined, to: undefined });

  // Manter refs sincronizados com o estado
  currentPageRef.current = currentPage;
  searchTermRef.current = searchTerm;
  dateRangeRef.current = dateRange;

  const fetchDocumentos = useCallback(async (page = 1) => {
    const fetchId = ++fetchCounterRef.current;
    setIsLoading(true);

    try {
      const params = {
        page,
        per_page: PER_PAGE,
        sort_by: 'data_emissao',
        sort_order: 'desc',
      };

      // Ler valores atuais dos filtros via refs (evita dependências no useCallback)
      const search = searchTermRef.current;
      const dr = dateRangeRef.current;

      if (search) params.search = search;
      if (dr.from && isValid(dr.from)) params.data_inicio = format(dr.from, 'yyyy-MM-dd');
      if (dr.to && isValid(dr.to)) params.data_fim = format(dr.to, 'yyyy-MM-dd');

      const response = await api.get('/api/vendas', { params });

      // Ignorar respostas obsoletas (se outra requisição já foi disparada)
      if (fetchCounterRef.current !== fetchId) return;

      const paginatedData = response?.data?.data;

      if (paginatedData) {
        const vendasArray = Array.isArray(paginatedData.data) ? paginatedData.data : [];

        setPagination({
          current_page: paginatedData.current_page || page,
          last_page: paginatedData.last_page || 1,
          total: paginatedData.total || 0,
          per_page: paginatedData.per_page || PER_PAGE,
          from: paginatedData.from || 0,
          to: paginatedData.to || 0,
        });

        // Mapear documentos para o formato de exibição
        const todosDocumentos = vendasArray.map(venda => {
          if (venda.tipo_documento === 'orcamento') {
            return {
              ...venda,
              tipo: 'Orçamento PDV',
              data_emissao: venda.data_emissao || venda.data_venda,
              valor_total: venda.valor_total,
              cliente: venda.cliente || {
                id: venda.cliente_id,
                nome: venda.cliente_nome,
                cpf_cnpj: venda.cliente_cpf_cnpj,
                telefone: venda.cliente_telefone,
                email: venda.cliente_email
              },
              vendedor_nome: venda.vendedor_nome,
              status: 'Pendente'
            };
          }
          const isPreVenda = venda.status === 'pre_venda' || venda.metadados?.origem === 'catalogo_publico';
          return {
            ...venda,
            tipo: isPreVenda ? 'Pré-venda Catálogo' : 'Venda PDV',
            data_emissao: venda.data_emissao || venda.data_venda,
            valor_total: venda.valor_total,
            cliente: venda.cliente || {
              id: venda.cliente_id,
              nome: venda.cliente_nome,
              cpf_cnpj: venda.cliente_cpf_cnpj,
              telefone: venda.cliente_telefone,
              email: venda.cliente_email
            },
            status: venda.status === 'concluida' ? 'concluída' : (venda.status || 'pendente')
          };
        });

        setDocumentos(todosDocumentos);
        setCurrentPage(page);
      }
    } catch (error) {
      if (fetchCounterRef.current === fetchId) {
        console.error('Erro ao carregar documentos:', error);
      }
    } finally {
      if (fetchCounterRef.current === fetchId) {
        setIsLoading(false);
      }
    }
  }, []);

  const loadProdutos = useCallback(async () => {
    try {
      const produtosData = await produtoService.getAll();
      setProdutos(Array.isArray(produtosData) ? produtosData : []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setProdutos([]);
    }
  }, []);

  // Carga inicial: buscar documentos paginados, produtos e configurações
  useEffect(() => {
    fetchDocumentos(1);
    loadProdutos();
    const loadSettings = async () => {
      const settings = safeJsonParse(await apiDataManager.getItem('empresaSettings') || '{}', {});
      setEmpresaSettings(settings);
    };
    loadSettings();
  }, [fetchDocumentos, loadProdutos]);

  // Busca debounced: ao digitar, espera 500ms antes de buscar no servidor
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchDocumentos(1);
    }, 500);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchTerm, fetchDocumentos]);

  // Filtro de data: busca imediata no servidor ao mudar o range
  const dateRangeChangedRef = useRef(false);
  useEffect(() => {
    // Pular a primeira renderização (já coberta pelo load inicial)
    if (!dateRangeChangedRef.current) {
      dateRangeChangedRef.current = true;
      return;
    }
    fetchDocumentos(1);
  }, [dateRange, fetchDocumentos]);

  // Abrir venda específica quando vier do Feed de Vendas (state.openVendaId)
  useEffect(() => {
    const openVendaId = location.state?.openVendaId;
    if (openVendaId == null) return;
    // Tentar encontrar na página atual
    const doc = documentos.find(d => String(d.id) === String(openVendaId));
    if (doc) {
      handleViewRecibo(doc);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (documentos.length > 0) {
      // Não está na página atual - buscar diretamente por ID
      handleViewRecibo({ id: openVendaId });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [documentos, location.state?.openVendaId]);

  // Recarregar documentos quando o usuário volta para a aba (visibilitychange)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchDocumentos(currentPageRef.current);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchDocumentos]);

  // Handler de mudança de página
  const handlePageChange = useCallback((page) => {
    fetchDocumentos(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchDocumentos]);

  const handleDeleteDocumento = (doc) => {
    if (doc && typeof doc === 'object') {
      setDocumentoToDelete(doc);
      setIsDeleteModalOpen(true);
    }
  };

  // Função para obter a forma de pagamento do documento (busca em vários locais)
  const getFormaPagamento = (doc) => {
    if (!doc) return null;
    
    // Buscar forma de pagamento em diferentes locais possíveis
    return doc.forma_pagamento || 
           doc.cliente?.forma_pagamento || 
           doc.dados_pagamento?.[0]?.forma_pagamento ||
           doc.dados_pagamento?.[0]?.metodo ||
           null;
  };

  // Função para formatar a forma de pagamento
  const getFormaPagamentoLabel = (formaPagamento) => {
    if (!formaPagamento) return null;
    
    switch (formaPagamento) {
      case 'cartao_entrega':
        return 'Cartão na Entrega';
      case 'pix':
        return 'PIX';
      case 'dinheiro':
        return 'Dinheiro';
      case 'Cartão de Crédito':
      case 'Cartão de Débito':
      case 'Crédito':
      case 'Débito':
        return formaPagamento;
      default:
        return formaPagamento;
    }
  };

  const getFormaPagamentoIcon = (formaPagamento) => {
    if (!formaPagamento) return null;
    
    switch (formaPagamento) {
      case 'cartao_entrega':
      case 'Cartão de Crédito':
      case 'Cartão de Débito':
      case 'Crédito':
      case 'Débito':
        return <CreditCard className="h-3 w-3 inline mr-1" />;
      case 'pix':
      case 'PIX':
        return <Smartphone className="h-3 w-3 inline mr-1" />;
      case 'dinheiro':
      case 'Dinheiro':
        return <Banknote className="h-3 w-3 inline mr-1" />;
      default:
        return <CreditCard className="h-3 w-3 inline mr-1" />;
    }
  };

  const confirmDeleteDocumento = async (justificativa) => {
    if (documentoToDelete) {
      // Garantir que documentos seja sempre um array
      const documentosArray = Array.isArray(documentos) ? documentos : [];
      const docCompleto = documentosArray.find(d => d.id === documentoToDelete.id && d.tipo === documentoToDelete.tipo);
      if(docCompleto){
        try {
          // Mover para lixeira e atualizar no backend
          await moverParaLixeiraPDV(docCompleto, justificativa, vendedorAtual, null);
          
          // Remover o documento da lista local imediatamente para a UI atualizar sem depender do reload
          const idRemover = documentoToDelete.id;
          const tipoRemover = documentoToDelete.tipo;
          setDocumentos(prev => (Array.isArray(prev) ? prev : []).filter(doc => !(doc.id === idRemover && doc.tipo === tipoRemover)));
          
          // Forçar atualização dos produtos no cache para refletir o estoque atualizado
          try {
            const produtosResponse = await produtoService.getAll('?per_page=1000');
            const produtosData = produtosResponse.data?.data?.data || produtosResponse.data?.data || produtosResponse.data || [];
            const produtosArray = Array.isArray(produtosData) ? produtosData : [];
            await apiDataManager.setItem('produtos', JSON.stringify(produtosArray));
            console.log('✅ Cache de produtos atualizado após exclusão da venda');
          } catch (error) {
            console.error('❌ Erro ao atualizar cache de produtos:', error);
          }
          
          // Sincronizar lista com a API em background (não bloqueia a UI já atualizada)
          fetchDocumentos(currentPageRef.current).catch(err => console.error('Erro ao recarregar lista após exclusão:', err));
          toast({ title: 'Documento Movido para Lixeira', description: `O documento ${documentoToDelete.id ? String(documentoToDelete.id).slice(-6) : 'N/A'} foi movido e o estoque foi atualizado.` });
        } catch (error) {
          console.error('Erro ao mover documento para lixeira:', error);
          toast({ title: 'Erro', description: `Ocorreu um erro ao mover o documento para a lixeira: ${error.message}`, variant: 'destructive' });
        }
      } else {
        toast({ title: 'Erro', description: `Não foi possível encontrar os dados completos do documento para mover para a lixeira.`, variant: 'destructive' });
      }
    }
    setIsDeleteModalOpen(false);
    setDocumentoToDelete(null);
  };

  // Função para mapear dados da API para o formato esperado pelo modal
  const mapearDocumentoParaModal = (doc) => {
    if (!doc) return null;

    // Mapear itens corretamente
    const itens = Array.isArray(doc.itens) ? doc.itens.map(item => ({
      id_produto: item.produto_id || item.id_produto,
      nome: item.produto_nome || item.nome || 'Produto não especificado',
      preco_venda_unitario: parseFloat(item.valor_unitario || item.preco_venda_unitario || 0),
      preco_unitario: parseFloat(item.valor_unitario || item.preco_unitario || 0),
      quantidade: parseInt(item.quantidade || 1),
      variacao: item.dados_adicionais?.variacao || item.variacao || null,
      imagem_principal: item.dados_adicionais?.imagem_principal || item.imagem_principal || null
    })) : [];

    // Mapear pagamentos corretamente
    const pagamentos = Array.isArray(doc.dados_pagamento) ? doc.dados_pagamento.map(pag => ({
      metodo: pag.forma_pagamento || pag.metodo || 'Outro',
      valor: parseFloat(pag.valor || 0),
      valorFinal: parseFloat(pag.valor_final || pag.valor || 0),
      valorOriginal: parseFloat(pag.valor_original || pag.valor || 0),
      parcelas: pag.parcelas || null,
      maquinaInfo: pag.maquina_info || null,
      taxaInfo: pag.taxa_info || null
    })) : [];

    // Mapear desconto
    const desconto = doc.valor_desconto > 0 ? {
      tipo: doc.tipo_desconto || 'percent',
      valor: doc.valor_desconto_original || doc.valor_desconto || 0,
      valor_aplicado: doc.valor_desconto || 0
    } : null;

    return {
      ...doc,
      id: doc.id,
      tipo: doc.tipo_documento === 'orcamento' ? 'Orçamento PDV' : 'Venda PDV',
      total: parseFloat(doc.valor_total || doc.total || 0),
      subtotal: parseFloat(doc.valor_subtotal || doc.subtotal || 0),
      itens: itens,
      pagamentos: pagamentos,
      desconto: desconto,
      cliente_nome: doc.cliente_nome || doc.cliente?.nome || 'Cliente Avulso',
      vendedor_nome: doc.vendedor_nome || 'N/A',
      data_emissao: doc.data_venda || doc.data_emissao,
      observacoes: doc.observacoes || '',
      status: doc.status || 'pendente',
      data_validade: doc.data_validade || null,
      origem_venda: doc.metadados?.origem || (doc.tipo_documento === 'orcamento' ? 'Orçamento PDV' : 'Venda PDV'),
      // Trazer dados de pontos tanto dos metadados quanto de campos possíveis
      dadosPontos: doc.metadados?.dados_pontos || doc.dadosPontos || null,
      cliente: {
        id: doc.cliente_id || doc.cliente?.id,
        nome: doc.cliente_nome || doc.cliente?.nome || 'Cliente Avulso',
        cpf_cnpj: doc.cliente?.cpf_cnpj || doc.cliente_cpf_cnpj || '',
        telefone_principal: doc.cliente?.telefone_principal || doc.cliente?.telefone || '',
        email_principal: doc.cliente?.email_principal || doc.cliente?.email || ''
      }
    };
  };

  const handleViewRecibo = async (doc) => {
    if (!doc || typeof doc !== 'object') return;
    try {
      console.log('📄 Documento original:', doc);
      // Buscar documento completo na API para garantir itens, cliente e pagamentos
      let vendaDetalhada = null;
      if (doc.id) {
        try {
          const resp = await vendaService.getById(doc.id);
          const raw = resp?.data ?? resp;
          // Estruturas possíveis: {success, data:{...}} ou {data:{...}} ou {...}
          vendaDetalhada = raw?.data?.data || raw?.data || (raw?.success ? raw?.data : null) || null;
        } catch (e) {
          console.warn('Falha ao carregar venda detalhada, usando dados da lista.', e);
        }
      }

      const base = vendaDetalhada || doc;

      // Itens do documento (prioriza estrutura da API com relacionamento)
      const itensFonte = Array.isArray(base.itens) ? base.itens : (Array.isArray(base?.data?.itens) ? base.data.itens : []);
      const itens = itensFonte.map((item) => ({
        id_produto: item.produto_id || item.id_produto,
        nome: item.produto_nome || item.nome || item?.produto?.nome || 'Produto não especificado',
        preco_venda_unitario: parseFloat(item.valor_unitario || item.preco_venda_unitario || 0),
        preco_unitario: parseFloat(item.valor_unitario || item.preco_unitario || 0),
        quantidade: parseFloat(item.quantidade || 1),
        variacao: item.dados_adicionais?.variacao || item.variacao || null,
        imagem_principal: item.dados_adicionais?.imagem_principal || item.imagem_principal || item?.produto?.imagem_principal || null,
      }));

      // Pagamentos
      const pagamentosFonte = Array.isArray(base.dados_pagamento)
        ? base.dados_pagamento
        : (Array.isArray(base?.data?.dados_pagamento) ? base.data.dados_pagamento : []);
      const pagamentos = Array.isArray(pagamentosFonte)
        ? pagamentosFonte.map((p) => ({
            metodo: p.forma_pagamento || p.metodo || 'Outro',
            valor: parseFloat(p.valor || 0),
            valorFinal: parseFloat(p.valor_final || p.valor || 0),
            valorOriginal: parseFloat(p.valor_original || p.valor || 0),
            parcelas: p.parcelas || null,
            maquinaInfo: p.maquina_info || null,
            taxaInfo: p.taxa_info || null,
          }))
        : (Array.isArray(base.pagamentos) ? base.pagamentos : []);

      // Desconto
      const descontoBase = base?.data ? base.data : base;
      const desconto = (parseFloat(descontoBase.valor_desconto || 0) > 0 || descontoBase.desconto)
        ? {
            tipo: (descontoBase.tipo_desconto === 'percentual' || descontoBase.tipo_desconto === 'valor')
              ? descontoBase.tipo_desconto
              : (descontoBase.desconto?.tipo === 'percent' ? 'percentual' : (descontoBase.desconto?.tipo || 'valor')),
            valor: parseFloat(descontoBase.valor_desconto_original || descontoBase.desconto?.valor || 0),
            valor_aplicado: parseFloat(descontoBase.valor_desconto || descontoBase.desconto?.valor_aplicado || 0),
          }
        : null;

      const documentoMapeado = {
        ...(base?.data ? base.data : base),
        id: (base?.data ? base.data.id : base.id) || base.codigo || doc.id,
        tipo: (base?.data ? base.data.tipo_documento : base.tipo_documento) === 'orcamento' ? 'Orçamento PDV' : 'Venda PDV',
        total: parseFloat((base?.data ? base.data.valor_total : base.valor_total) || base.total || 0),
        subtotal: parseFloat((base?.data ? base.data.valor_subtotal : base.valor_subtotal) || base.subtotal || 0),
        itens,
        pagamentos,
        desconto,
        cliente_nome: (base?.data ? base.data.cliente_nome : base.cliente_nome) || base.cliente?.nome || 'Cliente Avulso',
        vendedor_nome: (base?.data ? base.data.vendedor_nome : base.vendedor_nome) || 'N/A',
        data_emissao: (base?.data ? (base.data.data_venda || base.data.data_emissao) : (base.data_venda || base.data_emissao)),
        observacoes: (base?.data ? base.data.observacoes : base.observacoes) || '',
        status: (base?.data ? base.data.status : base.status) || 'pendente',
        data_validade: (base?.data ? base.data.data_validade : base.data_validade) || null,
        origem_venda: (base?.data ? base.data.metadados?.origem : base.metadados?.origem) || ((base?.data ? base.data.tipo_documento : base.tipo_documento) === 'orcamento' ? 'Orçamento PDV' : 'Venda PDV'),
        dadosPontos: (base?.data ? base.data.metadados?.dados_pontos : base.metadados?.dados_pontos) || base.dadosPontos || null,
        cliente: {
          id: (base?.data ? base.data.cliente_id : base.cliente_id) || base.cliente?.id,
          nome: (base?.data ? base.data.cliente_nome : base.cliente_nome) || base.cliente?.nome || 'Cliente Avulso',
          cpf_cnpj: base.cliente?.cpf_cnpj || (base?.data ? base.data.cliente_cpf_cnpj : base.cliente_cpf_cnpj) || '',
          telefone_principal: base.cliente?.telefone_principal || base.cliente?.telefone || '',
          email_principal: base.cliente?.email_principal || base.cliente?.email || '',
        },
      };

      console.log('📋 Documento mapeado:', documentoMapeado);
      console.log('🎯 dadosPontos no documento mapeado:', documentoMapeado.dadosPontos);
      setDocumentoSelecionado(documentoMapeado);
      setIsReciboModalOpen(true);
    } catch (error) {
      console.error('Erro ao abrir recibo:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os dados completos do recibo.', variant: 'destructive' });
    }
  };

  const handleEditarPreVenda = (doc) => {
    console.log('🔍 DEBUG handleEditarPreVenda - Documento recebido:', doc);
    
    if (doc && typeof doc === 'object' && doc.tipo === 'Pré-venda Catálogo' && doc.status === 'pre_venda') {
      // Para vendas da tabela vendas, usar cliente_id diretamente
      // Para vendas do localStorage, usar cliente.id
      const clienteId = doc.cliente_id || doc.cliente?.id;
      
      console.log('🔍 DEBUG - Itens do documento:', doc.itens);
      console.log('🔍 DEBUG - Cliente ID:', clienteId);
      
      // Navegar para o PDV com os dados da pré-venda para edição
      navigate('/operacional/pdv', { 
        state: { 
          preVendaData: {
            id: doc.id,
            itens: Array.isArray(doc.itens) ? doc.itens.map(i => {
              console.log('🔍 DEBUG - Mapeando item:', i);
              return {
                id_produto: i.produto_id || i.id_produto, 
                id: i.produto_id || i.id_produto, 
                nome: i.produto_nome || i.nome || i.produto?.nome || 'Produto sem nome',
                preco_venda_aplicado: i.valor_unitario || i.preco_venda_unitario, 
                quantidade: i.quantidade, 
                variacao: i.dados_adicionais?.variacao || i.variacao, 
                imagem_principal: i.dados_adicionais?.imagem_principal || i.imagem_principal || i.produto?.imagem_principal,
                preco_custo_unitario: i.preco_custo_unitario || 0,
                unidadeMedida: i.produto_unidade || i.unidadeMedida || 'unidade',
                promocao_info: i.dados_adicionais?.promocao_info || i.promocao_info
              };
            }) : [], 
            clienteId: clienteId,
            clienteNome: doc.cliente_nome || doc.cliente?.nome,
            obs_pedido: doc.observacoes,
            descontoTipo: doc.desconto?.tipo || 'percent',
            descontoValor: doc.desconto?.valor ? String(doc.desconto.valor) : '0',
            modoDocumento: 'venda', // Sempre como venda para edição
            isEdicao: true // Flag para indicar que é uma edição
          }
        } 
      });
    } else {
      console.log('❌ DEBUG - Condições não atendidas:', {
        doc: !!doc,
        tipo: doc?.tipo,
        status: doc?.status,
        tipoEsperado: 'Pré-venda Catálogo',
        statusEsperado: 'pre_venda'
      });
    }
  };

  const handleGerarPdfRecibo = async () => {
    if (!documentoSelecionado || !reciboRef.current) return;
    try {
      await generatePdfFromElement(reciboRef.current, `${documentoSelecionado.tipo || 'Documento'}_${documentoSelecionado.id || 'N/A'}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };
  
  const handleImpressaoRecibo = async () => {
    if (!documentoSelecionado || !reciboRef.current) return;
    try {
      await printElement(reciboRef.current, `${documentoSelecionado.tipo || 'Documento'} ${documentoSelecionado.id || 'N/A'}`);
    } catch (error) {
      console.error('Erro ao imprimir:', error);
    }
  };

  const getStatusBadge = (status, tipo, dataValidade) => {
    const isOrcamento = tipo === 'Orçamento PDV';
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

    if (tipo === 'Venda PDV') {
      if (status === 'Finalizado') return <Badge variant="success" className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3"/>Finalizada</Badge>;
      if (status === 'Finalizado (Editada)') return <Badge variant="warning" className="bg-orange-500 hover:bg-orange-600"><AlertTriangle className="mr-1 h-3 w-3"/>Editada</Badge>;
    } else if (tipo === 'Pré-venda Catálogo') {
      if (status === 'pre_venda') return <Badge variant="outline" className="border-blue-500 text-blue-600"><FileQuestion className="mr-1 h-3 w-3"/>Pré-venda</Badge>;
      if (status === 'finalizada') return <Badge variant="success" className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3"/>Aprovada</Badge>;
      if (status === 'cancelada') return <Badge variant="destructive" className="bg-red-500 hover:bg-red-600"><AlertTriangle className="mr-1 h-3 w-3"/>Cancelada</Badge>;
    } else if (isOrcamento) {
      if (status === 'Pendente') return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><FileQuestion className="mr-1 h-3 w-3"/>Orçamento</Badge>;
      if (status === 'Pendente (Editado)') return <Badge variant="outline" className="border-orange-500 text-orange-600"><AlertTriangle className="mr-1 h-3 w-3"/>Editado</Badge>;
    }
    return <Badge variant="secondary">{status || 'N/A'}</Badge>;
  };

  const handleFinalizarVenda = (doc) => {
    if (doc && typeof doc === 'object' && (doc.tipo === 'Venda PDV' || doc.tipo === 'Pré-venda Catálogo') && doc.status === 'pre_venda') {
      // Para vendas da tabela vendas, usar cliente_id diretamente
      // Para vendas do localStorage, usar cliente.id
      const clienteId = doc.cliente_id || doc.cliente?.id;
      
      // Preparar observações com informações da origem e forma de pagamento
      const observacoesOriginais = doc.observacoes || '';
      const formaPagamento = doc.forma_pagamento || doc.cliente?.forma_pagamento;
      const observacoesCompletas = [
        observacoesOriginais,
        'Compra realizada via catálogo público',
        formaPagamento ? `Forma de pagamento escolhida: ${formaPagamento}` : ''
      ].filter(Boolean).join('\n');
      
      // Navegar para o PDV com os dados da pré-venda para finalização
      navigate('/operacional/pdv', { 
        state: { 
          preVendaData: {
            id: doc.id,
            itens: Array.isArray(doc.itens) ? doc.itens.map(i => ({
              id_produto: i.id_produto || i.produto_id, 
              id: i.id_produto || i.produto_id, 
              nome: i.nome || i.produto_nome || 'Produto sem nome', // Garantir que sempre tenha um nome
              preco_venda_aplicado: i.preco_venda_unitario || i.valor_unitario, 
              quantidade: i.quantidade, 
              variacao: i.dados_adicionais?.variacao || i.variacao, 
              imagem_principal: i.dados_adicionais?.imagem_principal || i.imagem_principal || i.produto?.imagem_principal || null,
              preco_custo_unitario: i.preco_custo_unitario || 0,
              unidadeMedida: i.unidadeMedida || 'unidade',
              promocao_info: i.dados_adicionais?.promocao_info || i.promocao_info
            })) : [], 
            clienteId: clienteId,
            clienteNome: doc.cliente_nome || doc.cliente?.nome,
            clienteTelefone: doc.cliente_telefone || doc.cliente?.telefone,
            clienteEmail: doc.cliente_email || doc.cliente?.email,
            clienteCpfCnpj: doc.cliente_cpf_cnpj || doc.cliente?.cpf_cnpj,
            total: doc.valor_total || doc.total || 0,
            subtotal: doc.subtotal || 0,
            desconto: doc.desconto || 0,
            obs_pedido: observacoesCompletas, // Usar obs_pedido para compatibilidade com PDV
            descontoTipo: 'valor', // Padrão para desconto por valor
            descontoValor: doc.desconto || 0,
            modoDocumento: 'venda', // Sempre como venda para finalização
            isEdicao: true, // Indicar que é uma edição de pré-venda
            formaPagamento: formaPagamento,
            dadosPagamento: doc.dados_pagamento || [],
            metadados: doc.metadados || {}
          }
        }
      });
    }
  };

  const handleConfirmarPagamento = async () => {
    if (!vendaParaPagamento) return;
    
    const venda = vendaParaPagamento;
    const clienteId = venda.cliente?.id || venda.cliente_id;
    
    // Garantir que itens seja sempre um array e mapear corretamente os campos da API
    const itens = Array.isArray(venda.itens) ? venda.itens : [];
    console.log('Itens da venda:', itens); // Debug para ver a estrutura
    
    try {
      // Marcar venda como "convertida" na API (alterar status ou deletar)
      try {
        await api.delete(`/api/vendas/${venda.id}`);
        console.log(`Venda ${venda.id} removida da API de vendas`);
      } catch (apiError) {
        console.warn('Erro ao remover venda da API:', apiError);
        
        // Fallback: remover do localStorage
        const vendasData = await apiDataManager.getItem('vendasPDV');
        let vendasArray = safeJsonParse(vendasData || '[]', []);
        if (Array.isArray(vendasArray)) {
          vendasArray = vendasArray.filter(v => v && v.id !== venda.id);
          await apiDataManager.setItem('vendasPDV', vendasArray);
          console.log(`Venda ${venda.id} removida do localStorage local`);
        }
      }
    } catch (error) {
      console.error('Erro ao remover venda:', error);
    }
    
    // Remover a venda da lista local imediatamente para atualizar a UI
    setDocumentos(prevDocs => prevDocs.filter(doc => doc.id !== venda.id || doc.tipo !== 'Venda PDV'));
    
    toast({
      title: "Venda Removida",
      description: `Venda ${venda.id} será finalizada no PDV.`,
      variant: "default",
    });
    
    // Fechar modal
    setIsPagamentoModalOpen(false);
    setVendaParaPagamento(null);
    
    navigate('/operacional/pdv', { 
      state: { 
        vendaData: {
          id: venda.id,
          itens: itens.map(i => ({
            // Mapear campos da API de vendas para formato esperado pelo PDV
            id_produto: i.produto_id || i.id_produto, 
            id: i.produto_id || i.id_produto, 
            nome: i.produto_nome || i.nome, 
            preco_venda_aplicado: i.valor_unitario || i.preco_venda_unitario, 
            quantidade: i.quantidade, 
            variacao: i.dados_adicionais?.variacao || i.variacao, 
            imagem_principal: i.dados_adicionais?.imagem_principal || i.imagem_principal || i.produto?.imagem_principal || null,
            preco_custo_unitario: i.preco_custo_unitario || 0,
            unidadeMedida: i.produto_unidade || i.unidadeMedida || 'un',
            promocao_info: i.dados_adicionais?.promocao_info || i.promocao_info
          })), 
          clienteId: clienteId,
          clienteNome: venda.cliente?.nome || venda.cliente_nome,
          obs_pedido: venda.observacoes,
          descontoTipo: venda.tipo_desconto || venda.desconto?.tipo || 'percent',
          descontoValor: venda.valor_desconto_original ? String(venda.valor_desconto_original) : (venda.desconto?.valor ? String(venda.desconto.valor) : '0'),
        }
      } 
    });
  };

  const handleTransformOrcamentoToVenda = async (orcamento) => {
    if (orcamento.data_validade) {
        try {
            if (isBefore(parseISO(orcamento.data_validade), startOfDay(new Date()))) {
                toast({
                    title: "Orçamento Expirado",
                    description: "Este orçamento está expirado e não pode ser transformado em venda.",
                    variant: "destructive",
                });
                return;
            }
        } catch (e) {
            console.error("Erro ao verificir data de validade:", e);
        }
    }
    
    const clienteId = orcamento.cliente?.id || orcamento.cliente_id;
    
    // Garantir que itens seja sempre um array e mapear corretamente os campos da API
    const itens = Array.isArray(orcamento.itens) ? orcamento.itens : [];
    console.log('Itens do orçamento:', itens); // Debug para ver a estrutura
    
    try {
        // Marcar orçamento como "convertido" na API (alterar status ou deletar)
        // Como vamos usar o mesmo ID para a venda, vamos deletar o orçamento da API
        try {
            await api.delete(`/api/vendas/${orcamento.id}`);
            console.log(`Orçamento ${orcamento.id} removido da API de vendas`);
        } catch (apiError) {
            console.warn('Erro ao remover orçamento da API:', apiError);
            
            // Fallback: remover do localStorage
            const orcamentosData = await apiDataManager.getItem('orcamentosPDV');
            let orcamentosArray = safeJsonParse(orcamentosData || '[]', []);
            if (Array.isArray(orcamentosArray)) {
                orcamentosArray = orcamentosArray.filter(o => o && o.id !== orcamento.id);
                await apiDataManager.setItem('orcamentosPDV', orcamentosArray);
                console.log(`Orçamento ${orcamento.id} removido do localStorage local`);
            }
        }
    } catch (error) {
        console.error('Erro ao remover orçamento:', error);
    }
    
    // Remover o orçamento da lista local imediatamente para atualizar a UI
    setDocumentos(prevDocs => prevDocs.filter(doc => doc.id !== orcamento.id || doc.tipo !== 'Orçamento PDV'));
    
    toast({
        title: "Orçamento Removido",
        description: `Orçamento ${orcamento.id} será convertido em venda.`,
        variant: "default",
    });
    
    navigate('/operacional/pdv', { 
        state: { 
            orcamentoData: {
              id: orcamento.id,
              itens: itens.map(i => ({
                // Mapear campos da API de vendas para formato esperado pelo PDV
                id_produto: i.produto_id || i.id_produto, 
                id: i.produto_id || i.id_produto, 
                nome: i.produto_nome || i.nome, 
                preco_venda_aplicado: i.valor_unitario || i.preco_venda_unitario, 
                quantidade: i.quantidade, 
                variacao: i.dados_adicionais?.variacao || i.variacao, 
                imagem_principal: i.dados_adicionais?.imagem_principal || i.imagem_principal || i.produto?.imagem_principal || null,
                preco_custo_unitario: i.preco_custo_unitario || 0,
                unidadeMedida: i.produto_unidade || i.unidadeMedida || 'un',
                promocao_info: i.dados_adicionais?.promocao_info || i.promocao_info
              })), 
              clienteId: clienteId,
              clienteNome: orcamento.cliente?.nome || orcamento.cliente_nome,
              obs_pedido: orcamento.observacoes,
              descontoTipo: orcamento.tipo_desconto || orcamento.desconto?.tipo || 'percent',
              descontoValor: orcamento.valor_desconto_original ? String(orcamento.valor_desconto_original) : (orcamento.desconto?.valor ? String(orcamento.desconto.valor) : '0'),
            }
        } 
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Histórico de Lançamentos (PDV)</h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4 md:mt-0 w-full md:w-auto">
          <Input
            type="search"
            placeholder="Buscar documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 bg-white dark:bg-gray-700"
          />
           <div className="flex space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                  <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                          "w-full md:w-[260px] justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                      )}
                  >
                      <CalendarDays className="mr-2 h-4 w-4" />
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
            </Popover>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setDateRange({ from: startOfToday(), to: startOfToday() })}
              title="Filtrar apenas hoje"
              className="flex-shrink-0"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setDateRange({ from: undefined, to: undefined })}
              title="Limpar filtro de data (mostrar todos)"
              className="flex-shrink-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => navigate('/operacional/pdv')} className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white w-full md:w-auto">
            <ShoppingCart className="mr-2 h-5 w-5" /> Novo PDV
          </Button>
        </div>
      </div>

      {/* Visualização em Cards para Mobile */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Carregando...</span>
          </div>
        ) : (
        <ScrollArea className="h-[calc(100vh-260px)]">
          <div className="space-y-4">
            {documentos.length > 0 ? (
              documentos.map((doc) => (
                <motion.div
                  key={doc.id + doc.tipo}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="space-y-3">
                    {/* ID e Status */}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ID</p>
                        <p className="font-semibold text-lg">{doc.id ? String(doc.id).slice(-6) : 'N/A'}</p>
                      </div>
                      <div>
                        {getStatusBadge(doc.status, doc.tipo, doc.data_validade)}
                      </div>
                    </div>

                    {/* Tipo */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Tipo</p>
                      <p className="font-medium">{doc.tipo || 'N/A'}</p>
                    </div>

                    {/* Cliente */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Cliente</p>
                      <p className="font-medium">{doc.cliente?.nome || doc.cliente_nome || 'N/A'}</p>
                      {doc.observacoes && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          <span className="font-semibold">Obs:</span> {doc.observacoes}
                        </p>
                      )}
                      {getFormaPagamento(doc) && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          <span className="font-semibold">Forma de Pagamento:</span> {getFormaPagamentoIcon(getFormaPagamento(doc))} {getFormaPagamentoLabel(getFormaPagamento(doc))}
                        </p>
                      )}
                      {(doc.cliente?.telefone_principal || doc.cliente?.telefone) && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">Tel:</span> {doc.cliente?.telefone_principal || doc.cliente?.telefone}
                        </p>
                      )}
                      {(doc.cliente?.email_principal || doc.cliente?.email) && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">Email:</span> {doc.cliente?.email_principal || doc.cliente?.email}
                        </p>
                      )}
                      {doc.cliente?.codigo_cliente && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">Código:</span> {doc.cliente.codigo_cliente}
                        </p>
                      )}
                    </div>

                    {/* Datas */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Data</p>
                        <p className="text-sm">{doc.data_emissao ? 
                            (() => {
                              try {
                                return isValid(parseISO(doc.data_emissao)) ? format(parseISO(doc.data_emissao), 'dd/MM/yyyy') : 'Data inválida';
                              } catch (e) {
                                return 'Data inválida';
                              }
                            })() 
                            : 'Data não informada'
                          }</p>
                      </div> */}
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Data/Hora</p>
                        <p className="text-sm">{doc.data_emissao ? 
                            (() => {
                              try {
                                return isValid(parseISO(doc.data_emissao)) ? format(parseISO(doc.data_emissao), 'dd/MM/yyyy HH:mm') : 'Data inválida';
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
                        {formatCurrency(doc.valor_total || 0)}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewRecibo(doc)} 
                          className="flex-1"
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Ver
                        </Button>
                        {doc.tipo === 'Venda PDV' && doc.status === 'pre_venda' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleFinalizarVenda(doc)} 
                            className="flex-1 text-green-500 hover:text-green-600 border-green-300 hover:border-green-400"
                          >
                            <CircleDollarSign className="mr-1 h-4 w-4" />
                            Finalizar
                          </Button>
                        )}
                        {doc.tipo === 'Pré-venda Catálogo' && doc.status === 'pre_venda' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditarPreVenda(doc)} 
                            className="flex-1 text-blue-500 hover:text-blue-600 border-blue-300 hover:border-blue-400"
                          >
                            <Edit className="mr-1 h-4 w-4" />
                            Editar
                          </Button>
                        )}
                        {doc.tipo_documento === 'orcamento' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleTransformOrcamentoToVenda(doc)} 
                            className="flex-1 text-green-500 hover:text-green-600 border-green-300 hover:border-green-400"
                            disabled={(() => {
                              if (!doc.data_validade) return false;
                              try {
                                return isBefore(parseISO(doc.data_validade), startOfDay(new Date()));
                              } catch (e) {
                                return false;
                              }
                            })()}
                          >
                            <CircleDollarSign className="mr-1 h-4 w-4" />
                            Venda
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteDocumento(doc)} 
                          className="flex-1 text-red-500 hover:text-red-600 border-red-300 hover:border-red-400"
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Nenhum documento encontrado.</p>
              </div>
            )}
          </div>
        </ScrollArea>
        )}
        {/* Paginação Mobile */}
        {pagination && pagination.total > 0 && (
          <div className="flex flex-col items-center gap-3 pt-4 pb-2 border-t border-gray-200 dark:border-gray-700 mt-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pagination.from}–{pagination.to} de {pagination.total} registros
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <span className="text-sm font-medium px-2">
                {currentPage} / {pagination.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= pagination.last_page || isLoading}
              >
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Visualização em Tabela para Desktop */}
      <div className="hidden md:block">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Carregando documentos...</span>
          </div>
        ) : (
        <ScrollArea className="h-[calc(100vh-260px)] md:h-[calc(100vh-280px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-gray-100 dark:bg-gray-800">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.length > 0 ? (
                documentos.map((doc) => (
                  <TableRow key={doc.id + doc.tipo} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <TableCell className="font-medium">{doc.id ? String(doc.id).slice(-6) : 'N/A'}</TableCell>
                    {/* <TableCell>
                      {doc.data_emissao ? 
                        (() => {
                          try {
                            return isValid(parseISO(doc.data_emissao)) ? format(parseISO(doc.data_emissao), 'dd/MM/yyyy') : 'Data inválida';
                          } catch (e) {
                            return 'Data inválida';
                          }
                        })() 
                        : 'Data não informada'
                      }
                    </TableCell> */}
                    <TableCell>{doc.tipo || 'N/A'}</TableCell>
                    <TableCell>
                      {doc.cliente?.nome || doc.cliente_nome || 'N/A'} 
                      <br/> 
                      <span className="text-xs text-gray-500">Observações:</span> {doc.observacoes || 'N/A'} 
                      {getFormaPagamento(doc) && (
                        <>
                          <br/>
                          <span className="text-xs text-gray-500">Forma de Pagamento:</span> {getFormaPagamentoIcon(getFormaPagamento(doc))} {getFormaPagamentoLabel(getFormaPagamento(doc))}
                        </>
                      )}
                      <br/> 
                      <span className="text-xs text-gray-500">Telefone:</span> {doc.cliente?.telefone_principal || doc.cliente?.telefone || 'N/A'} 
                      <br/> 
                      <span className="text-xs text-gray-500">Email:</span> {doc.cliente?.email_principal || doc.cliente?.email || 'N/A'} 
                      <br/> 
                      <span className="text-xs text-gray-500">Código:</span> {doc.cliente?.codigo_cliente || 'N/A'}
                    </TableCell>
                    <TableCell>{doc.data_emissao ? 
                        (() => {
                          try {
                            return isValid(parseISO(doc.data_emissao)) ? format(parseISO(doc.data_emissao), 'dd/MM/yyyy HH:mm') : 'Data inválida';
                          } catch (e) {
                            return 'Data inválida';
                          }
                        })() 
                        : 'Data não informada'
                      }</TableCell>
                    <TableCell>{formatCurrency(doc.valor_total || 0)}</TableCell>
                    <TableCell>{getStatusBadge(doc.status, doc.tipo, doc.data_validade)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewRecibo(doc)} title="Visualizar Recibo/Orçamento">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setVendaIdParaCompartilhar(doc.id);
                            setIsCompartilharModalOpen(true);
                          }} 
                          title="Compartilhar Venda"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        {(doc.tipo === 'Venda PDV' || doc.tipo === 'Pré-venda Catálogo') && doc.status === 'pre_venda' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleFinalizarVenda(doc)} 
                            title="Finalizar Venda no PDV" 
                            className="text-green-500 hover:text-green-600"
                          >
                            <CircleDollarSign className="h-4 w-4" />
                          </Button>
                        )}
                        {doc.tipo === 'Pré-venda Catálogo' && doc.status === 'pre_venda' && (
                          <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEditarPreVenda(doc)} 
                              title="Editar Pré-venda no PDV" 
                              className="text-blue-500 hover:text-blue-600"
                          >
                             <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {doc.tipo_documento === 'orcamento' && (
                          <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleTransformOrcamentoToVenda(doc)} 
                              title="Transformar em Venda" 
                              className="text-green-500 hover:text-green-600"
                              disabled={(() => {
                                if (!doc.data_validade) return false;
                                try {
                                  return isBefore(parseISO(doc.data_validade), startOfDay(new Date()));
                                } catch (e) {
                                  return false;
                                }
                              })()}
                          >
                             <CircleDollarSign className="h-4 w-4" />
                          </Button>
                        )}
                         <Button variant="ghost" size="icon" onClick={() => handleDeleteDocumento(doc)} title="Excluir" className="text-red-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-gray-500 dark:text-gray-400">
                    Nenhum documento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        )}
        {/* Paginação Desktop */}
        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Exibindo {pagination.from}–{pagination.to} de {pagination.total} registros
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage <= 1 || isLoading}
                title="Primeira página"
              >
                Primeira
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <span className="text-sm font-medium px-3">
                Página {currentPage} de {pagination.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= pagination.last_page || isLoading}
              >
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.last_page)}
                disabled={currentPage >= pagination.last_page || isLoading}
                title="Última página"
              >
                Última
              </Button>
            </div>
          </div>
        )}
      </div>
      {documentoSelecionado && (
        <PDVReciboModal
          isOpen={isReciboModalOpen}
          setIsOpen={setIsReciboModalOpen}
          reciboRef={reciboRef}
          documento={documentoSelecionado}
          logoUrl={logoUrl || empresaSettings?.logoUrl || ''}
          nomeEmpresa={empresaSettings?.nomeFantasia || nomeEmpresa || ''}
          empresaSettings={empresaSettings || {}}
          produtos={produtos}
          handleImpressaoRecibo={handleImpressaoRecibo}
          handleGerarPdfRecibo={handleGerarPdfRecibo}
          handleNovoPedido={() => {
            setIsReciboModalOpen(false);
            navigate('/operacional/pdv');
          }} 
        />
      )}
      <DeleteWithJustificationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteDocumento}
        title={`Excluir ${documentoToDelete?.tipo === 'Venda PDV' ? 'Venda' : 'Orçamento'}`}
        description={`Tem certeza que deseja mover est${documentoToDelete?.tipo === 'Venda PDV' ? 'a venda' : 'e orçamento'} para a lixeira? Esta ação requer uma justificativa e sua senha.`}
        requirePassword={true}
        vendedorAtual={vendedorAtual}
      />

      {/* Modal de Pagamento */}
      <Dialog open={isPagamentoModalOpen} onOpenChange={setIsPagamentoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Forma de Pagamento
            </DialogTitle>
          </DialogHeader>
          
          {vendaParaPagamento && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-200 mb-2">Cliente</h4>
                <p className="text-sm text-gray-900 dark:text-gray-100">{vendaParaPagamento.cliente?.nome || vendaParaPagamento.cliente_nome || 'Cliente não informado'}</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-200 mb-2">Total do Pedido</h4>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(vendaParaPagamento.total || 0)}
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-2">Forma de Pagamento Escolhida</h4>
                <div className="flex items-center gap-2">
                  {(() => {
                    const formaPagamento = getFormaPagamento(vendaParaPagamento);
                    
                    console.log('🔍 Forma de pagamento encontrada no modal:', formaPagamento);
                    console.log('📦 Dados completos da venda:', {
                      forma_pagamento: vendaParaPagamento.forma_pagamento,
                      cliente_forma_pagamento: vendaParaPagamento.cliente?.forma_pagamento,
                      dados_pagamento: vendaParaPagamento.dados_pagamento,
                      full: vendaParaPagamento
                    });
                    
                    if (formaPagamento === 'cartao_entrega') {
                      return (
                        <>
                          <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Cartão na Entrega</span>
                        </>
                      );
                    }
                    if (formaPagamento === 'pix') {
                      return (
                        <>
                          <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">PIX</span>
                        </>
                      );
                    }
                    if (formaPagamento === 'dinheiro') {
                      return (
                        <>
                          <Banknote className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Dinheiro</span>
                        </>
                      );
                    }
                    return <span className="text-sm text-gray-500 dark:text-gray-400">Não informado</span>;
                  })()}
                </div>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p>O cliente escolheu pagar com <strong className="text-gray-900 dark:text-gray-100">
                  {(() => {
                    const formaPagamento = getFormaPagamento(vendaParaPagamento);
                    return getFormaPagamentoLabel(formaPagamento) || 'forma não informada';
                  })()}
                </strong>.</p>
                <p className="mt-1">Clique em "Finalizar no PDV" para processar o pagamento.</p>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPagamentoModalOpen(false);
                setVendaParaPagamento(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarPagamento}
              className="bg-green-600 hover:bg-green-700"
            >
              Finalizar no PDV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Compartilhamento */}
      <CompartilharModal
        isOpen={isCompartilharModalOpen}
        onClose={() => {
          setIsCompartilharModalOpen(false);
          setVendaIdParaCompartilhar(null);
        }}
        tipo="venda"
        id={vendaIdParaCompartilhar}
        onCompartilhar={async (vendaId) => {
          try {
            const response = await api.post(`/api/vendas/${vendaId}/compartilhar`);
            return response.data;
          } catch (error) {
            console.error('Erro ao compartilhar venda:', error);
            throw error;
          }
        }}
      />
      
    </motion.div>
  );
};

export default PDVHistoricoPage;