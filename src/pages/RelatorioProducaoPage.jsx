import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from "@/components/ui/use-toast";
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, RefreshCw, BarChart3, List, CheckCircle2, RotateCcw, Clock, ThumbsUp, ThumbsDown, Hourglass, Percent, Grid } from 'lucide-react';
import { relatorioProducaoService } from '@/services/api';
import { cn } from '@/lib/utils';

const RelatorioProducaoPage = () => {
    const { toast } = useToast();
    const [indicadores, setIndicadores] = useState(null);
    const [detalhamento, setDetalhamento] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Filtros
    const [dataInicio, setDataInicio] = useState(() => {
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        return primeiroDiaMes;
    });
    const [dataFim, setDataFim] = useState(() => {
        const hoje = new Date();
        const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        return ultimoDiaMes;
    });

    const loadRelatorio = async () => {
        if (!dataInicio || !dataFim) {
            toast({
                title: 'Período inválido',
                description: 'Selecione as datas de início e fim do período.',
                variant: 'destructive'
            });
            return;
        }

        try {
            setIsLoading(true);
            const params = {
                data_inicio: format(dataInicio, 'yyyy-MM-dd'),
                data_fim: format(dataFim, 'yyyy-MM-dd'),
            };

            const response = await relatorioProducaoService.getRelatorio(params);
            
            setIndicadores(response.indicadores || {});
            setDetalhamento(response.detalhamento || []);
        } catch (error) {
            console.error('Erro ao carregar relatório:', error);
            toast({ 
                title: 'Erro ao carregar relatório', 
                description: error.response?.data?.message || 'Ocorreu um erro ao carregar o relatório de produção.', 
                variant: 'destructive' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRelatorio();
    }, []);

    const handleFiltrar = () => {
        loadRelatorio();
    };

    const handleAtualizar = () => {
        loadRelatorio();
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'Concluído': { variant: 'default', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
            'Em produção': { variant: 'default', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
            'Em Produção': { variant: 'default', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
            'Refação': { variant: 'default', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
            'Em Revisão': { variant: 'default', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
            'Aguardando Aprovação': { variant: 'default', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
            'Pronto para Entrega': { variant: 'default', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
        };

        const config = statusConfig[status] || { variant: 'secondary', className: '' };
        return (
            <Badge className={config.className}>
                {status}
            </Badge>
        );
    };

    const getAtrasoBadge = (atraso) => {
        if (atraso === 'Com atraso') {
            return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{atraso}</Badge>;
        }
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{atraso}</Badge>;
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <BarChart3 size={36} className="text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold">Relatórios de Produção</h1>
                        <p className="text-muted-foreground">Análise detalhada do desempenho da produção</p>
                    </div>
                </div>
                <Button onClick={handleAtualizar} variant="outline" disabled={isLoading}>
                    <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                    Atualizar
                </Button>
            </header>

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtro de Período</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Data Início</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dataInicio && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={dataInicio}
                                        onSelect={setDataInicio}
                                        initialFocus
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>Data Fim</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dataFim && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={dataFim}
                                        onSelect={setDataFim}
                                        initialFocus
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2 flex items-end">
                            <Button onClick={handleFiltrar} className="w-full" disabled={isLoading}>
                                Filtrar
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Cards de Indicadores */}
            {indicadores && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total de Trabalhos */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">Total de Trabalhos</CardTitle>
                                <List className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{indicadores.total_trabalhos || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">No período selecionado</p>
                        </CardContent>
                    </Card>

                    {/* Trabalhos Concluídos */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-teal-600 dark:text-teal-400">Trabalhos Concluídos</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{indicadores.trabalhos_concluidos?.quantidade || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {indicadores.trabalhos_concluidos?.percentual || 0}% do total
                            </p>
                        </CardContent>
                    </Card>

                    {/* Refação */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Refação</CardTitle>
                                <RotateCcw className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{indicadores.refacao?.quantidade || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {indicadores.refacao?.percentual || 0}% do total
                            </p>
                        </CardContent>
                    </Card>

                    {/* Tempo Médio */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Tempo Médio</CardTitle>
                                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{indicadores.tempo_medio || 0}h</div>
                            <p className="text-xs text-muted-foreground mt-1">Por trabalho</p>
                        </CardContent>
                    </Card>

                    {/* No Prazo */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">No Prazo</CardTitle>
                                <ThumbsUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{indicadores.no_prazo?.quantidade || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {indicadores.no_prazo?.percentual || 0}% dos concluídos
                            </p>
                        </CardContent>
                    </Card>

                    {/* Com Atraso */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Com Atraso</CardTitle>
                                <ThumbsDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{indicadores.com_atraso?.quantidade || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {indicadores.com_atraso?.percentual || 0}% dos concluídos
                            </p>
                        </CardContent>
                    </Card>

                    {/* Atraso Médio */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Atraso Médio</CardTitle>
                                <Hourglass className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{indicadores.atraso_medio || 0}h</div>
                            <p className="text-xs text-muted-foreground mt-1">Quando há atraso</p>
                        </CardContent>
                    </Card>

                    {/* Taxa de Sucesso */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Taxa de Sucesso</CardTitle>
                                <Percent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{indicadores.taxa_sucesso || 0}%</div>
                            <p className="text-xs text-muted-foreground mt-1">Entregas no prazo</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabela Detalhada */}
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-2">
                        <Grid className="h-5 w-5" />
                        <CardTitle>Detalhamento dos Trabalhos</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Carregando...</div>
                    ) : detalhamento.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Nenhum trabalho encontrado no período selecionado.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Painel</TableHead>
                                        <TableHead>Início</TableHead>
                                        <TableHead>Previsto</TableHead>
                                        <TableHead>Conclusão</TableHead>
                                        <TableHead>Tempo Produção</TableHead>
                                        <TableHead>Atraso</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detalhamento.map((trabalho, index) => (
                                        <TableRow key={trabalho.id || index}>
                                            <TableCell className="font-medium">{trabalho.item}</TableCell>
                                            <TableCell>{trabalho.painel}</TableCell>
                                            <TableCell>{trabalho.inicio}</TableCell>
                                            <TableCell>{trabalho.previsto}</TableCell>
                                            <TableCell>{trabalho.conclusao}</TableCell>
                                            <TableCell>{trabalho.tempo_producao}</TableCell>
                                            <TableCell>{getAtrasoBadge(trabalho.atraso)}</TableCell>
                                            <TableCell>{getStatusBadge(trabalho.status)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default RelatorioProducaoPage;
