import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Search, History, Printer } from 'lucide-react';
import { motion } from 'framer-motion';
import MarketplaceNotinhaModal from '@/components/marketplace/MarketplaceNotinhaModal';
import { apiDataManager } from '@/lib/apiDataManager';
import { marketplaceService } from '@/services/marketplaceService';
import { safeJsonParse } from '@/lib/utils';
import { empresaService } from '@/services/api';
import { getApiBaseUrl } from '@/lib/apiUrlUtils';

const MarketplaceHistoricoPage = ({ logoUrl: appLogoUrl, nomeEmpresa: appNomeEmpresa }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const [vendas, setVendas] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isNotinhaModalOpen, setIsNotinhaModalOpen] = useState(false);
    const [vendaParaNotinha, setVendaParaNotinha] = useState(null);
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');
    const [nomeEmpresaState, setNomeEmpresaState] = useState('');

    const loadVendas = async () => {
        try {
            // Primeiro tenta carregar do backend
            const vendasFromApi = await marketplaceService.getVendas();
            
            if (Array.isArray(vendasFromApi) && vendasFromApi.length > 0) {
                // Se tiver dados no backend, usa eles
                const vendasArray = vendasFromApi;
                vendasArray.sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));
                setVendas(vendasArray);
            } else {
                // Se não tiver no backend, tenta carregar do localStorage como fallback
                const storedVendas = safeJsonParse(await apiDataManager.getItem('vendas_marketplace') || '[]', []);
                const vendasArray = Array.isArray(storedVendas) ? storedVendas : [];
                
                if (vendasArray.length > 0) {
                    // Se tiver no localStorage mas não no backend, sincroniza com o backend
                    vendasArray.sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));
                    setVendas(vendasArray);
                    // Sincroniza com o backend
                    await marketplaceService.salvarVendas(vendasArray);
                } else {
                    setVendas([]);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            toast({ 
                title: 'Erro ao carregar vendas', 
                description: 'Não foi possível carregar as vendas do servidor.', 
                variant: 'destructive' 
            });
            
            // Em caso de erro, tenta carregar do localStorage
            const storedVendas = safeJsonParse(await apiDataManager.getItem('vendas_marketplace') || '[]', []);
            const vendasArray = Array.isArray(storedVendas) ? storedVendas : [];
            vendasArray.sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));
            setVendas(vendasArray);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            // Carrega as vendas do backend
            await loadVendas();

            // Carrega configurações da empresa
            const settings = safeJsonParse(await apiDataManager.getItem('empresaSettings') || '{}', {});
            setEmpresaSettings(settings);
            // Preferir props globais vindas do App; fallback para storage
            const logoFromStorage = await apiDataManager.getItem('logoUrl') || '';
            let resolvedLogo = appLogoUrl || logoFromStorage || '';
            let resolvedNome = appNomeEmpresa || settings?.nomeFantasia || '';

            // Buscar dados oficiais da empresa pelo tenant autenticado
            try {
                const response = await empresaService.get();
                const empresa = response?.data?.data || response?.data;
                if (empresa) {
                    setEmpresaSettings(prev => ({
                        ...prev,
                        nomeFantasia: empresa.nome_fantasia || prev?.nomeFantasia || 'Sua Empresa',
                    }));
                    resolvedLogo = empresa.logo_url || resolvedLogo;
                    resolvedNome = empresa.nome_fantasia || resolvedNome;
                }
            } catch (e) {
                // Mantém fallbacks caso API falhe
                console.warn('[MarketplaceHistoricoPage] Falha ao buscar empresa por tenant:', e);
            }

            // Normalizar URL do logo: se vier relativa (/storage/...), prefixar com base da API
            const needsApiPrefix = resolvedLogo && !/^https?:\/\//i.test(resolvedLogo);
            const finalLogoUrl = needsApiPrefix ? `${getApiBaseUrl()}${resolvedLogo}` : resolvedLogo;
            setLogoUrl(finalLogoUrl);
            setNomeEmpresaState(resolvedNome || 'Sua Empresa');
        };
        
        loadData();
    }, []);

    // Abrir venda específica quando vier do Feed de Vendas (state.openVendaId)
    useEffect(() => {
        const openVendaId = location.state?.openVendaId;
        if (openVendaId == null || !vendas.length) return;
        const venda = vendas.find(v => String(v.id) === String(openVendaId));
        if (venda) {
            setVendaParaNotinha(venda);
            setIsNotinhaModalOpen(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [vendas, location.state?.openVendaId]);

    const filteredVendas = useMemo(() => {
        return vendas.filter(v =>
            v.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.produtos.some(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [vendas, searchTerm]);

    const handleOpenNotinhaModal = (venda) => {
        setVendaParaNotinha(venda);
        setIsNotinhaModalOpen(true);
    };

    return (
        <div className="p-4 md:p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl"><History className="mr-3"/> Histórico de Vendas Online</CardTitle>
                    <CardDescription>Consulte suas vendas do marketplace.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="relative flex-1 mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input placeholder="Buscar por cliente, ID ou produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>

                    {/* Visualização em Cards para Mobile */}
                    <div className="md:hidden">
                        <ScrollArea className="h-[calc(100vh-20rem)]">
                            <div className="space-y-4 pr-2">
                                {filteredVendas.length > 0 ? (
                                    filteredVendas.map(venda => (
                                        <motion.div
                                            key={venda.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
                                        >
                                            <div className="space-y-3">
                                                {/* ID e Status */}
                                                <div className="flex justify-between items-start gap-2">
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">ID</p>
                                                        <p className="font-mono font-semibold text-sm">{venda.id.slice(-8)}</p>
                                                    </div>
                                                    <Badge variant={venda.status_pedido === 'Entregue' ? 'success' : 'default'}>
                                                        {venda.status_pedido}
                                                    </Badge>
                                                </div>

                                                {/* Cliente */}
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Cliente</p>
                                                    <p className="font-medium break-words">{venda.cliente_nome}</p>
                                                </div>

                                                {/* Data */}
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Data</p>
                                                    <p className="text-sm">{format(parseISO(venda.data_venda), 'dd/MM/yyyy HH:mm')}</p>
                                                </div>

                                                {/* Total */}
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                                                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                                        R$ {parseFloat(venda.valor_total).toFixed(2)}
                                                    </p>
                                                </div>

                                                {/* Ações */}
                                                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => handleOpenNotinhaModal(venda)}
                                                        className="w-full text-blue-500 hover:text-blue-600 border-blue-300 hover:border-blue-400"
                                                    >
                                                        <Printer className="mr-2 h-4 w-4" />
                                                        Imprimir Notinha
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                        <History className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                        <p>Nenhuma venda encontrada.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Visualização em Tabela para Desktop */}
                    <div className="hidden md:block">
                        <ScrollArea className="h-[calc(100vh-20rem)]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-center">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredVendas.length > 0 ? (
                                        filteredVendas.map(venda => (
                                            <TableRow key={venda.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <TableCell className="font-mono">{venda.id.slice(-8)}</TableCell>
                                                <TableCell>{format(parseISO(venda.data_venda), 'dd/MM/yy HH:mm')}</TableCell>
                                                <TableCell>{venda.cliente_nome}</TableCell>
                                                <TableCell><Badge variant={venda.status_pedido === 'Entregue' ? 'success' : 'default'}>{venda.status_pedido}</Badge></TableCell>
                                                <TableCell className="text-right font-semibold">R$ {parseFloat(venda.valor_total).toFixed(2)}</TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenNotinhaModal(venda)}>
                                                        <Printer size={14} className="mr-1"/> Notinha
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-gray-500 dark:text-gray-400">
                                                Nenhuma venda encontrada.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>
            {isNotinhaModalOpen && vendaParaNotinha && (
                <MarketplaceNotinhaModal
                    isOpen={isNotinhaModalOpen}
                    onClose={() => setIsNotinhaModalOpen(false)}
                    venda={vendaParaNotinha}
                    nomeEmpresa={nomeEmpresaState || appNomeEmpresa || empresaSettings.nomeFantasia}
                    logoUrl={logoUrl}
                />
            )}
        </div>
    );
}

export default MarketplaceHistoricoPage;