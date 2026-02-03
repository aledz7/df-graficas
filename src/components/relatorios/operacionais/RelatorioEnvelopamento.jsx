import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Printer, CalendarClock, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, parseISO, isValid, isBefore } from 'date-fns';
import { cn } from "@/lib/utils";
import { exportToPdf } from '@/lib/reportGenerator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from '@/components/ui/use-toast';
import { envelopamentoService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';
import { motion } from 'framer-motion';

const RelatorioEnvelopamento = () => {
    const { toast } = useToast();
    const [allItems, setAllItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Carregar configurações da empresa
                const settings = JSON.parse(await apiDataManager.getItem('empresaSettings') || '{}');
                const logo = await apiDataManager.getItem('logoUrl') || '';
                setEmpresaSettings(settings);
                setLogoUrl(logo);

                // Carregar envelopamentos da API
                const response = await envelopamentoService.getAll();
                const envelopamentos = response.data || [];
                
                // Filtrar apenas envelopamentos finalizados
                const envelopamentosFinalizados = envelopamentos.filter(env => 
                    env.status === 'Finalizado' || env.status === 'finalizado'
                );
                
                // Mapear dados para o formato esperado pelo componente
                const envelopamentosFormatados = envelopamentosFinalizados.map(env => ({
                    id: env.id,
                    codigo: env.codigo_orcamento || env.id,
                    nome_orcamento: env.nome_orcamento || 'Envelopamento',
                    cliente: env.cliente ? {
                        id: env.cliente.id || env.cliente_id,
                        nome: env.cliente.nome || env.cliente.nome_completo || 'Cliente não informado'
                    } : null,
                    status: env.status || 'Rascunho',
                    orcamentoTotal: parseFloat(env.orcamento_total || env.valor_total || 0),
                    data_criacao_iso: env.data_criacao || env.created_at,
                    data_validade: env.data_validade,
                    vendedor_nome: env.vendedor_nome || 'N/A',
                    observacoes: env.observacao || env.observacoes || '',
                    itens_count: env.selected_pecas ? env.selected_pecas.length : 0
                }));
                
                setAllItems(envelopamentosFormatados);
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                setError(error.response?.data?.message || 'Erro ao carregar envelopamentos');
                toast({
                    title: "Erro",
                    description: "Não foi possível carregar os dados dos envelopamentos.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [toast]);

    useEffect(() => {
        let items = [...allItems];
        
        // Aplicar filtros de data
        if (dateRange.from) {
            items = items.filter(item => {
                const dataCriacao = item.data_criacao_iso ? parseISO(item.data_criacao_iso) : null;
                return dataCriacao && isValid(dataCriacao) && dataCriacao >= startOfDay(dateRange.from);
            });
        }
        if (dateRange.to) {
            items = items.filter(item => {
                const dataCriacao = item.data_criacao_iso ? parseISO(item.data_criacao_iso) : null;
                return dataCriacao && isValid(dataCriacao) && dataCriacao <= endOfDay(dateRange.to);
            });
        }
        
        setFilteredItems(items);
    }, [dateRange, allItems]);
    
    const getStatusBadge = (status, dataValidade) => {
        const isOrcamento = status === 'Rascunho' || status === 'Rascunho (Editado)';
        const isExpirado = isOrcamento && dataValidade && isBefore(parseISO(dataValidade), new Date());

        if (isExpirado) {
            return <Badge variant="destructive" className="bg-red-700 hover:bg-red-800"><CalendarClock className="mr-1 h-3 w-3" /> Expirado</Badge>;
        }
        
        const statusMap = {
            'Rascunho': 'secondary',
            'Aguardando Aprovação': 'warning',
            'Aprovado': 'default',
            'Recusado': 'destructive',
            'Cancelado': 'destructive',
            'Finalizado': 'default',
        };
        
        return <Badge variant={statusMap[status] || 'default'}>{status}</Badge>;
    };

    const handleExportPdf = () => {
        console.log('🔍 Iniciando exportação PDF...');
        console.log('📊 Dados filtrados:', filteredItems.length);
        
        if (filteredItems.length === 0) {
            toast({
                title: "Aviso",
                description: "Não há dados para exportar no período selecionado.",
                variant: "destructive"
            });
            return;
        }

        try {
            const headers = ["ID", "Data", "Cliente", "Status", "Valor Total (R$)"];
            const data = filteredItems.map(item => [
                item.codigo || item.id.toString().slice(-6),
                item.data_criacao_iso ? format(parseISO(item.data_criacao_iso), 'dd/MM/yyyy HH:mm') : 'N/A',
                item.cliente?.nome || 'N/A',
                item.status,
                parseFloat(item.orcamentoTotal || 0).toFixed(2)
            ]);
            
            console.log('📋 Headers:', headers);
            console.log('📊 Data:', data);
            
            const totalValor = filteredItems.reduce((acc, item) => acc + parseFloat(item.orcamentoTotal || 0), 0);
            const summary = [
                { label: 'Total de Envelopamentos Finalizados', value: filteredItems.length },
                { label: 'Valor Total (Filtrado)', value: `R$ ${totalValor.toFixed(2)}` }
            ];
            
            console.log('📈 Summary:', summary);
            console.log('🏢 Logo URL:', logoUrl);
            console.log('🏢 Nome Empresa:', empresaSettings.nomeFantasia);
            
            // Testar se o jsPDF está funcionando
            console.log('🧪 Testando jsPDF...');
            try {
                const testDoc = new jsPDF();
                testDoc.text('Teste', 10, 10);
                console.log('✅ jsPDF funcionando');
            } catch (jsPDFError) {
                console.error('❌ Erro no jsPDF:', jsPDFError);
            }

            // Testar se a função exportToPdf está funcionando
            console.log('🚀 Chamando exportToPdf...');
            try {
                exportToPdf('Relatório de Envelopamentos Finalizados', headers, data, summary, logoUrl, empresaSettings.nomeFantasia);
                console.log('✅ exportToPdf chamada com sucesso');
            } catch (pdfError) {
                console.error('❌ Erro na chamada exportToPdf:', pdfError);
                console.log('🔄 Tentando método alternativo...');
                
                // Método alternativo simples
                const doc = new jsPDF();
                doc.setFontSize(16);
                doc.text('Relatório de Envelopamentos Finalizados', 20, 20);
                
                doc.setFontSize(12);
                doc.text(`Total de Envelopamentos: ${filteredItems.length}`, 20, 40);
                doc.text(`Valor Total: R$ ${totalValor.toFixed(2)}`, 20, 50);
                
                // Adicionar tabela simples
                doc.autoTable({
                    head: [headers], // Converter array de strings em array de arrays
                    body: data,
                    startY: 70,
                    styles: { fontSize: 10 },
                    headStyles: { fillColor: [59, 130, 246] }
                });
                
                doc.save('relatorio-envelopamentos-finalizados.pdf');
                console.log('✅ PDF gerado com método alternativo');
            }
            
            toast({ 
                title: "PDF Gerado", 
                description: `O relatório de envelopamentos finalizados foi exportado com ${filteredItems.length} registros.` 
            });
        } catch (error) {
            console.error('❌ Erro ao gerar PDF:', error);
            toast({
                title: "Erro",
                description: "Erro ao gerar o PDF. Verifique o console para mais detalhes.",
                variant: "destructive"
            });
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Relatório de Envelopamentos Finalizados</CardTitle>
                    <CardDescription>Carregando dados...</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Relatório de Envelopamentos Finalizados</CardTitle>
                    <CardDescription>Erro ao carregar dados</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-32">
                    <div className="text-center">
                        <p className="text-red-600 mb-2">{error}</p>
                        <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Relatório de Envelopamentos Finalizados</CardTitle>
                        <CardDescription>
                            Visualize todos os envelopamentos com status finalizado. 
                            {allItems.length > 0 && ` Total: ${allItems.length} envelopamentos finalizados`}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Selecione um período</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus numberOfMonths={2} />
                            </PopoverContent>
                        </Popover>
                        <Button 
                            onClick={handleExportPdf} 
                            disabled={filteredItems.length === 0}
                        >
                            <Printer size={16} className="mr-2"/> 
                            Exportar PDF
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[60vh]">
                    {/* Layout Mobile - Cards */}
                    <div className="md:hidden">
                        {filteredItems.length > 0 ? (
                            <div className="space-y-3">
                                {filteredItems.map(item => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-sm">ID: {item.codigo || item.id.toString().slice(-6)}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {getStatusBadge(item.status, item.data_validade)}
                                                </div>
                                            </div>
                                            <div className="text-right ml-3">
                                                <p className="text-lg font-bold text-green-600">
                                                    R$ {parseFloat(item.orcamentoTotal || 0).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Cliente</p>
                                                <p className="text-sm break-words">{item.cliente?.nome || 'N/A'}</p>
                                            </div>
                                            
                                            <div>
                                                <p className="text-xs text-muted-foreground">Data</p>
                                                <p className="text-sm">
                                                    {item.data_criacao_iso ? format(parseISO(item.data_criacao_iso), 'dd/MM/yyyy HH:mm') : 'Data inválida'}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <CalendarClock size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                <p>
                                    {allItems.length === 0 
                                        ? "Nenhum envelopamento finalizado encontrado." 
                                        : "Nenhum envelopamento finalizado encontrado para o período selecionado."
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Layout Desktop - Tabela */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Valor Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.length > 0 ? filteredItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono">
                                            {item.codigo || item.id.toString().slice(-6)}
                                        </TableCell>
                                        <TableCell>{item.cliente?.nome || 'N/A'}</TableCell>
                                        <TableCell>
                                            {item.data_criacao_iso ? format(parseISO(item.data_criacao_iso), 'dd/MM/yyyy HH:mm') : 'Data inválida'}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(item.status, item.data_validade)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            R$ {parseFloat(item.orcamentoTotal || 0).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            {allItems.length === 0 
                                                ? "Nenhum envelopamento finalizado encontrado." 
                                                : "Nenhum envelopamento finalizado encontrado para o período selecionado."
                                            }
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
            </CardContent>
            {filteredItems.length > 0 && (
                <CardFooter className="flex justify-between">
                    <div className="text-sm text-muted-foreground">
                        Mostrando {filteredItems.length} de {allItems.length} envelopamentos finalizados
                    </div>
                    <div className="text-sm font-medium">
                        Total: R$ {filteredItems.reduce((acc, item) => acc + parseFloat(item.orcamentoTotal || 0), 0).toFixed(2)}
                    </div>
                </CardFooter>
            )}
        </Card>
    );
};

export default RelatorioEnvelopamento;