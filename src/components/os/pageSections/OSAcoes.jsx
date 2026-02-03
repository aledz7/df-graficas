import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, CheckCircle2, FileText, Printer, RotateCcw } from 'lucide-react';

const OSAcoes = ({
  isOSFinalizada,
  onSalvarOrcamento,
  onFinalizarOS,
  onGerarPdf,
  onImprimir,
  onNovaOS,
}) => {
  return (
    <div className="mt-auto space-y-2 pt-4 border-t">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onSalvarOrcamento} disabled={isOSFinalizada}>
          <Save size={16} className="mr-1.5" /> Salvar Orçamento
        </Button>
        <Button onClick={onFinalizarOS} className="bg-green-600 hover:bg-green-700 text-white" disabled={isOSFinalizada}>
          <CheckCircle2 size={16} className="mr-1.5" /> {isOSFinalizada ? 'OS Finalizada' : 'Finalizar OS'}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onGerarPdf}>
          <FileText size={16} className="mr-1.5" /> Gerar PDF
        </Button>
        <Button variant="outline" onClick={onImprimir}>
          <Printer size={16} className="mr-1.5" /> Imprimir
        </Button>
      </div>
      <Button variant="destructive" onClick={onNovaOS} className="w-full">
        <RotateCcw size={16} className="mr-1.5" /> Nova OS / Limpar
      </Button>
    </div>
  );
};

export default OSAcoes;