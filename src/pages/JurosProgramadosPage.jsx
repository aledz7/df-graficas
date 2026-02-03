import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Percent, Calendar, Clock, Play, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import { contaReceberService } from '@/services/api';

const JurosProgramadosPage = () => {
  const { toast } = useToast();
  const [contasComJuros, setContasComJuros] = useState([]);
  const [contasParaAplicar, setContasParaAplicar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aplicandoJuros, setAplicandoJuros] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar contas com juros configurados
      const responseJuros = await contaReceberService.contasComJurosConfigurados();
      setContasComJuros(responseJuros.data || []);

      // Carregar contas que devem ter juros aplicados hoje
      const responseParaAplicar = await contaReceberService.contasParaAplicarJuros();
      setContasParaAplicar(responseParaAplicar.data || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados de juros programados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const aplicarJurosEmLote = async () => {
    try {
      setAplicandoJuros(true);
      
      const response = await contaReceberService.aplicarJurosEmLote();
      
      toast({
        title: "Sucesso",
        description: `Juros aplicados em ${response.data.total_aplicadas} contas.`,
      });

      // Recarregar dados
      await carregarDados();
      
    } catch (error) {
      console.error('Erro ao aplicar juros em lote:', error);
      toast({
        title: "Erro",
        description: "Erro ao aplicar juros em lote.",
        variant: "destructive"
      });
    } finally {
      setAplicandoJuros(false);
    }
  };

  const aplicarJurosContaEspecifica = async (contaId) => {
    try {
      await contaReceberService.aplicarJurosProgramados(contaId, {
        motivo: 'Aplicação manual via interface'
      });
      
      toast({
        title: "Sucesso",
        description: "Juros aplicados com sucesso.",
      });

      await carregarDados();
      
    } catch (error) {
      console.error('Erro ao aplicar juros:', error);
      toast({
        title: "Erro",
        description: "Erro ao aplicar juros a esta conta.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (conta) => {
    if (conta.status === 'quitada') {
      return <Badge variant="secondary">Quitada</Badge>;
    }
    
    const hoje = new Date();
    const dataInicio = parseISO(conta.data_inicio_cobranca_juros);
    
    if (hoje < dataInicio) {
      return <Badge variant="outline">Aguardando Início</Badge>;
    }
    
    if (conta.ultima_aplicacao_juros) {
      const ultimaAplicacao = parseISO(conta.ultima_aplicacao_juros);
      const diasDesdeUltima = differenceInDays(hoje, ultimaAplicacao);
      
      switch (conta.frequencia_juros) {
        case 'diaria':
          return diasDesdeUltima >= 1 ? 
            <Badge variant="destructive">Pronto para Aplicar</Badge> : 
            <Badge variant="secondary">Aplicado Hoje</Badge>;
        case 'semanal':
          return diasDesdeUltima >= 7 ? 
            <Badge variant="destructive">Pronto para Aplicar</Badge> : 
            <Badge variant="secondary">Aplicado Recentemente</Badge>;
        case 'mensal':
          return diasDesdeUltima >= 30 ? 
            <Badge variant="destructive">Pronto para Aplicar</Badge> : 
            <Badge variant="secondary">Aplicado Recentemente</Badge>;
        default:
          return <Badge variant="secondary">Configurado</Badge>;
      }
    }
    
    return <Badge variant="destructive">Pronto para Aplicar</Badge>;
  };

  const getFrequenciaText = (frequencia) => {
    const frequencias = {
      'unica': 'Aplicação Única',
      'diaria': 'Diária',
      'semanal': 'Semanal',
      'mensal': 'Mensal'
    };
    return frequencias[frequencia] || frequencia;
  };

  const getTipoJurosText = (tipo, valor) => {
    if (tipo === 'percentual') {
      return `${valor}%`;
    }
    return `R$ ${parseFloat(valor).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p>Carregando dados de juros programados...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Juros Programados</h1>
          <p className="text-muted-foreground">Gerencie a aplicação automática de juros nas contas a receber</p>
        </div>
        
        {contasParaAplicar.length > 0 && (
          <Button 
            onClick={aplicarJurosEmLote} 
            disabled={aplicandoJuros}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {aplicandoJuros ? 'Aplicando...' : `Aplicar Juros (${contasParaAplicar.length})`}
          </Button>
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Contas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contasComJuros.length}</div>
            <p className="text-xs text-muted-foreground">Com juros configurados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prontas para Aplicar</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{contasParaAplicar.length}</div>
            <p className="text-xs text-muted-foreground">Devem ter juros aplicados hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aplicações Realizadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {contasComJuros.reduce((total, conta) => total + (conta.total_aplicacoes_juros || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total de aplicações</p>
          </CardContent>
        </Card>
      </div>

      {/* Contas com Juros Configurados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Percent className="h-5 w-5 mr-2" />
            Contas com Juros Configurados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contasComJuros.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Percent className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma conta com juros configurados encontrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor Pendente</TableHead>
                  <TableHead>Configuração</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Última Aplicação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contasComJuros.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell className="font-medium">
                      {conta.cliente?.nome_completo || 'Cliente não encontrado'}
                    </TableCell>
                    <TableCell>
                      R$ {parseFloat(conta.valor_pendente).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{getTipoJurosText(conta.tipo_juros, conta.valor_juros)}</div>
                        <div className="text-muted-foreground">{getFrequenciaText(conta.frequencia_juros)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(parseISO(conta.data_inicio_cobranca_juros), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {conta.ultima_aplicacao_juros ? 
                        format(parseISO(conta.ultima_aplicacao_juros), 'dd/MM/yyyy') : 
                        'Nunca aplicado'
                      }
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(conta)}
                    </TableCell>
                    <TableCell>
                      {conta.status !== 'quitada' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => aplicarJurosContaEspecifica(conta.id)}
                          disabled={conta.status === 'quitada'}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Aplicar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Contas Prontas para Aplicar */}
      {contasParaAplicar.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Contas Prontas para Aplicar Juros ({contasParaAplicar.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor Pendente</TableHead>
                  <TableHead>Juros a Aplicar</TableHead>
                  <TableHead>Configuração</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contasParaAplicar.map((conta) => {
                  const valorJuros = conta.tipo_juros === 'percentual' ? 
                    (conta.valor_pendente * conta.valor_juros) / 100 : 
                    conta.valor_juros;
                  
                  return (
                    <TableRow key={conta.id} className="bg-red-50">
                      <TableCell className="font-medium">
                        {conta.cliente?.nome_completo || 'Cliente não encontrado'}
                      </TableCell>
                      <TableCell>
                        R$ {parseFloat(conta.valor_pendente).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-red-600 font-semibold">
                        R$ {parseFloat(valorJuros).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{getTipoJurosText(conta.tipo_juros, conta.valor_juros)}</div>
                          <div className="text-muted-foreground">{getFrequenciaText(conta.frequencia_juros)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => aplicarJurosContaEspecifica(conta.id)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Aplicar Agora
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JurosProgramadosPage; 