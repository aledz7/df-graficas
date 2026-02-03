import { useToast } from '@/components/ui/use-toast';
import { generatePdfFromElement, generateTextBasedPdf, printElement } from '@/lib/osDocumentGenerator';
import { apiDataManager } from '@/lib/apiDataManager';

export const useOSDocumentHandlers = (
  ordemServico,
  clienteSelecionado,
  setIsDocumentModalOpen,
  documentRef
) => {
  const { toast } = useToast();

  const handleGerarPdfDocumento = async () => {
    if (!ordemServico.itens || ordemServico.itens.length === 0) {
      toast({ title: "OS Vazia", description: "Adicione itens antes de gerar o PDF.", variant: "destructive" });
      return;
    }
    if (!clienteSelecionado && !ordemServico.cliente_nome_manual) {
      toast({ title: "Cliente Não Informado", description: "Selecione um cliente ou digite um nome avulso para o PDF.", variant: "destructive" });
      return;
    }
    setIsDocumentModalOpen(true);
    setTimeout(async () => {
      try {
        if (documentRef.current) {
          await generatePdfFromElement(documentRef.current, `OS_${ordemServico?.id_os || 'documento'}.pdf`);
          toast({ title: "PDF Gerado", description: `O PDF da OS foi baixado.` });
        } else {
          toast({ title: "Erro ao Gerar PDF", description: "Referência do documento não encontrada.", variant: "destructive" });
        }
      } catch (error) {
        console.error("Erro ao gerar PDF com html2canvas:", error);
        
        // Tentar gerar PDF baseado em texto como fallback
        try {
          const empresaSettingsStr = await apiDataManager.getItem('empresaSettings');
          const empresaSettings = JSON.parse(empresaSettingsStr || '{}');
          
          generateTextBasedPdf(ordemServico, empresaSettings, `OS_${ordemServico?.id_os || 'documento'}.pdf`);
          toast({ 
            title: "PDF Gerado (Modo Alternativo)", 
            description: `O PDF da OS foi baixado usando modo alternativo.` 
          });
        } catch (fallbackError) {
          console.error("Erro no fallback também:", fallbackError);
          toast({ 
            title: "Erro ao Gerar PDF", 
            description: "Não foi possível gerar o PDF. Tente usar a opção de impressão.", 
            variant: "destructive" 
          });
        }
      }
    }, 100);
  };

  const handleImpressaoDocumento = async () => {
    if (!ordemServico.itens || ordemServico.itens.length === 0) {
      toast({ title: "OS Vazia", description: "Adicione itens antes de imprimir.", variant: "destructive" });
      return;
    }
    if (!clienteSelecionado && !ordemServico.cliente_nome_manual) {
      toast({ title: "Cliente Não Informado", description: "Selecione um cliente ou digite um nome avulso para imprimir.", variant: "destructive" });
      return;
    }
    setIsDocumentModalOpen(true);
    setTimeout(async () => {
      try {
        if (documentRef.current) {
          await printElement(documentRef.current, `Ordem de Serviço ${ordemServico.id_os}`);
        } else {
          toast({ title: "Erro de Impressão", description: "Referência do documento não encontrada.", variant: "destructive" });
        }
      } catch (error) {
        console.error("Erro ao imprimir:", error);
        toast({ title: "Erro de Impressão", description: error.message || "Ocorreu um problema.", variant: "destructive" });
      }
    }, 100);
  };

  return {
    handleGerarPdfDocumento,
    handleImpressaoDocumento,
  };
};