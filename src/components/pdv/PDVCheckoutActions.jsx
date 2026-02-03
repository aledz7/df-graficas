import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { XCircle, UserPlus, FileText, Save } from 'lucide-react';

const PDVCheckoutActions = ({
  carrinho,
  desconto,
  setDesconto,
  observacoes,
  setObservacoes,
  clienteSelecionado,
  clienteNomeLivre, 
  setClienteNomeLivre,
  setIsClienteModalOpen,
  calcularSubtotal,
  calcularDescontoValor,
  valorTotal,
  handleFinalizarDocumento,
  handleCancelarVenda,
  modoDocumento,
  setModoDocumento,
}) => {

  const isFinalizarDisabled = () => {
    if (carrinho.length === 0) return true;
    if (!clienteSelecionado && !clienteNomeLivre) return true;
    return false;
  };

  return (
    <>
      <div className="border-t border-gray-300 dark:border-gray-700 pt-3 space-y-2 text-sm">
        <div className="flex justify-between"><span>Subtotal:</span><span className="font-medium">R$ {calcularSubtotal().toFixed(2)}</span></div>
        <div className="flex items-center justify-between">
          <Label htmlFor="descontoValor" className="flex-shrink-0 mr-2">Desconto:</Label>
          <div className="flex items-center space-x-1">
            <Select 
              value={desconto.tipo || 'percent'} 
              onValueChange={(value) => {
                setDesconto({ ...desconto, tipo: value });
              }}
            >
              <SelectTrigger className="h-8 text-xs w-[60px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">%</SelectItem>
                <SelectItem value="fixed">R$</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              id="descontoValor" 
              type="number" 
              value={desconto.valor} 
              onChange={(e) => {
                setDesconto({...desconto, valor: e.target.value});
              }} 
              className="h-8 text-xs w-20 text-right" 
              placeholder="0" 
            />
            <span className="font-medium ml-2 text-red-500">
              - R$ {(() => {
                const valorDesconto = calcularDescontoValor();
                return valorDesconto.toFixed(2);
              })()}
            </span>
          </div>
        </div>
        <div className="flex justify-between text-lg font-bold text-orange-600 dark:text-orange-400 pt-1 border-t border-dashed"><span>TOTAL:</span><span>R$ {valorTotal.toFixed(2)}</span></div> {/* Usando valorTotal */}
      </div>
      
      <div className="my-3">
        <Label htmlFor="observacoes">Observações:</Label>
        <Textarea id="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Ex: cliente quer embalagem especial" className="text-sm min-h-[60px]" />
      </div>
      
      <>
        <Button variant="outline" onClick={() => setIsClienteModalOpen(true)} className="w-full justify-start text-left font-normal mb-1 border-dashed hover:border-solid hover:border-orange-500">
            {clienteSelecionado ? <><UserPlus size={16} className="mr-2 text-green-500"/> {clienteSelecionado.nome_completo || clienteSelecionado.nome}</> : 
             clienteNomeLivre ? <><UserPlus size={16} className="mr-2 text-blue-500"/> {clienteNomeLivre} (Avulso)</> :
             <><UserPlus size={16} className="mr-2 text-orange-500"/> Selecionar / Cadastrar Cliente</>}
        </Button>

        {!clienteSelecionado && (
           <div className="mb-3">
              <Label htmlFor="clienteNomeLivre">Nome Cliente (Avulso)</Label>
              <Input id="clienteNomeLivre" value={clienteNomeLivre} onChange={(e) => setClienteNomeLivre(e.target.value)} placeholder="Digite o nome do cliente avulso" />
           </div>
        )}
      </>

      <div className="my-4 flex items-center justify-between p-3 border rounded-md bg-gray-50 dark:bg-gray-700/50">
        <Label htmlFor="modo-documento-switch" className="text-sm font-medium">
          Finalizar como:
        </Label>
        <div className="flex items-center">
          <span className={`mr-2 text-sm ${modoDocumento === 'venda' ? 'font-semibold text-orange-600' : 'text-muted-foreground'}`}>Venda</span>
          <Switch
            id="modo-documento-switch"
            checked={modoDocumento === 'orcamento'}
            onCheckedChange={(checked) => setModoDocumento(checked ? 'orcamento' : 'venda')}
            aria-label="Tipo de finalização: Venda ou Orçamento"
          />
          <span className={`ml-2 text-sm ${modoDocumento === 'orcamento' ? 'font-semibold text-orange-600' : 'text-muted-foreground'}`}>Orçamento</span>
        </div>
      </div>


      <div className="mt-auto grid grid-cols-2 gap-3 pt-3 border-t">
        <Button variant="outline" className="w-full" onClick={handleCancelarVenda}>
          <XCircle size={18} className="mr-2"/>Cancelar
        </Button>
        <Button 
          className={`w-full text-white ${modoDocumento === 'orcamento' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
          onClick={handleFinalizarDocumento} 
          disabled={isFinalizarDisabled()}
        >
          {modoDocumento === 'orcamento' ? <Save size={18} className="mr-2"/> : <FileText size={18} className="mr-2"/>}
          {modoDocumento === 'orcamento' ? 'Salvar Orçamento' : 'Finalizar e Pagar'}
        </Button>
      </div>
    </>
  );
};

export default PDVCheckoutActions;