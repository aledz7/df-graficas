import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, FileText, Printer, CalendarClock, Eye } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, parseISO, isValid, isBefore } from 'date-fns';
import { cn, formatCurrency } from "@/lib/utils";
import { exportToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';
import { apiDataManager } from '@/lib/apiDataManager';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { motion } from 'framer-motion';

const RelatorioOS = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [allItems, setAllItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const carregarOrdensServico = async () => {
        try {
            setIsLoading(true);
            
            // Carregar ordens de serviço da API usando o serviço configurado
            const response = await api.get('/api/ordens-servico');
            const osData = response.data;
            const ordensServico = osData.data?.data?.data || osData.data?.data || osData.data || [];
            
            // Anexos serão carregados individualmente se necessário
            let anexos = [];
            
            // Mapear dados para o formato esperado pelo componente
            const ordensFormatadas = ordensServico.map(os => {
                // Debug: verificar estrutura dos dados
                console.log('🔍 Dados da OS:', {
                    id: os.id,
                    id_os: os.id_os,
                    codigo: os.codigo,
                    status: os.status_os,
                    todos_campos: Object.keys(os)
                });
                
                // Buscar anexos relacionados a esta OS
                const anexosOS = anexos.filter(anexo => anexo.ordem_servico_id === os.id);
                
                // Determinar o código correto da OS
                const codigoOS = os.id_os || os.codigo || `OS-${os.id}`;
                
                return {
                    id_os: codigoOS, // Usar o código da OS para compatibilidade com backend
                    codigo: codigoOS, // Manter o código para exibição
                    cliente_info: {
                        nome: os.cliente?.nome_completo || os.cliente?.apelido_fantasia || os.cliente?.nome || os.cliente_nome_manual || 'N/A',
                        cpf_cnpj: os.cliente?.cpf_cnpj,
                        telefone: os.cliente?.telefone,
                        email: os.cliente?.email
                    },
                    cliente_nome_manual: os.cliente?.nome_completo || os.cliente?.apelido_fantasia || os.cliente?.nome || os.cliente_nome_manual || 'N/A',
                    data_criacao_iso: os.created_at || os.data_criacao,
                    data_finalizacao: os.data_finalizacao,
                    data_entrega: os.data_entrega,
                    data_validade: os.data_validade,
                    status_os: os.status || os.status_os || 'Em Aberto',
                    valor_total_os: parseFloat(os.valor_total_os || os.valor_total || os.total || 0),
                    subtotal: parseFloat(os.subtotal || 0),
                    desconto: parseFloat(os.desconto || 0),
                    acrescimo: parseFloat(os.acrescimo || 0),
                    observacoes: os.observacoes || '',
                    vendedor_nome: os.vendedor?.nome_completo || os.vendedor?.nome || os.usuario?.name || 'N/A',
                    itens: os.itens || [],
                    anexos: anexosOS,
                    tipo_documento: os.tipo_documento || 'OS',
                    prioridade: os.prioridade || 'normal',
                    prazo_entrega: os.prazo_entrega,
                    cliente_id: os.cliente_id,
                    usuario_id: os.usuario_id,
                    vendedor_id: os.vendedor_id,
                    metadados: os.metadados || {},
                };
            });
            
            // Ordenar por data de criação (mais recente primeiro)
            const ordensOrdenadas = ordensFormatadas
                .filter(os => os.data_criacao_iso && isValid(parseISO(os.data_criacao_iso)))
                .sort((a, b) => new Date(b.data_criacao_iso) - new Date(a.data_criacao_iso));
                
            setAllItems(ordensOrdenadas);
            
        } catch (error) {
            console.error('Erro ao carregar ordens de serviço:', error);
            
            // Verificar se é erro de autenticação
            if (error.response?.status === 401) {
                toast({
                    title: "Erro de Autenticação",
                    description: "Sua sessão expirou. Faça login novamente.",
                    variant: "destructive"
                });
            } else {
                toast({
                    title: "Erro ao carregar dados",
                    description: "Não foi possível carregar as ordens de serviço da API. Verifique o console para mais detalhes.",
                    variant: "destructive"
                });
            }
            setAllItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const settings = JSON.parse(await apiDataManager.getItem('empresaSettings') || '{}');
                const logo = await apiDataManager.getItem('logoUrl') || '';
                setEmpresaSettings(settings);
                setLogoUrl(logo);
            } catch(error) {
                console.error('Erro ao carregar configurações:', error);
            }
        };
        
        loadData();
        carregarOrdensServico();
    }, [toast]);
    
    useEffect(() => {
        let items = [...allItems];
        if (dateRange.from) {
            items = items.filter(item => 
                item.data_criacao_iso && 
                isValid(parseISO(item.data_criacao_iso)) && 
                parseISO(item.data_criacao_iso) >= startOfDay(dateRange.from)
            );
        }
        if (dateRange.to) {
            items = items.filter(item => 
                item.data_criacao_iso && 
                isValid(parseISO(item.data_criacao_iso)) && 
                parseISO(item.data_criacao_iso) <= endOfDay(dateRange.to)
            );
        }
        setFilteredItems(items);
    }, [dateRange, allItems]);

    const getStatusBadge = (status, dataValidade) => {
        const isOrcamento = status === 'Orçamento Salvo' || status === 'Orçamento Salvo (Editado)' || status === 'orcamento';
        let isExpirado = false;
        if (isOrcamento && dataValidade) {
            const dataValidadeISO = parseISO(dataValidade);
            if (isValid(dataValidadeISO)) {
                isExpirado = isBefore(dataValidadeISO, startOfDay(new Date()));
            }
        }

        if (isExpirado) {
            return <Badge variant="destructive" className="bg-red-700 hover:bg-red-800">
                <CalendarClock className="mr-1 h-3 w-3" /> Expirado
            </Badge>;
        }
        
        const statusMap = {
            'rascunho': 'secondary',
            'finalizada': 'default',
            'entregue': 'outline',
            'aguardando_pagamento': 'destructive',
            'orcamento': 'default',
            'orcamento_editado': 'warning',
            'em_aberto': 'secondary',
            'em_producao': 'default',
            'cancelada': 'destructive',
            'pendente': 'secondary',
            'aprovada': 'default',
            'rejeitada': 'destructive',
            'pronta_entrega': 'default',
        };
        
        const statusKey = status?.toLowerCase().replace(/\s+/g, '_') || 'em_aberto';
        return <Badge variant={statusMap[statusKey] || 'default'}>{status}</Badge>;
    };

    const handleViewOS = (os) => {
        // Usar o código da OS para compatibilidade com o backend
        const osId = os.codigo || os.id_os;
        navigate(`/os/recibo/${osId}`);
    };

    const handleExportPdf = () => {
        if (filteredItems.length === 0) {
            toast({ 
                title: "Nenhum dado para exportar", 
                description: "Filtre os dados antes de exportar.", 
                variant: "default" 
            });
            return;
        }
        
        const headers = ["ID", "Data", "Cliente", "Status", "Valor Total (R$)", "Vendedor"];
        const data = filteredItems.map(os => [
            os.id || 'N/A',
            os.data_criacao_iso && isValid(parseISO(os.data_criacao_iso)) ? 
                format(parseISO(os.data_criacao_iso), 'dd/MM/yyyy HH:mm') : 'N/A',
            os.cliente?.nome_completo || os.cliente?.nome || os.cliente?.apelido_fantasia || os.cliente_info?.nome || os.cliente_nome_manual || 'N/A',
            os.status_os || 'N/A',
            formatCurrency(os.valor_total_os || 0),
            os.vendedor_nome || 'N/A'
        ]);
        
        const totalValor = filteredItems.reduce((acc, os) => acc + (os.valor_total_os || 0), 0);
        const osFinalizadas = filteredItems.filter(os => 
            os.status_os?.toLowerCase().includes('finalizada') || 
            os.status_os?.toLowerCase().includes('entregue')
        ).length;
        const osPendentes = filteredItems.filter(os => 
            os.status_os?.toLowerCase().includes('pendente') || 
            os.status_os?.toLowerCase().includes('em_aberto') ||
            os.status_os?.toLowerCase().includes('em_producao')
        ).length;
        
        const summary = [
            { label: 'Total de OS/Orçamentos', value: filteredItems.length },
            { label: 'OS Finalizadas/Entregues', value: osFinalizadas },
            { label: 'OS Pendentes/Em Produção', value: osPendentes },
            { label: 'Valor Total (Filtrado)', value: formatCurrency(totalValor) }
        ];
        
        exportToPdf('Relatório de Ordens de Serviço', headers, data, summary, logoUrl, empresaSettings.nomeFantasia);
        toast({ title: "PDF Gerado", description: "O relatório de OS foi exportado." });
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Relatório de Ordens de Serviço</CardTitle>
                    <CardDescription>Carregando dados...</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-32">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Carregando ordens de serviço...</p>
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
                        <CardTitle>Relatório de Ordens de Serviço</CardTitle>
                        <CardDescription>Visualize todas as OS e Orçamentos registrados no sistema.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.from ? (
                                        dateRange.to ? 
                                            `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : 
                                            format(dateRange.from, "LLL dd, y")
                                    ) : (
                                        <span>Selecione um período</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar 
                                    mode="range" 
                                    selected={dateRange} 
                                    onSelect={setDateRange} 
                                    initialFocus 
                                    numberOfMonths={2} 
                                />
                            </PopoverContent>
                        </Popover>
                        <Button onClick={handleExportPdf} disabled={filteredItems.length === 0}>
                            <Printer size={16} className="mr-2"/> Exportar PDF
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
                                {filteredItems.map(os => (
                                    <motion.div
                                        key={os.id_os}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-sm">ID: {os.id || 'N/A'}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {getStatusBadge(os.status_os, os.data_validade)}
                                                </div>
                                            </div>
                                            <div className="text-right ml-3">
                                                <p className="text-lg font-bold text-green-600">
                                                    {formatCurrency(os.valor_total_os || 0)}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Cliente</p>
                                                <p className="text-sm break-words">
                                                    {os.cliente?.nome_completo || os.cliente?.nome || os.cliente?.apelido_fantasia || os.cliente_info?.nome || os.cliente_nome_manual || 'N/A'}
                                                </p>
                                            </div>
                                            
                                            <div>
                                                <p className="text-xs text-muted-foreground">Data</p>
                                                <p className="text-sm">
                                                    {os.data_criacao_iso && isValid(parseISO(os.data_criacao_iso)) ? 
                                                        format(parseISO(os.data_criacao_iso), 'dd/MM/yyyy HH:mm') : 
                                                        'Data inválida'
                                                    }
                                                </p>
                                            </div>
                                            
                                            <div className="flex gap-2 pt-2 border-t">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => handleViewOS(os)}
                                                    className="flex-1"
                                                >
                                                    <Eye size={14} className="mr-1"/>
                                                    Visualizar OS
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                <p>
                                    {allItems.length === 0 ? 
                                        'Nenhuma ordem de serviço encontrada.' : 
                                        'Nenhuma OS encontrada para o período selecionado.'
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
                                    <TableHead>OS/Orç. ID</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Valor Total</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.length > 0 ? (
                                    filteredItems.map(os => (
                                        <TableRow key={os.id_os}>
                                            <TableCell className="font-mono">
                                                {os.id || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {os.cliente?.nome_completo || os.cliente?.nome || os.cliente?.apelido_fantasia || os.cliente_info?.nome || os.cliente_nome_manual || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {os.data_criacao_iso && isValid(parseISO(os.data_criacao_iso)) ? 
                                                    format(parseISO(os.data_criacao_iso), 'dd/MM/yyyy HH:mm') : 
                                                    'Data inválida'
                                                }
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(os.status_os, os.data_validade)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(os.valor_total_os || 0)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleViewOS(os)}
                                                    title="Visualizar OS"
                                                >
                                                    <Eye className="h-4 w-4 text-blue-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">
                                            {allItems.length === 0 ? 
                                                'Nenhuma ordem de serviço encontrada.' : 
                                                'Nenhuma OS encontrada para o período selecionado.'
                                            }
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default RelatorioOS;