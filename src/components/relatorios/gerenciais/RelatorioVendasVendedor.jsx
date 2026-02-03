import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid } from 'date-fns';
import { Printer, User, Filter, PieChart } from 'lucide-react';
import { Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import { exportToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';
import { vendaService } from '@/services/api';
import { userService } from '@/services/userService';
import { motion } from 'framer-motion';

const RelatorioVendasVendedor = () => {
    const { toast } = useToast();
    const [vendas, setVendas] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    
    const [filtroVendedor, setFiltroVendedor] = useState('todos');
    const [filtroPeriodo, setFiltroPeriodo] = useState({ 
        inicio: new Date().toISOString().split('T')[0], 
        fim: new Date().toISOString().split('T')[0] 
    });

    const loadVendedores = async () => {
        try {
            const response = await userService.getAll({ permite_comissao: true, ativo: true });
            const vendedoresData = response.data || [];
            const vendedoresArray = Array.isArray(vendedoresData) ? vendedoresData : [];
            setVendedores(vendedoresArray);
        } catch (error) {
            console.error('Erro ao carregar vendedores:', error);
            toast({
                title: "Erro ao carregar vendedores",
                description: "Não foi possível carregar a lista de vendedores.",
                variant: "destructive",
            });
        }
    };

    const loadVendas = async (filtros = {}) => {
        try {
            const params = { 
                status: 'concluida',
                ...filtros
            };
            const response = await vendaService.getAll(params);
            const vendasData = response.data || [];
            const vendasArray = Array.isArray(vendasData) ? vendasData : [];
            
            // Formatar vendas para o formato esperado
            const vendasFormatadas = vendasArray.map(venda => ({
                id: venda.id,
                data: venda.data_emissao || venda.created_at,
                vendedorId: venda.vendedor_id || venda.usuario_id,
                vendedorNome: venda.vendedor?.name || venda.usuario?.name || venda.vendedor_nome || 'N/A',
                total: parseFloat(venda.valor_total || 0),
                clienteNome: venda.cliente?.nome || venda.cliente_nome || 'Consumidor Final',
                tipo: venda.tipo_documento || 'Venda'
            }));
            
            setVendas(vendasFormatadas);
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            toast({
                title: "Erro ao carregar vendas",
                description: "Não foi possível carregar os dados de vendas.",
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        loadVendedores();
        // Carregar vendas com filtro de data atual
        const hoje = new Date().toISOString().split('T')[0];
        loadVendas({ 
            data_inicio: hoje, 
            data_fim: hoje 
        });
    }, []);

    // Recarregar vendas quando os filtros de data mudarem
    useEffect(() => {
        if (filtroPeriodo.inicio || filtroPeriodo.fim) {
            const filtros = {};
            if (filtroPeriodo.inicio) filtros.data_inicio = filtroPeriodo.inicio;
            if (filtroPeriodo.fim) filtros.data_fim = filtroPeriodo.fim;
            loadVendas(filtros);
        }
    }, [filtroPeriodo.inicio, filtroPeriodo.fim]);

    useEffect(() => {
        let items = [...vendas];
        if (filtroVendedor !== 'todos') items = items.filter(v => v.vendedorId === filtroVendedor);
        
        const groupedByVendedor = items.reduce((acc, curr) => {
            const id = curr.vendedorId;
            if (!acc[id]) {
                acc[id] = { vendedorNome: curr.vendedorNome, totalVendido: 0, qtdVendas: 0 };
            }
            acc[id].totalVendido += curr.total;
            acc[id].qtdVendas += 1;
            return acc;
        }, {});
        
        setFilteredData(Object.values(groupedByVendedor).sort((a,b) => b.totalVendido - a.totalVendido));
    }, [vendas, filtroVendedor]);
    
    const chartData = {
        labels: filteredData.map(d => d.vendedorNome),
        datasets: [{
            label: 'Total Vendido (R$)',
            data: filteredData.map(d => d.totalVendido),
            backgroundColor: ['#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#d946ef'],
            hoverOffset: 4
        }]
    };

    const handleExportPDF = () => {
        const headers = [['Vendedor', 'Qtd. Vendas', 'Total Vendido (R$)']];
        const data = filteredData.map(d => [
            d.vendedorNome,
            d.qtdVendas,
            d.totalVendido.toFixed(2)
        ]);
        const summary = [
            { label: 'Total de Vendas (Filtrado)', value: filteredData.reduce((acc, d) => acc + d.qtdVendas, 0) },
            { label: 'Valor Total Vendido (Filtrado)', value: `R$ ${filteredData.reduce((acc, d) => acc + d.totalVendido, 0).toFixed(2)}` }
        ];
        exportToPdf('Relatório de Vendas por Vendedor', headers, data, summary);
        toast({ title: "PDF Gerado", description: "O relatório de vendas por vendedor foi exportado." });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório de Vendas por Vendedor</CardTitle>
                <CardDescription>Desempenho de vendas por membro da equipe.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                    <div className="p-4 border rounded-lg space-y-4">
                        <h3 className="font-semibold flex items-center"><Filter size={16} className="mr-2"/>Filtros</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Vendedor</label>
                                <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
                                    <SelectTrigger><SelectValue placeholder="Selecione um vendedor"/></SelectTrigger>
                                    <SelectContent><SelectItem value="todos">Todos Vendedores</SelectItem>{vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Data Inicial</label>
                                <Input type="date" value={filtroPeriodo.inicio} onChange={e => setFiltroPeriodo(p => ({...p, inicio: e.target.value}))}/>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Data Final</label>
                                <Input type="date" value={filtroPeriodo.fim} onChange={e => setFiltroPeriodo(p => ({...p, fim: e.target.value}))}/>
                            </div>
                        </div>
                    </div>
                    {/* Mobile Layout */}
                    <div className="md:hidden">
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-3">
                                {filteredData.length > 0 ? filteredData.map((vendedor, index) => (
                                    <motion.div
                                        key={vendedor.vendedorNome}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.1 }}
                                        className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-sm break-words flex items-center">
                                                    <User size={14} className="mr-2"/>
                                                    {vendedor.vendedorNome}
                                                </h4>
                                                <Badge variant="outline" className="text-xs">
                                                    {vendedor.qtdVendas} vendas
                                                </Badge>
                                            </div>
                                            
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground">Total Vendido</p>
                                                <p className="text-lg font-bold text-primary">
                                                    R$ {vendedor.totalVendido.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )) : (
                                    <div className="text-center py-8">
                                        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                        <p className="text-muted-foreground">Nenhum dado encontrado para os filtros selecionados</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:block">
                        <ScrollArea className="h-[400px]">
                            <Table>
                                <TableHeader><TableRow><TableHead>Vendedor</TableHead><TableHead className="text-center">Qtd. Vendas</TableHead><TableHead className="text-right">Total Vendido</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredData.length > 0 ? filteredData.map(vendedor => (
                                        <TableRow key={vendedor.vendedorNome}>
                                            <TableCell className="font-medium flex items-center"><User size={14} className="mr-2"/>{vendedor.vendedorNome}</TableCell>
                                            <TableCell className="text-center">{vendedor.qtdVendas}</TableCell>
                                            <TableCell className="text-right font-bold text-primary">R$ {vendedor.totalVendido.toFixed(2)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                          <TableCell colSpan={3} className="text-center h-24">Nenhum dado encontrado para os filtros selecionados.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </div>
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center"><PieChart size={18} className="mr-2"/>Distribuição de Vendas</CardTitle>
                        </CardHeader>
                        <CardContent>
                           {filteredData.length > 0 ? <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: true }} /> : <p className="text-center text-sm text-muted-foreground">Sem dados para exibir o gráfico.</p>}
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleExportPDF} disabled={filteredData.length === 0}><Printer size={16} className="mr-2"/> Exportar PDF</Button>
            </CardFooter>
        </Card>
    );
};

export default RelatorioVendasVendedor;