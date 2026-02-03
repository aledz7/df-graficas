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

const FaltaDescontoImpressaoModal = ({ isOpen, onClose, falta, funcionario }) => {
    const { toast } = useToast();
    const faltaRef = useRef();

    const handlePrint = () => {
        const input = faltaRef.current;
        html2canvas(input, { scale: 2 }).then(canvas => {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`<html><head><title>Desconto/Falta - ${funcionario.name}</title></head><body>`);
            printWindow.document.write('<img src="' + canvas.toDataURL() + '" style="width: 100%;" />');
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 250);
        });
    };

    const handleDownload = () => {
        const input = faltaRef.current;
        html2canvas(input, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            const fileName = `desconto_${funcionario.name.replace(/\s/g, '_')}_${format(new Date(falta.data), 'dd-MM-yyyy')}.pdf`;
            pdf.save(fileName);
            toast({ title: 'PDF Gerado', description: 'O comprovante de desconto foi baixado.' });
        });
    };

    if (!isOpen || !falta || !funcionario) return null;

    const dataFormatada = format(new Date(falta.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const valorFormatado = parseFloat(falta.valorDesconto || 0).toFixed(2);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        Imprimir Desconto/Falta
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogTitle>
                </DialogHeader>

                <div ref={faltaRef} className="bg-white p-8 text-black">
                    {/* Cabeçalho */}
                    <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                        <h1 className="text-2xl font-bold mb-2">COMPROVANTE DE DESCONTO</h1>
                        <p className="text-sm text-gray-600">Falta / Desconto Salarial</p>
                    </div>

                    {/* Informações do Desconto */}
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
                                <label className="text-sm font-semibold text-gray-700">Data da Ocorrência:</label>
                                <p className="text-lg font-medium border-b border-gray-300 pb-1">{dataFormatada}</p>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Valor do Desconto:</label>
                                <p className="text-xl font-bold text-red-600 border-b border-gray-300 pb-1">R$ {valorFormatado}</p>
                            </div>
                        </div>

                        {falta.motivo && (
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Motivo:</label>
                                <p className="text-lg font-medium border-b border-gray-300 pb-1">{falta.motivo}</p>
                            </div>
                        )}
                    </div>

                    <Separator className="my-6" />

                    {/* Detalhes do Desconto */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800">Detalhes do Desconto</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Tipo:</span>
                                <span className="font-medium">Desconto Salarial por Falta/Ocorrência</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Data da Aplicação:</span>
                                <span className="font-medium">{format(new Date(), "dd/MM/yyyy", { locale: ptBR })}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Status:</span>
                                <span className="font-medium text-orange-600">Pendente de Aplicação na Folha</span>
                            </div>
                        </div>
                    </div>

                    {/* Observações */}
                    <div className="mb-6">
                        <p className="text-sm text-gray-600 mb-2">
                            <strong>Observações Importantes:</strong>
                        </p>
                        <ul className="text-xs text-gray-500 space-y-1">
                            <li>• Este desconto será aplicado no salário do funcionário na próxima folha de pagamento.</li>
                            <li>• O funcionário tem direito a contestar este desconto junto ao departamento de RH.</li>
                            <li>• Mantenha este comprovante para controle e auditoria.</li>
                            <li>• Em caso de dúvidas sobre a aplicação deste desconto, procure o setor de recursos humanos.</li>
                        </ul>
                    </div>

                    {/* Declaração de Ciência */}
                    <div className="border border-gray-300 p-4 rounded-lg mb-6">
                        <p className="text-sm text-gray-700 mb-3">
                            <strong>Declaração de Ciência:</strong>
                        </p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Declaro estar ciente do desconto acima especificado e concordo com sua aplicação conforme 
                            as políticas da empresa e legislação trabalhista vigente. Tenho conhecimento de que este 
                            valor será descontado de meu próximo salário.
                        </p>
                    </div>

                    {/* Assinaturas */}
                    <div className="grid grid-cols-2 gap-8 mt-12">
                        <div className="text-center">
                            <div className="border-t border-gray-400 pt-2">
                                <p className="text-sm font-semibold">Assinatura do Funcionário</p>
                                <p className="text-xs text-gray-500 mt-1">{funcionario.name}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Data: ___/___/______
                                </p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="border-t border-gray-400 pt-2">
                                <p className="text-sm font-semibold">Assinatura do Responsável</p>
                                <p className="text-xs text-gray-500 mt-1">Recursos Humanos</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Data: ___/___/______
                                </p>
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

export default FaltaDescontoImpressaoModal;
