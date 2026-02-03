import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { format, parseISO, isToday, startOfDay, endOfDay, isValid } from 'date-fns';
import { SprayCan, DollarSign, User, Package, Filter, Palette } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { loadData } from "@/lib/utils";
import api from '@/services/api';

const EnvelopamentoFeed = ({ showValues = true, title = "Feed de Envelopamentos", defaultDateToday = true, onlyToday = false }) => {
    const [feedItems, setFeedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalValor, setTotalValor] = useState(0);
    const [dateRange, setDateRange] = useState({ 
        from: defaultDateToday ? startOfDay(new Date()) : undefined, 
        to: onlyToday ? endOfDay(new Date()) : endOfDay(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // Próximos 7 dias
    });
    
    // Debug: Log do dateRange atual
    console.log('🗓️ DateRange configurado:', {
        from: dateRange.from,
        to: dateRange.to,
        fromFormatted: dateRange.from ? format(dateRange.from, 'dd/MM/yyyy HH:mm:ss') : 'não definido',
        toFormatted: dateRange.to ? format(dateRange.to, 'dd/MM/yyyy HH:mm:ss') : 'não definido',
        defaultDateToday,
        onlyToday
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
                // Carregar envelopamentos da API primeiro, depois fallback para localStorage
                let envelopamentos = [];
                try {
                    const response = await api.get('/api/envelopamentos');
                    console.log('🔍 Resposta da API envelopamentos:', response.data);
                    
                    // Tentar diferentes estruturas de resposta
                    if (response.data?.data?.data) {
                        envelopamentos = response.data.data.data;
                    } else if (response.data?.data) {
                        envelopamentos = response.data.data;
                    } else if (Array.isArray(response.data)) {
                        envelopamentos = response.data;
                    } else if (response.data?.success && response.data?.data) {
                        envelopamentos = response.data.data;
                    } else {
                        envelopamentos = [];
                    }
                    
                    console.log('📊 Envelopamentos extraídos da API:', envelopamentos);
                } catch (apiError) {
                    console.warn('⚠️ Erro ao carregar envelopamentos da API para feed, usando localStorage:', apiError);
                    envelopamentos = await loadData('envelopamentosOrcamentos', []);
                    console.log('💾 Envelopamentos do localStorage:', envelopamentos);
                }
            
                let allEnvelopamentos = [];

                // Processar envelopamentos
                if (Array.isArray(envelopamentos) && envelopamentos.length > 0) {
                    allEnvelopamentos.push(...envelopamentos.map((env, index) => {
                        const dateStr = env.data_criacao || env.data || env.created_at || env.updated_at;
                        const ts = dateStr ? new Date(dateStr) : new Date();
                        const isVenda = (env.status === 'Finalizado' || env.status === 'Finalizada');
                        
                        console.log(`🔍 Processando envelopamento ${index + 1}:`, {
                            id: env.id,
                            codigo: env.codigo_orcamento,
                            status: env.status,
                            data_criacao: env.data_criacao,
                            data_validade: env.data_validade,
                            timestamp_processado: ts,
                            cliente: env.cliente?.nome
                        });
                        
                        return { 
                            id: `env-${env.id || 'unknown'}`, 
                            type: 'Envelopamento', 
                            icon: isVenda ? DollarSign : SprayCan, 
                            title: `${isVenda ? 'Venda Env.' : 'Orçamento Env.'} #${env.id ? String(env.id) : 'N/A'}`, 
                            client: env.cliente?.nome || 'Cliente não informado', 
                            value: parseFloat(env.orcamentoTotal || env.orcamento_total || 0), 
                            status: env.status || 'Status Desconhecido', 
                            timestamp: ts, 
                            data_validade: env.data_validade,
                            originalData: env, // Manter dados originais para debug
                            details: { 
                                itens: (env.selectedPecas || env.selected_pecas || []).map(p => ({
                                    ...p.parte, 
                                    nome: p.parte?.nome || p.nome, 
                                    quantidade: p.quantidade, 
                                    preco_unitario: (p.subtotal || 0) / (p.quantidade || 1)
                                })), 
                                pagamentos: env.pagamentos, 
                                observacoes: env.observacao 
                            } 
                        };
                    }));
                } else {
                    console.log('⚠️ Nenhum envelopamento encontrado ou array vazio');
                }

                console.log('🔄 Envelopamentos processados:', allEnvelopamentos);

                console.log('📅 Período de filtro:', {
                    from: dateRange.from,
                    to: dateRange.to,
                    fromFormatted: dateRange.from ? format(dateRange.from, 'dd/MM/yyyy HH:mm:ss') : 'não definido',
                    toFormatted: dateRange.to ? format(dateRange.to, 'dd/MM/yyyy HH:mm:ss') : 'não definido',
                    onlyToday
                });

                // Filtrar envelopamentos por data (apenas criados no dia atual quando onlyToday é true)
                const filteredEnvelopamentos = allEnvelopamentos.filter((item, index) => {
                    if (!item.timestamp || !isValid(item.timestamp)) {
                        console.log(`❌ Item ${index + 1} (ID: ${item.originalData?.id}) - timestamp inválido:`, item.timestamp);
                        return false;
                    }
                    
                    const dataCriacao = item.timestamp;
                    
                    console.log(`🔍 Filtrando item ${index + 1} (ID: ${item.originalData?.id}):`, {
                        dataCriacao: format(dataCriacao, 'dd/MM/yyyy HH:mm:ss'),
                        status: item.status,
                        onlyToday
                    });
                    
                    // Se onlyToday for true, filtrar apenas envelopamentos criados hoje
                    if (onlyToday) {
                        const isCriadoHoje = isToday(dataCriacao);
                        console.log(`📊 Item ${index + 1} criado hoje?`, isCriadoHoje);
                        return isCriadoHoje;
                    }
                    
                    // Caso contrário, aplicar filtro de data range
                    if (dateRange.from && dateRange.to) {
                        const criacaoNoPeriodo = dataCriacao >= dateRange.from && dataCriacao <= dateRange.to;
                        
                        console.log(`📊 Resultado filtro para item ${index + 1}:`, {
                            criacaoNoPeriodo
                        });
                        
                        return criacaoNoPeriodo;
                    } else if (dateRange.from) {
                        return dataCriacao >= dateRange.from;
                    } else if (dateRange.to) {
                        return dataCriacao <= dateRange.to;
                    }
                    
                    return true;
                });

                console.log('📅 Envelopamentos após filtro de data:', filteredEnvelopamentos);

                // Ordenar por timestamp (mais recente primeiro)
                const sortedEnvelopamentos = filteredEnvelopamentos.sort((a, b) => b.timestamp - a.timestamp);
                
                const total = sortedEnvelopamentos.reduce((acc, item) => acc + (item.value || 0), 0);
                
                console.log('💰 Total calculado:', total);
                console.log('📋 Itens finais para exibição:', sortedEnvelopamentos);
                
                setTotalValor(total);
                setFeedItems(sortedEnvelopamentos);
                
            } catch (error) {
                console.error('❌ Erro ao carregar dados do feed de envelopamentos:', error);
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
            'Finalizado': 'success', 
            'Finalizada': 'success',
            'Orçamento Salvo': 'default', 
            'Rascunho': 'secondary',
            'Status Desconhecido': 'secondary'
        };
        return statusVariants[status] || 'secondary';
    };

    const getStatusClasses = (status) => {
        switch (status) {
            case 'Finalizado':
            case 'Finalizada':
                return 'bg-green-500 hover:bg-green-600 text-white';
            case 'Orçamento Salvo':
                return 'bg-blue-500 hover:bg-blue-600 text-white';
            case 'Rascunho':
                return 'border-gray-500 text-gray-600';
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
                head: [['Envelopamento', 'Cliente', 'Valor', 'Status', 'Data']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [66, 139, 202] }
            });
        }
        
        doc.save(`feed-envelopamentos-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    };

    if (isLoading) return (
        <Card className="h-full flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p>Carregando envelopamentos...</p>
            </div>
        </Card>
    );

    return (
        <Card className="h-full flex flex-col shadow-lg border-border dark:bg-slate-850">
             <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{title}</CardTitle>
                      {showValues && <CardDescription className="text-base font-semibold text-primary">R$ {totalValor.toFixed(2)}</CardDescription>}
                      {!showValues && feedItems.length > 0 && (
                        <CardDescription className="text-xs text-muted-foreground">
                          {feedItems.length} envelopamento(s) {onlyToday ? 'de hoje' : 'para hoje e próximos dias'}.
                        </CardDescription>
                      )}
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
                                                <CardDescription className="text-xs">
                                                    {isValid(item.timestamp) ? format(item.timestamp, 'HH:mm:ss dd/MM/yy') : 'Data inválida'}
                                                    {item.data_validade && isValid(new Date(item.data_validade)) && (
                                                        <span className="ml-2 text-orange-600">
                                                            • Válido até: {format(new Date(item.data_validade), 'dd/MM/yy')}
                                                        </span>
                                                    )}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge variant={getStatusVariant(item.status)} className={`text-xs ${getStatusClasses(item.status)}`}>{item.status}</Badge>
                                    </CardHeader>
                                    <CardContent className="p-3 text-xs space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium flex items-center gap-1"><User size={12}/> Cliente:</span>
                                            <span>{item.client}</span>
                                        </div>
                                        {item.details?.itens && item.details.itens.length > 0 && (
                                            <div className="pt-1">
                                                <h4 className="font-medium mb-0.5 flex items-center gap-1"><Palette size={12}/> Peças</h4>
                                                <ul className="text-muted-foreground space-y-0.5">
                                                    {item.details.itens?.map((p, i) => (
                                                        <li key={i} className="flex justify-between">
                                                            <span>- {p.nome || 'Peça desconhecida'} x{p.quantidade || 1}</span>
                                                            {showValues && <span>R$ {parseFloat(p.preco_unitario || 0).toFixed(2)}</span>}
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
                                                <h4 className="font-medium mb-0.5 flex items-center gap-1"><Package size={12}/> Observações</h4>
                                                <p className="text-muted-foreground bg-muted/20 dark:bg-slate-700/30 p-1.5 rounded-sm">{item.details.observacoes}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <Filter size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="mb-2">
                                    {onlyToday 
                                        ? 'Nenhum envelopamento encontrado para hoje.'
                                        : 'Nenhum envelopamento encontrado para hoje e próximos dias.'
                                    }
                                </p>
                                <p className="text-xs opacity-75">
                                    {onlyToday 
                                        ? `Período: ${format(new Date(), 'dd/MM/yyyy')} (Hoje)`
                                        : (dateRange.from && dateRange.to 
                                            ? `Período: ${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
                                            : 'Período: Hoje e próximos 7 dias'
                                        )
                                    }
                                </p>
                                <p className="text-xs opacity-50 mt-1">
                                    {onlyToday 
                                        ? 'Mostrando apenas envelopamentos criados hoje'
                                        : 'Mostrando orçamentos criados hoje ou com validade nos próximos dias'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default EnvelopamentoFeed;
