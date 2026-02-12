import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  TrendingDown, 
  DollarSign, 
  ShoppingCart,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Phone,
  Mail
} from 'lucide-react';
import { clienteTendenciaService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ClientesDiminuindoComprasPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [filtros, setFiltros] = useState({
    periodo_recente_dias: 30,
    periodo_anterior_dias: 30,
    percentual_queda_minimo: 30,
    valor_minimo_vendas: 500,
  });

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    setLoading(true);
    try {
      const response = await clienteTendenciaService.getClientesComQueda(filtros);
      if (response.data.success) {
        setClientes(response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const gerarAlertas = async () => {
    setLoading(true);
    try {
      const response = await clienteTendenciaService.gerarAlertas(filtros);
      if (response.data.success) {
        toast({
          title: "Sucesso",
          description: response.data.message,
        });
        carregarClientes();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao gerar alertas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getCorQueda = (percentual) => {
    if (percentual >= 70) return 'text-red-600 font-bold';
    if (percentual >= 50) return 'text-orange-600 font-semibold';
    return 'text-yellow-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes Diminuindo Compras</h1>
          <p className="text-muted-foreground mt-1">
            Identifique clientes que estão comprando menos e aja antes que parem de comprar
          </p>
        </div>
        <Button onClick={gerarAlertas} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Gerar Alertas
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Análise</CardTitle>
          <CardDescription>
            Configure os parâmetros para identificar clientes com queda nas compras
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Período Recente (dias)</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={filtros.periodo_recente_dias}
                onChange={(e) => setFiltros({ ...filtros, periodo_recente_dias: parseInt(e.target.value) || 30 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Período mais recente para comparar
              </p>
            </div>
            <div>
              <Label>Período Anterior (dias)</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={filtros.periodo_anterior_dias}
                onChange={(e) => setFiltros({ ...filtros, periodo_anterior_dias: parseInt(e.target.value) || 30 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Período anterior para comparar
              </p>
            </div>
            <div>
              <Label>Queda Mínima (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={filtros.percentual_queda_minimo}
                onChange={(e) => setFiltros({ ...filtros, percentual_queda_minimo: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Percentual mínimo de queda para alertar
              </p>
            </div>
            <div>
              <Label>Valor Mínimo (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={filtros.valor_minimo_vendas}
                onChange={(e) => setFiltros({ ...filtros, valor_minimo_vendas: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Valor mínimo no período anterior
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={carregarClientes} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>
            Clientes com Queda nas Compras
            {clientes.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {clientes.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Clientes que estão comprando significativamente menos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum cliente com queda significativa encontrado</p>
              <p className="text-sm mt-2">
                Ajuste os filtros ou aguarde novas vendas para análise
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Período Anterior</TableHead>
                  <TableHead>Período Recente</TableHead>
                  <TableHead className="text-right">Queda Valor</TableHead>
                  <TableHead className="text-right">Queda Qtd</TableHead>
                  <TableHead>Contato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.cliente_id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{cliente.cliente_nome}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Atenção
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-green-600">
                          {formatarMoeda(cliente.total_anterior)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cliente.qtd_vendas_anterior} {cliente.qtd_vendas_anterior === 1 ? 'venda' : 'vendas'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(cliente.periodo_anterior.inicio), 'dd/MM/yyyy', { locale: ptBR })} a{' '}
                          {format(new Date(cliente.periodo_anterior.fim), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-red-600">
                          {formatarMoeda(cliente.total_recente)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cliente.qtd_vendas_recente} {cliente.qtd_vendas_recente === 1 ? 'venda' : 'vendas'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(cliente.periodo_recente.inicio), 'dd/MM/yyyy', { locale: ptBR })} a{' '}
                          {format(new Date(cliente.periodo_recente.fim), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className={`font-bold ${getCorQueda(cliente.percentual_queda_valor)}`}>
                        -{cliente.percentual_queda_valor.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatarMoeda(cliente.total_anterior - cliente.total_recente)} a menos
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className={`font-bold ${getCorQueda(cliente.percentual_queda_quantidade)}`}>
                        -{cliente.percentual_queda_quantidade.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cliente.qtd_vendas_anterior - cliente.qtd_vendas_recente} {cliente.qtd_vendas_anterior - cliente.qtd_vendas_recente === 1 ? 'venda a menos' : 'vendas a menos'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {cliente.cliente_telefone && (
                          <div className="flex items-center gap-1 text-xs">
                            <Phone className="h-3 w-3" />
                            {cliente.cliente_telefone}
                          </div>
                        )}
                        {cliente.cliente_email && (
                          <div className="flex items-center gap-1 text-xs">
                            <Mail className="h-3 w-3" />
                            {cliente.cliente_email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resumo */}
      {clientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Total de Clientes</p>
                <p className="text-2xl font-bold">{clientes.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Queda Média (Valor)</p>
                <p className="text-2xl font-bold text-red-600">
                  {clientes.length > 0
                    ? (
                        clientes.reduce((sum, c) => sum + c.percentual_queda_valor, 0) /
                        clientes.length
                      ).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Queda Média (Quantidade)</p>
                <p className="text-2xl font-bold text-orange-600">
                  {clientes.length > 0
                    ? (
                        clientes.reduce((sum, c) => sum + c.percentual_queda_quantidade, 0) /
                        clientes.length
                      ).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientesDiminuindoComprasPage;
