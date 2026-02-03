import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { format, parseISO, isToday, startOfDay, endOfDay, isValid, isBefore, subHours } from 'date-fns';
import { FileText, SprayCan, ShoppingCart, User, Package, Truck, StickyNote, CreditCard, DollarSign, Filter, Calendar as CalendarIcon, CalendarClock, Grid3X3, List, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn, loadData } from "@/lib/utils";
import { pdvService } from '@/services/pdvService';
import api from '@/services/api';

const feedItemTypes = {
  ALL: "Todos",
  OS: "OS",
  ENV: "Envelopamento",
  PDV: "Venda PDV",
  MP: "Marketplace"
};

const ColorLegend = ({ isVisible, onClose }) => {
    if (!isVisible) return null;

    const legendItems = [
        {
            color: 'bg-green-100 border-green-200 text-green-800',
            icon: '✅',
            title: 'Concluído',
            description: 'Atividades finalizadas, entregues ou concluídas'
        },
        {
            color: 'bg-yellow-100 border-yellow-200 text-yellow-800',
            icon: '⚙️',
            title: 'Em Produção',
            description: 'Atividades sendo executadas no momento'
        },
        {
            color: 'bg-orange-100 border-orange-200 text-orange-800',
            icon: '⏸️',
            title: 'Aguardando',
            description: 'Atividades prontas para serem iniciadas'
        },
        {
            color: 'bg-blue-100 border-blue-200 text-blue-800',
            icon: '📋',
            title: 'Em Andamento',
            description: 'Orçamentos, rascunhos e outras atividades'
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 z-50 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-6 w-[420px] max-w-[90vw]"
        >
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-base">Legenda de Cores</h4>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                    ✕
                </Button>
            </div>
            <div className="space-y-4">
                {legendItems.map((item, index) => (
                    <div key={index} className={`flex items-start gap-4 p-4 rounded-lg border-2 ${item.color}`}>
                        <span className="text-2xl flex-shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm mb-1">{item.title}</div>
                            <div className="text-sm opacity-80 leading-relaxed">{item.description}</div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

const FeedSection = ({ section, getStatusVariant, getStatusClasses, showValues = true }) => {
    const getSectionIcon = (type) => {
        switch (type) {
            case feedItemTypes.OS: return FileText;
            case feedItemTypes.ENV: return SprayCan;
            case feedItemTypes.PDV: return ShoppingCart;
            case feedItemTypes.MP: return Package;
            default: return Activity;
        }
    };

    const getSectionColor = (status) => {
        const finalizedStatuses = ['Finalizada', 'Finalizado', 'Entregue', 'Enviado', 'Pronto para Retirada', 'Concluído'];
        if (finalizedStatuses.includes(status)) return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
        if (status === 'Em Produção') return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
        if (status === 'Aguardando Produção') return 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20';
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
    };

    const Icon = getSectionIcon(section.type);
    
    return (
        <div className={`mb-6 border rounded-lg ${getSectionColor(section.status)}`}>
            <div className="p-4 border-b border-current/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{section.type}</h3>
                            <p className="text-sm text-muted-foreground">
                                {section.count} item(s) - {section.status}
                            </p>
                        </div>
                    </div>
                    {showValues && (
                        <div className="text-right">
                            <p className="text-lg font-bold text-primary">
                                R$ {section.total.toFixed(2)}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-4 space-y-3">
                {section.items.map((item, index) => (
                    <motion.div 
                        key={item.id} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                        <FeedItem 
                            item={item} 
                            getStatusVariant={getStatusVariant} 
                            getStatusClasses={getStatusClasses} 
                            showValues={showValues}
                            isGrouped={true}
                        />
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const FeedItem = ({ item, getStatusVariant, getStatusClasses, showValues = true, isGrouped = false }) => {
    return (
        <Card className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 dark:border-slate-700 ${isGrouped ? 'mb-3' : 'mb-4'}`}>
            <CardHeader className={`flex flex-row items-center justify-between ${isGrouped ? 'p-2 bg-muted/20' : 'p-3 bg-muted/30 dark:bg-slate-800/50'}`}>
                <div className="flex items-center gap-2">
                    {!isGrouped && (
                    <div className="p-1.5 bg-primary/10 text-primary rounded-md">
                        {item.icon && <item.icon className="h-4 w-4" />}
                    </div>
                    )}
                    <div>
                        <CardTitle className={`font-semibold ${isGrouped ? 'text-sm' : 'text-sm'}`}>{item.title}</CardTitle>
                        <CardDescription className="text-xs">{isValid(item.timestamp) ? format(item.timestamp, 'HH:mm:ss dd/MM/yy') : 'Data inválida'}</CardDescription>
                    </div>
                </div>
                {!isGrouped && (
                <Badge variant={getStatusVariant(item.status, item.data_validade)} className={`text-xs ${getStatusClasses(item.status)}`}>{item.status}</Badge>
                )}
            </CardHeader>
            <CardContent className={`text-xs space-y-2 ${isGrouped ? 'p-2' : 'p-3'}`}>
                <div className="flex justify-between items-center">
                    <span className="font-medium flex items-center gap-1"><User size={12}/> Cliente:</span>
                    <span>{item.client}</span>
                </div>
                 {item.details?.observacoes && (
                    <div className="pt-1">
                        <h4 className="font-medium mb-0.5 flex items-center gap-1"><StickyNote size={12}/> Observações</h4>
                        <p className="text-muted-foreground bg-muted/20 dark:bg-slate-700/30 p-1.5 rounded-sm">{item.details.observacoes}</p>
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
                        <h4 className="font-medium mb-0.5 flex items-center gap-1"><CreditCard size={12}/> Pagamentos</h4>
                        <ul className="text-muted-foreground space-y-0.5">
                            {item.details.pagamentos?.map((p, i) => (
                                <li key={i} className="flex justify-between">
                                    <span>- {p.metodo}</span>
                                    <span>R$ {parseFloat(p.valorFinal || p.valor || 0).toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                 )}
                 {item.details?.rastreio && (
                     <div className="pt-1">
                        <h4 className="font-medium mb-0.5 flex items-center gap-1"><Truck size={12}/> Envio</h4>
                        <p className="text-muted-foreground">{item.details.rastreio}</p>
                    </div>
                 )}
                 {showValues && (
                     <>
                        <Separator className="my-2"/>
                        <div className="flex justify-end items-center font-semibold text-sm">
                            <span>Total:</span>
                            <span className="ml-2 text-primary">R$ {item.value ? item.value.toFixed(2) : '0.00'}</span>
                        </div>
                    </>
                 )}
            </CardContent>
        </Card>
    )
}

const ProductionFeed = ({ showValues = true, title = "Feed de Atividades", defaultDateToday = false, hideFinalizedItems = false, onlyToday = false }) => {
    const [feedItems, setFeedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalValor, setTotalValor] = useState(0);
    const [dateRange, setDateRange] = useState({ 
        from: (defaultDateToday || onlyToday) ? startOfDay(new Date()) : undefined, 
        to: (defaultDateToday || onlyToday) ? endOfDay(new Date()) : undefined 
    });
    const [selectedType, setSelectedType] = useState(feedItemTypes.ALL);
    const [filterLastTwoHours, setFilterLastTwoHours] = useState(false);
    const [groupedItems, setGroupedItems] = useState({});
    const [viewMode, setViewMode] = useState('grouped'); // 'grouped' ou 'list'
    const [showLegend, setShowLegend] = useState(false);
    
    const feedContainerRef = useRef(null);
    const legendRef = useRef(null);

    // Fechar legenda ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (legendRef.current && !legendRef.current.contains(event.target)) {
                setShowLegend(false);
            }
        };

        if (showLegend) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showLegend]);

    const dependencies = useMemo(() => ({
        dateRangeFrom: dateRange.from?.getTime(),
        dateRangeTo: dateRange.to?.getTime(),
        selectedType,
        defaultDateToday,
        filterLastTwoHours,
        hideFinalizedItems
    }), [dateRange.from, dateRange.to, selectedType, defaultDateToday, filterLastTwoHours, hideFinalizedItems, onlyToday]);

    useEffect(() => {
        const loadFeedData = async () => {
            setIsLoading(true);
            try {
                // Carregar OS da API primeiro, depois fallback para localStorage
                let osSalvas = [];
                try {
                    const response = await api.get('/api/ordens-servico');
                    osSalvas = response.data?.data?.data || response.data?.data || response.data || [];
                } catch (apiError) {
                    console.warn('⚠️ Erro ao carregar OS da API para feed, usando localStorage:', apiError);
                    osSalvas = await loadData('ordens_servico_salvas', []);
                }
                
                // Carregar envelopamentos da API primeiro, depois fallback para localStorage
                let envelopamentos = [];
                try {
                    const response = await api.get('/api/envelopamentos');
                    envelopamentos = response.data?.data?.data || response.data?.data || response.data || [];
                } catch (apiError) {
                    console.warn('⚠️ Erro ao carregar envelopamentos da API para feed, usando localStorage:', apiError);
                    envelopamentos = await loadData('envelopamentosOrcamentos', []);
                }
                
                // Carregar vendas PDV da API primeiro, depois fallback para localStorage
                let vendasPDV = [];
                try {
                    vendasPDV = await pdvService.getHistoricoVendas();
                } catch (apiError) {
                    console.warn('⚠️ Erro ao carregar vendas da API para feed, usando localStorage:', apiError);
                    vendasPDV = (await loadData('historico_vendas_pdv', [])).filter(v => v.tipo === 'Venda PDV' || v.tipo_documento === 'venda');
                }
                
                // Carregar orçamentos PDV da API primeiro, depois fallback para localStorage
                let orcamentosPDV = [];
                try {
                    orcamentosPDV = await pdvService.getHistoricoOrcamentos();
                } catch (apiError) {
                    console.warn('⚠️ Erro ao carregar orçamentos da API para feed, usando localStorage:', apiError);
                    orcamentosPDV = await loadData('orcamentosPDV', []);
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
            
            let allActivities = [];

            if (selectedType === feedItemTypes.ALL || selectedType === feedItemTypes.OS) {
                allActivities.push(...osSalvas.map(os => ({ 
                    id: `os-${os.id || 'unknown'}`, 
                    type: feedItemTypes.OS, 
                    icon: FileText, 
                    title: `OS #${os.id || 'N/A'}`, 
                    client: os.cliente?.nome_completo || os.cliente?.nome || os.cliente?.apelido_fantasia || os.cliente_info?.nome || os.cliente_nome_manual || 'Cliente não informado', 
                    value: parseFloat(os.valor_total_os || 0), 
                    status: os.status_os === 'Finalizada' 
                        ? (os.dados_producao?.status_producao || 'Produção Finalizada')
                        : (os.status_os || 'Status Desconhecido'), 
                    timestamp: parseISO(os.data_criacao || os.data_finalizacao || new Date().toISOString()), 
                    data_validade: os.data_validade, 
                    details: { itens: os.itens, pagamentos: os.pagamentos, observacoes: os.observacoes_gerais_os } 
                })));
            }
            if (selectedType === feedItemTypes.ALL || selectedType === feedItemTypes.ENV) {
                allActivities.push(...envelopamentos.map(env => {
                    const dateStr = env.data_criacao || env.data || env.created_at || env.updated_at;
                    const ts = dateStr ? new Date(dateStr) : new Date();
                    const isVenda = (env.status === 'Finalizado' || env.status === 'Finalizada');
                    return ({ 
                        id: `env-${env.id || 'unknown'}`, 
                        type: feedItemTypes.ENV, 
                        icon: isVenda ? DollarSign : SprayCan, 
                        title: `${isVenda ? 'Venda Env.' : 'Orçamento Env.'} #${env.codigo_orcamento ? String(env.codigo_orcamento) : 'N/A'}`, 
                        client: env.cliente?.nome || 'Cliente não informado', 
                        value: parseFloat(env.orcamentoTotal || env.orcamento_total || 0), 
                        status: env.status || 'Status Desconhecido', 
                        timestamp: ts, 
                        data_validade: env.data_validade, 
                        details: { itens: (env.selectedPecas || env.selected_pecas || []).map(p => ({...p.parte, nome: p.parte?.nome || p.nome, quantidade: p.quantidade, preco_unitario: (p.subtotal || 0) / (p.quantidade || 1)})), pagamentos: env.pagamentos, observacoes: env.observacao } 
                    });
                }));
            }
            if (selectedType === feedItemTypes.ALL || selectedType === feedItemTypes.PDV) {
                allActivities.push(...vendasPDV.map(venda => {
                    // Verificar se é pré-venda
                    const isPreVenda = venda.pre_venda || venda.is_orcamento || venda.status === 'pre_venda' || venda.status === 'orcamento';
                    
                    return {
                        id: `venda-${venda.id || 'unknown'}`, 
                        type: feedItemTypes.PDV, 
                        icon: ShoppingCart, 
                        title: isPreVenda ? `Pré-Venda PDV #${venda.id ? String(venda.id).slice(-6) : 'N/A'}` : `Venda PDV #${venda.id ? String(venda.id).slice(-6) : 'N/A'}`, 
                        client: venda.cliente_nome || venda.cliente?.nome || 'Consumidor Final', 
                        value: parseFloat(venda.total || venda.valor_total || 0), 
                        status: isPreVenda ? 'Pré-Venda' : 'Finalizado', 
                        timestamp: parseISO(venda.data_emissao || venda.data_venda || new Date().toISOString()), 
                        details: { itens: venda.itens, pagamentos: venda.pagamentos || venda.dados_pagamento, observacoes: venda.observacoes } 
                    };
                }));
                allActivities.push(...orcamentosPDV.map(orc => ({ 
                    id: `orc-pdv-${orc.id || 'unknown'}`, 
                    type: feedItemTypes.PDV, 
                    icon: ShoppingCart, 
                    title: `Orçamento PDV #${orc.id ? String(orc.id).slice(-6) : 'N/A'}`, 
                    client: orc.cliente_nome || orc.cliente?.nome || 'Consumidor Final', 
                    value: parseFloat(orc.total || 0), 
                    status: 'Pendente', 
                    timestamp: parseISO(orc.data_emissao || new Date().toISOString()), 
                    data_validade: orc.data_validade, 
                    details: { itens: orc.itens, observacoes: orc.observacoes } 
                })));
            }
            if (selectedType === feedItemTypes.ALL || selectedType === feedItemTypes.MP) {
                 allActivities.push(...vendasMarketplace.map(venda => ({ 
                    id: `marketplace-${venda.id || 'unknown'}`, 
                    type: feedItemTypes.MP, 
                    icon: Package, 
                    title: `Venda Online #${venda.id ? String(venda.id).slice(-6) : 'N/A'}`, 
                    client: venda.cliente_nome || 'Cliente Online', 
                    value: parseFloat(venda.valor_total || 0), 
                    status: venda.status_pedido || 'Status Desconhecido', 
                    timestamp: parseISO(venda.data_venda || new Date().toISOString()), 
                    details: { itens: venda.produtos, pagamentos: [{metodo: 'Online', valor: venda.valor_total || 0}], observacoes: venda.observacoes, rastreio: venda.codigo_rastreio } 
                })));
            }

            const now = new Date();
            const twoHoursAgo = subHours(now, 2);

            const timeFilteredActivities = allActivities.filter(item => {
                if (!item.timestamp || !isValid(item.timestamp)) return false;
                const itemDate = item.timestamp;

                if (filterLastTwoHours) {
                    return itemDate >= twoHoursAgo && itemDate <= now;
                }
                
                // Se não há filtro de data específico, mostrar apenas atividades de hoje
                if (!dateRange.from && !dateRange.to && !defaultDateToday) {
                    return isToday(itemDate);
                }
                
                const fromMatch = !dateRange.from || itemDate >= startOfDay(dateRange.from);
                const toMatch = !dateRange.to || itemDate <= endOfDay(dateRange.to);
                return fromMatch && toMatch;
            });
            
            const finalizedStatuses = ['Finalizada', 'Finalizado', 'Entregue', 'Enviado', 'Pronto para Retirada', 'Concluído'];
            const statusFilteredActivities = timeFilteredActivities.filter(item => {
                // Se hideFinalizedItems for true, filtrar itens finalizados
                if (hideFinalizedItems && finalizedStatuses.includes(item.status)) {
                    return false;
                }
                
                // Se não há filtros específicos, mostrar apenas atividades de hoje
                if (selectedType === feedItemTypes.ALL && !dateRange.from && !dateRange.to && !filterLastTwoHours && !defaultDateToday) {
                    // Mostrar apenas atividades de hoje
                    return isToday(item.timestamp);
                }
                return true;
            });
            
            const sortedActivities = statusFilteredActivities.sort((a, b) => {
                // Definir status finalizados que devem ir para o final
                const finalizedStatuses = ['Finalizada', 'Finalizado', 'Entregue', 'Enviado', 'Pronto para Retirada', 'Concluído'];
                const aIsFinalized = finalizedStatuses.includes(a.status);
                const bIsFinalized = finalizedStatuses.includes(b.status);
                
                // Se ambos são finalizados ou ambos não são finalizados, ordenar por timestamp (mais recente primeiro)
                if (aIsFinalized === bIsFinalized) {
                    // Ordenar por timestamp (mais recente primeiro) dentro de cada grupo
                    return b.timestamp - a.timestamp;
                }
                
                // Se apenas um é finalizado, o não finalizado vem primeiro
                // Atividades não finalizadas aparecem antes das finalizadas
                return aIsFinalized ? 1 : -1;
            });
            const total = sortedActivities.reduce((acc, item) => acc + (item.value || 0), 0);
            
            // Agrupar itens por tipo e status para melhor organização
            const grouped = sortedActivities.reduce((acc, item) => {
                const key = `${item.type}-${item.status}`;
                if (!acc[key]) {
                    acc[key] = {
                        type: item.type,
                        status: item.status,
                        items: [],
                        total: 0,
                        count: 0
                    };
                }
                acc[key].items.push(item);
                acc[key].total += item.value || 0;
                acc[key].count += 1;
                return acc;
            }, {});
            
            setTotalValor(total);
            setFeedItems(sortedActivities);
            setGroupedItems(grouped);
            
            } catch (error) {
                console.error('Erro ao carregar dados do feed:', error);
                setFeedItems([]);
                setTotalValor(0);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadFeedData();
    }, [dependencies]);

    const handleDateRangeChange = (range) => {
        if (range?.from || range?.to) {
            setFilterLastTwoHours(false); 
        }
        if (range?.from && !isValid(range.from)) range.from = undefined;
        if (range?.to && !isValid(range.to)) range.to = undefined;
        
        // Se não há range definido, limpar o filtro de data (mostrar apenas hoje)
        if (!range || (!range.from && !range.to)) {
            setDateRange({ 
                from: undefined, 
                to: undefined 
            });
        } else {
            setDateRange(range);
        }
    };

    const getStatusClasses = (status) => {
        switch (status) {
            case 'Em Produção':
                return 'bg-yellow-500 hover:bg-yellow-600 text-white';
            case 'Pronto para Entrega':
            case 'Aguardando Entrega':
                return 'bg-blue-500 hover:bg-blue-600 text-white';
            case 'Entregue':
            case 'Produção Finalizada':
                return 'bg-green-500 hover:bg-green-600 text-white';
            case 'Aguardando Produção':
                return 'border-orange-500 text-orange-600';
            default:
                return '';
        }
    };

    const getStatusVariant = (status, dataValidade) => {
        const isOrcamento = status === 'Orçamento Salvo' || status === 'Orçamento Salvo (Editado)' || status === 'Rascunho' || status === 'Rascunho (Editado)' || status === 'Pendente' || status === 'Pré-Venda';
        if (isOrcamento && dataValidade && isValid(parseISO(dataValidade)) && isBefore(parseISO(dataValidade), startOfDay(new Date()))) {
            return 'destructive'; 
        }
        const statusVariants = { 
            'Finalizada': 'success', 
            'Finalizado': 'success', 
            'Entregue': 'success', 
            'Enviado': 'success', 
            'Pronto para Retirada': 'success', 
            'Concluído': 'success', 
            'Orçamento Salvo': 'default', 
            'Rascunho': 'secondary', 
            'Aguardando Produção': 'outline', 
            'Em Produção': 'warning', 
            'Pendente': 'warning',
            'Pré-Venda': 'warning',
            // Status de produção específicos
            'Pronto para Entrega': 'default',
            'Aguardando Entrega': 'default',
            'Produção Finalizada': 'default'
        };
        return statusVariants[status] || 'secondary';
    };

    const handleExportPdf = () => {
        const doc = new jsPDF();
        let y = 15;
        doc.setFontSize(18);
        doc.text(title, 105, y, { align: 'center' });
        y += 7;
        doc.setFontSize(10);
        let dateFilterText = 'Todas as datas';
        if (filterLastTwoHours) {
            dateFilterText = 'Últimas 2 horas';
        } else if (dateRange.from && isValid(dateRange.from)) {
            dateFilterText = `Data: ${format(dateRange.from, 'dd/MM/yyyy')}${dateRange.to && isValid(dateRange.to) ? ` a ${format(dateRange.to, 'dd/MM/yyyy')}` : ''}`;
        }
        doc.text(`Filtros: ${selectedType}${dateFilterText !== 'Todas as datas' ? ` - ${dateFilterText}`: ''}`, 105, y, {align: 'center'});
        y += 7;

        if (showValues) {
            doc.setFontSize(12);
            doc.text(`Total: R$ ${totalValor.toFixed(2)}`, 105, y, { align: 'center' });
            y += 10;
        }

        feedItems.forEach(item => {
            if (y > 270) { doc.addPage(); y = 15; }
            doc.setFontSize(12).setFont(undefined, 'bold');
            doc.text(`${item.title} (${item.status})`, 14, y);
            y += 6;
            doc.setFontSize(10).setFont(undefined, 'normal');
            doc.text(`Cliente: ${item.client}${showValues ? ` | Total: R$ ${(item.value || 0).toFixed(2)}` : ''}`, 14, y);
            y += 6;
            if (item.details?.itens && item.details.itens.length > 0) {
                doc.setFont(undefined, 'bold').text("Itens:", 16, y); y += 5;
                doc.setFont(undefined, 'normal');
                item.details.itens.forEach(p => { doc.text(`- ${p.nome || p.nome_servico_produto || 'Item'} x${p.quantidade || 1}${showValues ? ` (R$ ${parseFloat(p.preco_unitario || p.preco_venda_unitario || (p.subtotal || 0) / (p.quantidade || 1) || 0).toFixed(2)})` : ''}`, 18, y); y += 5; });
            }
             if (showValues && item.details?.pagamentos && item.details.pagamentos.length > 0) {
                doc.setFont(undefined, 'bold').text("Pagamentos:", 16, y); y += 5;
                doc.setFont(undefined, 'normal');
                item.details.pagamentos.forEach(p => { doc.text(`- ${p.metodo}: R$ ${parseFloat(p.valorFinal || p.valor || 0).toFixed(2)}`, 18, y); y+=5; });
            }
            if (item.details?.observacoes) {
                doc.setFont(undefined, 'bold').text("Obs:", 16, y); y += 5;
                doc.setFont(undefined, 'normal');
                const obsLines = doc.splitTextToSize(item.details.observacoes, 170);
                doc.text(obsLines, 18, y);
                y += obsLines.length * 5;
            }
            y += 4;
            doc.setDrawColor(200, 200, 200).line(14, y, 196, y);
            y += 6;
        });

        doc.save(`feed_atividades_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);
    };

    if (isLoading) return <Card className="h-full flex items-center justify-center"><p>Carregando feed...</p></Card>;

    const getDateDisplayValue = () => {
        if (filterLastTwoHours) return "Últimas 2 horas";
        if (dateRange.from && isValid(dateRange.from)) {
            if (dateRange.to && isValid(dateRange.to)) {
                return <>{format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}</>;
            }
            return format(dateRange.from, "dd/MM/yy");
        }
        return "Hoje";
    };

    return (
        <Card className="h-full flex flex-col shadow-lg border-border dark:bg-slate-850">
             <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{title}</CardTitle>
                      {showValues && <CardDescription className="text-base font-semibold text-primary">R$ {totalValor.toFixed(2)}</CardDescription>}
                      {!showValues && feedItems.length > 0 && <CardDescription className="text-xs text-muted-foreground">{feedItems.length} atividade(s) encontradas.</CardDescription>}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center border rounded-md">
                            <Button
                                variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('grouped')}
                                className="h-8 px-3"
                            >
                                <Grid3X3 className="h-3 w-3 mr-1" />
                                Agrupado
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('list')}
                                className="h-8 px-3"
                            >
                                <List className="h-3 w-3 mr-1" />
                                Lista
                            </Button>
                        </div>
                        <div className="relative" ref={legendRef}>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowLegend(!showLegend)}
                                className="h-8 px-3"
                            >
                                <Info className="h-3 w-3 mr-1" />
                                Cores
                            </Button>
                            <ColorLegend 
                                isVisible={showLegend} 
                                onClose={() => setShowLegend(false)} 
                            />
                        </div>
                        {feedItems.length > 0 && <Button onClick={handleExportPdf} variant="outline" size="sm"><FileDown className="mr-2 h-3 w-3"/>Exportar</Button>}
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t dark:border-slate-700">
                    <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
                            <SelectValue placeholder="Filtrar por tipo..." />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(feedItemTypes).map(([key, value]) => (
                                <SelectItem key={key} value={value} className="text-xs">{value}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-full sm:w-auto justify-start text-left font-normal h-9 text-xs flex-1"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                {getDateDisplayValue()}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange.from}
                                selected={dateRange}
                                onSelect={handleDateRangeChange}
                                numberOfMonths={2}
                            />
                             {(dateRange.from || dateRange.to || filterLastTwoHours) && 
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full text-xs" 
                                    onClick={() => {
                                        setFilterLastTwoHours(false);
                                        handleDateRangeChange({from: undefined, to: undefined});
                                    }}
                                >
                                    Voltar para hoje
                                </Button>
                            }
                        </PopoverContent>
                    </Popover>
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0">
                <ScrollArea className="h-full" ref={feedContainerRef}>
                    <div className="p-4 space-y-4">
                        {feedItems.length > 0 ? (
                            viewMode === 'grouped' ? (
                                Object.keys(groupedItems).length > 0 ? (
                                    Object.values(groupedItems)
                                        .sort((a, b) => {
                                            // Ordenar seções: não finalizadas primeiro, depois finalizadas
                                            const finalizedStatuses = ['Finalizada', 'Finalizado', 'Entregue', 'Enviado', 'Pronto para Retirada', 'Concluído'];
                                            const aIsFinalized = finalizedStatuses.includes(a.status);
                                            const bIsFinalized = finalizedStatuses.includes(b.status);
                                            
                                            if (aIsFinalized === bIsFinalized) {
                                                // Dentro do mesmo grupo, ordenar por total (maior primeiro)
                                                return b.total - a.total;
                                            }
                                            
                                            return aIsFinalized ? 1 : -1;
                                        })
                                        .map((section, index) => (
                                            <motion.div 
                                                key={`${section.type}-${section.status}`}
                                                initial={{ opacity: 0, y: 20 }} 
                                                animate={{ opacity: 1, y: 0 }} 
                                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                            >
                                                <FeedSection 
                                                    section={section} 
                                                    getStatusVariant={getStatusVariant} 
                                                    getStatusClasses={getStatusClasses} 
                                                    showValues={showValues} 
                                                />
                                            </motion.div>
                                        ))
                                ) : (
                                    <div className="text-center py-10 text-muted-foreground">
                                        <Filter size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>Nenhuma atividade encontrada para os filtros selecionados.</p>
                                    </div>
                                )
                            ) : (
                                feedItems.map((item, index) => (
                                    <motion.div 
                                        key={item.id} 
                                        initial={{ opacity: 0, y: 15 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        transition={{ duration: 0.2, delay: index * 0.03 }}
                                    >
                                        <FeedItem 
                                            item={item} 
                                            getStatusVariant={getStatusVariant} 
                                            getStatusClasses={getStatusClasses} 
                                            showValues={showValues} 
                                        />
                                    </motion.div>
                                ))
                            )
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <Filter size={32} className="mx-auto mb-2 opacity-50" />
                                <p>Nenhuma atividade encontrada para os filtros selecionados.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default ProductionFeed;