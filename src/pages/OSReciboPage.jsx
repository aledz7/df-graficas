import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, Printer, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { osService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

const OSReciboPage = ({ logoUrl: appLogoUrl, nomeEmpresa: appNomeEmpresa }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [os, setOS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const carregarOS = async () => {
      if (!id) {
        setError('ID da OS não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🔍 Buscando OS com ID:', id);
        const response = await osService.getById(id);
        console.log('📦 Resposta da API:', response);
        const osData = response?.data?.data || response?.data || response;
        console.log('📋 Dados da OS:', osData);
        console.log('📦 Itens da OS:', osData?.itens);
        setOS(osData);
      } catch (err) {
        console.error('Erro ao carregar OS:', err);
        setError('Erro ao carregar dados da OS');
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados da OS.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    carregarOS();
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
          <p className="text-muted-foreground">Carregando dados da OS...</p>
        </div>
      </div>
    );
  }

  if (error || !os) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => navigate('/relatorios/operacional/ordens-de-servico')}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <CardTitle>Erro ao Carregar OS</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error || 'OS não encontrada'}</p>
              <Button onClick={() => navigate('/relatorios/operacional/ordens-de-servico')}>
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
                onClick={() => navigate('/relatorios/operacional/ordens-de-servico')}
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
              <h2 className="text-xl font-semibold text-primary">ORDEM DE SERVIÇO</h2>
              <p className="text-sm text-muted-foreground">
                Nº: {os.codigo || os.id_os || os.id}
              </p>
            </div>

            {/* Informações da OS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="font-semibold mb-2">Informações da OS</h3>
                <p><strong>Data de Criação:</strong> {os.created_at ? format(new Date(os.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A'}</p>
                <p><strong>Status:</strong> {os.status || os.status_os || 'N/A'}</p>
                <p><strong>Vendedor:</strong> {os.vendedor?.nome_completo || os.usuario?.name || 'N/A'}</p>
                {os.data_finalizacao && (
                  <p><strong>Data Finalização:</strong> {format(new Date(os.data_finalizacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                )}
                {os.data_entrega && (
                  <p><strong>Data Entrega:</strong> {format(new Date(os.data_entrega), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Informações do Cliente</h3>
                <p><strong>Nome:</strong> {os.cliente?.nome_completo || os.cliente?.apelido_fantasia || os.cliente_nome_manual || 'N/A'}</p>
                <p><strong>CPF/CNPJ:</strong> {os.cliente?.cpf_cnpj || 'N/A'}</p>
                <p><strong>Telefone:</strong> {os.cliente?.telefone_principal || os.cliente?.telefone || 'N/A'}</p>
                <p><strong>Email:</strong> {os.cliente?.email_principal || os.cliente?.email || 'N/A'}</p>
              </div>
            </div>

            {/* Itens da OS */}
            {os.itens && os.itens.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold mb-4">Itens da OS</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto/Serviço</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-center">Unidade</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {os.itens.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {item.nome_servico_produto || item.produto_nome || item.nome || 'Produto não especificado'}
                            </div>
                            {item.detalhes && (
                              <div className="text-sm text-muted-foreground">
                                {Array.isArray(item.detalhes) ? item.detalhes.join(', ') : item.detalhes}
                              </div>
                            )}
                            {item.acabamentos && Array.isArray(item.acabamentos) && item.acabamentos.length > 0 && (
                              <div className="text-sm text-muted-foreground mt-1">
                                <strong>Acabamentos:</strong> {item.acabamentos.map(acab => acab.nome || acab).join(', ')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantidade || 1}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.tipo_item || item.unidade_medida || item.unidade || 'un'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.valor_unitario || item.preco_venda_unitario)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.valor_total || item.subtotal_item || ((item.valor_unitario || item.preco_venda_unitario) * (item.quantidade || 1)))}
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
                    <span>{formatCurrency(os.subtotal || os.valor_total_os)}</span>
                  </div>
                  {os.desconto && os.desconto > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto:</span>
                      <span>-{formatCurrency(os.desconto)}</span>
                    </div>
                  )}
                  {os.acrescimo && os.acrescimo > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Acréscimo:</span>
                      <span>+{formatCurrency(os.acrescimo)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(os.valor_total_os || os.valor_total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Observações */}
            {os.observacoes && (
              <div className="mt-6 p-4 bg-muted/20 rounded-md">
                <h3 className="font-semibold mb-2">Observações</h3>
                <p className="text-sm">{os.observacoes}</p>
              </div>
            )}

            {/* Informações de Produção */}
            {os.dados_producao && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                <h3 className="font-semibold mb-2">Informações de Produção</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {os.dados_producao.status_producao && (
                    <p><strong>Status:</strong> {os.dados_producao.status_producao}</p>
                  )}
                  {os.dados_producao.data_inicio_producao && (
                    <p><strong>Início:</strong> {format(new Date(os.dados_producao.data_inicio_producao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                  )}
                  {os.dados_producao.data_fim_producao && (
                    <p><strong>Fim:</strong> {format(new Date(os.dados_producao.data_fim_producao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                  )}
                  {os.dados_producao.responsavel_producao && (
                    <p><strong>Responsável:</strong> {os.dados_producao.responsavel_producao}</p>
                  )}
                </div>
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

export default OSReciboPage;
