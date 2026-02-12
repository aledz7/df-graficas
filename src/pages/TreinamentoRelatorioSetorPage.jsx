import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { treinamentoService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const TreinamentoRelatorioSetorPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [setorSelecionado, setSetorSelecionado] = useState('todos');
  const [relatorio, setRelatorio] = useState(null);

  useEffect(() => {
    if (setorSelecionado !== 'todos') {
      carregarRelatorio();
    }
  }, [setorSelecionado]);

  const carregarRelatorio = async () => {
    setLoading(true);
    try {
      const response = await treinamentoService.getRelatorioPorSetor({ setor: setorSelecionado });
      if (response.data.success) {
        setRelatorio(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o relatório",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSetorNome = (setor) => {
    const setores = {
      atendimento: 'Atendimento',
      vendas: 'Vendas',
      producao: 'Produção',
      design: 'Design',
      financeiro: 'Financeiro',
      geral: 'Geral',
      todos: 'Todos os Setores',
    };
    return setores[setor] || setor;
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatório de Treinamento por Setor</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o progresso do treinamento em cada setor
          </p>
        </div>
        <Button onClick={carregarRelatorio} disabled={loading || setorSelecionado === 'todos'}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar
        </Button>
      </div>

      {/* Filtro de Setor */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <label className="text-sm font-medium mb-2 block">Setor</label>
              <Select value={setorSelecionado} onValueChange={setSetorSelecionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Setores</SelectItem>
                  <SelectItem value="atendimento">Atendimento</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !relatorio ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Selecione um setor para visualizar o relatório
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumo do Setor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Colaboradores</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{relatorio.total_colaboradores}</div>
                <p className="text-xs text-muted-foreground mt-1">no setor {getSetorNome(relatorio.setor)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progresso Médio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{relatorio.progresso_medio_setor.toFixed(1)}%</div>
                <Progress value={relatorio.progresso_medio_setor} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Setor</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getSetorNome(relatorio.setor)}</div>
                <p className="text-xs text-muted-foreground mt-1">Relatório atual</p>
              </CardContent>
            </Card>
          </div>

          {/* Estatísticas por Nível */}
          {relatorio.estatisticas_por_nivel && (
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas por Nível</CardTitle>
                <CardDescription>
                  Conclusões de treinamentos por nível de dificuldade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {Object.entries(relatorio.estatisticas_por_nivel).map(([nivel, stats]) => (
                    <AccordionItem key={nivel} value={nivel}>
                      <AccordionTrigger>
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <Badge className={getNivelCor(nivel)}>
                              {getNivelNome(nivel)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {stats.total_treinamentos} treinamentos
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-green-600 font-semibold">
                              {stats.total_concluidos} concluídos
                            </span>
                            <span className="text-orange-600 font-semibold">
                              {stats.total_pendentes} pendentes
                            </span>
                            <span className="font-semibold">
                              {stats.percentual_medio.toFixed(1)}% médio
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Colaborador</TableHead>
                              <TableHead className="text-right">Concluídos</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Progresso</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stats.colaboradores.map((colab, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{colab.nome}</TableCell>
                                <TableCell className="text-right">{colab.concluidos}</TableCell>
                                <TableCell className="text-right">{colab.total}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Progress value={colab.percentual} className="w-24" />
                                    <span className="text-sm font-medium">{colab.percentual.toFixed(1)}%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Lista de Colaboradores */}
          <Card>
            <CardHeader>
              <CardTitle>Colaboradores do Setor</CardTitle>
              <CardDescription>
                Progresso individual de cada colaborador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Nível Atual</TableHead>
                    <TableHead className="text-right">Progresso</TableHead>
                    <TableHead className="text-right">Concluídos</TableHead>
                    <TableHead className="text-right">Pendentes</TableHead>
                    <TableHead>Itens Pendentes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorio.colaboradores.map((colab) => (
                    <TableRow key={colab.id}>
                      <TableCell className="font-medium">{colab.nome}</TableCell>
                      <TableCell>
                        <Badge className={getNivelCor(colab.nivel_atual)}>
                          {getNivelNome(colab.nivel_atual)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={colab.progresso_percentual} className="w-24" />
                          <span className="text-sm font-medium">{colab.progresso_percentual.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600 font-semibold">{colab.total_concluidos}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-orange-600 font-semibold">{colab.total_pendentes}</span>
                      </TableCell>
                      <TableCell>
                        {colab.itens_pendentes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {colab.itens_pendentes.slice(0, 2).map((item) => (
                              <Badge key={item.id} variant="outline" className="text-xs">
                                {item.pergunta.substring(0, 30)}...
                              </Badge>
                            ))}
                            {colab.itens_pendentes.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{colab.itens_pendentes.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nenhum</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TreinamentoRelatorioSetorPage;
