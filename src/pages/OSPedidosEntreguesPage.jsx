import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Truck, Calendar, User, DollarSign, Eye, FileText, PackageCheck, UserCheck, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import OSEntregaReciboModal from '@/components/os/entrega/OSEntregaReciboModal';
import OSAnexosThumbnail from '@/components/os/entrega/OSAnexosThumbnail';
import EmitirNotaFiscalModal from '@/components/os/EmitirNotaFiscalModal';
import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';
import { osService, empresaService } from '@/services/api';

const OSPedidosEntreguesPage = () => {
    const [pedidosEntregues, setPedidosEntregues] = useState([]);
    const [filteredPedidos, setFilteredPedidos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [reciboModalOpen, setReciboModalOpen] = useState(false);
    const [osParaRecibo, setOsParaRecibo] = useState(null);
    const [isNotaFiscalModalOpen, setIsNotaFiscalModalOpen] = useState(false);
    const [selectedOsForNota, setSelectedOsForNota] = useState(null);

    const [empresa, setEmpresa] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    
    // Estados para paginação
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Tentar carregar da API primeiro
            try {
                const response = await osService.getEntregues();
                
                // Extrair dados da resposta da API
                const ordensArray = response.data?.data || response.data || [];
                
                // Garantir que é um array e ordenar por data de entrega
                const ordensFormatadas = Array.isArray(ordensArray) ? ordensArray : [];
                const ordensOrdenadas = ordensFormatadas.sort((a, b) => {
                    const dateA = a.dados_producao?.data_entrega ? parseISO(a.dados_producao.data_entrega) : 0;
                    const dateB = b.dados_producao?.data_entrega ? parseISO(b.dados_producao.data_entrega) : 0;
                    if (!isValid(dateA) && !isValid(dateB)) return 0;
                    if (!isValid(dateA)) return 1;
                    if (!isValid(dateB)) return -1;
                    return dateB - dateA;
                });
                
                setPedidosEntregues(ordensOrdenadas);
                setFilteredPedidos(ordensOrdenadas);
                
                                      // Buscar configurações da empresa
                  try {
                      const empresaResponse = await empresaService.get();
                      const empresaData = empresaResponse.data.data || {};
                      setEmpresa(empresaData);
                } catch (empresaError) {
                    console.warn('Erro ao carregar configurações da empresa:', empresaError);
                }
                
            } catch (apiError) {
                    console.warn('Erro ao carregar da API, usando dados locais:', apiError);
                    
                    // Fallback para dados locais
                    const todasOSSalvas = safeJsonParse(await apiDataManager.getItem('ordens_servico_salvas'), []);
                    const entregues = todasOSSalvas
                        .filter(os => {
                            // CRÍTICO: Excluir orçamentos - apenas OS finalizadas devem aparecer como entregues
                            const isOrcamento = os.status_os === 'Orçamento Salvo' || os.status_os === 'Orçamento Salvo (Editado)';
                            if (isOrcamento) return false;
                            
                            // Filtrar por status de produção "Entregue"
                            return os.dados_producao?.status_producao === 'Entregue';
                        })
                        .sort((a, b) => {
                            const dateA = a.dados_producao?.data_entrega ? parseISO(a.dados_producao.data_entrega) : 0;
                            const dateB = b.dados_producao?.data_entrega ? parseISO(b.dados_producao.data_entrega) : 0;
                            if (!isValid(dateA) && !isValid(dateB)) return 0;
                            if (!isValid(dateA)) return 1;
                            if (!isValid(dateB)) return -1;
                            return dateB - dateA;
                        });
                    setPedidosEntregues(entregues);
                    setFilteredPedidos(entregues);

                    const storedEmpresa = safeJsonParse(await apiDataManager.getItem('empresaSettings'), {});
                    const logoUrl = await apiDataManager.getItem('logoUrl') || '';
                    setEmpresa({ ...storedEmpresa, logoUrl });
                }
                
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
            } finally {
                setIsLoading(false);
            }
        }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        // Listener para recarregar dados quando uma OS for entregue
        const handleOSEntregue = (event) => {
            console.log('Evento de OS entregue recebido:', event.detail);
            loadData(); // Recarregar os dados da página
        };

        window.addEventListener('osEntregue', handleOSEntregue);
        
        // Cleanup
        return () => {
            window.removeEventListener('osEntregue', handleOSEntregue);
        };
    }, [loadData]);

    useEffect(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const results = pedidosEntregues.filter(os =>
            (os.id || '').toString().toLowerCase().includes(lowerSearchTerm) ||
            (os.id_os || '').toLowerCase().includes(lowerSearchTerm) ||
            (os.cliente?.nome || os.cliente?.nome_completo || os.cliente_info?.nome || os.cliente_nome_manual || '').toLowerCase().includes(lowerSearchTerm) ||
            (os.dados_producao?.entregue_por || '').toLowerCase().includes(lowerSearchTerm) ||
            (os.dados_producao?.recebido_por || '').toLowerCase().includes(lowerSearchTerm)
        );
        setFilteredPedidos(results);
        // Reset para primeira página quando a busca muda
        setCurrentPage(1);
    }, [searchTerm, pedidosEntregues]);

    const handleViewRecibo = (os) => {
        setOsParaRecibo(os);
        setReciboModalOpen(true);
    };

    // Funções de paginação
    const totalPages = Math.ceil(filteredPedidos.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPedidos = filteredPedidos.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };



    return (
        <div className="p-4 md:p-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-3">
                        <PackageCheck size={28} className="text-primary" />
                        <div>
                            <CardTitle className="text-2xl">Pedidos Entregues</CardTitle>
                            <CardDescription>
                                Histórico de todas as Ordens de Serviço que foram entregues aos clientes. Este histórico é somente para visualização.
                                {!isLoading && (
                                    <>
                                        {` • ${filteredPedidos.length} ${filteredPedidos.length === 1 ? 'pedido entregue' : 'pedidos entregues'}`}
                                        {totalPages > 1 && (
                                            ` • Página ${currentPage} de ${totalPages} (${itemsPerPage} por página)`
                                        )}
                                    </>
                                )}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por ID, Nº OS, Cliente, Entregador ou Recebedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-22rem)]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card z-10">
                                <TableRow>
                                    <TableHead>Nº OS</TableHead>
                                    <TableHead><Calendar className="inline-block h-4 w-4 mr-1" /> Data Entrega</TableHead>
                                    <TableHead><User className="inline-block h-4 w-4 mr-1" /> Cliente</TableHead>
                                    <TableHead><Truck className="inline-block h-4 w-4 mr-1" /> Entregue Por</TableHead>
                                    <TableHead><UserCheck className="inline-block h-4 w-4 mr-1" /> Recebido Por</TableHead>
                                    <TableHead className="text-right"><DollarSign className="inline-block h-4 w-4 mr-1" /> Valor</TableHead>
                                    <TableHead className="text-center">Recibo</TableHead>
                                    <TableHead className="text-center">Anexos</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            <div className="flex flex-col items-center space-y-2">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                                <span className="text-muted-foreground">Carregando pedidos entregues...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : currentPedidos.length > 0 ? currentPedidos.map(os => (
                                    <TableRow key={os.id_os}>
                                        <TableCell className="font-mono text-xs">{os.id || 'N/A'}</TableCell>
                                        <TableCell>
                                            {os.dados_producao?.data_entrega && isValid(parseISO(os.dados_producao.data_entrega))
                                                ? format(parseISO(os.dados_producao.data_entrega), 'dd/MM/yyyy HH:mm')
                                                : 'Data não registrada'}
                                        </TableCell>
                                        <TableCell className="font-medium">{os.cliente?.nome || os.cliente?.nome_completo || os.cliente_info?.nome || os.cliente_nome_manual || 'N/A'}</TableCell>
                                        <TableCell>{os.dados_producao?.entregue_por || 'Não informado'}</TableCell>
                                        <TableCell>{os.dados_producao?.recebido_por || 'Não informado'}</TableCell>
                                        <TableCell className="text-right font-bold">R$ {parseFloat(os.valor_total_os || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleViewRecibo(os)} title="Ver Recibo">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => { setSelectedOsForNota(os); setIsNotaFiscalModalOpen(true); }} title="Emitir Nota Fiscal" className="text-emerald-600 hover:text-emerald-700">
                                                    <Receipt className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <OSAnexosThumbnail os={os} />
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">Nenhum pedido entregue encontrado.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Componente de Paginação */}
            {totalPages > 1 && (
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredPedidos.length)} de {filteredPedidos.length} pedidos
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePreviousPage}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Anterior
                                </Button>
                                
                                <div className="flex items-center space-x-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNumber;
                                        if (totalPages <= 5) {
                                            pageNumber = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNumber = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNumber = totalPages - 4 + i;
                                        } else {
                                            pageNumber = currentPage - 2 + i;
                                        }
                                        
                                        return (
                                            <Button
                                                key={pageNumber}
                                                variant={currentPage === pageNumber ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => handlePageChange(pageNumber)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {pageNumber}
                                            </Button>
                                        );
                                    })}
                                </div>
                                
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                >
                                    Próxima
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {reciboModalOpen && osParaRecibo && (
                 <OSEntregaReciboModal
                    isOpen={reciboModalOpen}
                    setIsOpen={setReciboModalOpen}
                    os={osParaRecibo}
                    empresa={empresa}
                />
            )}

            {selectedOsForNota && (
                <EmitirNotaFiscalModal
                    isOpen={isNotaFiscalModalOpen}
                    onClose={() => { setIsNotaFiscalModalOpen(false); setSelectedOsForNota(null); }}
                    ordemServico={selectedOsForNota}
                    clienteSelecionado={selectedOsForNota?.cliente || null}
                />
            )}

        </div>
    );
};

export default OSPedidosEntreguesPage;