import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Save, RotateCcw, UploadCloud } from 'lucide-react';
import OSDocumentModal from '@/components/os/OSDocumentModal.jsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const OSFinalizacao = ({ 
  ordemServico, 
  setOrdemServico, 
  resetOrdemServico, 
  logoUrl, 
  nomeEmpresa, 
  clienteSelecionadoOS,
  clienteNomeLivreOS,
  obsClienteOS,
  setObsClienteOS,
  osSalvaPelaPrimeiraVez,
  setOsSalvaPelaPrimeiraVez,
  handleUploadArteFinal
}) => {
  const { toast } = useToast();
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const documentRef = useRef();

  const handleSaveOSInternal = async () => {
    const osToSave = {
        ...ordemServico,
        clienteId: clienteSelecionadoOS?.id,
        clienteNomeLivre: clienteNomeLivreOS,
        obs_cliente: obsClienteOS,
        data_salvamento: new Date().toISOString(),
    };

    const ordensSalvas = JSON.parse(await apiDataManager.getItem('ordens_servico_orcamentos') || '[]');
    const osIndex = ordensSalvas.findIndex(os => os.id === osToSave.id);

    if (osIndex > -1) {
        ordensSalvas[osIndex] = osToSave;
    } else {
        ordensSalvas.push(osToSave);
    }
    await apiDataManager.setItem('ordens_servico_orcamentos', ordensSalvas);
    setOrdemServico(osToSave); 
    if (!osSalvaPelaPrimeiraVez) setOsSalvaPelaPrimeiraVez(true);
    return osToSave;
  };

  const handleSaveAndShowToast = () => {
    handleSaveOSInternal();
    toast({ title: "Orçamento de OS Salvo!", description: `Orçamento OS ${ordemServico.id} foi salvo localmente.` });
  };

  const handleFinalizarGerarPDF = () => {
    if (ordemServico.itens.length === 0) {
      toast({ title: "Erro", description: "Adicione itens à OS antes de gerar o orçamento.", variant: "destructive" });
      return;
    }
    if (!clienteSelecionadoOS && !clienteNomeLivreOS) {
        toast({ title: "Cliente Necessário", description: "Selecione ou informe um nome de cliente para o orçamento.", variant: "destructive"});
        return;
    }
    
    const osAtualizada = handleSaveOSInternal(); 
    setOrdemServico(osAtualizada); 
    setIsDocumentModalOpen(true);
  };
  
  const handleImpressaoDocumento = () => {
    const input = documentRef.current;
    if (!input) {
      toast({ title: "Erro", description: "Não foi possível preparar para impressão.", variant: "destructive"});
      return;
    }
    html2canvas(input, { scale: 2, useCORS: true, logging: false }).then(canvas => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<html><head><title>Orçamento OS ${ordemServico.id}</title>`);
        printWindow.document.write('<style>body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; } img { max-width: 100%; max-height: 95vh; object-fit: contain; } @page { size: A4; margin: 10mm; }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<img src="' + canvas.toDataURL('image/png') + '" />');
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 250);
    }).catch(err => {
        console.error("Erro ao gerar canvas para impressão:", err);
        toast({ title: "Erro de Impressão", description: "Não foi possível gerar visualização para impressão.", variant: "destructive"});
    });
  };

  const handleGerarPdfDocumento = () => {
    const input = documentRef.current;
    if (!input) {
      toast({ title: "Erro", description: "Não foi possível gerar o PDF.", variant: "destructive"});
      return;
    }
    html2canvas(input, { scale: 2, useCORS: true, logging: false })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        let imgWidth = pdfWidth - 20; 
        let imgHeight = imgWidth / ratio;
        if (imgHeight > pdfHeight - 20) {
            imgHeight = pdfHeight - 20;
            imgWidth = imgHeight * ratio;
        }
        const x = (pdfWidth - imgWidth) / 2;
        const y = (pdfHeight - imgHeight) / 2;
        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');
        pdf.save(`orcamento_os_${ordemServico.id}.pdf`);
        toast({ title: "PDF Gerado", description: `O PDF do orçamento OS ${ordemServico.id} foi baixado.` });
      })
      .catch(err => {
        console.error("Erro ao gerar PDF:", err);
        toast({ title: "Erro ao Gerar PDF", description: "Ocorreu um problema ao tentar gerar o PDF.", variant: "destructive"});
      });
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader><CardTitle>Observações e Finalização da OS</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="obs-cliente-os-finalizacao">Observações sobre o cliente ou pedido (geral)</Label>
            <Textarea 
              id="obs-cliente-os-finalizacao"
              value={obsClienteOS}
              onChange={(e) => setObsClienteOS(e.target.value)}
              placeholder="Ex: serviço para lateral do carro do João, preferência de contato, etc."
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="os-observacoes-gerais">Observações Gerais da OS (internas)</Label>
            <Textarea 
              id="os-observacoes-gerais" 
              name="observacoes_gerais" 
              value={ordemServico.observacoes_gerais} 
              onChange={(e) => setOrdemServico(prev => ({...prev, observacoes_gerais: e.target.value}))} 
              placeholder="Anotações sobre a OS, prazos, condições especiais, etc." 
              rows={3}
            />
          </div>

          {osSalvaPelaPrimeiraVez && (
            <div className="pt-4 border-t">
              <Label htmlFor="upload_arte_final" className="flex items-center text-md font-semibold mb-2">
                <UploadCloud size={20} className="mr-2 text-primary"/> Anexar arquivo final da arte (Opcional)
              </Label>
              <Input 
                id="upload_arte_final" 
                type="file" 
                onChange={handleUploadArteFinal} 
                accept=".pdf,.jpg,.jpeg,.png"
                className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {ordemServico.arquivo_final_nome && (
                <p className="text-xs mt-1 text-muted-foreground">Arquivo anexado: {ordemServico.arquivo_final_nome}</p>
              )}
            </div>
          )}


          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={resetOrdemServico}>
                <RotateCcw size={16} className="mr-2"/> Limpar OS / Novo
            </Button> 
            <Button onClick={handleSaveAndShowToast} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Save size={18} className="mr-2"/> Salvar Orçamento
            </Button>
            <Button onClick={handleFinalizarGerarPDF} className="bg-green-600 hover:bg-green-700 text-white">
              <FileText size={18} className="mr-2"/> Finalizar e Gerar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {isDocumentModalOpen && ordemServico && (
        <OSDocumentModal
            isOpen={isDocumentModalOpen}
            setIsOpen={setIsDocumentModalOpen}
            documentRef={documentRef}
            documento={ordemServico} 
            logoUrl={logoUrl}
            nomeEmpresa={nomeEmpresa}
            onGerarPdf={handleGerarPdfDocumento}
        />
      )}
    </>
  );
};

export default OSFinalizacao;