import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, Trash2, Smartphone, Banknote, CreditCard, CheckCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { contaBancariaService } from '@/services/api';
import contaPagarService from '@/services/contaPagarService';

const formaPagamentoIcones = {
  Pix: <Smartphone size={18} className="mr-2 text-green-500" />,
  Dinheiro: <Banknote size={18} className="mr-2 text-emerald-500" />,
  'Cartão Débito': <CreditCard size={18} className="mr-2 text-blue-500" />,
  'Cartão Crédito': <CreditCard size={18} className="mr-2 text-orange-500" />,
};
const formaPagamentoOptions = ['Dinheiro', 'Pix', 'Cartão Débito', 'Cartão Crédito', 'Transferência Bancária'];

const PagamentoModal = ({ open, onOpenChange, conta, onConfirmPagamento }) => {
  const { toast } = useToast();
  const [pagamentos, setPagamentos] = useState([]);
  const [currentPagamento, setCurrentPagamento] = useState({ metodo: 'Dinheiro', valor: '' });
  
  // Estados para contas bancárias
  const [contasBancarias, setContasBancarias] = useState([]);
  const [contaDestinoId, setContaDestinoId] = useState('');
  
  const valorConta = conta ? parseFloat(conta.valor || 0) : 0;

  const totalPagoNestaSessao = useCallback(() => pagamentos.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0), [pagamentos]);
  const valorRestanteCalculado = useCallback(() => valorConta - totalPagoNestaSessao(), [valorConta, totalPagoNestaSessao]);

  // Carregar contas bancárias
  useEffect(() => {
    const loadContasBancarias = async () => {
      try {
        const response = await contaBancariaService.getAll();
        const contasData = response.data?.data?.data || response.data?.data || response.data || [];
        const contasArray = Array.isArray(contasData) ? contasData : [];
        setContasBancarias(contasArray);
      } catch (error) {
        console.error('Erro ao carregar contas bancárias:', error);
        setContasBancarias([]);
      }
    };

    if (open) {
      loadContasBancarias();
    }
  }, [open]);

  useEffect(() => {
    if (open && conta) {
      setPagamentos([]);
      setCurrentPagamento({ metodo: 'Dinheiro', valor: valorConta > 0 ? valorConta.toFixed(2) : '' });
      setContaDestinoId(''); // Reset conta selecionada
    }
  }, [open, conta, valorConta]);

  const handleAddPagamento = () => {
    if (!currentPagamento.metodo || !currentPagamento.valor || parseFloat(currentPagamento.valor) <= 0) {
      toast({ title: "Pagamento Inválido", description: "Insira um valor válido.", variant: "destructive" });
      return;
    }

    // Validar seleção de conta para métodos que não sejam dinheiro
    const metodo = currentPagamento.metodo;
    if (metodo !== 'Dinheiro' && (!contaDestinoId || contaDestinoId === 'none')) {
      toast({ 
        title: "Conta Bancária Necessária", 
        description: `Selecione uma conta bancária para o pagamento via ${metodo}.`, 
        variant: "destructive" 
      });
      return;
    }

    let valorPagamento = parseFloat(currentPagamento.valor);
    if (isNaN(valorPagamento)) {
      toast({ title: "Pagamento Inválido", description: "Valor inválido.", variant: "destructive" });
      return;
    }
    
    // Clamp para evitar ultrapassar o restante
    const restante = valorConta - totalPagoNestaSessao();
    if (valorPagamento > restante) {
      valorPagamento = restante;
      toast({ 
        title: "Valor Ajustado", 
        description: `O valor foi ajustado para R$ ${valorPagamento.toFixed(2)} (valor restante).` 
      });
    }

    // Incluir conta bancária no pagamento (exceto para dinheiro)
    const pagamentoComConta = {
      ...currentPagamento,
      id: `pag-${Date.now()}`,
      valor: valorPagamento,
      ...(metodo !== 'Dinheiro' && contaDestinoId && { conta_bancaria_id: contaDestinoId })
    };

    const novosPagamentos = [...pagamentos, pagamentoComConta];
    setPagamentos(novosPagamentos);

    const novoRestante = restante - valorPagamento;
    setCurrentPagamento({ metodo: 'Dinheiro', valor: novoRestante > 0 ? novoRestante.toFixed(2) : '' });
    setContaDestinoId(''); // Reset conta selecionada após adicionar
  };

  const handleRemovePagamento = (id) => {
    const pagamentoRemovido = pagamentos.find(p => p.id === id);
    const novosPagamentos = pagamentos.filter(p => p.id !== id);
    setPagamentos(novosPagamentos);

    const novoRestante = valorConta - novosPagamentos.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0);
    setCurrentPagamento(prev => ({ ...prev, valor: novoRestante > 0 ? novoRestante.toFixed(2) : '' }));
  };

  const handleFinalizar = async () => {
    if (pagamentos.length === 0) {
      toast({ title: "Nenhum pagamento", description: "Adicione pelo menos uma forma de pagamento.", variant: "destructive" });
      return;
    }

    const totalPago = totalPagoNestaSessao();
    if (totalPago !== valorConta) {
      toast({ 
        title: "Valor incompleto", 
        description: `O total pago (R$ ${totalPago.toFixed(2)}) não corresponde ao valor da conta (R$ ${valorConta.toFixed(2)}).`, 
        variant: "destructive" 
      });
      return;
    }

    try {
      // Preparar dados do pagamento para o backend
      const dadosPagamento = {
        pagamentos: pagamentos.map(pag => ({
          forma_pagamento: pag.metodo,
          valor: parseFloat(pag.valor),
          conta_bancaria_id: pag.conta_bancaria_id || null,
          data_pagamento: format(new Date(), 'yyyy-MM-dd')
        }))
      };

      const response = await contaPagarService.pagar(conta.id, dadosPagamento);
      
      if (response.success) {
        toast({ title: "Pagamento Registrado!", description: "O pagamento foi registrado com sucesso." });
        if (onConfirmPagamento) {
          onConfirmPagamento(response.data);
        }
        onOpenChange(false);
      } else {
        throw new Error(response.message || 'Erro ao processar pagamento');
      }
    } catch (error) {
      console.error('Erro ao finalizar pagamento:', error);
      toast({ 
        title: "Erro ao registrar pagamento", 
        description: error.message || "Não foi possível registrar o pagamento. Tente novamente.", 
        variant: "destructive" 
      });
    }
  };

  if (!conta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>
            Registre o pagamento da conta: <strong>{conta.descricao}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border rounded-md bg-blue-50 dark:bg-blue-900/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Valor da Conta</Label>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  R$ {valorConta.toFixed(2)}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Total Pago</Label>
                <p className={`text-2xl font-bold ${totalPagoNestaSessao() >= valorConta ? 'text-green-600' : 'text-orange-600'}`}>
                  R$ {totalPagoNestaSessao().toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {pagamentos.length > 0 && (
            <div className="space-y-2">
              <Label>Pagamentos Adicionados</Label>
              {pagamentos.map((pag) => (
                <div key={pag.id} className="flex items-center justify-between p-3 border rounded-md bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    {formaPagamentoIcones[pag.metodo] || <Banknote size={18} className="mr-2" />}
                    <div>
                      <p className="font-medium">{pag.metodo}</p>
                      {pag.conta_bancaria_id && (
                        <p className="text-xs text-muted-foreground">
                          Conta: {contasBancarias.find(c => c.id === pag.conta_bancaria_id)?.nome || pag.conta_bancaria_id}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">R$ {parseFloat(pag.valor).toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePagamento(pag.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="p-3 border rounded-md bg-slate-50 dark:bg-slate-800">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pagamento-metodo">Método</Label>
                <Select 
                  value={currentPagamento.metodo} 
                  onValueChange={(val) => {
                    setCurrentPagamento(prev => ({ ...prev, metodo: val }));
                    if (val === 'Dinheiro') {
                      setContaDestinoId(''); // Limpar conta quando selecionar dinheiro
                    }
                  }}
                >
                  <SelectTrigger id="pagamento-metodo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formaPagamentoOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pagamento-valor">Valor (R$)</Label>
                <Input 
                  id="pagamento-valor" 
                  type="number" 
                  step="0.01"
                  min="0"
                  max={valorRestanteCalculado().toFixed(2)}
                  value={currentPagamento.valor} 
                  onChange={(e) => {
                    setCurrentPagamento(prev => ({ ...prev, valor: e.target.value }));
                  }} 
                  placeholder="0.00" 
                />
              </div>
            </div>

            {/* Campo de seleção de conta bancária (não aparece para dinheiro) */}
            {currentPagamento.metodo !== 'Dinheiro' && (
              <div className="mt-4">
                <Label htmlFor="conta-destino">Conta Bancária de Destino</Label>
                <Select value={contaDestinoId} onValueChange={setContaDestinoId}>
                  <SelectTrigger id="conta-destino">
                    <SelectValue placeholder="Selecione a conta bancária" />
                  </SelectTrigger>
                  <SelectContent>
                    {contasBancarias.length > 0 ? (
                      contasBancarias.map(conta => (
                        <SelectItem key={conta.id} value={String(conta.id)}>
                          {conta.nome_banco || conta.nome} 
                          {conta.agencia && ` - Ag: ${conta.agencia}`}
                          {conta.conta && ` - Conta: ${conta.conta}`}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>Nenhuma conta disponível</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button 
              onClick={handleAddPagamento} 
              size="sm" 
              className="w-full mt-4" 
              disabled={!currentPagamento.valor || parseFloat(currentPagamento.valor) <= 0 || valorRestanteCalculado() <= 0}
            >
              <PlusCircle size={16} className="mr-2" /> Adicionar Pagamento
            </Button>
          </div>

          <div className="pt-4 border-t space-y-1">
            <div className="flex justify-between font-semibold">
              <span>Total Pago (nesta sessão):</span>
              <span>R$ {totalPagoNestaSessao().toFixed(2)}</span>
            </div>
            <div className={`flex justify-between font-bold text-lg ${valorRestanteCalculado() > 0 ? 'text-red-500' : 'text-green-500'}`}>
              <span>Restante:</span>
              <span>R$ {valorRestanteCalculado().toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            onClick={handleFinalizar} 
            className="bg-green-600 hover:bg-green-700 text-white" 
            disabled={totalPagoNestaSessao() !== valorConta || pagamentos.length === 0}
          >
            <CheckCircle2 size={18} className="mr-2" /> Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PagamentoModal;





