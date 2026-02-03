import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { Printer, DollarSign, Filter, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { exportToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';
import { apiDataManager } from '@/lib/apiDataManager';
import contaPagarService from '@/services/contaPagarService';
import { clienteService } from '@/services/api';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';

const RelatorioContasPagar = () => {
    const { toast } = useToast();
    const [contas, setContas] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [filteredContas, setFilteredContas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [filtroFornecedor, setFiltroFornecedor] = useState('todos');
    const [buscaFornecedor, setBuscaFornecedor] = useState('');
    const [fornecedorSelecionado, setFornecedorSelecionado] = useState(null);
    const [sugestoesFornecedores, setSugestoesFornecedores] = useState([]);
    const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
    const [filtroPeriodo, setFiltroPeriodo] = useState({ inicio: '', fim: '' });
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                
                // Carregar configurações da empresa e logo
                const settings = JSON.parse(await apiDataManager.getItem('empresaSettings') || '{}');
                const logo = await apiDataManager.getItem('logoUrl') || '';
                setEmpresaSettings(settings);
                setLogoUrl(logo);
                
                // Carregar contas a pagar da API
                const responseContas = await contaPagarService.listar();
                let contasDaAPI = responseContas.data || [];
                
                // Transformar dados da API para o formato esperado pelo frontend
                const contasTransformadas = contasDaAPI.map(conta => {
                    return {
                        id: conta.id,
                        descricao: conta.descricao || 'Conta a pagar',
                        valor: parseFloat(conta.valor) || 0,
                        dataVencimento: conta.data_vencimento || new Date().toISOString(),
                        dataPagamento: conta.data_pagamento || null,
                        fornecedorId: conta.fornecedor_id || null,
                        fornecedorNome: conta.fornecedor?.nome_completo || conta.fornecedor?.apelido_fantasia || conta.fornecedor?.nome || 'Fornecedor não encontrado',
                        status: conta.status || 'pendente',
                        categoriaId: conta.categoria_id || null,
                        categoriaNome: conta.categoria?.nome || '',
                        observacoes: conta.observacoes || '',
                        recorrencia: conta.recorrencia || 'nao_recorre',
                        dataInicioContrato: conta.data_inicio_contrato || null,
                        dataFimContrato: conta.data_fim_contrato || null,
                    };
                });

                // Atualizar status para vencido se necessário
                const contasComStatusAtualizado = contasTransformadas.map(conta => {
                    if (conta.status === 'pendente' && isValid(parseISO(conta.dataVencimento)) && differenceInDays(new Date(), parseISO(conta.dataVencimento)) > 0) {
                        return { ...conta, status: 'vencido' };
                    }
                    return conta;
                });

                setContas(contasComStatusAtualizado);
                
                // Carregar fornecedores da API (usando clienteService pois fornecedores são clientes)
                const responseFornecedores = await clienteService.getAll();
                const fornecedoresData = responseFornecedores.data?.data?.data || responseFornecedores.data?.data || responseFornecedores.data || [];
                const fornecedoresArray = Array.isArray(fornecedoresData) ? fornecedoresData : [];
                setFornecedores(fornecedoresArray);
                
            } catch(error) {
                console.error('Erro ao carregar dados:', error);
                toast({ 
                    title: 'Erro ao carregar dados', 
                    description: 'Não foi possível carregar as contas a pagar da API.',
                    variant: 'destructive' 
                });
                // Garantir que contas seja sempre um array
                setContas([]);
                setFornecedores([]);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, [toast]);

    useEffect(() => {
        // Garantir que contas seja sempre um array antes de filtrar
        if (!Array.isArray(contas)) {
            setFilteredContas([]);
            return;
        }

        let items = [...contas];
        if (filtroStatus !== 'todos') items = items.filter(c => c.status === filtroStatus);
        if (filtroFornecedor !== 'todos') items = items.filter(c => c.fornecedorId === filtroFornecedor);
        if (filtroPeriodo.inicio) items = items.filter(c => new Date(c.dataVencimento) >= new Date(filtroPeriodo.inicio));
        if (filtroPeriodo.fim) {
            const fim = new Date(filtroPeriodo.fim);
            fim.setHours(23, 59, 59, 999);
            items = items.filter(c => new Date(c.dataVencimento) <= fim);
        }
        setFilteredContas(items);
    }, [contas, filtroStatus, filtroFornecedor, filtroPeriodo]);

    // Função para buscar fornecedores
    const buscarFornecedores = (termo) => {
        if (!termo || termo.length < 2) {
            setSugestoesFornecedores([]);
            setMostrarSugestoes(false);
            return;
        }
        
        const fornecedoresFiltrados = fornecedores.filter(fornecedor => {
            const nomeCompleto = fornecedor.nome_completo || '';
            const apelidoFantasia = fornecedor.apelido_fantasia || '';
            const nome = fornecedor.nome || '';
            const termoLower = termo.toLowerCase();
            
            return nomeCompleto.toLowerCase().includes(termoLower) ||
                   apelidoFantasia.toLowerCase().includes(termoLower) ||
                   nome.toLowerCase().includes(termoLower);
        });
        
        setSugestoesFornecedores(fornecedoresFiltrados.slice(0, 10)); // Limitar a 10 sugestões
        setMostrarSugestoes(true);
    };

    // Função para selecionar fornecedor
    const selecionarFornecedor = (fornecedor) => {
        setFornecedorSelecionado(fornecedor);
        setBuscaFornecedor(fornecedor.nome_completo || fornecedor.apelido_fantasia || fornecedor.nome || 'Fornecedor sem nome');
        setFiltroFornecedor(fornecedor.id);
        setMostrarSugestoes(false);
    };

    // Função para limpar busca
    const limparBuscaFornecedor = () => {
        setBuscaFornecedor('');
        setFornecedorSelecionado(null);
        setFiltroFornecedor('todos');
        setSugestoesFornecedores([]);
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

    const getFornecedorNome = (id) => {
        if (!id) return 'N/A';
        const fornecedor = fornecedores.find(f => f.id === id);
        return fornecedor?.nome_completo || fornecedor?.apelido_fantasia || fornecedor?.nome || 'N/A';
    };

    const totais = useMemo(() => {
        if (!Array.isArray(filteredContas)) return { aPagar: 0, pago: 0 };
        
        const aPagar = filteredContas.filter(c => c.status === 'pendente' || c.status === 'vencido').reduce((acc, c) => acc + parseFloat(c.valor || 0), 0);
        const pago = filteredContas.filter(c => c.status === 'pago').reduce((acc, c) => acc + parseFloat(c.valor || 0), 0);
        return { aPagar, pago };
    }, [filteredContas]);

    const getStatusBadge = (status) => {
        if (status === 'pago') return <span className="flex items-center text-green-600"><CheckCircle size={14} className="mr-1"/> Pago</span>;
        if (status === 'vencido') return <span className="flex items-center text-red-600"><AlertCircle size={14} className="mr-1"/> Vencido</span>;
        return <span className="flex items-center text-yellow-600"><Clock size={14} className="mr-1"/> Pendente</span>;
    };
    
    const handleExportPDF = () => {
        const headers = [['Descrição', 'Fornecedor', 'Vencimento', 'Status', 'Valor (R$)']];
        const data = filteredContas.map(c => [
            c.descricao,
            getFornecedorNome(c.fornecedorId),
            isValid(parseISO(c.dataVencimento)) ? format(parseISO(c.dataVencimento), 'dd/MM/yyyy') : 'N/A',
            c.status,
            formatCurrency(parseFloat(c.valor || 0))
        ]);
        const summary = [
            { label: 'Total a Pagar (Filtrado)', value: formatCurrency(totais.aPagar) },
            { label: 'Total Pago (Filtrado)', value: formatCurrency(totais.pago) }
        ];
        exportToPdf('Relatório de Contas a Pagar', headers, data, summary, logoUrl, empresaSettings.nomeFantasia);
        toast({ title: "PDF Gerado", description: "O relatório de contas a pagar foi exportado." });
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Relatório de Contas a Pagar</CardTitle>
                    <CardDescription>Carregando dados...</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-32">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Carregando contas a pagar...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório de Contas a Pagar</CardTitle>
                <CardDescription>Análise detalhada das suas despesas e pagamentos.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="p-4 border rounded-lg mb-4 space-y-4">
                    <h3 className="font-semibold flex items-center"><Filter size={16} className="mr-2"/>Filtros</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos Status</SelectItem>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="pago">Pago</SelectItem>
                                <SelectItem value="vencido">Vencido</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder="Buscar fornecedor..."
                                value={buscaFornecedor}
                                onChange={(e) => {
                                    setBuscaFornecedor(e.target.value);
                                    buscarFornecedores(e.target.value);
                                }}
                                onFocus={() => {
                                    if (sugestoesFornecedores.length > 0) {
                                        setMostrarSugestoes(true);
                                    }
                                }}
                                className="pr-8"
                            />
                            {buscaFornecedor && (
                                <button
                                    type="button"
                                    onClick={limparBuscaFornecedor}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            )}
                            {mostrarSugestoes && sugestoesFornecedores.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {sugestoesFornecedores.map((fornecedor) => (
                                        <div
                                            key={fornecedor.id}
                                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                            onClick={() => selecionarFornecedor(fornecedor)}
                                        >
                                            <div className="font-medium">
                                                {fornecedor.nome_completo || fornecedor.apelido_fantasia || fornecedor.nome || 'Fornecedor sem nome'}
                                            </div>
                                            {(fornecedor.apelido_fantasia && fornecedor.nome_completo) && (
                                                <div className="text-sm text-gray-500">
                                                    {fornecedor.apelido_fantasia}
                                                </div>
                                            )}
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

                <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{formatCurrency(totais.aPagar)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(totais.pago)}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Layout Mobile - Cards */}
                <div className="md:hidden">
                    <ScrollArea className="h-[400px]">
                        {filteredContas.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <DollarSign size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                <p>Nenhuma conta a pagar encontrada com os filtros aplicados.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredContas.map(conta => (
                                    <motion.div
                                        key={conta.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-sm break-words">{conta.descricao}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {getStatusBadge(conta.status)}
                                                </div>
                                            </div>
                                            <div className="text-right ml-3">
                                                <p className="text-lg font-bold text-red-600">
                                                    {formatCurrency(parseFloat(conta.valor || 0))}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Fornecedor</p>
                                                    <p className="text-sm break-words">{getFornecedorNome(conta.fornecedorId)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Vencimento</p>
                                                    <p className="text-sm">
                                                        {isValid(parseISO(conta.dataVencimento)) ? format(parseISO(conta.dataVencimento), 'dd/MM/yyyy') : 'N/A'}
                                                    </p>
                                                </div>
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
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Fornecedor</TableHead>
                                    <TableHead>Vencimento</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredContas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                            Nenhuma conta a pagar encontrada com os filtros aplicados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredContas.map(conta => (
                                        <TableRow key={conta.id}>
                                            <TableCell className="font-medium">{conta.descricao}</TableCell>
                                            <TableCell>{getFornecedorNome(conta.fornecedorId)}</TableCell>
                                            <TableCell>
                                                {isValid(parseISO(conta.dataVencimento)) ? format(parseISO(conta.dataVencimento), 'dd/MM/yyyy') : 'N/A'}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(conta.status)}</TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {formatCurrency(parseFloat(conta.valor || 0))}
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
                <Button onClick={handleExportPDF} disabled={filteredContas.length === 0}>
                    <Printer size={16} className="mr-2"/> Exportar PDF
                </Button>
            </CardFooter>
        </Card>
    );
};

export default RelatorioContasPagar;