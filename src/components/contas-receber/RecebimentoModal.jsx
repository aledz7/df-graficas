import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, Trash2, Smartphone, Banknote, CreditCard, CheckCircle2, DivideCircle, CalendarDays, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { addDays, format } from 'date-fns';
import { contaReceberService, vendaService, contaBancariaService } from '@/services/api';
import PDVReciboModal from '@/components/pdv/PDVReciboModal';

const formaPagamentoIcones = {
  Pix: <Smartphone size={18} className="mr-2 text-green-500" />,
  Dinheiro: <Banknote size={18} className="mr-2 text-emerald-500" />,
  'Cartão Débito': <CreditCard size={18} className="mr-2 text-blue-500" />,
  'Cartão Crédito': <CreditCard size={18} className="mr-2 text-orange-500" />,
};
const formaPagamentoOptions = ['Dinheiro', 'Pix', 'Cartão Débito', 'Cartão Crédito'];

const RecebimentoModal = ({ open, onOpenChange, conta, onConfirmPagamento, onDividirConta, modoParcelamento = false }) => {
  const { toast } = useToast();
  const [pagamentos, setPagamentos] = useState([]);
  const [currentPagamento, setCurrentPagamento] = useState({ metodo: 'Dinheiro', valor: '' });
  
  // Estados para contas bancárias
  const [contasBancarias, setContasBancarias] = useState([]);
  const [contaDestinoId, setContaDestinoId] = useState('');
  
  const pendenteAPI = conta ? parseFloat(conta.valor_pendente || 0) : 0;
  const jurosAplicados = conta ? parseFloat(conta.juros_aplicados || 0) : 0;
  const valorOriginalAPI = conta ? parseFloat(conta.valor_original || 0) : 0;
  const valorTotalDevidoOriginal = valorOriginalAPI > 0 ? (valorOriginalAPI + jurosAplicados) : (pendenteAPI + jurosAplicados);
  const recebidoAteAgora = valorOriginalAPI > 0 ? Math.max(0, (valorOriginalAPI + jurosAplicados) - pendenteAPI) : null;
  
  // Estado para histórico de pagamentos já feitos
  const [historicoPagamentos, setHistoricoPagamentos] = useState([]);
  
  const totalPagoNestaSessao = useCallback(() => pagamentos.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0), [pagamentos]);
  const valorRestanteCalculado = useCallback(() => valorTotalDevidoOriginal - totalPagoNestaSessao(), [valorTotalDevidoOriginal, totalPagoNestaSessao]);

  // Parcelamento
  const [isParcelamentoOpen, setIsParcelamentoOpen] = useState(false);
  const [numParcelas, setNumParcelas] = useState(2);
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [intervaloParcelas, setIntervaloParcelas] = useState(30); // em dias

  // Recibo da venda vinculada
  const [isReciboOpen, setIsReciboOpen] = useState(false);
  const [documentoRecibo, setDocumentoRecibo] = useState(null);
  const reciboRef = React.useRef(null);


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
      setCurrentPagamento({ metodo: 'Dinheiro', valor: pendenteAPI > 0 ? pendenteAPI.toFixed(2) : '' });
      setContaDestinoId(''); // Reset conta selecionada
      setIsParcelamentoOpen(modoParcelamento); // Abrir diretamente no modo parcelamento se solicitado
      setNumParcelas(2);
      setDataPrimeiraParcela(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
      setIntervaloParcelas(30);
      setDocumentoRecibo(null);
      setIsReciboOpen(false);
      
      // Carregar histórico de pagamentos da conta
      const historico = conta.historico_pagamentos ? 
        (typeof conta.historico_pagamentos === 'string' ? 
          JSON.parse(conta.historico_pagamentos) : conta.historico_pagamentos) : [];
      setHistoricoPagamentos(Array.isArray(historico) ? historico : []);
    }
  }, [open, conta, pendenteAPI, modoParcelamento]);

  const handleAddPagamento = () => {
    if (!currentPagamento.metodo || !currentPagamento.valor || parseFloat(currentPagamento.valor) <= 0) {
      toast({ title: "Pagamento Inválido", description: "Insira um valor válido.", variant: "destructive" });
      return;
    }

    // Validar seleção de conta bancária para todas as formas de pagamento exceto dinheiro
    if (currentPagamento.metodo !== 'Dinheiro' && (!contaDestinoId || contaDestinoId === 'none')) {
      toast({ 
        title: "Conta Bancária Necessária", 
        description: `Selecione uma conta bancária para o pagamento via ${currentPagamento.metodo}.`, 
        variant: "destructive" 
      });
      return;
    }

    let valorPagamento = parseFloat(currentPagamento.valor);
    if (isNaN(valorPagamento)) {
      toast({ title: "Pagamento Inválido", description: "Valor inválido.", variant: "destructive" });
      return;
    }
    // Clamp aqui para evitar ultrapassar o restante (usar pendenteAPI como base)
    const restante = pendenteAPI - totalPagoNestaSessao();
    if (valorPagamento > restante) {
      valorPagamento = restante;
    }
    if(valorPagamento > restante) {
        toast({ title: "Valor Excedido", description: `O valor do pagamento não pode ser maior que o valor restante (R$ ${restante.toFixed(2)}).`, variant: "destructive" });
        return;
    }

    // Incluir conta bancária no pagamento (para qualquer método de pagamento, exceto dinheiro)
    const pagamentoComConta = {
      ...currentPagamento,
      id: `pag-${Date.now()}`,
      valor: valorPagamento,
      // Para dinheiro, não enviar conta_bancaria_id (será usado caixa padrão)
      // Para outros métodos, sempre enviar a conta selecionada
      ...(currentPagamento.metodo !== 'Dinheiro' && contaDestinoId && { conta_bancaria_id: contaDestinoId })
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

    const novoRestante = (pendenteAPI - novosPagamentos.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0));
    setCurrentPagamento(prev => ({ ...prev, valor: novoRestante > 0 ? novoRestante.toFixed(2) : '' }));
  };

  const handleFinalizar = async () => {
    if (pagamentos.length === 0) {
      toast({ title: "Nenhum pagamento", description: "Adicione pelo menos uma forma de pagamento.", variant: "destructive" });
      return;
    }

    try {
      const response = await contaReceberService.registrarPagamentoComParcelamento(conta.id, {
        pagamentos: pagamentos.map(p => ({
          valor: parseFloat(p.valor),
          forma_pagamento: p.metodo,
          observacoes: p.observacoes || null,
          ...(p.conta_bancaria_id && { conta_bancaria_id: p.conta_bancaria_id })
        })),
        criar_parcelamento: false
      });

      toast({ title: "Sucesso!", description: "Pagamento registrado com sucesso." });
      
      // Passar a resposta da API para o componente pai para evitar chamada dupla
      onConfirmPagamento(conta.id, pagamentos, response);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast({ 
        title: "Erro ao registrar pagamento", 
        description: "Não foi possível registrar o pagamento.",
        variant: "destructive"
      });
    }
  };
  
  const handleDividirEGerarNovasContas = async () => {
    const restanteReal = pendenteAPI - totalPagoNestaSessao();
    if (restanteReal <= 0) {
        toast({ title: "Conta já quitada", description: "Não há valor restante para gerar uma nova conta.", variant: "default" });
        return;
    }
    if (!isParcelamentoOpen) {
        setIsParcelamentoOpen(true);
        return;
    }

    if (numParcelas <= 0 || !dataPrimeiraParcela || intervaloParcelas <=0) {
        toast({ title: "Dados de Parcelamento Inválidos", description: "Verifique o número de parcelas, data da primeira e intervalo.", variant: "destructive" });
        return;
    }

    try {
      // Se não há pagamentos, enviar um pagamento vazio para satisfazer a validação da API
      const pagamentosParaEnviar = pagamentos.length > 0 
        ? pagamentos.map(p => ({
            valor: parseFloat(p.valor),
            forma_pagamento: p.metodo,
            observacoes: p.observacoes || null,
            ...(p.conta_bancaria_id && { conta_bancaria_id: p.conta_bancaria_id })
          }))
        : [{
            valor: 0, // Valor 0 para parcelamento sem pagamento inicial
            forma_pagamento: 'Dinheiro',
            observacoes: 'Parcelamento sem pagamento inicial'
          }];

      const response = await contaReceberService.registrarPagamentoComParcelamento(conta.id, {
        pagamentos: pagamentosParaEnviar,
        criar_parcelamento: true,
        dados_parcelamento: {
          num_parcelas: numParcelas,
          intervalo_dias: intervaloParcelas,
          data_primeira_parcela: dataPrimeiraParcela
        }
      });

      // Debug: log da resposta para entender a estrutura
      console.log('🔍 [RecebimentoModal] Resposta da API:', response);

      // Verificar se a resposta tem a estrutura esperada
      // A API retorna: { data: { conta: {...}, parcelas: [...], total_pago: 0, valor_restante: 68.00 } }
      const parcelas = response.data?.data?.parcelas || response.data?.parcelas || response.parcelas || [];
      const numParcelasCriadas = Array.isArray(parcelas) ? parcelas.length : 0;
      
      toast({ 
        title: "Sucesso!", 
        description: pagamentos.length > 0 
          ? `Pagamento registrado e ${numParcelasCriadas} parcelas criadas.`
          : `${numParcelasCriadas} parcelas criadas com sucesso.`
      });
      
      onDividirConta(conta.id, pagamentos, parcelas);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao registrar pagamento com parcelamento:', error);
      toast({ 
        title: "Erro ao registrar pagamento", 
        description: "Não foi possível registrar o pagamento com parcelamento.",
        variant: "destructive"
      });
    }
  }

  if (!conta) return null;

  const mapVendaParaDocumento = (doc, historicoPagamentos = []) => {
    if (!doc) return null;
    console.log('🔍 [RecebimentoModal] Documento recebido:', doc);
    
    // Normalizar estrutura da resposta da API
    const base = doc?.data ? doc.data : doc;
    console.log('📋 [RecebimentoModal] Base normalizada:', base);
    
    // Itens - buscar na estrutura correta
    const itensFonte = Array.isArray(base.itens) ? base.itens : [];
    console.log('📦 [RecebimentoModal] Itens fonte:', itensFonte);
    const itens = itensFonte.map(item => ({
      id_produto: item.produto_id || item.id_produto,
      nome: item.produto_nome || item.nome || item?.produto?.nome || 'Produto não especificado',
      preco_venda_unitario: parseFloat(item.valor_unitario || item.preco_venda_unitario || 0),
      quantidade: parseFloat(item.quantidade || 1),
      variacao: item.dados_adicionais?.variacao || item.variacao || null,
      imagem_principal: item.dados_adicionais?.imagem_principal || item.imagem_principal || item?.produto?.imagem_principal || null
    }));
    
    // Pagamentos originais da venda
    const pagamentosFonte = Array.isArray(base.dados_pagamento) ? base.dados_pagamento : [];
    const pagamentosDoc = pagamentosFonte.map(p => ({
      metodo: p.forma_pagamento || p.metodo || 'Outro',
      valor: parseFloat(p.valor || 0),
      valorFinal: parseFloat(p.valor_final || p.valor || 0),
      valorOriginal: parseFloat(p.valor_original || p.valor || 0),
      parcelas: p.parcelas || null,
      maquinaInfo: p.maquina_info || null,
      taxaInfo: p.taxa_info || null
    }));
    
    // Histórico de pagamentos do crediário (já recebidos)
    const pagamentosHistorico = historicoPagamentos.map(h => ({
      metodo: 'Crediário (Recebido)',
      valor: parseFloat(h.valor_pago || h.valor || 0),
      valorFinal: parseFloat(h.valor_pago || h.valor || 0),
      valorOriginal: parseFloat(h.valor_pago || h.valor || 0),
      data_pagamento: h.data_pagamento || h.created_at,
      isHistorico: true
    }));
    
    // Combinar pagamentos originais + histórico
    const todosOsPagamentos = [...pagamentosDoc, ...pagamentosHistorico];
    
    // Desconto
    const desconto = parseFloat(base.valor_desconto || 0) > 0 ? {
      tipo: base.tipo_desconto === 'percentual' ? 'percentual' : (base.tipo_desconto || 'valor'),
      valor: parseFloat(base.valor_desconto_original || base.valor_desconto || 0),
      valor_aplicado: parseFloat(base.valor_desconto || 0)
    } : null;
    
    const documentoMapeado = {
      ...base,
      id: base.id || base.codigo,
      tipo: base.tipo_documento === 'orcamento' ? 'Orçamento PDV' : 'Venda PDV',
      total: parseFloat(base.valor_total || base.total || 0),
      subtotal: parseFloat(base.valor_subtotal || base.subtotal || 0),
      itens,
      pagamentos: todosOsPagamentos, // Inclui histórico de pagamentos
      desconto,
      cliente_nome: base.cliente_nome || base.cliente?.nome || 'Cliente Avulso',
      vendedor_nome: base.vendedor_nome || 'N/A',
      data_emissao: base.data_venda || base.data_emissao,
      observacoes: base.observacoes || '',
      status: base.status || 'pendente',
      origem_venda: base.metadados?.origem || (base.tipo_documento === 'orcamento' ? 'Orçamento PDV' : 'Venda PDV'),
      dadosPontos: base.metadados?.dados_pontos || null,
      cliente: {
        id: base.cliente_id || base.cliente?.id,
        nome: base.cliente_nome || base.cliente?.nome || 'Cliente Avulso',
        cpf_cnpj: base.cliente?.cpf_cnpj || base.cliente_cpf_cnpj || '',
        telefone_principal: base.cliente?.telefone_principal || base.cliente?.telefone || '',
        email_principal: base.cliente?.email_principal || base.cliente?.email || ''
      }
    };
    
    console.log('✅ [RecebimentoModal] Documento final mapeado:', documentoMapeado);
    return documentoMapeado;
  };

  const handleVerNota = async () => {
    const linkedVendaId = conta?.venda_id ?? conta?.vendaId ?? conta?.venda?.id;
    if (!linkedVendaId) {
      toast({ title: 'Sem vínculo de venda', description: 'Esta conta não possui uma venda vinculada.', variant: 'warning' });
      return;
    }
    try {
      console.log('🔍 [RecebimentoModal] Buscando venda com ID:', linkedVendaId);
      const resp = await vendaService.getById(linkedVendaId);
      console.log('📡 [RecebimentoModal] Resposta da API:', resp);
      
      // Normalizar resposta da API - pode vir como {data: {data: {...}}} ou {data: {...}} ou {...}
      const raw = resp?.data ?? resp;
      const venda = raw?.data || raw;
      
      console.log('📋 [RecebimentoModal] Venda normalizada:', venda);
      if (!venda) throw new Error('Venda não encontrada');
      
      // Incluir histórico de pagamentos da conta
      const historicoPagamentos = Array.isArray(conta.historico_pagamentos) ? conta.historico_pagamentos : [];
      console.log('💰 [RecebimentoModal] Histórico de pagamentos:', historicoPagamentos);
      
      const doc = mapVendaParaDocumento(venda, historicoPagamentos);
      setDocumentoRecibo(doc);
      setIsReciboOpen(true);
    } catch (e) {
      console.error('❌ [RecebimentoModal] Erro ao buscar venda vinculada:', e);
      toast({ title: 'Erro', description: 'Não foi possível carregar a nota vinculada.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Registrar Recebimento - {conta.clienteNome}</DialogTitle>
          <div className="mt-1 flex items-center justify-between">
          <DialogDescription>
              Total da dívida: <span className="font-bold text-lg text-red-500">R$ {valorTotalDevidoOriginal.toFixed(2)}</span>
          </DialogDescription>
            {(conta?.venda_id || conta?.vendaId || conta?.venda?.id) && (
              <Button variant="outline" size="sm" onClick={handleVerNota} title="Visualizar nota vinculada">
                <FileText size={16} className="mr-2"/> Ver Nota
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="space-y-3 py-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3 p-3 border rounded-md bg-gray-50 dark:bg-gray-800/40">
            <div>
              <div className="text-xs text-muted-foreground">Recebido até agora</div>
              <div className="text-base font-semibold text-green-600">{recebidoAteAgora !== null ? `R$ ${recebidoAteAgora.toFixed(2)}` : '-'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Pendente atual</div>
              <div className="text-base font-semibold text-red-600">R$ {pendenteAPI.toFixed(2)}</div>
            </div>
          </div>
          
          {historicoPagamentos.length > 0 && (
            <div className="space-y-1">
              <Label className="text-sm">Histórico de Pagamentos</Label>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {historicoPagamentos.map((pag, index) => (
                  <div key={index} className="flex items-center justify-between p-1.5 text-xs bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-medium">✓</span>
                      <span>{pag.forma_pagamento || pag.metodo || 'Pagamento'}</span>
                      {pag.data && (
                        <span className="text-muted-foreground">
                          ({new Date(pag.data).toLocaleDateString('pt-BR')})
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-green-600">R$ {parseFloat(pag.valor || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-sm">Pagamentos Adicionados</Label> 
            {pagamentos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-1">Nenhum pagamento adicionado.</p>
            ) : (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {pagamentos.map(p => {
                  const contaBancaria = p.conta_bancaria_id ? contasBancarias.find(c => String(c.id) === String(p.conta_bancaria_id)) : null;
                  return (
                    <div key={p.id} className="flex items-center justify-between p-1.5 border rounded-md text-xs bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center">
                        {formaPagamentoIcones[p.metodo]} {p.metodo}
                        {contaBancaria && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({contaBancaria.nome_banco || contaBancaria.nome})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs">R$ {parseFloat(p.valor).toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-red-500" onClick={() => handleRemovePagamento(p.id)}><Trash2 size={12}/></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <Separator/>
          <div className="p-2 border rounded-md bg-slate-50 dark:bg-slate-800">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="pagamento-metodo" className="text-sm">Método</Label>
                <Select value={currentPagamento.metodo} onValueChange={(val) => {
                  setCurrentPagamento(prev => ({ ...prev, metodo: val }));
                }}>
                  <SelectTrigger id="pagamento-metodo" className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{formaPagamentoOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pagamento-valor" className="text-sm">Valor (R$)</Label>
                <Input 
                  id="pagamento-valor" 
                  type="number" 
                  step="0.01"
                  min="0"
                  max={valorRestanteCalculado().toFixed(2)}
                  value={currentPagamento.valor} 
                  onChange={(e) => {
                    const raw = e.target.value;
                    // Permitir apagar/digitar livremente; clamp apenas ao adicionar
                    setCurrentPagamento(prev => ({ ...prev, valor: raw }));
                  }} 
                  placeholder="0.00"
                  className="h-9"
                />
              </div>
            </div>

            {/* Campo de seleção de conta bancária - obrigatório para formas de pagamento não-dinheiro */}
            {currentPagamento.metodo !== 'Dinheiro' && (
              <div className="mt-2">
                <Label htmlFor="conta-destino" className="text-sm">
                  Conta Bancária de Destino <span className="text-red-500">*</span>
                </Label>
                <Select value={contaDestinoId} onValueChange={setContaDestinoId}>
                  <SelectTrigger id="conta-destino" className="h-9">
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
            <Button onClick={handleAddPagamento} size="sm" className="w-full mt-2 h-9" disabled={!currentPagamento.valor || parseFloat(currentPagamento.valor) <= 0 || (pendenteAPI - totalPagoNestaSessao()) <= 0}>
                <PlusCircle size={14} className="mr-2" /> Adicionar Pagamento
            </Button>
          </div>
          <div className="pt-2 border-t space-y-1">
            <div className="flex justify-between font-semibold text-sm">
              <span>Total Pago (nesta sessão):</span>
              <span>R$ {totalPagoNestaSessao().toFixed(2)}</span>
            </div>
            <div className={`flex justify-between font-bold text-base ${(pendenteAPI - totalPagoNestaSessao()) > 0 ? 'text-red-500' : 'text-green-500'}`}>
              <span>Restante nesta conta:</span>
              <span>R$ {(pendenteAPI - totalPagoNestaSessao()).toFixed(2)}</span>
            </div>
          </div>

          {isParcelamentoOpen && (pendenteAPI - totalPagoNestaSessao()) > 0 && (
             <div className="mt-2 p-2.5 border rounded-md bg-blue-50 dark:bg-blue-900/30 space-y-2">
                <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-300">Configurar Parcelamento do Valor Restante</h4>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label htmlFor="num-parcelas" className="text-xs">Número de Parcelas</Label>
                        <Input id="num-parcelas" type="number" min="2" value={numParcelas} onChange={e => setNumParcelas(parseInt(e.target.value) || 2)} className="h-9"/>
                    </div>
                    <div>
                        <Label htmlFor="intervalo-parcelas" className="text-xs">Intervalo (dias)</Label>
                        <Input id="intervalo-parcelas" type="number" min="1" value={intervaloParcelas} onChange={e => setIntervaloParcelas(parseInt(e.target.value) || 30)} className="h-9"/>
                    </div>
                </div>
                 <div>
                    <Label htmlFor="data-primeira-parcela" className="text-xs">Data da 1ª Parcela</Label>
                    <Input id="data-primeira-parcela" type="date" value={dataPrimeiraParcela} onChange={e => setDataPrimeiraParcela(e.target.value)} className="h-9"/>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                    Serão geradas {numParcelas} novas contas de R$ {((pendenteAPI - totalPagoNestaSessao()) / numParcelas).toFixed(2)} cada.
                </p>
             </div>
          )}

        </div>
        <DialogFooter className="flex-shrink-0 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">Cancelar</Button>
          {(pendenteAPI - totalPagoNestaSessao()) > 0 && (
            <Button onClick={handleDividirEGerarNovasContas} variant="outline" className="text-orange-600 border-orange-500 hover:bg-orange-100" size="sm">
                <DivideCircle size={16} className="mr-2"/> {isParcelamentoOpen ? 'Confirmar Parcelamento' : 'Parcelar Restante'}
            </Button>
          )}
          <Button onClick={handleFinalizar} className="bg-green-600 hover:bg-green-700 text-white" disabled={(pendenteAPI - totalPagoNestaSessao()) > 0 && pagamentos.length === 0} size="sm">
            <CheckCircle2 size={16} className="mr-2" /> {(pendenteAPI - totalPagoNestaSessao()) > 0 && pagamentos.length > 0 ? 'Registrar Pagamento Parcial' : 'Confirmar Recebimento Total'}
          </Button>
        </DialogFooter>
      </DialogContent>
      {documentoRecibo && (
        <PDVReciboModal
          isOpen={isReciboOpen}
          setIsOpen={setIsReciboOpen}
          reciboRef={reciboRef}
          documento={documentoRecibo}
          logoUrl={''}
          nomeEmpresa={''}
          empresaSettings={{}}
          produtos={[]}
          handleImpressaoRecibo={() => {}}
          handleGerarPdfRecibo={() => {}}
          handleNovoPedido={() => setIsReciboOpen(false)}
        />
      )}
    </Dialog>
  );
};

export default RecebimentoModal;