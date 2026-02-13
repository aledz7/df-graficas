import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Download, CheckCircle2, Clock, XCircle, DollarSign, Filter, FileDown } from 'lucide-react';
import { freteEntregaService, entregadorService } from '@/services/api';
import { cn } from '@/lib/utils';

const RelatorioFretesPage = () => {
    const { toast } = useToast();
    const [entregas, setEntregas] = useState([]);
    const [entregadores, setEntregadores] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [resumo, setResumo] = useState(null);
    const [pagination, setPagination] = useState(null);
    
    // Filtros
    const [dataInicio, setDataInicio] = useState(null);
    const [dataFim, setDataFim] = useState(null);
    const [entregadorId, setEntregadorId] = useState('');
    const [tipo, setTipo] = useState('');
    const [status, setStatus] = useState('');
    const [statusPagamento, setStatusPagamento] = useState('');
    
    // Modal de pagamento
    const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState(false);
    const [entregaParaPagar, setEntregaParaPagar] = useState(null);
    const [dataPagamento, setDataPagamento] = useState(new Date());
    const [formaPagamento, setFormaPagamento] = useState('PIX');

    const loadEntregadores = async () => {
        try {
            const response = await entregadorService.getAtivos();
            setEntregadores(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar entregadores:', error);
        }
    };

    useEffect(() => {
        loadEntregadores();
    }, []);

    const loadRelatorio = async (page = 1) => {
        try {
            setIsLoading(true);
            const params = {
                page,
                per_page: 50,
                sort_by: 'data_entrega',
                sort_order: 'desc',
            };

            if (dataInicio) params.data_inicio = format(dataInicio, 'yyyy-MM-dd');
            if (dataFim) params.data_fim = format(dataFim, 'yyyy-MM-dd');
            if (entregadorId) params.entregador_id = entregadorId;
            if (tipo) params.tipo = tipo;
            if (status) params.status = status;
            if (statusPagamento) params.status_pagamento = statusPagamento;

            const response = await freteEntregaService.getRelatorio(params);
            const data = response.data;
            
            setEntregas(data.entregas?.data || data.entregas || []);
            setResumo(data.resumo || {});
            setPagination(data.entregas);
        } catch (error) {
            console.error('Erro ao carregar relatório:', error);
            toast({ 
                title: 'Erro ao carregar relatório', 
                description: 'Ocorreu um erro ao carregar o relatório de fretes.', 
                variant: 'destructive' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRelatorio();
    }, [dataInicio, dataFim, entregadorId, tipo, status, statusPagamento]);

    const handleMarcarComoPago = async () => {
        if (!entregaParaPagar) return;

        try {
            await freteEntregaService.marcarComoPago(entregaParaPagar.id, {
                data_pagamento: format(dataPagamento, 'yyyy-MM-dd'),
                forma_pagamento: formaPagamento,
            });
            
            toast({ title: 'Sucesso!', description: 'Entrega marcada como paga.' });
            setIsPagamentoModalOpen(false);
            setEntregaParaPagar(null);
            loadRelatorio(pagination?.current_page || 1);
        } catch (error) {
            console.error('Erro ao marcar como pago:', error);
            toast({ 
                title: 'Erro ao marcar como pago', 
                description: error.response?.data?.message || 'Ocorreu um erro.', 
                variant: 'destructive' 
            });
        }
    };

    const getStatusBadge = (status) => {
        const variants = {
            'pendente': { variant: 'secondary', icon: Clock, label: 'Pendente' },
            'entregue': { variant: 'default', icon: CheckCircle2, label: 'Entregue' },
            'cancelado': { variant: 'destructive', icon: XCircle, label: 'Cancelado' },
        };
        const config = variants[status] || variants.pendente;
        const Icon = config.icon;
        return (
            <Badge variant={config.variant}>
                <Icon size={12} className="mr-1" />
                {config.label}
            </Badge>
        );
    };

    const getStatusPagamentoBadge = (status) => {
        const variants = {
            'pendente': { variant: 'secondary', label: 'Pendente' },
            'pago': { variant: 'default', label: 'Pago' },
            'integrado_holerite': { variant: 'outline', label: 'Integrado Holerite' },
        };
        const config = variants[status] || variants.pendente;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                        <DollarSign size={28} className="text-primary" />
                        Relatório de Fretes
                    </CardTitle>
                    <CardDescription>
                        Relatório completo de entregas e pagamentos de fretes por período.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                        <div>
                            <Label>Data Início</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dataInicio && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={dataInicio}
                                        onSelect={setDataInicio}
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label>Data Fim</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dataFim && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={dataFim}
                                        onSelect={setDataFim}
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label>Entregador</Label>
                            <Select value={entregadorId} onValueChange={setEntregadorId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Todos</SelectItem>
                                    {entregadores.map(ent => (
                                        <SelectItem key={ent.id} value={ent.id.toString()}>{ent.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Tipo</Label>
                            <Select value={tipo} onValueChange={setTipo}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Todos</SelectItem>
                                    <SelectItem value="proprio">Próprio</SelectItem>
                                    <SelectItem value="terceirizado">Terceirizado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Todos</SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="entregue">Entregue</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Status Pagamento</Label>
                            <Select value={statusPagamento} onValueChange={setStatusPagamento}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Todos</SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="pago">Pago</SelectItem>
                                    <SelectItem value="integrado_holerite">Integrado Holerite</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Resumo */}
                    {resumo && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="text-sm text-muted-foreground">Total de Entregas</div>
                                    <div className="text-2xl font-bold">{resumo.total_entregas || 0}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="text-sm text-muted-foreground">Total Valor</div>
                                    <div className="text-2xl font-bold text-green-600">
                                        R$ {parseFloat(resumo.total_valor || 0).toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="text-sm text-muted-foreground">Total Pendente</div>
                                    <div className="text-2xl font-bold text-orange-600">
                                        R$ {parseFloat(resumo.total_pendente || 0).toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="text-sm text-muted-foreground">Total Pago</div>
                                    <div className="text-2xl font-bold text-blue-600">
                                        R$ {parseFloat(resumo.total_pago || 0).toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Tabela */}
                    <ScrollArea className="h-[calc(100vh-30rem)]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Pedido</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Local</TableHead>
                                    <TableHead>Entregador</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Pagamento</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-24 text-center">
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                                                <span>Carregando relatório...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : entregas.length > 0 ? (
                                    entregas.map(entrega => (
                                        <TableRow key={entrega.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                {entrega.data_entrega ? format(new Date(entrega.data_entrega), 'dd/MM/yyyy') : '-'}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                #{entrega.venda?.codigo || entrega.venda_id}
                                            </TableCell>
                                            <TableCell>
                                                {entrega.cliente?.nome_completo || entrega.cliente?.apelido_fantasia || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {entrega.bairro && `${entrega.bairro}, `}
                                                {entrega.cidade && `${entrega.cidade} - `}
                                                {entrega.estado || ''}
                                            </TableCell>
                                            <TableCell>{entrega.entregador?.nome || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={entrega.entregador?.tipo === 'proprio' ? 'default' : 'secondary'}>
                                                    {entrega.entregador?.tipo === 'proprio' ? 'Próprio' : 'Terceiro'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                R$ {parseFloat(entrega.valor_frete || 0).toFixed(2)}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(entrega.status)}</TableCell>
                                            <TableCell>{getStatusPagamentoBadge(entrega.status_pagamento)}</TableCell>
                                            <TableCell className="text-right">
                                                {entrega.status_pagamento === 'pendente' && entrega.entregador?.tipo === 'terceirizado' && (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => {
                                                            setEntregaParaPagar(entrega);
                                                            setIsPagamentoModalOpen(true);
                                                        }}
                                                    >
                                                        Marcar Pago
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                                            Nenhuma entrega encontrada para os filtros selecionados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>

                    {/* Paginação */}
                    {pagination && pagination.last_page > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                Mostrando {pagination.from} até {pagination.to} de {pagination.total} registros
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    disabled={pagination.current_page === 1}
                                    onClick={() => loadRelatorio(pagination.current_page - 1)}
                                >
                                    Anterior
                                </Button>
                                <span className="px-4 py-2 text-sm">
                                    Página {pagination.current_page} de {pagination.last_page}
                                </span>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    disabled={pagination.current_page === pagination.last_page}
                                    onClick={() => loadRelatorio(pagination.current_page + 1)}
                                >
                                    Próximo
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Pagamento */}
            <Dialog open={isPagamentoModalOpen} onOpenChange={setIsPagamentoModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Marcar Entrega como Paga</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label>Data do Pagamento</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dataPagamento && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dataPagamento ? format(dataPagamento, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={dataPagamento}
                                        onSelect={setDataPagamento}
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label>Forma de Pagamento</Label>
                            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PIX">PIX</SelectItem>
                                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                    <SelectItem value="Transferência">Transferência Bancária</SelectItem>
                                    <SelectItem value="Outro">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {entregaParaPagar && (
                            <div className="p-3 bg-muted rounded-md">
                                <div className="text-sm font-medium">Entrega #{entregaParaPagar.venda?.codigo || entregaParaPagar.venda_id}</div>
                                <div className="text-sm text-muted-foreground">
                                    Valor: R$ {parseFloat(entregaParaPagar.valor_frete || 0).toFixed(2)}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handleMarcarComoPago}>
                            Marcar como Pago
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RelatorioFretesPage;
