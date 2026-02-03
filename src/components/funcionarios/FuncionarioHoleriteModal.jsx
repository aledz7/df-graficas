import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from '@/components/ui/use-toast';
import { Printer, Download } from 'lucide-react';

const FuncionarioHoleriteModal = ({ isOpen, onClose, holeriteData }) => {
    const { toast } = useToast();
    const holeriteRef = useRef();

    // Debug: verificar dados recebidos
    React.useEffect(() => {
        if (isOpen && holeriteData) {
            console.log('📊 Dados do holerite recebidos:', {
                consumoInternoItens: holeriteData.consumoInternoItens,
                totalConsumoInterno: holeriteData.totalConsumoInterno,
                periodo: holeriteData.periodo,
                mesNome: holeriteData.mesNome,
                mes: holeriteData.mes,
                ano: holeriteData.ano
            });
        }
    }, [isOpen, holeriteData]);

    const handlePrint = () => {
        const input = holeriteRef.current;
        html2canvas(input, { scale: 2 }).then(canvas => {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`<html><head><title>Holerite de ${holeriteData.name}</title></head><body>`);
            printWindow.document.write('<img src="' + canvas.toDataURL() + '" style="width: 100%;" />');
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 250);
        });
    };

    const handleDownload = () => {
        const input = holeriteRef.current;
        html2canvas(input, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`holerite_${holeriteData.name.replace(/\s/g, '_')}.pdf`);
            toast({ title: 'PDF Gerado', description: 'O holerite foi baixado.' });
        });
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Holerite de Pagamento</DialogTitle>
                </DialogHeader>
                <div ref={holeriteRef} className="p-6 bg-white text-black">
                    <h2 className="text-xl font-bold text-center mb-4">Recibo de Pagamento de Salário</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div><p><strong>Funcionário:</strong> {holeriteData.name}</p></div>
                        <div><p><strong>CPF:</strong> {holeriteData.cpf}</p></div>
                        <div><p><strong>Cargo:</strong> {holeriteData.cargo}</p></div>
                        <div><p><strong>Período:</strong> {holeriteData.periodo || holeriteData.mesNome || (holeriteData.mes && holeriteData.ano ? `${holeriteData.mes}/${holeriteData.ano}` : format(new Date(), 'MMMM yyyy', { locale: ptBR }))}</p></div>
                    </div>
                    <Separator className="my-4" />
                    <table className="w-full text-sm">
                        <thead><tr className="border-b"><th className="text-left py-1">Descrição</th><th className="text-right py-1">Proventos (R$)</th><th className="text-right py-1">Descontos (R$)</th></tr></thead>
                        <tbody>
                            <tr className="border-b"><td className="py-1">Salário Base</td><td className="text-right">{parseFloat(holeriteData.salario_base || 0).toFixed(2)}</td><td></td></tr>
                            {holeriteData.vales?.map(v => <tr key={v.id} className="border-b"><td className="py-1">Adiantamento/Vale ({format(new Date(v.data), 'dd/MM/yy')}) {v.motivo}</td><td></td><td className="text-right">{Number(v.valor || 0).toFixed(2)}</td></tr>)}
                            {holeriteData.faltas?.map(f => <tr key={f.id} className="border-b"><td className="py-1">Falta/Desconto ({format(new Date(f.data), 'dd/MM/yy')}) {f.motivo}</td><td></td><td className="text-right">{Number(f.valorDesconto || 0).toFixed(2)}</td></tr>)}
                            {holeriteData.consumoInternoItens && Array.isArray(holeriteData.consumoInternoItens) && holeriteData.consumoInternoItens.length > 0 ? (
                                holeriteData.consumoInternoItens.map(c => {
                                    try {
                                        const dataFormatada = c.data ? format(new Date(c.data), 'dd/MM/yy', { locale: ptBR }) : 'Data não informada';
                                        return (
                                            <tr key={c.id || `consumo-${c.tipo}-${c.valor}`} className="border-b">
                                                <td className="py-1">Consumo Interno - {c.tipo || 'Crediário'} ({dataFormatada}) {c.descricao || ''}</td>
                                                <td></td>
                                                <td className="text-right">{Number(c.valor || 0).toFixed(2)}</td>
                                            </tr>
                                        );
                                    } catch (e) {
                                        return (
                                            <tr key={c.id || `consumo-${c.tipo}-${c.valor}`} className="border-b">
                                                <td className="py-1">Consumo Interno - {c.tipo || 'Crediário'} {c.descricao || ''}</td>
                                                <td></td>
                                                <td className="text-right">{Number(c.valor || 0).toFixed(2)}</td>
                                            </tr>
                                        );
                                    }
                                })
                            ) : holeriteData.totalConsumoInterno > 0 ? (
                                <tr className="border-b">
                                    <td className="py-1">Consumo Interno - Pagos por Crediário</td>
                                    <td></td>
                                    <td className="text-right">{Number(holeriteData.totalConsumoInterno || 0).toFixed(2)}</td>
                                </tr>
                            ) : null}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold">
                                <td className="py-2">TOTAIS</td>
                                <td className="text-right">{Number(holeriteData.salario_base || 0).toFixed(2)}</td>
                                <td className="text-right">
                                    {(() => {
                                        const totalVales = Number(holeriteData.totalVales || 0) || 0;
                                        const totalFaltas = Number(holeriteData.descontoFaltas || holeriteData.totalFaltas || 0) || 0;
                                        const totalConsumo = Number(holeriteData.totalConsumoInterno || 0) || 0;
                                        const totalDescontos = totalVales + totalFaltas + totalConsumo;
                                        return totalDescontos.toFixed(2);
                                    })()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                    <Separator className="my-4" />
                    <div className="text-right font-bold text-lg">
                        <p>VALOR LÍQUIDO A RECEBER: R$ {Number(holeriteData.salarioLiquido || 0).toFixed(2)}</p>
                    </div>
                    <div className="mt-16 text-center text-sm">
                        <p>_________________________________________</p>
                        <p>{holeriteData.name}</p>
                        <p>Declaro ter recebido a importância líquida descrita neste recibo.</p>
                        <p>Data: ___/___/______</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
                    <Button onClick={handleDownload}><Download className="mr-2 h-4 w-4" /> Baixar PDF</Button>
                    <Button variant="secondary" onClick={onClose}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default FuncionarioHoleriteModal;