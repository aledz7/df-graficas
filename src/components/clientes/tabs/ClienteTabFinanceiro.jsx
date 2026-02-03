import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Printer, CheckCircle, AlertCircle, DollarSign, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { apiDataManager } from '@/lib/apiDataManager';
import { contaReceberService, contaPagarService } from '@/services/api';

const ClienteTabFinanceiro = ({ clienteId }) => {
  const [contasReceber, setContasReceber] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [loadingReceber, setLoadingReceber] = useState(false);
  const [loadingPagar, setLoadingPagar] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const loadData = async () => {
      if (!clienteId) {
        setContasReceber([]);
        setContasPagar([]);
        return;
      }

      // Carregar contas a receber
      setLoadingReceber(true);
      try {
        const responseReceber = await contaReceberService.getAll({ cliente_id: clienteId });
        const contasDataReceber = Array.isArray(responseReceber.data) ? responseReceber.data : [];
        
        const contasFormatadasReceber = contasDataReceber.map(conta => ({
          id: conta.id,
          clienteId: conta.cliente_id || clienteId,
          valorDevido: conta.valor_original || conta.valor,
          dataVencimento: conta.data_vencimento,
          status: (conta.status === 'pago' || conta.status === 'quitada') ? 'Pago' : 'Pendente',
          referenciaVenda: conta.referencia || conta.descricao || 'N/A',
          valorPago: conta.valor_pago,
          dataPagamento: conta.data_pagamento
        }));

        setContasReceber(contasFormatadasReceber);
      } catch (error) {
        console.error('Erro ao carregar contas a receber:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as contas a receber.",
          variant: "destructive"
        });
        setContasReceber([]);
      } finally {
        setLoadingReceber(false);
      }

      // Carregar contas a pagar
      setLoadingPagar(true);
      try {
        const responsePagar = await contaPagarService.getAll({ cliente_id: clienteId });
        const contasDataPagar = Array.isArray(responsePagar.data) ? responsePagar.data : [];
        
        const contasFormatadasPagar = contasDataPagar.map(conta => ({
          id: conta.id,
          clienteId: conta.cliente_id || clienteId,
          valorDevido: conta.valor_original || conta.valor,
          dataVencimento: conta.data_vencimento,
          status: (conta.status === 'pago' || conta.status === 'quitada') ? 'Pago' : 'Pendente',
          referenciaVenda: conta.referencia || conta.descricao || 'N/A',
          valorPago: conta.valor_pago,
          dataPagamento: conta.data_pagamento,
          fornecedor: conta.fornecedor || conta.fornecedor_nome || 'N/A'
        }));

        setContasPagar(contasFormatadasPagar);
      } catch (error) {
        console.error('Erro ao carregar contas a pagar:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as contas a pagar.",
          variant: "destructive"
        });
        setContasPagar([]);
      } finally {
        setLoadingPagar(false);
      }
    };
    
    loadData();
  }, [clienteId, toast]);

  const formatCurrency = (value) => {
    return parseFloat(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return "Data não informada";
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error, dateString);
      return "Data inválida";
    }
  };

  const handleMarcarComoPago = async (contaId, tipo) => {
    try {
      const contas = tipo === 'receber' ? contasReceber : contasPagar;
      const conta = contas.find(c => c.id === contaId);
      if (!conta) return;

      // Verificar se a conta já está quitada no backend
      if (tipo === 'receber') {
        try {
          const contaDetalhes = await contaReceberService.getById(contaId);
          if (contaDetalhes.data && contaDetalhes.data.status === 'quitada') {
            toast({
              title: "Conta já quitada",
              description: "Esta conta já foi quitada no sistema.",
              variant: "default"
            });
            return;
          }
        } catch (error) {
          console.error('Erro ao verificar status da conta:', error);
        }
      }

      if (tipo === 'receber') {
        // Para contas a receber, enviar dados de pagamento
        const dadosPagamento = {
          valor: conta.valorDevido, // Campo correto para contas a receber
          data_pagamento: new Date().toISOString().split('T')[0],
          forma_pagamento: 'dinheiro',
          observacoes: 'Pagamento realizado via sistema'
        };

        await contaReceberService.receber(contaId, dadosPagamento);
        const contasAtualizadas = contasReceber.map(c => 
          c.id === contaId 
            ? {...c, status: 'Pago', valorPago: conta.valorDevido, dataPagamento: dadosPagamento.data_pagamento} 
            : c
        );
        setContasReceber(contasAtualizadas);
      } else {
        // Para contas a pagar, apenas marcar como paga (sem dados de pagamento)
        await contaPagarService.marcarComoPaga(contaId);
        const contasAtualizadas = contasPagar.map(c => 
          c.id === contaId 
            ? {...c, status: 'Pago', valorPago: conta.valorDevido, dataPagamento: new Date().toISOString().split('T')[0]} 
            : c
        );
        setContasPagar(contasAtualizadas);
      }

      toast({ 
        title: "Sucesso!", 
        description: `Conta ${contaId} marcada como paga.` 
      });
    } catch (error) {
      console.error('Erro ao marcar conta como paga:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a conta como paga.",
        variant: "destructive"
      });
    }
  };

  const handleImprimirRecibo = (conta, tipo) => {
    const conteudoImpressao = gerarConteudoImpressao(conta, tipo);
    imprimirConteudo(conteudoImpressao);
  };

  const gerarConteudoImpressao = (conta, tipo) => {
    const dataAtual = format(new Date(), 'dd/MM/yyyy HH:mm');
    const valorFormatado = formatCurrency(conta.valorDevido);
    const dataVencimento = formatDate(conta.dataVencimento);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Comprovante - ${tipo === 'receber' ? 'Recebimento' : 'Pagamento'}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            margin: 20px;
            color: #000;
            background: #fff;
          }
          .header {
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .info-row {
            margin: 5px 0;
          }
          .separator {
            border-top: 1px solid #000;
            margin: 10px 0;
          }
          .value {
            font-weight: bold;
            font-size: 14px;
            text-align: center;
            margin: 15px 0;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 20px;
            color: #666;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${tipo === 'receber' ? 'COMPROVANTE DE RECEBIMENTO' : 'COMPROVANTE DE PAGAMENTO'}
        </div>
        
        <div class="info-row">Data/Hora: ${dataAtual}</div>
        <div class="info-row">ID Conta: ${conta.id}</div>
        <div class="info-row">Tipo: ${tipo === 'receber' ? 'Conta a Receber' : 'Conta a Pagar'}</div>
        
        <div class="separator"></div>
        
        <div class="info-row">Descrição: ${conta.referenciaVenda}</div>
        <div class="info-row">Data Vencimento: ${dataVencimento}</div>
        <div class="info-row">Status: ${conta.status}</div>
        
        <div class="separator"></div>
        
        <div class="value">VALOR: R$ ${valorFormatado}</div>
        
        <div class="separator"></div>
        
        <div class="footer">
          Documento gerado automaticamente pelo sistema<br>
          ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR')}
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; cursor: pointer;">
            Imprimir
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; margin-left: 10px;">
            Fechar
          </button>
        </div>
      </body>
      </html>
    `;
  };

  const imprimirConteudo = (conteudo) => {
    const novaJanela = window.open('', '_blank', 'width=600,height=800,scrollbars=yes,resizable=yes');
    novaJanela.document.write(conteudo);
    novaJanela.document.close();
    
    // Aguarda o carregamento da página antes de imprimir
    novaJanela.onload = () => {
      setTimeout(() => {
        novaJanela.print();
      }, 500);
    };
  };

  const renderTabelaContas = (contas, tipo, loading) => {
    if (loading) {
      return <div className="p-4 text-center text-muted-foreground">Carregando...</div>;
    }

    if (contas.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Eye size={48} className="mb-4" />
          <p>Nenhuma conta {tipo === 'receber' ? 'a receber' : 'a pagar'} encontrada para este cliente.</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">Valor Devido</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{tipo === 'receber' ? 'Ref. Venda' : 'Fornecedor'}</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contas.map((conta) => (
              <TableRow key={conta.id}>
                <TableCell className="text-right font-medium">{formatCurrency(conta.valorDevido)}</TableCell>
                <TableCell>{formatDate(conta.dataVencimento)}</TableCell>
                <TableCell>
                  <span className={`flex items-center px-2 py-1 text-xs rounded-full ${
                    conta.status === 'Pago' ? 'bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300'
                  }`}>
                    {conta.status === 'Pago' ? <CheckCircle size={14} className="mr-1" /> : <AlertCircle size={14} className="mr-1" />}
                    {conta.status}
                  </span>
                </TableCell>
                <TableCell>{tipo === 'receber' ? conta.referenciaVenda : conta.fornecedor}</TableCell>
                <TableCell className="text-center space-x-1">
                  {conta.status === 'Pendente' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleMarcarComoPago(conta.id, tipo)} 
                      className="text-xs"
                    >
                      <CheckCircle size={14} className="mr-1" /> Baixar
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleImprimirRecibo(conta, tipo)} 
                    className="text-xs"
                  >
                    <Printer size={14} className="mr-1" /> Imprimir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  if (!clienteId) {
    return <div className="p-4 text-center text-muted-foreground">Selecione um cliente para ver o financeiro.</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Financeiro do Cliente</h3>
      
      <Tabs defaultValue="receber" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receber" className="flex items-center gap-2">
            <DollarSign size={16} />
            Contas a Receber ({contasReceber.length})
          </TabsTrigger>
          <TabsTrigger value="pagar" className="flex items-center gap-2">
            <CreditCard size={16} />
            Contas a Pagar ({contasPagar.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="receber" className="space-y-4">
          <h4 className="text-md font-medium text-green-700 dark:text-green-300">Contas a Receber</h4>
          {renderTabelaContas(contasReceber, 'receber', loadingReceber)}
        </TabsContent>
        
        <TabsContent value="pagar" className="space-y-4">
          <h4 className="text-md font-medium text-red-700 dark:text-red-300">Contas a Pagar</h4>
          {renderTabelaContas(contasPagar, 'pagar', loadingPagar)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClienteTabFinanceiro;