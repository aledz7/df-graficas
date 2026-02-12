import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Medal, Award, TrendingUp, DollarSign, ShoppingCart, BarChart3, Calendar } from 'lucide-react';
import { rankingVendedoresService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RankingVendedoresPage = () => {
  const { toast } = useToast();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tipoRanking, setTipoRanking] = useState('valor'); // 'valor' ou 'quantidade'
  const [tipoPeriodo, setTipoPeriodo] = useState('mensal');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [totalGeral, setTotalGeral] = useState(0);

  const carregarRanking = async () => {
    setLoading(true);
    try {
      const params = {
        tipo_periodo: tipoPeriodo,
      };

      if (tipoPeriodo === 'mensal') {
        params.mes = mes;
        params.ano = ano;
      } else if (tipoPeriodo === 'personalizado') {
        params.data_inicio = dataInicio;
        params.data_fim = dataFim;
      }

      const response = tipoRanking === 'valor' 
        ? await rankingVendedoresService.getRanking(params)
        : await rankingVendedoresService.getRankingPorQuantidade(params);

      if (response.data.success) {
        setRanking(response.data.data.ranking || []);
        setTotalGeral(tipoRanking === 'valor' 
          ? response.data.data.total_geral || 0
          : response.data.data.total_geral_vendas || 0
        );
      }
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o ranking.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRanking();
  }, [tipoRanking, tipoPeriodo, mes, ano, dataInicio, dataFim]);

  const getPosicaoIcon = (posicao) => {
    switch (posicao) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{posicao}</span>;
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ranking de Vendedores</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o desempenho da equipe de vendas
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Ranking</label>
              <Select value={tipoRanking} onValueChange={setTipoRanking}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor">Por Valor</SelectItem>
                  <SelectItem value="quantidade">Por Quantidade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={tipoPeriodo} onValueChange={setTipoPeriodo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diário</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoPeriodo === 'mensal' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Mês</label>
                  <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <SelectItem key={m} value={m.toString()}>
                          {format(new Date(2024, m - 1, 1), 'MMMM', { locale: ptBR })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Ano</label>
                  <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(a => (
                        <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {tipoPeriodo === 'personalizado' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Data Início</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Data Fim</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Classificação</CardTitle>
              <CardDescription>
                {tipoRanking === 'valor' 
                  ? `Total geral: ${formatarMoeda(totalGeral)}`
                  : `Total de vendas: ${totalGeral}`
                }
              </CardDescription>
            </div>
            <Button onClick={carregarRanking} disabled={loading}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : ranking.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum vendedor encontrado no período selecionado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pódio - Top 3 */}
              {ranking.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {/* 2º Lugar */}
                  <div className="flex flex-col items-center pt-8">
                    <div className="relative">
                      {getPosicaoIcon(2)}
                      <div className="absolute -top-2 -right-2 bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="font-semibold">{ranking[1]?.vendedor_nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {tipoRanking === 'valor' 
                          ? formatarMoeda(ranking[1]?.total_vendido || 0)
                          : `${ranking[1]?.quantidade_vendas || 0} vendas`
                        }
                      </p>
                    </div>
                  </div>

                  {/* 1º Lugar */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      {getPosicaoIcon(1)}
                      <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="font-bold text-lg">{ranking[0]?.vendedor_nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {tipoRanking === 'valor' 
                          ? formatarMoeda(ranking[0]?.total_vendido || 0)
                          : `${ranking[0]?.quantidade_vendas || 0} vendas`
                        }
                      </p>
                    </div>
                  </div>

                  {/* 3º Lugar */}
                  <div className="flex flex-col items-center pt-12">
                    <div className="relative">
                      {getPosicaoIcon(3)}
                      <div className="absolute -top-2 -right-2 bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="font-semibold">{ranking[2]?.vendedor_nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {tipoRanking === 'valor' 
                          ? formatarMoeda(ranking[2]?.total_vendido || 0)
                          : `${ranking[2]?.quantidade_vendas || 0} vendas`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista completa */}
              <div className="space-y-2">
                {ranking.map((vendedor, index) => (
                  <Card key={vendedor.vendedor_id} className={index < 3 ? 'border-primary' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            {getPosicaoIcon(vendedor.posicao)}
                          </div>
                          <div>
                            <p className="font-semibold">{vendedor.vendedor_nome}</p>
                            <p className="text-sm text-muted-foreground">{vendedor.vendedor_email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          {tipoRanking === 'valor' ? (
                            <>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Total Vendido</p>
                                <p className="font-bold text-lg">{formatarMoeda(vendedor.total_vendido)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                                <p className="font-semibold">{formatarMoeda(vendedor.ticket_medio)}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Quantidade</p>
                                <p className="font-bold text-lg">{vendedor.quantidade_vendas}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Total Vendido</p>
                                <p className="font-semibold">{formatarMoeda(vendedor.total_vendido)}</p>
                              </div>
                            </>
                          )}

                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Contribuição</p>
                            <Badge variant="secondary" className="text-sm">
                              {vendedor.percentual_contribuicao}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RankingVendedoresPage;
