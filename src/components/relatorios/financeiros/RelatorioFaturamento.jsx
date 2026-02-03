import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileDown, CalendarPlus as CalendarIcon, TrendingUp, CheckCircle, Clock, Printer, Loader2, Filter, X, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, isValid, addMonths, subMonths, eachDayOfInterval, isSameMonth, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import * as XLSX from 'xlsx';
import { exportToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';
import { safeJsonParse, formatCurrency } from '@/lib/utils';
import { vendaService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';
import { motion } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const RelatorioFaturamento = () => {
  const { toast } = useToast();
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [filtros, setFiltros] = useState({
    dataInicio: new Date(),
    dataFim: new Date(),
  });
  const [empresaSettings, setEmpresaSettings] = useState({});
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Novos filtros idênticos à página de recebimento
  const [filtroFormaPagamento, setFiltroFormaPagamento] = useState('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [showDataInicioPicker, setShowDataInicioPicker] = useState(false);
  const [showDataFimPicker, setShowDataFimPicker] = useState(false);
  const [currentMonthInicio, setCurrentMonthInicio] = useState(new Date());
  const [currentMonthFim, setCurrentMonthFim] = useState(new Date());

  // Inicializar datas com a data atual
  useEffect(() => {
    const hoje = new Date();
    const dataFormatada = formatarDataParaDDMMAAAA(hoje);
    console.log('📅 Inicializando datas:', dataFormatada);
    setFiltroDataInicio(dataFormatada);
    setFiltroDataFim(dataFormatada);
    console.log('📅 Datas inicializadas - Início:', dataFormatada, 'Fim:', dataFormatada);
    
    // Forçar carregamento inicial após um pequeno delay
    setTimeout(() => {
      console.log('🔄 Forçando carregamento inicial após inicialização das datas');
      carregarDadosFaturamento();
    }, 500);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const settings = safeJsonParse(await apiDataManager.getItem('empresaSettings'), {});
        const logo = await apiDataManager.getItem('logoUrl') || '';
        setEmpresaSettings(settings);
        setLogoUrl(logo);
      } catch(error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };
    
    loadData();
  }, [toast]);

  const carregarDadosFaturamento = async () => {
    console.log('🔄 Iniciando carregamento de dados de faturamento');
    setLoading(true);
    try {
      const params = {};
      
      // Usar os novos filtros de data
      if (filtroDataInicio) {
        const dataInicio = formatarDataParaYYYYMMDD(filtroDataInicio);
        if (dataInicio) {
          params.data_inicio = dataInicio;
        }
      }
      if (filtroDataFim) {
        const dataFim = formatarDataParaYYYYMMDD(filtroDataFim);
        if (dataFim) {
          params.data_fim = dataFim;
        }
      }
      
      // Adicionar timestamp para evitar cache
      params._t = Date.now();

      console.log('🔍 Parâmetros da API de recebimentos (usando como fonte principal):', params);
      console.log('🔍 Filtros atuais:', { filtroDataInicio, filtroDataFim });
      
      // SOLUÇÃO: Usar a API de recebimentos como fonte principal, já que ela retorna todos os dados
      console.log('🔍 Chamando API de recebimentos com parâmetros:', {
        data_inicio: params.data_inicio,
        data_fim: params.data_fim,
        filtrar_por_data_recebimento: true
      });
      
      const recebimentosResponse = await vendaService.getRelatorioGeralRecebimentos({
        data_inicio: params.data_inicio,
        data_fim: params.data_fim,
        filtrar_por_data_recebimento: true
      });
      
      console.log('🔍 Resposta da API de recebimentos:', recebimentosResponse);
      console.log('🔍 Status da resposta:', recebimentosResponse?.status);
      console.log('🔍 Dados da resposta:', recebimentosResponse?.data);
      
      if (recebimentosResponse.success || recebimentosResponse.data?.success) {
        const recebimentosData = recebimentosResponse.data?.data || recebimentosResponse.data || {};
        const recebimentos = recebimentosData.recebimentos || [];
        console.log('🔍 Recebimentos encontrados:', recebimentos.length);
        console.log('🔍 Dados dos recebimentos:', recebimentos);
        console.log('🔍 Estrutura dos recebimentos:', recebimentos[0] ? Object.keys(recebimentos[0]) : 'Nenhum recebimento');
        
        // Se não há recebimentos, tentar usar dados diretos da resposta
        if (recebimentos.length === 0) {
          console.log('⚠️ Nenhum recebimento encontrado, verificando estrutura da resposta:', recebimentosData);
          // Tentar usar os dados diretamente se não estiverem em recebimentos
          const dadosDiretos = recebimentosData.recebimentos || recebimentosData || [];
          console.log('🔍 Dados diretos encontrados:', dadosDiretos.length);
        }
        
        // Transformar recebimentos em formato de vendas para o faturamento
        const recebimentosParaProcessar = recebimentos.length > 0 ? recebimentos : (recebimentosData.recebimentos || []);
        console.log('🔍 Recebimentos para processar:', recebimentosParaProcessar.length);
        
        const vendasTransformadas = recebimentosParaProcessar.map((recebimento, index) => {
          // Extrair ID numérico do recebimento
          const extrairIdNumerico = (id) => {
            if (typeof id === 'number') return id;
            if (typeof id === 'string') {
              const match = id.match(/(\d+)(?:-\d+)?$/);
              return match ? parseInt(match[1]) : null;
            }
            return null;
          };
          
          const idNumerico = extrairIdNumerico(recebimento.id);
          
          // Determinar o tipo de venda baseado no tipo do recebimento e/ou origem
          let tipoVenda = 'Outros';
          
          // Primeiro, verificar o campo tipo do recebimento
          if (recebimento.tipo === 'conta_receber_paga') {
            // Se é um pagamento de conta a receber, verificar a origem para classificar melhor
            if (recebimento.origem?.includes('Envelopamento')) {
              tipoVenda = 'Crediário Pago'; // Crediário de envelopamento
            } else if (recebimento.origem?.includes('Ordem de Serviço')) {
              tipoVenda = 'Crediário Pago'; // Crediário de OS
            } else if (recebimento.origem?.includes('Venda PDV') || recebimento.origem?.includes('PDV')) {
              tipoVenda = 'Crediário Pago'; // Crediário de PDV
            } else if (recebimento.origem?.includes('Conta Receber')) {
              tipoVenda = 'Crediário Pago'; // Conta a receber genérica
            }
          } else if (recebimento.tipo === 'venda_pdv') {
            tipoVenda = 'Venda PDV';
          } else if (recebimento.tipo === 'ordem_servico') {
            tipoVenda = 'Ordem de Serviço';
          } else if (recebimento.tipo === 'envelopamento') {
            tipoVenda = 'Envelopamento';
          } else if (recebimento.tipo === 'marketplace') {
            tipoVenda = 'Marketplace';
          } else if (recebimento.tipo === 'orcamento') {
            tipoVenda = 'Orçamento Aprovado';
          } else {
            // Fallback: classificar pela origem se o tipo não estiver definido
            if (recebimento.origem?.includes('Crediário Pago')) {
              tipoVenda = 'Crediário Pago';
            } else if (recebimento.origem?.includes('Ordem de Serviço')) {
              tipoVenda = 'Ordem de Serviço';
            } else if (recebimento.origem?.includes('Envelopamento')) {
              tipoVenda = 'Envelopamento';
            } else if (recebimento.origem?.includes('Venda PDV') || recebimento.origem?.includes('PDV')) {
              tipoVenda = 'Venda PDV';
            } else if (recebimento.origem?.includes('Marketplace')) {
              tipoVenda = 'Marketplace';
            } else if (recebimento.origem?.includes('Orçamento')) {
              tipoVenda = 'Orçamento Aprovado';
            } else if (recebimento.origem?.includes('Conta Receber')) {
              tipoVenda = 'Crediário Pago';
            }
          }
          
          const vendaTransformada = {
            id: idNumerico || recebimento.id,
            data: recebimento.data,
            cliente: recebimento.cliente,
            clienteNome: recebimento.cliente,
            total: recebimento.valor,
            desconto: 0, // Recebimentos não têm desconto separado
            tipo: tipoVenda,
            origem: recebimento.origem,
            pagamentos: [{
              metodo: recebimento.formaPagamento || 'Dinheiro',
              valor: recebimento.valor
            }]
          };
          
          // Log para debug
          if (index < 3) {
            console.log(`🔍 Recebimento ${index} transformado:`, {
              original: recebimento,
              transformado: vendaTransformada
            });
          }
          
          // Log específico para recebimentos classificados como "Outros"
          if (tipoVenda === 'Outros') {
            console.log(`⚠️ Recebimento classificado como "Outros":`, {
              id: recebimento.id,
              origem: recebimento.origem,
              tipo: recebimento.tipo,
              formaPagamento: recebimento.formaPagamento
            });
          }
          
          return vendaTransformada;
        });
        
        console.log('🔍 Vendas transformadas:', vendasTransformadas);
        console.log('🔍 Primeira venda transformada:', vendasTransformadas[0]);
        console.log('🔍 Estrutura da venda:', vendasTransformadas[0] ? Object.keys(vendasTransformadas[0]) : 'Nenhuma venda');
        
        // Calcular totais
        const faturamentoBruto = vendasTransformadas.reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0);
        const totalDescontos = vendasTransformadas.reduce((acc, v) => acc + (parseFloat(v.desconto) || 0), 0);
        const faturamentoLiquido = faturamentoBruto - totalDescontos;
        
        const totais = {
          faturamentoBruto,
          totalDescontos,
          faturamentoLiquido
        };
        
        console.log('📊 Totais calculados:', totais);
        console.log('📊 Quantidade de vendas transformadas:', vendasTransformadas.length);
        
        // Calcular estatísticas por tipo de venda
        const estatisticasPorTipo = {};
        vendasTransformadas.forEach(venda => {
          const tipo = venda.tipo;
          if (!estatisticasPorTipo[tipo]) {
            estatisticasPorTipo[tipo] = {
              quantidade: 0,
              total: 0,
              porcentagem: 0
            };
          }
          estatisticasPorTipo[tipo].quantidade += 1;
          estatisticasPorTipo[tipo].total += parseFloat(venda.total) || 0;
        });
        
        // Calcular porcentagens
        Object.keys(estatisticasPorTipo).forEach(tipo => {
          estatisticasPorTipo[tipo].porcentagem = 
            (estatisticasPorTipo[tipo].total / faturamentoBruto) * 100;
        });
        
        console.log('📊 Estatísticas por tipo:', estatisticasPorTipo);
        
        // Calcular faturamento por dia
        const faturamentoPorDia = {};
        vendasTransformadas.forEach((venda, index) => {
          if (!venda.data) {
            console.log('⚠️ Venda sem data no cálculo por dia:', venda);
            return;
          }
          
          const data = venda.data.split(' ')[0]; // Pegar apenas a data (YYYY-MM-DD)
          if (!faturamentoPorDia[data]) {
            faturamentoPorDia[data] = 0;
          }
          faturamentoPorDia[data] += parseFloat(venda.total) || 0;
          
          // Log para debug
          if (index < 3) {
            console.log(`📅 Venda ${index} - Data: ${data}, Total: ${venda.total}, Acumulado: ${faturamentoPorDia[data]}`);
          }
        });
        
        console.log('📊 Faturamento por dia calculado:', faturamentoPorDia);
        console.log('📊 Chaves do faturamento por dia:', Object.keys(faturamentoPorDia));
        
        setVendas(vendasTransformadas);
        
        console.log('✅ Dados carregados com sucesso usando API de recebimentos');
        console.log('✅ Vendas finais:', vendasTransformadas.length);
        console.log('✅ Totais calculados:', totais);
      } else {
        console.log('❌ Erro na resposta da API:', recebimentosResponse);
        console.log('❌ Success flag:', recebimentosResponse.success);
        console.log('❌ Data success flag:', recebimentosResponse.data?.success);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados de faturamento.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados de faturamento:', error);
      console.error('❌ Detalhes do erro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      toast({
        title: "Erro ao carregar dados",
        description: error.response?.data?.message || error.message || "Erro ao carregar dados de faturamento.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados quando os filtros mudarem
  useEffect(() => {
    // Só carregar se as datas estiverem inicializadas
    if (filtroDataInicio && filtroDataFim) {
      console.log('🔄 Carregando dados com filtros:', { filtroDataInicio, filtroDataFim });
      console.log('🔄 Data início convertida:', formatarDataParaYYYYMMDD(filtroDataInicio));
      console.log('🔄 Data fim convertida:', formatarDataParaYYYYMMDD(filtroDataFim));
      carregarDadosFaturamento();
    } else {
      console.log('⚠️ Datas não inicializadas ainda:', { filtroDataInicio, filtroDataFim });
    }
  }, [filtroDataInicio, filtroDataFim]);

  // Carregar dados iniciais quando o componente montar
  useEffect(() => {
    // Aguardar um pouco para garantir que as datas sejam inicializadas
    const timer = setTimeout(() => {
      if (filtroDataInicio && filtroDataFim) {
        console.log('🔄 Carregando dados iniciais:', { filtroDataInicio, filtroDataFim });
        carregarDadosFaturamento();
      } else {
        console.log('⚠️ Dados iniciais não carregados - datas não prontas:', { filtroDataInicio, filtroDataFim });
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);



  const getClienteNome = (id, nomeManual) => {
    if (nomeManual) return nomeManual;
    const cliente = clientes.find(c => c.id === id);
    return cliente?.nome || cliente?.nome_completo || 'Cliente não identificado';
  }

  // Funções para gerenciar o calendário (idênticas à página de recebimento)
  const formatarDataParaDDMMAAAA = (data) => {
    if (!data) return '';
    const d = new Date(data);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  const formatarDataParaYYYYMMDD = (dataDDMMAAAA) => {
    if (!dataDDMMAAAA) return '';
    const partes = dataDDMMAAAA.split('/');
    if (partes.length === 3 && partes[0] && partes[1] && partes[2]) {
      return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
    return '';
  };

  const handleDataInicioSelect = (data) => {
    console.log('📅 Data início selecionada:', data);
    const dataFormatada = formatarDataParaDDMMAAAA(data);
    setFiltroDataInicio(dataFormatada);
    setShowDataInicioPicker(false);
  };

  const handleDataFimSelect = (data) => {
    console.log('📅 Data fim selecionada:', data);
    const dataFormatada = formatarDataParaDDMMAAAA(data);
    setFiltroDataFim(dataFormatada);
    setShowDataFimPicker(false);
  };

  // Função para limpar todos os filtros
  const limparFiltros = () => {
    setFiltroFormaPagamento('todos');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setShowDataInicioPicker(false);
    setShowDataFimPicker(false);
  };

  const vendasFiltradas = useMemo(() => {
    console.log('🔍 Aplicando filtros - Vendas originais:', vendas.length);
    console.log('🔍 Filtros ativos:', { filtroDataInicio, filtroDataFim, filtroFormaPagamento });
    
    let filtered = [...vendas];
    
    // Filtro por data (usando os novos filtros de data)
    if (filtroDataInicio || filtroDataFim) {
      const antesFiltroData = filtered.length;
      console.log('🔍 Aplicando filtro de data - Antes:', antesFiltroData);
      console.log('🔍 Filtros de data:', { filtroDataInicio, filtroDataFim });
      
      filtered = filtered.filter(venda => {
        if (!venda.data) {
          console.log('⚠️ Venda sem data filtrada:', venda);
          return false;
        }
        
        const dataVenda = parseISO(venda.data);
        if (!isValid(dataVenda)) {
          console.log('⚠️ Venda com data inválida filtrada:', venda.data, venda);
          return false;
        }
        
        let incluirVenda = true;
        
        if (filtroDataInicio) {
          const dataInicio = new Date(formatarDataParaYYYYMMDD(filtroDataInicio));
          const dataInicioFormatada = formatarDataParaYYYYMMDD(filtroDataInicio);
          const dataVendaFormatada = format(dataVenda, 'yyyy-MM-dd');
          
          console.log('🔍 Comparando data início:', {
            dataVenda: dataVendaFormatada,
            dataInicio: dataInicioFormatada,
            venda: venda.data
          });
          
          if (dataVendaFormatada < dataInicioFormatada) {
            console.log('❌ Venda anterior à data início:', dataVendaFormatada, '<', dataInicioFormatada);
            incluirVenda = false;
          }
        }
        
        if (filtroDataFim && incluirVenda) {
          const dataFim = new Date(formatarDataParaYYYYMMDD(filtroDataFim));
          const dataFimFormatada = formatarDataParaYYYYMMDD(filtroDataFim);
          const dataVendaFormatada = format(dataVenda, 'yyyy-MM-dd');
          
          console.log('🔍 Comparando data fim:', {
            dataVenda: dataVendaFormatada,
            dataFim: dataFimFormatada,
            venda: venda.data
          });
          
          if (dataVendaFormatada > dataFimFormatada) {
            console.log('❌ Venda posterior à data fim:', dataVendaFormatada, '>', dataFimFormatada);
            incluirVenda = false;
          }
        }
        
        if (incluirVenda) {
          console.log('✅ Venda incluída no filtro:', venda.data);
        }
        
        return incluirVenda;
      });
      console.log('🔍 Após filtro de data:', antesFiltroData, '->', filtered.length);
    }
    
    // Filtro por forma de pagamento
    if (filtroFormaPagamento !== 'todos') {
      const antesFiltroForma = filtered.length;
      filtered = filtered.filter(venda => {
        const formasPagamento = venda.pagamentos?.map(p => p.metodo) || [];
        return formasPagamento.includes(filtroFormaPagamento);
      });
      console.log('🔍 Após filtro de forma de pagamento:', antesFiltroForma, '->', filtered.length);
    }
    
    console.log('🔍 Vendas filtradas finais:', filtered.length);
    console.log('🔍 Primeira venda filtrada:', filtered[0]);
    return filtered;
  }, [vendas, filtroDataInicio, filtroDataFim, filtroFormaPagamento]);

  const totaisCalculados = useMemo(() => {
    const faturamentoBruto = vendasFiltradas.reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0);
    const totalDescontos = vendasFiltradas.reduce((acc, v) => acc + (parseFloat(v.desconto) || 0), 0);
    const faturamentoLiquido = faturamentoBruto - totalDescontos;
    return { faturamentoBruto, totalDescontos, faturamentoLiquido };
  }, [vendasFiltradas]);

  // Extrair formas de pagamento únicas dos dados
  const formasPagamentoDisponiveis = useMemo(() => {
    const formas = new Set();
    vendas.forEach(venda => {
      if (venda.pagamentos && Array.isArray(venda.pagamentos)) {
        venda.pagamentos.forEach(pagamento => {
          if (pagamento.metodo) {
            formas.add(pagamento.metodo);
          }
        });
      }
    });
    return Array.from(formas);
  }, [vendas]);

  // Estatísticas por tipo de venda
  const estatisticasPorTipo = useMemo(() => {
    const tipos = {};
    vendasFiltradas.forEach(venda => {
      const tipo = venda.tipo || 'Não especificado';
      if (!tipos[tipo]) {
        tipos[tipo] = { count: 0, total: 0, porcentagem: 0 };
      }
      tipos[tipo].count++;
      tipos[tipo].total += parseFloat(venda.total) || 0;
    });
    
    // Calcular porcentagens
    const totalGeral = Object.values(tipos).reduce((acc, tipo) => acc + tipo.total, 0);
    Object.keys(tipos).forEach(tipo => {
      tipos[tipo].porcentagem = totalGeral > 0 ? (tipos[tipo].total / totalGeral) * 100 : 0;
    });
    
    console.log('📊 Estatísticas por tipo calculadas:', tipos);
    return tipos;
  }, [vendasFiltradas]);

  const chartData = useMemo(() => {
    console.log('📊 Calculando chartData com vendasFiltradas:', vendasFiltradas.length);
    console.log('📊 VendasFiltradas detalhadas:', vendasFiltradas);
    
    const faturamentoPorDia = vendasFiltradas.reduce((acc, venda, index) => {
      if (!venda.data) {
        console.log('⚠️ Venda sem data no gráfico:', venda);
        return acc;
      }
      
      // Tentar diferentes formatos de data
      let dataVenda;
      if (venda.data.includes(' ')) {
        // Formato: "2025-10-21 14:27:45"
        dataVenda = parseISO(venda.data);
      } else {
        // Formato: "2025-10-21"
        dataVenda = parseISO(venda.data);
      }
      
      if (!isValid(dataVenda)) {
        console.log('⚠️ Data inválida no gráfico:', venda.data, 'venda:', venda);
        return acc;
      }
      
      const dia = format(dataVenda, 'dd/MM/yyyy');
      acc[dia] = (acc[dia] || 0) + (parseFloat(venda.total) || 0);
      
      // Log para debug
      if (index < 3) {
        console.log(`📅 Gráfico - Venda ${index} - Dia: ${dia}, Valor: ${venda.total}, Acumulado: ${acc[dia]}`);
      }
      
      return acc;
    }, {});

    console.log('📊 Faturamento por dia calculado:', faturamentoPorDia);

    const labels = Object.keys(faturamentoPorDia).sort((a, b) => {
        const dateA = parseISO(a.split('/').reverse().join('-'));
        const dateB = parseISO(b.split('/').reverse().join('-'));
        if (!isValid(dateA) || !isValid(dateB)) {
          console.log('⚠️ Data inválida na ordenação:', { a, b, dateA, dateB });
          return 0;
        }
        return dateA - dateB;
    });
    const data = labels.map(label => faturamentoPorDia[label]);
    
    console.log('📊 Labels ordenados:', labels);
    console.log('📊 Data values:', data);

    const chartDataResult = {
      labels,
      datasets: [
        {
          label: 'Faturamento Bruto por Dia',
          data,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };
    
    console.log('📊 ChartData final:', chartDataResult);
    console.log('📊 Labels:', labels);
    console.log('📊 Data values:', data);
    return chartDataResult;
  }, [vendasFiltradas]);

  // Componente de calendário (idêntico à página de recebimento)
  const CalendarPicker = ({ isOpen, onClose, onSelect, currentMonth, setCurrentMonth, selectedDate }) => {
    if (!isOpen) return null;

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-4 w-80">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => (
              <button
                key={day.toISOString()}
                onClick={() => onSelect(day)}
                className={`
                  p-2 text-sm rounded hover:bg-blue-100
                  ${isSameMonth(day, currentMonth) ? 'text-gray-900' : 'text-gray-400'}
                  ${selectedDate && isSameDay(day, selectedDate) ? 'bg-blue-500 text-white' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            ))}
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    );
  };


  const handleExportPDF = () => {
    if (vendasFiltradas.length === 0) {
        toast({ title: "Nenhum dado para exportar", description: "Filtre os dados antes de exportar.", variant: "default" });
        return;
    }
    
    // Cabeçalhos da tabela
    const headers = ['Data', 'Tipo', 'Cliente', 'Forma Pag.', 'Total', 'Desconto', 'Total Líquido', 'Origem'];
    
    // Dados formatados para o PDF - mais limpos
    const data = vendasFiltradas.map(v => {
        const dataVenda = v.data ? parseISO(v.data) : null;
        const total = parseFloat(v.total) || 0;
        const desconto = parseFloat(v.desconto) || 0;
        const totalLiquido = total - desconto;
        
        // Limpar e truncar textos longos para evitar quebras
        const cliente = (getClienteNome(v.clienteId, v.clienteNome) || 'Cliente não identificado').substring(0, 20);
        const origem = (v.origem || 'N/A').substring(0, 25);
        const formaPag = v.pagamentos?.map(p => p.metodo).join(', ') || 'N/A';
        const formaPagLimpa = formaPag.length > 15 ? formaPag.substring(0, 15) + '...' : formaPag;
        
        return [
            isValid(dataVenda) ? format(dataVenda, 'dd/MM/yyyy') : 'Data Inválida',
            (v.tipo || 'N/A').substring(0, 15),
            cliente,
            formaPagLimpa,
            formatCurrency(total),
            formatCurrency(desconto),
            formatCurrency(totalLiquido),
            origem
        ];
    });
    
    // Resumo do relatório
    const summary = [
        { 
            label: 'Faturamento Bruto (Filtrado)', 
            value: formatCurrency(totaisCalculados.faturamentoBruto || 0)
        },
        { 
            label: 'Total Descontos (Filtrado)', 
            value: formatCurrency(totaisCalculados.totalDescontos || 0)
        },
        { 
            label: 'Faturamento Líquido (Filtrado)', 
            value: formatCurrency(totaisCalculados.faturamentoLiquido || 0)
        }
    ];
    
    // Gerar PDF
    exportToPdf('Relatório de Faturamento', headers, data, summary, logoUrl, empresaSettings.nomeFantasia);
    toast({ title: "PDF Gerado", description: "O relatório de faturamento foi exportado." });
  };

  const handleExportExcel = () => {
    if (vendasFiltradas.length === 0) {
        toast({ title: "Nenhum dado para exportar", description: "Filtre os dados antes de exportar.", variant: "default" });
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(vendasFiltradas.map(v => {
        const dataVenda = v.data ? parseISO(v.data) : null;
        return {
            Data: isValid(dataVenda) ? format(dataVenda, 'dd/MM/yyyy') : 'Data Inválida',
            Tipo: v.tipo,
            Cliente: getClienteNome(v.clienteId, v.clienteNome),
            'Forma de Pagamento': v.pagamentos?.map(p => p.metodo).join(', ') || 'N/A',
            'Total Bruto': parseFloat(v.total) || 0,
            'Desconto': parseFloat(v.desconto) || 0,
            'Total Líquido': (parseFloat(v.total) || 0) - (parseFloat(v.desconto) || 0),
            'Origem': v.origem || 'N/A'
        };
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Faturamento");
    XLSX.writeFile(workbook, "relatorio_faturamento.xlsx");
    toast({ title: "Excel Gerado", description: "O relatório de faturamento foi exportado." });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><DollarSign className="mr-2" /> Relatório de Faturamento</CardTitle>
          <CardDescription>Analise o faturamento bruto e líquido da sua empresa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg mb-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center">
                <Filter size={16} className="mr-2"/>
                Filtros
              </h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={limparFiltros}
                className="text-xs"
              >
                <X size={14} className="mr-1"/>
                Limpar Filtros
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="filtro-forma-pagamento" className="text-sm font-medium mb-2 block">
                  Forma de Pagamento
                </Label>
                <Select value={filtroFormaPagamento} onValueChange={setFiltroFormaPagamento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a forma de pagamento"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas Formas</SelectItem>
                    {formasPagamentoDisponiveis.map(forma => (
                      <SelectItem key={forma} value={forma}>
                        {forma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="filtro-data-inicio" className="text-sm font-medium mb-2 block">
                    Data (Início)
                  </Label>
                  <div className="relative">
                    <Input
                      id="filtro-data-inicio"
                      type="text"
                      placeholder="dd/mm/aaaa"
                      value={filtroDataInicio}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length >= 2) {
                          value = value.substring(0, 2) + '/' + value.substring(2);
                        }
                        if (value.length >= 5) {
                          value = value.substring(0, 5) + '/' + value.substring(5, 9);
                        }
                        setFiltroDataInicio(value);
                      }}
                      maxLength={10}
                      className="pr-8"
                    />
                    <CalendarDays 
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-500" 
                      onClick={() => {
                        console.log('📅 Abrindo calendário de data início');
                        setShowDataInicioPicker(true);
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Data de emissão da venda
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="filtro-data-fim" className="text-sm font-medium mb-2 block">
                    Data (Fim)
                  </Label>
                  <div className="relative">
                    <Input
                      id="filtro-data-fim"
                      type="text"
                      placeholder="dd/mm/aaaa"
                      value={filtroDataFim}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length >= 2) {
                          value = value.substring(0, 2) + '/' + value.substring(2);
                        }
                        if (value.length >= 5) {
                          value = value.substring(0, 5) + '/' + value.substring(5, 9);
                        }
                        setFiltroDataFim(value);
                      }}
                      maxLength={10}
                      className="pr-8"
                    />
                    <CalendarDays 
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-500" 
                      onClick={() => {
                        console.log('📅 Abrindo calendário de data fim');
                        setShowDataFimPicker(true);
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Data de emissão da venda
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportPDF}
              disabled={loading || vendasFiltradas.length === 0}
            >
              <Printer className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportExcel}
              disabled={loading || vendasFiltradas.length === 0}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Bruto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando...</span>
              </div>
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totaisCalculados.faturamentoBruto)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Descontos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando...</span>
              </div>
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totaisCalculados.totalDescontos)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Líquido</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando...</span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totaisCalculados.faturamentoLiquido)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas por Tipo de Venda */}
      <Card>
        <CardHeader>
          <CardTitle>Faturamento por Tipo de Venda</CardTitle>
          <CardDescription>Distribuição do faturamento por categoria de venda</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              <span className="text-muted-foreground">Carregando estatísticas...</span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(estatisticasPorTipo).map(([tipo, stats]) => (
                <div key={tipo} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">{tipo}</h3>
                    <span className="text-xs text-muted-foreground">{stats.count} vendas</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold">{formatCurrency(stats.total)}</div>
                    <div className="text-xs text-muted-foreground">
                      {((stats.total / totaisCalculados.faturamentoBruto) * 100).toFixed(1)}% do total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gráfico de Faturamento por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                <span className="text-muted-foreground">Carregando gráfico...</span>
              </div>
            ) : chartData.labels.length > 0 ? (
              <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <TrendingUp size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Nenhum dado de faturamento para exibir no gráfico</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Vendas encontradas: {vendasFiltradas.length} | 
                    Labels do gráfico: {chartData.labels.length}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Faturamento</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Layout Mobile - Cards */}
          <div className="md:hidden">
            {loading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Carregando dados...</span>
              </div>
            ) : vendasFiltradas.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground mb-2">
                  Mostrando {vendasFiltradas.length} vendas
                </div>
                {vendasFiltradas.map(venda => {
                  const dataVenda = venda.data ? parseISO(venda.data) : null;
                  const getTipoColor = (tipo) => {
                    switch(tipo) {
                      case 'Venda PDV': return 'bg-blue-100 text-blue-800';
                      case 'Ordem de Serviço': return 'bg-green-100 text-green-800';
                      case 'Envelopamento': return 'bg-purple-100 text-purple-800';
                      case 'Marketplace': return 'bg-orange-100 text-orange-800';
                      case 'Orçamento Aprovado': return 'bg-yellow-100 text-yellow-800';
                      case 'Crediário Pago': return 'bg-teal-100 text-teal-800';
                      case 'Outros': return 'bg-gray-100 text-gray-800';
                      default: return 'bg-gray-100 text-gray-800';
                    }
                  };
                  return (
                    <motion.div
                      key={`${venda.origem}-${venda.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm break-words">{getClienteNome(venda.clienteId, venda.clienteNome)}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`text-xs ${getTipoColor(venda.tipo)}`}>
                              {venda.tipo}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {venda.origem || 'N/A'}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(venda.total)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Data</p>
                            <p className="text-sm">{isValid(dataVenda) ? format(dataVenda, 'dd/MM/yyyy') : 'Data Inválida'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Forma Pagamento</p>
                            <p className="text-sm">{venda.pagamentos?.map(p => p.metodo).join(', ') || 'N/A'}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Bruto</p>
                            <p className="text-sm font-semibold">{formatCurrency((parseFloat(venda.total) || 0) + (parseFloat(venda.desconto) || 0))}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Desconto</p>
                            <p className="text-sm text-red-500 font-semibold">{formatCurrency(venda.desconto || 0)}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                <p>Nenhum dado de faturamento para o período selecionado.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Vendas totais: {vendas.length} | 
                  Vendas filtradas: {vendasFiltradas.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Filtros ativos: Início: {filtroDataInicio}, Fim: {filtroDataFim}, Forma: {filtroFormaPagamento}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Chart labels: {chartData.labels.length} | Chart data: {chartData.datasets[0].data.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Primeira venda: {vendasFiltradas[0] ? JSON.stringify(vendasFiltradas[0]) : 'Nenhuma'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Chart data: {JSON.stringify(chartData)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vendas originais: {JSON.stringify(vendas.slice(0, 2))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recebimentos originais: {JSON.stringify(vendas.slice(0, 2))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  API response: Dados carregados
                </p>
              </div>
            )}
          </div>

          {/* Layout Desktop - Tabela */}
          <div className="hidden md:block">
            <div className="text-sm text-muted-foreground mb-4">
              Mostrando {vendasFiltradas.length} vendas
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Forma Pag.</TableHead>
                  <TableHead className="text-right">Total Bruto</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="text-right">Total Líquido</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendasFiltradas.map(venda => {
                  const dataVenda = venda.data ? parseISO(venda.data) : null;
                  const getTipoColor = (tipo) => {
                    switch(tipo) {
                      case 'Venda PDV': return 'bg-blue-100 text-blue-800';
                      case 'Ordem de Serviço': return 'bg-green-100 text-green-800';
                      case 'Envelopamento': return 'bg-purple-100 text-purple-800';
                      case 'Marketplace': return 'bg-orange-100 text-orange-800';
                      case 'Orçamento Aprovado': return 'bg-yellow-100 text-yellow-800';
                      case 'Crediário Pago': return 'bg-teal-100 text-teal-800';
                      case 'Outros': return 'bg-gray-100 text-gray-800';
                      default: return 'bg-gray-100 text-gray-800';
                    }
                  };
                  return (
                      <TableRow key={`${venda.origem}-${venda.id}`}>
                      <TableCell>{isValid(dataVenda) ? format(dataVenda, 'dd/MM/yyyy') : 'Data Inválida'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(venda.tipo)}`}>
                          {venda.tipo}
                        </span>
                      </TableCell>
                      <TableCell>{getClienteNome(venda.clienteId, venda.clienteNome)}</TableCell>
                      <TableCell>{venda.pagamentos?.map(p => p.metodo).join(', ') || 'N/A'}</TableCell>
                      <TableCell className="text-right">{formatCurrency((parseFloat(venda.total) || 0) + (parseFloat(venda.desconto) || 0))}</TableCell>
                      <TableCell className="text-right text-red-500">{formatCurrency(venda.desconto || 0)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(venda.total)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{venda.origem || 'N/A'}</TableCell>
                      </TableRow>
                  );
                })}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">
                      <div className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Carregando dados...
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && vendasFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">
                      <div className="text-center">
                        <TrendingUp size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                        <p>Nenhum dado de faturamento para o período selecionado.</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Vendas totais: {vendas.length} | 
                          Vendas filtradas: {vendasFiltradas.length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Filtros ativos: Início: {filtroDataInicio}, Fim: {filtroDataFim}, Forma: {filtroFormaPagamento}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Chart labels: {chartData.labels.length} | Chart data: {chartData.datasets[0].data.length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Primeira venda: {vendasFiltradas[0] ? JSON.stringify(vendasFiltradas[0]) : 'Nenhuma'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Chart data: {JSON.stringify(chartData)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Vendas originais: {JSON.stringify(vendas.slice(0, 2))}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Recebimentos originais: {JSON.stringify(vendas.slice(0, 2))}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          API response: Dados carregados
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Calendários */}
      <CalendarPicker
        isOpen={showDataInicioPicker}
        onClose={() => setShowDataInicioPicker(false)}
        onSelect={handleDataInicioSelect}
        currentMonth={currentMonthInicio}
        setCurrentMonth={setCurrentMonthInicio}
        selectedDate={filtroDataInicio ? (() => {
          const dataConvertida = formatarDataParaYYYYMMDD(filtroDataInicio);
          return dataConvertida ? new Date(dataConvertida) : null;
        })() : null}
      />
      
      <CalendarPicker
        isOpen={showDataFimPicker}
        onClose={() => setShowDataFimPicker(false)}
        onSelect={handleDataFimSelect}
        currentMonth={currentMonthFim}
        setCurrentMonth={setCurrentMonthFim}
        selectedDate={filtroDataFim ? (() => {
          const dataConvertida = formatarDataParaYYYYMMDD(filtroDataFim);
          return dataConvertida ? new Date(dataConvertida) : null;
        })() : null}
      />
    </div>
  );
};

export default RelatorioFaturamento;