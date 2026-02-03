import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from '@/components/ui/use-toast';
import { Printer, Download, X } from 'lucide-react';

const ValeImpressaoModal = ({ isOpen, onClose, vale, funcionario }) => {
    const { toast } = useToast();
    const valeRef = useRef();

    const handlePrint = () => {
        const input = valeRef.current;
        html2canvas(input, { scale: 2 }).then(canvas => {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`<html><head><title>Vale - ${funcionario.name}</title></head><body>`);
            printWindow.document.write('<img src="' + canvas.toDataURL() + '" style="width: 100%;" />');
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 250);
        });
    };

    const handleDownload = () => {
        const input = valeRef.current;
        html2canvas(input, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            const fileName = `vale_${funcionario.name.replace(/\s/g, '_')}_${format(new Date(vale.data), 'dd-MM-yyyy')}.pdf`;
            pdf.save(fileName);
            toast({ title: 'PDF Gerado', description: 'O vale foi baixado.' });
        });
    };

    if (!isOpen || !vale || !funcionario) return null;

    const dataFormatada = format(new Date(vale.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const valorFormatado = parseFloat(vale.valor || 0).toFixed(2);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        Imprimir Vale
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogTitle>
                </DialogHeader>

                <div ref={valeRef} className="bg-white p-8 text-black">
                    {/* Cabeçalho */}
                    <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                        <h1 className="text-2xl font-bold mb-2">VALE / ADIANTAMENTO</h1>
                        <p className="text-sm text-gray-600">Comprovante de Adiantamento Salarial</p>
                    </div>

                    {/* Informações do Vale */}
                    <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Funcionário:</label>
                                <p className="text-lg font-medium border-b border-gray-300 pb-1">{funcionario.name}</p>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700">CPF:</label>
                                <p className="text-lg font-medium border-b border-gray-300 pb-1">{funcionario.cpf || 'Não informado'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Data:</label>
                                <p className="text-lg font-medium border-b border-gray-300 pb-1">{dataFormatada}</p>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Valor:</label>
                                <p className="text-xl font-bold text-green-600 border-b border-gray-300 pb-1">R$ {valorFormatado}</p>
                            </div>
                        </div>

                        {vale.motivo && (
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Motivo:</label>
                                <p className="text-lg font-medium border-b border-gray-300 pb-1">{vale.motivo}</p>
                            </div>
                        )}
                    </div>

                    <Separator className="my-6" />

                    {/* Observações */}
                    <div className="mb-6">
                        <p className="text-sm text-gray-600 mb-2">
                            <strong>Observações:</strong>
                        </p>
                        <ul className="text-xs text-gray-500 space-y-1">
                            <li>• Este vale será descontado do salário do funcionário na próxima folha de pagamento.</li>
                            <li>• Mantenha este comprovante para controle financeiro.</li>
                            <li>• Em caso de dúvidas, entre em contato com o departamento de recursos humanos.</li>
                        </ul>
                    </div>

                    {/* Assinaturas */}
                    <div className="grid grid-cols-2 gap-8 mt-12">
                        <div className="text-center">
                            <div className="border-t border-gray-400 pt-2">
                                <p className="text-sm font-semibold">Assinatura do Funcionário</p>
                                <p className="text-xs text-gray-500 mt-1">{funcionario.name}</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="border-t border-gray-400 pt-2">
                                <p className="text-sm font-semibold">Assinatura do Responsável</p>
                                <p className="text-xs text-gray-500 mt-1">Recursos Humanos</p>
                            </div>
                        </div>
                    </div>

                    {/* Rodapé */}
                    <div className="text-center mt-8 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-400">
                            Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </Button>
                    <Button onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Baixar PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ValeImpressaoModal;
