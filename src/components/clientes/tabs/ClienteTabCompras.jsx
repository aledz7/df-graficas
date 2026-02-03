import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { Eye, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { vendaService, osService, envelopamentoService } from '@/services/api';

const ClienteTabCompras = ({ clienteId }) => {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!clienteId) {
        setCompras([]);
        return;
      }

      setLoading(true);
      try {
        // Buscar vendas do cliente
        const vendasResponse = await vendaService.getByCliente(clienteId);
        const vendas = vendasResponse.data?.data?.data || [];

        // Buscar ordens de serviço do cliente
        const osResponse = await osService.getByCliente(clienteId);
        const ordensServico = osResponse.data || [];

        // Buscar envelopamentos do cliente
        const envelopamentosResponse = await envelopamentoService.getByCliente(clienteId);
        const envelopamentos = envelopamentosResponse.data?.data?.data || [];

        // Garantir que todos são arrays
        const vendasArray = Array.isArray(vendas) ? vendas : [];
        const ordensServicoArray = Array.isArray(ordensServico) ? ordensServico : [];
        const envelopamentosArray = Array.isArray(envelopamentos) ? envelopamentos : [];



        const todasAsCompras = [
          ...vendasArray.map(v => ({
            id: `venda-${v.id}`,
            data: v.data_venda || v.created_at,
            tipo: 'Venda',
            valorTotal: v.valor_total,
            status: v.status === 'concluida' ? 'Concluído' : v.status === 'pendente' ? 'Pendente' : v.status,
            codigo: v.codigo || `VDA-${v.id}`,
            vendaId: v.id, // ID numérico da venda para a API
          })),
          ...ordensServicoArray.map(os => ({
            id: `os-${os.id}`,
            data: os.data_finalizacao_os || os.data_criacao || os.created_at,
            tipo: 'Ordem de Serviço',
            valorTotal: os.valor_total_os,
            status: os.status_os === 'finalizada' ? 'Concluído' : os.status_os === 'orcamento' ? 'Orçamento' : os.status_os,
            codigo: os.id_os,
          })),
          ...envelopamentosArray.map(env => ({
            id: `env-${env.id}`,
            data: env.data_criacao,
            tipo: 'Envelopamento',
            valorTotal: env.orcamento_total,
            status: env.status === 'Finalizado' ? 'Concluído' : env.status === 'Orçamento Salvo' ? 'Orçamento' : env.status,
            codigo: env.codigo_orcamento,
          })),
        ];

        todasAsCompras.sort((a, b) => new Date(b.data) - new Date(a.data));
        setCompras(todasAsCompras);
      } catch (error) {
        console.error('Erro ao carregar compras do cliente:', error);
        setCompras([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [clienteId]);

  const formatCurrency = (value) => {
    return parseFloat(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return "Data inválida";
    }
  };

  if (!clienteId) {
    return <div className="p-4 text-center text-muted-foreground">Selecione um cliente para ver o histórico de compras.</div>;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Carregando histórico de compras...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Histórico de Compras e Orçamentos</h3>
      {compras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Eye size={48} className="mb-4" />
          <p>Nenhuma compra ou orçamento encontrado para este cliente.</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px] rounded-md border">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Data</TableHead>
                <TableHead className="w-20">Tipo</TableHead>
                <TableHead className="w-32">Código</TableHead>
                <TableHead className="text-right w-24">Valor Total</TableHead>
                <TableHead className="w-20">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compras.map((compra) => (
                <TableRow key={compra.id}>
                  <TableCell>{formatDate(compra.data)}</TableCell>
                  <TableCell>{compra.tipo}</TableCell>
                  <TableCell>{compra.codigo}</TableCell>
                  <TableCell className="text-right">{formatCurrency(compra.valorTotal)}</TableCell>
                  <TableCell>
                     <span className={`px-2 py-1 text-xs rounded-full ${
                        compra.status === 'Concluído' || compra.status === 'Pago' ? 'bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300' :
                        compra.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300' :
                        compra.status === 'Orçamento' ? 'bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300'
                      }`}>
                        {compra.status}
                      </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
};

export default ClienteTabCompras;