import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Package, 
    Search, 
    Filter, 
    CheckCircle, 
    XCircle, 
    Clock, 
    User, 
    Phone, 
    Mail, 
    MapPin,
    ShoppingCart,
    Eye,
    Check,
    X,
    RotateCcw,
    Send,
    Download
} from 'lucide-react';
import { vendaPreVendaService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PedidosPreVendaPage = () => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedPedido, setSelectedPedido] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadPedidos();
    }, []);

    const loadPedidos = async () => {
        setLoading(true);
        try {
            const response = await vendaPreVendaService.getAll({
                search: searchTerm,
                status: statusFilter !== 'all' ? statusFilter : undefined
            });
            
            const vendasData = response.data?.data?.data || response.data?.data || response.data || [];
            setPedidos(Array.isArray(vendasData) ? vendasData : []);
        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
            toast({
                title: 'Erro ao carregar pedidos',
                description: 'Não foi possível carregar as vendas de pré-venda.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        loadPedidos();
    };

    const handleStatusFilter = (status) => {
        setStatusFilter(status);
        loadPedidos();
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pre_venda: { variant: 'secondary', icon: Clock, text: 'Pré-venda' },
            finalizada: { variant: 'default', icon: CheckCircle, text: 'Finalizada' },
            cancelada: { variant: 'destructive', icon: XCircle, text: 'Cancelada' },
            aberta: { variant: 'outline', icon: Clock, text: 'Aberta' },
            estornada: { variant: 'outline', icon: X, text: 'Estornada' }
        };

        const config = statusConfig[status] || statusConfig.pre_venda;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {config.text}
            </Badge>
        );
    };

    const handleAprovar = async (pedidoId) => {
        try {
            await vendaPreVendaService.approve(pedidoId);
            toast({
                title: 'Pedido aprovado',
                description: 'O pedido foi aprovado com sucesso.',
            });
            loadPedidos();
            setShowActions(false);
        } catch (error) {
            console.error('Erro ao aprovar pedido:', error);
            toast({
                title: 'Erro ao aprovar pedido',
                description: 'Não foi possível aprovar o pedido.',
                variant: 'destructive'
            });
        }
    };

    const handleRejeitar = async (pedidoId) => {
        try {
            await vendaPreVendaService.reject(pedidoId);
            toast({
                title: 'Pedido rejeitado',
                description: 'O pedido foi rejeitado com sucesso.',
            });
            loadPedidos();
            setShowActions(false);
        } catch (error) {
            console.error('Erro ao rejeitar pedido:', error);
            toast({
                title: 'Erro ao rejeitar pedido',
                description: 'Não foi possível rejeitar o pedido.',
                variant: 'destructive'
            });
        }
    };

    const handleCancelar = async (pedidoId) => {
        try {
            await vendaPreVendaService.cancel(pedidoId);
            toast({
                title: 'Pedido cancelado',
                description: 'O pedido foi cancelado com sucesso.',
            });
            loadPedidos();
            setShowActions(false);
        } catch (error) {
            console.error('Erro ao cancelar pedido:', error);
            toast({
                title: 'Erro ao cancelar pedido',
                description: 'Não foi possível cancelar o pedido.',
                variant: 'destructive'
            });
        }
    };

    const handleConverterParaPDV = async (pedidoId) => {
        try {
            // Aprovar o pedido primeiro
            await vendaPreVendaService.approve(pedidoId);
            
            // Redirecionar para o PDV com os dados do pedido
            const pedido = pedidos.find(p => p.id === pedidoId);
            if (pedido) {
                // Preparar dados para o PDV
                const orcamentoData = {
                    id: pedido.id,
                    itens: pedido.itens?.map(item => ({
                        id_produto: item.produto_id,
                        nome: item.nome,
                        quantidade: item.quantidade,
                        preco_venda_aplicado: item.preco_unitario,
                        preco_venda_unitario: item.preco_unitario,
                        imagem_principal: item.produto?.imagem_principal,
                        variacao: item.variacao
                    })) || [],
                    clienteId: pedido.cliente?.id,
                    clienteNome: pedido.cliente?.nome || pedido.cliente?.nome_completo,
                    obs_pedido: `Pedido convertido do catálogo público - ${pedido.observacoes || ''}`,
                    descontoTipo: 'nenhum',
                    descontoValor: 0
                };

                // Salvar dados no localStorage para o PDV
                localStorage.setItem('orcamentoParaConversao', JSON.stringify(orcamentoData));
                
                // Redirecionar para o PDV
                window.location.href = '/pdv';
            }
            
            toast({
                title: 'Pedido aprovado',
                description: 'O pedido foi aprovado e está sendo carregado no PDV.',
            });
            
            loadPedidos();
            setShowActions(false);
        } catch (error) {
            console.error('Erro ao converter pedido para PDV:', error);
            toast({
                title: 'Erro ao converter pedido',
                description: 'Não foi possível converter o pedido para o PDV.',
                variant: 'destructive'
            });
        }
    };

    const handleEnviarWhatsApp = async (pedidoId) => {
        try {
            const response = await vendaPreVendaService.enviarPedido(pedidoId, 'whatsapp');
            if (response.whatsapp_url) {
                window.open(response.whatsapp_url, '_blank');
            }
            toast({
                title: 'WhatsApp aberto',
                description: 'O WhatsApp foi aberto com a mensagem do pedido.',
            });
        } catch (error) {
            console.error('Erro ao enviar WhatsApp:', error);
            toast({
                title: 'Erro ao enviar WhatsApp',
                description: 'Não foi possível enviar a mensagem via WhatsApp.',
                variant: 'destructive'
            });
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Vendas de Pré-venda</h1>
                    <p className="text-muted-foreground">Gerencie os pedidos recebidos através do catálogo público</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={loadPedidos}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por código, cliente, telefone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={statusFilter} onValueChange={handleStatusFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                <SelectItem value="pre_venda">Pré-venda</SelectItem>
                                <SelectItem value="finalizada">Finalizada</SelectItem>
                                <SelectItem value="cancelada">Cancelada</SelectItem>
                                <SelectItem value="aberta">Aberta</SelectItem>
                                <SelectItem value="estornada">Estornada</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={handleSearch}>
                            <Search className="h-4 w-4 mr-2" />
                            Buscar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela de Pedidos */}
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-2 text-muted-foreground">Carregando pedidos...</p>
                        </div>
                    ) : pedidos.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Contato</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Origem</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pedidos.map((pedido) => (
                                        <TableRow key={pedido.id}>
                                            <TableCell className="font-mono">{pedido.codigo}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{pedido.cliente_nome}</div>
                                                    {pedido.cliente_email && (
                                                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                            <Mail className="h-3 w-3" />
                                                            {pedido.cliente_email}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    {pedido.cliente_telefone}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {formatCurrency(pedido.valor_total)}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(pedido.status)}
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(pedido.data_emissao)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {pedido.metadados?.origem || 'Catálogo Público'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedPedido(pedido);
                                                            setShowDetails(true);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {pedido.status === 'pre_venda' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedPedido(pedido);
                                                                setShowActions(true);
                                                            }}
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {pedido.cliente_telefone && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEnviarWhatsApp(pedido.id)}
                                                        >
                                                            <Send className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-2 text-sm font-medium text-foreground">Nenhum pedido encontrado</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {searchTerm || statusFilter !== 'all' 
                                    ? 'Tente ajustar os filtros de busca.' 
                                    : 'Ainda não há vendas de pré-venda.'}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Detalhes */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Pedido</DialogTitle>
                    </DialogHeader>
                    {selectedPedido && (
                        <ScrollArea className="max-h-96">
                            <div className="space-y-6">
                                {/* Informações do Cliente */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        Informações do Cliente
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium">Nome</label>
                                            <p className="text-sm text-muted-foreground">{selectedPedido.cliente_nome}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Telefone</label>
                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                {selectedPedido.cliente_telefone}
                                            </p>
                                        </div>
                                        {selectedPedido.cliente_email && (
                                            <div>
                                                <label className="text-sm font-medium">Email</label>
                                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />
                                                    {selectedPedido.cliente_email}
                                                </p>
                                            </div>
                                        )}
                                        {selectedPedido.cliente_endereco && (
                                            <div className="md:col-span-2">
                                                <label className="text-sm font-medium">Endereço</label>
                                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {selectedPedido.cliente_endereco}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Itens do Pedido */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <ShoppingCart className="h-5 w-5" />
                                        Itens do Pedido
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedPedido.dados_itens?.map((item, index) => (
                                            <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                                                <div>
                                                    <p className="font-medium">{item.nome}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Qtd: {item.quantidade} x {formatCurrency(item.preco_unitario)}
                                                    </p>
                                                </div>
                                                <p className="font-medium">{formatCurrency(item.preco_total)}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-4 border-t">
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-semibold">Total</span>
                                            <span className="text-lg font-bold">{formatCurrency(selectedPedido.total)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Informações Adicionais */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Informações Adicionais</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium">Status</label>
                                            <div className="mt-1">{getStatusBadge(selectedPedido.status)}</div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Origem</label>
                                            <p className="text-sm text-muted-foreground">{selectedPedido.origem}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Data do Pedido</label>
                                            <p className="text-sm text-muted-foreground">{formatDate(selectedPedido.data_pedido)}</p>
                                        </div>
                                        {selectedPedido.observacoes && (
                                            <div className="md:col-span-2">
                                                <label className="text-sm font-medium">Observações</label>
                                                <p className="text-sm text-muted-foreground">{selectedPedido.observacoes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Ações */}
            <Dialog open={showActions} onOpenChange={setShowActions}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ações do Pedido</DialogTitle>
                    </DialogHeader>
                    {selectedPedido && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Escolha uma ação para o pedido <strong>{selectedPedido.codigo}</strong>
                            </p>
                            <div className="grid grid-cols-1 gap-3">
                                <Button
                                    onClick={() => handleConverterParaPDV(selectedPedido.id)}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    <ShoppingCart className="h-4 w-4 mr-2" />
                                    Converter para PDV
                                </Button>
                                <Button
                                    onClick={() => handleAprovar(selectedPedido.id)}
                                    className="w-full"
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    Aprovar Pedido
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleRejeitar(selectedPedido.id)}
                                    className="w-full"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Rejeitar Pedido
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleCancelar(selectedPedido.id)}
                                    className="w-full"
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Cancelar Pedido
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PedidosPreVendaPage; 