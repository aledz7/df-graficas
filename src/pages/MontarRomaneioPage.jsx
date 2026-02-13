import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Truck, MapPin, Route, CheckCircle2, XCircle, Filter, FileText, Map } from 'lucide-react';
import { romaneioService, entregadorService, empresaService } from '@/services/api';
import { cn } from '@/lib/utils';

const MontarRomaneioPage = () => {
    const { toast } = useToast();
    const [pedidos, setPedidos] = useState([]);
    const [pedidosSelecionados, setPedidosSelecionados] = useState([]);
    const [entregadores, setEntregadores] = useState([]);
    const [enderecoOrigem, setEnderecoOrigem] = useState('');
    const [rotaSugerida, setRotaSugerida] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCalculandoRota, setIsCalculandoRota] = useState(false);
    
    // Filtros
    const [dataEntrega, setDataEntrega] = useState(new Date());
    const [filtroData, setFiltroData] = useState('hoje');
    const [bairro, setBairro] = useState('');
    const [cidade, setCidade] = useState('');
    const [entregadorId, setEntregadorId] = useState('');
    const [observacoes, setObservacoes] = useState('');

    useEffect(() => {
        loadEntregadores();
        loadEnderecoOrigem();
    }, []);

    useEffect(() => {
        loadPedidosDisponiveis();
    }, [filtroData, dataEntrega, bairro, cidade, entregadorId]);

    const loadEntregadores = async () => {
        try {
            const response = await entregadorService.getAtivos();
            setEntregadores(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar entregadores:', error);
        }
    };

    const loadEnderecoOrigem = async () => {
        try {
            const response = await empresaService.get();
            const empresa = response.data?.data || response.data;
            setEnderecoOrigem(empresa?.endereco_grafica || empresa?.endereco_completo || '');
        } catch (error) {
            console.error('Erro ao carregar endereço da gráfica:', error);
        }
    };

    const loadPedidosDisponiveis = async () => {
        try {
            setIsLoading(true);
            const params = {};

            if (filtroData === 'hoje') {
                params.data_entrega = format(new Date(), 'yyyy-MM-dd');
            } else if (filtroData === 'amanha') {
                const amanha = new Date();
                amanha.setDate(amanha.getDate() + 1);
                params.data_entrega = format(amanha, 'yyyy-MM-dd');
            } else if (filtroData === 'outro' && dataEntrega) {
                params.data_entrega = format(dataEntrega, 'yyyy-MM-dd');
            }

            if (bairro) params.bairro = bairro;
            if (cidade) params.cidade = cidade;
            if (entregadorId) params.entregador_id = entregadorId;

            const response = await romaneioService.getPedidosDisponiveis(params);
            setPedidos(response.data || []);
        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
            toast({
                title: 'Erro ao carregar pedidos',
                description: 'Ocorreu um erro ao carregar os pedidos disponíveis.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelecionarPedido = (pedidoId) => {
        setPedidosSelecionados(prev => {
            if (prev.includes(pedidoId)) {
                return prev.filter(id => id !== pedidoId);
            }
            return [...prev, pedidoId];
        });
    };

    const handleSelecionarTodos = (checked) => {
        if (checked) {
            setPedidosSelecionados(pedidos.map(p => p.id));
        } else {
            setPedidosSelecionados([]);
        }
    };

    const handleCalcularRota = async () => {
        if (pedidosSelecionados.length === 0) {
            toast({
                title: 'Nenhum pedido selecionado',
                description: 'Selecione pelo menos um pedido para calcular a rota.',
                variant: 'destructive'
            });
            return;
        }

        try {
            setIsCalculandoRota(true);
            const response = await romaneioService.calcularRota({
                venda_ids: pedidosSelecionados,
                endereco_origem: enderecoOrigem,
            });
            setRotaSugerida(response.data || null);
        } catch (error) {
            console.error('Erro ao calcular rota:', error);
            toast({
                title: 'Erro ao calcular rota',
                description: 'Ocorreu um erro ao calcular a rota sugerida.',
                variant: 'destructive'
            });
        } finally {
            setIsCalculandoRota(false);
        }
    };

    const handleGerarRomaneio = async () => {
        if (pedidosSelecionados.length === 0) {
            toast({
                title: 'Nenhum pedido selecionado',
                description: 'Selecione pelo menos um pedido para gerar o romaneio.',
                variant: 'destructive'
            });
            return;
        }

        try {
            setIsLoading(true);
            const response = await romaneioService.create({
                entregador_id: entregadorId || null,
                data_romaneio: format(dataEntrega, 'yyyy-MM-dd'),
                venda_ids: pedidosSelecionados,
                rota_sugerida: rotaSugerida?.paradas || null,
                observacoes: observacoes,
            });

            toast({
                title: 'Romaneio criado com sucesso!',
                description: `Romaneio ${response.data?.data?.numero_romaneio || ''} criado com ${pedidosSelecionados.length} entrega(s).`,
            });

            // Limpar seleção e recarregar
            setPedidosSelecionados([]);
            setRotaSugerida(null);
            setObservacoes('');
            loadPedidosDisponiveis();
        } catch (error) {
            console.error('Erro ao gerar romaneio:', error);
            toast({
                title: 'Erro ao gerar romaneio',
                description: error.response?.data?.message || 'Ocorreu um erro ao gerar o romaneio.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const todosSelecionados = pedidos.length > 0 && pedidosSelecionados.length === pedidos.length;
    const algunsSelecionados = pedidosSelecionados.length > 0 && pedidosSelecionados.length < pedidos.length;

    return (
        <div className="container mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="h-6 w-6" />
                        Montar Romaneio de Entrega
                    </CardTitle>
                    <CardDescription>
                        Selecione os pedidos para montar um romaneio de entregas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <Label>Período</Label>
                            <Select value={filtroData} onValueChange={setFiltroData}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hoje">Hoje</SelectItem>
                                    <SelectItem value="amanha">Amanhã</SelectItem>
                                    <SelectItem value="outro">Outro Período</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {filtroData === 'outro' && (
                            <div>
                                <Label>Data</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !dataEntrega && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dataEntrega ? format(dataEntrega, "PPP", { locale: ptBR }) : "Selecione a data"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={dataEntrega}
                                            onSelect={setDataEntrega}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}

                        <div>
                            <Label>Bairro</Label>
                            <Input
                                placeholder="Filtrar por bairro"
                                value={bairro}
                                onChange={(e) => setBairro(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Cidade</Label>
                            <Input
                                placeholder="Filtrar por cidade"
                                value={cidade}
                                onChange={(e) => setCidade(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Entregador</Label>
                            <Select value={entregadorId || undefined} onValueChange={(value) => setEntregadorId(value === 'all' ? '' : value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {entregadores.map(ent => (
                                        <SelectItem key={ent.id} value={ent.id.toString()}>
                                            {ent.nome} ({ent.tipo === 'proprio' ? 'Próprio' : 'Terceirizado'})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Endereço Origem */}
                    {enderecoOrigem && (
                        <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                            <MapPin className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div>
                                <Label className="text-sm font-medium">Endereço origem (gráfica)</Label>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{enderecoOrigem}</p>
                            </div>
                        </div>
                    )}

                    {/* Tabela de Pedidos */}
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={todosSelecionados}
                                            onCheckedChange={handleSelecionarTodos}
                                            ref={(el) => {
                                                if (el) el.indeterminate = algunsSelecionados;
                                            }}
                                        />
                                    </TableHead>
                                    <TableHead># Pedido</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Bairro / Cidade</TableHead>
                                    <TableHead>Taxa de Entrega</TableHead>
                                    <TableHead>Observações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            Carregando pedidos...
                                        </TableCell>
                                    </TableRow>
                                ) : pedidos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            Nenhum pedido disponível para os filtros selecionados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pedidos.map(pedido => (
                                        <TableRow key={pedido.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={pedidosSelecionados.includes(pedido.id)}
                                                    onCheckedChange={() => handleSelecionarPedido(pedido.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{pedido.codigo_venda}</TableCell>
                                            <TableCell>
                                                {pedido.cliente?.nome}
                                                {pedido.endereco?.endereco_completo && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {pedido.endereco.endereco_completo}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {pedido.endereco?.bairro || 'N/A'} / {pedido.endereco?.cidade || 'N/A'}
                                            </TableCell>
                                            <TableCell>R$ {parseFloat(pedido.valor_frete || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {pedido.observacoes || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Rota Sugerida */}
                    {rotaSugerida && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Route className="h-5 w-5" />
                                    Sugestão de Rota Otimizada
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {rotaSugerida.paradas?.map((parada, index) => (
                                        <div key={index} className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                            <Badge variant="outline" className="mt-1">
                                                {parada.ordem}
                                            </Badge>
                                            <div className="flex-1">
                                                <p className="font-medium">{parada.cliente}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {parada.endereco} - {parada.bairro}, {parada.cidade}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {rotaSugerida.distancia_estimada_km && (
                                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                                        <p className="text-sm">
                                            Distância total: {rotaSugerida.distancia_estimada_km} km - 
                                            Tempo estimado: {rotaSugerida.tempo_estimado_minutos} min
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Observações e Ações */}
                    <div className="space-y-4">
                        <div>
                            <Label>Observações do Romaneio</Label>
                            <Textarea
                                placeholder="Observações gerais sobre o romaneio..."
                                value={observacoes}
                                onChange={(e) => setObservacoes(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={handleCalcularRota}
                                disabled={pedidosSelecionados.length === 0 || isCalculandoRota}
                                variant="outline"
                            >
                                <Route className="h-4 w-4 mr-2" />
                                {isCalculandoRota ? 'Calculando...' : 'Calcular Rota'}
                            </Button>
                            <Button
                                onClick={handleGerarRomaneio}
                                disabled={pedidosSelecionados.length === 0 || isLoading}
                                className="flex-1"
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Selecionar e Gerar Romaneio ({pedidosSelecionados.length})
                            </Button>
                        </div>

                        {pedidosSelecionados.length > 0 && (
                            <p className="text-sm text-gray-600">
                                Mostrando de 1 até {pedidos.length} de {pedidos.length} registros. 
                                {pedidosSelecionados.length} selecionado(s).
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default MontarRomaneioPage;
