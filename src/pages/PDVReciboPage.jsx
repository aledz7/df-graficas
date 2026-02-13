import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, Printer, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { vendaService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

const PDVReciboPage = ({ logoUrl: appLogoUrl, nomeEmpresa: appNomeEmpresa }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venda, setVenda] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const carregarVenda = async () => {
      if (!id) {
        setError('ID da venda não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await vendaService.getById(id);
        const vendaData = response?.data?.data || response?.data || response;
        setVenda(vendaData);
      } catch (err) {
        console.error('Erro ao carregar venda:', err);
        setError('Erro ao carregar dados da venda');
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados da venda.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    carregarVenda();
  }, [id, toast]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleGerarPDF = () => {
    // Implementar geração de PDF se necessário
    toast({
      title: "PDF",
      description: "Funcionalidade de PDF será implementada em breve.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dados da venda...</p>
        </div>
      </div>
    );
  }

  if (error || !venda) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
                onClick={() => navigate('/relatorios/operacional/vendas-gerais')}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
              <CardTitle>Erro ao Carregar Venda</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error || 'Venda não encontrada'}</p>
              <Button onClick={() => navigate('/relatorios/operacional/vendas-gerais')}>
                Voltar ao Relatório
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="print:shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => navigate('/relatorios/operacional/vendas-gerais')}
                className="flex items-center print:hidden"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <div className="flex space-x-2 print:hidden">
                <Button variant="outline" onClick={handleImprimir}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
                <Button variant="outline" onClick={handleGerarPDF}>
                  <FileDown className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
          </div>
          </CardHeader>
          <CardContent>
            {/* Cabeçalho do Recibo */}
            <div className="text-center mb-8 border-b pb-6">
              {appLogoUrl && (
                <img 
                  src={appLogoUrl} 
                  alt="Logo" 
                  className="h-16 mx-auto mb-4"
                />
              )}
              <h1 className="text-2xl font-bold">{appNomeEmpresa || 'Empresa'}</h1>
              <h2 className="text-xl font-semibold text-primary">RECIBO DE VENDA</h2>
            <p className="text-sm text-muted-foreground">
                Nº: {venda.codigo || venda.id}
            </p>
          </div>

            {/* Informações da Venda */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="font-semibold mb-2">Informações da Venda</h3>
                <p><strong>Data:</strong> {venda.data_venda ? format(new Date(venda.data_venda), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A'}</p>
                <p><strong>Vendedor:</strong> {venda.vendedor?.nome_completo || venda.usuario?.name || 'N/A'}</p>
                <p><strong>Status:</strong> {venda.status || 'Finalizada'}</p>
                {venda.tipo_pedido === 'PERMUTA' && (
                  <>
                    <p className="mt-2"><strong className="text-orange-600">Tipo do Pedido:</strong> <span className="text-orange-600 font-bold">PERMUTA</span></p>
                    <p className="text-sm text-orange-600 italic">Pedido sem impacto financeiro</p>
                  </>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Informações do Cliente</h3>
                <p><strong>Nome:</strong> {venda.cliente?.nome_completo || venda.cliente?.apelido_fantasia || 'Consumidor Final'}</p>
                <p><strong>Telefone:</strong> {venda.cliente?.telefone_principal || venda.cliente?.telefone || 'N/A'}</p>
                <p><strong>Email:</strong> {venda.cliente?.email_principal || venda.cliente?.email || 'N/A'}</p>
              </div>
            </div>

            {/* Itens da Venda */}
            {venda.itens && venda.itens.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold mb-4">Itens da Venda</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {venda.itens.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {item.produto_nome || item.nome || 'Produto não especificado'}
                          {item.variacao && (
                            <div className="text-sm text-muted-foreground">
                              Variação: {item.variacao}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantidade || 1}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.valor_unitario || item.preco_venda_unitario)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency((item.valor_unitario || item.preco_venda_unitario) * (item.quantidade || 1))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Resumo Financeiro */}
            <div className="border-t pt-6">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(venda.valor_total || venda.total)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(venda.valor_total || venda.total)}</span>
                  </div>
                </div>
          </div>
        </div>

            {/* Observações */}
            {venda.observacoes && (
              <div className="mt-6 p-4 bg-muted/20 rounded-md">
                <h3 className="font-semibold mb-2">Observações</h3>
                <p className="text-sm">{venda.observacoes}</p>
              </div>
            )}

            {/* Rodapé */}
            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>Obrigado pela preferência!</p>
              <p>Este documento foi gerado automaticamente pelo sistema.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PDVReciboPage;