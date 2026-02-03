import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { format, parseISO, isToday, startOfDay, endOfDay, isValid } from 'date-fns';
import { FileText, User, Package, DollarSign, Filter, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { loadData } from "@/lib/utils";
import api from '@/services/api';

const OSFeed = ({ showValues = true, title = "Feed de OS", defaultDateToday = true, onlyToday = true }) => {
    const [feedItems, setFeedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalValor, setTotalValor] = useState(0);
    const [dateRange, setDateRange] = useState({ 
        from: (defaultDateToday || onlyToday) ? startOfDay(new Date()) : undefined, 
        to: (defaultDateToday || onlyToday) ? endOfDay(new Date()) : undefined
    });
    
    const dependencies = useMemo(() => ({
        dateRangeFrom: dateRange.from?.getTime(),
        dateRangeTo: dateRange.to?.getTime(),
        defaultDateToday,
        onlyToday
    }), [dateRange.from, dateRange.to, defaultDateToday, onlyToday]);

    useEffect(() => {
        const loadFeedData = async () => {
            setIsLoading(true);
            try {
                // Carregar OS da API primeiro, depois fallback para localStorage
                let osSalvas = [];
                try {
                    // Tentar carregar todas as OSs primeiro
                    const response = await api.get('/api/ordens-servico');
                    osSalvas = response.data?.data?.data || response.data?.data || response.data || [];
                    
                    // Se estamos filtrando por data de hoje e não encontramos OSs entregues,
                    // tentar carregar especificamente OSs entregues
                    if (onlyToday && isToday(new Date())) {
                        try {
                            const entreguesResponse = await api.get('/api/ordens-servico/entregues');
                            const osEntregues = entreguesResponse.data?.data?.data || entreguesResponse.data?.data || entreguesResponse.data || [];
                            
                            // Adicionar OSs entregues que não estão na lista principal
                            const idsExistentes = new Set(osSalvas.map(os => os.id));
                            const novasOSEntregues = osEntregues.filter(os => !idsExistentes.has(os.id));
                            osSalvas = [...osSalvas, ...novasOSEntregues];
                            
                            console.log('🔍 OSs Entregues carregadas:', {
                                totalEntregues: osEntregues.length,
                                novasAdicionadas: novasOSEntregues.length,
                                totalFinal: osSalvas.length
                            });
                        } catch (entreguesError) {
                            console.warn('⚠️ Erro ao carregar OSs entregues:', entreguesError);
                        }
                    }
                } catch (apiError) {
                    console.warn('⚠️ Erro ao carregar OS da API para feed, usando localStorage:', apiError);
                    osSalvas = await loadData('ordens_servico_salvas', []);
                }
            
                let allOS = [];

                // Processar ordens de serviço
                allOS.push(...osSalvas.map(os => {
                    // Determinar o status da OS
                    const status = os.status_os === 'Finalizada' 
                        ? (os.dados_producao?.status_producao || 'Produção Finalizada')
                        : (os.status_os || 'Status Desconhecido');
                    
                    // Determinar o timestamp baseado no status
                    let timestamp;
                    if (status === 'Entregue' && os.dados_producao?.data_entrega) {
                        // Se a OS foi entregue, usar a data de entrega como timestamp
                        timestamp = parseISO(os.dados_producao.data_entrega);
                        console.log('🔍 OS Entregue encontrada:', {
                            id: os.id,
                            status: status,
                            data_entrega: os.dados_producao.data_entrega,
                            timestamp: timestamp,
                            data_criacao: os.data_criacao
                        });
                    } else if (os.status_os === 'Finalizada' && os.data_finalizacao_os) {
                        // Se a OS foi finalizada, usar a data de finalização como timestamp
                        timestamp = parseISO(os.data_finalizacao_os);
                        console.log('🔍 OS Finalizada encontrada:', {
                            id: os.id,
                            status: status,
                            data_finalizacao_os: os.data_finalizacao_os,
                            timestamp: timestamp,
                            data_criacao: os.data_criacao
                        });
                    } else {
                        // Caso contrário, usar data de criação
                        timestamp = parseISO(os.data_criacao || new Date().toISOString());
                    }
                    
                    return {
                        id: `os-${os.id || 'unknown'}`, 
                        type: 'OS', 
                        icon: FileText, 
                        title: `OS #${os.id || 'N/A'}`, 
                        client: os.cliente?.nome_completo || os.cliente?.nome || os.cliente?.apelido_fantasia || os.cliente_info?.nome || os.cliente_nome_manual || 'Cliente não informado', 
                        value: parseFloat(os.valor_total_os || 0), 
                        status: status,
                        timestamp: timestamp,
                        data_validade: os.data_validade,
                        prazo_estimado: os.dados_producao?.prazo_estimado,
                        details: { 
                            itens: os.itens, 
                            pagamentos: os.pagamentos, 
                            observacoes: os.observacoes_gerais_os,
                            prazo: os.dados_producao?.prazo_estimado,
                            data_entrega: os.dados_producao?.data_entrega
                        } 
                    };
                }));

                // Filtrar por data se especificado
                const filteredOS = allOS.filter(item => {
                    if (!item.timestamp || !isValid(item.timestamp)) return false;
                    
                    let shouldInclude = false;
                    
                    if (dateRange.from && dateRange.to) {
                        shouldInclude = item.timestamp >= dateRange.from && item.timestamp <= dateRange.to;
                    } else if (dateRange.from) {
                        shouldInclude = item.timestamp >= dateRange.from;
                    } else if (dateRange.to) {
                        shouldInclude = item.timestamp <= dateRange.to;
                    } else {
                        shouldInclude = true;
                    }
                    
                    // Log para debug de OSs entregues
                    if (item.status === 'Entregue') {
                        console.log('🔍 Filtro de data para OS Entregue:', {
                            id: item.id,
                            status: item.status,
                            timestamp: item.timestamp,
                            dateRangeFrom: dateRange.from,
                            dateRangeTo: dateRange.to,
                            shouldInclude: shouldInclude,
                            isToday: isToday(item.timestamp)
                        });
                    }
                    
                    return shouldInclude;
                });

                // Ordenar por timestamp (mais recente primeiro)
                const sortedOS = filteredOS.sort((a, b) => b.timestamp - a.timestamp);
                
                const total = sortedOS.reduce((acc, item) => acc + (item.value || 0), 0);
                
                console.log('📊 OSFeed Debug:', {
                    totalOSCarregadas: osSalvas.length,
                    totalOSProcessadas: allOS.length,
                    totalOSFiltradas: filteredOS.length,
                    totalOSOrdenadas: sortedOS.length,
                    dateRange: dateRange,
                    osEntregues: allOS.filter(os => os.status === 'Entregue').length
                });
                
                setTotalValor(total);
                setFeedItems(sortedOS);
                
            } catch (error) {
                console.error('Erro ao carregar dados do feed de OS:', error);
                setFeedItems([]);
                setTotalValor(0);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadFeedData();
    }, [dependencies]);

    const getStatusVariant = (status) => {
        const statusVariants = { 
            'Finalizada': 'success', 
            'Produção Finalizada': 'success',
            'Entregue': 'success',
            'Em Produção': 'warning',
            'Aguardando Produção': 'outline',
            'Aguardando Aprovação Cliente': 'secondary',
            'Orçamento Salvo': 'default',
            'Status Desconhecido': 'secondary'
        };
        return statusVariants[status] || 'secondary';
    };

    const getStatusClasses = (status) => {
        switch (status) {
            case 'Em Produção':
                return 'bg-yellow-500 hover:bg-yellow-600 text-white';
            case 'Pronto para Entrega':
            case 'Aguardando Entrega':
                return 'bg-blue-500 hover:bg-blue-600 text-white';
            case 'Finalizada':
            case 'Produção Finalizada':
            case 'Entregue':
                return 'bg-green-500 hover:bg-green-600 text-white';
            case 'Aguardando Produção':
                return 'border-orange-500 text-orange-600';
            default:
                return '';
        }
    };

    const handleExportPdf = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        
        doc.setFontSize(12);
        doc.text(`Total: R$ ${totalValor.toFixed(2)}`, 14, 35);
        doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 45);
        
        if (feedItems.length > 0) {
            const tableData = feedItems.map(item => [
                item.title,
                item.client,
                `R$ ${item.value.toFixed(2)}`,
                item.status,
                format(item.timestamp, 'dd/MM/yy HH:mm')
            ]);
            
            doc.autoTable({
                startY: 60,
                head: [['OS', 'Cliente', 'Valor', 'Status', 'Data']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [66, 139, 202] }
            });
        }
        
        doc.save(`feed-os-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    };

    if (isLoading) return <Card className="h-full flex items-center justify-center"><p>Carregando OS...</p></Card>;

    return (
        <Card className="h-full flex flex-col shadow-lg border-border dark:bg-slate-850">
             <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{title}</CardTitle>
                      {showValues && <CardDescription className="text-base font-semibold text-primary">R$ {totalValor.toFixed(2)}</CardDescription>}
                      {!showValues && feedItems.length > 0 && <CardDescription className="text-xs text-muted-foreground">{feedItems.length} OS encontrada(s).</CardDescription>}
                    </div>
                    {feedItems.length > 0 && <Button onClick={handleExportPdf} variant="outline" size="sm"><FileDown className="mr-2 h-3 w-3"/>Exportar</Button>}
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-3">
                        {feedItems.length > 0 ? feedItems.map((item, index) => (
                            <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: index * 0.03 }} >
                                <Card className="mb-4 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 dark:border-slate-700">
                                    <CardHeader className="flex flex-row items-center justify-between p-3 bg-muted/30 dark:bg-slate-800/50">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-primary/10 text-primary rounded-md">
                                                <item.icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm font-semibold">{item.title}</CardTitle>
                                                <CardDescription className="text-xs">{isValid(item.timestamp) ? format(item.timestamp, 'HH:mm:ss dd/MM/yy') : 'Data inválida'}</CardDescription>
                                            </div>
                                        </div>
                                        <Badge variant={getStatusVariant(item.status)} className={`text-xs ${getStatusClasses(item.status)}`}>{item.status}</Badge>
                                    </CardHeader>
                                    <CardContent className="p-3 text-xs space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium flex items-center gap-1"><User size={12}/> Cliente:</span>
                                            <span>{item.client}</span>
                                        </div>
                                        {item.details?.prazo && (
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium flex items-center gap-1"><Clock size={12}/> Prazo:</span>
                                                <span>{format(parseISO(item.details.prazo), 'dd/MM/yyyy')}</span>
                                            </div>
                                        )}
                                        {item.status === 'Entregue' && item.details?.data_entrega && (
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium flex items-center gap-1"><Package size={12}/> Entregue em:</span>
                                                <span className="text-green-600 font-semibold">{format(parseISO(item.details.data_entrega), 'dd/MM/yyyy HH:mm')}</span>
                                            </div>
                                        )}
                                        {item.details?.itens && item.details.itens.length > 0 && (
                                            <div className="pt-1">
                                                <h4 className="font-medium mb-0.5 flex items-center gap-1"><Package size={12}/> Itens</h4>
                                                <ul className="text-muted-foreground space-y-0.5">
                                                    {item.details.itens?.map((p, i) => (
                                                        <li key={i} className="flex justify-between">
                                                            <span>- {p.nome || p.nome_servico_produto || 'Item desconhecido'} x{p.quantidade || 1}</span>
                                                            {showValues && <span>R$ {parseFloat(p.preco_unitario || p.preco_venda_unitario || (p.subtotal || 0) / (p.quantidade || 1) || 0).toFixed(2)}</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {showValues && item.details?.pagamentos && item.details.pagamentos.length > 0 && (
                                            <div className="pt-1">
                                                <h4 className="font-medium mb-0.5 flex items-center gap-1"><DollarSign size={12}/> Pagamentos</h4>
                                                <ul className="text-muted-foreground space-y-0.5">
                                                    {item.details.pagamentos.map((pag, i) => (
                                                        <li key={i} className="flex justify-between">
                                                            <span>{pag.metodo || pag.forma_pagamento || 'Método não informado'}</span>
                                                            <span>R$ {parseFloat(pag.valor || 0).toFixed(2)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {item.details?.observacoes && (
                                            <div className="pt-1">
                                                <h4 className="font-medium mb-0.5 flex items-center gap-1"><FileText size={12}/> Observações</h4>
                                                <p className="text-muted-foreground bg-muted/20 dark:bg-slate-700/30 p-1.5 rounded-sm">{item.details.observacoes}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <Filter size={32} className="mx-auto mb-2 opacity-50" />
                                <p>Nenhuma OS encontrada para o período selecionado.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default OSFeed;
