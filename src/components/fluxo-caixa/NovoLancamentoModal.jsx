import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format, parseISO } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { lancamentoCaixaService, categoriaCaixaService, contaBancariaService } from '@/services/api';

const initialLancamentoState = {
  id: '',
  data: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  descricao: '',
  tipo: 'saida', 
  categoria_id: '',
  categoria_nome: '', 
  conta_id: '',
  valor: '',
  observacoes: '',
  forma_pagamento: '', 
};

const NovoLancamentoModal = ({ open, onOpenChange, onSave, lancamentoInicial }) => {
  const [lancamento, setLancamento] = useState(lancamentoInicial || initialLancamentoState);
  const [categorias, setCategorias] = useState([]);
  const [contas, setContas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Carregar categorias e contas do backend
  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar categorias
        const responseCategorias = await categoriaCaixaService.getAll();
        const categoriasData = responseCategorias.data?.data?.data || responseCategorias.data?.data || responseCategorias.data || [];
        setCategorias(categoriasData);
        
        // Carregar contas bancárias
        const responseContas = await contaBancariaService.getAtivas();
        const contasData = responseContas.data?.data?.data || responseContas.data?.data || responseContas.data || [];
        setContas(contasData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({ 
          title: "Erro", 
          description: "Erro ao carregar dados necessários.", 
          variant: "destructive" 
        });
      }
    };

    if (open) {
      loadData();
    }
  }, [open, toast]);

  // Recarregar dados quando o modal abrir com um lançamento inicial
  useEffect(() => {
    if (open && lancamentoInicial) {
      const loadData = async () => {
        try {
          // Carregar categorias
          const responseCategorias = await categoriaCaixaService.getAll();
          const categoriasData = responseCategorias.data?.data?.data || responseCategorias.data?.data || responseCategorias.data || [];
          setCategorias(categoriasData);
          
          // Carregar contas bancárias
          const responseContas = await contaBancariaService.getAtivas();
          const contasData = responseContas.data?.data?.data || responseContas.data?.data || responseContas.data || [];
          setContas(contasData);
        } catch (error) {
          console.error('Erro ao recarregar dados:', error);
        }
      };
      loadData();
    }
  }, [open, lancamentoInicial]);

  useEffect(() => {
    if (lancamentoInicial && categorias.length > 0 && contas.length > 0) {
      
      setLancamento({ 
        ...lancamentoInicial, 
        data: format(parseISO(lancamentoInicial.data_operacao), "yyyy-MM-dd'T'HH:mm"),
        categoria_id: String(lancamentoInicial.categoria_id || ''),
        conta_id: String(lancamentoInicial.conta_id || ''),
        forma_pagamento: mapearFormaPagamentoParaFrontend(lancamentoInicial.forma_pagamento || 'dinheiro')
      });
    } else if (!lancamentoInicial) {
      setLancamento(initialLancamentoState);
    }
  }, [lancamentoInicial, open, categorias, contas]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLancamento(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoriaChange = (value) => {
    
    const categoriaSelecionada = Array.isArray(categorias) ? categorias.find(c => {
      return c.id == value;
    }) : null;
    
    
    setLancamento(prev => ({ 
      ...prev, 
      categoria_id: String(value), // Converter para string
      categoria_nome: categoriaSelecionada ? categoriaSelecionada.nome : '',
      tipo: categoriaSelecionada ? categoriaSelecionada.tipo : prev.tipo 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!lancamento.data || !lancamento.descricao || !lancamento.tipo || !lancamento.categoria_id || !lancamento.conta_id || !lancamento.valor) {
      toast({ title: "Campos Obrigatórios", description: "Data, Descrição, Tipo, Categoria, Conta e Valor são obrigatórios.", variant: "destructive" });
      return;
    }
    
    if (parseFloat(lancamento.valor) <= 0) {
      toast({ title: "Valor Inválido", description: "O valor do lançamento deve ser maior que zero.", variant: "destructive" });
      return;
    }
    
    if (lancamento.tipo === 'entrada' && !lancamento.forma_pagamento) {
      toast({ title: "Forma de Pagamento", description: "Para entradas, selecione a forma de pagamento.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    
    try {
      // Preparar dados para enviar ao backend
      const dadosLancamento = {
        data_operacao: lancamento.data,
        descricao: lancamento.descricao,
        tipo: lancamento.tipo,
        categoria_id: lancamento.categoria_id,
        categoria_nome: lancamento.categoria_nome,
        conta_id: lancamento.conta_id,
        valor: parseFloat(lancamento.valor),
        observacoes: lancamento.observacoes || '',
        forma_pagamento: mapearFormaPagamento(lancamento.forma_pagamento || 'Dinheiro'),
        status: 'pendente'
      };

      let response;
      if (lancamento.id) {
        // Atualizar lançamento existente
        response = await lancamentoCaixaService.update(lancamento.id, dadosLancamento);
        toast({ title: "Sucesso", description: "Lançamento atualizado com sucesso!" });
      } else {
        // Criar novo lançamento
        response = await lancamentoCaixaService.create(dadosLancamento);
        toast({ title: "Sucesso", description: "Lançamento criado com sucesso!" });
      }

      // Chamar callback para atualizar a lista
      if (onSave) {
        onSave(response.data);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar lançamento:', error);
      toast({ 
        title: "Erro", 
        description: "Erro ao salvar lançamento. Tente novamente.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const categoriasFiltradas = useMemo(() => {
    if (!Array.isArray(categorias)) return [];
    if (!lancamento.tipo) return categorias;
    // Incluir categorias do tipo selecionado ou categorias sem tipo específico
    return categorias.filter(c => c.tipo === lancamento.tipo || !c.tipo || c.tipo === 'transferencia'); 
  }, [categorias, lancamento.tipo]);

  const formasPagamentoDisponiveis = ['Dinheiro', 'Pix', 'Cartão Débito', 'Cartão Crédito', 'Transferência Bancária', 'Outro'];
  
  // Função para mapear formas de pagamento do frontend para o backend
  const mapearFormaPagamento = (formaFrontend) => {
    const mapeamento = {
      'Dinheiro': 'dinheiro',
      'Pix': 'pix',
      'Cartão Débito': 'cartao_debito',
      'Cartão Crédito': 'cartao_credito',
      'Transferência Bancária': 'transferencia',
      'Outro': 'outro'
    };
    return mapeamento[formaFrontend] || 'dinheiro';
  };

  // Função para mapear formas de pagamento do backend para o frontend
  const mapearFormaPagamentoParaFrontend = (formaBackend) => {
    const mapeamento = {
      'dinheiro': 'Dinheiro',
      'pix': 'Pix',
      'cartao_debito': 'Cartão Débito',
      'cartao_credito': 'Cartão Crédito',
      'transferencia': 'Transferência Bancária',
      'outro': 'Outro'
    };
    return mapeamento[formaBackend] || 'Dinheiro';
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{lancamento.id ? 'Editar Lançamento' : 'Novo Lançamento no Fluxo de Caixa'}</DialogTitle>
          <DialogDescription>
            Adicione uma nova entrada ou saída financeira.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="data" className="text-right">Data</Label>
            <Input id="data" name="data" type="datetime-local" value={lancamento.data} onChange={handleChange} className="col-span-3"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="descricao" className="text-right">Descrição</Label>
            <Input id="descricao" name="descricao" value={lancamento.descricao} onChange={handleChange} className="col-span-3" placeholder="Ex: Venda Camisetas Personalizadas"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tipo" className="text-right">Tipo</Label>
            <Select name="tipo" value={lancamento.tipo} onValueChange={(value) => setLancamento(prev => ({...prev, tipo: value, categoria_id: '', categoria_nome: '', forma_pagamento: value === 'saida' ? '' : prev.forma_pagamento}))}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="conta_id" className="text-right">Conta</Label>
            <Select name="conta_id" value={lancamento.conta_id} onValueChange={(value) => {
              setLancamento(prev => ({...prev, conta_id: String(value)})); // Converter para string
            }}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(contas) && contas.length > 0 ? contas.map(conta => (
                  <SelectItem key={conta.id} value={String(conta.id)}>{conta.nome}</SelectItem>
                )) : (
                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="categoria_id" className="text-right">Categoria</Label>
            <Select name="categoria_id" value={lancamento.categoria_id} onValueChange={handleCategoriaChange} disabled={!lancamento.tipo}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoriasFiltradas.length > 0 ? categoriasFiltradas.map(cat => (
                  <SelectItem key={cat.id} value={String(cat.id)}>{cat.nome}</SelectItem>
                )) : (
                  <SelectItem value="no-categories" disabled>Nenhuma categoria disponível</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          {lancamento.tipo === 'entrada' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="forma_pagamento" className="text-right">Forma Pag.</Label>
              <Select name="forma_pagamento" value={lancamento.forma_pagamento} onValueChange={(value) => setLancamento(prev => ({...prev, forma_pagamento: value}))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {formasPagamentoDisponiveis.map(fp => (
                    <SelectItem key={fp} value={fp}>{fp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="valor" className="text-right">Valor (R$)</Label>
            <Input id="valor" name="valor" type="number" step="0.01" min="0.01" value={lancamento.valor} onChange={handleChange} className="col-span-3" placeholder="Ex: 150.75"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="observacoes" className="text-right">Observação</Label>
            <Textarea id="observacoes" name="observacoes" value={lancamento.observacoes || ''} onChange={handleChange} className="col-span-3" placeholder="Detalhes adicionais (opcional)"/>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : (lancamento.id ? 'Salvar Alterações' : 'Adicionar Lançamento')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovoLancamentoModal;