import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Banknote, Smartphone, CreditCard as CreditCardIcon, Calendar as CalendarIconLucide } from 'lucide-react';

const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toFixed(2).replace('.', ',')}`;

const formaPagamentoIconMap = {
  Dinheiro: <Banknote className="h-5 w-5 text-green-500" />,
  Pix: <Smartphone className="h-5 w-5 text-sky-500" />,
  'Cartão Débito': <CreditCardIcon className="h-5 w-5 text-blue-500" />,
  'Cartão Crédito': <CreditCardIcon className="h-5 w-5 text-orange-500" />,
  'Crediário': <CalendarIconLucide className="h-5 w-5 text-purple-500" />,
  'Transferência Bancária': <DollarSign className="h-5 w-5 text-yellow-500" />,
  'Outro': <DollarSign className="h-5 w-5 text-gray-500" />,
};

const FluxoCaixaSummary = ({ totaisDoDia = {}, totaisPorFormaPagamento = {} }) => {
  // Garantir que os objetos sejam válidos
  const totais = {
    totalEntradas: totaisDoDia?.totalEntradas || 0,
    totalSaidas: totaisDoDia?.totalSaidas || 0,
    saldoDoDia: totaisDoDia?.saldoDoDia || 0
  };

  const formasPagamento = totaisPorFormaPagamento && typeof totaisPorFormaPagamento === 'object' ? totaisPorFormaPagamento : {};

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

      <Card>
        <CardHeader>
            <CardTitle>Resumo de Entradas por Forma de Pagamento (Dia)</CardTitle>
            <CardDescription>Detalha o total recebido por cada forma de pagamento no dia selecionado.</CardDescription>
        </CardHeader>
        <CardContent>
            {Object.keys(formasPagamento).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(formasPagamento).map(([forma, total]) => (
                        <div key={forma} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                            <span className="flex items-center text-sm font-medium">
                                {formaPagamentoIconMap[forma] || <DollarSign className="h-5 w-5 text-gray-400" />}
                                <span className="ml-2">{forma}</span>
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
    </>
  );
};

export default FluxoCaixaSummary;