import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Receipt, CheckCircle, Clock } from 'lucide-react';
import jsPDF from 'jspdf';

const ReciboComissoesModal = ({ isOpen, onClose, funcionario, comissoes }) => {
    const { toast } = useToast();
    const [selectedComissoes, setSelectedComissoes] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Filtrar apenas comissões pagas para o recibo
    const comissoesPagas = comissoes.filter(comissao => comissao.status_pagamento === 'Pago');

    useEffect(() => {
        if (isOpen) {
            // Selecionar todas as comissões pagas por padrão
            setSelectedComissoes(comissoesPagas.map(comissao => comissao.id));
        }
    }, [isOpen, comissoesPagas]);

    const handleSelectComissao = (comissaoId, checked) => {
        if (checked) {
            setSelectedComissoes(prev => [...prev, comissaoId]);
        } else {
            setSelectedComissoes(prev => prev.filter(id => id !== comissaoId));
        }
    };

    const handleSelectAll = (checked) => {
        console.log('handleSelectAll called with:', checked); // Debug log
        if (checked) {
            const allIds = comissoesPagas.map(comissao => comissao.id);
            console.log('Selecting all IDs:', allIds); // Debug log
            setSelectedComissoes(allIds);
        } else {
            console.log('Deselecting all'); // Debug log
            setSelectedComissoes([]);
        }
    };

    const getSelectedComissoesData = () => {
        return comissoesPagas.filter(comissao => selectedComissoes.includes(comissao.id));
    };

    const calculateTotal = () => {
        const selected = getSelectedComissoesData();
        const total = selected.reduce((total, comissao) => {
            const valor = parseFloat(comissao.valor_comissao) || 0;
            return total + valor;
        }, 0);
        return total;
    };

    const formatCurrency = (value) => {
        const numValue = parseFloat(value) || 0;
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(numValue);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('pt-BR');
        } catch {
            return dateString;
        }
    };

    const generateRecibo = async () => {
        if (selectedComissoes.length === 0) {
            toast({
                title: 'Atenção',
                description: 'Selecione pelo menos uma comissão para gerar o recibo.',
                variant: 'destructive'
            });
            return;
        }

        try {
            setIsGenerating(true);

            const selectedComissoesData = getSelectedComissoesData();
            const total = calculateTotal();

            // Criar PDF
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            let yPosition = margin;

            // Configurações de fonte
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            
            // Título
            doc.text('RECIBO DE PAGAMENTO DE COMISSÕES', pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 20;

            // Dados do funcionário
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.text('Funcionário:', margin, yPosition);
            doc.text(`${funcionario.name}`, margin + 30, yPosition);
            yPosition += 8;

            doc.text('CPF:', margin, yPosition);
            doc.text(`${funcionario.cpf || 'N/A'}`, margin + 30, yPosition);
            yPosition += 8;

            doc.text('Cargo:', margin, yPosition);
            doc.text(`${funcionario.cargo || 'N/A'}`, margin + 30, yPosition);
            yPosition += 8;

            doc.text('Data do Recibo:', margin, yPosition);
            doc.text(new Date().toLocaleDateString('pt-BR'), margin + 30, yPosition);
            yPosition += 15;

            // Tabela de comissões
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('Comissões Incluídas:', margin, yPosition);
            yPosition += 10;

            // Cabeçalho da tabela
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('OS', margin, yPosition);
            doc.text('Data OS', margin + 30, yPosition);
            doc.text('Valor OS', margin + 80, yPosition);
            doc.text('% Comissão', margin + 120, yPosition);
            doc.text('Valor Comissão', margin + 150, yPosition);
            yPosition += 8;

            // Linha separadora
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 5;

            // Dados das comissões
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            
            selectedComissoesData.forEach((comissao, index) => {
                if (yPosition > pageHeight - 40) {
                    doc.addPage();
                    yPosition = margin;
                }

                doc.text(String(comissao.ordem_servico?.id || comissao.ordem_servico_id || ''), margin, yPosition);
                doc.text(formatDate(comissao.data_os_finalizada), margin + 30, yPosition);
                doc.text(formatCurrency(comissao.valor_os), margin + 80, yPosition);
                doc.text(`${comissao.percentual_comissao}%`, margin + 120, yPosition);
                doc.text(formatCurrency(comissao.valor_comissao), margin + 150, yPosition);
                yPosition += 6;
            });

            yPosition += 10;

            // Linha separadora
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 10;

            // Total
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('TOTAL A PAGAR:', margin, yPosition);
            doc.text(formatCurrency(total), pageWidth - margin - 50, yPosition, { align: 'right' });
            yPosition += 20;

            // Assinaturas
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text('_________________________________', margin, yPosition);
            doc.text('Assinatura do Funcionário', margin, yPosition + 15);
            
            doc.text('_________________________________', pageWidth - margin - 100, yPosition);
            doc.text('Assinatura do Responsável', pageWidth - margin - 100, yPosition + 15);

            // Salvar o PDF
            const fileName = `recibo_comissoes_${funcionario.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            toast({
                title: 'Sucesso',
                description: 'Recibo gerado com sucesso!',
            });

            onClose();
        } catch (error) {
            console.error('Erro ao gerar recibo:', error);
            toast({
                title: 'Erro',
                description: 'Erro ao gerar o recibo. Tente novamente.',
                variant: 'destructive'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Gerar Recibo de Comissões
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Dados do Funcionário */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Dados do Funcionário</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <strong>Nome:</strong> {funcionario.name}
                                </div>
                                <div>
                                    <strong>CPF:</strong> {funcionario.cpf || 'N/A'}
                                </div>
                                <div>
                                    <strong>Cargo:</strong> {funcionario.cargo || 'N/A'}
                                </div>
                                <div>
                                    <strong>Data do Recibo:</strong> {new Date().toLocaleDateString('pt-BR')}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Seleção de Comissões */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Selecionar Comissões</CardTitle>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="select-all"
                                        checked={comissoesPagas.length > 0 && selectedComissoes.length === comissoesPagas.length}
                                        onCheckedChange={(checked) => {
                                            console.log('Checkbox onCheckedChange:', checked);
                                            handleSelectAll(checked);
                                        }}
                                    />
                                    <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                                        {selectedComissoes.length === comissoesPagas.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                                    </label>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {comissoesPagas.length === 0 ? (
                                <div className="text-center p-8 text-muted-foreground">
                                    Nenhuma comissão paga encontrada para gerar recibo.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12"></TableHead>
                                                <TableHead>OS</TableHead>
                                                <TableHead>Data OS</TableHead>
                                                <TableHead>Valor OS</TableHead>
                                                <TableHead>% Comissão</TableHead>
                                                <TableHead>Valor Comissão</TableHead>
                                                <TableHead>Data Pagamento</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {comissoesPagas.map((comissao) => (
                                                <TableRow key={comissao.id}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedComissoes.includes(comissao.id)}
                                                            onCheckedChange={(checked) => 
                                                                handleSelectComissao(comissao.id, checked)
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {String(comissao.ordem_servico?.id || comissao.ordem_servico_id || '')}
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
                                                        {formatDate(comissao.data_comissao_paga)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Resumo */}
                    {selectedComissoes.length > 0 && (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedComissoes.length} comissão(ões) selecionada(s)
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Total a Pagar:</p>
                                        <p className="text-2xl font-bold text-primary">
                                            {formatCurrency(calculateTotal())}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Botões de Ação */}
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={generateRecibo}
                            disabled={isGenerating || selectedComissoes.length === 0}
                        >
                            {isGenerating ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Receipt className="h-4 w-4 mr-2" />
                            )}
                            Gerar Recibo
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ReciboComissoesModal;
