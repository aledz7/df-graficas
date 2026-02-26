import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Receipt, User, Calendar, DollarSign, Package, CreditCard } from 'lucide-react';
import api from '@/services/api';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

const SharedVendaPage = () => {
  const { token } = useParams();
  const [venda, setVenda] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadVenda = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/public/venda/${token}`);
        
        if (response.data.success && response.data.data) {
          setVenda(response.data.data);
        } else {
          setError(response.data.message || 'Venda não encontrada');
        }
      } catch (error) {
        console.error('Erro ao carregar venda:', error);
        setError(error.response?.data?.message || 'Erro ao carregar venda');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      loadVenda();
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando venda...</p>
        </div>
      </div>
    );
  }

  if (error || !venda) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || 'Venda não encontrada'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'concluida': 'success',
      'finalizada': 'success',
      'pendente': 'warning',
      'cancelada': 'destructive',
      'estornada': 'destructive',
    };
    return statusMap[status] || 'default';
  };

  const totalPago = venda.dados_pagamento 
    ? venda.dados_pagamento.reduce((acc, p) => acc + (parseFloat(p.valor || p.valorFinal || 0)), 0)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Receipt className="h-6 w-6" />
                  {venda.tipo_documento === 'orcamento' ? 'Orçamento' : 'Venda'} #{venda.codigo || venda.id}
                </CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge className={getStatusBadge(venda.status)}>
                    {venda.status}
                  </Badge>
                  {venda.tipo_documento && (
                    <Badge variant="outline">
                      {venda.tipo_documento}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Data de Emissão:</span>
                <span className="text-sm font-medium">
                  {venda.data_emissao ? format(new Date(venda.data_emissao), 'dd/MM/yyyy HH:mm') : 'N/A'}
                </span>
              </div>
              {venda.vendedor_nome && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Vendedor:</span>
                  <span className="text-sm font-medium">{venda.vendedor_nome}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cliente */}
        {venda.cliente && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{venda.cliente.nome || venda.cliente_nome || 'Cliente não informado'}</p>
              {venda.cliente.cpf_cnpj && (
                <p className="text-sm text-muted-foreground">CPF/CNPJ: {venda.cliente.cpf_cnpj}</p>
              )}
              {venda.cliente.telefone_principal && (
                <p className="text-sm text-muted-foreground">Telefone: {venda.cliente.telefone_principal}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Itens */}
        {venda.itens && venda.itens.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Itens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {venda.itens.map((item, index) => (
                    <Card key={index} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold">{item.produto_nome || item.nome || 'Produto'}</h4>
                            {item.produto && (
                              <p className="text-sm text-muted-foreground">
                                Código: {item.produto.codigo_produto || 'N/A'}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline">
                            {formatCurrency(item.subtotal || item.valor_total || 0)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground mt-2">
                          <div>
                            <span className="font-medium">Quantidade:</span> {item.quantidade}
                          </div>
                          <div>
                            <span className="font-medium">Unitário:</span> {formatCurrency(item.valor_unitario || 0)}
                          </div>
                          {item.produto_unidade && (
                            <div>
                              <span className="font-medium">Unidade:</span> {item.produto_unidade}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Resumo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Resumo Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(venda.subtotal || 0)}</span>
              </div>
              {venda.desconto > 0 && (
                <div className="flex justify-between text-red-600">
                  <span className="text-muted-foreground">Desconto:</span>
                  <span>-{formatCurrency(venda.desconto || 0)}</span>
                </div>
              )}
              {venda.acrescimo > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="text-muted-foreground">Acréscimo:</span>
                  <span>+{formatCurrency(venda.acrescimo || 0)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Valor Total:</span>
                <span className="text-lg font-bold">{formatCurrency(venda.valor_total || 0)}</span>
              </div>
              {totalPago > 0 && (
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Valor Pago:</span>
                  <span className="text-green-600 font-semibold">{formatCurrency(totalPago)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pagamentos */}
        {venda.dados_pagamento && venda.dados_pagamento.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Formas de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {venda.dados_pagamento.map((pagamento, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>{pagamento.metodo || pagamento.forma_pagamento || 'Não informado'}</span>
                    <span className="font-semibold">{formatCurrency(pagamento.valor || pagamento.valorFinal || 0)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        {venda.observacoes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{venda.observacoes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SharedVendaPage;
