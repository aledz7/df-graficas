import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Eye, Printer, FileText, DollarSign, Filter, CheckCircle, AlertCircle, Clock, Edit, Percent, Info, CalendarDays as CalendarIcon, DivideCircle, CheckSquare, Square, ShoppingCart, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO, differenceInDays, isValid, addDays } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { contasReceberService } from '@/services/contasReceberService';
import { contaReceberService, vendaService, empresaService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';
import RecebimentoModal from '@/components/contas-receber/RecebimentoModal';
import ContaReceberDetalhesModal from '@/components/contas-receber/ContaReceberDetalhesModal';
import ProdutosServicosCard from '@/components/contas-receber/ProdutosServicosCard';
import { usePermissions } from '@/hooks/usePermissions';

const ContasReceberPage = () => {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const [contas, setContas] = useState([]);
  const [filteredContas, setFilteredContas] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState({ inicio: '', fim: '' });
  const [filtroCliente, setFiltroCliente] = useState('');
  const [tipoFiltroData, setTipoFiltroData] = useState('vencimento'); // 'vencimento' ou 'pagamento'
  const [contaParaAcao, setContaParaAcao] = useState(null);
  const [isRecebimentoModalOpen, setIsRecebimentoModalOpen] = useState(false);
  const [isAplicarJurosModalOpen, setIsAplicarJurosModalOpen] = useState(false);
  const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false);
  const [isProdutosServicosOpen, setIsProdutosServicosOpen] = useState(false);
  const [modoParcelamento, setModoParcelamento] = useState(false);
  const [jurosParaAplicar, setJurosParaAplicar] = useState({ tipo: 'percentual', valor: '' });
  const [logoUrl, setLogoUrl] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [secoesVisiveis, setSecoesVisiveis] = useState({
    vencidas: true,
    pendentes: false,
    parcialmentePagas: false,
    parceladas: false,
    pagas: false
  });
  const [contasSelecionadas, setContasSelecionadas] = useState(new Set());
  const [isProcessandoLote, setIsProcessandoLote] = useState(false);
  const [isParcelamentoLoteModalOpen, setIsParcelamentoLoteModalOpen] = useState(false);
  const [isRecebimentoLoteModalOpen, setIsRecebimentoLoteModalOpen] = useState(false);
  const [configParcelamentoLote, setConfigParcelamentoLote] = useState({
    numeroParcelas: 2,
    intervaloDias: 30,
    dataPrimeiraParcela: '',
    formaPagamento: 'Dinheiro',
    observacoes: 'Parcelamento em lote'
  });
  const [configRecebimentoLote, setConfigRecebimentoLote] = useState({
    formaPagamento: 'Dinheiro',
    observacoes: 'Recebimento em lote'
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Preparar filtros para a API
        const filtros = {};
        
        // Se há filtro de período definido, usar para filtrar por data de vencimento ou pagamento
        if (filtroPeriodo.inicio && filtroPeriodo.fim) {
          if (tipoFiltroData === 'pagamento') {
            // Filtrar por data de pagamento
            filtros.pagamento_de = filtroPeriodo.inicio;
            filtros.pagamento_ate = filtroPeriodo.fim;
          } else {
            // Filtrar por data de vencimento (padrão)
            filtros.vencimento_de = filtroPeriodo.inicio;
            filtros.vencimento_ate = filtroPeriodo.fim;
          }
        }
        
        console.log('🔍 Buscando contas a receber com filtros:', filtros);
        
        // Buscar contas a receber (crediário) da API com filtros
        const response = await contasReceberService.getContasReceber(filtros);
        let contasDaAPI = response.data || [];
        
        console.log('✅ Contas a receber carregadas da API:', contasDaAPI.length);

        // Transformar dados da API para o formato esperado pelo frontend
        
        const contasTransformadas = contasDaAPI.map(conta => {
          // Função para normalizar data (remover horário e considerar apenas a data)
          const normalizarData = (dataString) => {
            if (!dataString) return new Date().toISOString();
            const data = new Date(dataString);
            // Criar nova data apenas com ano, mês e dia (sem horário)
            return new Date(data.getFullYear(), data.getMonth(), data.getDate()).toISOString();
          };

          // Função para obter a data do último pagamento
          const getDataUltimoPagamento = (conta) => {
            if (conta.historico_pagamentos && Array.isArray(conta.historico_pagamentos) && conta.historico_pagamentos.length > 0) {
              // Ordenar pagamentos por data e pegar o mais recente
              const pagamentosOrdenados = conta.historico_pagamentos
                .filter(pag => pag.data)
                .sort((p1, p2) => new Date(p2.data) - new Date(p1.data));
              
              if (pagamentosOrdenados.length > 0) {
                return normalizarData(pagamentosOrdenados[0].data);
              }
            }
            return null;
          };
          
          return {
            id: conta.id,
            vendaId: conta.venda_id || null,
            osId: conta.os_id || null,
            envelopamentoId: conta.envelopamento_id || null,
            clienteId: conta.cliente_id,
            clienteNome: conta.cliente?.nome_completo || conta.cliente?.apelido_fantasia || 'Cliente não encontrado',
            valor_pendente: parseFloat(conta.valor_pendente) || 0,
            valor_original_divida: parseFloat(conta.valor_original) || 0,
            juros_aplicados: parseFloat(conta.juros_aplicados) || 0,
            forma_entrada: conta.descricao || 'Conta a receber',
            descricao: conta.descricao || '',
            dataLancamento: normalizarData(conta.data_emissao),
            vencimento: normalizarData(conta.data_vencimento),
            dataPagamento: getDataUltimoPagamento(conta), // Nova data de pagamento
            status: conta.status_calculado || conta.status || 'pendente',
            observacao_venda: conta.observacoes || '',
            info_adicional: conta.info_adicional || null, // Preservar info_adicional do backend
            pagamentos: [], // TODO: Implementar histórico de pagamentos
            // Campos de juros configurados
            tipo_juros: conta.tipo_juros || null,
            valor_juros: conta.valor_juros || null,
            data_inicio_cobranca_juros: conta.data_inicio_cobranca_juros || null,
            frequencia_juros: conta.frequencia_juros || null,
            ultima_aplicacao_juros: conta.ultima_aplicacao_juros || null,
            total_aplicacoes_juros: conta.total_aplicacoes_juros || 0,
            historico_juros: conta.historico_juros || [],
            config_juros: null, // Mantido para compatibilidade
          };
        });

        // Usar apenas as contas a receber (crediário)
        const todasAsContas = contasTransformadas;

        // Atualizar status para vencido se necessário
        const contasComStatusAtualizado = todasAsContas.map(conta => {
          // Se a conta está pendente e venceu, marcar como vencida
          if (conta.status === 'pendente' && isValid(parseISO(conta.vencimento)) && differenceInDays(new Date(), parseISO(conta.vencimento)) > 0) {
            return { ...conta, status: 'vencido' };
          }
          
          // Se a conta está quitada mas tem valor pendente > 0, verificar se venceu
          if (conta.status === 'quitada' && parseFloat(conta.valor_pendente) > 0 && isValid(parseISO(conta.vencimento)) && differenceInDays(new Date(), parseISO(conta.vencimento)) > 0) {
            return { ...conta, status: 'vencido' };
          }
          
          return conta;
        });

        setContas(contasComStatusAtualizado);

        // Carregar configurações da empresa da API
        try {
          const empresaResponse = await empresaService.get();
          const empresaData = empresaResponse?.data?.data || {};
          
          if (empresaData.logo_url) {
            setLogoUrl(empresaData.logo_url);
            // Salvar no apiDataManager para cache
            await apiDataManager.setItem('logoUrl', empresaData.logo_url);
          } else {
            // Fallback: tentar carregar do apiDataManager
            const logoUrlFromCache = await apiDataManager.getData('logoUrl') || '';
            setLogoUrl(logoUrlFromCache);
          }
          
          if (empresaData.nome_fantasia) {
            setNomeEmpresa(empresaData.nome_fantasia);
          } else {
            // Fallback: tentar carregar do apiDataManager
            const settings = await apiDataManager.getData('empresaSettings') || {};
            setNomeEmpresa(settings.nomeFantasia || 'Sua Empresa');
          }
        } catch (error) {
          console.error('Erro ao carregar dados da empresa:', error);
          // Fallback: usar dados do apiDataManager
          const settings = await apiDataManager.getData('empresaSettings') || {};
          const logoUrl = await apiDataManager.getData('logoUrl') || '';
          setLogoUrl(logoUrl);
          setNomeEmpresa(settings.nomeFantasia || 'Sua Empresa');
        }

      } catch (error) {
        console.error('Erro ao carregar contas a receber:', error);
        toast({ 
          title: "Erro ao carregar contas", 
          description: "Não foi possível carregar as contas a receber da API.",
          variant: "destructive"
        });
      }
    };
    
    loadData();
  }, [toast, filtroPeriodo.inicio, filtroPeriodo.fim, tipoFiltroData]);



  useEffect(() => {
    let items = [...contas];
    
    // Filtro por status - mapear "quitada" e "parcelada" para "recebido"
    if (filtroStatus !== 'todos') {
      if (filtroStatus === 'recebido') {
        items = items.filter(c => c.status === 'recebido' || c.status === 'quitada' || c.status === 'parcelada');
      } else {
        items = items.filter(c => c.status === filtroStatus);
      }
    }
    
    // Filtro por cliente e observações
    if (filtroCliente) {
      items = items.filter(c => {
        const termoBusca = filtroCliente.toLowerCase();
        
        // Buscar pelo nome do cliente
        const nomeClienteMatch = c.clienteNome.toLowerCase().includes(termoBusca);
        
        // Buscar pelas observações
        let observacoesMatch = false;
        if (c.osId) {
          // Para OS, combinar observações gerais da OS com observações dos itens
          const observacoesOS = c.info_adicional?.observacoes || c.observacao_venda || '';
          const observacoesItens = c.info_adicional?.observacoes_itens || '';
          
          const todasObservacoes = [observacoesOS, observacoesItens]
            .filter(obs => obs && obs.trim())
            .join('\n')
            .toLowerCase();
          
          observacoesMatch = todasObservacoes.includes(termoBusca);
        } else if (c.envelopamentoId) {
          // Para Envelopamento, usar observações do info_adicional (igual às OS)
          const observacoesEnvelopamento = c.info_adicional?.observacoes || c.observacao_venda || '';
          observacoesMatch = observacoesEnvelopamento.toLowerCase().includes(termoBusca);
        } else {
          // Para outras contas, usar descrição ou observações
          const observacoes = (c.descricao || c.observacao_venda || '').toLowerCase();
          observacoesMatch = observacoes.includes(termoBusca);
        }
        
        return nomeClienteMatch || observacoesMatch;
      });
    }
    
    // Filtro por data (vencimento ou pagamento)
    if (filtroPeriodo.inicio) {
      const dataInicio = new Date(filtroPeriodo.inicio + "T00:00:00");
      items = items.filter(c => {
        // Escolher qual data usar baseado no tipo de filtro selecionado
        let dataParaFiltrar;
        if (tipoFiltroData === 'pagamento') {
          // Usar data de pagamento se disponível
          if (!c.dataPagamento) {
            return false; // Se não tem data de pagamento, não incluir
          }
          dataParaFiltrar = new Date(c.dataPagamento);
        } else {
          // Usar data de vencimento (padrão)
          dataParaFiltrar = new Date(c.vencimento);
        }
        
        // Comparar apenas a data (sem horário) para evitar problemas de fuso horário
        const dataLocal = new Date(dataParaFiltrar.getFullYear(), dataParaFiltrar.getMonth(), dataParaFiltrar.getDate());
        const dataInicioLocal = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
        return dataLocal >= dataInicioLocal;
      });
    }
    
    if (filtroPeriodo.fim) {
      const dataFim = new Date(filtroPeriodo.fim + "T23:59:59");
      items = items.filter(c => {
        // Escolher qual data usar baseado no tipo de filtro selecionado
        let dataParaFiltrar;
        if (tipoFiltroData === 'pagamento') {
          // Usar data de pagamento se disponível
          if (!c.dataPagamento) {
            return false; // Se não tem data de pagamento, não incluir
          }
          dataParaFiltrar = new Date(c.dataPagamento);
        } else {
          // Usar data de vencimento (padrão)
          dataParaFiltrar = new Date(c.vencimento);
        }
        
        // Comparar apenas a data (sem horário) para evitar problemas de fuso horário
        const dataLocal = new Date(dataParaFiltrar.getFullYear(), dataParaFiltrar.getMonth(), dataParaFiltrar.getDate());
        const dataFimLocal = new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate());
        return dataLocal <= dataFimLocal;
      });
    }
    
    setFilteredContas(items);
  }, [contas, filtroStatus, filtroCliente, filtroPeriodo, tipoFiltroData]);
  
  const handleOpenRecebimentoModal = (conta) => {
    setContaParaAcao(conta);
    setModoParcelamento(false);
    setIsRecebimentoModalOpen(true);
  };
  
  const handleOpenAplicarJurosModal = (conta) => {
    setContaParaAcao(conta);
    setJurosParaAplicar({ tipo: 'percentual', valor: '' }); // Reset juros ao abrir
    setIsAplicarJurosModalOpen(true);
  };

  const handleOpenDetalhesModal = (conta) => {
    setContaParaAcao(conta);
    setIsDetalhesModalOpen(true);
  };

  const handleOpenProdutosServicos = (conta) => {
    setContaParaAcao(conta);
    setIsProdutosServicosOpen(true);
  };

  const handleOpenParcelarDividaModal = (conta) => {
    setContaParaAcao(conta);
    setModoParcelamento(true);
    setIsRecebimentoModalOpen(true);
  };

  const handleConfirmPagamento = async (contaId, novosPagamentos, apiResponse = null) => {
    try {
      // Se já temos a resposta da API do modal, não fazer nova chamada
      if (apiResponse) {
        // Recarregar dados da API para garantir sincronização
        const response = await contasReceberService.getContasReceber();
        let contasDaAPI = response.data || [];
        
        const contasTransformadas = contasDaAPI.map(conta => {
          // Função para obter a data do último pagamento
          const getDataUltimoPagamento = (conta) => {
            if (conta.historico_pagamentos && Array.isArray(conta.historico_pagamentos) && conta.historico_pagamentos.length > 0) {
              // Ordenar pagamentos por data e pegar o mais recente
              const pagamentosOrdenados = conta.historico_pagamentos
                .filter(pag => pag.data)
                .sort((p1, p2) => new Date(p2.data) - new Date(p1.data));
              
              if (pagamentosOrdenados.length > 0) {
                return pagamentosOrdenados[0].data;
              }
            }
            return null;
          };

          const contaTransformada = {
            id: conta.id,
            vendaId: conta.venda_id || null,
            osId: conta.os_id || null,
            envelopamentoId: conta.envelopamento_id || null,
            clienteId: conta.cliente_id,
            clienteNome: conta.cliente?.nome_completo || conta.cliente?.apelido_fantasia || 'Cliente não encontrado',
            valor_pendente: parseFloat(conta.valor_pendente) || 0,
            valor_original_divida: parseFloat(conta.valor_original) || 0,
            juros_aplicados: parseFloat(conta.juros_aplicados) || 0,
            forma_entrada: conta.descricao || 'Conta a receber',
            descricao: conta.descricao || '',
            dataLancamento: conta.data_emissao || new Date().toISOString(),
            vencimento: conta.data_vencimento || new Date().toISOString(),
            dataPagamento: getDataUltimoPagamento(conta), // Nova data de pagamento
            status: conta.status_calculado || conta.status || 'pendente',
            observacao_venda: conta.observacoes || '',
            historico_pagamentos: conta.historico_pagamentos || [], // Histórico real de pagamentos
            pagamentos: [], // Mantido para compatibilidade
            // Campos de juros configurados
            tipo_juros: conta.tipo_juros || null,
            valor_juros: conta.valor_juros || null,
            data_inicio_cobranca_juros: conta.data_inicio_cobranca_juros || null,
            frequencia_juros: conta.frequencia_juros || null,
            ultima_aplicacao_juros: conta.ultima_aplicacao_juros || null,
            total_aplicacoes_juros: conta.total_aplicacoes_juros || 0,
            historico_juros: conta.historico_juros || [],
            config_juros: null, // Mantido para compatibilidade
          };
          
          return contaTransformada;
        });

        setContas(contasTransformadas);
        return;
      }

      // Fallback: se não temos resposta da API, fazer a chamada (para compatibilidade)
      await contaReceberService.registrarPagamentoComParcelamento(contaId, {
        pagamentos: novosPagamentos.map(p => ({
          valor: parseFloat(p.valor),
          forma_pagamento: p.metodo || p.forma_pagamento || 'Dinheiro',
          observacoes: p.observacoes || null
        })),
        criar_parcelamento: false
      });

      // Recarregar dados da API para garantir sincronização
      const response = await contasReceberService.getContasReceber();
      let contasDaAPI = response.data || [];
      
      const contasTransformadas = contasDaAPI.map(conta => {
        // Função para obter a data do último pagamento
        const getDataUltimoPagamento = (conta) => {
          if (conta.historico_pagamentos && Array.isArray(conta.historico_pagamentos) && conta.historico_pagamentos.length > 0) {
            // Ordenar pagamentos por data e pegar o mais recente
            const pagamentosOrdenados = conta.historico_pagamentos
              .filter(pag => pag.data)
              .sort((p1, p2) => new Date(p2.data) - new Date(p1.data));
            
            if (pagamentosOrdenados.length > 0) {
              return pagamentosOrdenados[0].data;
            }
          }
          return null;
        };

        const contaTransformada = {
          id: conta.id,
          vendaId: conta.venda_id || null,
          osId: conta.os_id || null,
          envelopamentoId: conta.envelopamento_id || null,
          clienteId: conta.cliente_id,
          clienteNome: conta.cliente?.nome_completo || conta.cliente?.apelido_fantasia || 'Cliente não encontrado',
          valor_pendente: parseFloat(conta.valor_pendente) || 0,
          valor_original_divida: parseFloat(conta.valor_original) || 0,
          juros_aplicados: parseFloat(conta.juros_aplicados) || 0,
          forma_entrada: conta.descricao || 'Conta a receber',
          descricao: conta.descricao || '',
          dataLancamento: conta.data_emissao || new Date().toISOString(),
          vencimento: conta.data_vencimento || new Date().toISOString(),
          dataPagamento: getDataUltimoPagamento(conta), // Nova data de pagamento
          status: conta.status_calculado || conta.status || 'pendente',
          observacao_venda: conta.observacoes || '',
          historico_pagamentos: conta.historico_pagamentos || [], // Histórico real de pagamentos
          pagamentos: [], // Mantido para compatibilidade
          // Campos de juros configurados
          tipo_juros: conta.tipo_juros || null,
          valor_juros: conta.valor_juros || null,
          data_inicio_cobranca_juros: conta.data_inicio_cobranca_juros || null,
          frequencia_juros: conta.frequencia_juros || null,
          ultima_aplicacao_juros: conta.ultima_aplicacao_juros || null,
          total_aplicacoes_juros: conta.total_aplicacoes_juros || 0,
          historico_juros: conta.historico_juros || [],
          config_juros: null, // Mantido para compatibilidade
        };
        
        return contaTransformada;
      });

      setContas(contasTransformadas);
      toast({ title: "Sucesso!", description: "Pagamento registrado com sucesso." });
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast({ 
        title: "Erro ao registrar pagamento", 
        description: "Não foi possível registrar o pagamento.",
        variant: "destructive"
      });
    }
  };
  
  const handleAplicarJurosConfirmado = async () => {
    if(!contaParaAcao || !jurosParaAplicar.valor) return;
    const valorJurosInput = parseFloat(jurosParaAplicar.valor);
    if(isNaN(valorJurosInput) || valorJurosInput < 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }

    try {
      const valorPendenteAtual = parseFloat(contaParaAcao.valor_pendente) || 0;
      const valorCalculadoJuros = jurosParaAplicar.tipo === 'percentual' ? valorPendenteAtual * (valorJurosInput / 100) : valorJurosInput;

      // Aplicar juros na API do Laravel
      await contaReceberService.aplicarJuros(contaParaAcao.id, {
        percentual_juros: jurosParaAplicar.tipo === 'percentual' ? valorJurosInput : 0,
        motivo: 'Juros aplicados manualmente via interface'
      });

      // Recarregar dados da API para garantir sincronização
      const response = await contasReceberService.getContasReceber();
      let contasDaAPI = response.data || [];
      
      const contasTransformadas = contasDaAPI.map(conta => {
        // Função para obter a data do último pagamento
        const getDataUltimoPagamento = (conta) => {
          if (conta.historico_pagamentos && Array.isArray(conta.historico_pagamentos) && conta.historico_pagamentos.length > 0) {
            // Ordenar pagamentos por data e pegar o mais recente
            const pagamentosOrdenados = conta.historico_pagamentos
              .filter(pag => pag.data)
              .sort((p1, p2) => new Date(p2.data) - new Date(p1.data));
            
            if (pagamentosOrdenados.length > 0) {
              return pagamentosOrdenados[0].data;
            }
          }
          return null;
        };

        return {
          id: conta.id,
          vendaId: conta.venda_id || null,
          osId: conta.os_id || null,
          envelopamentoId: conta.envelopamento_id || null,
          clienteId: conta.cliente_id,
          clienteNome: conta.cliente?.nome_completo || conta.cliente?.apelido_fantasia || 'Cliente não encontrado',
          valor_pendente: parseFloat(conta.valor_pendente) || 0,
          valor_original_divida: parseFloat(conta.valor_original) || 0,
          juros_aplicados: parseFloat(conta.juros_aplicados) || 0,
          forma_entrada: conta.descricao || 'Conta a receber',
          descricao: conta.descricao || '',
          dataLancamento: conta.data_emissao || new Date().toISOString(),
          vencimento: conta.data_vencimento || new Date().toISOString(),
          dataPagamento: getDataUltimoPagamento(conta), // Nova data de pagamento
          status: conta.status_calculado || conta.status || 'pendente',
          observacao_venda: conta.observacoes || '',
          info_adicional: conta.info_adicional || null, // Preservar info_adicional do backend
          pagamentos: [], // TODO: Implementar histórico de pagamentos
          config_juros: null,
        };
      });

      setContas(contasTransformadas);
      
      toast({ title: "Juros Aplicados", description: `${formatCurrency(valorCalculadoJuros)} adicionados à dívida.` });
      setIsAplicarJurosModalOpen(false);
      setContaParaAcao(null);
      setJurosParaAplicar({ tipo: 'percentual', valor: '' }); // Reset form
    } catch (error) {
      console.error('Erro ao aplicar juros:', error);
      toast({ 
        title: "Erro ao aplicar juros", 
        description: "Não foi possível aplicar os juros. Verifique se a conta ainda existe.",
        variant: "destructive"
      });
    }
  }

  const handleSalvarConfigJurosNaConta = (contaId, configJuros) => {
     setContas(prevContas => prevContas.map(c => 
        c.id === contaId ? { ...c, config_juros: configJuros } : c
     ));
     toast({ title: "Configuração de Juros Salva!", description: "As configurações de juros/multa foram salvas para esta conta."});
  };

  const handleDividirContaEAdicionarNovas = (contaOriginalId, pagamentosDaContaOriginal, novasContasGeradas) => {
    let contasAtualizadas = contas.map(c => {
        if (c.id === contaOriginalId) {
            const totalPagoNestaSessao = pagamentosDaContaOriginal.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);
            const valorPendenteFinal = (parseFloat(c.valor_pendente) || 0) - totalPagoNestaSessao;
            const statusFinal = valorPendenteFinal <= 0.01 ? 'recebido' : 'parcialmente_pago';
            const todosPagamentos = [...(c.pagamentos || []), ...pagamentosDaContaOriginal.map(p => ({...p, data: new Date().toISOString()}))];
            return { ...c, valor_pendente: valorPendenteFinal, pagamentos: todosPagamentos, status: statusFinal };
        }
        return c;
    });

    contasAtualizadas = [...contasAtualizadas, ...novasContasGeradas];
    setContas(contasAtualizadas);
    toast({ title: "Conta Parcelada!", description: `${novasContasGeradas.length} parcelas geradas. Pagamento parcial registrado na conta original.` });
  };

  // Funções para controlar visibilidade das seções
  const toggleSecao = (secao) => {
    setSecoesVisiveis(prev => ({
      ...prev,
      [secao]: !prev[secao]
    }));
  };

  const mostrarTodasSecoes = () => {
    setSecoesVisiveis({
      vencidas: true,
      pendentes: true,
      parcialmentePagas: true,
      parceladas: true,
      pagas: true
    });
  };

  const ocultarTodasSecoes = () => {
    setSecoesVisiveis({
      vencidas: false,
      pendentes: false,
      parcialmentePagas: false,
      parceladas: false,
      pagas: false
    });
  };

  // Funções para gerenciar seleção múltipla
  const toggleSelecaoConta = (contaId) => {
    setContasSelecionadas(prev => {
      const novoSet = new Set(prev);
      if (novoSet.has(contaId)) {
        novoSet.delete(contaId);
      } else {
        novoSet.add(contaId);
      }
      return novoSet;
    });
  };

  const selecionarTodasContas = (contas) => {
    const ids = contas.map(conta => conta.id);
    setContasSelecionadas(new Set(ids));
  };

  const deselecionarTodasContas = () => {
    setContasSelecionadas(new Set());
  };

  const toggleSelecaoTodasContas = (contas) => {
    const todasSelecionadas = contas.every(conta => contasSelecionadas.has(conta.id));
    if (todasSelecionadas) {
      deselecionarTodasContas();
    } else {
      selecionarTodasContas(contas);
    }
  };

  const getContasSelecionadas = () => {
    return contas.filter(conta => contasSelecionadas.has(conta.id));
  };

  const getTotalSelecionado = () => {
    return getContasSelecionadas().reduce((acc, conta) => {
      // Para contas pagas (recebido/quitada), usar valor original + juros
      if (conta.status === 'recebido' || conta.status === 'quitada') {
        const valorOriginal = parseFloat(conta.valor_original_divida) || 0;
        const juros = parseFloat(conta.juros_aplicados) || 0;
        return acc + valorOriginal + juros;
      }
      // Para outras contas, usar valor pendente
      return acc + (parseFloat(conta.valor_pendente) || 0);
    }, 0);
  };

  // Funções para processar ações em lote
  const abrirModalRecebimentoLote = () => {
    const contasParaProcessar = getContasSelecionadas();
    if (contasParaProcessar.length === 0) {
      toast({ title: "Nenhuma conta selecionada", variant: "destructive" });
      return;
    }

    // Filtrar apenas contas que podem ser recebidas (não recebidas e com valor pendente > 0)
    const contasValidas = contasParaProcessar.filter(conta => 
      conta.status !== 'recebido' && 
      conta.status !== 'quitada' && 
      (parseFloat(conta.valor_pendente) || 0) > 0
    );

    if (contasValidas.length === 0) {
      toast({ 
        title: "Nenhuma conta válida", 
        description: "Todas as contas selecionadas já foram recebidas ou não possuem valor pendente.",
        variant: "destructive" 
      });
      return;
    }

    setIsRecebimentoLoteModalOpen(true);
  };

  const processarRecebimentoLote = async () => {
    const contasParaProcessar = getContasSelecionadas();
    if (contasParaProcessar.length === 0) {
      toast({ title: "Nenhuma conta selecionada", variant: "destructive" });
      return;
    }

    setIsProcessandoLote(true);
    setIsRecebimentoLoteModalOpen(false);
    
    try {
      // Processar cada conta individualmente
      for (const conta of contasParaProcessar) {
        if (conta.status === 'recebido' || conta.status === 'quitada') {
          continue; // Pular contas já recebidas
        }

        const valorPendente = parseFloat(conta.valor_pendente) || 0;
        if (valorPendente <= 0) {
          continue; // Pular contas sem valor pendente
        }

        // Registrar pagamento total da conta
        await contaReceberService.registrarPagamentoComParcelamento(conta.id, {
          pagamentos: [{
            valor: valorPendente,
            forma_pagamento: configRecebimentoLote.formaPagamento,
            observacoes: configRecebimentoLote.observacoes
          }],
          criar_parcelamento: false
        });
      }

      // Recarregar dados da API
      const response = await contasReceberService.getContasReceber();
      let contasDaAPI = response.data || [];
      
      const contasTransformadas = contasDaAPI.map(conta => {
        const normalizarData = (dataString) => {
          if (!dataString) return new Date().toISOString();
          const data = new Date(dataString);
          return new Date(data.getFullYear(), data.getMonth(), data.getDate()).toISOString();
        };

        // Função para obter a data do último pagamento
        const getDataUltimoPagamento = (conta) => {
          if (conta.historico_pagamentos && Array.isArray(conta.historico_pagamentos) && conta.historico_pagamentos.length > 0) {
            // Ordenar pagamentos por data e pegar o mais recente
            const pagamentosOrdenados = conta.historico_pagamentos
              .filter(pag => pag.data)
              .sort((p1, p2) => new Date(p2.data) - new Date(p1.data));
            
            if (pagamentosOrdenados.length > 0) {
              return normalizarData(pagamentosOrdenados[0].data);
            }
          }
          return null;
        };
        
        return {
          id: conta.id,
          vendaId: conta.venda_id || null,
          osId: conta.os_id || null,
          envelopamentoId: conta.envelopamento_id || null,
          clienteId: conta.cliente_id,
          clienteNome: conta.cliente?.nome_completo || conta.cliente?.apelido_fantasia || 'Cliente não encontrado',
          valor_pendente: parseFloat(conta.valor_pendente) || 0,
          valor_original_divida: parseFloat(conta.valor_original) || 0,
          juros_aplicados: parseFloat(conta.juros_aplicados) || 0,
          forma_entrada: conta.descricao || 'Conta a receber',
          descricao: conta.descricao || '',
          dataLancamento: normalizarData(conta.data_emissao),
          vencimento: normalizarData(conta.data_vencimento),
          dataPagamento: getDataUltimoPagamento(conta), // Nova data de pagamento
          status: conta.status_calculado || conta.status || 'pendente',
          observacao_venda: conta.observacoes || '',
          info_adicional: conta.info_adicional || null, // Preservar info_adicional do backend
          historico_pagamentos: conta.historico_pagamentos || [],
          pagamentos: [],
          tipo_juros: conta.tipo_juros || null,
          valor_juros: conta.valor_juros || null,
          data_inicio_cobranca_juros: conta.data_inicio_cobranca_juros || null,
          frequencia_juros: conta.frequencia_juros || null,
          ultima_aplicacao_juros: conta.ultima_aplicacao_juros || null,
          total_aplicacoes_juros: conta.total_aplicacoes_juros || 0,
          historico_juros: conta.historico_juros || [],
          config_juros: null,
        };
      });

      setContas(contasTransformadas);
      deselecionarTodasContas();
      
      toast({ 
        title: "Sucesso!", 
        description: `${contasParaProcessar.length} conta(s) marcada(s) como recebida(s).` 
      });
    } catch (error) {
      console.error('Erro ao processar recebimento em lote:', error);
      toast({ 
        title: "Erro ao processar recebimento", 
        description: "Não foi possível processar o recebimento em lote.",
        variant: "destructive"
      });
    } finally {
      setIsProcessandoLote(false);
    }
  };

  const processarParcelamentoLote = async () => {
    const contasParaProcessar = getContasSelecionadas();
    if (contasParaProcessar.length === 0) {
      toast({ title: "Nenhuma conta selecionada", variant: "destructive" });
      return;
    }

    // Filtrar apenas contas que podem ser parceladas (não recebidas e com valor pendente > 0)
    const contasValidas = contasParaProcessar.filter(conta => 
      conta.status !== 'recebido' && 
      conta.status !== 'quitada' && 
      (parseFloat(conta.valor_pendente) || 0) > 0
    );

    if (contasValidas.length === 0) {
      toast({ 
        title: "Nenhuma conta válida", 
        description: "Todas as contas selecionadas já foram recebidas ou não possuem valor pendente.",
        variant: "destructive" 
      });
      return;
    }

    // Definir data da primeira parcela como hoje se não estiver definida
    const dataPrimeiraParcela = configParcelamentoLote.dataPrimeiraParcela || 
      format(new Date(), 'yyyy-MM-dd');

    setConfigParcelamentoLote(prev => ({
      ...prev,
      dataPrimeiraParcela
    }));

    setIsParcelamentoLoteModalOpen(true);
  };

  const confirmarParcelamentoLote = async () => {
    const contasParaProcessar = getContasSelecionadas();
    console.log('Contas selecionadas para parcelamento:', contasParaProcessar);
    
    const contasValidas = contasParaProcessar.filter(conta => 
      conta.status !== 'recebido' && 
      conta.status !== 'quitada' && 
      (parseFloat(conta.valor_pendente) || 0) > 0
    );

    console.log('Contas válidas para parcelamento:', contasValidas);

    if (contasValidas.length === 0) {
      toast({ title: "Nenhuma conta válida", variant: "destructive" });
      return;
    }

    setIsProcessandoLote(true);
    setIsParcelamentoLoteModalOpen(false);

    try {
      let contasProcessadas = 0;
      let contasComErro = 0;
      const resultados = [];

      console.log(`Iniciando processamento de ${contasValidas.length} contas`);

      // Processar todas as contas em paralelo usando Promise.allSettled
      const promises = contasValidas.map(async (conta, index) => {
        console.log(`Preparando conta ${index + 1}/${contasValidas.length}: ${conta.id} - ${conta.clienteNome}`);
        
        const valorPendente = parseFloat(conta.valor_pendente) || 0;
        const valorParcela = valorPendente / configParcelamentoLote.numeroParcelas;
        
        console.log(`Processando conta ${conta.id}:`, {
          cliente: conta.clienteNome,
          valorPendente,
          numeroParcelas: configParcelamentoLote.numeroParcelas,
          valorParcela
        });
        
        // Verificar se o valor da parcela é válido
        if (valorParcela <= 0) {
          throw new Error(`Valor de parcela inválido: ${valorParcela}`);
        }
        
        // O backend vai criar as parcelas automaticamente
        console.log(`Preparando parcelamento para conta ${conta.id}:`, {
          valorPendente,
          numeroParcelas: configParcelamentoLote.numeroParcelas,
          valorParcela: valorParcela,
          dataPrimeiraParcela: configParcelamentoLote.dataPrimeiraParcela,
          intervaloDias: configParcelamentoLote.intervaloDias
        });

        // Registrar parcelamento na API
        console.log(`Enviando dados para API - Conta ${conta.id}:`, {
          contaId: conta.id,
          pagamentos: [],
          criar_parcelamento: true,
          dados_parcelamento: {
            data_primeira_parcela: configParcelamentoLote.dataPrimeiraParcela,
            intervalo_dias: configParcelamentoLote.intervaloDias,
            num_parcelas: configParcelamentoLote.numeroParcelas
          }
        });

        const response = await contaReceberService.registrarPagamentoComParcelamento(conta.id, {
          pagamentos: [], // Não enviar pagamentos quando for apenas parcelamento
          criar_parcelamento: true,
          dados_parcelamento: {
            data_primeira_parcela: configParcelamentoLote.dataPrimeiraParcela,
            intervalo_dias: configParcelamentoLote.intervaloDias,
            num_parcelas: configParcelamentoLote.numeroParcelas
          }
        });

        console.log(`Resposta da API para conta ${conta.id}:`, response);
        
        return {
          contaId: conta.id,
          cliente: conta.clienteNome,
          status: 'sucesso',
          valorParcela: valorParcela,
          response: response
        };
      });

      // Aguardar todas as promessas serem resolvidas
      const results = await Promise.allSettled(promises);
      
      // Processar resultados
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          contasProcessadas++;
          resultados.push(result.value);
        } else {
          contasComErro++;
          const conta = contasValidas[index];
          console.error(`Erro ao parcelar conta ${conta.id}:`, result.reason);
          resultados.push({
            contaId: conta.id,
            cliente: conta.clienteNome,
            status: 'erro',
            erro: result.reason.message || result.reason
          });
        }
      });

      console.log('Resumo do processamento:', {
        totalContas: contasValidas.length,
        processadas: contasProcessadas,
        comErro: contasComErro,
        resultados: resultados
      });

      // Recarregar dados da API
      const response = await contasReceberService.getContasReceber();
      let contasDaAPI = response.data || [];
      
      const contasTransformadas = contasDaAPI.map(conta => {
        const normalizarData = (dataString) => {
          if (!dataString) return new Date().toISOString();
          const data = new Date(dataString);
          return new Date(data.getFullYear(), data.getMonth(), data.getDate()).toISOString();
        };

        // Função para obter a data do último pagamento
        const getDataUltimoPagamento = (conta) => {
          if (conta.historico_pagamentos && Array.isArray(conta.historico_pagamentos) && conta.historico_pagamentos.length > 0) {
            // Ordenar pagamentos por data e pegar o mais recente
            const pagamentosOrdenados = conta.historico_pagamentos
              .filter(pag => pag.data)
              .sort((p1, p2) => new Date(p2.data) - new Date(p1.data));
            
            if (pagamentosOrdenados.length > 0) {
              return normalizarData(pagamentosOrdenados[0].data);
            }
          }
          return null;
        };
        
        return {
          id: conta.id,
          vendaId: conta.venda_id || null,
          osId: conta.os_id || null,
          envelopamentoId: conta.envelopamento_id || null,
          clienteId: conta.cliente_id,
          clienteNome: conta.cliente?.nome_completo || conta.cliente?.apelido_fantasia || 'Cliente não encontrado',
          valor_pendente: parseFloat(conta.valor_pendente) || 0,
          valor_original_divida: parseFloat(conta.valor_original) || 0,
          juros_aplicados: parseFloat(conta.juros_aplicados) || 0,
          forma_entrada: conta.descricao || 'Conta a receber',
          descricao: conta.descricao || '',
          dataLancamento: normalizarData(conta.data_emissao),
          vencimento: normalizarData(conta.data_vencimento),
          dataPagamento: getDataUltimoPagamento(conta), // Nova data de pagamento
          status: conta.status_calculado || conta.status || 'pendente',
          observacao_venda: conta.observacoes || '',
          info_adicional: conta.info_adicional || null, // Preservar info_adicional do backend
          historico_pagamentos: conta.historico_pagamentos || [],
          pagamentos: [],
          tipo_juros: conta.tipo_juros || null,
          valor_juros: conta.valor_juros || null,
          data_inicio_cobranca_juros: conta.data_inicio_cobranca_juros || null,
          frequencia_juros: conta.frequencia_juros || null,
          ultima_aplicacao_juros: conta.ultima_aplicacao_juros || null,
          total_aplicacoes_juros: conta.total_aplicacoes_juros || 0,
          historico_juros: conta.historico_juros || [],
          config_juros: null,
        };
      });

      setContas(contasTransformadas);
      deselecionarTodasContas();
      
      if (contasComErro === 0) {
        toast({ 
          title: "Sucesso!", 
          description: `${contasProcessadas} conta(s) parcelada(s) com ${configParcelamentoLote.numeroParcelas} parcela(s) cada.` 
        });
      } else {
        toast({ 
          title: "Parcialmente concluído", 
          description: `${contasProcessadas} conta(s) parcelada(s) com sucesso. ${contasComErro} conta(s) com erro.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao processar parcelamento em lote:', error);
      toast({ 
        title: "Erro ao processar parcelamento", 
        description: "Não foi possível processar o parcelamento em lote.",
        variant: "destructive"
      });
    } finally {
      setIsProcessandoLote(false);
    }
  };


  const totais = useMemo(() => {
    // Total pendente: contas com status pendente, vencido ou parcialmente pago
    const totalPendente = filteredContas
      .filter(c => c.status === 'pendente' || c.status === 'vencido' || c.status === 'parcialmente_pago')
      .reduce((acc, c) => {
        // Para contas vencidas, usar valor original se valor pendente for 0
        if (c.status === 'vencido' && parseFloat(c.valor_pendente) === 0) {
          return acc + (parseFloat(c.valor_original_divida) || 0);
        }
        return acc + (parseFloat(c.valor_pendente) || 0);
      }, 0);
    
    // Total recebido: APENAS contas com status recebido ou quitada (parceladas não são totalmente recebidas)
    const totalRecebido = filteredContas
      .filter(c => c.status === 'recebido' || c.status === 'quitada')
      .reduce((acc, c) => {
        // Usar valor original + juros para calcular o que foi recebido
        const valorOriginal = parseFloat(c.valor_original_divida) || 0;
        const juros = parseFloat(c.juros_aplicados) || 0;
        return acc + valorOriginal + juros;
      }, 0);
    
    
    return { totalPendente, totalRecebido };
  }, [filteredContas]);

  // Separar contas por status para exibição em seções
  const contasPorStatus = useMemo(() => {
    const vencidas = filteredContas.filter(c => c.status === 'vencido');
    const parceladas = filteredContas.filter(c => c.status === 'parcelada');
    const pendentes = filteredContas.filter(c => c.status === 'pendente');
    const pagas = filteredContas.filter(c => c.status === 'recebido' || c.status === 'quitada');
    const parcialmentePagas = filteredContas.filter(c => c.status === 'parcialmente_pago');

    // Ordenar contas pagas por data do último pagamento (mais recente primeiro)
    const pagasOrdenadas = pagas.sort((a, b) => {
      // Usar o campo dataPagamento que já foi calculado
      const dataA = a.dataPagamento ? new Date(a.dataPagamento) : new Date(a.dataLancamento);
      const dataB = b.dataPagamento ? new Date(b.dataPagamento) : new Date(b.dataLancamento);
      
      // Ordenar por data decrescente (mais recente primeiro)
      return dataB - dataA;
    });

    return {
      vencidas,
      parceladas,
      pendentes,
      pagas: pagasOrdenadas,
      parcialmentePagas
    };
  }, [filteredContas]);
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pendente': return <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full dark:bg-yellow-900 dark:text-yellow-300 flex items-center"><Clock size={12} className="mr-1"/>Pendente</span>;
      case 'recebido': 
      case 'quitada': return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-300 flex items-center"><CheckCircle size={12} className="mr-1"/>Recebido</span>;
      case 'vencido': return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full dark:bg-red-900 dark:text-red-300 flex items-center"><AlertCircle size={12} className="mr-1"/>Vencido</span>;
      case 'parcialmente_pago': return <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300 flex items-center"><Info size={12} className="mr-1"/>Parcial</span>;
      case 'parcelada': return <span className="px-2 py-1 text-xs font-medium text-purple-800 bg-purple-100 rounded-full dark:bg-purple-900 dark:text-purple-300 flex items-center"><DivideCircle size={12} className="mr-1"/>Parcelada</span>;
      default: return status;
    }
  };

  const getOrigemBadge = (conta) => {
    // Verificar se é uma venda PDV
    if (conta.vendaId) {
      // Verificar se tem metadados indicando origem PDV
      if (conta.observacao_venda && conta.observacao_venda.includes('PDV')) {
        return <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center"><FileText size={12} className="mr-1"/>PDV</span>;
      }
      // Verificar se tem código de venda no formato VEN
      if (conta.observacao_venda && conta.observacao_venda.includes('VEN')) {
        return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-300 flex items-center justify-center"><FileText size={12} className="mr-1"/>Venda</span>;
      }
      return <span className="px-2 py-1 text-xs font-medium text-purple-800 bg-purple-100 rounded-full dark:bg-purple-900 dark:text-purple-300 flex items-center justify-center"><FileText size={12} className="mr-1"/>Venda</span>;
    }
    
    // Verificar se é uma OS (Ordem de Serviço)
    if (conta.observacao_venda && (conta.observacao_venda.includes('OS') || conta.observacao_venda.includes('Ordem de Serviço'))) {
      return <span className="px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full dark:bg-orange-900 dark:text-orange-300 flex items-center justify-center"><FileText size={12} className="mr-1"/>OS</span>;
    }
    
    // Verificar se é um Envelopamento
    if (conta.observacao_venda && (conta.observacao_venda.includes('ENV') || conta.observacao_venda.includes('Envelopamento'))) {
      return <span className="px-2 py-1 text-xs font-medium text-indigo-800 bg-indigo-100 rounded-full dark:bg-indigo-900 dark:text-indigo-300 flex items-center justify-center"><FileText size={12} className="mr-1"/>Envelopamento</span>;
    }
    
    // Verificar se é um orçamento
    if (conta.observacao_venda && (conta.observacao_venda.includes('Orçamento') || conta.observacao_venda.includes('ORC'))) {
      return <span className="px-2 py-1 text-xs font-medium text-teal-800 bg-teal-100 rounded-full dark:bg-teal-900 dark:text-teal-300 flex items-center justify-center"><FileText size={12} className="mr-1"/>Orçamento</span>;
    }
    
    // Verificar se é crediário
    if (conta.observacao_venda && conta.observacao_venda.includes('Crediário')) {
      return <span className="px-2 py-1 text-xs font-medium text-amber-800 bg-amber-100 rounded-full dark:bg-amber-900 dark:text-amber-300 flex items-center justify-center"><FileText size={12} className="mr-1"/>Crediário</span>;
    }
    
    // Padrão para lançamentos manuais
    return <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full dark:bg-gray-800 dark:text-gray-300 flex items-center justify-center"><CalendarIcon size={12} className="mr-1"/>Lançamento</span>;
  };

  const getCodigoReferencia = (conta) => {
    // Para OS (Ordem de Serviço), usar os_id se disponível
    if (conta.osId) {
      return `OS-${conta.osId}`;
    }
    
    // Fallback: Para OS sem os_id, mostrar "OS-" + ID da conta
    if (conta.observacao_venda && (conta.observacao_venda.includes('OS') || conta.observacao_venda.includes('Ordem de Serviço'))) {
      return `OS-${conta.id}`;
    }
    
    // Para envelopamentos, usar envelopamentoId se disponível, senão usar ID da conta
    if (conta.observacao_venda && conta.observacao_venda.includes('ENV')) {
      return conta.envelopamentoId ? `ENV-${conta.envelopamentoId}` : `ENV-${conta.id}`;
    }
    
    // Para vendas PDV, usar vendaId se disponível, senão usar ID da conta
    if (conta.observacao_venda && conta.observacao_venda.includes('VEN')) {
      return conta.vendaId ? `PDV-${conta.vendaId}` : `PDV-${conta.id}`;
    }
    
    // Se tiver vendaId, usar ele
    if (conta.vendaId) {
      return conta.vendaId;
    }
    
    // Fallback para ID da conta
    return conta.id;
  };

  // Função para renderizar uma seção de contas
  const renderSecaoContas = (titulo, contas, cor, icone, total) => {
    if (contas.length === 0) return null;

    const contasSelecionadasNestaSecao = contas.filter(conta => contasSelecionadas.has(conta.id));
    const todasSelecionadas = contas.every(conta => contasSelecionadas.has(conta.id));
    const algumasSelecionadas = contasSelecionadasNestaSecao.length > 0;

    return (
      <Card key={titulo} className="mb-6 border-l-4" style={{ borderLeftColor: cor }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0">
              <div className="flex items-center">
                {icone}
                <CardTitle className="text-base sm:text-lg font-semibold ml-2">{titulo}</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 rounded-full">
                  {contas.length} conta{contas.length !== 1 ? 's' : ''}
                </span>
                {algumasSelecionadas && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded-full">
                    {contasSelecionadasNestaSecao.length} selecionada{contasSelecionadasNestaSecao.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            {isAdmin && (
              <div className="text-left sm:text-right">
                <p className="text-xs sm:text-sm text-muted-foreground">Total da Seção</p>
                <p className="text-base sm:text-lg font-bold" style={{ color: cor }}>{formatCurrency(total)}</p>
              </div>
            )}
          </div>
          
          {/* Botões de ação em lote */}
          {algumasSelecionadas && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    {contasSelecionadasNestaSecao.length} conta(s) selecionada(s) - Total: {formatCurrency(contasSelecionadasNestaSecao.reduce((acc, c) => acc + (parseFloat(c.valor_pendente) || 0), 0))}
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                  <Button
                    size="sm"
                    onClick={() => abrirModalRecebimentoLote()}
                    disabled={isProcessandoLote}
                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                  >
                    <DollarSign size={14} className="mr-1" />
                    {isProcessandoLote ? 'Processando...' : 'Marcar como Recebido'}
                  </Button>
                  {/* <Button
                    size="sm"
                    variant="outline"
                    onClick={() => processarParcelamentoLote()}
                    disabled={isProcessandoLote}
                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 w-full sm:w-auto"
                  >
                    <DivideCircle size={14} className="mr-1" />
                    Parcelar Dívida
                  </Button> */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deselecionarTodasContas()}
                    className="border-gray-500 text-gray-600 hover:bg-gray-50 w-full sm:w-auto"
                  >
                    <Square size={14} className="mr-1" />
                    Desmarcar Todas
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {/* Layout Mobile - Cards */}
          <div className="md:hidden space-y-3">
            {contas.map(conta => (
              <motion.div
                key={conta.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={contasSelecionadas.has(conta.id)}
                      onCheckedChange={() => toggleSelecaoConta(conta.id)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div>
                      <h3 className="font-semibold text-sm break-words">{conta.clienteNome}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(conta.status)}
                        <Badge variant="outline" className="text-xs">
                          {getOrigemBadge(conta)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor da Conta</p>
                    <p className="font-semibold text-gray-600 dark:text-gray-400">{formatCurrency(parseFloat(conta.valor_original_divida) || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Devido</p>
                    <p className="font-semibold text-primary">{formatCurrency(parseFloat(conta.valor_pendente) || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vencimento</p>
                    <p className="text-sm">
                      {isValid(parseISO(conta.vencimento)) ? 
                        format(parseISO(conta.vencimento), 'dd/MM/yyyy') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data Pagamento</p>
                    <p className="text-sm">
                      {conta.dataPagamento && isValid(parseISO(conta.dataPagamento)) ? 
                        format(parseISO(conta.dataPagamento), 'dd/MM/yyyy') : '-'}
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-muted-foreground">Código Ref.</p>
                  <p className="text-sm font-mono">{getCodigoReferencia(conta)}</p>
                </div>

                {(() => {
                  const observacoes = (() => {
                    if (conta.osId) {
                      // Para OS, combinar observações gerais da OS com observações dos itens
                      const observacoesOS = conta.info_adicional?.observacoes || conta.observacao_venda || '';
                      const observacoesItens = conta.info_adicional?.observacoes_itens || '';
                      
                      
                      let todasObservacoes = [];
                      if (observacoesOS.trim()) {
                        todasObservacoes.push(observacoesOS.trim());
                      }
                      if (observacoesItens.trim()) {
                        todasObservacoes.push(observacoesItens.trim());
                      }
                      
                      return todasObservacoes.join('\n');
                      } else if (conta.envelopamentoId) {
                      // Para Envelopamento, usar observações do info_adicional (igual às OS)
                      const observacoesEnvelopamento = conta.info_adicional?.observacoes || conta.observacao_venda || '';
                      return observacoesEnvelopamento;
                    } else {
                      return conta.descricao || conta.observacao_venda || '';
                    }
                  })();
                  
                  return observacoes && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground">Observações</p>
                      <p className="text-xs break-words whitespace-pre-wrap">{observacoes}</p>
                    </div>
                  );
                })()}

                <div className="flex flex-wrap gap-1">
                  <Button variant="outline" size="xs" onClick={() => handleOpenDetalhesModal(conta)} className="text-blue-600 border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-800/50 text-xs px-2 py-1">
                    <Info size={12} className="mr-1"/> Detalhes
                  </Button>
                  <Button variant="outline" size="xs" onClick={() => handleOpenProdutosServicos(conta)} className="text-purple-600 border-purple-500 hover:bg-purple-100 dark:hover:bg-purple-800/50 text-xs px-2 py-1">
                    <ShoppingCart size={12} className="mr-1"/> Produtos
                  </Button>
                  {(conta.status !== 'recebido' && conta.status !== 'quitada') && (
                    <>
                      {(parseFloat(conta.valor_pendente) || 0) > 0 && (
                        <Button variant="outline" size="xs" onClick={() => handleOpenParcelarDividaModal(conta)} className="text-yellow-600 border-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-800/50 text-xs px-2 py-1">
                          <DivideCircle size={12} className="mr-1"/> Parcelar
                        </Button>
                      )}
                      <Button variant="outline" size="xs" onClick={() => handleOpenRecebimentoModal(conta)} className="text-green-600 border-green-500 hover:bg-green-100 dark:hover:bg-green-800/50 text-xs px-2 py-1">
                        <DollarSign size={12} className="mr-1"/> Receber
                      </Button>
                      <Button variant="outline" size="xs" onClick={() => handleOpenAplicarJurosModal(conta)} className="text-xs px-2 py-1">
                        <Percent size={12} className="mr-1"/> Juros
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Layout Desktop - Tabela */}
          <div className="hidden md:block overflow-x-auto">
            <div className="min-w-[1200px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 dark:bg-muted/20">
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={todasSelecionadas}
                        onCheckedChange={() => toggleSelecaoTodasContas(contas)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </TableHead>
                    <TableHead className="min-w-[150px]">Cliente</TableHead>
                    <TableHead className="text-right min-w-[120px]">Valor da Conta</TableHead>
                    <TableHead className="text-right min-w-[120px]">Valor Devido</TableHead>
                    <TableHead className="text-center min-w-[100px]">Status</TableHead>
                    <TableHead className="text-center min-w-[100px]">Vencimento</TableHead>
                    <TableHead className="text-center min-w-[100px]">Data Pagamento</TableHead>
                    <TableHead className="text-center min-w-[100px]">Origem</TableHead>
                    <TableHead className="text-center min-w-[120px]">Código Ref.</TableHead>
                    <TableHead className="text-center min-w-[200px]">Observações</TableHead>
                    <TableHead className="text-right min-w-[220px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contas.map(conta => (
                    <TableRow key={conta.id} className="hover:bg-accent/50 dark:hover:bg-accent/20">
                      <TableCell className="w-[50px]">
                        <Checkbox
                          checked={contasSelecionadas.has(conta.id)}
                          onCheckedChange={() => toggleSelecaoConta(conta.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableCell>
                      <TableCell className="font-medium min-w-[150px]">{conta.clienteNome}</TableCell>
                      <TableCell className="text-right font-semibold text-gray-600 dark:text-gray-400 min-w-[120px]">{formatCurrency(parseFloat(conta.valor_original_divida) || 0)}</TableCell>
                      <TableCell className="text-right font-semibold text-primary min-w-[120px]">{formatCurrency(parseFloat(conta.valor_pendente) || 0)}</TableCell>
                      <TableCell className="text-center min-w-[100px]">{getStatusBadge(conta.status)}</TableCell>
                      <TableCell className="text-center min-w-[100px]">
                        {isValid(parseISO(conta.vencimento)) ? 
                          format(parseISO(conta.vencimento), 'dd/MM/yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-center min-w-[100px]">
                        {conta.dataPagamento && isValid(parseISO(conta.dataPagamento)) ? 
                          format(parseISO(conta.dataPagamento), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-center min-w-[100px]">
                        {getOrigemBadge(conta)}
                      </TableCell>
                      <TableCell className="text-center text-sm font-mono min-w-[120px]">
                        {getCodigoReferencia(conta)}
                      </TableCell>
                      <TableCell className="text-center min-w-[200px]">
                        <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                          {(() => {
                            if (conta.osId) {
                              // Para OS, combinar observações gerais da OS com observações dos itens
                              const observacoesOS = conta.info_adicional?.observacoes || conta.observacao_venda || '';
                              const observacoesItens = conta.info_adicional?.observacoes_itens || '';
                              
                              
                              let todasObservacoes = [];
                              if (observacoesOS.trim()) {
                                todasObservacoes.push(observacoesOS.trim());
                              }
                              if (observacoesItens.trim()) {
                                todasObservacoes.push(observacoesItens.trim());
                              }
                              
                              return todasObservacoes.join('\n');
                            } else if (conta.envelopamentoId) {
                              // Para Envelopamento, usar observações do info_adicional (igual às OS)
                              const observacoesEnvelopamento = conta.info_adicional?.observacoes || conta.observacao_venda || '';
                              return observacoesEnvelopamento;
                            } else {
                              // Para outras contas, usar descrição ou observações
                              return conta.descricao || conta.observacao_venda || '';
                            }
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right min-w-[220px]">
                        <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                          <Button variant="outline" size="xs" onClick={() => handleOpenDetalhesModal(conta)} className="text-blue-600 border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-800/50 text-xs px-2 py-1">
                            <Info size={12} className="mr-1"/> Detalhes
                          </Button>
                          <Button variant="outline" size="xs" onClick={() => handleOpenProdutosServicos(conta)} className="text-purple-600 border-purple-500 hover:bg-purple-100 dark:hover:bg-purple-800/50 text-xs px-2 py-1">
                            <ShoppingCart size={12} className="mr-1"/> Produtos
                          </Button>
                          {(conta.status !== 'recebido' && conta.status !== 'quitada') && (
                            <>
                              {(parseFloat(conta.valor_pendente) || 0) > 0 && (
                                <Button variant="outline" size="xs" onClick={() => handleOpenParcelarDividaModal(conta)} className="text-yellow-600 border-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-800/50 text-xs px-2 py-1">
                                  <DivideCircle size={12} className="mr-1"/> Parcelar Dívida
                                </Button>
                              )}
                              <Button variant="outline" size="xs" onClick={() => handleOpenRecebimentoModal(conta)} className="text-green-600 border-green-500 hover:bg-green-100 dark:hover:bg-green-800/50 text-xs px-2 py-1">
                                <DollarSign size={12} className="mr-1"/> Receber
                              </Button>
                              <Button variant="outline" size="xs" onClick={() => handleOpenAplicarJurosModal(conta)} className="text-xs px-2 py-1">
                                <Percent size={12} className="mr-1"/> Juros
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <Card className="shadow-xl border-border">
        <CardHeader className="border-b">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold flex items-center"><ShoppingCart size={24} className="mr-2 sm:mr-3 text-primary"/>Crediário</CardTitle>
              <CardDescription className="text-sm sm:text-base">Gerencie as compras feitas via crediário pelos seus clientes.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {isAdmin && (
                <>
                  <Card className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700">
                      <p className="text-xs text-green-600 dark:text-green-400">Total Quitado (Filtro)</p>
                      <p className="text-base sm:text-lg font-bold text-green-700 dark:text-green-300">{formatCurrency(totais.totalRecebido)}</p>
                  </Card>
                  <Card className="p-2 sm:p-3 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700">
                      <p className="text-xs text-red-600 dark:text-red-400">Total em Aberto (Filtro)</p>
                      <p className="text-base sm:text-lg font-bold text-red-700 dark:text-red-300">{formatCurrency(totais.totalPendente)}</p>
                  </Card>
                </>
              )}
              {contasSelecionadas.size > 0 && (
                <Card className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Contas Selecionadas</p>
                  <p className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300">
                    {contasSelecionadas.size} conta{contasSelecionadas.size !== 1 ? 's' : ''} - {formatCurrency(getTotalSelecionado())}
                  </p>
                </Card>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 mb-6 p-4 border rounded-lg bg-card">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filtroStatus">Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger id="filtroStatus"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="recebido">Recebido</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="parcialmente_pago">Parcialmente Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filtroCliente">Cliente ou observações</Label>
                <Input id="filtroCliente" placeholder="Nome do cliente ou observações" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="tipoFiltroData">Filtrar por</Label>
                <Select value={tipoFiltroData} onValueChange={setTipoFiltroData}>
                  <SelectTrigger id="tipoFiltroData"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vencimento">Data de Vencimento</SelectItem>
                    <SelectItem value="pagamento">Data de Pagamento</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {tipoFiltroData === 'vencimento' 
                    ? 'Filtrando por data de vencimento' 
                    : 'Filtrando por data de pagamento (apenas contas pagas)'}
                </p>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filtroPeriodoInicio">Data (Início)</Label>
                <Input id="filtroPeriodoInicio" type="date" value={filtroPeriodo.inicio} onChange={(e) => setFiltroPeriodo(prev => ({...prev, inicio: e.target.value}))} />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filtroPeriodoFim">Data (Fim)</Label>
                <Input id="filtroPeriodoFim" type="date" value={filtroPeriodo.fim} onChange={(e) => setFiltroPeriodo(prev => ({...prev, fim: e.target.value}))} />
              </div>
            </div>
          </div>

          {/* Botões de Ação Global para Contas Selecionadas */}
          {contasSelecionadas.size > 0 && (
            <div className="mb-6 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    {contasSelecionadas.size} conta(s) selecionada(s) - Total: {formatCurrency(getTotalSelecionado())}
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                  <Button
                    onClick={() => abrirModalRecebimentoLote()}
                    disabled={isProcessandoLote}
                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                  >
                    <DollarSign size={16} className="mr-2" />
                    {isProcessandoLote ? 'Processando...' : 'Marcar Todas como Recebidas'}
                  </Button>
                  {/* <Button
                    variant="outline"
                    onClick={() => processarParcelamentoLote()}
                    disabled={isProcessandoLote}
                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 w-full sm:w-auto"
                  >
                    <DivideCircle size={16} className="mr-2" />
                    Parcelar Dívidas
                  </Button> */}
                  <Button
                    variant="outline"
                    onClick={() => deselecionarTodasContas()}
                    className="border-gray-500 text-gray-600 hover:bg-gray-50 w-full sm:w-auto"
                  >
                    <Square size={16} className="mr-2" />
                    Desmarcar Todas
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Botões de Filtro por Seção */}
          <div className="mb-6 p-3 sm:p-4 border rounded-lg bg-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 mb-4">
              <Button
                variant={secoesVisiveis.vencidas ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSecao('vencidas')}
                className="flex items-center justify-center text-xs sm:text-sm"
              >
                <AlertCircle size={14} className="mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Vencidas</span>
                <span className="sm:hidden">Venc.</span>
                <span className="ml-1">({contasPorStatus.vencidas.length})</span>
              </Button>
              <Button
                variant={secoesVisiveis.pendentes ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSecao('pendentes')}
                className="flex items-center justify-center text-xs sm:text-sm"
              >
                <Clock size={14} className="mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Pendentes</span>
                <span className="sm:hidden">Pend.</span>
                <span className="ml-1">({contasPorStatus.pendentes.length})</span>
              </Button>
              <Button
                variant={secoesVisiveis.parcialmentePagas ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSecao('parcialmentePagas')}
                className="flex items-center justify-center text-xs sm:text-sm"
              >
                <Info size={14} className="mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Parcialmente Pagas</span>
                <span className="sm:hidden">Parc.</span>
                <span className="ml-1">({contasPorStatus.parcialmentePagas.length})</span>
              </Button>
              <Button
                variant={secoesVisiveis.parceladas ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSecao('parceladas')}
                className="flex items-center justify-center text-xs sm:text-sm"
              >
                <DivideCircle size={14} className="mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Parceladas</span>
                <span className="sm:hidden">Parc.</span>
                <span className="ml-1">({contasPorStatus.parceladas.length})</span>
              </Button>
              <Button
                variant={secoesVisiveis.pagas ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSecao('pagas')}
                className="flex items-center justify-center text-xs sm:text-sm"
              >
                <CheckCircle size={14} className="mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Pagas</span>
                <span className="sm:hidden">Pagas</span>
                <span className="ml-1">({contasPorStatus.pagas.length})</span>
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={mostrarTodasSecoes}
                className="text-green-600 border-green-500 hover:bg-green-50 flex items-center justify-center text-xs sm:text-sm w-full sm:w-auto"
              >
                <CheckSquare size={14} className="mr-1 sm:mr-2" />
                Mostrar Todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={ocultarTodasSecoes}
                className="text-gray-600 border-gray-500 hover:bg-gray-50 flex items-center justify-center text-xs sm:text-sm w-full sm:w-auto"
              >
                <Square size={14} className="mr-1 sm:mr-2" />
                Ocultar Todas
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {filteredContas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg">Nenhuma conta encontrada com os filtros aplicados.</p>
              </div>
            ) : (
              <>
                {/* Seção de Contas Vencidas */}
                {secoesVisiveis.vencidas && renderSecaoContas(
                  "Crediário Vencido",
                  contasPorStatus.vencidas,
                  "#ef4444",
                  <AlertCircle size={20} className="text-red-600" />,
                  contasPorStatus.vencidas.reduce((acc, c) => {
                    if (parseFloat(c.valor_pendente) === 0) {
                      return acc + (parseFloat(c.valor_original_divida) || 0);
                    }
                    return acc + (parseFloat(c.valor_pendente) || 0);
                  }, 0)
                )}

                {/* Seção de Contas Pendentes */}
                {secoesVisiveis.pendentes && renderSecaoContas(
                  "Crediário Pendente",
                  contasPorStatus.pendentes,
                  "#eab308",
                  <Clock size={20} className="text-yellow-600" />,
                  contasPorStatus.pendentes.reduce((acc, c) => acc + (parseFloat(c.valor_pendente) || 0), 0)
                )}

                {/* Seção de Contas Parcialmente Pagas */}
                {secoesVisiveis.parcialmentePagas && renderSecaoContas(
                  "Crediário Parcialmente Pago",
                  contasPorStatus.parcialmentePagas,
                  "#3b82f6",
                  <Info size={20} className="text-blue-600" />,
                  contasPorStatus.parcialmentePagas.reduce((acc, c) => acc + (parseFloat(c.valor_pendente) || 0), 0)
                )}

                {/* Seção de Contas Parceladas */}
                {secoesVisiveis.parceladas && renderSecaoContas(
                  "Crediário Parcelado",
                  contasPorStatus.parceladas,
                  "#8b5cf6",
                  <DivideCircle size={20} className="text-purple-600" />,
                  contasPorStatus.parceladas.reduce((acc, c) => acc + (parseFloat(c.valor_pendente) || 0), 0)
                )}

                {/* Seção de Contas Pagas */}
                {secoesVisiveis.pagas && renderSecaoContas(
                  "Crediário Quitado",
                  contasPorStatus.pagas,
                  "#10b981",
                  <CheckCircle size={20} className="text-green-600" />,
                  contasPorStatus.pagas.reduce((acc, c) => {
                    // Usar valor original + juros para calcular o que foi recebido
                    const valorOriginal = parseFloat(c.valor_original_divida) || 0;
                    const juros = parseFloat(c.juros_aplicados) || 0;
                    return acc + valorOriginal + juros;
                  }, 0)
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      {isRecebimentoModalOpen && (
        <RecebimentoModal 
            open={isRecebimentoModalOpen}
            onOpenChange={setIsRecebimentoModalOpen}
            conta={contaParaAcao}
            onConfirmPagamento={handleConfirmPagamento}
            onDividirConta={handleDividirContaEAdicionarNovas}
            modoParcelamento={modoParcelamento}
        />
      )}
      
      <Dialog open={isAplicarJurosModalOpen} onOpenChange={setIsAplicarJurosModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar Juros/Multa (Agora)</DialogTitle>
            <DialogDescription>Cliente: {contaParaAcao?.clienteNome}</DialogDescription>
            <DialogDescription>Valor Pendente Atual: {formatCurrency(parseFloat(contaParaAcao?.valor_pendente) || 0)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <Label>Aplicar Juros/Multa sobre o valor pendente</Label>
            <div className="flex gap-2">
              <Select value={jurosParaAplicar.tipo} onValueChange={(v) => setJurosParaAplicar(p => ({...p, tipo: v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="percentual">Percentual (%)</SelectItem><SelectItem value="fixo">Valor Fixo (R$)</SelectItem></SelectContent>
              </Select>
              <Input type="number" placeholder="Valor" value={jurosParaAplicar.valor} onChange={e => setJurosParaAplicar(p => ({...p, valor: e.target.value}))}/>
            </div>
             {contaParaAcao?.tipo_juros && (
                <div className="text-xs p-2 bg-blue-50 dark:bg-blue-900/40 rounded border border-blue-200 dark:border-blue-700">
                    <p className="font-medium text-blue-700 dark:text-blue-300">Esta conta possui uma configuração de juros programada:</p>
                    <p>Tipo: {contaParaAcao.tipo_juros}, Valor: {contaParaAcao.valor_juros}{contaParaAcao.tipo_juros === 'percentual' ? '%' : ' R$'}, Frequência: {contaParaAcao.frequencia_juros}.</p>
                    <p>Data de início: {contaParaAcao.data_inicio_cobranca_juros ? format(parseISO(contaParaAcao.data_inicio_cobranca_juros), 'dd/MM/yyyy') : 'N/A'}.</p>
                    <p>Aplicar juros agora pode ser adicional a essa configuração.</p>
                </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAplicarJurosModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAplicarJurosConfirmado}><Percent size={16} className="mr-2"/>Aplicar Juros</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isDetalhesModalOpen && contaParaAcao && (
        <ContaReceberDetalhesModal
          isOpen={isDetalhesModalOpen}
          onClose={() => setIsDetalhesModalOpen(false)}
          conta={contaParaAcao}
          logoUrl={logoUrl}
          nomeEmpresa={nomeEmpresa}
          onAplicarJuros={() => { // Este é o "Aplicar Juros (Agora)"
            setIsDetalhesModalOpen(false); 
            handleOpenAplicarJurosModal(contaParaAcao); 
          }}
          onSalvarConfigJuros={handleSalvarConfigJurosNaConta}
        />
      )}

      {/* Card de Produtos e Serviços */}
      {isProdutosServicosOpen && contaParaAcao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Produtos e Serviços - {contaParaAcao.clienteNome}</h2>
              <Button variant="outline" size="sm" onClick={() => setIsProdutosServicosOpen(false)}>
                Fechar
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <ProdutosServicosCard 
                conta={contaParaAcao} 
                isOpen={isProdutosServicosOpen} 
                onClose={() => setIsProdutosServicosOpen(false)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recebimento em Lote */}
      <Dialog open={isRecebimentoLoteModalOpen} onOpenChange={setIsRecebimentoLoteModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <DollarSign size={20} className="mr-2" />
              Recebimento em Lote
            </DialogTitle>
            <DialogDescription>
              Configure a forma de pagamento para {getContasSelecionadas().length} conta(s) selecionada(s)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Resumo das contas selecionadas */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Contas Selecionadas:</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {getContasSelecionadas().map(conta => (
                  <div key={conta.id} className="text-sm text-blue-700 dark:text-blue-400">
                    • {conta.clienteNome} - {formatCurrency(parseFloat(conta.valor_pendente) || 0)}
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                <span className="font-medium text-blue-800 dark:text-blue-300">
                  Total: {formatCurrency(getTotalSelecionado())}
                </span>
              </div>
            </div>

            {/* Configurações do recebimento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="formaPagamentoLote">Forma de Pagamento</Label>
                <Select
                  value={configRecebimentoLote.formaPagamento}
                  onValueChange={(value) => setConfigRecebimentoLote(prev => ({
                    ...prev,
                    formaPagamento: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="observacoesLote">Observações</Label>
                <Input
                  id="observacoesLote"
                  value={configRecebimentoLote.observacoes}
                  onChange={(e) => setConfigRecebimentoLote(prev => ({
                    ...prev,
                    observacoes: e.target.value
                  }))}
                  placeholder="Observações para o recebimento..."
                />
              </div>
            </div>

            {/* Preview do recebimento */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-800 dark:text-gray-300 mb-2">Preview do Recebimento:</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>• {getContasSelecionadas().length} conta(s) será(ão) marcada(s) como recebida(s)</p>
                <p>• Forma de pagamento: {configRecebimentoLote.formaPagamento}</p>
                <p>• Valor total: {formatCurrency(getTotalSelecionado())}</p>
                <p>• Observações: {configRecebimentoLote.observacoes || 'Nenhuma'}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRecebimentoLoteModalOpen(false)}
              disabled={isProcessandoLote}
            >
              Cancelar
            </Button>
            <Button 
              onClick={processarRecebimentoLote}
              disabled={isProcessandoLote}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <DollarSign size={16} className="mr-2" />
              {isProcessandoLote ? 'Processando...' : 'Confirmar Recebimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Parcelamento em Lote */}
      <Dialog open={isParcelamentoLoteModalOpen} onOpenChange={setIsParcelamentoLoteModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <DivideCircle size={20} className="mr-2" />
              Parcelamento em Lote
            </DialogTitle>
            <DialogDescription>
              Configure o parcelamento para {getContasSelecionadas().length} conta(s) selecionada(s)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Resumo das contas selecionadas */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Contas Selecionadas:</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {getContasSelecionadas().map(conta => (
                  <div key={conta.id} className="text-sm text-blue-700 dark:text-blue-400">
                    • {conta.clienteNome} - {formatCurrency(parseFloat(conta.valor_pendente) || 0)}
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                <span className="font-medium text-blue-800 dark:text-blue-300">
                  Total: {formatCurrency(getTotalSelecionado())}
                </span>
              </div>
            </div>

            {/* Configurações do parcelamento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numeroParcelas">Número de Parcelas</Label>
                <Input
                  id="numeroParcelas"
                  type="number"
                  min="2"
                  max="12"
                  value={configParcelamentoLote.numeroParcelas}
                  onChange={(e) => setConfigParcelamentoLote(prev => ({
                    ...prev,
                    numeroParcelas: parseInt(e.target.value) || 2
                  }))}
                />
              </div>
              
              <div>
                <Label htmlFor="intervaloDias">Intervalo entre Parcelas (dias)</Label>
                <Input
                  id="intervaloDias"
                  type="number"
                  min="1"
                  max="365"
                  value={configParcelamentoLote.intervaloDias}
                  onChange={(e) => setConfigParcelamentoLote(prev => ({
                    ...prev,
                    intervaloDias: parseInt(e.target.value) || 30
                  }))}
                />
              </div>
              
              <div>
                <Label htmlFor="dataPrimeiraParcela">Data da Primeira Parcela</Label>
                <Input
                  id="dataPrimeiraParcela"
                  type="date"
                  value={configParcelamentoLote.dataPrimeiraParcela}
                  onChange={(e) => setConfigParcelamentoLote(prev => ({
                    ...prev,
                    dataPrimeiraParcela: e.target.value
                  }))}
                />
              </div>
              
              <div>
                <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                <Select
                  value={configParcelamentoLote.formaPagamento}
                  onValueChange={(value) => setConfigParcelamentoLote(prev => ({
                    ...prev,
                    formaPagamento: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                value={configParcelamentoLote.observacoes}
                onChange={(e) => setConfigParcelamentoLote(prev => ({
                  ...prev,
                  observacoes: e.target.value
                }))}
                placeholder="Observações para as parcelas..."
              />
            </div>

            {/* Preview do parcelamento */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-800 dark:text-gray-300 mb-2">Preview do Parcelamento:</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>• Cada conta será dividida em {configParcelamentoLote.numeroParcelas} parcela(s)</p>
                <p>• Valor por parcela: {formatCurrency(getTotalSelecionado() / getContasSelecionadas().length / configParcelamentoLote.numeroParcelas)} (média)</p>
                <p>• Intervalo: {configParcelamentoLote.intervaloDias} dias entre parcelas</p>
                <p>• Primeira parcela: {configParcelamentoLote.dataPrimeiraParcela || 'Hoje'}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsParcelamentoLoteModalOpen(false)}
              disabled={isProcessandoLote}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmarParcelamentoLote}
              disabled={isProcessandoLote || !configParcelamentoLote.dataPrimeiraParcela}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <DivideCircle size={16} className="mr-2" />
              {isProcessandoLote ? 'Processando...' : 'Confirmar Parcelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContasReceberPage;