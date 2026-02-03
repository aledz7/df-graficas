import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid } from 'date-fns';
import { Printer, ArrowDownCircle, ArrowUpCircle, Filter } from 'lucide-react';
import { exportToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';
import { apiDataManager } from '@/lib/apiDataManager';
import { lancamentoCaixaService } from '@/services/api';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';

const RelatorioSangriasSuprimentos = () => {
    const { toast } = useToast();
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [filteredMovs, setFilteredMovs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [filtroTipo, setFiltroTipo] = useState('todos');
    // Inicializar com a data atual (início e fim = hoje)
    const hoje = new Date();
    const dataHoje = hoje.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const [filtroPeriodo, setFiltroPeriodo] = useState({ inicio: dataHoje, fim: dataHoje });
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

                // Carregar movimentações de caixa da API
                const responseMovimentacoes = await lancamentoCaixaService.getAll();
                let movimentacoesDaAPI = responseMovimentacoes.data?.data?.data || responseMovimentacoes.data?.data || responseMovimentacoes.data || [];
                
                // Filtrar apenas sangrias e suprimentos baseado na categoria_nome
                const sangriasSuprimentos = movimentacoesDaAPI.filter(mov => {
                    const categoriaNome = mov.categoria?.nome || mov.categoria_nome || '';
                    return categoriaNome.toLowerCase().includes('sangria') || 
                           categoriaNome.toLowerCase().includes('suprimento');
                });
                
                // Transformar dados da API para o formato esperado pelo frontend
                const movimentacoesTransformadas = sangriasSuprimentos.map(mov => {
                    const categoriaNome = mov.categoria?.nome || mov.categoria_nome || '';
                    const isSangria = categoriaNome.toLowerCase().includes('sangria');
                    const isSuprimento = categoriaNome.toLowerCase().includes('suprimento');
                    
                    return {
                        id: mov.id,
                        data: mov.data || mov.data_operacao || new Date().toISOString(),
                        tipo: isSangria ? 'sangria' : isSuprimento ? 'suprimento' : 'outro',
                        motivo: mov.descricao || mov.observacoes || categoriaNome,
                        valor: parseFloat(mov.valor) || 0,
                        categoriaId: mov.categoria_id || null,
                        categoriaNome: categoriaNome,
                        contaId: mov.conta_id || null,
                        contaNome: mov.conta?.nome || 'Caixa',
                        usuarioId: mov.usuario_id || null,
                        usuarioNome: mov.usuario?.name || 'Usuário não encontrado',
                        status: mov.status || 'concluido',
                        formaPagamento: mov.forma_pagamento || 'Dinheiro',
                    };
                });

                // Ordenar por data (mais recente primeiro)
                const movimentacoesOrdenadas = movimentacoesTransformadas.sort((a, b) => {
                    const dateA = new Date(a.data);
                    const dateB = new Date(b.data);
                    if (!isValid(dateA) && !isValid(dateB)) return 0;
                    if (!isValid(dateA)) return 1;
                    if (!isValid(dateB)) return -1;
                    return dateB - dateA;
                });

                setMovimentacoes(movimentacoesOrdenadas);
                
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                toast({ 
                    title: 'Erro ao carregar dados', 
                    description: 'Não foi possível carregar as sangrias e suprimentos da API.',
                    variant: 'destructive' 
                });
                // Garantir que movimentacoes seja sempre um array
                setMovimentacoes([]);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, [toast]);

    useEffect(() => {
        // Garantir que movimentacoes seja sempre um array antes de filtrar
        if (!Array.isArray(movimentacoes)) {
            setFilteredMovs([]);
            return;
        }

        let items = [...movimentacoes];
        if (filtroTipo !== 'todos') items = items.filter(m => m.tipo === filtroTipo);
        if (filtroPeriodo.inicio) items = items.filter(m => isValid(parseISO(m.data)) && new Date(m.data) >= new Date(filtroPeriodo.inicio));
        if (filtroPeriodo.fim) {
            const fim = new Date(filtroPeriodo.fim);
            fim.setHours(23, 59, 59, 999);
            items = items.filter(m => isValid(parseISO(m.data)) && new Date(m.data) <= fim);
        }
        setFilteredMovs(items);
    }, [movimentacoes, filtroTipo, filtroPeriodo]);

    const totais = useMemo(() => {
        if (!Array.isArray(filteredMovs)) return { totalSangrias: 0, totalSuprimentos: 0 };
        
        const totalSangrias = filteredMovs.filter(m => m.tipo === 'sangria').reduce((acc, m) => acc + parseFloat(m.valor || 0), 0);
        const totalSuprimentos = filteredMovs.filter(m => m.tipo === 'suprimento').reduce((acc, m) => acc + parseFloat(m.valor || 0), 0);
        return { totalSangrias, totalSuprimentos };
    }, [filteredMovs]);

    const handleExportPDF = () => {
        const headers = [['Data', 'Tipo', 'Motivo', 'Valor (R$)']];
        const data = filteredMovs.map(m => [
            isValid(parseISO(m.data)) ? format(parseISO(m.data), 'dd/MM/yyyy HH:mm') : 'N/A',
            m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1),
            m.motivo,
            formatCurrency(parseFloat(m.valor || 0))
        ]);
        const summary = [
            { label: 'Total de Sangrias (Filtrado)', value: formatCurrency(totais.totalSangrias) },
            { label: 'Total de Suprimentos (Filtrado)', value: formatCurrency(totais.totalSuprimentos) }
        ];
        exportToPdf('Relatório de Sangrias e Suprimentos', headers, data, summary, logoUrl, empresaSettings.nomeFantasia);
        toast({ title: "PDF Gerado", description: "O relatório de sangrias e suprimentos foi exportado." });
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Relatório de Sangrias e Suprimentos</CardTitle>
                    <CardDescription>Carregando dados...</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-32">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Carregando sangrias e suprimentos...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório de Sangrias e Suprimentos</CardTitle>
                <CardDescription>Visualize todas as movimentações manuais de caixa.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="p-4 border rounded-lg mb-4 space-y-4">
                    <h3 className="font-semibold flex items-center"><Filter size={16} className="mr-2"/>Filtros</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os Tipos</SelectItem>
                                <SelectItem value="sangria">Sangria</SelectItem>
                                <SelectItem value="suprimento">Suprimento</SelectItem>
                            </SelectContent>
                        </Select>
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

                <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total de Sangrias</CardTitle>
                            <ArrowDownCircle className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{formatCurrency(totais.totalSangrias)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total de Suprimentos</CardTitle>
                            <ArrowUpCircle className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(totais.totalSuprimentos)}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Layout Mobile - Cards */}
                <div className="md:hidden">
                    <ScrollArea className="h-[400px]">
                        {filteredMovs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <ArrowDownCircle size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                <p>Nenhuma sangria ou suprimento encontrado para os filtros aplicados.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredMovs.map(mov => (
                                    <motion.div
                                        key={mov.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-sm break-words">{mov.motivo}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className={`text-xs ${
                                                        mov.tipo === 'sangria' ? 'text-red-600 border-red-200 bg-red-50' : 'text-green-600 border-green-200 bg-green-50'
                                                    }`}>
                                                        {mov.tipo === 'sangria' ? (
                                                            <ArrowDownCircle className="mr-1 h-3 w-3" />
                                                        ) : (
                                                            <ArrowUpCircle className="mr-1 h-3 w-3" />
                                                        )}
                                                        {mov.tipo.charAt(0).toUpperCase() + mov.tipo.slice(1)}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="text-right ml-3">
                                                <p className={`text-lg font-bold ${mov.tipo === 'sangria' ? 'text-red-600' : 'text-green-600'}`}>
                                                    {formatCurrency(parseFloat(mov.valor || 0))}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Data</p>
                                                <p className="text-sm">
                                                    {isValid(parseISO(mov.data)) ? format(parseISO(mov.data), 'dd/MM/yyyy HH:mm') : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Layout Desktop - Tabela */}
                <div className="hidden md:block">
                    <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Motivo</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMovs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            Nenhuma sangria ou suprimento encontrado para os filtros aplicados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredMovs.map(mov => (
                                        <TableRow key={mov.id}>
                                            <TableCell>
                                                {isValid(parseISO(mov.data)) ? format(parseISO(mov.data), 'dd/MM/yyyy HH:mm') : 'N/A'}
                                            </TableCell>
                                            <TableCell className={`font-semibold ${mov.tipo === 'sangria' ? 'text-red-500' : 'text-green-500'}`}>
                                                {mov.tipo.charAt(0).toUpperCase() + mov.tipo.slice(1)}
                                            </TableCell>
                                            <TableCell>{mov.motivo}</TableCell>
                                            <TableCell className="text-right font-bold">
                                                {formatCurrency(parseFloat(mov.valor || 0))}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleExportPDF} disabled={filteredMovs.length === 0}>
                    <Printer size={16} className="mr-2"/> Exportar PDF
                </Button>
            </CardFooter>
        </Card>
    );
};

export default RelatorioSangriasSuprimentos;