import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Truck, CheckCircle2, XCircle, Clock, Eye, MapPin, Route, FileText } from 'lucide-react';
import { romaneioService, entregadorService } from '@/services/api';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const RomaneiosPage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [romaneios, setRomaneios] = useState([]);
    const [romaneioSelecionado, setRomaneioSelecionado] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isConfirmacaoDialogOpen, setIsConfirmacaoDialogOpen] = useState(false);
    const [entregaParaConfirmar, setEntregaParaConfirmar] = useState(null);
    const [statusEntrega, setStatusEntrega] = useState('entregue');
    const [observacaoEntrega, setObservacaoEntrega] = useState('');
    const [motivoNaoEntrega, setMotivoNaoEntrega] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [entregadores, setEntregadores] = useState([]);
    
    // Filtros
    const [status, setStatus] = useState('');
    const [entregadorId, setEntregadorId] = useState('');
    const [dataInicio, setDataInicio] = useState(null);
    const [dataFim, setDataFim] = useState(null);

    useEffect(() => {
        loadEntregadores();
        loadRomaneios();
    }, [status, entregadorId, dataInicio, dataFim]);

    const loadEntregadores = async () => {
        try {
            const response = await entregadorService.getAtivos();
            // Garantir que sempre seja um array
            const dados = response.data?.data || response.data || [];
            setEntregadores(Array.isArray(dados) ? dados : []);
        } catch (error) {
            console.error('Erro ao carregar entregadores:', error);
            setEntregadores([]); // Garantir que seja array mesmo em caso de erro
        }
    };

    const loadRomaneios = async () => {
        try {
            setIsLoading(true);
            const params = {};
            if (status) params.status = status;
            if (entregadorId) params.entregador_id = entregadorId;
            if (dataInicio) params.data_inicio = format(dataInicio, 'yyyy-MM-dd');
            if (dataFim) params.data_fim = format(dataFim, 'yyyy-MM-dd');

            const response = await romaneioService.getAll(params);
            const data = response.data?.data || response.data || [];
            setRomaneios(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erro ao carregar romaneios:', error);
            toast({
                title: 'Erro ao carregar romaneios',
                description: 'Ocorreu um erro ao carregar os romaneios.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerDetalhes = async (romaneioId) => {
        try {
            const response = await romaneioService.getById(romaneioId);
            setRomaneioSelecionado(response.data?.data || response.data);
            setIsDialogOpen(true);
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
            toast({
                title: 'Erro ao carregar detalhes',
                description: 'Ocorreu um erro ao carregar os detalhes do romaneio.',
                variant: 'destructive'
            });
        }
    };

    const handleAtualizarStatus = async (romaneioId, novoStatus) => {
        try {
            await romaneioService.updateStatus(romaneioId, { status: novoStatus });
            toast({
                title: 'Status atualizado',
                description: 'O status do romaneio foi atualizado com sucesso.',
            });
            loadRomaneios();
            if (romaneioSelecionado?.id === romaneioId) {
                const response = await romaneioService.getById(romaneioId);
                setRomaneioSelecionado(response.data?.data || response.data);
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            toast({
                title: 'Erro ao atualizar status',
                description: error.response?.data?.message || 'Ocorreu um erro ao atualizar o status.',
                variant: 'destructive'
            });
        }
    };

    const handleAbrirConfirmacaoEntrega = (entrega) => {
        setEntregaParaConfirmar(entrega);
        setStatusEntrega('entregue');
        setObservacaoEntrega('');
        setMotivoNaoEntrega('');
        setIsConfirmacaoDialogOpen(true);
    };

    const handleConfirmarEntrega = async () => {
        if (!entregaParaConfirmar || !romaneioSelecionado) return;

        if (statusEntrega === 'nao_entregue' && !motivoNaoEntrega.trim()) {
            toast({
                title: 'Motivo obrigatório',
                description: 'Por favor, informe o motivo da não entrega.',
                variant: 'destructive'
            });
            return;
        }

        try {
            await romaneioService.confirmarEntrega(romaneioSelecionado.id, {
                romaneio_entrega_id: entregaParaConfirmar.id,
                status: statusEntrega,
                observacao: observacaoEntrega,
                motivo_nao_entrega: statusEntrega === 'nao_entregue' ? motivoNaoEntrega : null,
            });

            toast({
                title: 'Entrega confirmada',
                description: `A entrega foi marcada como ${statusEntrega === 'entregue' ? 'entregue' : 'não entregue'}.`,
            });

            setIsConfirmacaoDialogOpen(false);
            const response = await romaneioService.getById(romaneioSelecionado.id);
            setRomaneioSelecionado(response.data?.data || response.data);
            loadRomaneios();
        } catch (error) {
            console.error('Erro ao confirmar entrega:', error);
            toast({
                title: 'Erro ao confirmar entrega',
                description: error.response?.data?.message || 'Ocorreu um erro ao confirmar a entrega.',
                variant: 'destructive'
            });
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'aberto': { label: 'Aberto', variant: 'default', icon: Clock },
            'em_rota': { label: 'Em Rota', variant: 'secondary', icon: Route },
            'finalizado': { label: 'Finalizado', variant: 'default', icon: CheckCircle2 },
            'cancelado': { label: 'Cancelado', variant: 'destructive', icon: XCircle },
        };
        const statusInfo = statusMap[status] || statusMap['aberto'];
        const Icon = statusInfo.icon;
        return (
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {statusInfo.label}
            </Badge>
        );
    };

    const getStatusEntregaBadge = (status) => {
        const statusMap = {
            'pendente': { label: 'Pendente', variant: 'secondary', icon: Clock },
            'entregue': { label: 'Entregue', variant: 'default', icon: CheckCircle2 },
            'nao_entregue': { label: 'Não Entregue', variant: 'destructive', icon: XCircle },
            'cancelado': { label: 'Cancelado', variant: 'outline', icon: XCircle },
        };
        const statusInfo = statusMap[status] || statusMap['pendente'];
        const Icon = statusInfo.icon;
        return (
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {statusInfo.label}
            </Badge>
        );
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-6 w-6" />
                                Gestão de Romaneios
                            </CardTitle>
                            <CardDescription>
                                Visualize e gerencie os romaneios de entrega.
                            </CardDescription>
                        </div>
                        <Button onClick={() => navigate('/operacional/romaneio')}>
                            <FileText className="h-4 w-4 mr-2" />
                            Novo Romaneio
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <Label>Status</Label>
                            <Select value={status || undefined} onValueChange={(value) => setStatus(value === 'all' ? '' : value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="aberto">Aberto</SelectItem>
                                    <SelectItem value="em_rota">Em Rota</SelectItem>
                                    <SelectItem value="finalizado">Finalizado</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Entregador</Label>
                            <Select value={entregadorId || undefined} onValueChange={(value) => setEntregadorId(value === 'all' ? '' : value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {Array.isArray(entregadores) && entregadores.map(ent => (
                                        <SelectItem key={ent.id} value={ent.id.toString()}>
                                            {ent.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

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
                                        {dataInicio ? format(dataInicio, "PPP", { locale: ptBR }) : "Selecione"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={dataInicio}
                                        onSelect={setDataInicio}
                                        initialFocus
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
                                        {dataFim ? format(dataFim, "PPP", { locale: ptBR }) : "Selecione"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={dataFim}
                                        onSelect={setDataFim}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Tabela de Romaneios */}
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nº Romaneio</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Entregador</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Entregas</TableHead>
                                    <TableHead>Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            Carregando romaneios...
                                        </TableCell>
                                    </TableRow>
                                ) : romaneios.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            Nenhum romaneio encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    romaneios.map(romaneio => (
                                        <TableRow key={romaneio.id}>
                                            <TableCell className="font-medium">{romaneio.numero_romaneio}</TableCell>
                                            <TableCell>{format(new Date(romaneio.data_romaneio), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                                            <TableCell>{romaneio.entregador?.nome || '-'}</TableCell>
                                            <TableCell>{getStatusBadge(romaneio.status)}</TableCell>
                                            <TableCell>
                                                {romaneio.entregas_realizadas || 0} / {romaneio.quantidade_entregas || 0}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleVerDetalhes(romaneio.id)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {romaneio.status === 'aberto' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleAtualizarStatus(romaneio.id, 'em_rota')}
                                                        >
                                                            Iniciar Rota
                                                        </Button>
                                                    )}
                                                    {romaneio.status === 'em_rota' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleAtualizarStatus(romaneio.id, 'finalizado')}
                                                        >
                                                            Finalizar
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Dialog de Detalhes */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Romaneio - {romaneioSelecionado?.numero_romaneio}</DialogTitle>
                        <DialogDescription>
                            Data: {romaneioSelecionado && format(new Date(romaneioSelecionado.data_romaneio), 'dd/MM/yyyy', { locale: ptBR })}
                            {romaneioSelecionado?.entregador && ` | Entregador: ${romaneioSelecionado.entregador.nome}`}
                        </DialogDescription>
                    </DialogHeader>
                    {romaneioSelecionado && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Status</Label>
                                    <div>{getStatusBadge(romaneioSelecionado.status)}</div>
                                </div>
                                <div>
                                    <Label>Endereço Origem</Label>
                                    <p className="text-sm text-gray-600">{romaneioSelecionado.endereco_origem || '-'}</p>
                                </div>
                            </div>

                            {romaneioSelecionado.observacoes && (
                                <div>
                                    <Label>Observações</Label>
                                    <p className="text-sm text-gray-600">{romaneioSelecionado.observacoes}</p>
                                </div>
                            )}

                            <div>
                                <Label className="mb-2 block">Entregas</Label>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ordem</TableHead>
                                            <TableHead>Pedido</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Endereço</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {romaneioSelecionado.entregas?.map((entrega) => (
                                            <TableRow key={entrega.id}>
                                                <TableCell>{entrega.ordem_entrega}</TableCell>
                                                <TableCell className="font-medium">
                                                    {entrega.venda?.codigo || entrega.venda_id}
                                                </TableCell>
                                                <TableCell>
                                                    {entrega.venda?.cliente?.nome_completo || entrega.venda?.cliente?.nome || '-'}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {entrega.venda?.cliente?.endereco_completo || '-'}
                                                </TableCell>
                                                <TableCell>{getStatusEntregaBadge(entrega.status)}</TableCell>
                                                <TableCell>
                                                    {entrega.status === 'pendente' && romaneioSelecionado.status === 'em_rota' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleAbrirConfirmacaoEntrega(entrega)}
                                                        >
                                                            Confirmar
                                                        </Button>
                                                    )}
                                                    {entrega.status === 'entregue' && entrega.data_hora_entrega && (
                                                        <p className="text-xs text-gray-500">
                                                            {format(new Date(entrega.data_hora_entrega), 'dd/MM/yyyy HH:mm')}
                                                        </p>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog de Confirmação de Entrega */}
            <Dialog open={isConfirmacaoDialogOpen} onOpenChange={setIsConfirmacaoDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Entrega</DialogTitle>
                        <DialogDescription>
                            Pedido: {entregaParaConfirmar?.venda?.codigo || entregaParaConfirmar?.venda_id}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Status</Label>
                            <Select value={statusEntrega} onValueChange={setStatusEntrega}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="entregue">Entregue</SelectItem>
                                    <SelectItem value="nao_entregue">Não Entregue</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {statusEntrega === 'nao_entregue' && (
                            <div>
                                <Label>Motivo da Não Entrega *</Label>
                                <Textarea
                                    placeholder="Informe o motivo..."
                                    value={motivoNaoEntrega}
                                    onChange={(e) => setMotivoNaoEntrega(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        )}

                        <div>
                            <Label>Observação</Label>
                            <Textarea
                                placeholder="Observações adicionais..."
                                value={observacaoEntrega}
                                onChange={(e) => setObservacaoEntrega(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmacaoDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleConfirmarEntrega}>
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RomaneiosPage;
