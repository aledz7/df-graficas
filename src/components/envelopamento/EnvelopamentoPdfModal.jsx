import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from 'lucide-react';

const EnvelopamentoPdfModal = ({ open, onOpenChange, pdfDataUri }) => {
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfDataUri;
    link.download = `orcamento_envelopamento_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handlePrint = () => {
    const iframe = document.getElementById('pdf-iframe');
    if (iframe) {
      iframe.contentWindow.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Visualizador de PDF</DialogTitle>
        </DialogHeader>
        <div className="flex-grow">
          {pdfDataUri ? (
            <iframe
              id="pdf-iframe"
              src={pdfDataUri}
              className="w-full h-full"
              title="Visualizador de PDF do Orçamento"
            />
          ) : (
            <p className="text-center p-8">Gerando PDF...</p>
          )}
        </div>
        <DialogFooter className="p-4 border-t gap-2">
            <Button variant="outline" onClick={handlePrint}>
                <Printer size={16} className="mr-2"/> Imprimir
            </Button>
            <Button onClick={handleDownload} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Download size={16} className="mr-2"/> Baixar PDF
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnvelopamentoPdfModal;