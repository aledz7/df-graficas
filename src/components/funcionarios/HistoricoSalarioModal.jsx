import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, FileText, TrendingUp, Download, Eye, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { funcionarioService } from '@/services/funcionarioService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const HistoricoSalarioModal = ({ isOpen, onClose, funcionarioId, funcionarioNome }) => {
    const { toast } = useToast();
    const relatorioRef = useRef();
    const [historico, setHistorico] = useState([]);
    const [relatorios, setRelatorios] = useState([]);
    const [selectedMes, setSelectedMes] = useState('');
    const [selectedAno, setSelectedAno] = useState('');
    const [loading, setLoading] = useState(false);
    const [relatorioDetalhado, setRelatorioDetalhado] = useState(null);
    const [showRelatorioDetalhado, setShowRelatorioDetalhado] = useState(false);

    const meses = [
        { value: '1', label: 'Janeiro' },
        { value: '2', label: 'Fevereiro' },
        { value: '3', label: 'Março' },
        { value: '4', label: 'Abril' },
        { value: '5', label: 'Maio' },
        { value: '6', label: 'Junho' },
        { value: '7', label: 'Julho' },
        { value: '8', label: 'Agosto' },
        { value: '9', label: 'Setembro' },
        { value: '10', label: 'Outubro' },
        { value: '11', label: 'Novembro' },
        { value: '12', label: 'Dezembro' }
    ];

    const anos = Array.from({ length: 10 }, (_, i) => {
        const ano = new Date().getFullYear() - i;
        return { value: ano.toString(), label: ano.toString() };
    });

    useEffect(() => {
        if (isOpen && funcionarioId) {
            carregarDados();
        } else {
            // Limpar dados quando o modal fechar
            setHistorico([]);
            setRelatorios([]);
            setLoading(false);
        }
    }, [isOpen, funcionarioId]);

    const carregarDados = async () => {
        setLoading(true);
        try {
            const [historicoData, relatoriosData] = await Promise.all([
                funcionarioService.getSalarioHistorico(funcionarioId),
                funcionarioService.getRelatoriosMensais(funcionarioId)
            ]);
            
            // Verificar se os dados foram retornados corretamente
            setHistorico(historicoData?.data || historicoData || []);
            setRelatorios(relatoriosData?.data || relatoriosData || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            // Em caso de erro, definir arrays vazios para não quebrar a interface
            setHistorico([]);
            setRelatorios([]);
            toast({
                title: 'Erro',
                description: 'Não foi possível carregar o histórico de salários.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const gerarRelatorioMensal = async () => {
        if (!selectedMes || !selectedAno) {
            toast({
                title: 'Dados incompletos',
                description: 'Selecione o mês e ano para gerar o relatório.',
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);
        try {
            const relatorio = await funcionarioService.gerarRelatorioMensal(
                funcionarioId, 
                parseInt(selectedMes), 
                parseInt(selectedAno)
            );
            
            setRelatorioDetalhado(relatorio);
            setShowRelatorioDetalhado(true);
            
            toast({
                title: 'Relatório gerado',
                description: 'Relatório mensal gerado com sucesso.',
                variant: 'default'
            });
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível gerar o relatório mensal.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const downloadRelatorio = async (relatorio) => {
        try {
            if (!relatorioRef.current) {
                toast({
                    title: 'Erro',
                    description: 'Não foi possível capturar o relatório para PDF.',
                    variant: 'destructive'
                });
                return;
            }

            const input = relatorioRef.current;
            const canvas = await html2canvas(input, { 
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            const nomeArquivo = `relatorio_${funcionarioNome.replace(/\s/g, '_')}_${meses.find(m => m.value === relatorio.mes?.toString())?.label}_${relatorio.ano}.pdf`;
            pdf.save(nomeArquivo);
            
            toast({
                title: 'PDF Gerado',
                description: 'O relatório foi baixado com sucesso.',
                variant: 'default'
            });
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            toast({
                title: 'Erro',
                description: 'Erro ao gerar PDF do relatório.',
                variant: 'destructive'
            });
        }
    };

    const formatarData = (data) => {
        return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
    };

    const formatarValor = (valor) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    };

    if (!isOpen) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Histórico de Salários - {funcionarioNome}
                        </DialogTitle>
                        <DialogDescription>
                            Visualize o histórico de alterações de salário e gere relatórios mensais detalhados.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Seção de Geração de Relatório */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Gerar Relatório Mensal
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="text-sm font-medium">Mês</label>
                                        <Select value={selectedMes} onValueChange={setSelectedMes}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o mês" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {meses.map(mes => (
                                                    <SelectItem key={mes.value} value={mes.value}>
                                                        {mes.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-sm font-medium">Ano</label>
                                        <Select value={selectedAno} onValueChange={setSelectedAno}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o ano" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {anos.map(ano => (
                                                    <SelectItem key={ano.value} value={ano.value}>
                                                        {ano.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button 
                                        onClick={gerarRelatorioMensal} 
                                        disabled={loading || !selectedMes || !selectedAno}
                                    >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Gerar Relatório
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Histórico de Alterações de Salário */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Histórico de Alterações de Salário
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="text-center py-4">Carregando...</div>
                                ) : historico.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data da Alteração</TableHead>
                                                <TableHead>Salário Anterior</TableHead>
                                                <TableHead>Novo Salário</TableHead>
                                                <TableHead>Diferença</TableHead>
                                                <TableHead>Motivo</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {historico.map((item, index) => (
                                                <TableRow key={item.id || index}>
                                                    <TableCell>{formatarData(item.data_alteracao)}</TableCell>
                                                    <TableCell>{formatarValor(item.salario_anterior)}</TableCell>
                                                    <TableCell>{formatarValor(item.novo_salario)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={item.diferenca >= 0 ? "default" : "destructive"}>
                                                            {item.diferenca >= 0 ? '+' : ''}{formatarValor(item.diferenca)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{item.motivo || 'Não informado'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="text-center py-4 text-muted-foreground">
                                        Nenhuma alteração de salário registrada.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Relatórios Gerados */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5" />
                                        Relatórios Mensais Gerados
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={carregarDados}
                                        disabled={loading}
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Atualizar
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="text-center py-4">Carregando...</div>
                                ) : relatorios.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Mês/Ano</TableHead>
                                                <TableHead>Salário Base</TableHead>
                                                <TableHead>Total Vales</TableHead>
                                                <TableHead>Total Descontos</TableHead>
                                                <TableHead>Consumo Interno</TableHead>
                                                <TableHead>Salário Líquido</TableHead>
                                                <TableHead>Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {relatorios.map((relatorio) => (
                                                <TableRow key={relatorio.id}>
                                                    <TableCell>
                                                        {meses.find(m => m.value === relatorio.mes.toString())?.label} {relatorio.ano}
                                                    </TableCell>
                                                    <TableCell>{formatarValor(relatorio.salario_base)}</TableCell>
                                                    <TableCell>{formatarValor(relatorio.total_vales)}</TableCell>
                                                    <TableCell>{formatarValor(relatorio.total_faltas)}</TableCell>
                                                    <TableCell>{formatarValor(relatorio.total_consumo_interno || 0)}</TableCell>
                                                    <TableCell>{formatarValor(relatorio.salario_liquido)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                onClick={() => {
                                                                    setRelatorioDetalhado(relatorio);
                                                                    setShowRelatorioDetalhado(true);
                                                                }}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                onClick={() => downloadRelatorio(relatorio)}
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="text-center py-4 text-muted-foreground">
                                        Nenhum relatório mensal gerado.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <DialogFooter>
                        <Button variant="secondary" onClick={onClose}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Relatório Detalhado */}
            {showRelatorioDetalhado && relatorioDetalhado && (
                <Dialog open={showRelatorioDetalhado} onOpenChange={setShowRelatorioDetalhado}>
                    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                Relatório Detalhado - {meses.find(m => m.value === relatorioDetalhado.mes?.toString())?.label} {relatorioDetalhado.ano}
                            </DialogTitle>
                            <DialogDescription>
                                Visualização detalhada do relatório mensal com todos os valores e descontos do período.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div ref={relatorioRef} className="bg-white p-8 text-black space-y-6">
                            {/* Cabeçalho do Relatório */}
                            <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                                <h1 className="text-2xl font-bold mb-2">RELATÓRIO MENSAL DE SALÁRIO</h1>
                                <p className="text-lg font-semibold">{funcionarioNome}</p>
                                <p className="text-sm text-gray-600">
                                    Período: {meses.find(m => m.value === relatorioDetalhado.mes?.toString())?.label} de {relatorioDetalhado.ano}
                                </p>
                            </div>

                            {/* Resumo Financeiro */}
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <Card>
                                    <CardContent className="p-4 text-center">
                                        <p className="text-sm text-gray-600 mb-1">Salário Base</p>
                                        <p className="text-2xl font-bold text-blue-600">{formatarValor(relatorioDetalhado.salario_base)}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4 text-center">
                                        <p className="text-sm text-gray-600 mb-1">Salário Líquido</p>
                                        <p className="text-2xl font-bold text-green-600">{formatarValor(relatorioDetalhado.salario_liquido)}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Detalhamento de Descontos */}
                            <div className="space-y-6">
                                {/* Vales/Adiantamentos */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-300 pb-2">
                                        Vales e Adiantamentos
                                    </h3>
                                    {(relatorioDetalhado.vales?.length > 0 || (relatorioDetalhado.total_vales > 0 && !relatorioDetalhado.vales)) ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Data</TableHead>
                                                    <TableHead>Motivo</TableHead>
                                                    <TableHead className="text-right">Valor</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {relatorioDetalhado.vales?.length > 0 ? (
                                                    relatorioDetalhado.vales.map((vale, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{formatarData(vale.data)}</TableCell>
                                                            <TableCell>{vale.motivo || 'Não informado'}</TableCell>
                                                            <TableCell className="text-right text-red-600 font-medium">
                                                                -{formatarValor(vale.valor)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center text-gray-500 italic">
                                                            Detalhes dos vales não disponíveis - verificar no sistema
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                <TableRow className="bg-red-50">
                                                    <TableCell colSpan={2} className="font-medium">Total de Vales</TableCell>
                                                    <TableCell className="text-right font-bold text-red-600">
                                                        -{formatarValor(relatorioDetalhado.total_vales || 0)}
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded">
                                            Nenhum vale registrado neste período
                                        </p>
                                    )}
                                </div>

                                {/* Faltas/Descontos */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-300 pb-2">
                                        Faltas e Descontos
                                    </h3>
                                    {(relatorioDetalhado.faltas?.length > 0 || (relatorioDetalhado.total_faltas > 0 && !relatorioDetalhado.faltas)) ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Data</TableHead>
                                                    <TableHead>Motivo</TableHead>
                                                    <TableHead className="text-right">Valor do Desconto</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {relatorioDetalhado.faltas?.length > 0 ? (
                                                    relatorioDetalhado.faltas.map((falta, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{formatarData(falta.data)}</TableCell>
                                                            <TableCell>{falta.motivo || 'Não informado'}</TableCell>
                                                            <TableCell className="text-right text-red-600 font-medium">
                                                                -{formatarValor(falta.valorDesconto)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center text-gray-500 italic">
                                                            Detalhes das faltas/descontos não disponíveis - verificar no sistema
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                <TableRow className="bg-red-50">
                                                    <TableCell colSpan={2} className="font-medium">Total de Descontos</TableCell>
                                                    <TableCell className="text-right font-bold text-red-600">
                                                        -{formatarValor(relatorioDetalhado.total_faltas || 0)}
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded">
                                            Nenhuma falta registrada neste período
                                        </p>
                                    )}
                                </div>

                                {/* Consumo Interno */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b border-gray-300 pb-2">
                                        Consumo Interno
                                    </h3>
                                    {(relatorioDetalhado.consumo_interno?.length > 0 || (relatorioDetalhado.total_consumo_interno > 0 && !relatorioDetalhado.consumo_interno)) ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Data</TableHead>
                                                    <TableHead>Descrição</TableHead>
                                                    <TableHead>Tipo</TableHead>
                                                    <TableHead className="text-right">Valor</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {relatorioDetalhado.consumo_interno?.length > 0 ? (
                                                    relatorioDetalhado.consumo_interno.map((consumo, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{formatarData(consumo.data)}</TableCell>
                                                            <TableCell>{consumo.descricao}</TableCell>
                                                            <TableCell>{consumo.tipo}</TableCell>
                                                            <TableCell className="text-right text-red-600 font-medium">
                                                                -{formatarValor(consumo.valor)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center text-gray-500 italic">
                                                            Detalhes do consumo interno não disponíveis - verificar no sistema
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                <TableRow className="bg-red-50">
                                                    <TableCell colSpan={3} className="font-medium">Total de Consumo Interno</TableCell>
                                                    <TableCell className="text-right font-bold text-red-600">
                                                        -{formatarValor(relatorioDetalhado.total_consumo_interno || 0)}
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded">
                                            Nenhum consumo interno registrado neste período
                                        </p>
                                    )}
                                </div>
                            </div>

                            <Separator className="my-6" />

                            {/* Resumo Final */}
                            <div className="bg-gray-100 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold mb-4 text-center">Resumo do Período</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span>Salário Base:</span>
                                            <span className="font-medium">{formatarValor(relatorioDetalhado.salario_base)}</span>
                                        </div>
                                        <div className="flex justify-between text-red-600">
                                            <span>(-) Total Vales:</span>
                                            <span className="font-medium">{formatarValor(relatorioDetalhado.total_vales || 0)}</span>
                                        </div>
                                        <div className="flex justify-between text-red-600">
                                            <span>(-) Total Faltas:</span>
                                            <span className="font-medium">{formatarValor(relatorioDetalhado.total_faltas || 0)}</span>
                                            </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-red-600">
                                            <span>(-) Consumo Interno:</span>
                                            <span className="font-medium">{formatarValor(relatorioDetalhado.total_consumo_interno || 0)}</span>
                            </div>
                                        <Separator />
                                        <div className="flex justify-between text-lg font-bold text-green-600">
                                            <span>Salário Líquido:</span>
                                            <span>{formatarValor(relatorioDetalhado.salario_liquido)}</span>
                                            </div>
                                    </div>
                                </div>
                            </div>

                            {/* Rodapé */}
                            <div className="text-center mt-8 pt-4 border-t border-gray-200">
                                <p className="text-xs text-gray-400">
                                    Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Sistema de Gestão de Funcionários
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button 
                                variant="outline"
                                onClick={() => downloadRelatorio(relatorioDetalhado)}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Baixar PDF
                            </Button>
                            <Button variant="secondary" onClick={() => setShowRelatorioDetalhado(false)}>
                                Fechar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};

export default HistoricoSalarioModal; 