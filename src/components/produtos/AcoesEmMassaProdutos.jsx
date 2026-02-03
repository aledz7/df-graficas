import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DollarSign, Percent, Trash2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const AcoesEmMassaProdutos = ({ selectedCount, onAdjustPrice, onDeleteSelected, onClearSelection }) => {
  const [isAdjustPriceModalOpen, setIsAdjustPriceModalOpen] = useState(false);
  const [ajuste, setAjuste] = useState({
    tipo: 'aumento', // aumento | desconto
    base: 'preco_venda', // preco_venda | preco_custo
    valorTipo: 'percentual', // percentual | fixo
    valor: '',
  });
  const { toast } = useToast();

  const handleAjusteChange = (field, value) => {
    setAjuste(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyPriceAdjustment = () => {
    if (!ajuste.valor || isNaN(parseFloat(ajuste.valor))) {
      toast({ title: "Valor inválido", description: "Por favor, insira um valor numérico para o ajuste.", variant: "destructive" });
      return;
    }
    onAdjustPrice(ajuste);
    setIsAdjustPriceModalOpen(false);
    setAjuste({ tipo: 'aumento', base: 'preco_venda', valorTipo: 'percentual', valor: '' }); // Reset form
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-0 left-0 right-0 lg:left-64 p-4 bg-card border-t shadow-lg z-50"
        >
          <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-sm font-medium">
              {selectedCount} produto{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
            </p>
            <div className="flex gap-2 flex-wrap justify-center">
              <Button variant="outline" size="sm" onClick={() => setIsAdjustPriceModalOpen(true)}>
                <DollarSign className="mr-2 h-4 w-4" /> Ajustar Preço
              </Button>
              <Button variant="destructive" size="sm" onClick={onDeleteSelected}>
                <Trash2 className="mr-2 h-4 w-4" /> Excluir Selecionados
              </Button>
              <Button variant="ghost" size="sm" onClick={onClearSelection} className="text-muted-foreground">
                <X className="mr-1 h-4 w-4" /> Limpar Seleção
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <Dialog open={isAdjustPriceModalOpen} onOpenChange={setIsAdjustPriceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Preço em Massa</DialogTitle>
            <DialogDescription>
              Aplique um aumento ou desconto aos produtos selecionados. O ajuste será aplicado sobre o valor atual.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-y-3 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
              <Label htmlFor="tipo-ajuste" className="md:text-right">Tipo</Label>
              <div className="md:col-span-3">
                <Select value={ajuste.tipo} onValueChange={(v) => handleAjusteChange('tipo', v)}>
                  <SelectTrigger id="tipo-ajuste">
                    <SelectValue placeholder="Selecionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aumento">Aumento</SelectItem>
                    <SelectItem value="desconto">Desconto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
              <Label htmlFor="base-ajuste" className="md:text-right">Base</Label>
              <div className="md:col-span-3">
                <Select value={ajuste.base} onValueChange={(v) => handleAjusteChange('base', v)}>
                  <SelectTrigger id="base-ajuste">
                    <SelectValue placeholder="Selecionar base" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preco_venda">Preço de Venda</SelectItem>
                    <SelectItem value="preco_custo">Preço de Custo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2 md:gap-4">
              <Label htmlFor="valor-tipo-ajuste" className="md:text-right">Valor</Label>
              <div className="flex gap-2 md:col-span-3">
                <Select value={ajuste.valorTipo} onValueChange={(v) => handleAjusteChange('valorTipo', v)}>
                  <SelectTrigger id="valor-tipo-ajuste" className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual"><Percent className="h-4 w-4" /></SelectItem>
                    <SelectItem value="fixo"><DollarSign className="h-4 w-4" /></SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="valor-ajuste"
                  type="number"
                  value={ajuste.valor}
                  onChange={(e) => handleAjusteChange('valor', e.target.value)}
                  className="flex-1"
                  placeholder={ajuste.valorTipo === 'percentual' ? 'Ex: 10 para 10%' : 'Ex: 5 para R$5,00'}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center px-4 mt-2">
              Nota: Se ajustar o preço de custo, a margem de lucro e o preço de venda podem não ser recalculados automaticamente aqui.
              O preço de venda só é alterado se a base do ajuste for "Preço de Venda".
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustPriceModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleApplyPriceAdjustment}>Aplicar Ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AcoesEmMassaProdutos;