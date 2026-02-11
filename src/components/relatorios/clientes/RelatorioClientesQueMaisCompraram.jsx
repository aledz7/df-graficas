import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trophy, 
  TrendingUp, 
  Loader2,
  FileDown,
  ShoppingBag,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import { formatCurrency } from '@/lib/utils';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import * as XLSX from 'xlsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const RelatorioClientesQueMaisCompraram = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [ano, setAno] = useState(new Date().getFullYear());

  useEffect(() => {
    carregarDados();
  }, [ano]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/clientes/relatorio/que-mais-compraram', {
        params: {
          ano: ano
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
    if (!dados || !dados.clientes) return;
    
    const wb = XLSX.utils.book_new();
    
    const data = [
      ['Ranking de Clientes que Mais Compraram no Ano'],
      [`Ano: ${ano}`],
      [`Total Geral: ${formatCurrency(dados.total_geral)}`],
      [],
      ['Posição', 'Cliente', 'Tipo', 'Total Compras', 'Quantidade', 'Ticket Médio', '% Participação', 'Email', 'Telefone']
    ];
    
    dados.clientes.forEach((cliente, index) => {
      data.push([
        index + 1,
        cliente.cliente_nome,
        cliente.tipo_pessoa,
        cliente.total_compras,
        cliente.quantidade_compras,
        cliente.ticket_medio,
        `${cliente.percentual_participacao}%`,
        cliente.email || '-',
        cliente.telefone || '-'
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking');
    XLSX.writeFile(wb, `clientes-que-mais-compraram-${ano}.xlsx`);
    
    toast({
      title: "Sucesso",
      description: "Relatório exportado com sucesso!",
    });
  };

  const anos = [];
  const anoAtual = new Date().getFullYear();
  for (let i = anoAtual - 5; i <= anoAtual + 1; i++) {
    anos.push(i);
  }

  // Dados para gráfico (top 10)
  const top10 = dados?.clientes?.slice(0, 10) || [];
  const chartData = {
    labels: top10.map(c => c.cliente_nome),
    datasets: [{
      label: 'Total de Compras (R$)',
      data: top10.map(c => c.total_compras),
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1
    }]
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando relatório...</span>
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
              <label className="text-sm font-medium mb-2 block">Ano</label>
              <Select value={ano.toString()} onValueChange={(value) => setAno(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((a) => (
                    <SelectItem key={a} value={a.toString()}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Resumo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Clientes que Mais Compraram no Ano
          </CardTitle>
          <CardDescription>
            Ranking por valor total de compras em {ano}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Geral</p>
              <p className="text-2xl font-bold">{formatCurrency(dados?.total_geral || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
              <p className="text-2xl font-bold">{dados?.total_clientes || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Média por Cliente</p>
              <p className="text-2xl font-bold">
                {dados?.total_clientes > 0 
                  ? formatCurrency((dados.total_geral || 0) / dados.total_clientes) 
                  : formatCurrency(0)}
              </p>
            </div>
          </div>

          {/* Gráfico Top 10 */}
          {top10.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Top 10 Clientes</h3>
              <div className="h-64">
                <Bar 
                  data={chartData}
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

          {/* Tabela de Ranking */}
          {dados && dados.clientes && dados.clientes.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Total Compras</TableHead>
                    <TableHead>Qtd. Compras</TableHead>
                    <TableHead>Ticket Médio</TableHead>
                    <TableHead>% Participação</TableHead>
                    <TableHead>Contato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.clientes.map((cliente, index) => (
                    <TableRow key={cliente.cliente_id || index}>
                      <TableCell>
                        <Badge 
                          variant={index < 3 ? "default" : "outline"}
                          className={index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-orange-500" : ""}
                        >
                          {index + 1}º
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{cliente.cliente_nome}</TableCell>
                      <TableCell>
                        <Badge variant={cliente.tipo_pessoa === 'Pessoa Jurídica' ? 'secondary' : 'default'}>
                          {cliente.tipo_pessoa}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(cliente.total_compras)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                          <span>{cliente.quantidade_compras}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(cliente.ticket_medio)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${Math.min(cliente.percentual_participacao, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm">{cliente.percentual_participacao}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {cliente.email && <div>{cliente.email}</div>}
                          {cliente.telefone && <div className="text-muted-foreground">{cliente.telefone}</div>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum cliente encontrado para este ano.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatorioClientesQueMaisCompraram;
