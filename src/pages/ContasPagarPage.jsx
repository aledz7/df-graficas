import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { format, parseISO, differenceInDays, add, isValid } from 'date-fns';
import { DollarSign, PlusCircle, Filter, CheckCircle, AlertCircle, Clock, Edit2, Trash2, CalendarPlus as CalendarPlus, RefreshCw, Bell, Printer } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReactToPrint } from 'react-to-print';
import contaPagarService from '@/services/contaPagarService';
import PagamentoModal from '@/components/contas-pagar/PagamentoModal';

const initialContaState = {
    id: '',
    descricao: '',
    valor: '',
    dataVencimento: format(new Date(), 'yyyy-MM-dd'),
    dataPagamento: null,
    fornecedorId: '',
    categoriaId: '',
    status: 'pendente',
    recorrencia: 'nao_recorre',
    dataFimContrato: null,
    dataInicioContrato: format(new Date(), 'yyyy-MM-dd'),
};

const ComprovantePagamento = React.forwardRef(({ conta, fornecedor }, ref) => {
  if (!conta) return null;
  return (
    <div ref={ref} className="p-4 bg-white text-black font-mono text-sm">
      <h2 className="text-center font-bold text-lg mb-2">Comprovante de Pagamento</h2>
      <p>----------------------------------------</p>
      <p>Data Pag.: {format(parseISO(conta.dataPagamento), 'dd/MM/yyyy HH:mm')}</p>
      <p>ID Conta: {conta.id}</p>
      <p>Fornecedor: {fornecedor?.nome || 'N/A'}</p>
      <p>Descrição: {conta.descricao}</p>
      <p>----------------------------------------</p>
      <p className="font-bold text-lg">VALOR PAGO: R$ {parseFloat(conta.valor).toFixed(2)}</p>
      <p>----------------------------------------</p>
    </div>
  );
});


