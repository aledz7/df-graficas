import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { format, parseISO, isToday, startOfDay, endOfDay, isValid } from 'date-fns';
import { ShoppingCart, Package, User, DollarSign, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { loadData } from "@/lib/utils";
import { pdvService } from '@/services/pdvService';
import api from '@/services/api';

const VendasFeed = ({ showValues = true, title = "Feed de Vendas", defaultDateToday = true, onlyToday = true }) => {
    const navigate = useNavigate();
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
                // Carregar vendas PDV da API primeiro, depois fallback para localStorage
                let vendasPDV = [];
                try {
                    vendasPDV = await pdvService.getHistoricoVendas();
                } catch (apiError) {
                    console.warn('⚠️ Erro ao carregar vendas da API para feed, usando localStorage:', apiError);
                    vendasPDV = (await loadData('historico_vendas_pdv', [])).filter(v => v.tipo === 'Venda PDV' || v.tipo_documento === 'venda');
                }
                
                // Carregar vendas marketplace da API primeiro, depois fallback para localStorage
                let vendasMarketplace = [];
                try {
                    const response = await api.get('/api/marketplace/vendas');
                    vendasMarketplace = response.data?.data?.data || response.data?.data || response.data || [];
                } catch (apiError) {
                    console.warn('⚠️ Erro ao carregar vendas marketplace da API para feed, usando localStorage:', apiError);
                    vendasMarketplace = await loadData('vendas_marketplace', []);
                }
            
                let allVendas = [];

                // Processar vendas PDV
                allVendas.push(...vendasPDV.map(venda => {
                    const isPreVenda = venda.pre_venda || venda.is_orcamento || venda.status === 'pre_venda' || venda.status === 'orcamento';
                    
                    return {
                        id: `venda-${venda.id || 'unknown'}`,
                        rawId: venda.id,
                        type: 'PDV',
                        icon: ShoppingCart,
                        title: isPreVenda ? `Pré-Venda PDV #${venda.id || 'N/A'}` : `Venda PDV #${venda.id || 'N/A'}`,
                        client: venda.cliente_nome || venda.cliente?.nome || 'Consumidor Final',
                        value: parseFloat(venda.total || venda.valor_total || 0),
                        status: isPreVenda ? 'Pré-Venda' : 'Finalizado',
                        timestamp: parseISO(venda.data_emissao || venda.data_venda || new Date().toISOString()),
                        details: { itens: venda.itens, pagamentos: venda.pagamentos || venda.dados_pagamento, observacoes: venda.observacoes }
                    };
                }));

                // Processar vendas marketplace
                allVendas.push(...vendasMarketplace.map(venda => ({
                    id: `marketplace-${venda.id || 'unknown'}`,
                    rawId: venda.id,
                    type: 'Marketplace',
                    icon: Package,
                    title: `Venda Online #${venda.id ? String(venda.id).slice(-6) : 'N/A'}`,
                    client: venda.cliente_nome || 'Cliente Online',
                    value: parseFloat(venda.valor_total || 0),
                    status: venda.status_pedido || 'Status Desconhecido',
                    timestamp: parseISO(venda.data_venda || new Date().toISOString()),
                    details: { itens: venda.produtos, pagamentos: [{metodo: 'Online', valor: venda.valor_total || 0}], observacoes: venda.observacoes, rastreio: venda.codigo_rastreio }
                })));

                // Filtrar por data se especificado
                const filteredVendas = allVendas.filter(item => {
                    if (!item.timestamp || !isValid(item.timestamp)) return false;
                    
                    if (dateRange.from && dateRange.to) {
                        return item.timestamp >= dateRange.from && item.timestamp <= dateRange.to;
                    } else if (dateRange.from) {
                        return item.timestamp >= dateRange.from;
                    } else if (dateRange.to) {
                        return item.timestamp <= dateRange.to;
                    }
                    
                    return true;
                });

                // Ordenar por timestamp (mais recente primeiro)
                const sortedVendas = filteredVendas.sort((a, b) => b.timestamp - a.timestamp);
                
                const total = sortedVendas.reduce((acc, item) => acc + (item.value || 0), 0);
                
                setTotalValor(total);
                setFeedItems(sortedVendas);
                
            } catch (error) {
                console.error('Erro ao carregar dados do feed de vendas:', error);
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
            'Pré-Venda': 'warning',
            'Status Desconhecido': 'secondary'
        };
        return statusVariants[status] || 'secondary';
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
                head: [['Venda', 'Cliente', 'Valor', 'Status', 'Data']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [66, 139, 202] }
            });
        }
        
        doc.save(`feed-vendas-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    };

    if (isLoading) return <Card className="h-full flex items-center justify-center"><p>Carregando vendas...</p></Card>;

    return (
        <Card className="h-full flex flex-col shadow-lg border-border dark:bg-slate-850">
             <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{title}</CardTitle>
                      {showValues && <CardDescription className="text-base font-semibold text-primary">R$ {totalValor.toFixed(2)}</CardDescription>}
                      {!showValues && feedItems.length > 0 && <CardDescription className="text-xs text-muted-foreground">{feedItems.length} venda(s) encontrada(s).</CardDescription>}
                    </div>
                    {feedItems.length > 0 && <Button onClick={handleExportPdf} variant="outline" size="sm"><FileDown className="mr-2 h-3 w-3"/>Exportar</Button>}
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-3">
                        {feedItems.length > 0 ? feedItems.map((item, index) => (
                            <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: index * 0.03 }}>
                                <Card
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleAbrirVenda(item)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAbrirVenda(item); } }}
                                    className="mb-4 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 dark:border-slate-700 cursor-pointer"
                                >
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
                                        <Badge variant={getStatusVariant(item.status)} className="text-xs">{item.status}</Badge>
                                    </CardHeader>
                                    <CardContent className="p-3 text-xs space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium flex items-center gap-1"><User size={12}/> Cliente:</span>
                                            <span>{item.client}</span>
                                        </div>
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
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <Filter size={32} className="mx-auto mb-2 opacity-50" />
                                <p>Nenhuma venda encontrada para o período selecionado.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default VendasFeed;
