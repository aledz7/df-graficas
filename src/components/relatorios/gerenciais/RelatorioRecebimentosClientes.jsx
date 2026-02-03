import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid } from 'date-fns';
import { Printer, User, Filter, DollarSign, Loader2, XCircle, Calendar, TrendingUp, Users, ArrowUpDown, Receipt } from 'lucide-react';
import { exportToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';
import { contaReceberService } from '@/services/api';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';

const RelatorioRecebimentosClientes = () => {
    const { toast } = useToast();
    const { isAdmin } = usePermissions();
    const [recebimentos, setRecebimentos] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filtroCliente, setFiltroCliente] = useState('');
    const [filtroPeriodo, setFiltroPeriodo] = useState({ inicio: '', fim: '' });
    const [ordenacao, setOrdenacao] = useState('valor_desc'); // valor_desc, valor_asc, cliente_asc, data_desc
    const [filtroValorMin, setFiltroValorMin] = useState('');
    const [filtroValorMax, setFiltroValorMax] = useState('');
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                
                // Carregar configurações da empresa
                const settings = JSON.parse(localStorage.getItem('empresaSettings') || '{}');
                const logo = localStorage.getItem('logoUrl') || '';
                setEmpresaSettings(settings);
                setLogoUrl(logo);

                // Buscar recebimentos da API Laravel
                const params = {};
                if (filtroPeriodo.inicio) params.data_inicio = filtroPeriodo.inicio;
                if (filtroPeriodo.fim) params.data_fim = filtroPeriodo.fim;

                const response = await contaReceberService.recebimentosClientes(params);
                const recebimentosData = response.data?.data || [];
                setRecebimentos(recebimentosData);

            } catch (error) {
                console.error('Erro ao carregar recebimentos:', error);
                toast({
                    title: "Erro ao carregar dados",
                    description: "Não foi possível carregar os recebimentos da API.",
                    variant: "destructive"
                });
                
                // Fallback para dados de exemplo
                setRecebimentos([
                    {
                        id: '1',
                        clienteNome: 'Cliente Exemplo',
                        data: new Date().toISOString(),
                        valor: 1500.00,
                        origem: 'Venda VEN001'
                    }
                ]);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, [filtroPeriodo.inicio, filtroPeriodo.fim, toast]);

    useEffect(() => {
        let items = [...recebimentos];
        
        // Filtro por nome do cliente
        if (filtroCliente) {
            items = items.filter(r => r.clienteNome?.toLowerCase().includes(filtroCliente.toLowerCase()));
        }
        
        // Agrupar por cliente
        const groupedByClient = items.reduce((acc, curr) => {
            const id = curr.clienteId || curr.clienteNome;
            if (!acc[id]) {
                acc[id] = { 
                    clienteNome: curr.clienteNome, 
                    totalRecebido: 0, 
                    ultimaData: null,
                    qtdRecebimentos: 0
                };
            }
            acc[id].totalRecebido += curr.valor;
            acc[id].qtdRecebimentos += 1;
            if (!acc[id].ultimaData || new Date(curr.data) > new Date(acc[id].ultimaData)) {
                acc[id].ultimaData = curr.data;
            }
            return acc;
        }, {});
        
        let groupedArray = Object.values(groupedByClient);
        
        // Filtro por faixa de valor
        if (filtroValorMin !== '') {
            const valorMin = parseFloat(filtroValorMin);
            if (!isNaN(valorMin)) {
                groupedArray = groupedArray.filter(c => c.totalRecebido >= valorMin);
            }
        }
        
        if (filtroValorMax !== '') {
            const valorMax = parseFloat(filtroValorMax);
            if (!isNaN(valorMax)) {
                groupedArray = groupedArray.filter(c => c.totalRecebido <= valorMax);
            }
        }
        
        // Ordenação
        groupedArray.sort((a, b) => {
            switch(ordenacao) {
                case 'valor_desc':
                    return b.totalRecebido - a.totalRecebido;
                case 'valor_asc':
                    return a.totalRecebido - b.totalRecebido;
                case 'cliente_asc':
                    return a.clienteNome.localeCompare(b.clienteNome);
                case 'data_desc':
                    return new Date(b.ultimaData) - new Date(a.ultimaData);
                default:
                    return b.totalRecebido - a.totalRecebido;
            }
        });
        
        setFilteredData(groupedArray);
    }, [recebimentos, filtroCliente, filtroValorMin, filtroValorMax, ordenacao]);

    // Estatísticas detalhadas
    const estatisticas = useMemo(() => {
        const totalRecebido = filteredData.reduce((acc, c) => acc + c.totalRecebido, 0);
        const qtdClientes = filteredData.length;
        const mediaRecebidoPorCliente = qtdClientes > 0 ? totalRecebido / qtdClientes : 0;
        
        // Cliente com maior valor recebido
        const maiorCliente = filteredData.length > 0 
            ? filteredData.reduce((max, c) => c.totalRecebido > max.totalRecebido ? c : max, filteredData[0])
            : null;
        
        // Total de recebimentos (transações)
        const totalRecebimentos = filteredData.reduce((acc, c) => acc + c.qtdRecebimentos, 0);
        
        return {
            totalRecebido,
            qtdClientes,
            mediaRecebidoPorCliente,
            maiorCliente,
            totalRecebimentos
        };
    }, [filteredData]);

    const limparFiltros = () => {
        setFiltroCliente('');
        setFiltroPeriodo({ inicio: '', fim: '' });
        setFiltroValorMin('');
        setFiltroValorMax('');
        setOrdenacao('valor_desc');
    };

    const handleExportPDF = () => {
        const headers = [['Cliente', 'Último Recebimento', 'Qtd. Recebimentos', 'Total Recebido (R$)']];
        const data = filteredData.map(c => [
            c.clienteNome,
            isValid(parseISO(c.ultimaData)) ? format(parseISO(c.ultimaData), 'dd/MM/yyyy') : 'N/A',
            c.qtdRecebimentos,
            c.totalRecebido.toFixed(2)
        ]);
        const summary = [
            { label: 'Total Recebido', value: `R$ ${estatisticas.totalRecebido.toFixed(2)}` },
            { label: 'Clientes Ativos', value: estatisticas.qtdClientes },
            { label: 'Média por Cliente', value: `R$ ${estatisticas.mediaRecebidoPorCliente.toFixed(2)}` },
            { label: 'Total de Recebimentos', value: estatisticas.totalRecebimentos }
        ];
        exportToPdf('Relatório de Recebimentos por Cliente', headers, data, summary, logoUrl, empresaSettings.nomeFantasia);
        toast({ title: "PDF Gerado", description: "O relatório de recebimentos por cliente foi exportado." });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório de Recebimentos por Cliente</CardTitle>
                <CardDescription>Total recebido de cada cliente, com filtros de período.</CardDescription>
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Nome do Cliente</label>
                            <Input 
                                placeholder="Buscar por nome..." 
                                value={filtroCliente} 
                                onChange={e => setFiltroCliente(e.target.value)}
                            />
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium mb-2 block flex items-center">
                                <Calendar size={14} className="mr-1"/> Data Inicial
                            </label>
                            <Input 
                                type="date" 
                                value={filtroPeriodo.inicio} 
                                onChange={e => setFiltroPeriodo(p => ({...p, inicio: e.target.value}))}
                            />
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium mb-2 block flex items-center">
                                <Calendar size={14} className="mr-1"/> Data Final
                            </label>
                            <Input 
                                type="date" 
                                value={filtroPeriodo.fim} 
                                onChange={e => setFiltroPeriodo(p => ({...p, fim: e.target.value}))}
                            />
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium mb-2 block flex items-center">
                                <ArrowUpDown size={14} className="mr-1"/> Ordenar Por
                            </label>
                            <Select value={ordenacao} onValueChange={setOrdenacao}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="valor_desc">💰 Maior Valor</SelectItem>
                                    <SelectItem value="valor_asc">💵 Menor Valor</SelectItem>
                                    <SelectItem value="data_desc">📅 Recebimento Recente</SelectItem>
                                    <SelectItem value="cliente_asc">👤 Nome A-Z</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Valor Mínimo (R$)</label>
                            <Input 
                                type="number" 
                                placeholder="0.00" 
                                step="0.01"
                                value={filtroValorMin} 
                                onChange={e => setFiltroValorMin(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Valor Máximo (R$)</label>
                            <Input 
                                type="number" 
                                placeholder="999999.99" 
                                step="0.01"
                                value={filtroValorMax} 
                                onChange={e => setFiltroValorMax(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Cards de Estatísticas */}
                {isAdmin && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
                                <DollarSign className="h-4 w-4 text-green-500"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">R$ {estatisticas.totalRecebido.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground mt-1">{estatisticas.totalRecebimentos} recebimento(s)</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
                                <Users className="h-4 w-4 text-blue-500"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{estatisticas.qtdClientes}</div>
                                <p className="text-xs text-muted-foreground mt-1">cliente(s) com recebimentos</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Média por Cliente</CardTitle>
                                <TrendingUp className="h-4 w-4 text-purple-500"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-purple-600">R$ {estatisticas.mediaRecebidoPorCliente.toFixed(2)}</div>
                                <p className="text-xs text-muted-foreground mt-1">ticket médio</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Maior Cliente</CardTitle>
                                <Receipt className="h-4 w-4 text-orange-500"/>
                            </CardHeader>
                            <CardContent>
                                {estatisticas.maiorCliente ? (
                                    <>
                                        <div className="text-lg font-bold text-orange-600">R$ {estatisticas.maiorCliente.totalRecebido.toFixed(2)}</div>
                                        <p className="text-xs text-muted-foreground mt-1 truncate">{estatisticas.maiorCliente.clienteNome}</p>
                                    </>
                                ) : (
                                    <div className="text-sm text-muted-foreground">Sem dados</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-muted-foreground">Carregando recebimentos...</span>
                    </div>
                ) : (
                    <>
                        {/* Mobile Layout */}
                        <div className="md:hidden">
                            <ScrollArea className="h-[500px]">
                                <div className="space-y-3">
                                    {filteredData.length > 0 ? (
                                        filteredData.map((clienteData, index) => {
                                            return (
                                                <motion.div
                                                    key={clienteData.clienteNome}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                                    className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors shadow-sm"
                                                >
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <h4 className="font-semibold text-sm break-words flex items-center flex-1">
                                                                <User size={14} className="mr-2 flex-shrink-0"/>
                                                                {clienteData.clienteNome}
                                                            </h4>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <p className="text-xs text-muted-foreground flex items-center">
                                                                    <Calendar size={12} className="mr-1"/> Último Recebimento
                                                                </p>
                                                                <p className="text-sm font-medium">
                                                                    {isValid(parseISO(clienteData.ultimaData)) ? format(parseISO(clienteData.ultimaData), 'dd/MM/yyyy') : 'N/A'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground flex items-center">
                                                                    <Receipt size={12} className="mr-1"/> Recebimentos
                                                                </p>
                                                                <p className="text-sm font-bold text-blue-600">
                                                                    {clienteData.qtdRecebimentos}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="pt-2 border-t">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-xs text-muted-foreground">Total Recebido</p>
                                                                <p className="text-lg font-bold text-green-600 flex items-center">
                                                                    <DollarSign size={16} className="mr-1"/>
                                                                    R$ {clienteData.totalRecebido.toFixed(2)}
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
                                            <p className="text-muted-foreground">Nenhum recebimento encontrado</p>
                                            <p className="text-xs text-muted-foreground mt-2">Tente ajustar os filtros</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden md:block">
                            <ScrollArea className="h-[500px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Último Recebimento</TableHead>
                                            <TableHead className="text-center">Qtd. Recebimentos</TableHead>
                                            <TableHead className="text-right">Total Recebido</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredData.length > 0 ? (
                                            filteredData.map(clienteData => {
                                                return (
                                                    <TableRow key={clienteData.clienteNome} className="hover:bg-accent/50">
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center">
                                                                <User size={14} className="mr-2 flex-shrink-0"/>
                                                                {clienteData.clienteNome}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center">
                                                                <Calendar size={14} className="mr-2 text-muted-foreground"/>
                                                                {isValid(parseISO(clienteData.ultimaData)) ? format(parseISO(clienteData.ultimaData), 'dd/MM/yyyy HH:mm') : 'N/A'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="font-semibold text-blue-600 inline-flex items-center justify-center">
                                                                <Receipt size={14} className="mr-1"/>
                                                                {clienteData.qtdRecebimentos}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className="font-bold text-green-600 inline-flex items-center justify-end">
                                                                <DollarSign size={16} className="mr-1"/>
                                                                R$ {clienteData.totalRecebido.toFixed(2)}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center h-24">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <User className="h-12 w-12 text-muted-foreground" />
                                                        <p className="text-muted-foreground">Nenhum recebimento encontrado</p>
                                                        <p className="text-xs text-muted-foreground">Tente ajustar os filtros</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </>
                )}
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    {!isLoading && filteredData.length > 0 && (
                        <span>Exibindo {filteredData.length} cliente(s)</span>
                    )}
                </div>
                <Button onClick={handleExportPDF} disabled={isLoading || filteredData.length === 0}>
                    <Printer size={16} className="mr-2"/> Exportar PDF
                </Button>
            </CardFooter>
        </Card>
    );
};

export default RelatorioRecebimentosClientes;