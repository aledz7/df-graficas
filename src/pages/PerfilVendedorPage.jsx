import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Clock, 
  Target,
  Award,
  Lightbulb,
  BarChart3,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { perfilVendedorService } from '@/services/api';
import { userService } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PerfilVendedorPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [vendedores, setVendedores] = useState([]);
  const [selectedVendedorId, setSelectedVendedorId] = useState(null);
  const [dataInicio, setDataInicio] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchVendedores = useCallback(async () => {
    try {
      const response = await userService.getAll();
      if (response.data) {
        const vendedoresList = Array.isArray(response.data) 
          ? response.data 
          : (response.data.data || []);
        setVendedores(vendedoresList.filter(u => !u.is_admin || u.id === user?.id));
        
        // Se for vendedor, selecionar automaticamente
        if (user && !user.is_admin && !selectedVendedorId) {
          setSelectedVendedorId(user.id);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error);
    }
  }, [user, selectedVendedorId]);

  const fetchPerfil = useCallback(async () => {
    if (!selectedVendedorId) return;
    
    setLoading(true);
    try {
      const response = await perfilVendedorService.getPerfil(selectedVendedorId, {
        data_inicio: dataInicio,
        data_fim: dataFim,
      });
      
      if (response.data.success) {
        setPerfil(response.data.data);
      } else {
        toast({
          title: "Erro",
          description: response.data.message || "Não foi possível carregar o perfil",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o perfil do vendedor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedVendedorId, dataInicio, dataFim, toast]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchVendedores();
    }
  }, [isAuthenticated, fetchVendedores]);

  useEffect(() => {
    if (selectedVendedorId) {
      fetchPerfil();
    }
  }, [selectedVendedorId, fetchPerfil]);

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getPerfilVendaBadge = (tipo) => {
    const badges = {
      'volume': { label: 'Volume', variant: 'default', icon: TrendingUp },
      'margem': { label: 'Margem', variant: 'secondary', icon: Target },
      'premium': { label: 'Premium', variant: 'default', icon: Award },
      'equilibrado': { label: 'Equilibrado', variant: 'outline', icon: BarChart3 },
      'sem_dados': { label: 'Sem Dados', variant: 'outline', icon: User },
    };
    return badges[tipo] || badges['equilibrado'];
  };

  const getVelocidadeBadge = (tipo) => {
    const badges = {
      'rapido': { label: 'Rápido', variant: 'default', color: 'text-green-600' },
      'medio': { label: 'Médio', variant: 'secondary', color: 'text-yellow-600' },
      'lento': { label: 'Lento', variant: 'destructive', color: 'text-red-600' },
      'sem_dados': { label: 'Sem Dados', variant: 'outline', color: 'text-gray-600' },
    };
    return badges[tipo] || badges['medio'];
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="h-8 w-8 text-blue-500" />
            Perfil do Vendedor
          </h1>
          <p className="text-muted-foreground mt-1">
            Identifique o estilo de venda de cada vendedor para treinamento personalizado
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione o vendedor e o período para análise</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {user?.is_admin && (
              <div>
                <Label>Vendedor</Label>
                <Select value={selectedVendedorId?.toString() || ''} onValueChange={(value) => setSelectedVendedorId(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map((v) => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchPerfil} disabled={loading || !selectedVendedorId} className="w-full">
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : perfil ? (
        <>
          {/* Informações do Vendedor */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{perfil.vendedor.nome}</CardTitle>
                  <CardDescription>{perfil.vendedor.email}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {perfil.perfil_venda && (
                    <Badge variant={getPerfilVendaBadge(perfil.perfil_venda.tipo).variant} className="flex items-center gap-1">
                      {React.createElement(getPerfilVendaBadge(perfil.perfil_venda.tipo).icon, { className: "h-4 w-4" })}
                      {getPerfilVendaBadge(perfil.perfil_venda.tipo).label}
                    </Badge>
                  )}
                  {perfil.velocidade_fechamento && (
                    <Badge variant={getVelocidadeBadge(perfil.velocidade_fechamento.tipo).variant} className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {getVelocidadeBadge(perfil.velocidade_fechamento.tipo).label}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Período: {format(new Date(perfil.periodo.inicio), 'dd/MM/yyyy', { locale: ptBR })} a{' '}
                {format(new Date(perfil.periodo.fim), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </CardContent>
          </Card>

          {/* Indicadores Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total de Vendas</CardDescription>
                <CardTitle className="text-3xl">{perfil.indicadores?.total_vendas ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShoppingCart className="h-4 w-4" />
                  {(perfil.indicadores?.frequencia_vendas_dia ?? 0).toFixed(2)} vendas/dia
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Volume Total</CardDescription>
                <CardTitle className="text-3xl">{formatarMoeda(perfil.indicadores?.total_volume ?? 0)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Ticket médio: {formatarMoeda(perfil.indicadores?.ticket_medio ?? 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Margem de Lucro</CardDescription>
                <CardTitle className="text-3xl">{(perfil.indicadores?.margem_percentual ?? 0).toFixed(1)}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  {formatarMoeda(perfil.indicadores?.margem_total ?? 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tempo Médio de Fechamento</CardDescription>
                <CardTitle className="text-3xl">
                  {(perfil.indicadores?.tempo_medio_fechamento_dias ?? 0).toFixed(1)} dias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {(perfil.indicadores?.tempo_medio_fechamento_horas ?? 0).toFixed(1)} horas
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Perfil de Venda */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Perfil de Venda</CardTitle>
              <CardDescription>{perfil.perfil_venda?.descricao}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Volume</span>
                    <span className="text-sm text-muted-foreground">{(perfil.perfil_venda?.score_volume ?? 0).toFixed(0)}%</span>
                  </div>
                  <Progress value={perfil.perfil_venda?.score_volume || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Margem</span>
                    <span className="text-sm text-muted-foreground">{(perfil.perfil_venda?.score_margem ?? 0).toFixed(0)}%</span>
                  </div>
                  <Progress value={perfil.perfil_venda?.score_margem || 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Indicadores Adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Indicadores de Desempenho</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Desconto Médio</span>
                  <span className="font-semibold">{(perfil.indicadores?.desconto_percentual_medio ?? 0).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Variação do Ticket</span>
                  <span className="font-semibold">{(perfil.indicadores?.variacao_ticket ?? 0).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Custo Total</span>
                  <span className="font-semibold">{formatarMoeda(perfil.indicadores?.custo_total ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Receita Total</span>
                  <span className="font-semibold">{formatarMoeda(perfil.indicadores?.receita_total ?? 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Velocidade de Fechamento</CardTitle>
                <CardDescription>{perfil.velocidade_fechamento?.descricao}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tempo Médio</span>
                    <span className="font-semibold">
                      {(perfil.velocidade_fechamento?.dias_medias ?? 0).toFixed(1)} dias
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Em Horas</span>
                    <span className="font-semibold">
                      {(perfil.velocidade_fechamento?.horas_medias ?? 0).toFixed(1)} horas
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recomendações */}
          {perfil.recomendacoes && perfil.recomendacoes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Recomendações de Treinamento
                </CardTitle>
                <CardDescription>
                  Sugestões personalizadas baseadas no perfil de venda identificado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {perfil.recomendacoes.map((recomendacao, index) => (
                    <Card key={index} className="bg-blue-50 border-blue-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{recomendacao.titulo}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{recomendacao.descricao}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {!selectedVendedorId 
              ? 'Selecione um vendedor para visualizar o perfil'
              : 'Nenhum dado encontrado para o período selecionado'}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PerfilVendedorPage;
