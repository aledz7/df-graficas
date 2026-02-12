import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, TrendingUp, Award, Star, Gift, History, Medal, Crown, Gem } from 'lucide-react';
import { metaVendaService, gamificacaoService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MetasGamificadasPage = () => {
  const { toast } = useToast();
  const [metas, setMetas] = useState([]);
  const [meusPontos, setMeusPontos] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [premiacoes, setPremiacoes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      await Promise.all([
        carregarMetas(),
        carregarMeusPontos(),
        carregarRanking(),
        carregarHistorico(),
        carregarPremiacoes()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const carregarMetas = async () => {
    try {
      const response = await metaVendaService.getAll({ ativo: true });
      if (response.data.success) {
        const metasComProgresso = await Promise.all(
          (response.data.data || []).map(async (meta) => {
            try {
              const progressoResponse = await metaVendaService.getProgresso(meta.id);
              return {
                ...meta,
                progresso: progressoResponse.data
              };
            } catch {
              return meta;
            }
          })
        );
        setMetas(metasComProgresso);
      }
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
    }
  };

  const carregarMeusPontos = async () => {
    try {
      const response = await gamificacaoService.getMeusPontos();
      if (response.data.success) {
        setMeusPontos(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar pontos:', error);
    }
  };

  const carregarRanking = async () => {
    try {
      const response = await gamificacaoService.getRanking({ limite: 10 });
      if (response.data.success) {
        setRanking(response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
    }
  };

  const carregarHistorico = async () => {
    try {
      const response = await gamificacaoService.getHistorico();
      if (response.data.success) {
        const data = response.data.data;
        setHistorico(Array.isArray(data) ? data : (data?.data || []));
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const carregarPremiacoes = async () => {
    try {
      const response = await gamificacaoService.getPremiacoes();
      if (response.data.success) {
        const data = response.data.data;
        setPremiacoes(Array.isArray(data) ? data : (data?.data || []));
      }
    } catch (error) {
      console.error('Erro ao carregar premiações:', error);
    }
  };

  const getBadgeIcon = (nivel) => {
    switch (nivel) {
      case 1:
        return <Medal className="h-8 w-8 text-amber-700" />;
      case 2:
        return <Medal className="h-8 w-8 text-gray-400" />;
      case 3:
        return <Award className="h-8 w-8 text-yellow-500" />;
      case 4:
        return <Star className="h-8 w-8 text-blue-500" />;
      case 5:
        return <Crown className="h-8 w-8 text-purple-500" />;
      default:
        return <Medal className="h-8 w-8 text-gray-500" />;
    }
  };

  const getBadgeName = (nivel) => {
    switch (nivel) {
      case 1: return 'Bronze';
      case 2: return 'Prata';
      case 3: return 'Ouro';
      case 4: return 'Platina';
      case 5: return 'Diamante';
      default: return 'Iniciante';
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
          <h1 className="text-3xl font-bold">Metas Gamificadas</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe suas metas, pontos e conquistas
          </p>
        </div>
        <Button onClick={carregarDados} disabled={loading}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Meus Pontos */}
      {meusPontos && (
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getBadgeIcon(meusPontos.nivel)}
                <div>
                  <p className="text-sm opacity-90">Seu Nível</p>
                  <p className="text-2xl font-bold">{getBadgeName(meusPontos.nivel)}</p>
                  <p className="text-sm opacity-90">{meusPontos.pontos_totais} pontos</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Próximo Nível</p>
                <p className="text-xl font-bold">{getBadgeName(meusPontos.nivel + 1)}</p>
                {meusPontos.pontos_faltam > 0 && (
                  <p className="text-sm opacity-90">Faltam {meusPontos.pontos_faltam} pontos</p>
                )}
              </div>
            </div>
            {meusPontos.pontos_faltam > 0 && (
              <div className="mt-4">
                <Progress 
                  value={((meusPontos.pontos_totais / meusPontos.pontos_proximo_nivel) * 100)} 
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="metas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metas">
            <Target className="h-4 w-4 mr-2" />
            Metas
          </TabsTrigger>
          <TabsTrigger value="ranking">
            <Trophy className="h-4 w-4 mr-2" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="historico">
            <History className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="premiacoes">
            <Gift className="h-4 w-4 mr-2" />
            Premiações
          </TabsTrigger>
        </TabsList>

        {/* Tab Metas */}
        <TabsContent value="metas" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : metas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma meta ativa no momento</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metas.map((meta) => {
                const progresso = meta.progresso;
                const percentual = progresso?.percentual_alcancado || 0;
                const metaBatida = progresso?.meta_batida || false;

                return (
                  <Card key={meta.id} className={metaBatida ? 'border-green-500' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            {meta.tipo === 'empresa' ? 'Meta da Empresa' : `Meta: ${meta.vendedor?.name || 'Vendedor'}`}
                          </CardTitle>
                          <CardDescription>
                            {format(new Date(meta.data_inicio), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(meta.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                          </CardDescription>
                        </div>
                        {metaBatida && (
                          <Badge className="bg-green-500">
                            <Award className="h-3 w-3 mr-1" />
                            Meta Batida!
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Progresso</span>
                          <span className="text-sm font-bold">{percentual.toFixed(1)}%</span>
                        </div>
                        <Progress value={percentual} className="h-3" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Meta</p>
                          <p className="text-lg font-bold">{formatarMoeda(meta.valor_meta)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Realizado</p>
                          <p className="text-lg font-bold">{formatarMoeda(progresso?.valor_realizado || 0)}</p>
                        </div>
                      </div>

                      {progresso?.faltam > 0 && (
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground">Faltam</p>
                          <p className="text-lg font-bold">{formatarMoeda(progresso.faltam)}</p>
                        </div>
                      )}

                      {meta.pontos_meta > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span>{meta.pontos_meta} pontos ao bater a meta</span>
                        </div>
                      )}

                      {progresso?.dias_restantes !== undefined && (
                        <div className="text-sm text-muted-foreground">
                          {progresso.dias_restantes} dias restantes
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab Ranking */}
        <TabsContent value="ranking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Pontos</CardTitle>
              <CardDescription>Top 10 vendedores por pontos</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : ranking.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum vendedor no ranking ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ranking.map((vendedor, index) => (
                    <Card key={vendedor.vendedor_id} className={index < 3 ? 'border-primary' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              {index === 0 && <Crown className="h-6 w-6 text-yellow-500" />}
                              {index === 1 && <Medal className="h-6 w-6 text-gray-400" />}
                              {index === 2 && <Award className="h-6 w-6 text-amber-600" />}
                              {index > 2 && <span className="text-lg font-bold">#{vendedor.posicao}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              {getBadgeIcon(vendedor.nivel)}
                              <div>
                                <p className="font-semibold">{vendedor.vendedor_nome}</p>
                                <Badge variant="secondary">{vendedor.badge}</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Pontos</p>
                              <p className="text-xl font-bold">{vendedor.pontos_totais}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Vendas</p>
                              <p className="font-semibold">{vendedor.vendas_realizadas}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Metas</p>
                              <p className="font-semibold">{vendedor.metas_batidas}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Histórico */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Pontos</CardTitle>
              <CardDescription>Registro de todas as ações que geraram pontos</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : historico.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum histórico de pontos ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historico.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          item.pontos > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {item.pontos > 0 ? '+' : ''}{item.pontos}
                        </div>
                        <div>
                          <p className="font-medium">{item.descricao}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(item.data_acao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{item.tipo_acao}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Premiações */}
        <TabsContent value="premiacoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Premiações</CardTitle>
              <CardDescription>Premiações recebidas por bater metas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : premiacoes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma premiação ainda</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {premiacoes.map((premiacao) => (
                    <Card key={premiacao.id} className={premiacao.status === 'entregue' ? 'opacity-75' : ''}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Gift className="h-5 w-5" />
                            {premiacao.titulo}
                          </CardTitle>
                          <Badge variant={premiacao.status === 'entregue' ? 'default' : 'secondary'}>
                            {premiacao.status === 'entregue' ? 'Entregue' : 'Pendente'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">{premiacao.descricao}</p>
                        <div className="space-y-1">
                          {premiacao.tipo === 'bonus' && premiacao.valor_bonus && (
                            <p className="text-sm">
                              <strong>Bônus:</strong> {formatarMoeda(premiacao.valor_bonus)}
                            </p>
                          )}
                          {premiacao.tipo === 'brinde' && premiacao.brinde_descricao && (
                            <p className="text-sm">
                              <strong>Brinde:</strong> {premiacao.brinde_descricao}
                            </p>
                          )}
                          {premiacao.tipo === 'folga' && premiacao.data_folga && (
                            <p className="text-sm">
                              <strong>Folga:</strong> {format(new Date(premiacao.data_folga), 'dd/MM/yyyy', { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        {premiacao.data_entrega && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Entregue em: {format(new Date(premiacao.data_entrega), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MetasGamificadasPage;
