import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Wrench } from 'lucide-react';
import api from '@/services/api';

const CorrigirOS758Page = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [dados, setDados] = useState(null);

  const verificar = async () => {
    setVerificando(true);
    try {
      const response = await api.get('/api/ordens-servico/verificar-758');
      if (response.data.success) {
        setDados(response.data);
      } else {
        toast({
          title: "Erro",
          description: response.data.message || "Erro ao verificar OS 758",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao verificar:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao verificar OS 758",
        variant: "destructive"
      });
    } finally {
      setVerificando(false);
    }
  };

  const corrigir = async () => {
    if (!window.confirm('Deseja realmente corrigir a OS 758? Esta ação não pode ser desfeita.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/ordens-servico/corrigir-758');
      if (response.data.success) {
        toast({
          title: "Sucesso!",
          description: "Correções aplicadas com sucesso",
          variant: "default"
        });
        // Recarregar dados
        await verificar();
      } else {
        toast({
          title: "Erro",
          description: response.data.message || "Erro ao corrigir OS 758",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao corrigir:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao corrigir OS 758",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verificar();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Verificar e Corrigir OS 758</h1>
        <p className="text-muted-foreground">
          Verifique o status da OS 758 e corrija problemas relacionados à conta a receber
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <Button 
          onClick={verificar} 
          disabled={verificando}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${verificando ? 'animate-spin' : ''}`} />
          {verificando ? 'Verificando...' : 'Verificar Novamente'}
        </Button>
        
        {dados && dados.problemas && (
          Object.values(dados.problemas).some(p => p) && (
            <Button 
              onClick={corrigir} 
              disabled={loading}
              variant="default"
            >
              <Wrench className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Corrigindo...' : 'Corrigir Problemas'}
            </Button>
          )
        )}
      </div>

      {!dados && !verificando && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Clique em "Verificar Novamente" para ver os dados da OS 758
            </p>
          </CardContent>
        </Card>
      )}

      {verificando && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3">Verificando OS 758...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {dados && dados.os && (
        <>
          {/* Informações da OS */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {dados.os.id ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                Informações da OS 758
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-semibold">{dados.os.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID_OS</p>
                  <p className="font-semibold">{dados.os.id_os}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold">{dados.os.status_os}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-semibold">{formatCurrency(dados.os.valor_total_os)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente ID</p>
                  <p className="font-semibold">{dados.os.cliente_id || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tem Crediário</p>
                  <p className="font-semibold">
                    {dados.os.tem_crediario ? (
                      <span className="text-green-600">Sim</span>
                    ) : (
                      <span className="text-gray-500">Não</span>
                    )}
                  </p>
                </div>
                {dados.os.tem_crediario && (
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Crediário Correto</p>
                    <p className="font-semibold text-green-600">{formatCurrency(dados.os.valor_crediario_correto)}</p>
                  </div>
                )}
              </div>

              {/* Pagamentos */}
              {dados.os.pagamentos && dados.os.pagamentos.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-semibold mb-2">Pagamentos:</p>
                  <div className="space-y-2">
                    {dados.os.pagamentos.map((pagamento, index) => (
                      <div key={index} className="p-3 bg-muted rounded-md">
                        <div className="flex justify-between">
                          <span className="font-medium">{pagamento.metodo || 'Não informado'}</span>
                          <span className="font-semibold">
                            {formatCurrency(pagamento.valorFinal || pagamento.valor || 0)}
                            {pagamento.valorFinal && pagamento.valorFinal !== pagamento.valor && (
                              <span className="text-xs text-muted-foreground ml-1">
                                (original: {formatCurrency(pagamento.valor)})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Problemas Encontrados */}
          {dados.problemas && Object.values(dados.problemas).some(p => p) && (
            <Card className="mb-4 border-yellow-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-5 w-5" />
                  Problemas Encontrados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dados.problemas.sem_conta && (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span>OS tem crediário mas não possui conta a receber criada</span>
                    </div>
                  )}
                  {dados.problemas.valor_incorreto && (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span>Conta a receber existe mas com valor incorreto</span>
                    </div>
                  )}
                  {dados.problemas.conta_id_758_errada && (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Existe uma Conta a Receber com ID 758 vinculada à OS errada</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status OK */}
          {dados.problemas && !Object.values(dados.problemas).some(p => p) && (
            <Card className="mb-4 border-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Tudo Correto!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-600">
                  A OS 758 está correta. Não foram encontrados problemas.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Contas a Receber */}
          {dados.contas && dados.contas.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Contas a Receber Vinculadas</CardTitle>
                <CardDescription>
                  Contas a receber relacionadas à OS 758
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dados.contas.map((conta) => {
                    const valorCorreto = dados.os.valor_crediario_correto;
                    const diferenca = Math.abs(conta.valor_original - valorCorreto);
                    const valorIncorreto = diferenca > 0.01;

                    return (
                      <div 
                        key={conta.id} 
                        className={`p-4 rounded-md border ${valorIncorreto ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">Conta ID: {conta.id}</span>
                          {valorIncorreto ? (
                            <span className="text-red-600 text-sm font-medium">Valor Incorreto!</span>
                          ) : (
                            <span className="text-green-600 text-sm font-medium">Valor Correto</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Valor Original</p>
                            <p className={`font-semibold ${valorIncorreto ? 'text-red-600' : ''}`}>
                              {formatCurrency(conta.valor_original)}
                            </p>
                            {valorIncorreto && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Esperado: {formatCurrency(valorCorreto)}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Valor Pendente</p>
                            <p className="font-semibold">{formatCurrency(conta.valor_pendente)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conta ID 758 */}
          {dados.conta_id_758 && (
            <Card className="mb-4 border-yellow-500">
              <CardHeader>
                <CardTitle className="text-yellow-600">Atenção: Conta a Receber ID 758</CardTitle>
                <CardDescription>
                  Existe uma conta a receber com ID 758 que pode não estar vinculada à OS 758
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Conta ID</p>
                    <p className="font-semibold">{dados.conta_id_758.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vinculada à OS ID</p>
                    <p className="font-semibold">
                      {dados.conta_id_758.os_id === 758 ? (
                        <span className="text-green-600">{dados.conta_id_758.os_id} ✓</span>
                      ) : (
                        <span className="text-red-600">{dados.conta_id_758.os_id} ✗</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="font-semibold">{formatCurrency(dados.conta_id_758.valor_original)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default CorrigirOS758Page;

