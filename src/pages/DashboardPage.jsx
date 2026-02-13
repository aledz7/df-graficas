import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import StatCard from '@/components/StatCard';
import QuickActions from '@/components/QuickActions';
import VendasFeed from '@/components/dashboard/VendasFeed';
import OSFeed from '@/components/dashboard/OSFeed';
import EnvelopamentoFeed from '@/components/dashboard/EnvelopamentoFeed';
import EstoqueBaixoModal from '@/components/dashboard/EstoqueBaixoModal';
import DashboardWidget from '@/components/dashboard/DashboardWidget';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  ClipboardList, 
  Palette, 
  Package,
  CalendarClock,
  Users,
  Archive,
  Settings2
} from 'lucide-react';
import { parseISO, isToday, format, isFuture, differenceInDays, isValid, startOfDay, endOfDay } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { loadData } from '@/lib/utils';
import { pdvService } from '@/services/pdvService';
import { vendaService, dashboardService } from '@/services/api';
import api, { aparenciaService } from '@/services/api';
import { buscarProdutosEstoqueBaixo } from '@/utils/estoqueBaixoUtils';
import { useToast } from '@/components/ui/use-toast';

const DashboardPage = ({ theme }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Estados para widgets dinâmicos
  const [widgetsConfig, setWidgetsConfig] = useState(null);
  const [widgetsDisponiveis, setWidgetsDisponiveis] = useState([]);
  const [widgetsDados, setWidgetsDados] = useState({});
  const [isLoadingWidgets, setIsLoadingWidgets] = useState(true);
  const [usarWidgetsDinamicos, setUsarWidgetsDinamicos] = useState(false);
  
  // Estados legados (mantidos para compatibilidade)
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

  // Carregar configuração de widgets
  useEffect(() => {
    const loadWidgetsConfig = async () => {
      try {
        const [configResponse, widgetsResponse] = await Promise.all([
          dashboardService.getConfiguracao(),
          dashboardService.getWidgetsDisponiveis(),
        ]);

        if (configResponse.success && widgetsResponse.success) {
          setWidgetsConfig(configResponse.data);
          setWidgetsDisponiveis(widgetsResponse.data || []);
          setUsarWidgetsDinamicos(true);
          
          // Carregar dados dos widgets visíveis
          const widgetsVisiveis = configResponse.data?.widgets_visiveis || [];
          if (widgetsVisiveis.length > 0) {
            loadWidgetsData(widgetsVisiveis);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configuração de widgets:', error);
        // Se falhar, usar dashboard legado
        setUsarWidgetsDinamicos(false);
      } finally {
        setIsLoadingWidgets(false);
      }
    };

    loadWidgetsConfig();
  }, []);

  // Carregar dados dos widgets
  const loadWidgetsData = async (widgetsCodigos) => {
    try {
      const response = await dashboardService.getDadosWidgets(widgetsCodigos);
      if (response.success) {
        setWidgetsDados(response.data || {});
      }
    } catch (error) {
      console.error('Erro ao carregar dados dos widgets:', error);
    }
  };

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
    
    const handleColorsUpdated = () => {
      loadDashboardColors();
    };
    
    window.addEventListener('dashboardColorsUpdated', handleColorsUpdated);
    
    return () => {
      window.removeEventListener('dashboardColorsUpdated', handleColorsUpdated);
    };
  }, []);

  // Helper function para parse de data
  const parseToDate = (value) => {
    if (!value) return null;
    try {
      const iso = typeof value === 'string' ? value : String(value);
      const d1 = parseISO(iso);
      if (isValid(d1)) return d1;
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

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);

        // Carregar dados legados (para feeds e agenda)
        const [vendasResponse, osResponse, compromissosResponse] = await Promise.all([
          vendaService.getAll({ per_page: 10, sort_by: 'created_at', sort_order: 'desc' }),
          api.get('/api/ordens-servico', { params: { per_page: 10, sort_by: 'created_at', sort_order: 'desc' } }),
          loadData('compromissos'),
        ]);

        const hoje = startOfDay(new Date());
        const hojeFim = endOfDay(new Date());

        // Vendas do dia
        const vendasHoje = vendasResponse.data?.filter(v => {
          const data = parseToDate(v.created_at || v.data_finalizacao);
          return data && isToday(data);
        }) || [];
        const totalVendasHoje = vendasHoje.length;

        // OS em aberto
        const osData = osResponse.data?.data || osResponse.data || [];
        const osAberto = osData.filter(os => {
          const status = os.status_os || '';
          return ['Orçamento', 'Orçamento Salvo', 'Orçamento Salvo (Editado)'].includes(status);
        }).length;

        // Envelopamentos orçados
        const envelopamentosOrcados = 0; // Implementar se necessário

        // Estoque baixo
        const produtosEstoqueBaixo = await buscarProdutosEstoqueBaixo();
        const produtosEstoqueBaixoCount = produtosEstoqueBaixo.length;

        // Agenda
        const compromissos = compromissosResponse || [];
        const compromissosHoje = compromissos.filter(c => {
          const data = parseToDate(c.data_compromisso || c.data);
          return data && isToday(data);
        });
        
        const proximosCompromissosFiltrados = compromissos
          .filter(c => {
            const data = parseToDate(c.data_compromisso || c.data);
            return data && isFuture(data) && !isToday(data);
          })
          .sort((a, b) => {
            const dataA = parseToDate(a.data_compromisso || a.data);
            const dataB = parseToDate(b.data_compromisso || b.data);
            return dataA - dataB;
          })
          .slice(0, 5);

        const newStats = {
          vendasDiaQtd: totalVendasHoje.toString(),
          osAberto: osAberto.toString(),
          envelopamentosOrcados: envelopamentosOrcados.toString(),
          estoqueMinimoCount: `${produtosEstoqueBaixoCount} Itens`,
        };
        
        setDashboardStats(newStats);
        setAgendaHoje(compromissosHoje);
        setProximosCompromissos(proximosCompromissosFiltrados);
        
      } catch(error) {
        console.error("Erro ao carregar dados do dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDashboardData();
  }, []);

  // Stats legados (para compatibilidade)
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

  // Renderizar widgets dinâmicos
  const renderWidgetsDinamicos = () => {
    if (!widgetsConfig || !widgetsDisponiveis.length) {
      return null;
    }

    const widgetsVisiveis = widgetsConfig.widgets_visiveis || [];
    
    return (
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {widgetsVisiveis.map((codigo) => {
          const widget = widgetsDisponiveis.find(w => w.codigo === codigo);
          if (!widget) return null;

          const dadosWidget = widgetsDados[codigo];
          const isLoading = !dadosWidget && isLoadingWidgets;

          return (
            <motion.div 
              variants={itemVariants} 
              key={codigo}
            >
              <DashboardWidget
                widget={widget}
                dados={dadosWidget}
                isLoading={isLoading}
              />
            </motion.div>
          );
        })}
      </motion.section>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gray-50 dark:bg-gray-900/50 min-h-full">
      {/* Header com botão de configuração */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/configuracoes/dashboard')}
          className="flex items-center gap-2"
        >
          <Settings2 className="h-4 w-4" />
          Configurar Dashboard
        </Button>
      </div>
      
      {/* Widgets dinâmicos ou legados */}
      {usarWidgetsDinamicos ? (
        renderWidgetsDinamicos()
      ) : (
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
      )}
      
      {/* Feeds e Agenda (mantidos) */}
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
                            <>
                                {agendaHoje.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-sm mb-2 text-primary">Hoje</h3>
                                        <div className="space-y-2">
                                            {agendaHoje.map((compromisso, index) => {
                                                const data = parseToDate(compromisso.data_compromisso || compromisso.data);
                                                return (
                                                    <div key={index} className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                                                        <p className="font-medium text-sm">{compromisso.titulo || compromisso.nome}</p>
                                                        {data && <p className="text-xs text-muted-foreground">{format(data, "HH:mm")}</p>}
                                                        {compromisso.descricao && <p className="text-xs text-muted-foreground mt-1">{compromisso.descricao}</p>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {proximosCompromissos.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-sm mb-2 text-primary">Próximos</h3>
                                        <div className="space-y-2">
                                            {proximosCompromissos.map((compromisso, index) => {
                                                const data = parseToDate(compromisso.data_compromisso || compromisso.data);
                                                const diasRestantes = data ? differenceInDays(data, new Date()) : null;
                                                return (
                                                    <div key={index} className="p-3 bg-muted/50 rounded-lg border">
                                                        <p className="font-medium text-sm">{compromisso.titulo || compromisso.nome}</p>
                                                        {data && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {format(data, "dd/MM/yyyy HH:mm")}
                                                                {diasRestantes !== null && (
                                                                    <span className="ml-2 text-primary">
                                                                        ({diasRestantes === 0 ? 'Hoje' : diasRestantes === 1 ? 'Amanhã' : `Em ${diasRestantes} dias`})
                                                                    </span>
                                                                )}
                                                            </p>
                                                        )}
                                                        {compromisso.descricao && <p className="text-xs text-muted-foreground mt-1">{compromisso.descricao}</p>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants} className="lg:col-span-1 h-auto lg:h-[calc(100vh-var(--header-height)-12rem)]">
          <VendasFeed />
        </motion.div>
      </motion.section>

      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
      >
        <motion.div variants={itemVariants} className="h-auto lg:h-[calc(100vh-var(--header-height)-12rem)]">
          <OSFeed />
        </motion.div>
        <motion.div variants={itemVariants} className="h-auto lg:h-[calc(100vh-var(--header-height)-12rem)]">
          <EnvelopamentoFeed />
        </motion.div>
      </motion.section>

      <EstoqueBaixoModal 
        isOpen={isEstoqueBaixoModalOpen} 
        onClose={() => setIsEstoqueBaixoModalOpen(false)} 
      />
    </div>
  );
};

export default DashboardPage;