const ContasPagarPage = () => {
  const { toast } = useToast();
  const [contas, setContas] = useState([]);
  const [filteredContas, setFilteredContas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [isLoadingFornecedores, setIsLoadingFornecedores] = useState(true);
  const [categoriasDespesa, setCategoriasDespesa] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState(null);
  const [contaForm, setContaForm] = useState(initialContaState);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroFornecedor, setFiltroFornecedor] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState({ inicio: '', fim: '' });
  const [contaParaImpressao, setContaParaImpressao] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState(false);
  const [contaParaPagamento, setContaParaPagamento] = useState(null);
  
  const comprovanteRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => comprovanteRef.current,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingFornecedores(true);
        
        // Carregar contas a pagar
        const responseContas = await contaPagarService.listar();
        if (responseContas.success) {
          setContas(responseContas.data);
        }
        
        // Carregar fornecedores
        const responseFornecedores = await contaPagarService.buscarFornecedores();
        if (responseFornecedores.success) {
          setFornecedores(responseFornecedores.data);
        }
        
        // Carregar categorias (apenas financeiras)
        const responseCategorias = await contaPagarService.buscarCategorias('financeiro');
        if (responseCategorias.success) {
          setCategoriasDespesa(responseCategorias.data);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({ 
          title: 'Erro ao carregar dados', 
          description: 'Não foi possível carregar as informações. Tente novamente.', 
          variant: 'destructive' 
        });
      } finally {
        setIsLoadingFornecedores(false);
        setIsInitialLoad(false);
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    let items = [...(contas || [])];
    if (filtroStatus !== 'todos') items = items.filter(c => c.status === filtroStatus);
    if (filtroFornecedor && filtroFornecedor !== 'todos') items = items.filter(c => c.fornecedor_id === filtroFornecedor);
    if (filtroPeriodo.inicio) items = items.filter(c => new Date(c.data_vencimento) >= new Date(filtroPeriodo.inicio));
    if (filtroPeriodo.fim) {
        const dataFimAjustada = new Date(filtroPeriodo.fim);
        dataFimAjustada.setHours(23, 59, 59, 999);
        items = items.filter(c => new Date(c.data_vencimento) <= dataFimAjustada);
    }
    setFilteredContas(items);
  }, [contas, filtroStatus, filtroFornecedor, filtroPeriodo]);

  const handleOpenModal = (conta = null) => {
    if (conta) {
      setEditingConta(conta);
      setContaForm({ 
        ...initialContaState, 
        ...conta, 
        dataVencimento: format(parseISO(conta.data_vencimento), 'yyyy-MM-dd'),
        dataInicioContrato: conta.data_inicio_contrato ? format(parseISO(conta.data_inicio_contrato), 'yyyy-MM-dd') : initialContaState.dataInicioContrato,
        dataFimContrato: conta.data_fim_contrato ? format(parseISO(conta.data_fim_contrato), 'yyyy-MM-dd') : null,
        fornecedorId: conta.fornecedor_id,
        categoriaId: conta.categoria_id
      });
    } else {
      setEditingConta(null);
      setContaForm(initialContaState);
    }
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => setContaForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleDateChange = (date, field) => setContaForm(prev => ({ ...prev, [field]: date ? format(date, 'yyyy-MM-dd') : null }));

  const handleSaveConta = async () => {
    if (!contaForm.descricao || !contaForm.valor) {
      toast({ title: 'Campos obrigatórios', description: 'Descrição e Valor são obrigatórios.', variant: 'destructive' });
      return;
    }
    
    try {
      const dadosConta = {
        descricao: contaForm.descricao,
        valor: parseFloat(contaForm.valor),
        data_vencimento: contaForm.dataVencimento,
        fornecedor_id: contaForm.fornecedorId || null,
        categoria_id: contaForm.categoriaId || null,
        recorrencia: contaForm.recorrencia,
        data_inicio_contrato: contaForm.dataInicioContrato,
        data_fim_contrato: contaForm.dataFimContrato,
        observacoes: contaForm.observacoes
      };

      if (editingConta) {
        const response = await contaPagarService.atualizar(editingConta.id, dadosConta);
        if (response.success) {
          setContas(prev => (prev || []).map(c => c.id === editingConta.id ? response.data : c));
          toast({ title: 'Sucesso!', description: 'Conta atualizada.' });
        }
      } else {
        const response = await contaPagarService.criar(dadosConta);
        if (response.success) {
          setContas(prev => [...prev, response.data]);
          toast({ title: 'Sucesso!', description: 'Conta a pagar adicionada.' });
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      toast({ 
        title: 'Erro ao salvar', 
        description: 'Não foi possível salvar a conta. Tente novamente.', 
        variant: 'destructive' 
      });
    }
  };
  
  const handleMarcarComoPaga = async (id) => {
    const conta = contas.find(c => c.id === id);
    if (conta) {
      setContaParaPagamento(conta);
      setIsPagamentoModalOpen(true);
    }
  };

  const handleConfirmarPagamento = (contaAtualizada) => {
    setContas(prev => (prev || []).map(c => c.id === contaAtualizada.id ? contaAtualizada : c));
    setIsPagamentoModalOpen(false);
    setContaParaPagamento(null);
  };
  
  const handleDeleteConta = async (id) => {
    try {
      const response = await contaPagarService.remover(id);
      if (response.success) {
        setContas(prev => (prev || []).filter(c => c.id !== id));
        toast({ title: 'Conta removida.', variant: 'destructive'});
      }
    } catch (error) {
      console.error('Erro ao remover conta:', error);
      toast({ 
        title: 'Erro ao remover', 
        description: 'Não foi possível remover a conta. Tente novamente.', 
        variant: 'destructive' 
      });
    }
  };

  const getStatusBadge = (status, dataFimContrato) => {
    const isEndingSoon = dataFimContrato && isValid(parseISO(dataFimContrato)) && differenceInDays(parseISO(dataFimContrato), new Date()) <= 30 && differenceInDays(parseISO(dataFimContrato), new Date()) >= 0;
    
    let badge;
    if (status === 'pago') badge = <span className="flex items-center text-green-600"><CheckCircle size={14} className="mr-1"/> Pago</span>;
    else if (status === 'vencido') badge = <span className="flex items-center text-red-600"><AlertCircle size={14} className="mr-1"/> Vencido</span>;
    else badge = <span className="flex items-center text-yellow-600"><Clock size={14} className="mr-1"/> Pendente</span>;
    
    return <div className="flex items-center gap-2">{badge}{isEndingSoon && status !== 'pago' && <Bell size={14} className="text-orange-500 animate-pulse" title={`Contrato vence em ${format(parseISO(dataFimContrato), 'dd/MM/yyyy')}`}/>}</div>;
  };
  
  const getFornecedorNome = (id) => {
    if (!id) return 'N/A';
    const fornecedor = (fornecedores || []).find(f => f.id === id);
    return fornecedor?.nome || 'N/A';
  };

  const totais = useMemo(() => ({
    aPagar: (filteredContas || []).filter(c => c.status === 'pendente' || c.status === 'vencido').reduce((acc, c) => acc + parseFloat(c.valor), 0),
    pago: (filteredContas || []).filter(c => c.status === 'pago').reduce((acc, c) => acc + parseFloat(c.valor), 0)
  }), [filteredContas]);
  
  const handleImprimirRecibo = (conta) => {
    setContaParaImpressao(conta);
    setTimeout(() => {
        handlePrint();
    }, 100);
  };

  return (
      <div className="p-4 md:p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div><CardTitle className="text-2xl">Contas a Pagar</CardTitle><CardDescription>Gerencie suas despesas e pagamentos futuros.</CardDescription></div>
                  <Button onClick={() => handleOpenModal()}><PlusCircle size={18} className="mr-2"/> Adicionar Conta</Button>
                </CardHeader>
                <CardContent>
                    <div className="p-4 border rounded-lg mb-4 space-y-4">
                        <h3 className="font-semibold flex items-center"><Filter size={16} className="mr-2"/>Filtros</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Select value={filtroStatus} onValueChange={setFiltroStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="todos">Todos Status</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="vencido">Vencido</SelectItem></SelectContent></Select>
                            <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
                                <SelectTrigger>
                                    <SelectValue placeholder={isLoadingFornecedores ? 'Carregando...' : 'Selecione o fornecedor'} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos Fornecedores</SelectItem>
                                    {isLoadingFornecedores ? (
                                        <div className="flex items-center justify-center p-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                            <span>Carregando...</span>
                                        </div>
                                    ) : (fornecedores || []).length > 0 ? (
                                        (fornecedores || []).map(fornecedor => (
                                            <SelectItem key={fornecedor.id} value={fornecedor.id}>
                                                {fornecedor.nome}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-2 text-sm text-muted-foreground">Nenhum fornecedor encontrado</div>
                                    )}
                                </SelectContent>
                            </Select>
                            <Input type="date" value={filtroPeriodo.inicio} onChange={e => setFiltroPeriodo(p => ({...p, inicio: e.target.value}))}/>
                            <Input type="date" value={filtroPeriodo.fim} onChange={e => setFiltroPeriodo(p => ({...p, fim: e.target.value}))}/>
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 mb-4">
                        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total a Pagar</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">R$ {totais.aPagar.toFixed(2)}</div></CardContent></Card>
                        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Pago (período)</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">R$ {totais.pago.toFixed(2)}</div></CardContent></Card>
                    </div>
                    <ScrollArea className="h-[calc(100vh-32rem)]">
                        <Table>
                            <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Fornecedor</TableHead><TableHead>Vencimento</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                            <TableBody>
                            {(filteredContas || []).length > 0 ? (filteredContas || []).map(conta => (
                                <TableRow key={conta.id} className={conta.recorrencia !== 'nao_recorre' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                                    <TableCell className="font-medium">{conta.descricao} {conta.recorrencia !== 'nao_recorre' && <RefreshCw size={12} className="inline ml-1 text-blue-500"/>}</TableCell>
                                    <TableCell>{getFornecedorNome(conta.fornecedor_id)}</TableCell><TableCell>{format(parseISO(conta.data_vencimento), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{getStatusBadge(conta.status, conta.data_fim_contrato)}</TableCell>
                                    <TableCell className="text-right font-semibold">R$ {parseFloat(conta.valor).toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        {conta.status === 'pago' && <Button variant="ghost" size="icon" onClick={() => handleImprimirRecibo(conta)} className="text-blue-500"><Printer size={16}/></Button>}
                                        {conta.status !== 'pago' && <Button variant="ghost" size="icon" onClick={() => handleMarcarComoPaga(conta.id)} className="text-green-500"><CheckCircle size={16} /></Button>}
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(conta)}><Edit2 size={16} /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteConta(conta.id)} className="text-red-500"><Trash2 size={16} /></Button>
                                    </TableCell>
                                </TableRow>
                            )) : (<TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhuma conta encontrada.</TableCell></TableRow>)}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </motion.div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{editingConta ? 'Editar Conta' : 'Nova Conta a Pagar'}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <div><Label htmlFor="descricao">Descrição</Label><Input id="descricao" name="descricao" value={contaForm.descricao} onChange={handleFormChange}/></div>
                    <div><Label htmlFor="valor">Valor (R$)</Label><Input id="valor" name="valor" type="number" value={contaForm.valor} onChange={handleFormChange}/></div>
                    <div><Label htmlFor="dataVencimento">Vencimento</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarPlus className="mr-2 h-4 w-4"/>{contaForm.dataVencimento ? format(parseISO(contaForm.dataVencimento), 'dd/MM/yyyy') : <span>Escolha uma data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={contaForm.dataVencimento ? parseISO(contaForm.dataVencimento) : null} onSelect={(d) => handleDateChange(d, 'dataVencimento')} initialFocus/></PopoverContent></Popover></div>
                    <div><Label htmlFor="fornecedorId">Fornecedor</Label><Select name="fornecedorId" onValueChange={v => handleFormChange({target: {name: 'fornecedorId', value: v}})} value={contaForm.fornecedorId}><SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent>{(fornecedores || []).map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label htmlFor="categoriaId">Categoria</Label><Select name="categoriaId" onValueChange={v => handleFormChange({target: {name: 'categoriaId', value: v}})} value={contaForm.categoriaId}><SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent>{(categoriasDespesa || []).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label htmlFor="recorrencia">Recorrência</Label><Select name="recorrencia" onValueChange={v => handleFormChange({target: {name: 'recorrencia', value: v}})} value={contaForm.recorrencia}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="nao_recorre">Não Recorre</SelectItem><SelectItem value="mensal">Mensal</SelectItem><SelectItem value="bimestral">Bimestral</SelectItem><SelectItem value="trimestral">Trimestral</SelectItem><SelectItem value="semestral">Semestral</SelectItem><SelectItem value="anual">Anual</SelectItem></SelectContent></Select></div>
                     {contaForm.recorrencia !== 'nao_recorre' && (
                        <>
                        <div><Label htmlFor="dataInicioContrato">Data Início do Contrato</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarPlus className="mr-2 h-4 w-4"/>{contaForm.dataInicioContrato && isValid(parseISO(contaForm.dataInicioContrato)) ? format(parseISO(contaForm.dataInicioContrato), 'dd/MM/yyyy') : <span>Início...</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={contaForm.dataInicioContrato && isValid(parseISO(contaForm.dataInicioContrato)) ? parseISO(contaForm.dataInicioContrato) : null} onSelect={(d) => handleDateChange(d, 'dataInicioContrato')} initialFocus/></PopoverContent></Popover></div>
                        <div><Label htmlFor="dataFimContrato">Data Fim do Contrato (opcional)</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarPlus className="mr-2 h-4 w-4"/>{contaForm.dataFimContrato && isValid(parseISO(contaForm.dataFimContrato)) ? format(parseISO(contaForm.dataFimContrato), 'dd/MM/yyyy') : <span>Sem data final</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={contaForm.dataFimContrato && isValid(parseISO(contaForm.dataFimContrato)) ? parseISO(contaForm.dataFimContrato) : null} onSelect={(d) => handleDateChange(d, 'dataFimContrato')} initialFocus/></PopoverContent></Popover></div>
                        </>
                    )}
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button><Button onClick={handleSaveConta}>Salvar</Button></DialogFooter>
            </DialogContent>
        </Dialog>
        <div style={{ display: 'none' }}>
            <ComprovantePagamento ref={comprovanteRef} conta={contaParaImpressao} fornecedor={(fornecedores || []).find(f => f.id === contaParaImpressao?.fornecedor_id)} />
        </div>
        
        <PagamentoModal
          open={isPagamentoModalOpen}
          onOpenChange={setIsPagamentoModalOpen}
          conta={contaParaPagamento}
          onConfirmPagamento={handleConfirmarPagamento}
        />
      </div>
  );
};

export default ContasPagarPage;