import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  User, 
  TrendingUp,
  Calendar,
  Award
} from 'lucide-react';
import { treinamentoService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TreinamentoProgressoPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progresso, setProgresso] = useState(null);

  useEffect(() => {
    carregarProgresso();
  }, []);

  const carregarProgresso = async () => {
    setLoading(true);
    try {
      const response = await treinamentoService.getMeuProgresso();
      if (response.data.success) {
        setProgresso(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar progresso:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seu progresso",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const marcarComoConcluido = async (treinamentoId) => {
    try {
      const response = await treinamentoService.marcarComoConcluido(treinamentoId);
      if (response.data.success) {
        toast({
          title: "Sucesso",
          description: "Treinamento marcado como concluído!",
        });
        carregarProgresso();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao marcar como concluído",
        variant: "destructive",
      });
    }
  };

  const getNivelNome = (nivel) => {
    const niveis = {
      iniciante: 'Iniciante',
      intermediario: 'Intermediário',
      avancado: 'Avançado',
    };
    return niveis[nivel] || nivel;
  };

  const getNivelCor = (nivel) => {
    const cores = {
      iniciante: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      intermediario: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      avancado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return cores[nivel] || 'bg-gray-100 text-gray-800';
  };

  const getSetorNome = (setor) => {
    const setores = {
      atendimento: 'Atendimento',
      vendas: 'Vendas',
      producao: 'Produção',
      design: 'Design',
      financeiro: 'Financeiro',
      geral: 'Geral',
    };
    return setores[setor] || setor;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!progresso) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum dado de progresso encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { usuario, estatisticas, treinamentos } = progresso;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Meu Progresso no Treinamento</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe seu progresso e conclua os treinamentos
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso Geral</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usuario.progresso_geral.toFixed(1)}%</div>
            <Progress value={usuario.progresso_geral} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{estatisticas.concluidos}</div>
            <p className="text-xs text-muted-foreground mt-1">de {estatisticas.total} treinamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{estatisticas.pendentes}</div>
            <p className="text-xs text-muted-foreground mt-1">treinamentos restantes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nível Liberado</CardTitle>
            <Award className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getNivelNome(usuario.nivel_liberado)}</div>
            <p className="text-xs text-muted-foreground mt-1">Nível atual</p>
          </CardContent>
        </Card>
      </div>

      {/* Informações do Usuário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Minhas Informações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Setor</p>
              <p className="font-semibold">{getSetorNome(usuario.setor)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nível Liberado</p>
              <Badge className={getNivelCor(usuario.nivel_liberado)}>
                {getNivelNome(usuario.nivel_liberado)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Último Acesso</p>
              <p className="font-semibold text-sm">
                {usuario.ultimo_acesso 
                  ? formatDistanceToNow(new Date(usuario.ultimo_acesso), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })
                  : 'Nunca'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Progresso</p>
              <p className="font-semibold">{usuario.progresso_geral.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Treinamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Treinamentos</CardTitle>
          <CardDescription>
            {estatisticas.concluidos} de {estatisticas.total} concluídos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {treinamentos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum treinamento disponível no momento.</p>
              </div>
            ) : (
              treinamentos.map((treinamento) => (
                <div
                  key={treinamento.id}
                  className={`border rounded-lg p-4 ${
                    treinamento.concluido 
                      ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                      : 'bg-white dark:bg-gray-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {treinamento.concluido ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-orange-600" />
                        )}
                        <h3 className="font-semibold">{treinamento.pergunta}</h3>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={getNivelCor(treinamento.nivel)}>
                          {getNivelNome(treinamento.nivel)}
                        </Badge>
                        <Badge variant="outline">
                          {getSetorNome(treinamento.setor)}
                        </Badge>
                        {treinamento.ordem > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Ordem: {treinamento.ordem}
                          </span>
                        )}
                      </div>
                      {treinamento.concluido && treinamento.data_conclusao && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Concluído em {format(new Date(treinamento.data_conclusao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      {!treinamento.concluido ? (
                        <Button
                          size="sm"
                          onClick={() => marcarComoConcluido(treinamento.id)}
                        >
                          Marcar como Concluído
                        </Button>
                      ) : (
                        <Badge variant="default" className="bg-green-600">
                          Concluído
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TreinamentoProgressoPage;
