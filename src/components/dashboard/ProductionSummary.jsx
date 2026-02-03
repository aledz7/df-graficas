import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, parseISO, isToday } from 'date-fns';
import { DollarSign, Banknote, CreditCard, Smartphone, CalendarDays, BarChart, Loader2, FileText, SprayCan, ShoppingCart, XCircle, History } from 'lucide-react';

const StatMiniCard = ({ title, value, icon, color }) => (
    <div className={`p-3 rounded-lg flex items-center gap-3 ${color}`}>
        <div className="p-2 bg-white/20 rounded-full">{icon}</div>
        <div>
            <p className="text-xs font-medium text-white/90">{title}</p>
            <p className="text-lg font-bold text-white">R$ {value.toFixed(2)}</p>
        </div>
    </div>
);

const ProductionSummary = () => {
    const [summary, setSummary] = useState({
        totalOSFinalizada: 0,
        totalOSOrcamento: 0,
        totalEnvFinalizado: 0,
        totalEnvOrcamento: 0,
        totalPDV: 0,
        totalCancelado: 0,
        pagamentos: {},
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
            const osSalvas = JSON.parse(await apiDataManager.getItem('ordens_servico_salvas') || '[]');
            const envelopamentos = JSON.parse(await apiDataManager.getItem('envelopamentosOrcamentos') || '[]');
            const vendasPDV = JSON.parse(await apiDataManager.getItem('historico_vendas_pdv') || '[]').filter(v => v.tipo === 'venda');
            
            const hoje = new Date();
            let tempSummary = {
                totalOSFinalizada: 0, totalOSOrcamento: 0, totalEnvFinalizado: 0,
                totalEnvOrcamento: 0, totalPDV: 0, totalCancelado: 0, pagamentos: {}
            };
            
            const processarPagamentos = (pagamentosArray) => {
                if (!Array.isArray(pagamentosArray)) return;
                pagamentosArray.forEach(p => {
                    tempSummary.pagamentos[p.metodo] = (tempSummary.pagamentos[p.metodo] || 0) + parseFloat(p.valorFinal || p.valor || 0);
                });
            };

            osSalvas.filter(os => os.data_criacao && isToday(parseISO(os.data_criacao))).forEach(os => {
                const valor = parseFloat(os.valor_total_os || 0);
                if (os.status_os === 'Finalizada' || os.status_os === 'Entregue') {
                    tempSummary.totalOSFinalizada += valor;
                    if(os.pagamentos) processarPagamentos(os.pagamentos);
                } else if (os.status_os === 'Orçamento Salvo') {
                    tempSummary.totalOSOrcamento += valor;
                } else if (os.status_os === 'Cancelada') {
                    tempSummary.totalCancelado += valor;
                }
            });
            
            envelopamentos.filter(env => env.data && isToday(parseISO(env.data))).forEach(env => {
                const valor = parseFloat(env.orcamentoTotal || 0);
                if (env.status === 'Finalizado') {
                    tempSummary.totalEnvFinalizado += valor;
                     if(env.pagamentos) processarPagamentos(env.pagamentos);
                } else if (env.status === 'Orçamento Salvo' || env.status === 'Rascunho') {
                    tempSummary.totalEnvOrcamento += valor;
                } else if (env.status === 'Cancelado') {
                    tempSummary.totalCancelado += valor;
                }
            });

            vendasPDV.filter(venda => venda.data && isToday(parseISO(venda.data))).forEach(venda => {
                tempSummary.totalPDV += parseFloat(venda.total || 0);
                if(venda.pagamentos) processarPagamentos(venda.pagamentos);
            });

            setSummary(tempSummary);
        
            } catch(error) {
            } finally {
            setIsLoading(false);
        
            }
        };
        
        loadData();
    }, []);

    const paymentIconMap = {
        'Dinheiro': <Banknote className="h-5 w-5 text-white" />,
        'Pix': <Smartphone className="h-5 w-5 text-white" />,
        'Cartão Débito': <CreditCard className="h-5 w-5 text-white" />,
        'Cartão Crédito': <CreditCard className="h-5 w-5 text-white" />,
        'Crediário': <CalendarDays className="h-5 w-5 text-white" />,
    };

    if (isLoading) {
        return (
            <Card className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
        );
    }
    
    const statsCards = [
        {title: "Vendas PDV", value: summary.totalPDV, icon: <ShoppingCart className="h-5 w-5 text-white"/>, color: "bg-gradient-to-br from-green-500 to-emerald-600"},
        {title: "OS Finalizadas", value: summary.totalOSFinalizada, icon: <FileText className="h-5 w-5 text-white"/>, color: "bg-gradient-to-br from-sky-500 to-cyan-600"},
        {title: "Envelop. Finalizados", value: summary.totalEnvFinalizado, icon: <SprayCan className="h-5 w-5 text-white"/>, color: "bg-gradient-to-br from-blue-500 to-indigo-600"},
        {title: "OS (Orçamentos)", value: summary.totalOSOrcamento, icon: <History className="h-5 w-5 text-white"/>, color: "bg-gradient-to-br from-amber-500 to-orange-600"},
        {title: "Envelop. (Orçamentos)", value: summary.totalEnvOrcamento, icon: <History className="h-5 w-5 text-white"/>, color: "bg-gradient-to-br from-yellow-500 to-lime-600"},
        {title: "Cancelados/Excluídos", value: summary.totalCancelado, icon: <XCircle className="h-5 w-5 text-white"/>, color: "bg-gradient-to-br from-red-500 to-rose-600"},
    ];

    return (
        <Card className="h-full flex flex-col shadow-lg border-border">
            <CardHeader>
                <CardTitle>Resumo Financeiro do Dia</CardTitle>
                <CardDescription>Valores totais de produção e pagamentos recebidos hoje.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {statsCards.map(stat => <StatMiniCard key={stat.title} {...stat} />)}
                 </div>
                 
                <div>
                    <h4 className="font-semibold mb-2 text-sm">Pagamentos Recebidos Hoje</h4>
                    <div className="space-y-2">
                        {Object.keys(summary.pagamentos).length > 0 ? Object.entries(summary.pagamentos).map(([metodo, valor]) => (
                             <div key={metodo} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                                <span className="flex items-center font-medium">
                                    {React.cloneElement(paymentIconMap[metodo] || <DollarSign />, {className: "h-4 w-4 mr-2 text-primary"})}
                                    {metodo}
                                </span>
                                <span className="font-semibold">R$ {valor.toFixed(2)}</span>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-2">Nenhum pagamento recebido hoje.</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ProductionSummary;