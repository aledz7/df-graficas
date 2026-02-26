import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, User, Calendar, DollarSign, Package } from 'lucide-react';
import api from '@/services/api';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

const SharedOSPage = () => {
  const { token } = useParams();
  const [os, setOs] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOS = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/public/os/${token}`);
        
        if (response.data.success && response.data.data) {
          setOs(response.data.data);
        } else {
          setError(response.data.message || 'Ordem de serviço não encontrada');
        }
      } catch (error) {
        console.error('Erro ao carregar OS:', error);
        setError(error.response?.data?.message || 'Erro ao carregar ordem de serviço');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      loadOS();
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando ordem de serviço...</p>
        </div>
      </div>
    );
  }

  if (error || !os) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || 'Ordem de serviço não encontrada'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'Orçamento': 'default',
      'Orçamento Salvo': 'default',
      'Finalizada': 'success',
      'Entregue': 'success',
      'Em Produção': 'warning',
      'Cancelada': 'destructive',
    };
    return statusMap[status] || 'default';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Ordem de Serviço #{os.id_os || os.id}
                </CardTitle>
                <Badge className={`mt-2 ${getStatusBadge(os.status_os)}`}>
                  {os.status_os}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Data de Criação:</span>
                <span className="text-sm font-medium">
                  {os.data_criacao ? format(new Date(os.data_criacao), 'dd/MM/yyyy') : 'N/A'}
                </span>
              </div>
              {os.data_validade && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Validade:</span>
                  <span className="text-sm font-medium">
                    {format(new Date(os.data_validade), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cliente */}
        {os.cliente && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{os.cliente.nome || os.cliente.nome_completo || 'Cliente não informado'}</p>
              {os.cliente.cpf_cnpj && (
                <p className="text-sm text-muted-foreground">CPF/CNPJ: {os.cliente.cpf_cnpj}</p>
              )}
              {os.cliente.telefone_principal && (
                <p className="text-sm text-muted-foreground">Telefone: {os.cliente.telefone_principal}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Itens */}
        {os.itens && os.itens.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Itens da Ordem de Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {os.itens.map((item, index) => (
                    <Card key={index} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold">{item.nome_servico_produto}</h4>
                            {item.produto && (
                              <p className="text-sm text-muted-foreground">
                                Código: {item.produto.codigo_produto || 'N/A'}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline">
                            {formatCurrency(item.valor_total || 0)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground mt-2">
                          <div>
                            <span className="font-medium">Quantidade:</span> {item.quantidade}
                          </div>
                          {item.largura && (
                            <div>
                              <span className="font-medium">Largura:</span> {item.largura} cm
                            </div>
                          )}
                          {item.altura && (
                            <div>
                              <span className="font-medium">Altura:</span> {item.altura} cm
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Unitário:</span> {formatCurrency(item.valor_unitario || 0)}
                          </div>
                        </div>
                        {item.detalhes && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm">
                            <span className="font-medium">Detalhes:</span> {item.detalhes}
                          </div>
                        )}
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
              Resumo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Total:</span>
                <span className="text-lg font-bold">{formatCurrency(os.valor_total_os || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        {os.observacoes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{os.observacoes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SharedOSPage;
