import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, startOfDay, endOfDay, isValid, startOfToday, endOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, FileDown, Calendar as CalendarIcon, Trash2, Eye } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { exportToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DeleteWithJustificationModal from '@/components/utils/DeleteWithJustificationModal.jsx';
import { useAuditoria } from '@/hooks/useAuditoria';
import { moverParaLixeiraPDV } from '@/hooks/pdv/pdvDataService';
import { moverParaLixeiraOS } from '@/hooks/os/osDataService';
import { apiDataManager } from '@/lib/apiDataManager';
import { vendaService } from '@/services/api';

const RelatorioVendas = ({ vendedorAtual }) => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { registrarAcao } = useAuditoria();
    const [vendas, setVendas] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ from: startOfToday(), to: endOfToday() });
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const carregarVendas = async () => {
        try {
            setIsLoading(true);
            
            const allVendas = [];

            // Carregar vendas da API
            try {
                const responseVendas = await vendaService.getAll();
                const vendasData = responseVendas.data?.data?.data || responseVendas.data?.data || responseVendas.data || [];
                
                const vendasFormatadas = vendasData.map(venda => ({
                    id: venda.id,
                    data: venda.data_venda && isValid(parseISO(venda.data_venda)) ? parseISO(venda.data_venda) : 
                           venda.created_at && isValid(parseISO(venda.created_at)) ? parseISO(venda.created_at) : null,
                    clienteNome: venda.cliente?.nome_completo || venda.cliente?.apelido_fantasia || venda.cliente?.nome || 'Consumidor Final',
                    total: parseFloat(venda.valor_total || venda.total || 0),
                    tipo: 'PDV',
                    vendedor: venda.vendedor?.nome_completo || venda.vendedor?.nome || venda.usuario?.name || 'N/A',
                    itens: venda.itens || [],
                    observacoes: venda.observacoes || '',
                    status_original: venda.status || 'finalizada',
                    codigo: venda.codigo || venda.id,
                    forma_pagamento: venda.forma_pagamento || 'Não informado',
                    cliente_id: venda.cliente_id,
                    usuario_id: venda.usuario_id,
                }));

                allVendas.push(...vendasFormatadas);
            } catch (error) {
                console.error('Erro ao carregar vendas da API:', error);
            }

            // Carregar ordens de serviço da API (se houver endpoint específico)
            try {
                const responseOS = await fetch('/api/ordens-servico').catch(() => null);
                if (responseOS && responseOS.ok) {
                    const osData = await responseOS.json();
                    const ordensServico = osData.data?.data?.data || osData.data?.data || osData.data || [];
                    
                    const osFinalizadas = ordensServico
                        .filter(os => (os.status === 'Finalizada' || os.status === 'Entregue' || os.status_os === 'Finalizada' || os.status_os === 'Entregue') && 
                                     (os.data_finalizacao || os.created_at))
                        .map(os => ({
                            id: os.id || os.id_os,
                            data: os.data_finalizacao && isValid(parseISO(os.data_finalizacao)) ? parseISO(os.data_finalizacao) :
                                   os.created_at && isValid(parseISO(os.created_at)) ? parseISO(os.created_at) : null,
                            clienteNome: os.cliente?.nome_completo || os.cliente?.apelido_fantasia || os.cliente?.nome || os.cliente_nome_manual || 'N/A',
                            total: parseFloat(os.valor_total_os || os.valor_total || os.total || 0),
                            tipo: 'OS',
                            vendedor: os.vendedor?.nome_completo || os.vendedor?.nome || os.usuario?.name || 'N/A',
                            itens: os.itens || [],
                            observacoes: os.observacoes || '',
                            status_original: os.status || os.status_os || 'Finalizada',
                            codigo: os.codigo || os.id,
                            cliente_id: os.cliente_id,
                            usuario_id: os.usuario_id,
                        }));

                    allVendas.push(...osFinalizadas);
                }
            } catch (error) {
                console.error('Erro ao carregar ordens de serviço da API:', error);
            }

            // Ordenar por data (mais recente primeiro) e filtrar apenas vendas com data válida
            const vendasOrdenadas = allVendas
                .filter(v => v.data && isValid(v.data))
                .sort((a, b) => b.data - a.data);
                
            setVendas(vendasOrdenadas);
            
        } catch (error) {
            console.error("Erro ao carregar dados para o relatório de vendas: ", error);
            toast({ 
                title: "Erro de Dados", 
                description: "Não foi possível carregar os dados das vendas da API. Verifique o console para mais detalhes.", 
                variant: "destructive" 
            });
            setVendas([]);
        } finally {
            setIsLoading(false);
        }
    }

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
        carregarVendas();
    }, [toast]);

    const filteredVendas = useMemo(() => {
        return vendas.filter(venda => {
            if (!venda.data || !isValid(venda.data)) return false;
            const lowerSearchTerm = searchTerm.toLowerCase();

            const searchMatch = (venda.clienteNome || '').toLowerCase().includes(lowerSearchTerm) ||
                                (venda.id || '').toString().toLowerCase().includes(lowerSearchTerm) ||
                                (venda.codigo || '').toString().toLowerCase().includes(lowerSearchTerm) ||
                                (venda.vendedor || '').toLowerCase().includes(lowerSearchTerm) ||
                                (venda.observacoes || '').toLowerCase().includes(lowerSearchTerm) ||
                                (venda.itens && Array.isArray(venda.itens) && venda.itens.some(item => 
                                    (item.nome?.toLowerCase() || 
                                     item.nome_servico_produto?.toLowerCase() || 
                                     item.nome_produto?.toLowerCase() || 
                                     item.produto_nome?.toLowerCase() || '').includes(lowerSearchTerm)
                                ));

            const dateMatch = (!dateRange.from || venda.data >= startOfDay(dateRange.from)) &&
                              (!dateRange.to || venda.data <= endOfDay(dateRange.to));

            return searchMatch && dateMatch;
        });
    }, [vendas, searchTerm, dateRange]);

    const totais = useMemo(() => {
        const total = filteredVendas.reduce((acc, venda) => acc + (parseFloat(venda.total) || 0), 0);
        const totalPDV = filteredVendas.filter(v => v.tipo === 'PDV').reduce((acc, venda) => acc + (parseFloat(venda.total) || 0), 0);
        const totalOS = filteredVendas.filter(v => v.tipo === 'OS').reduce((acc, venda) => acc + (parseFloat(venda.total) || 0), 0);
        return { total, totalPDV, totalOS };
    }, [filteredVendas]);

    const handleExportPdf = () => {
        const headers = ["ID", "Data", "Tipo", "Cliente", "Vendedor", "Total (R$)"];
        const data = filteredVendas.map(v => [
            v.codigo || v.id.toString().slice(-6),
            v.data ? format(v.data, 'dd/MM/yyyy HH:mm') : 'N/A',
            v.tipo || 'N/A',
            v.clienteNome || 'N/A',
            v.vendedor || 'N/A',
            (v.total || 0).toFixed(2)
        ]);
        const summary = [
            { label: 'Total de Vendas', value: `R$ ${totais.total.toFixed(2)}` },
            { label: 'Total PDV', value: `R$ ${totais.totalPDV.toFixed(2)}` },
            { label: 'Total OS', value: `R$ ${totais.totalOS.toFixed(2)}` },
            { label: 'Quantidade de Vendas', value: filteredVendas.length }
        ];
        exportToPdf('Relatório de Vendas', headers, data, summary, logoUrl, empresaSettings.nomeFantasia);
    };
    
    const handleDelete = (venda) => {
        setItemToDelete(venda);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = (justificativa) => {
        if (!itemToDelete) return;
        
        const itemDataCompleto = vendas.find(v => v.id === itemToDelete.id && v.tipo === itemToDelete.tipo);

        if (!itemDataCompleto) {
            toast({ title: "Erro", description: "Não foi possível encontrar os dados completos do item para exclusão.", variant: "destructive" });
            return;
        }

        const itemParaLixeira = {
            id: itemDataCompleto.id,
            tipo: itemDataCompleto.tipo, 
            itens: itemDataCompleto.itens,
            status_os: itemDataCompleto.status_original, 
            status: itemDataCompleto.status_original, 
        };

        if (itemToDelete.tipo === 'PDV') {
            moverParaLixeiraPDV(itemParaLixeira, justificativa, vendedorAtual, registrarAcao);
        } else if (itemToDelete.tipo === 'OS') {
            moverParaLixeiraOS(itemParaLixeira, justificativa, vendedorAtual, registrarAcao);
        }
        
        toast({ title: "Item Movido para Lixeira", description: `O item ${itemToDelete.codigo || itemToDelete.id.toString().slice(-6)} foi movido para a lixeira.`});
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
        carregarVendas(); 
    };

    const handleViewDocument = (venda) => {
        if (venda.tipo === 'PDV') {
            navigate(`/pdv/recibo/${venda.id}`);
        } else if (venda.tipo === 'OS') {
            navigate('/operacional/ordens-servico', { state: { osId: venda.id, viewOnly: true } });
        }
    };

    if (isLoading) {
        return (
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle>Relatório de Vendas</CardTitle>
                    <CardDescription>Carregando dados...</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-32">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Carregando vendas...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Relatório de Vendas</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">Analise todas as vendas do PDV e Ordens de Serviço finalizadas.</CardDescription>
                    </div>
                    <Button onClick={handleExportPdf} disabled={filteredVendas.length === 0}>
                        <FileDown className="mr-2 h-4 w-4" /> Gerar PDF
                    </Button>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar cliente, ID, vendedor, produto, obs..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="pl-10" 
                        />
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-full sm:w-[280px] justify-start text-left font-normal",
                                    !dateRange.from && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.from && isValid(dateRange.from) ? (
                                    dateRange.to && isValid(dateRange.to) ? (
                                        <>{format(dateRange.from, "dd/MM/yy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}</>
                                    ) : (
                                        format(dateRange.from, "dd/MM/yy", { locale: ptBR })
                                    )
                                ) : (
                                    <span>Selecione um período</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange.from || new Date()}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                                locale={ptBR}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <ScrollArea className="h-[calc(100vh-25rem)]">
                    {/* Layout Mobile - Cards */}
                    <div className="md:hidden">
                        {filteredVendas.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Search size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                <p>Nenhuma venda encontrada para os filtros aplicados.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredVendas.map(venda => (
                                    <motion.div
                                        key={venda.id + venda.tipo}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-sm">ID: {venda.codigo || (venda.id ? venda.id.toString().slice(-6) : 'N/A')}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-xs">
                                                        {venda.tipo || 'N/A'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="text-right ml-3">
                                                <p className="text-lg font-bold text-green-600">
                                                    R$ {(venda.total || 0).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Cliente</p>
                                                    <p className="text-sm break-words">{venda.clienteNome || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Vendedor</p>
                                                    <p className="text-sm break-words">{venda.vendedor || 'N/A'}</p>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <p className="text-xs text-muted-foreground">Data</p>
                                                <p className="text-sm">
                                                    {venda.data ? format(venda.data, 'dd/MM/yyyy HH:mm') : 'N/A'}
                                                </p>
                                            </div>
                                            
                                            <div className="flex gap-2 pt-2 border-t">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => handleViewDocument(venda)}
                                                    className="flex-1"
                                                >
                                                    <Eye size={14} className="mr-1"/>
                                                    Visualizar
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => handleDelete(venda)}
                                                    className="flex-1 text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 size={14} className="mr-1"/>
                                                    Excluir
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Layout Desktop - Tabela */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Vendedor</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredVendas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                            Nenhuma venda encontrada para os filtros aplicados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredVendas.map(venda => (
                                        <TableRow key={venda.id + venda.tipo}>
                                            <TableCell className="font-mono">
                                                {venda.codigo || (venda.id ? venda.id.toString().slice(-6) : 'N/A')}
                                            </TableCell>
                                            <TableCell>
                                                {venda.data ? format(venda.data, 'dd/MM/yyyy HH:mm') : 'N/A'}
                                            </TableCell>
                                            <TableCell>{venda.tipo || 'N/A'}</TableCell>
                                            <TableCell>{venda.clienteNome || 'N/A'}</TableCell>
                                            <TableCell>{venda.vendedor || 'N/A'}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                R$ {(venda.total || 0).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleViewDocument(venda)} title="Visualizar">
                                                    <Eye className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(venda)} title="Mover para Lixeira">
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
            </CardContent>
            <DeleteWithJustificationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Mover para Lixeira"
                description={`Tem certeza que deseja mover o item "${itemToDelete?.codigo || itemToDelete?.id?.toString().slice(-6)}" para a lixeira? Esta ação requer uma justificativa e senha de supervisor.`}
                requirePassword={true}
                vendedorAtual={vendedorAtual}
            />
        </Card>
    );
};

export default RelatorioVendas;