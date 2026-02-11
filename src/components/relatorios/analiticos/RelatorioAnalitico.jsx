import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Package, 
  BarChart3, 
  PieChart,
  FileDown,
  CalendarDays,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { formatCurrency } from '@/lib/utils';
import { vendaService } from '@/services/api';
import api from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import * as XLSX from 'xlsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const RelatorioAnalitico = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [showDataInicioPicker, setShowDataInicioPicker] = useState(false);
  const [showDataFimPicker, setShowDataFimPicker] = useState(false);
  const [dados, setDados] = useState(null);

  useEffect(() => {
    carregarDados();
  }, [dataInicio, dataFim]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/vendas/relatorio-analitico', {
        params: {
          data_inicio: dataInicio,
          data_fim: dataFim
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

  const exportarExcel = () => {
    if (!dados) return;
    
    const wb = XLSX.utils.book_new();
    
    // Aba 1: Resumo
    const resumoData = [
      ['Relatório Analítico'],
      ['Período:', `${format(parseISO(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} a ${format(parseISO(dataFim), 'dd/MM/yyyy', { locale: ptBR })}`],
      [],
      ['Faturamento', formatCurrency(dados.faturamento)],
      ['Ticket Médio', formatCurrency(dados.ticket_medio)],
      ['Quantidade de Pedidos', dados.quantidade_pedidos],
      ['Clientes Ativos', dados.clientes_ativos?.length || 0],
      ['Clientes Inativos', dados.clientes_inativos?.length || 0],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumo');
    
    // Aba 2: Vendas por Cliente
    const clientesData = [['Cliente', 'Quantidade de Vendas', 'Faturamento']];
    dados.vendas_por_cliente?.forEach(cliente => {
      clientesData.push([
        cliente.cliente_nome,
        cliente.quantidade_vendas,
        cliente.faturamento
      ]);
    });
    const ws2 = XLSX.utils.aoa_to_sheet(clientesData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Vendas por Cliente');
    
    // Aba 3: Vendas por Produto
    const produtosData = [['Produto', 'Quantidade', 'Faturamento', 'Custo Total', 'Lucro']];
    dados.vendas_por_produto?.forEach(produto => {
      produtosData.push([
        produto.produto_nome,
        produto.quantidade,
        produto.faturamento,
        produto.custo_total,
        produto.lucro
      ]);
    });
    const ws3 = XLSX.utils.aoa_to_sheet(produtosData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Vendas por Produto');
    
    XLSX.writeFile(wb, `relatorio-analitico-${dataInicio}-${dataFim}.xlsx`);
    toast({
      title: "Sucesso",
      description: "Relatório exportado com sucesso!",
    });
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
        <AlertCircle className="h-8 w-8 text-destructive" />
        <span className="ml-2">Erro ao carregar dados do relatório</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Data Início</Label>
              <Popover open={showDataInicioPicker} onOpenChange={setShowDataInicioPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
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
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
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
              <Button onClick={exportarExcel} className="w-full">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Faturamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dados.faturamento)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total vendido no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ticket Médio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dados.ticket_medio)}</div>
            <p className="text-xs text-muted-foreground mt-1">Valor médio por pedido</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Quantidade de Pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dados.quantidade_pedidos}</div>
            <p className="text-xs text-muted-foreground mt-1">Total de vendas realizadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clientes Ativos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dados.clientes_ativos?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Compraram nos últimos 90 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com Relatórios Detalhados */}
      <Tabs defaultValue="vendas-periodo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="vendas-periodo">Vendas por Período</TabsTrigger>
          <TabsTrigger value="vendas-cliente">Por Cliente</TabsTrigger>
          <TabsTrigger value="vendas-produto">Por Produto</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="curva-abc">Curva ABC</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
        </TabsList>

        {/* Vendas por Período */}
        <TabsContent value="vendas-periodo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Período</CardTitle>
              <CardDescription>Vendas organizadas por dia</CardDescription>
            </CardHeader>
            <CardContent>
              {dados.vendas_por_periodo && Object.keys(dados.vendas_por_periodo).length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Faturamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(dados.vendas_por_periodo)
                        .sort(([a], [b]) => new Date(b) - new Date(a))
                        .map(([data, info]) => (
                          <TableRow key={data}>
                            <TableCell>{format(parseISO(data), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                            <TableCell>{info.quantidade}</TableCell>
                            <TableCell>{formatCurrency(info.faturamento)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma venda encontrada no período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendas por Cliente */}
        <TabsContent value="vendas-cliente" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Cliente</CardTitle>
              <CardDescription>Total de vendas realizadas para cada cliente</CardDescription>
            </CardHeader>
            <CardContent>
              {dados.vendas_por_cliente && dados.vendas_por_cliente.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Quantidade de Vendas</TableHead>
                        <TableHead>Faturamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dados.vendas_por_cliente.map((cliente, index) => (
                        <TableRow key={cliente.cliente_id || index}>
                          <TableCell className="font-medium">{cliente.cliente_nome}</TableCell>
                          <TableCell>{cliente.quantidade_vendas}</TableCell>
                          <TableCell>{formatCurrency(cliente.faturamento)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendas por Produto */}
        <TabsContent value="vendas-produto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Produto</CardTitle>
              <CardDescription>Quantidade e valor vendido de cada produto</CardDescription>
            </CardHeader>
            <CardContent>
              {dados.vendas_por_produto && dados.vendas_por_produto.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Faturamento</TableHead>
                        <TableHead>Custo Total</TableHead>
                        <TableHead>Lucro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dados.vendas_por_produto.map((produto, index) => (
                        <TableRow key={produto.produto_id || index}>
                          <TableCell className="font-medium">{produto.produto_nome}</TableCell>
                          <TableCell>{produto.quantidade.toFixed(2)}</TableCell>
                          <TableCell>{formatCurrency(produto.faturamento)}</TableCell>
                          <TableCell>{formatCurrency(produto.custo_total)}</TableCell>
                          <TableCell>
                            <Badge variant={produto.lucro >= 0 ? "default" : "destructive"}>
                              {formatCurrency(produto.lucro)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clientes Ativos/Inativos */}
        <TabsContent value="clientes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Clientes Ativos
                </CardTitle>
                <CardDescription>Compraram nos últimos 90 dias</CardDescription>
              </CardHeader>
              <CardContent>
                {dados.clientes_ativos && dados.clientes_ativos.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dados.clientes_ativos.map((cliente) => (
                          <TableRow key={cliente.id}>
                            <TableCell>{cliente.nome}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum cliente ativo encontrado</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Clientes Inativos
                </CardTitle>
                <CardDescription>Não compram há 90 dias ou mais</CardDescription>
              </CardHeader>
              <CardContent>
                {dados.clientes_inativos && dados.clientes_inativos.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Dias sem Compra</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dados.clientes_inativos.map((cliente) => (
                          <TableRow key={cliente.id}>
                            <TableCell>{cliente.nome}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">
                                {cliente.dias_sem_compra !== null ? `${cliente.dias_sem_compra} dias` : 'Nunca comprou'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum cliente inativo encontrado</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Curva ABC */}
        <TabsContent value="curva-abc" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Curva ABC de Clientes</CardTitle>
                <CardDescription>Classificação por faturamento gerado</CardDescription>
              </CardHeader>
              <CardContent>
                {dados.curva_abc_clientes && dados.curva_abc_clientes.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Faturamento</TableHead>
                          <TableHead>%</TableHead>
                          <TableHead>% Acum.</TableHead>
                          <TableHead>Classificação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dados.curva_abc_clientes.map((cliente, index) => (
                          <TableRow key={cliente.cliente_id || index}>
                            <TableCell className="font-medium">{cliente.cliente_nome}</TableCell>
                            <TableCell>{formatCurrency(cliente.faturamento)}</TableCell>
                            <TableCell>{cliente.percentual}%</TableCell>
                            <TableCell>{cliente.percentual_acumulado}%</TableCell>
                            <TableCell>
                              <Badge variant={cliente.classificacao === 'A' ? 'default' : cliente.classificacao === 'B' ? 'secondary' : 'outline'}>
                                {cliente.classificacao}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Curva ABC de Produtos</CardTitle>
                <CardDescription>Classificação por faturamento gerado</CardDescription>
              </CardHeader>
              <CardContent>
                {dados.curva_abc_produtos && dados.curva_abc_produtos.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Faturamento</TableHead>
                          <TableHead>%</TableHead>
                          <TableHead>% Acum.</TableHead>
                          <TableHead>Classificação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dados.curva_abc_produtos.map((produto, index) => (
                          <TableRow key={produto.produto_id || index}>
                            <TableCell className="font-medium">{produto.produto_nome}</TableCell>
                            <TableCell>{formatCurrency(produto.faturamento)}</TableCell>
                            <TableCell>{produto.percentual}%</TableCell>
                            <TableCell>{produto.percentual_acumulado}%</TableCell>
                            <TableCell>
                              <Badge variant={produto.classificacao === 'A' ? 'default' : produto.classificacao === 'B' ? 'secondary' : 'outline'}>
                                {produto.classificacao}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Produtos Mais Vendidos e Mais Lucrativos */}
        <TabsContent value="produtos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Produtos Mais Vendidos</CardTitle>
                <CardDescription>Ordenados por quantidade vendida</CardDescription>
              </CardHeader>
              <CardContent>
                {dados.produtos_mais_vendidos && dados.produtos_mais_vendidos.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>Faturamento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dados.produtos_mais_vendidos.slice(0, 20).map((produto, index) => (
                          <TableRow key={produto.produto_id || index}>
                            <TableCell className="font-medium">{produto.produto_nome}</TableCell>
                            <TableCell>{produto.quantidade.toFixed(2)}</TableCell>
                            <TableCell>{formatCurrency(produto.faturamento)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Produtos Mais Lucrativos</CardTitle>
                <CardDescription>Ordenados por lucro gerado</CardDescription>
              </CardHeader>
              <CardContent>
                {dados.produtos_mais_lucrativos && dados.produtos_mais_lucrativos.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Faturamento</TableHead>
                          <TableHead>Custo</TableHead>
                          <TableHead>Lucro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dados.produtos_mais_lucrativos.slice(0, 20).map((produto, index) => (
                          <TableRow key={produto.produto_id || index}>
                            <TableCell className="font-medium">{produto.produto_nome}</TableCell>
                            <TableCell>{formatCurrency(produto.faturamento)}</TableCell>
                            <TableCell>{formatCurrency(produto.custo_total)}</TableCell>
                            <TableCell>
                              <Badge variant={produto.lucro >= 0 ? "default" : "destructive"}>
                                {formatCurrency(produto.lucro)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Mix de Produtos</CardTitle>
              <CardDescription>Participação percentual de cada produto no faturamento total</CardDescription>
            </CardHeader>
            <CardContent>
              {dados.mix_produtos && dados.mix_produtos.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Faturamento</TableHead>
                        <TableHead>Participação %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dados.mix_produtos.map((produto, index) => (
                        <TableRow key={produto.produto_id || index}>
                          <TableCell className="font-medium">{produto.produto_nome}</TableCell>
                          <TableCell>{formatCurrency(produto.faturamento)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full" 
                                  style={{ width: `${Math.min(produto.participacao_percentual, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm">{produto.participacao_percentual}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RelatorioAnalitico;
