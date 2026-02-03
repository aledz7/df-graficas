import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { vendaPreVendaService } from '@/services/api';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle, CreditCard, DollarSign, QrCode, Receipt, Banknote, ArrowRight } from 'lucide-react';

const EditarPreVendaModal = ({ isOpen, setIsOpen, venda, onSuccess }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        forma_pagamento: '',
        dados_pagamento: {},
        observacoes: '',
        status: 'finalizada'
    });

    const formasPagamento = [
        { value: 'dinheiro', label: 'Dinheiro', icon: DollarSign },
        { value: 'cartao_credito', label: 'Cartão de Crédito', icon: CreditCard },
        { value: 'cartao_debito', label: 'Cartão de Débito', icon: CreditCard },
        { value: 'pix', label: 'PIX', icon: QrCode },
        { value: 'boleto', label: 'Boleto', icon: Receipt },
        { value: 'transferencia', label: 'Transferência', icon: Banknote },
        { value: 'outro', label: 'Outro', icon: DollarSign }
    ];

    useEffect(() => {
        if (venda) {
            setFormData({
                forma_pagamento: venda.forma_pagamento || '',
                dados_pagamento: venda.dados_pagamento || {},
                observacoes: venda.observacoes || '',
                status: venda.status === 'pre_venda' ? 'finalizada' : venda.status
            });
        }
    }, [venda]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handlePagamentoChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            dados_pagamento: {
                ...prev.dados_pagamento,
                [field]: value
            }
        }));
    };

    const handleSubmit = async () => {
        if (!formData.forma_pagamento) {
            toast({
                title: 'Forma de pagamento obrigatória',
                description: 'Selecione uma forma de pagamento para finalizar a venda.',
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);
        try {
            // Preparar dados para atualização
            const dadosAtualizacao = {
                status: formData.status,
                forma_pagamento: formData.forma_pagamento,
                dados_pagamento: formData.dados_pagamento,
                observacoes: formData.observacoes,
                valor_pago: venda.total, // Considera que foi pago o valor total
                status_pagamento: 'pago'
            };

            // Se está finalizando, adicionar data de finalização
            if (formData.status === 'finalizada') {
                dadosAtualizacao.data_finalizacao = new Date().toISOString();
            }

            await vendaPreVendaService.update(venda.id, dadosAtualizacao);

            toast({
                title: 'Venda atualizada com sucesso!',
                description: 'A venda foi finalizada e o pagamento foi registrado.',
            });

            setIsOpen(false);
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Erro ao atualizar venda:', error);
            toast({
                title: 'Erro ao atualizar venda',
                description: error.response?.data?.message || 'Ocorreu um erro ao atualizar a venda.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const getFormaPagamentoIcon = (forma) => {
        const formaObj = formasPagamento.find(f => f.value === forma);
        return formaObj ? formaObj.icon : DollarSign;
    };

    const getFormaPagamentoLabel = (forma) => {
        const formaObj = formasPagamento.find(f => f.value === forma);
        return formaObj ? formaObj.label : 'Não especificado';
    };

    if (!venda) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Finalizar Venda de Pré-venda
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Informações da Venda */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Informações da Venda</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Código</Label>
                                    <p className="font-mono text-lg">{venda.id}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                                    <p className="font-medium">{venda.cliente_nome}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Data</Label>
                                    <p>{new Date(venda.data_emissao).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                                    <p>{venda.cliente_telefone}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">E-mail</Label>
                                    <p>{venda.cliente_email || 'Não informado'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Itens da Venda */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Itens da Venda</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produto</TableHead>
                                        <TableHead className="text-right">Qtd</TableHead>
                                        <TableHead className="text-right">Preço Unit.</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {venda.itens?.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{item.nome}</p>
                                                    <p className="text-sm text-muted-foreground">{item.codigo_produto}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantidade}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.preco_venda_unitario)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.preco_venda_unitario * item.quantidade)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="mt-4 text-right">
                                <div className="text-2xl font-bold text-green-600">
                                    Total: {formatCurrency(venda.total)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Forma de Pagamento */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Forma de Pagamento</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="forma_pagamento">Forma de Pagamento *</Label>
                                    <Select value={formData.forma_pagamento} onValueChange={(value) => handleInputChange('forma_pagamento', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a forma de pagamento" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {formasPagamento.map((forma) => {
                                                const Icon = forma.icon;
                                                return (
                                                    <SelectItem key={forma.value} value={forma.value}>
                                                        <div className="flex items-center gap-2">
                                                            <Icon className="h-4 w-4" />
                                                            {forma.label}
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="valor_pago">Valor Pago</Label>
                                    <Input
                                        id="valor_pago"
                                        type="number"
                                        step="0.01"
                                        value={venda.total}
                                        disabled
                                        className="bg-gray-50"
                                    />
                                </div>
                            </div>

                            {/* Campos específicos por forma de pagamento */}
                            {formData.forma_pagamento === 'cartao_credito' || formData.forma_pagamento === 'cartao_debito' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="parcelas">Número de Parcelas</Label>
                                        <Select value={formData.dados_pagamento.parcelas || '1'} onValueChange={(value) => handlePagamentoChange('parcelas', value)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                                                    <SelectItem key={num} value={num.toString()}>
                                                        {num}x
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="bandeira">Bandeira</Label>
                                        <Select value={formData.dados_pagamento.bandeira || ''} onValueChange={(value) => handlePagamentoChange('bandeira', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a bandeira" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="visa">Visa</SelectItem>
                                                <SelectItem value="mastercard">Mastercard</SelectItem>
                                                <SelectItem value="elo">Elo</SelectItem>
                                                <SelectItem value="hipercard">Hipercard</SelectItem>
                                                <SelectItem value="outro">Outro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {formData.forma_pagamento === 'pix' && (
                                <div>
                                    <Label htmlFor="chave_pix">Chave PIX</Label>
                                    <Input
                                        id="chave_pix"
                                        placeholder="Digite a chave PIX"
                                        value={formData.dados_pagamento.chave_pix || ''}
                                        onChange={(e) => handlePagamentoChange('chave_pix', e.target.value)}
                                    />
                                </div>
                            )}

                            {formData.forma_pagamento === 'transferencia' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="banco">Banco</Label>
                                        <Input
                                            id="banco"
                                            placeholder="Nome do banco"
                                            value={formData.dados_pagamento.banco || ''}
                                            onChange={(e) => handlePagamentoChange('banco', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="conta">Conta</Label>
                                        <Input
                                            id="conta"
                                            placeholder="Número da conta"
                                            value={formData.dados_pagamento.conta || ''}
                                            onChange={(e) => handlePagamentoChange('conta', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Observações */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Observações</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="Adicione observações sobre o pagamento ou a venda..."
                                value={formData.observacoes}
                                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                                rows={3}
                            />
                        </CardContent>
                    </Card>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Finalizando...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Finalizar Venda
                            </div>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditarPreVendaModal; 