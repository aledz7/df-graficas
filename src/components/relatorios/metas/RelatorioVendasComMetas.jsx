import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CalendarDays,
  Loader2,
  Settings,
  FileDown,
  BarChart3
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import { formatCurrency } from '@/lib/utils';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ConfigurarMetasModal from './ConfigurarMetasModal';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const RelatorioVendasComMetas = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [tipoPeriodo, setTipoPeriodo] = useState('mensal');
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [showDataInicioPicker, setShowDataInicioPicker] = useState(false);
  const [showDataFimPicker, setShowDataFimPicker] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [metaEditando, setMetaEditando] = useState(null);
  const [vendedores, setVendedores] = useState([]);

  useEffect(() => {
    carregarVendedores();
  }, []);

  useEffect(() => {
    if (tipoPeriodo === 'diario') {
      const hoje = new Date();
      setDataInicio(format(startOfDay(hoje), 'yyyy-MM-dd'));
      setDataFim(format(endOfDay(hoje), 'yyyy-MM-dd'));
    } else if (tipoPeriodo === 'mensal') {
      setDataInicio(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
      setDataFim(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    }
  }, [tipoPeriodo]);

  useEffect(() => {
    carregarDados();
  }, [dataInicio, dataFim, tipoPeriodo]);

  const carregarVendedores = async () => {
    try {
      const response = await api.get('/api/users', {
        params: { per_page: 1000 }
      });
      const users = response.data?.data?.data || response.data?.data || response.data || [];
      setVendedores(users.filter(u => !u.is_admin || u.is_admin === false));
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/vendas/relatorio-com-metas', {
        params: {
          data_inicio: dataInicio,
          data_fim: dataFim,
          tipo_periodo: tipoPeriodo
        }
      });

      if (response.data.success) {
        setDados(response.data.data);
      } else {
        throw new Error(response.data.message || 'Erro ao carregar dados');
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível carregar os dados do relatório.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirConfigModal = (tipo = 'empresa', vendedorId = null) => {
    if (vendedorId) {
      // Buscar meta existente do vendedor se houver
      // Por enquanto, criar nova
      setMetaEditando(null);
    } else {
      setMetaEditando(null);
    }
    setIsConfigModalOpen(true);
  };

  const handleFecharConfigModal = (atualizado = false) => {
    setIsConfigModalOpen(false);
    setMetaEditando(null);
    if (atualizado) {
      carregarDados();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando relatório...</span>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Erro ao carregar dados do relatório</p>
      </div>
    );
  }

  // Dados para gráfico da empresa
  const chartDataEmpresa = {
    labels: ['Meta', 'Realizado'],
    datasets: [{
      label: 'Valor (R$)',
      data: [dados.empresa.meta_total, dados.empresa.total_vendido],
      backgroundColor: [
        'rgba(59, 130, 246, 0.5)',
        dados.empresa.total_vendido >= dados.empresa.meta_total 
          ? 'rgba(34, 197, 94, 0.5)' 
          : 'rgba(239, 68, 68, 0.5)'
      ],
      borderColor: [
        'rgba(59, 130, 246, 1)',
        dados.empresa.total_vendido >= dados.empresa.meta_total 
          ? 'rgba(34, 197, 94, 1)' 
          : 'rgba(239, 68, 68, 1)'
      ],
      borderWidth: 1
    }]
  };

  // Dados para gráfico de vendedores (top 10)
  const topVendedores = dados.vendedores.slice(0, 10);
  const chartDataVendedores = {
    labels: topVendedores.map(v => v.vendedor_nome),
    datasets: [
      {
        label: 'Meta',
        data: topVendedores.map(v => v.meta_individual),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'Realizado',
        data: topVendedores.map(v => v.total_vendido),
        backgroundColor: topVendedores.map(v => 
          v.total_vendido >= v.meta_individual 
            ? 'rgba(34, 197, 94, 0.5)' 
            : 'rgba(239, 68, 68, 0.5)'
        ),
        borderColor: topVendedores.map(v => 
          v.total_vendido >= v.meta_individual 
            ? 'rgba(34, 197, 94, 1)' 
            : 'rgba(239, 68, 68, 1)'
        ),
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros</CardTitle>
            <Button onClick={() => handleAbrirConfigModal()} variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Configurar Metas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Tipo de Período</Label>
              <Select value={tipoPeriodo} onValueChange={setTipoPeriodo}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diário</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Início</Label>
              <Popover open={showDataInicioPicker} onOpenChange={setShowDataInicioPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dataInicio ? format(parseISO(dataInicio), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataInicio ? parseISO(dataInicio) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setDataInicio(format(date, 'yyyy-MM-dd'));
                        setShowDataInicioPicker(false);
                      }
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Data Fim</Label>
              <Popover open={showDataFimPicker} onOpenChange={setShowDataFimPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dataFim ? format(parseISO(dataFim), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataFim ? parseISO(dataFim) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setDataFim(format(date, 'yyyy-MM-dd'));
                        setShowDataFimPicker(false);
                      }
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end">
              <Button onClick={carregarDados} className="w-full">
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo da Empresa */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Meta da Empresa
              </CardTitle>
              <CardDescription>
                Período: {format(parseISO(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} a {format(parseISO(dataFim), 'dd/MM/yyyy', { locale: ptBR })}
              </CardDescription>
            </div>
            {!dados.empresa.meta_configurada && (
              <Button onClick={() => handleAbrirConfigModal('empresa')} variant="outline" size="sm">
                Configurar Meta
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Meta Total</p>
              <p className="text-2xl font-bold">{formatCurrency(dados.empresa.meta_total)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Vendido</p>
              <p className="text-2xl font-bold">{formatCurrency(dados.empresa.total_vendido)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">% da Meta Alcançado</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{dados.empresa.percentual_meta_alcançado}%</p>
                {dados.empresa.percentual_meta_alcançado >= 100 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
              <Progress value={Math.min(dados.empresa.percentual_meta_alcançado, 100)} className="mt-2" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Falta para Meta</p>
              <p className={`text-2xl font-bold ${dados.empresa.valor_falta_meta > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {formatCurrency(dados.empresa.valor_falta_meta)}
              </p>
            </div>
          </div>

          {/* Gráfico da Empresa */}
          {dados.empresa.meta_configurada && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Meta x Realizado - Empresa</h3>
              <div className="h-64">
                <Bar 
                  data={chartDataEmpresa}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return formatCurrency(context.parsed.y);
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return formatCurrency(value);
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendedores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Desempenho dos Vendedores
          </CardTitle>
          <CardDescription>
            {dados.resumo.total_vendedores} vendedores | {dados.resumo.vendedores_com_meta} com meta configurada
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Gráfico de Vendedores */}
          {topVendedores.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Top 10 Vendedores - Meta x Realizado</h3>
              <div className="h-96">
                <Bar 
                  data={chartDataVendedores}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: 'top'
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return formatCurrency(value);
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Tabela de Vendedores */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Meta Individual</TableHead>
                  <TableHead>Total Vendido</TableHead>
                  <TableHead>% Meta Alcançado</TableHead>
                  <TableHead>Falta para Meta</TableHead>
                  <TableHead>% Contribuição</TableHead>
                  <TableHead>Qtd. Vendas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.vendedores.map((vendedor, index) => (
                  <TableRow key={vendedor.vendedor_id || index}>
                    <TableCell className="font-medium">{vendedor.vendedor_nome}</TableCell>
                    <TableCell>
                      {vendedor.meta_configurada ? (
                        formatCurrency(vendedor.meta_individual)
                      ) : (
                        <Badge variant="outline">Sem meta</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(vendedor.total_vendido)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{vendedor.percentual_meta_alcançado}%</span>
                        <Progress value={Math.min(vendedor.percentual_meta_alcançado, 100)} className="w-20" />
                        {vendedor.percentual_meta_alcançado >= 100 && (
                          <Badge variant="default" className="bg-green-500">✓</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={vendedor.valor_falta_meta > 0 ? 'text-red-500' : 'text-green-500'}>
                        {formatCurrency(vendedor.valor_falta_meta)}
                      </span>
                    </TableCell>
                    <TableCell>{vendedor.percentual_contribuicao}%</TableCell>
                    <TableCell>{vendedor.quantidade_vendas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Configuração */}
      <ConfigurarMetasModal
        isOpen={isConfigModalOpen}
        onClose={handleFecharConfigModal}
        meta={metaEditando}
        vendedores={vendedores}
      />
    </div>
  );
};

export default RelatorioVendasComMetas;
