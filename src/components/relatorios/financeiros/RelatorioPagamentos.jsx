import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Printer, Loader2, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, safeJsonParse, formatCurrency } from "@/lib/utils";
import { exportToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';
import { apiDataManager } from '@/lib/apiDataManager';
import { vendaService } from '@/services/api';
import { motion } from 'framer-motion';

const RelatorioPagamentos = () => {
    const { toast } = useToast();
    // Inicializar com a data atual (início e fim = hoje)
    const hoje = new Date();
    const [dateRange, setDateRange] = useState({ from: hoje, to: hoje });
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');
    const [recebimentos, setRecebimentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                
                // Carregar apenas configurações do localStorage (logo e empresa)
                const settings = safeJsonParse(await apiDataManager.getItem('empresaSettings'), {});
                const logo = await apiDataManager.getItem('logoUrl') || '';
                
                setEmpresaSettings(settings);
                setLogoUrl(logo);
                
                // Buscar recebimentos da API (igual ao Recebimento Geral)
                const response = await vendaService.getRelatorioGeralRecebimentos({
                    data_inicio: null,
                    data_fim: null
                });
                
                if (response.success || response.data?.success) {
                    const data = response.data?.data || response.data || {};
                    const recebimentosDaAPI = data.recebimentos || [];
                    
                    console.log('📊 Recebimentos carregados da API:', {
                        total: recebimentosDaAPI.length,
                        amostra: recebimentosDaAPI.slice(0, 3)
                    });
                    
                    setRecebimentos(recebimentosDaAPI);
                } else {
                    console.warn('Resposta da API sem sucesso:', response);
                    setRecebimentos([]);
                }
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                toast({
                    title: "Erro",
                    description: "Erro ao carregar dados do relatório",
                    variant: "destructive"
                });
                setRecebimentos([]);
            } finally {
                setIsLoading(false);
                setUltimaAtualizacao(new Date());
            }
        };
        
        loadData();
        
        // Configurar atualização automática a cada 2 minutos
        const interval = setInterval(() => {
            console.log('🔄 Atualização automática dos dados...');
            loadData();
        }, 120000);
        
        // Limpar o intervalo quando o componente for desmontado
        return () => clearInterval(interval);
    }, [toast]);

    const handleRefresh = async () => {
        try {
            setIsLoading(true);
            
            console.log('🔄 Recarregando dados do relatório...');
            
            // Carregar apenas configurações do localStorage (logo e empresa)
            const settings = safeJsonParse(await apiDataManager.getItem('empresaSettings'), {});
            const logo = await apiDataManager.getItem('logoUrl') || '';
            
            setEmpresaSettings(settings);
            setLogoUrl(logo);
            
            // Buscar recebimentos da API (igual ao Recebimento Geral)
            const response = await vendaService.getRelatorioGeralRecebimentos({
                data_inicio: null,
                data_fim: null
            });
            
            if (response.success || response.data?.success) {
                const data = response.data?.data || response.data || {};
                const recebimentosDaAPI = data.recebimentos || [];
                
                console.log('📊 Recebimentos recarregados da API:', {
                    total: recebimentosDaAPI.length
                });
                
                setRecebimentos(recebimentosDaAPI);
            } else {
                console.warn('Resposta da API sem sucesso:', response);
                setRecebimentos([]);
            }
            
            toast({
                title: "Dados Atualizados",
                description: "Os dados do relatório foram recarregados com sucesso.",
                duration: 2000
            });
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            toast({
                title: "Erro",
                description: "Erro ao carregar dados do relatório",
                variant: "destructive"
            });
            setRecebimentos([]);
        } finally {
            setIsLoading(false);
            setUltimaAtualizacao(new Date());
        }
    };

    const pagamentosData = useMemo(() => {
        console.log('🔄 Processando pagamentos da API:', {
            totalRecebimentos: recebimentos.length,
            dateRange
        });
        
        // Filtrar recebimentos por data
        const recebimentosFiltrados = recebimentos.filter(recebimento => {
            const dataRecebimento = parseISO(recebimento.data);
            if (!isValid(dataRecebimento)) return false;
            
            let inRange = true;
            if (dateRange.from) inRange = inRange && dataRecebimento >= startOfDay(dateRange.from);
            if (dateRange.to) inRange = inRange && dataRecebimento <= endOfDay(dateRange.to);
            
            return inRange;
        });

        console.log('📊 Recebimentos filtrados:', recebimentosFiltrados.length);

        // Agrupar por forma de pagamento
        const pagamentosAgregados = {};

        recebimentosFiltrados.forEach((recebimento, index) => {
            const formaPagamento = recebimento.formaPagamento || 'Não informado';
            const valor = parseFloat(recebimento.valor) || 0;
            
            console.log(`  💰 Recebimento ${index + 1}:`, {
                cliente: recebimento.cliente,
                formaPagamento,
                valor,
                origem: recebimento.origem,
                data: recebimento.data
            });
            
            if (valor > 0) {
                if (!pagamentosAgregados[formaPagamento]) {
                    pagamentosAgregados[formaPagamento] = 0;
                }
                pagamentosAgregados[formaPagamento] += valor;
            }
        });
        
        const resultado = Object.entries(pagamentosAgregados)
            .map(([metodo, total]) => ({ metodo, total }))
            .sort((a, b) => b.total - a.total);
            
        console.log('💰 Pagamentos agregados por forma:', resultado);
        
        return resultado;

    }, [dateRange, recebimentos]);

    const totalGeral = useMemo(() => pagamentosData.reduce((acc, item) => acc + item.total, 0), [pagamentosData]);

    const handleExportPdf = () => {
        const headers = [["Forma de Pagamento", "Valor Total Recebido (R$)"]];
        const data = pagamentosData.map(item => [
            item.metodo,
            formatCurrency(item.total)
        ]);
        const summary = [
            { label: 'Total Geral Recebido (Filtrado)', value: formatCurrency(totalGeral) }
        ];
        exportToPdf('Relatório de Pagamentos Recebidos', headers, data, summary, logoUrl, empresaSettings.nomeFantasia);
        toast({ title: "PDF Gerado", description: "O relatório de pagamentos recebidos foi exportado." });
    };

    return (
        <Card>
            <CardHeader>
                 <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Relatório de Pagamentos Recebidos</CardTitle>
                        <CardDescription>
                            Total recebido por forma de pagamento no período.
                            {ultimaAtualizacao && (
                                <span className="text-xs text-muted-foreground block mt-1">
                                    Última atualização: {format(ultimaAtualizacao, 'dd/MM/yyyy HH:mm:ss')}
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.from ? (dateRange.to ? `${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}` : format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })) : <span>Selecione um período</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus locale={ptBR} />
                            </PopoverContent>
                        </Popover>
                        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                            <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`}/>
                            Atualizar
                        </Button>
                        <Button onClick={handleExportPdf}><Printer size={16} className="mr-2"/> Exportar PDF</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-8 w-8 animate-spin mr-2" />
                        <span>Carregando dados...</span>
                    </div>
                ) : (
                    <>
                        {/* Layout Mobile - Cards */}
                        <div className="md:hidden">
                            {pagamentosData.length > 0 ? (
                                <div className="space-y-3">
                                    {pagamentosData.map(item => (
                                        <motion.div
                                            key={item.metodo}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-sm break-words">{item.metodo}</h3>
                                                </div>
                                                <div className="text-right ml-3">
                                                    <p className="text-lg font-bold text-green-600">
                                                        {formatCurrency(item.total)}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Printer size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                    <p>Nenhum pagamento encontrado para o período selecionado.</p>
                                </div>
                            )}
                        </div>

                        {/* Layout Desktop - Tabela */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Forma de Pagamento</TableHead>
                                        <TableHead className="text-right">Valor Total Recebido</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pagamentosData.length > 0 ? pagamentosData.map(item => (
                                        <TableRow key={item.metodo}>
                                            <TableCell className="font-medium">{item.metodo}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center h-24">Nenhum pagamento encontrado para o período selecionado.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </CardContent>
             <CardFooter className="font-bold text-lg">
                <div className="flex justify-end w-full">
                    <span>Total Geral: {formatCurrency(totalGeral)}</span>
                </div>
            </CardFooter>
        </Card>
    );
};

export default RelatorioPagamentos;