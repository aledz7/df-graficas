import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, DollarSign, CheckCircle, Clock, RefreshCw, Receipt, CheckCheck } from 'lucide-react';
import { comissaoOSService } from '@/services/api';
import ReciboComissoesModal from './ReciboComissoesModal';

const FuncionarioComissoes = ({ formData }) => {
    const { toast } = useToast();
    const [comissoes, setComissoes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showReciboModal, setShowReciboModal] = useState(false);
    const [resumo, setResumo] = useState({
        total: 0,
        pendente: 0,
        pago: 0
    });

    const loadComissoes = async () => {
        if (!formData.id) return;
        
        try {
            setIsLoading(true);
            const data = await comissaoOSService.getComissoesFuncionario(formData.id);
            
            setComissoes(data.comissoes || []);
            setResumo({
                total: data.total_comissoes || 0,
                pendente: data.total_pendente || 0,
                pago: data.total_pago || 0
            });
        } catch (error) {
            console.error('Erro ao carregar comissões:', error);
            toast({
                title: 'Erro',
                description: 'Erro ao carregar comissões do funcionário.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const marcarComoPaga = async (comissaoId) => {
        try {
            setIsProcessing(true);
            await comissaoOSService.marcarComoPaga(comissaoId);
            
            toast({
                title: 'Sucesso',
                description: 'Comissão marcada como paga.',
            });
            loadComissoes();
        } catch (error) {
            console.error('Erro ao marcar comissão como paga:', error);
            toast({
                title: 'Erro',
                description: 'Erro ao marcar comissão como paga.',
                variant: 'destructive'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const processarComissoesPendentes = async () => {
        try {
            setIsProcessing(true);
            const response = await comissaoOSService.processarPendentes();
            const comissoesCriadas = response?.data?.comissoes_criadas ?? response?.comissoes_criadas ?? 0;
            
            toast({
                title: 'Sucesso',
                description: `${comissoesCriadas} comissões processadas.`,
            });
            loadComissoes();
        } catch (error) {
            console.error('Erro ao processar comissões pendentes:', error);
            toast({
                title: 'Erro',
                description: 'Erro ao processar comissões pendentes.',
                variant: 'destructive'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const marcarTodasComoPagas = async () => {
        try {
            setIsProcessing(true);
            const response = await comissaoOSService.marcarTodasComoPagas(formData.id);
            const totalComissoesPagas = response?.data?.total_comissoes_pagas ?? 0;
            const valorTotalPago = response?.data?.valor_total_pago ?? 0;
            
            toast({
                title: 'Sucesso',
                description: `${totalComissoesPagas} comissões marcadas como pagas. Total: ${formatCurrency(valorTotalPago)}`,
            });
            loadComissoes();
        } catch (error) {
            console.error('Erro ao marcar todas as comissões como pagas:', error);
            toast({
                title: 'Erro',
                description: error.response?.data?.message || 'Erro ao marcar todas as comissões como pagas.',
                variant: 'destructive'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    //

    useEffect(() => {
        if (formData.id) {
            loadComissoes();
        }
    }, [formData.id]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('pt-BR');
        } catch {
            return dateString;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Pago':
                return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Pago</Badge>;
            case 'Pendente':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (!formData.id) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    Salve o funcionário primeiro para visualizar as comissões.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Resumo das Comissões */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total de Comissões</p>
                                <p className="text-2xl font-bold">{formatCurrency(resumo.total)}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(resumo.pendente)}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pagas</p>
                                <p className="text-2xl font-bold text-green-600">{formatCurrency(resumo.pago)}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Ações */}
            <Card>
                <CardHeader>
                    <CardTitle>Ações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                            onClick={processarComissoesPendentes}
                            disabled={isProcessing}
                            className="w-full sm:w-auto"
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Processar Comissões Pendentes
                        </Button>
                        <Button
                            onClick={marcarTodasComoPagas}
                            disabled={isProcessing || resumo.pendente === 0}
                            variant="default"
                            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CheckCheck className="h-4 w-4 mr-2" />
                            )}
                            Marcar Todas como Pagas
                        </Button>
                        <Button
                            onClick={() => setShowReciboModal(true)}
                            variant="outline"
                            className="w-full sm:w-auto"
                        >
                            <Receipt className="h-4 w-4 mr-2" />
                            Gerar Recibo
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de Comissões */}
            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Comissões</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-2">Carregando comissões...</span>
                        </div>
                    ) : comissoes.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            Nenhuma comissão encontrada para este funcionário.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>OS</TableHead>
                                        <TableHead>Data OS</TableHead>
                                        <TableHead>Valor OS</TableHead>
                                        <TableHead>% Comissão</TableHead>
                                        <TableHead>Valor Comissão</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Data Pagamento</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {comissoes.map((comissao) => (
                                        <TableRow key={comissao.id}>
                                            <TableCell className="font-medium">
                                                {comissao.ordem_servico?.id || comissao.ordem_servico_id}
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(comissao.data_os_finalizada)}
                                            </TableCell>
                                            <TableCell>
                                                {formatCurrency(comissao.valor_os)}
                                            </TableCell>
                                            <TableCell>
                                                {comissao.percentual_comissao}%
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                                {formatCurrency(comissao.valor_comissao)}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(comissao.status_pagamento)}
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(comissao.data_comissao_paga)}
                                            </TableCell>
                                            <TableCell>
                                                {comissao.status_pagamento === 'Pendente' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => marcarComoPaga(comissao.id)}
                                                        disabled={isProcessing}
                                                    >
                                                        {isProcessing ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <CheckCircle className="h-3 w-3" />
                                                        )}
                                                        <span className="ml-1">Pagar</span>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Recibo */}
            <ReciboComissoesModal
                isOpen={showReciboModal}
                onClose={() => setShowReciboModal(false)}
                funcionario={formData}
                comissoes={comissoes}
            />
        </div>
    );
};

export default FuncionarioComissoes; 