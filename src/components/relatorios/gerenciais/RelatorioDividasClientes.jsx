import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { Printer, User, Filter, AlertCircle, TrendingDown, TrendingUp, Clock, XCircle, Calendar, Users, DollarSign, AlertTriangle } from 'lucide-react';
import { exportToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';
import { contaReceberService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';
import { usePermissions } from '@/hooks/usePermissions';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RelatorioDividasClientes = () => {
    const { toast } = useToast();
    const { isAdmin } = usePermissions();
    const [dividas, setDividas] = useState([]);
    const [filteredDividas, setFilteredDividas] = useState([]);
    const [filtroCliente, setFiltroCliente] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('todos'); // todos, vencido, a_vencer, critico
    const [ordenacao, setOrdenacao] = useState('atraso_desc'); // atraso_desc, atraso_asc, valor_desc, valor_asc, cliente_asc
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                
                // Carregar configurações da empresa
                const settings = JSON.parse(await apiDataManager.getItem('empresaSettings') || '{}');
                const logo = await apiDataManager.getItem('logoUrl') || '';
                setEmpresaSettings(settings);
                setLogoUrl(logo);
                
                // Carregar dívidas da API Laravel
                const response = await contaReceberService.getAll({
                    status: 'pendente', // Buscar apenas contas pendentes
                    per_page: 1000 // Buscar mais registros
                });
                
                // A API retorna dados paginados, então precisamos acessar response.data.data
                const dividasData = response?.data?.data || response?.data || [];
                
                if (Array.isArray(dividasData)) {
                    // Transformar os dados para o formato esperado pelo componente
                    const dividasProcessadas = dividasData.map(divida => ({
                        id: divida.id,
                        clienteNome: divida.cliente?.nome_completo || divida.cliente_nome || 'Cliente não identificado',
                        forma_entrada: divida.origem || divida.tipo || 'Venda',
                        vencimento: divida.data_vencimento || divida.vencimento,
                        valor_pendente: parseFloat(divida.valor_pendente || divida.valor_total || 0),
                        valor_original: parseFloat(divida.valor_original || divida.valor_total || 0),
                        status: divida.status,
                        observacoes: divida.observacoes || ''
                    }));
                    
                    setDividas(dividasProcessadas);
                } else {
                    console.warn('⚠️ Dados de dívidas não são um array:', dividasData);
                    setDividas([]);
                }
                
            } catch (error) {
                console.error('❌ Erro ao carregar dívidas:', error);
                toast({ 
                    title: "Erro ao carregar dados", 
                    description: "Não foi possível carregar as dívidas dos clientes.", 
                    variant: "destructive" 
                });
                setDividas([]);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [toast]);

    // Função auxiliar para calcular dias de atraso
    const calcularDiasAtraso = (vencimento) => {
        if (!vencimento || !isValid(parseISO(vencimento))) return 0;
        return Math.max(0, differenceInDays(new Date(), parseISO(vencimento)));
    };

    // Função auxiliar para classificar urgência
    const getUrgencia = (diasAtraso) => {
        if (diasAtraso === 0) return 'a_vencer';
        if (diasAtraso <= 15) return 'vencido';
        if (diasAtraso <= 30) return 'atencao';
        return 'critico';
    };

    useEffect(() => {
        let items = [...dividas];
        
        // Filtro por nome do cliente
        if (filtroCliente) {
            items = items.filter(d => d.clienteNome.toLowerCase().includes(filtroCliente.toLowerCase()));
        }
        
        // Filtro por status
        if (filtroStatus !== 'todos') {
            items = items.filter(d => {
                const diasAtraso = calcularDiasAtraso(d.vencimento);
                const urgencia = getUrgencia(diasAtraso);
                
                switch(filtroStatus) {
                    case 'vencido':
                        return diasAtraso > 0;
                    case 'a_vencer':
                        return diasAtraso === 0;
                    case 'critico':
                        return diasAtraso > 30;
                    case 'atencao':
                        return diasAtraso > 15 && diasAtraso <= 30;
                    default:
                        return true;
                }
            });
        }
        
        // Ordenação
        items.sort((a, b) => {
            switch(ordenacao) {
                case 'atraso_desc':
                    return calcularDiasAtraso(b.vencimento) - calcularDiasAtraso(a.vencimento);
                case 'atraso_asc':
                    return calcularDiasAtraso(a.vencimento) - calcularDiasAtraso(b.vencimento);
                case 'valor_desc':
                    return b.valor_pendente - a.valor_pendente;
                case 'valor_asc':
                    return a.valor_pendente - b.valor_pendente;
                case 'cliente_asc':
                    return a.clienteNome.localeCompare(b.clienteNome);
                default:
                    return 0;
            }
        });
        
        setFilteredDividas(items);
    }, [dividas, filtroCliente, filtroStatus, ordenacao]);

    // Estatísticas detalhadas
    const estatisticas = useMemo(() => {
        const total = filteredDividas.reduce((acc, d) => acc + d.valor_pendente, 0);
        const qtdClientes = new Set(filteredDividas.map(d => d.clienteNome)).size;
        
        const vencidas = filteredDividas.filter(d => calcularDiasAtraso(d.vencimento) > 0);
        const totalVencidas = vencidas.reduce((acc, d) => acc + d.valor_pendente, 0);
        
        const criticas = filteredDividas.filter(d => calcularDiasAtraso(d.vencimento) > 30);
        const totalCriticas = criticas.reduce((acc, d) => acc + d.valor_pendente, 0);
        
        const aVencer = filteredDividas.filter(d => calcularDiasAtraso(d.vencimento) === 0);
        const totalAVencer = aVencer.reduce((acc, d) => acc + d.valor_pendente, 0);
        
        const diasAtrasoDividas = vencidas.map(d => calcularDiasAtraso(d.vencimento));
        const mediaDiasAtraso = diasAtrasoDividas.length > 0 
            ? diasAtrasoDividas.reduce((a, b) => a + b, 0) / diasAtrasoDividas.length 
            : 0;
        
        return {
            total,
            qtdClientes,
            qtdVencidas: vencidas.length,
            totalVencidas,
            qtdCriticas: criticas.length,
            totalCriticas,
            qtdAVencer: aVencer.length,
            totalAVencer,
            mediaDiasAtraso: Math.round(mediaDiasAtraso)
        };
    }, [filteredDividas]);
    
    // Função para obter badge de urgência
    const getBadgeUrgencia = (diasAtraso) => {
        const urgencia = getUrgencia(diasAtraso);
        const configs = {
            a_vencer: { label: 'A Vencer', variant: 'default', className: 'bg-blue-500' },
            vencido: { label: 'Vencido', variant: 'secondary', className: 'bg-yellow-500' },
            atencao: { label: 'Atenção', variant: 'destructive', className: 'bg-orange-500' },
            critico: { label: 'Crítico', variant: 'destructive', className: 'bg-red-600 animate-pulse' }
        };
        return configs[urgencia] || configs.vencido;
    };

    const limparFiltros = () => {
        setFiltroCliente('');
        setFiltroStatus('todos');
        setOrdenacao('atraso_desc');
    };

    const handleExportPDF = () => {
        const headers = [['Cliente', 'Vencimento', 'Atraso (dias)', 'Status', 'Valor Devido (R$)']];
        const data = filteredDividas.map(d => {
            const diasAtraso = calcularDiasAtraso(d.vencimento);
            return [
                d.clienteNome,
                isValid(parseISO(d.vencimento)) ? format(parseISO(d.vencimento), 'dd/MM/yyyy') : 'N/A',
                diasAtraso,
                getBadgeUrgencia(diasAtraso).label,
                d.valor_pendente.toFixed(2)
            ];
        });
        const summary = [
            { label: 'Total em Dívidas', value: `R$ ${estatisticas.total.toFixed(2)}` },
            { label: 'Clientes com Dívidas', value: estatisticas.qtdClientes },
            { label: 'Dívidas Vencidas', value: `${estatisticas.qtdVencidas} (R$ ${estatisticas.totalVencidas.toFixed(2)})` },
            { label: 'Dívidas Críticas (>30 dias)', value: `${estatisticas.qtdCriticas} (R$ ${estatisticas.totalCriticas.toFixed(2)})` }
        ];
        exportToPdf('Relatório de Dívidas de Clientes', headers, data, summary, logoUrl, empresaSettings.nomeFantasia);
        toast({ title: "PDF Gerado", description: "O relatório de dívidas de clientes foi exportado." });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório de Dívidas por Cliente</CardTitle>
                <CardDescription>Clientes com valores pendentes ou vencidos.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Filtros Avançados */}
                <div className="p-4 border rounded-lg mb-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center"><Filter size={16} className="mr-2"/>Filtros e Ordenação</h3>
                        <Button variant="outline" size="sm" onClick={limparFiltros}>
                            <XCircle size={14} className="mr-2"/>Limpar Filtros
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Nome do Cliente</label>
                            <Input
                                placeholder="Buscar por nome..."
                                value={filtroCliente}
                                onChange={e => setFiltroCliente(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Status da Dívida</label>
                            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">📊 Todas</SelectItem>
                                    <SelectItem value="a_vencer">🔵 A Vencer (hoje)</SelectItem>
                                    <SelectItem value="vencido">🟡 Vencidas (até 15 dias)</SelectItem>
                                    <SelectItem value="atencao">🟠 Atenção (16-30 dias)</SelectItem>
                                    <SelectItem value="critico">🔴 Críticas (+30 dias)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Ordenar Por</label>
                            <Select value={ordenacao} onValueChange={setOrdenacao}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a ordenação" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="atraso_desc">⬇️ Maior Atraso</SelectItem>
                                    <SelectItem value="atraso_asc">⬆️ Menor Atraso</SelectItem>
                                    <SelectItem value="valor_desc">💰 Maior Valor</SelectItem>
                                    <SelectItem value="valor_asc">💵 Menor Valor</SelectItem>
                                    <SelectItem value="cliente_asc">👤 Nome A-Z</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Cards de Estatísticas */}
                {isAdmin && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total em Aberto</CardTitle>
                                <DollarSign className="h-4 w-4 text-red-500"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">R$ {estatisticas.total.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground mt-1">{filteredDividas.length} dívida(s)</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Clientes Devedores</CardTitle>
                                <Users className="h-4 w-4 text-blue-500"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{estatisticas.qtdClientes}</div>
                                <p className="text-xs text-muted-foreground mt-1">cliente(s) único(s)</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Dívidas Vencidas</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-yellow-500"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-yellow-600">{estatisticas.qtdVencidas}</div>
                                <p className="text-xs text-muted-foreground mt-1">R$ {estatisticas.totalVencidas.toFixed(2)}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Situação Crítica</CardTitle>
                                <Clock className="h-4 w-4 text-red-500"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{estatisticas.qtdCriticas}</div>
                                <p className="text-xs text-muted-foreground mt-1">+30 dias de atraso</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Mobile Layout */}
                <div className="md:hidden">
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                    <p className="text-muted-foreground">Carregando dívidas dos clientes...</p>
                                </div>
                            ) : filteredDividas.length > 0 ? (
                                filteredDividas.map((divida, index) => {
                                    const diasAtraso = calcularDiasAtraso(divida.vencimento);
                                    const badgeConfig = getBadgeUrgencia(diasAtraso);
                                    
                                    return (
                                        <motion.div
                                            key={divida.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.05 }}
                                            className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors shadow-sm"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-semibold text-sm break-words flex items-center flex-1">
                                                        <User size={14} className="mr-2 flex-shrink-0"/>
                                                        {divida.clienteNome}
                                                    </h4>
                                                    <Badge className={`text-xs ${badgeConfig.className} text-white`}>
                                                        {badgeConfig.label}
                                                    </Badge>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground flex items-center">
                                                            <Calendar size={12} className="mr-1"/> Vencimento
                                                        </p>
                                                        <p className="text-sm font-medium">
                                                            {isValid(parseISO(divida.vencimento)) ? format(parseISO(divida.vencimento), 'dd/MM/yyyy') : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground flex items-center">
                                                            <Clock size={12} className="mr-1"/> Atraso
                                                        </p>
                                                        <p className={`text-sm font-bold ${diasAtraso > 30 ? 'text-red-600' : diasAtraso > 0 ? 'text-yellow-600' : 'text-blue-600'}`}>
                                                            {diasAtraso} dia(s)
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <div className="pt-2 border-t">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs text-muted-foreground">Valor Devido</p>
                                                        <p className="text-lg font-bold text-red-600">
                                                            R$ {divida.valor_pendente.toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8">
                                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">Nenhuma dívida encontrada</p>
                                    <p className="text-xs text-muted-foreground mt-2">Tente ajustar os filtros</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:block">
                    <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Vencimento</TableHead>
                                    <TableHead className="text-center">Atraso</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Valor Devido</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                                <p>Carregando dívidas dos clientes...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredDividas.length > 0 ? (
                                    filteredDividas.map(divida => {
                                        const diasAtraso = calcularDiasAtraso(divida.vencimento);
                                        const badgeConfig = getBadgeUrgencia(diasAtraso);
                                        
                                        return (
                                            <TableRow key={divida.id} className="hover:bg-accent/50">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center">
                                                        <User size={14} className="mr-2 flex-shrink-0"/>
                                                        {divida.clienteNome}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center">
                                                        <Calendar size={14} className="mr-2 text-muted-foreground"/>
                                                        {isValid(parseISO(divida.vencimento)) ? format(parseISO(divida.vencimento), 'dd/MM/yyyy') : 'N/A'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={`font-bold inline-flex items-center ${diasAtraso > 30 ? 'text-red-600' : diasAtraso > 0 ? 'text-yellow-600' : 'text-blue-600'}`}>
                                                        <Clock size={14} className="mr-1"/>
                                                        {diasAtraso} dia(s)
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={`${badgeConfig.className} text-white`}>
                                                        {badgeConfig.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-red-600">
                                                    R$ {divida.valor_pendente.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            <div className="flex flex-col items-center gap-2">
                                                <User className="h-12 w-12 text-muted-foreground" />
                                                <p className="text-muted-foreground">Nenhuma dívida encontrada.</p>
                                                <p className="text-xs text-muted-foreground">Tente ajustar os filtros</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleExportPDF}><Printer size={16} className="mr-2"/> Exportar PDF</Button>
            </CardFooter>
        </Card>
    );
};

export default RelatorioDividasClientes;