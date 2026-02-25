import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { cursoService } from '@/services/api';
import {
  FileText,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PERIODOS = [
  { value: 'ultimos_7_dias', label: 'Últimos 7 Dias', days: 7 },
  { value: 'ultimos_30_dias', label: 'Últimos 30 Dias', days: 30 },
  { value: 'ultimos_90_dias', label: 'Últimos 90 Dias', days: 90 },
  { value: 'personalizado', label: 'Personalizado', days: null },
];

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos Status' },
  { value: 'nao_iniciado', label: 'Não Iniciado' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'atrasado', label: 'Atrasado' },
];

const RelatorioTreinamentosPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, per_page: 25, current_page: 1, last_page: 1 });
  const [selectedRows, setSelectedRows] = useState([]);

  // Filtros
  const [periodo, setPeriodo] = useState('ultimos_30_dias');
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [area, setArea] = useState('todas');
  const [status, setStatus] = useState('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    aplicarPeriodo();
  }, [periodo]);

  useEffect(() => {
    carregarRelatorio();
  }, [dataInicio, dataFim, area, status, busca, pagination.current_page, pagination.per_page]);

  const aplicarPeriodo = () => {
    const periodoSelecionado = PERIODOS.find(p => p.value === periodo);
    if (periodoSelecionado && periodoSelecionado.days) {
      setDataInicio(format(subDays(new Date(), periodoSelecionado.days), 'yyyy-MM-dd'));
      setDataFim(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  const carregarRelatorio = async () => {
    setLoading(true);
    try {
      const params = {
        data_inicio: dataInicio,
        data_fim: dataFim,
        area: area !== 'todas' ? area : null,
        status: status !== 'todos' ? status : null,
        busca: busca || null,
        page: pagination.current_page,
        per_page: pagination.per_page,
      };

      const response = await cursoService.getRelatorio(params);
      if (response.data.success) {
        setDados(response.data.data || []);
        setPagination(response.data.pagination || pagination);
      }
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o relatório',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrar = () => {
    setPagination({ ...pagination, current_page: 1 });
    carregarRelatorio();
  };

  const getSetorNome = (setor) => {
    const setores = {
      administrativo: 'Administrativo',
      financeiro: 'Financeiro',
      comercial: 'Comercial',
      criacao: 'Criação',
      producao: 'Produção',
      logistica: 'Logística',
      efc: 'EFC',
    };
    return setores[setor] || setor;
  };

  const getSetorCor = (setor) => {
    const cores = {
      administrativo: 'bg-purple-100 text-purple-800',
      financeiro: 'bg-blue-100 text-blue-800',
      comercial: 'bg-yellow-100 text-yellow-800',
      criacao: 'bg-yellow-100 text-yellow-800',
      producao: 'bg-green-100 text-green-800',
      logistica: 'bg-green-100 text-green-800',
      efc: 'bg-pink-100 text-pink-800',
    };
    return cores[setor] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      nao_iniciado: { label: 'Não Iniciado', cor: 'bg-gray-100 text-gray-800' },
      em_andamento: { label: 'Em Andamento', cor: 'bg-blue-100 text-blue-800' },
      concluido: { label: 'Concluído', cor: 'bg-green-100 text-green-800' },
      atrasado: { label: 'Atrasado', cor: 'bg-red-100 text-red-800' },
    };
    return statusConfig[status] || statusConfig.nao_iniciado;
  };

  const formatarDataHora = (dataHora) => {
    if (!dataHora) return '-';
    return format(new Date(dataHora), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.last_page) {
      setPagination({ ...pagination, current_page: newPage });
    }
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(dados.map(d => d.id));
    } else {
      setSelectedRows([]);
    }
  };

  const toggleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(r => r !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Relatório de Treinamentos</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Período</label>
                <Select value={periodo} onValueChange={setPeriodo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODOS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Data Início</label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  disabled={periodo !== 'personalizado'}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Data Fim</label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  disabled={periodo !== 'personalizado'}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Área</label>
                <Select value={area} onValueChange={setArea}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas Áreas</SelectItem>
                    {['administrativo', 'financeiro', 'comercial', 'criacao', 'producao', 'logistica', 'efc'].map(setor => (
                      <SelectItem key={setor} value={setor}>{getSetorNome(setor)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">Buscar treinamento...</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar treinamento..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleFiltrar()}
                  />
                </div>
              </div>

              <div className="flex items-end">
                <Button onClick={handleFiltrar} className="w-full bg-green-500 hover:bg-green-600">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">
            ({pagination.total} resultados)
          </span>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedRows.length === dados.length && dados.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Treinamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Conclusão</TableHead>
                      <TableHead>Tempo Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <p className="text-gray-600">Nenhum registro encontrado</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      dados.map((registro) => {
                        const statusInfo = getStatusBadge(registro.status);
                        return (
                          <TableRow key={registro.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedRows.includes(registro.id)}
                                onCheckedChange={() => toggleSelectRow(registro.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Users className="h-4 w-4 text-primary" />
                                </div>
                                <span className="font-medium">{registro.colaborador.nome}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getSetorCor(registro.colaborador.setor || registro.treinamento.setor)}>
                                {getSetorNome(registro.colaborador.setor || registro.treinamento.setor)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{registro.treinamento.nome}</p>
                                {registro.treinamento.obrigatorio && (
                                  <Badge variant="outline" className="mt-1 text-xs">Obrigatório</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusInfo.cor}>
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatarDataHora(registro.data_inicio)}
                            </TableCell>
                            <TableCell>
                              {formatarDataHora(registro.data_conclusao)}
                            </TableCell>
                            <TableCell>
                              {registro.duracao_total.formatado}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paginação */}
        {!loading && dados.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Mostrando {((pagination.current_page - 1) * pagination.per_page) + 1} até{' '}
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} de {pagination.total}
              </span>
              <Select
                value={pagination.per_page.toString()}
                onValueChange={(value) => setPagination({ ...pagination, per_page: parseInt(value), current_page: 1 })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 registros</SelectItem>
                  <SelectItem value="50">50 registros</SelectItem>
                  <SelectItem value="100">100 registros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                let pageNum;
                if (pagination.last_page <= 5) {
                  pageNum = i + 1;
                } else if (pagination.current_page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.current_page >= pagination.last_page - 2) {
                  pageNum = pagination.last_page - 4 + i;
                } else {
                  pageNum = pagination.current_page - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={pagination.current_page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.last_page}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Exportação */}
        {!loading && dados.length > 0 && (
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar para
            </Button>
            <Button variant="outline">
              Excel
            </Button>
            <Button variant="outline">
              PDF
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RelatorioTreinamentosPage;
