import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Banknote, Smartphone, CreditCard as CreditCardIcon, Calendar as CalendarIconLucide, Wallet, Building2 } from 'lucide-react';

const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toFixed(2).replace('.', ',')}`;

const formaPagamentoIconMap = {
  Dinheiro: <Banknote className="h-5 w-5 text-green-500" />,
  dinheiro: <Banknote className="h-5 w-5 text-green-500" />,
  Pix: <Smartphone className="h-5 w-5 text-sky-500" />,
  pix: <Smartphone className="h-5 w-5 text-sky-500" />,
  'Cartão Débito': <CreditCardIcon className="h-5 w-5 text-blue-500" />,
  'cartao_debito': <CreditCardIcon className="h-5 w-5 text-blue-500" />,
  'Cartão Crédito': <CreditCardIcon className="h-5 w-5 text-orange-500" />,
  'cartao_credito': <CreditCardIcon className="h-5 w-5 text-orange-500" />,
  'Crediário': <CalendarIconLucide className="h-5 w-5 text-purple-500" />,
  'Transferência Bancária': <DollarSign className="h-5 w-5 text-yellow-500" />,
  'transferencia': <DollarSign className="h-5 w-5 text-yellow-500" />,
  'boleto': <Wallet className="h-5 w-5 text-gray-600" />,
  'Outro': <DollarSign className="h-5 w-5 text-gray-500" />,
  'outro': <DollarSign className="h-5 w-5 text-gray-500" />,
};

const FluxoCaixaSummary = ({ totaisDoDia = {}, totaisPorFormaPagamento = {}, totaisPorConta = {} }) => {
  // Garantir que os objetos sejam válidos
  const totais = {
    totalEntradas: totaisDoDia?.totalEntradas || 0,
    totalSaidas: totaisDoDia?.totalSaidas || 0,
    saldoDoDia: totaisDoDia?.saldoDoDia || 0
  };

  const formasPagamento = totaisPorFormaPagamento && typeof totaisPorFormaPagamento === 'object' ? totaisPorFormaPagamento : {};
  const contas = totaisPorConta && typeof totaisPorConta === 'object' ? totaisPorConta : {};

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entradas (Dia)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(totais.totalEntradas)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saídas (Dia)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(totais.totalSaidas)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo do Dia</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className={`text-2xl font-bold ${totais.saldoDoDia >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(totais.saldoDoDia)}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
              <CardTitle>Resumo de Entradas por Forma de Pagamento (Dia)</CardTitle>
              <CardDescription>Detalha o total recebido por cada forma de pagamento no dia selecionado.</CardDescription>
          </CardHeader>
          <CardContent>
              {Object.keys(formasPagamento).length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                      {Object.entries(formasPagamento).map(([forma, total]) => (
                          <div key={forma} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                              <span className="flex items-center text-sm font-medium">
                                  {formaPagamentoIconMap[forma] || <DollarSign className="h-5 w-5 text-gray-400" />}
                                  <span className="ml-2 capitalize">{forma.replace(/_/g, ' ')}</span>
                              </span>
                              <span className="text-sm font-semibold">{formatCurrency(total)}</span>
                          </div>
                      ))}
                  </div>
              ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma entrada registrada com forma de pagamento para este dia.</p>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
              <CardTitle>Resumo de Entradas por Saldo em Conta (Dia)</CardTitle>
              <CardDescription>Detalha o total recebido por cada conta bancária no dia selecionado.</CardDescription>
          </CardHeader>
          <CardContent>
              {Object.keys(contas).length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                      {Object.entries(contas).map(([contaId, contaData]) => (
                          <div key={contaId} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                              <span className="flex items-center text-sm font-medium">
                                  <Building2 className="h-5 w-5 text-indigo-500" />
                                  <span className="ml-2">{contaData.nome}</span>
                              </span>
                              <span className="text-sm font-semibold text-indigo-600">{formatCurrency(contaData.total)}</span>
                          </div>
                      ))}
                  </div>
              ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma entrada registrada em contas para este dia.</p>
              )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default FluxoCaixaSummary;