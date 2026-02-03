import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Printer, DollarSign, Filter, TrendingUp, TrendingDown, Activity, Receipt, Users, Calendar, PieChart as PieChartIcon } from 'lucide-react';
import { exportRecebimentosToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';
import { apiDataManager } from '@/lib/apiDataManager';
import { vendaService } from '@/services/api';
import { motion } from 'framer-motion';
import { contasReceberService } from '@/services/contasReceberService';
import { usePermissions } from '@/hooks/usePermissions';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

const RelatorioRecebimentos = () => {
    const { toast } = useToast();
    const { isAdmin } = usePermissions();
    const [recebimentos, setRecebimentos] = useState([]);
    const [filteredRecebimentos, setFilteredRecebimentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [filtroFormaPagamento, setFiltroFormaPagamento] = useState('todos');
    const [buscaFormaPagamento, setBuscaFormaPagamento] = useState('');
    const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState(null);
    const [sugestoesFormasPagamento, setSugestoesFormasPagamento] = useState([]);
    const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
    const [filtroPeriodo, setFiltroPeriodo] = useState({ inicio: '', fim: '' });
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                
                // Carregar configurações da empresa
                const settings = JSON.parse(await apiDataManager.getItem('empresaSettings') || '{}');
                const logo = await apiDataManager.getItem('logoUrl') || '';
                setEmpresaSettings(settings);
                setLogoUrl(logo);

                // Usar o novo endpoint consolidado
                try {
                    const response = await vendaService.getRelatorioGeralRecebimentos({
                        data_inicio: filtroPeriodo.inicio,
                        data_fim: filtroPeriodo.fim
                    });
                    
                    if (response.success || response.data?.success) {
                        const data = response.data?.data || response.data || {};
                        setRecebimentos(data.recebimentos || []);
                    } else {
                        console.error('Erro na resposta da API:', response);
                        setRecebimentos([]);
                    }
                } catch (error) {
                    console.error('Erro ao carregar recebimentos:', error);
                    toast({ 
                        title: 'Erro ao carregar dados', 
                        description: 'Não foi possível carregar os recebimentos da API.',
                        variant: 'destructive' 
                    });
                    setRecebimentos([]);
                }
                
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                toast({ 
                    title: 'Erro ao carregar dados', 
                    description: 'Não foi possível carregar os recebimentos da API.',
                    variant: 'destructive' 
                });
                setRecebimentos([]);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, [toast, filtroPeriodo.inicio, filtroPeriodo.fim]);

    useEffect(() => {
        // Garantir que recebimentos seja sempre um array antes de filtrar
        if (!Array.isArray(recebimentos)) {
            setFilteredRecebimentos([]);
            return;
        }

        let items = [...recebimentos];
        if (filtroFormaPagamento !== 'todos') items = items.filter(r => r.formaPagamento === filtroFormaPagamento);
        if (filtroPeriodo.inicio) items = items.filter(r => r.data && isValid(parseISO(r.data)) && new Date(r.data) >= new Date(filtroPeriodo.inicio));
        if (filtroPeriodo.fim) {
            const fim = new Date(filtroPeriodo.fim);
            fim.setHours(23, 59, 59, 999);
            items = items.filter(r => r.data && isValid(parseISO(r.data)) && new Date(r.data) <= fim);
        }
        setFilteredRecebimentos(items);
    }, [recebimentos, filtroFormaPagamento, filtroPeriodo]);

    // Função para buscar formas de pagamento
    const buscarFormasPagamento = (termo) => {
        if (!termo || termo.length < 1) {
            setSugestoesFormasPagamento([]);
            setMostrarSugestoes(false);
            return;
        }
        
        const formasFiltradas = formasPagamento.filter(forma => {
            const termoLower = termo.toLowerCase();
            return forma.toLowerCase().includes(termoLower);
        });
        
        setSugestoesFormasPagamento(formasFiltradas.slice(0, 10)); // Limitar a 10 sugestões
        setMostrarSugestoes(true);
    };

    // Função para selecionar forma de pagamento
    const selecionarFormaPagamento = (forma) => {
        setFormaPagamentoSelecionada(forma);
        setBuscaFormaPagamento(forma);
        setFiltroFormaPagamento(forma);
        setMostrarSugestoes(false);
    };

    // Função para limpar busca
    const limparBuscaFormaPagamento = () => {
        setBuscaFormaPagamento('');
        setFormaPagamentoSelecionada(null);
        setFiltroFormaPagamento('todos');
        setSugestoesFormasPagamento([]);
        setMostrarSugestoes(false);
    };

    // Fechar sugestões quando clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.relative')) {
                setMostrarSugestoes(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const totalRecebido = useMemo(() => {
        if (!Array.isArray(filteredRecebimentos)) return 0;
        return filteredRecebimentos.reduce((acc, r) => acc + parseFloat(r.valor || 0), 0);
    }, [filteredRecebimentos]);

    const formasPagamento = useMemo(() => {
        if (!Array.isArray(recebimentos)) return [];
        return [...new Set(recebimentos.map(r => r.formaPagamento).filter(Boolean))];
    }, [recebimentos]);

    // Estatísticas detalhadas
    const estatisticas = useMemo(() => {
        if (!Array.isArray(filteredRecebimentos) || filteredRecebimentos.length === 0) {
            return {
                quantidade: 0,
                ticketMedio: 0,
                maiorRecebimento: 0,
                menorRecebimento: 0,
                distribuicaoPorForma: [],
                topClientes: [],
                recebimentosPorDia: []
            };
        }

        const valores = filteredRecebimentos.map(r => parseFloat(r.valor || 0));
        const quantidade = filteredRecebimentos.length;
        const ticketMedio = totalRecebido / quantidade;
        const maiorRecebimento = Math.max(...valores);
        const menorRecebimento = Math.min(...valores);

        // Distribuição por forma de pagamento
        const porForma = {};
        filteredRecebimentos.forEach(r => {
            const forma = r.formaPagamento || 'Não Informado';
            porForma[forma] = (porForma[forma] || 0) + parseFloat(r.valor || 0);
        });
        const distribuicaoPorForma = Object.entries(porForma).map(([name, value]) => ({
            name,
            value: parseFloat(value.toFixed(2)),
            quantidade: filteredRecebimentos.filter(r => (r.formaPagamento || 'Não Informado') === name).length
        })).sort((a, b) => b.value - a.value);


        // Top 5 clientes
        const porCliente = {};
        filteredRecebimentos.forEach(r => {
            const cliente = r.cliente || 'Não Informado';
            if (!porCliente[cliente]) {
                porCliente[cliente] = { total: 0, quantidade: 0 };
            }
            porCliente[cliente].total += parseFloat(r.valor || 0);
            porCliente[cliente].quantidade += 1;
        });
        const topClientes = Object.entries(porCliente)
            .map(([nome, dados]) => ({
                nome,
                total: parseFloat(dados.total.toFixed(2)),
                quantidade: dados.quantidade
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        // Recebimentos por dia
        const porDia = {};
        filteredRecebimentos.forEach(r => {
            if (r.data && isValid(parseISO(r.data))) {
                const dia = format(parseISO(r.data), 'dd/MM/yyyy');
                if (!porDia[dia]) {
                    porDia[dia] = { total: 0, quantidade: 0 };
                }
                porDia[dia].total += parseFloat(r.valor || 0);
                porDia[dia].quantidade += 1;
            }
        });
        const recebimentosPorDia = Object.entries(porDia)
            .map(([dia, dados]) => ({
                dia,
                total: parseFloat(dados.total.toFixed(2)),
                quantidade: dados.quantidade
            }))
            .sort((a, b) => {
                const [diaA, mesA, anoA] = a.dia.split('/');
                const [diaB, mesB, anoB] = b.dia.split('/');
                return new Date(anoA, mesA - 1, diaA) - new Date(anoB, mesB - 1, diaB);
            });

        return {
            quantidade,
            ticketMedio,
            maiorRecebimento,
            menorRecebimento,
            distribuicaoPorForma,
            topClientes,
            recebimentosPorDia
        };
    }, [filteredRecebimentos, totalRecebido]);

    // Cores para os gráficos
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];

    const handleExportPDF = () => {
        const headers = [['Data', 'Origem', 'Cliente', 'Forma Pgto.', 'Valor (R$)']];
        const data = filteredRecebimentos.map(r => [
            r.data && isValid(parseISO(r.data)) ? format(parseISO(r.data), 'dd/MM/yyyy HH:mm') : 'N/A',
            r.origem,
            r.cliente,
            r.formaPagamento,
            parseFloat(r.valor || 0).toFixed(2)
        ]);
        
        // Preparar estatísticas para o PDF
        const estatisticasPDF = {
            totalRecebido,
            quantidade: estatisticas.quantidade,
            ticketMedio: estatisticas.ticketMedio,
            maiorRecebimento: estatisticas.maiorRecebimento,
            menorRecebimento: estatisticas.menorRecebimento
        };
        
        exportRecebimentosToPdf(
            'Relatório Geral de Recebimentos',
            headers,
            data,
            estatisticasPDF,
            estatisticas.distribuicaoPorForma,
            estatisticas.topClientes,
            logoUrl,
            empresaSettings.nomeFantasia || 'JET-IMPRE'
        );
        
        toast({ 
            title: "PDF Profissional Gerado", 
            description: "O relatório detalhado de recebimentos foi exportado com sucesso.",
            variant: "default"
        });
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Relatório Geral de Recebimentos</CardTitle>
                    <CardDescription>Carregando dados...</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-32">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Carregando recebimentos...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório Geral de Recebimentos</CardTitle>
                <CardDescription>
                    Análise completa e detalhada de todas as entradas de valor, com estatísticas, gráficos e distribuições por período, forma de pagamento e origem.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="p-4 border rounded-lg mb-4 space-y-4">
                    <h3 className="font-semibold flex items-center"><Filter size={16} className="mr-2"/>Filtros</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder="Buscar forma de pagamento..."
                                value={buscaFormaPagamento}
                                onChange={(e) => {
                                    setBuscaFormaPagamento(e.target.value);
                                    buscarFormasPagamento(e.target.value);
                                }}
                                onFocus={() => {
                                    if (sugestoesFormasPagamento.length > 0) {
                                        setMostrarSugestoes(true);
                                    }
                                }}
                                className="pr-8"
                            />
                            {buscaFormaPagamento && (
                                <button
                                    type="button"
                                    onClick={limparBuscaFormaPagamento}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            )}
                            {mostrarSugestoes && sugestoesFormasPagamento.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    <div
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b"
                                        onClick={() => {
                                            setBuscaFormaPagamento('');
                                            setFormaPagamentoSelecionada(null);
                                            setFiltroFormaPagamento('todos');
                                            setMostrarSugestoes(false);
                                        }}
                                    >
                                        <div className="font-medium text-gray-500">Todas as formas</div>
                                    </div>
                                    {sugestoesFormasPagamento.map((forma) => (
                                        <div
                                            key={forma}
                                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                            onClick={() => selecionarFormaPagamento(forma)}
                                        >
                                            <div className="font-medium">{forma}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Input 
                            type="date" 
                            value={filtroPeriodo.inicio} 
                            onChange={e => setFiltroPeriodo(p => ({...p, inicio: e.target.value}))}
                            placeholder="Data Início"
                        />
                        <Input 
                            type="date" 
                            value={filtroPeriodo.fim} 
                            onChange={e => setFiltroPeriodo(p => ({...p, fim: e.target.value}))}
                            placeholder="Data Fim"
                        />
                    </div>
                </div>

                {isAdmin && (
                    <>
                        {/* Cards de Estatísticas Principais */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground"/>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRecebido)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Período filtrado</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Quantidade</CardTitle>
                                    <Receipt className="h-4 w-4 text-muted-foreground"/>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{estatisticas.quantidade}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Recebimentos registrados</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                                    <Activity className="h-4 w-4 text-muted-foreground"/>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(estatisticas.ticketMedio)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Valor médio por recebimento</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Maior Recebimento</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground"/>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-purple-600">{formatCurrency(estatisticas.maiorRecebimento)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">Menor: {formatCurrency(estatisticas.menorRecebimento)}</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Gráfico de Distribuição por Forma de Pagamento */}
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center">
                                    <PieChartIcon size={16} className="mr-2"/>
                                    Distribuição por Forma de Pagamento
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {estatisticas.distribuicaoPorForma.length > 0 ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <ResponsiveContainer width="100%" height={250}>
                                                <PieChart>
                                                    <Pie
                                                        data={estatisticas.distribuicaoPorForma}
                                                        cx="50%"
                                                        cy="50%"
                                                        labelLine={false}
                                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                        outerRadius={90}
                                                        fill="#8884d8"
                                                        dataKey="value"
                                                    >
                                                        {estatisticas.distribuicaoPorForma.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-2">
                                            {estatisticas.distribuicaoPorForma.map((item, index) => (
                                                <div key={index} className="flex justify-between items-center text-sm p-3 bg-accent/30 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <div 
                                                            className="w-4 h-4 rounded" 
                                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                        />
                                                        <span className="font-medium">{item.name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-semibold">{formatCurrency(item.value)}</div>
                                                        <div className="text-xs text-muted-foreground">{item.quantidade} receb.</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">Sem dados para exibir</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Top Clientes e Recebimentos por Dia */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                            {/* Top 5 Clientes */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center">
                                        <Users size={16} className="mr-2"/>
                                        Top 5 Clientes
                                    </CardTitle>
                                    <CardDescription>Clientes que mais contribuíram no período</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {estatisticas.topClientes.length > 0 ? (
                                        <div className="space-y-3">
                                            {estatisticas.topClientes.map((cliente, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold">{cliente.nome}</p>
                                                            <p className="text-xs text-muted-foreground">{cliente.quantidade} recebimento(s)</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-green-600">{formatCurrency(cliente.total)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-8">Sem dados para exibir</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Gráfico de Barras - Recebimentos por Dia */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center">
                                        <Calendar size={16} className="mr-2"/>
                                        Recebimentos por Dia
                                    </CardTitle>
                                    <CardDescription>Distribuição diária dos recebimentos</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {estatisticas.recebimentosPorDia.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart data={estatisticas.recebimentosPorDia}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis 
                                                    dataKey="dia" 
                                                    tick={{ fontSize: 10 }}
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={80}
                                                />
                                                <YAxis />
                                                <Tooltip 
                                                    formatter={(value, name) => {
                                                        if (name === 'total') return [formatCurrency(value), 'Total'];
                                                        return [value, 'Quantidade'];
                                                    }}
                                                />
                                                <Legend />
                                                <Bar dataKey="total" fill="#0088FE" name="Total (R$)" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-8">Sem dados para exibir</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}

                {/* Layout Mobile - Cards */}
                <div className="md:hidden">
                    <ScrollArea className="h-[500px]">
                        {filteredRecebimentos.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <DollarSign size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                <p>Nenhum recebimento encontrado para os filtros aplicados.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredRecebimentos.map(rec => (
                                    <motion.div
                                        key={rec.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-sm break-words">{rec.cliente}</h3>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-xs">
                                                        {rec.origem}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {rec.formaPagamento}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="text-right ml-3">
                                                <p className="text-lg font-bold text-green-600">
                                                    {formatCurrency(parseFloat(rec.valor || 0))}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Data</p>
                                                <p className="font-medium">
                                                    {rec.data && isValid(parseISO(rec.data)) ? format(parseISO(rec.data), 'dd/MM/yyyy') : 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Horário</p>
                                                <p className="font-medium">
                                                    {rec.data && isValid(parseISO(rec.data)) ? format(parseISO(rec.data), 'HH:mm') : 'N/A'}
                                                </p>
                                            </div>
                                            {rec.referencia && (
                                                <div className="col-span-2">
                                                    <p className="text-xs text-muted-foreground">Referência</p>
                                                    <p className="font-medium text-xs">{rec.referencia}</p>
                                                </div>
                                            )}
                                            {rec.descricao && (
                                                <div className="col-span-2">
                                                    <p className="text-xs text-muted-foreground">Descrição</p>
                                                    <p className="text-xs">{rec.descricao}</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Layout Desktop - Tabela */}
                <div className="hidden md:block">
                    <ScrollArea className="h-[500px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data/Hora</TableHead>
                                    <TableHead>Origem</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Forma Pgto.</TableHead>
                                    <TableHead>Referência</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecebimentos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                            Nenhum recebimento encontrado para os filtros aplicados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRecebimentos.map(rec => (
                                        <TableRow key={rec.id} className="hover:bg-accent/50">
                                            <TableCell className="font-mono text-sm">
                                                <div>
                                                    {rec.data && isValid(parseISO(rec.data)) ? format(parseISO(rec.data), 'dd/MM/yyyy') : 'N/A'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {rec.data && isValid(parseISO(rec.data)) ? format(parseISO(rec.data), 'HH:mm') : ''}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    {rec.origem}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium max-w-[200px]">
                                                <div className="truncate" title={rec.cliente}>
                                                    {rec.cliente}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-xs">
                                                    {rec.formaPagamento}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {rec.referencia || '-'}
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[200px]">
                                                <div className="truncate" title={rec.descricao}>
                                                    {rec.descricao || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold whitespace-nowrap">
                                                <span className="text-green-600">
                                                    {formatCurrency(parseFloat(rec.valor || 0))}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    
                    {/* Resumo da Tabela */}
                    {filteredRecebimentos.length > 0 && isAdmin && (
                        <div className="mt-4 p-4 bg-accent/30 rounded-lg border">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Registros exibidos</p>
                                    <p className="font-bold text-lg">{filteredRecebimentos.length}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Total em exibição</p>
                                    <p className="font-bold text-lg text-green-600">{formatCurrency(totalRecebido)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Ticket Médio</p>
                                    <p className="font-bold text-lg text-blue-600">{formatCurrency(estatisticas.ticketMedio)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Amplitude</p>
                                    <p className="font-bold text-xs">
                                        {formatCurrency(estatisticas.menorRecebimento)} - {formatCurrency(estatisticas.maiorRecebimento)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleExportPDF} disabled={filteredRecebimentos.length === 0}>
                    <Printer size={16} className="mr-2"/> Exportar PDF
                </Button>
            </CardFooter>
        </Card>
    );
};

export default RelatorioRecebimentos;