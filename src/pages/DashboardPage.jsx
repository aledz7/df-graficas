import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import StatCard from '@/components/StatCard';
import QuickActions from '@/components/QuickActions';
import VendasFeed from '@/components/dashboard/VendasFeed';
import OSFeed from '@/components/dashboard/OSFeed';
import EnvelopamentoFeed from '@/components/dashboard/EnvelopamentoFeed';
import EstoqueBaixoModal from '@/components/dashboard/EstoqueBaixoModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ShoppingCart, 
  ClipboardList, 
  Palette, 
  Package,
  CalendarClock,
  Users,
  Archive
} from 'lucide-react';
import { parseISO, isToday, format, isFuture, differenceInDays, isValid, startOfDay, endOfDay } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { loadData } from '@/lib/utils';
import { pdvService } from '@/services/pdvService';
import { vendaService } from '@/services/api';
import api, { aparenciaService } from '@/services/api';
import { buscarProdutosEstoqueBaixo } from '@/utils/estoqueBaixoUtils';

const DashboardPage = ({ theme }) => {
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState({
    vendasDiaQtd: '0',
    osAberto: '0',
    envelopamentosOrcados: '0',
    estoqueMinimoCount: '0 Itens',
  });
  const [agendaHoje, setAgendaHoje] = useState([]);
  const [proximosCompromissos, setProximosCompromissos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEstoqueBaixoModalOpen, setIsEstoqueBaixoModalOpen] = useState(false);
  const [dashboardColors, setDashboardColors] = useState({
    vendasDia: 'green',
    osAberto: 'indigo',
    orcEnvelopamento: 'purple',
    estoqueBaixo: 'orange',
  });

  // Carregar cores personalizadas do dashboard
  const loadDashboardColors = async () => {
    try {
      const response = await aparenciaService.getDashboardColors();
      if (response.success && response.data?.colors) {
        setDashboardColors(response.data.colors);
      }
    } catch (error) {
      console.warn('Erro ao carregar cores do dashboard, usando padrão:', error);
    }
  };

  useEffect(() => {
    loadDashboardColors();
    
    // Escutar evento de atualização de cores
    const handleColorsUpdated = () => {
      loadDashboardColors();
    };
    
    window.addEventListener('dashboardColorsUpdated', handleColorsUpdated);
    
    return () => {
      window.removeEventListener('dashboardColorsUpdated', handleColorsUpdated);
    };
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Helper para converter strings em Date de forma resiliente
        const parseToDate = (value) => {
          if (!value) return null;
          try {
            const iso = typeof value === 'string' ? value : String(value);
            const d1 = parseISO(iso);
            if (isValid(d1)) return d1;
            // fallback para "YYYY-MM-DD HH:mm:ss" e similares
            const normalized = iso.replace(' ', 'T');
            const d2 = new Date(normalized);
            return Number.isNaN(d2.getTime()) ? null : d2;
          } catch (_) {
            try {
              const d3 = new Date(value);
              return Number.isNaN(d3.getTime()) ? null : d3;
            } catch (_) {
              return null;
            }
          }
        };

        // Carregar vendas da API primeiro, depois fallback para localStorage
        let vendasPDV = [];
        try {
          vendasPDV = await pdvService.getHistoricoVendas();
        } catch (apiError) {
          console.warn('⚠️ Erro ao carregar vendas da API, usando localStorage:', apiError);
          vendasPDV = await loadData('historico_vendas_pdv', []);
        }
        
        // Carregar OS da API primeiro, depois fallback para localStorage
        let osSalvas = [];
        try {
          // Carregar todas as OS sem paginação para o dashboard
          const response = await api.get('/api/ordens-servico', { 
            params: { 
              per_page: 1000, // Número alto para pegar todas as OS
              page: 1 
            } 
          });
          osSalvas = response.data?.data || [];
        } catch (apiError) {
          console.warn('⚠️ Erro ao carregar OS da API, usando localStorage:', apiError);
          osSalvas = await loadData('ordens_servico_salvas', []);
        }
        
        // Carregar envelopamentos da API primeiro, depois fallback para localStorage
        let envelopamentos = [];
        try {
          const response = await api.get('/api/envelopamentos');
          envelopamentos = response.data?.data?.data || response.data?.data || response.data || [];
        } catch (apiError) {
          console.warn('⚠️ Erro ao carregar envelopamentos da API, usando localStorage:', apiError);
          envelopamentos = await loadData('envelopamentosOrcamentos', []);
        }
        
        // Carregar produtos da API primeiro, depois fallback para localStorage
        let produtos = [];
        try {
          const response = await api.get('/api/produtos');
          produtos = response.data?.data?.data || response.data?.data || response.data || [];
        } catch (apiError) {
          console.warn('⚠️ Erro ao carregar produtos da API, usando localStorage:', apiError);
          produtos = await loadData('produtos', []);
        }
        
        // Carregar compromissos da API
        let compromissosAgenda = [];
        try {
          const response = await api.get('/api/compromissos');
          compromissosAgenda = response.data?.data || [];

        } catch (apiError) {
          console.warn('⚠️ Erro ao carregar compromissos da API, usando localStorage:', apiError);
          compromissosAgenda = await loadData('agenda_compromissos', []);
        }
        
        // Filtrar vendas do dia (excluindo pré-vendas/orçamentos)
        const vendasPDVHoje = vendasPDV.filter(v => {
          try {
            const dataEmissao = v.data_emissao || v.data_venda || v.created_at;
            const isVendaReal = !v.pre_venda && !v.is_orcamento && v.status !== 'pre_venda' && v.status !== 'orcamento';
            const dt = parseToDate(dataEmissao);
            return dt && isToday(dt) && isVendaReal;
          } catch(error) {
            console.error("Erro ao processar venda PDV:", error, v);
            return false;
          }
        });
        
        
        // Contar OS em aberto (apenas com status "orçamento" e que não estão expiradas)
        const hoje = new Date();
        const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        
        console.log('📅 Dashboard - Data atual para cálculos:', {
          hoje: hoje.toISOString(),
          hojeSemHora: hojeSemHora.toISOString(),
          hojeFormatada: format(hoje, 'dd/MM/yyyy HH:mm:ss')
        });
        
        const osComStatusOrcamento = osSalvas.filter(os => {
          const statusOs = (os.status_os || '').toString().toLowerCase();
          const statusValido = statusOs === 'orçamento' || 
                               statusOs === 'orçamento salvo' || 
                               statusOs === 'orçamento salvo (editado)';
          
          if (!statusValido) return false;
          
          // Verificar se a OS não está expirada
          const dataVencimento = os.data_vencimento || os.data_entrega_prevista;
          
          // Se tem data de vencimento, verificar se não está expirada
          if (dataVencimento) {
            try {
              const dataVenc = parseISO(dataVencimento);
              const vencimentoSemHora = new Date(dataVenc.getFullYear(), dataVenc.getMonth(), dataVenc.getDate());
              
              const isExpirada = vencimentoSemHora < hojeSemHora;
              
              console.log('🔍 Dashboard - Verificando OS com data de vencimento:', {
                osId: os.id || os.id_os,
                dataVencimento: dataVencimento,
                vencimentoSemHora: vencimentoSemHora.toISOString(),
                hojeSemHora: hojeSemHora.toISOString(),
                isExpirada: isExpirada,
                status: os.status_os
              });
              
              // Se a data de vencimento é anterior a hoje, a OS está expirada
              if (isExpirada) {
                console.log('❌ Dashboard - OS expirada por data de vencimento (excluída):', os.id || os.id_os);
                return false;
              } else {
                console.log('✅ Dashboard - OS não expirada por data de vencimento (incluída):', os.id || os.id_os);
                return true;
              }
            } catch (error) {
              console.warn('Erro ao processar data de vencimento da OS:', error, os);
              // Se não conseguir processar a data de vencimento, excluir por segurança
              return false;
            }
          }
          
          // Se não tem data de vencimento, verificar se é muito antiga pela data de criação
          const dataCriacao = os.data_criacao || os.created_at || os.timestamp;
          
          if (dataCriacao) {
            try {
              const dataCriacaoParsed = parseISO(dataCriacao);
              const dataCriacaoSemHora = new Date(dataCriacaoParsed.getFullYear(), dataCriacaoParsed.getMonth(), dataCriacaoParsed.getDate());
              const diasDesdeCriacao = Math.floor((hojeSemHora - dataCriacaoSemHora) / (1000 * 60 * 60 * 24));
              
              console.log('🔍 Dashboard - Verificando OS sem data de vencimento:', {
                osId: os.id || os.id_os,
                dataCriacao: dataCriacao,
                diasDesdeCriacao: diasDesdeCriacao,
                status: os.status_os
              });
              
              // Considerar expirada se foi criada há mais de 15 dias
              if (diasDesdeCriacao > 15) {
                console.log('❌ Dashboard - OS muito antiga sem data de vencimento (excluída):', {
                  osId: os.id || os.id_os,
                  status: os.status_os,
                  dataCriacao: dataCriacao,
                  diasDesdeCriacao: diasDesdeCriacao
                });
                return false;
              } else {
                console.log('✅ Dashboard - OS recente sem data de vencimento (incluída):', {
                  osId: os.id || os.id_os,
                  status: os.status_os,
                  dataCriacao: dataCriacao,
                  diasDesdeCriacao: diasDesdeCriacao
                });
                return true;
              }
            } catch (error) {
              console.warn('Erro ao processar data de criação da OS:', error, os);
              // Se não conseguir processar a data de criação, excluir por segurança
              return false;
            }
          } else {
            console.log('❌ Dashboard - OS sem data de vencimento nem criação (excluída por segurança):', {
              osId: os.id || os.id_os,
              status: os.status_os,
              dataVencimento: 'N/A',
              dataCriacao: 'N/A'
            });
            return false;
          }
        });
        
        const osAberto = osComStatusOrcamento.length;
        
        // Debug: mostrar OS que foram excluídas
        const osExcluidas = osSalvas.filter(os => {
          const statusOs = (os.status_os || '').toString().toLowerCase();
          const statusValido = statusOs === 'orçamento' || 
                               statusOs === 'orçamento salvo' || 
                               statusOs === 'orçamento salvo (editado)';
          
          if (!statusValido) return false;
          
          // Se chegou até aqui, é uma OS válida, mas foi excluída
          return !osComStatusOrcamento.includes(os);
        });
        
        console.log('🚫 Dashboard - OS excluídas do resultado final:');
        osExcluidas.forEach((os, index) => {
          const dataVencimento = os.data_vencimento || os.data_entrega_prevista;
          const dataCriacao = os.data_criacao || os.created_at || os.timestamp;
          
          let motivoExclusao = '';
          let diasDesdeCriacao = 0;
          let dataCriacaoFormatada = 'N/A';
          
          if (dataVencimento) {
            try {
              const dataVenc = parseISO(dataVencimento);
              const vencimentoSemHora = new Date(dataVenc.getFullYear(), dataVenc.getMonth(), dataVenc.getDate());
              if (vencimentoSemHora < hojeSemHora) {
                motivoExclusao = 'Data de vencimento expirada';
              }
            } catch (error) {
              motivoExclusao = 'Erro ao processar data de vencimento';
            }
          } else if (dataCriacao) {
            try {
              const dataCriacaoParsed = parseISO(dataCriacao);
              const dataCriacaoSemHora = new Date(dataCriacaoParsed.getFullYear(), dataCriacaoParsed.getMonth(), dataCriacaoParsed.getDate());
              diasDesdeCriacao = Math.floor((hojeSemHora - dataCriacaoSemHora) / (1000 * 60 * 60 * 24));
              dataCriacaoFormatada = format(dataCriacaoParsed, 'dd/MM/yyyy');
              if (diasDesdeCriacao > 15) {
                motivoExclusao = `Muito antiga (${diasDesdeCriacao} dias)`;
              }
            } catch (error) {
              motivoExclusao = 'Erro ao processar data de criação';
            }
          } else {
            motivoExclusao = 'Sem data alguma (não deveria estar aqui)';
          }
          
          console.log(`${index + 1}. OS ID ${os.id || os.id_os} - Status: ${os.status_os} - Data criação: ${dataCriacaoFormatada} - Dias: ${diasDesdeCriacao} - Motivo exclusão: ${motivoExclusao}`);
        });
        
        // Calcular estatísticas para debug
        const totalOSComStatusOrcamento = osSalvas.filter(os => {
          const statusOs = (os.status_os || '').toString().toLowerCase();
          return statusOs === 'orçamento' || 
                 statusOs === 'orçamento salvo' || 
                 statusOs === 'orçamento salvo (editado)';
        }).length;
        
        const osExpiradas = osSalvas.filter(os => {
          const statusOs = (os.status_os || '').toString().toLowerCase();
          const statusValido = statusOs === 'orçamento' || 
                               statusOs === 'orçamento salvo' || 
                               statusOs === 'orçamento salvo (editado)';
          
          if (!statusValido) return false;
          
          const dataVencimento = os.data_vencimento || os.data_entrega_prevista;
          
          // Verificar por data de vencimento
          if (dataVencimento) {
            try {
              const dataVenc = parseISO(dataVencimento);
              const vencimentoSemHora = new Date(dataVenc.getFullYear(), dataVenc.getMonth(), dataVenc.getDate());
              return vencimentoSemHora < hojeSemHora;
            } catch (error) {
              return false;
            }
          }
          
          // Verificar por data de criação (muito antigas)
          const dataCriacao = os.data_criacao || os.created_at || os.timestamp;
          if (dataCriacao) {
            try {
              const dataCriacaoParsed = parseISO(dataCriacao);
              const dataCriacaoSemHora = new Date(dataCriacaoParsed.getFullYear(), dataCriacaoParsed.getMonth(), dataCriacaoParsed.getDate());
              const diasDesdeCriacao = Math.floor((hojeSemHora - dataCriacaoSemHora) / (1000 * 60 * 60 * 24));
              return diasDesdeCriacao > 15;
            } catch (error) {
              return false;
            }
          }
          
          return false;
        }).length;
        
        // Debug detalhado: mostrar informações sobre as OS encontradas
        console.log('🔍 Dashboard - Debug OS em Aberto (não expiradas):', {
          totalOSCarregadas: osSalvas.length,
          totalOSComStatusOrcamento: totalOSComStatusOrcamento,
          osExpiradas: osExpiradas,
          osComStatusOrcamento: osComStatusOrcamento.length,
          resumo: {
            'Total OS carregadas': osSalvas.length,
            'OS com status orçamento': totalOSComStatusOrcamento,
            'OS expiradas (excluídas)': osExpiradas,
            'OS em aberto (final)': osComStatusOrcamento.length
          }
        });
        
        // Debug detalhado: listar todas as OS incluídas no resultado final
        console.log('📋 Dashboard - Lista detalhada das OS incluídas no resultado final:');
        osComStatusOrcamento.forEach((os, index) => {
          const dataVencimento = os.data_vencimento || os.data_entrega_prevista;
          const dataCriacao = os.data_criacao || os.created_at || os.timestamp;
          
          let motivoInclusao = '';
          let diasDesdeCriacao = 0;
          let dataCriacaoFormatada = 'N/A';
          
          if (dataVencimento) {
            motivoInclusao = 'Tem data de vencimento válida';
          } else if (dataCriacao) {
            try {
              const dataCriacaoParsed = parseISO(dataCriacao);
              const dataCriacaoSemHora = new Date(dataCriacaoParsed.getFullYear(), dataCriacaoParsed.getMonth(), dataCriacaoParsed.getDate());
              diasDesdeCriacao = Math.floor((hojeSemHora - dataCriacaoSemHora) / (1000 * 60 * 60 * 24));
              dataCriacaoFormatada = format(dataCriacaoParsed, 'dd/MM/yyyy');
              motivoInclusao = `Criada há ${diasDesdeCriacao} dias (recente)`;
            } catch (error) {
              motivoInclusao = 'Data de criação inválida (incluída por segurança)';
            }
          } else {
            motivoInclusao = 'Sem data alguma (incluída por segurança)';
          }
          
          console.log(`${index + 1}. OS ID ${os.id || os.id_os} - Status: ${os.status_os} - Data criação: ${dataCriacaoFormatada} - Dias: ${diasDesdeCriacao} - Motivo: ${motivoInclusao}`);
        });
        
        // Debug específico: identificar OS que podem estar sendo incluídas incorretamente
        console.log('🔍 Dashboard - Análise específica de OS suspeitas:');
        const osSuspeitas = osComStatusOrcamento.filter(os => {
          const dataCriacao = os.data_criacao || os.created_at || os.timestamp;
          if (dataCriacao) {
            try {
              const dataCriacaoParsed = parseISO(dataCriacao);
              const dataCriacaoSemHora = new Date(dataCriacaoParsed.getFullYear(), dataCriacaoParsed.getMonth(), dataCriacaoParsed.getDate());
              const diasDesdeCriacao = Math.floor((hojeSemHora - dataCriacaoSemHora) / (1000 * 60 * 60 * 24));
              // Considerar suspeitas as OS criadas há mais de 15 dias
              return diasDesdeCriacao > 15;
            } catch (error) {
              return false;
            }
          }
          return false;
        });
        
        console.log(`🚨 Dashboard - ${osSuspeitas.length} OS suspeitas (criadas há mais de 15 dias):`);
        osSuspeitas.forEach((os, index) => {
          const dataCriacao = os.data_criacao || os.created_at || os.timestamp;
          const dataCriacaoParsed = parseISO(dataCriacao);
          const dataCriacaoSemHora = new Date(dataCriacaoParsed.getFullYear(), dataCriacaoParsed.getMonth(), dataCriacaoParsed.getDate());
          const diasDesdeCriacao = Math.floor((hojeSemHora - dataCriacaoSemHora) / (1000 * 60 * 60 * 24));
          const dataCriacaoFormatada = format(dataCriacaoParsed, 'dd/MM/yyyy');
          
          console.log(`SUSPEITA ${index + 1}. OS ID ${os.id || os.id_os} - Status: ${os.status_os} - Data criação: ${dataCriacaoFormatada} - Dias: ${diasDesdeCriacao}`);
        });
        
        // Contar envelopamentos orçados (apenas criados hoje)
        const envelopamentosOrcados = envelopamentos.filter(env => {
          const dt = parseToDate(env.data_criacao || env.created_at);
          const statusOk = ['Orçamento Salvo', 'Rascunho'].includes(env.status);
          return statusOk && dt && isToday(dt);
        }).length;
        
        // Carregar produtos com estoque baixo da API primeiro
        let produtosEstoqueBaixo = [];
        try {
          console.log('🔍 Dashboard - Tentando carregar produtos com estoque baixo da API...');
          const { produtoService } = await import('@/services/api');
          const estoqueBaixoResponse = await produtoService.getEstoqueBaixo();
          // Garantir que produtosEstoqueBaixo seja sempre um array
          const responseData = estoqueBaixoResponse?.data;
          if (Array.isArray(responseData)) {
            produtosEstoqueBaixo = responseData;
          } else if (responseData && Array.isArray(responseData.data)) {
            // Caso a API retorne { data: { data: [...] } } (paginação Laravel)
            produtosEstoqueBaixo = responseData.data;
          } else if (responseData && typeof responseData === 'object') {
            // Caso seja um objeto, tentar converter para array
            produtosEstoqueBaixo = Object.values(responseData).filter(item => item && typeof item === 'object');
          } else {
            produtosEstoqueBaixo = [];
          }
          console.log('✅ Dashboard - Produtos carregados da API:', produtosEstoqueBaixo.length);
        } catch (apiError) {
          console.warn('⚠️ Dashboard - Erro ao carregar da API, usando localStorage:', apiError);
          
          // Fallback para localStorage
          const produtosLocal = await loadData('produtos', []);
          
          // Usar função compartilhada para garantir lógica idêntica
          console.log('🔍 Dashboard - Chamando função compartilhada buscarProdutosEstoqueBaixo...');
          const resultado = await buscarProdutosEstoqueBaixo(produtosLocal);
          produtosEstoqueBaixo = Array.isArray(resultado) ? resultado : [];
        }
        
        const produtosEstoqueBaixoCount = produtosEstoqueBaixo.length;
        
        console.log('📊 Dashboard - Contagem de estoque baixo:', {
          produtosEstoqueBaixo: produtosEstoqueBaixo.length,
          produtosDetalhes: produtosEstoqueBaixo.map(p => ({
            nome: p.nome,
            estoque: p.estoque,
            estoque_minimo: p.estoque_minimo,
            percentual: ((parseFloat(p.estoque) / parseFloat(p.estoque_minimo)) * 100).toFixed(1)
          }))
        });
        
        // Filtrar compromissos de hoje
        const compromissosHoje = compromissosAgenda.filter(comp => {
          try {
            const startDate = comp.start || comp.data_inicio;
            if (!startDate) {
              return false;
            }
            
            const parsedDate = parseISO(startDate);
            const isTodayComp = isToday(parsedDate);
            
            if (isTodayComp) {
            }
            return isTodayComp;
          } catch(error) {
            console.error("Erro ao processar compromisso:", error, comp);
            return false;
          }
        });
        
        
        // Filtrar próximos compromissos
        const proximosCompromissos = compromissosAgenda.filter(comp => {
          try {
            const startDate = comp.start || comp.data_inicio;
            if (!startDate) {
              return false;
            }
            
            const parsedDate = parseISO(startDate);
            const isFutureComp = isFuture(parsedDate) && differenceInDays(parsedDate, new Date()) <= 7;
            
            if (isFutureComp) {
            }
            return isFutureComp;
          } catch(error) {
            console.error("Erro ao processar próximo compromisso:", error, comp);
            return false;
          }
        }).slice(0, 5);
        
        
        const newStats = {
          vendasDiaQtd: vendasPDVHoje.length.toString(),
          osAberto: osAberto.toString(),
          envelopamentosOrcados: envelopamentosOrcados.toString(),
          estoqueMinimoCount: `${produtosEstoqueBaixoCount} Itens`,
        };
        
        setDashboardStats(newStats);
        
        setAgendaHoje(compromissosHoje);
        setProximosCompromissos(proximosCompromissos);
        
        
      } catch(error) {
        console.error("Erro ao carregar dados do dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDashboardData();
  }, []);




  const stats = [
    {
      title: 'Vendas do Dia (Qtd)',
      value: dashboardStats.vendasDiaQtd,
      icon: ShoppingCart,
      color: dashboardColors.vendasDia,
      action: () => navigate('/operacional/pdv-historico', { state: { filterDate: { from: startOfDay(new Date()), to: endOfDay(new Date()) } } })
    },
    {
      title: 'OS em Aberto',
      value: dashboardStats.osAberto,
      icon: ClipboardList,
      color: dashboardColors.osAberto,
      action: () => navigate('/operacional/os-historico', { state: { filterStatus: ['Orçamento', 'Orçamento Salvo', 'Orçamento Salvo (Editado)'] } })
    },
    {
      title: 'Orç. Envelopamento',
      value: dashboardStats.envelopamentosOrcados,
      icon: Palette,
      color: dashboardColors.orcEnvelopamento,
      action: () => navigate('/operacional/orcamentos-envelopamento', { state: { filterStatus: ['Orçamento Salvo', 'Rascunho'] } })
    },
    {
      title: 'Estoque Baixo',
      value: dashboardStats.estoqueMinimoCount,
      icon: Archive, 
      color: dashboardColors.estoqueBaixo,
      subtext: 'Itens abaixo do mínimo',
      action: () => setIsEstoqueBaixoModalOpen(true)
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gray-50 dark:bg-gray-900/50 min-h-full">
      
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {stats.map((stat) => (
          <motion.div variants={itemVariants} key={stat.title} className="h-full cursor-pointer" onClick={stat.action}>
              <StatCard {...stat} />
          </motion.div>
        ))}
      </motion.section>
      
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
      >
        <motion.div variants={itemVariants} className="lg:col-span-1 h-auto lg:h-[calc(100vh-var(--header-height)-12rem)]">
          <QuickActions />
        </motion.div>
        <motion.div variants={itemVariants} className="lg:col-span-1 h-auto lg:h-[calc(100vh-var(--header-height)-12rem)]">
          <Card className="h-full flex flex-col shadow-lg border-border">
              <CardHeader>
                  <CardTitle className="flex items-center"><CalendarClock size={20} className="mr-2 text-primary"/>Resumo da Agenda</CardTitle>
                  <CardDescription>Compromissos de hoje e próximos.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow overflow-hidden p-4">
                <ScrollArea className="h-full">
                  {isLoading ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <p>Carregando dados do dashboard...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                        {agendaHoje.length === 0 && proximosCompromissos.length === 0 ? (
                             <div className="text-center py-10 text-muted-foreground">
                                <p>Nenhum compromisso agendado para hoje ou próximos dias.</p>
                            </div>
                        ) : (
                            <div>
                                {agendaHoje.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2 text-primary">Hoje ({format(new Date(), 'dd/MM')})</h4>
                                        {agendaHoje.map(evento => {
                                            try {
                                                const startDate = evento.start instanceof Date ? evento.start : parseISO(evento.start);
                                                const endDate = evento.end instanceof Date ? evento.end : parseISO(evento.end);
                                                
                                                return (
                                                    <div key={evento.id} className="p-2 mb-2 border rounded-md bg-primary/5">
                                                        <p className="text-xs font-medium">{evento.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                                                            {evento.cliente?.nome && <span className="ml-2 flex items-center text-xs"><Users size={12} className="mr-1"/>{evento.cliente.nome}</span>}
                                                        </p>
                                                    </div>
                                                );
                                            } catch (error) {
                                                console.error('Erro ao formatar evento:', error, evento);
                                                return (
                                                    <div key={evento.id} className="p-2 mb-2 border rounded-md bg-red-50">
                                                        <p className="text-xs font-medium text-red-600">Erro ao carregar evento</p>
                                                        <p className="text-xs text-muted-foreground">{evento.title}</p>
                                                    </div>
                                                );
                                            }
                                        })}
                                    </div>
                                )}
                                {proximosCompromissos.length > 0 && (
                                     <div>
                                        <h4 className="text-sm font-semibold my-3 pt-3 border-t text-indigo-600 dark:text-indigo-400">Próximos 7 Dias</h4>
                                        {proximosCompromissos.map(evento => {
                                            try {
                                                const startDate = evento.start instanceof Date ? evento.start : parseISO(evento.start);
                                                const endDate = evento.end instanceof Date ? evento.end : parseISO(evento.end);
                                                
                                                return (
                                                    <div key={evento.id} className="p-2 mb-2 border rounded-md bg-indigo-500/5">
                                                        <p className="text-xs font-medium">{evento.title} <span className="text-indigo-500">({format(startDate, 'dd/MM')})</span></p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                                                            {evento.cliente?.nome && <span className="ml-2 flex items-center text-xs"><Users size={12} className="mr-1"/>{evento.cliente.nome}</span>}
                                                        </p>
                                                    </div>
                                                );
                                            } catch (error) {
                                                console.error('Erro ao formatar próximo evento:', error, evento);
                                                return (
                                                    <div key={evento.id} className="p-2 mb-2 border rounded-md bg-red-50">
                                                        <p className="text-xs font-medium text-red-600">Erro ao carregar evento</p>
                                                        <p className="text-xs text-muted-foreground">{evento.title}</p>
                                                    </div>
                                                );
                                            }
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants} className="lg:col-span-1 h-auto lg:h-[calc(100vh-var(--header-height)-12rem)]">
          <VendasFeed showValues={false} title="Feed de Vendas" defaultDateToday={true} onlyToday={true} />
        </motion.div>
      </motion.section>

      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
      >
        <motion.div variants={itemVariants} className="lg:col-span-1 h-auto lg:h-[calc(100vh-var(--header-height)-12rem)]">
          <OSFeed showValues={false} title="Feed de OS" defaultDateToday={true} onlyToday={true} />
        </motion.div>
        <motion.div variants={itemVariants} className="lg:col-span-1 h-auto lg:h-[calc(100vh-var(--header-height)-12rem)]">
          <EnvelopamentoFeed showValues={false} title="Feed de Envelopamentos" defaultDateToday={true} onlyToday={true} />
        </motion.div>
      </motion.section>

      {/* Modal de Estoque Baixo */}
      <EstoqueBaixoModal 
        isOpen={isEstoqueBaixoModalOpen}
        onClose={() => setIsEstoqueBaixoModalOpen(false)}
      />

    </div>
  );
};

export default DashboardPage;