import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO, isValid } from 'date-fns';
import { Trash2 } from 'lucide-react';

const RenderJsonData = ({ data, indentLevel = 0 }) => {
  if (typeof data !== 'object' || data === null) {
    return <span className="text-sm">{String(data)}</span>;
  }

  return (
    <div className={`pl-${indentLevel * 2}`}>
      {Object.entries(data).map(([key, value]) => {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        let displayValue;
        if (key.toLowerCase().includes('data') || key.toLowerCase().includes('date')) {
            if (isValid(parseISO(value))) {
                displayValue = format(parseISO(value), 'dd/MM/yyyy HH:mm:ss');
            } else {
                displayValue = String(value);
            }
        } else if (typeof value === 'object' && value !== null) {
          displayValue = <RenderJsonData data={value} indentLevel={indentLevel + 1} />;
        } else if (typeof value === 'boolean') {
            displayValue = value ? 'Sim' : 'Não';
        }
         else {
          displayValue = String(value);
        }

        return (
          <div key={key} className="mb-1 text-sm">
            <strong className="text-gray-700 dark:text-gray-300">{formattedKey}:</strong>
            <span className="ml-2 text-gray-600 dark:text-gray-400">{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
};

const ItemExcluidoDetalhesModal = ({ isOpen, onClose, item }) => {
  if (!isOpen || !item) return null;

  const { tipo, nome, data_exclusao, dados_completos } = item;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Trash2 size={24} className="mr-2 text-destructive"/> Detalhes do Item Excluído
          </DialogTitle>
          <DialogDescription>
            Informações sobre o item movido para a lixeira.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] p-1">
          <div className="space-y-4 p-4">
            <div className="p-3 border rounded-md bg-muted/30">
                <h3 className="font-semibold text-base mb-1">Informações da Exclusão</h3>
                <p className="text-sm"><strong>Tipo do Item:</strong> {tipo}</p>
                <p className="text-sm"><strong>Nome/ID:</strong> {nome || `ID: ${item.id}`}</p>
                <p className="text-sm"><strong>Excluído em:</strong> {format(parseISO(data_exclusao), 'dd/MM/yyyy HH:mm:ss')}</p>
                <p className="text-sm"><strong>Tabela:</strong> {item.tabela}</p>
            </div>
            
            <div className="p-3 border rounded-md">
                <h3 className="font-semibold text-base mb-2">Dados do Item Excluído</h3>
                <RenderJsonData data={dados_completos} />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemExcluidoDetalhesModal;