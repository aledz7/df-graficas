import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { metaVendaService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, isPast, isToday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MetasVendedorPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metas, setMetas] = useState([]);

  useEffect(() => {
    carregarMetas();
  }, []);

  const carregarMetas = async () => {
    setLoading(true);
    try {
      // Buscar metas do vendedor
      const response = await metaVendaService.getAll({
        vendedor_id: user?.id,
        ativo: true,
      });

      if (response.data.success) {
        // Buscar progresso de cada meta
        const metasComProgresso = await Promise.all(
          response.data.data.map(async (meta) => {
            try {
              const progressoResponse = await metaVendaService.getProgresso(meta.id);
              return {
                ...meta,
                progresso_atual: progressoResponse.data?.progresso_atual || 0,
                percentual_progresso: progressoResponse.data?.percentual_progresso || 0,
              };
            } catch (error) {
              return {
                ...meta,
                progresso_atual: 0,
                percentual_progresso: 0,
              };
            }
          })
        );
        setMetas(metasComProgresso);
      }
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas metas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularFalta = (meta) => {
    const falta = parseFloat(meta.valor_meta) - parseFloat(meta.progresso_atual);
    return falta > 0 ? falta : 0;
  };

  const getPeriodoTexto = (meta) => {
    const dataInicio = new Date(meta.data_inicio);
    const dataFim = new Date(meta.data_fim);
    
    if (meta.periodo_tipo === 'diario') {
      return `Hoje - ${format(dataInicio, 'dd/MM/yyyy', { locale: ptBR })}`;
    } else if (meta.periodo_tipo === 'mensal') {
      return `${format(dataInicio, 'MMMM yyyy', { locale: ptBR })}`;
    } else {
      return `${format(dataInicio, 'dd/MM/yyyy', { locale: ptBR })} a ${format(dataFim, 'dd/MM/yyyy', { locale: ptBR })}`;
    }
  };

  const getStatusMeta = (meta) => {
    if (meta.meta_batida) {
      return { texto: 'Meta Batida!', cor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle2 };
    }
    if (isPast(new Date(meta.data_fim)) && !meta.meta_batida) {
      return { texto: 'Prazo Expirado', cor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: AlertCircle };
    }
    if (meta.percentual_progresso >= 100) {
      return { texto: 'Meta Atingida!', cor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle2 };
    }
    if (meta.percentual_progresso >= 80) {
      return { texto: 'Quase Lá!', cor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: TrendingUp };
    }
    return { texto: 'Em Andamento', cor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Target };
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Minhas Metas</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe seu progresso e mantenha o foco no resultado
        </p>
      </div>

      {metas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Você não possui metas ativas no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {metas.map((meta) => {
            const falta = calcularFalta(meta);
            const status = getStatusMeta(meta);
            const StatusIcon = status.icon;

            return (
              <Card key={meta.id} className="relative overflow-hidden">
                <div className={`absolute top-0 right-0 p-2 ${status.cor}`}>
                  <div className="flex items-center gap-1 text-xs font-semibold">
                    <StatusIcon className="h-3 w-3" />
                    {status.texto}
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="flex items-center gap-2 pr-20">
                    <Target className="h-5 w-5 text-primary" />
                    Meta de Vendas
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {getPeriodoTexto(meta)}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Meta Total */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Meta</p>
                    <p className="text-3xl font-bold text-primary">
                      {formatarMoeda(parseFloat(meta.valor_meta))}
                    </p>
                  </div>

                  {/* Progresso Visual */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">
                        {meta.percentual_progresso.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(meta.percentual_progresso, 100)} 
                      className="h-3"
                    />
                  </div>

                  {/* Valores */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-muted-foreground">Vendido</p>
                      </div>
                      <p className="text-xl font-bold text-green-600">
                        {formatarMoeda(parseFloat(meta.progresso_atual))}
                      </p>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-orange-600" />
                        <p className="text-xs text-muted-foreground">Falta</p>
                      </div>
                      <p className="text-xl font-bold text-orange-600">
                        {formatarMoeda(falta)}
                      </p>
                    </div>
                  </div>

                  {/* Informações Adicionais */}
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Valor Vendido:</span>
                      <span className="font-semibold">
                        {formatarMoeda(parseFloat(meta.progresso_atual))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Meta:</span>
                      <span className="font-semibold">
                        {formatarMoeda(parseFloat(meta.valor_meta))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Falta para bater:</span>
                      <span className="font-semibold text-orange-600">
                        {formatarMoeda(falta)}
                      </span>
                    </div>
                    {meta.percentual_progresso > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Percentual:</span>
                        <span className="font-semibold">
                          {meta.percentual_progresso.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Mensagem Motivacional */}
                  {!meta.meta_batida && meta.percentual_progresso < 100 && (
                    <div className="pt-4 border-t">
                      {falta > 0 ? (
                        <p className="text-sm text-center text-muted-foreground">
                          Você precisa vender mais{' '}
                          <span className="font-semibold text-primary">
                            {formatarMoeda(falta)}
                          </span>{' '}
                          para bater sua meta!
                        </p>
                      ) : (
                        <p className="text-sm text-center text-green-600 font-semibold">
                          Parabéns! Você já atingiu sua meta! 🎉
                        </p>
                      )}
                    </div>
                  )}

                  {meta.meta_batida && (
                    <div className="pt-4 border-t">
                      <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg text-center">
                        <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                          🎉 Meta Batida! Parabéns pelo excelente trabalho! 🎉
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resumo Geral */}
      {metas.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardHeader>
            <CardTitle>Resumo Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Total de Metas</p>
                <p className="text-2xl font-bold">{metas.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Vendido</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatarMoeda(
                    metas.reduce((sum, meta) => sum + parseFloat(meta.progresso_atual || 0), 0)
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Total de Metas</p>
                <p className="text-2xl font-bold text-primary">
                  {formatarMoeda(
                    metas.reduce((sum, meta) => sum + parseFloat(meta.valor_meta || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MetasVendedorPage;
