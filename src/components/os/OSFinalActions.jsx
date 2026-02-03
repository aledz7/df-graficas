import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Save, FileText as FilePdfIcon, MessageSquare as WhatsAppIcon, RotateCcw, ShoppingCart } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import OSDocumentModal from '@/components/os/OSDocumentModal'; 
import SenhaMasterModal from '@/components/SenhaMasterModal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { safeJsonParse } from '@/lib/utils';
import { addDays } from 'date-fns';

const OSFinalActions = ({ 
  onSaveOrcamento, 
  onFinalizarOS, 
  onResetOS, 
  ordemServico,
  setOrdemServico, 
  clienteInfo, 
  logoUrl, 
  nomeEmpresa,
  acabamentosConfig,
  isOSFinalizada,
  vendedorAtual,
  isSaving
}) => {
  const { toast } = useToast();
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isSenhaModalOpen, setIsSenhaModalOpen] = useState(false);
  const documentRef = useRef();

  const handleSalvarOrcamentoOS = () => {
    const itensDaOS = Array.isArray(ordemServico.itens) ? ordemServico.itens : [];
    if (itensDaOS.length === 0) {
      toast({ title: "OS Vazia", description: "Adicione itens antes de salvar o orçamento.", variant: "destructive" });
      return;
    }
    if (!clienteInfo && !ordemServico.cliente_nome_manual) {
        toast({ title: "Cliente Não Informado", description: "Selecione um cliente ou digite um nome avulso.", variant: "destructive" });
        return;
    }
    
    // Validação de campos obrigatórios
    const camposFaltantes = [];
    
    if (!ordemServico.data_previsao_entrega) {
        camposFaltantes.push('Previsão de Entrega');
    }
    
    if (!ordemServico.maquina_impressao_id) {
        camposFaltantes.push('Máquina de Impressão');
    }
    
    if (!ordemServico.observacoes_gerais_os?.trim()) {
        camposFaltantes.push('Observações Gerais da OS');
    }
    
    if (camposFaltantes.length > 0) {
        toast({
            title: "Campos Obrigatórios",
            description: `Por favor, preencha os seguintes campos: ${camposFaltantes.join(', ')}.`,
            variant: "destructive"
        });
        return;
    }
    
    // Antes de salvar, solicitar senha master
    setIsSenhaModalOpen(true);
  };

  const handleSenhaMasterOk = () => {
    setIsSenhaModalOpen(false);
    onSaveOrcamento();
  };

  const handleGeneratePdfAndOpenModal = () => {
    const itensDaOS = Array.isArray(ordemServico.itens) ? ordemServico.itens : [];
    if (itensDaOS.length === 0) {
      toast({ title: "OS Vazia", description: "Adicione itens antes de gerar o PDF.", variant: "destructive" });
      return;
    }
    if (!clienteInfo && !ordemServico.cliente_nome_manual) {
        toast({ title: "Cliente Não Informado", description: "Selecione um cliente ou digite um nome avulso para o PDF.", variant: "destructive" });
        return;
    }
    
    const osParaPdf = {
      ...ordemServico,
      cliente_info: clienteInfo || { nome: ordemServico.cliente_nome_manual },
      vendedor_nome: vendedorAtual?.nome,
    };
    setOrdemServico(osParaPdf); 
    setIsDocumentModalOpen(true);
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
        pdf.save(`OS_${ordemServico?.id_os || 'documento'}.pdf`);
        toast({ title: "PDF Gerado", description: `O PDF da OS foi baixado.` });
      })
      .catch(err => {
        console.error("Erro ao gerar PDF:", err);
        toast({ title: "Erro ao Gerar PDF", description: "Ocorreu um problema ao tentar gerar o PDF.", variant: "destructive"});
      });
  };

  const handleImpressaoDocumento = () => {
    const input = documentRef.current;
    if (!input) {
        toast({ title: "Erro", description: "Não foi possível preparar para impressão.", variant: "destructive"});
        return;
    }
    html2canvas(input, { scale: 2, useCORS: true, logging: false }).then(canvas => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<html><head><title>Ordem de Serviço ${ordemServico.id_os}</title>`);
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

  const handleWhatsApp = () => {
    const itensDaOS = Array.isArray(ordemServico.itens) ? ordemServico.itens : [];
    if (itensDaOS.length === 0) {
      toast({ title: "OS Vazia", description: "Adicione itens antes de enviar.", variant: "destructive" });
      return;
    }
    const nomeClienteFinal = clienteInfo?.nome || ordemServico.cliente_nome_manual || "Cliente";
    let mensagem = `Olá ${nomeClienteFinal}! Segue o resumo da sua Ordem de Serviço/Orçamento Nº ${ordemServico.id_os}:\n\n`;
    
    itensDaOS.forEach(item => {
      const itemAcabamentosSelecionados = Array.isArray(item.acabamentos_selecionados) ? item.acabamentos_selecionados : [];
      if (item.tipo_item === 'm2') {
        mensagem += `*Serviço:* ${item.nome_servico_produto}\n`;
        mensagem += `  Medidas: ${item.largura}m x ${item.altura}m - Qtd: ${item.quantidade}\n`;
        if (itemAcabamentosSelecionados.length > 0) {
          const nomesAcabamentos = itemAcabamentosSelecionados.map(acabSelecionado => {
            const acabConfig = (Array.isArray(acabamentosConfig) ? acabamentosConfig : []).find(ac => ac.id === acabSelecionado.id);
            return acabConfig ? acabConfig.nome_acabamento : 'Acabamento Desconhecido';
          }).join(', ');
          if (nomesAcabamentos) mensagem += `  Acabamentos: ${nomesAcabamentos}\n`;
        }
      } else if (item.tipo_item === 'unidade') {
        mensagem += `*Produto:* ${item.nome_produto}\n`;
        mensagem += `  Qtd: ${item.quantidade}\n`;
      }
      mensagem += `  Subtotal: R$ ${parseFloat(item.subtotal_item || 0).toFixed(2)}\n\n`;
    });

    const totalGeral = parseFloat(ordemServico.valor_total_os || 0);

    mensagem += `*Total Geral: R$ ${totalGeral.toFixed(2)}*\n\n`;
    if (ordemServico.observacoes_gerais_os) {
      mensagem += `Observações: ${ordemServico.observacoes_gerais_os}\n`;
    }
    mensagem += `\nObrigado pela preferência!\n${nomeEmpresa || ''}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, '_blank');
    toast({ title: "Mensagem Pronta!", description: "Verifique a aba do WhatsApp." });
  };

  const handleOpenPagamento = () => {
    const itensDaOS = Array.isArray(ordemServico.itens) ? ordemServico.itens : [];
    if (itensDaOS.length === 0) {
      toast({ title: "OS Vazia", description: "Adicione itens antes de finalizar.", variant: "destructive" });
      return;
    }
    if (!clienteInfo && !ordemServico.cliente_nome_manual) {
        toast({ title: "Cliente Não Informado", description: "Selecione um cliente ou digite um nome avulso.", variant: "destructive" });
        return;
    }
    
    // Validação de campos obrigatórios
    const camposFaltantes = [];
    
    if (!ordemServico.data_previsao_entrega) {
        camposFaltantes.push('Previsão de Entrega');
    }
    
    if (!ordemServico.maquina_impressao_id) {
        camposFaltantes.push('Máquina de Impressão');
    }
    
    if (!ordemServico.observacoes_gerais_os?.trim()) {
        camposFaltantes.push('Observações Gerais da OS');
    }
    
    if (camposFaltantes.length > 0) {
        toast({
            title: "Campos Obrigatórios",
            description: `Por favor, preencha os seguintes campos: ${camposFaltantes.join(', ')}.`,
            variant: "destructive"
        });
        return;
    }
    
    onFinalizarOS();
  }

  return (
    <div className="space-y-3 pt-3 border-t">
      <div className="grid grid-cols-2 gap-2">
        {isOSFinalizada && (
          <Button variant="outline" onClick={handleSalvarOrcamentoOS} disabled={isSaving}>
            <Save size={16} className="mr-1.5" /> Atualizar Orçamento Finalizado
          </Button>
        )}
        <Button variant="outline" onClick={handleSalvarOrcamentoOS} disabled={isOSFinalizada || isSaving}>
          <Save size={16} className="mr-1.5" /> Salvar Orçamento
        </Button>
        <Button onClick={handleOpenPagamento} className="bg-green-600 hover:bg-green-700 text-white" disabled={isOSFinalizada || isSaving || (Array.isArray(ordemServico.itens) ? ordemServico.itens : []).length === 0}>
          <ShoppingCart size={16} className="mr-1.5" /> {isOSFinalizada ? 'OS Finalizada' : 'Finalizar e Pagar'}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={handleGeneratePdfAndOpenModal} disabled={isSaving}>
          <FilePdfIcon size={16} className="mr-1.5" /> Gerar PDF
        </Button>
        <Button variant="outline" onClick={handleWhatsApp} className="text-green-600 border-green-500 hover:bg-green-50 hover:text-green-700" disabled={isSaving}>
          <WhatsAppIcon size={16} className="mr-1.5" /> WhatsApp
        </Button>
      </div>
      <Button variant="destructive" onClick={onResetOS} className="w-full" disabled={isSaving}>
        <RotateCcw size={16} className="mr-1.5" /> Nova OS / Limpar
      </Button>
      
      {isDocumentModalOpen && (
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

      {isSenhaModalOpen && (
        <SenhaMasterModal
          isOpen={isSenhaModalOpen}
          onClose={() => setIsSenhaModalOpen(false)}
          onSuccess={handleSenhaMasterOk}
          title="Senha Master para Salvar OS"
          description="Para salvar alterações nesta OS, informe a senha master."
        />
      )}
    </div>
  );
};

export default OSFinalActions;