import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, Download, X } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const MarketplaceNotinhaModal = ({ isOpen, onClose, venda, nomeEmpresa, logoUrl }) => {
    const notinhaRef = useRef();

      const handlePrint = useReactToPrint({
    content: () => notinhaRef.current,
                        documentTitle: `Notinha_Pedido_${venda?.id ? String(venda.id).slice(-6) : 'Marketplace'}`,
        pageStyle: `
            @page {
                size: A6;
                margin: 5mm;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .notinha-content {
                    font-size: 9pt;
                    line-height: 1.2;
                }
                .notinha-content h2 {
                    font-size: 11pt;
                    margin-bottom: 2px;
                }
                .notinha-content p, .notinha-content li {
                    margin-bottom: 1px;
                }
                .notinha-content ul {
                    padding-left: 15px;
                }
                .notinha-header img {
                    max-height: 30px !important;
                }
            }
        `
    });

    const handleDownloadPdf = async () => {
        const element = notinhaRef.current;
        if (!element) return;

        const canvas = await html2canvas(element, {
            scale: 2, 
            useCORS: true,
            logging: false,
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a6' 
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pdfWidth - 10; 
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        
        let finalImgHeight = imgHeight;
        if (imgHeight > pdfHeight - 10) {
            finalImgHeight = pdfHeight - 10;
        }
        
        pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, finalImgHeight);
                        pdf.save(`Notinha_Pedido_${venda?.id ? String(venda.id).slice(-6) : 'Marketplace'}.pdf`);
    };

    if (!venda) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0">
                <DialogHeader className="p-4 pb-2 border-b">
                    <DialogTitle>Notinha do Pedido: {venda.id ? String(venda.id).slice(-6) : 'N/A'}</DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="max-h-[60vh]">
                    <div ref={notinhaRef} className="p-4 notinha-content bg-white text-black">
                        <div className="notinha-header flex justify-between items-start mb-2 pb-1 border-b border-gray-300">
                            <div>
                                {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 object-contain mb-1" />}
                                <h2 className="text-sm font-bold">{nomeEmpresa || 'Sua Empresa'}</h2>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-semibold">Pedido Marketplace</p>
                                <p className="text-xs">ID: {venda.id.slice(-8)}</p>
                            </div>
                        </div>

                        <div className="mb-1">
                            <p className="text-xs"><strong>Cliente:</strong> {venda.cliente_nome}</p>
                            <p className="text-xs"><strong>Data:</strong> {format(parseISO(venda.data_venda), 'dd/MM/yy HH:mm')}</p>
                        </div>
                        
                        <div className="my-2">
                            <h3 className="text-xs font-semibold border-b border-dashed border-gray-400 mb-0.5">Produtos:</h3>
                            <ul className="text-xs list-none p-0">
                                {venda.produtos.map(p => {
                                    const quantidade = parseInt(p.quantidade) || 0;
                                    const precoUnitario = parseFloat(p.preco_unitario) || 0;
                                    const subtotal = parseFloat(p.subtotal) || (precoUnitario * quantidade);
                                    return (
                                        <li key={p.id} className="flex justify-between">
                                            <span>{quantidade}x {p.nome}</span>
                                            <span>R$ {subtotal.toFixed(2)}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div className="text-xs border-t border-dashed border-gray-400 pt-1 mt-1">
                            <p className="flex justify-between"><strong>Total:</strong> <span className="font-bold">R$ {(parseFloat(venda.valor_total) || 0).toFixed(2)}</span></p>
                            <p><strong>Status:</strong> {venda.status_pedido}</p>
                        </div>
                        
                        {venda.observacoes && (
                            <div className="mt-1 pt-1 border-t border-dashed border-gray-400">
                                <p className="text-xs"><strong>Obs:</strong> {venda.observacoes}</p>
                            </div>
                        )}
                         <p className="text-center text-[8pt] mt-2">Obrigado!</p>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 border-t flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={handleDownloadPdf} className="w-full sm:w-auto">
                        <Download size={16} className="mr-2" /> Baixar PDF
                    </Button>
                    <Button onClick={() => window.print()} className="w-full sm:w-auto">
                        <Printer size={16} className="mr-2" /> Imprimir Notinha
                    </Button>
                    <DialogClose asChild>
                        <Button variant="ghost" className="w-full sm:w-auto"><X size={16} className="mr-2"/> Fechar</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MarketplaceNotinhaModal;