import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, DollarSign, Banknote, Smartphone,
  CreditCard as CreditCardIcon, Calendar as CalendarIconLucide,
  Wallet, Building2, RefreshCw, Edit2, Check, X, ArrowUpCircle,
  ArrowDownCircle, Target, Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const formatCurrency = (value) =>
  `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formaPagamentoIconMap = {
  Dinheiro: <Banknote className="h-5 w-5 text-green-500" />,
  dinheiro: <Banknote className="h-5 w-5 text-green-500" />,
  Pix: <Smartphone className="h-5 w-5 text-sky-500" />,
  pix: <Smartphone className="h-5 w-5 text-sky-500" />,
  'Cartão Débito': <CreditCardIcon className="h-5 w-5 text-blue-500" />,
  cartao_debito: <CreditCardIcon className="h-5 w-5 text-blue-500" />,
  'Cartão Crédito': <CreditCardIcon className="h-5 w-5 text-orange-500" />,
  cartao_credito: <CreditCardIcon className="h-5 w-5 text-orange-500" />,
  Crediário: <CalendarIconLucide className="h-5 w-5 text-purple-500" />,
  'Transferência Bancária': <DollarSign className="h-5 w-5 text-yellow-500" />,
  transferencia: <DollarSign className="h-5 w-5 text-yellow-500" />,
  boleto: <Wallet className="h-5 w-5 text-gray-600" />,
  Outro: <DollarSign className="h-5 w-5 text-gray-500" />,
  outro: <DollarSign className="h-5 w-5 text-gray-500" />,
};

const FluxoCaixaSummary = ({
  totaisDoDia = {},
  totaisPorFormaPagamento = {},
  totaisPorConta = {},
  saldoAtual = 0,
  saldoInicial = 0,
  onSaldoInicialChange,
  totalAReceber = 0,
  totalAPagar = 0,
  isLoadingProjecao = false,
  onRefreshProjecao,
}) => {
  const [editandoSaldo, setEditandoSaldo] = useState(false);
  const [inputSaldo, setInputSaldo] = useState('');

  const totais = {
    totalEntradas: totaisDoDia?.totalEntradas || 0,
    totalSaidas: totaisDoDia?.totalSaidas || 0,
    saldoDoDia: totaisDoDia?.saldoDoDia || 0,
  };

  const formasPagamento =
    totaisPorFormaPagamento && typeof totaisPorFormaPagamento === 'object'
      ? totaisPorFormaPagamento
      : {};
  const contas =
    totaisPorConta && typeof totaisPorConta === 'object' ? totaisPorConta : {};

  const projecaoSaldo = saldoAtual + totalAReceber - totalAPagar;

  const handleIniciarEdicaoSaldo = () => {
    setInputSaldo(saldoInicial === 0 ? '' : String(saldoInicial));
    setEditandoSaldo(true);
  };

  const handleConfirmarSaldo = () => {
    const valor = parseFloat(inputSaldo.replace(',', '.')) || 0;
    onSaldoInicialChange?.(valor);
    setEditandoSaldo(false);
  };

  const handleCancelarEdicao = () => {
    setEditandoSaldo(false);
    setInputSaldo('');
  };

  return (
    <>
      {/* ─── Cards do Dia ─────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entradas (Dia)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totais.totalEntradas)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saídas (Dia)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totais.totalSaidas)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo do Dia</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totais.saldoDoDia >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(totais.saldoDoDia)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Saldo Atual + Projeção ────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Saldo Atual */}
        <Card className="border-2 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Saldo Atual em Conta (Automático)</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Calculado por: saldo inicial + entradas - saídas
              </CardDescription>
            </div>
            <Wallet className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            {editandoSaldo ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground shrink-0">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={inputSaldo}
                  onChange={(e) => setInputSaldo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmarSaldo();
                    if (e.key === 'Escape') handleCancelarEdicao();
                  }}
                  placeholder="0,00"
                  className="h-9 text-lg font-bold"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-9 w-9 text-green-600 hover:text-green-700" onClick={handleConfirmarSaldo}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500 hover:text-red-600" onClick={handleCancelarEdicao}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className={`text-2xl font-bold ${saldoAtual >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                  {formatCurrency(saldoAtual)}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs gap-1"
                  onClick={handleIniciarEdicaoSaldo}
                >
                  <Edit2 className="h-3 w-3" />
                  Editar
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Clique em <strong>Editar</strong> para informar o saldo inicial da conta.
              O saldo atual é calculado automaticamente e o saldo inicial é salvo localmente no navegador.
            </p>
            <div className="flex items-center justify-between text-xs pt-1 border-t">
              <span className="text-muted-foreground">Saldo inicial informado</span>
              <span className="font-medium">{formatCurrency(saldoInicial)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Projeção de Saldo */}
        <Card className="border-2 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Projeção de Saldo
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      <strong>Fórmula:</strong> Saldo Atual + Total a Receber − Total a Pagar<br />
                      Considera <em>todos</em> os lançamentos pendentes/vencidos,
                      independente do período selecionado.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Baseado em todos os pendentes (sem filtro de período)
              </CardDescription>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onRefreshProjecao}
              disabled={isLoadingProjecao}
              title="Atualizar projeção"
            >
              <RefreshCw className={`h-4 w-4 text-emerald-500 ${isLoadingProjecao ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingProjecao ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Calculando...
              </div>
            ) : (
              <>
                {/* Valor da projeção */}
                <div className={`text-2xl font-bold ${projecaoSaldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(projecaoSaldo)}
                </div>

                {/* Detalhamento */}
                <div className="space-y-1.5 pt-1 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Wallet className="h-3.5 w-3.5 text-indigo-400" />
                      Saldo atual
                    </span>
                    <span className="font-medium text-indigo-600">
                      {formatCurrency(saldoAtual)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ArrowUpCircle className="h-3.5 w-3.5 text-green-500" />
                      + Total a Receber
                    </span>
                    <span className="font-medium text-green-600">
                      +{formatCurrency(totalAReceber)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ArrowDownCircle className="h-3.5 w-3.5 text-red-500" />
                      − Total a Pagar
                    </span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(totalAPagar)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t pt-1.5 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-emerald-500" />
                      Projeção
                    </span>
                    <span className={projecaoSaldo >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {formatCurrency(projecaoSaldo)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Por Forma de Pagamento + Por Conta ────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Entradas por Forma de Pagamento (Dia)</CardTitle>
            <CardDescription>
              Detalha o total recebido por cada forma de pagamento no dia selecionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(formasPagamento).length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(formasPagamento).map(([forma, total]) => (
                  <div
                    key={forma}
                    className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                  >
                    <span className="flex items-center text-sm font-medium">
                      {formaPagamentoIconMap[forma] || (
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="ml-2 capitalize">{forma.replace(/_/g, ' ')}</span>
                    </span>
                    <span className="text-sm font-semibold">{formatCurrency(total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma entrada registrada com forma de pagamento para este dia.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo de Entradas por Saldo em Conta (Dia)</CardTitle>
            <CardDescription>
              Detalha o total recebido por cada conta bancária no dia selecionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(contas).length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(contas).map(([contaId, contaData]) => (
                  <div
                    key={contaId}
                    className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                  >
                    <span className="flex items-center text-sm font-medium">
                      <Building2 className="h-5 w-5 text-indigo-500" />
                      <span className="ml-2">{contaData.nome}</span>
                    </span>
                    <span className="text-sm font-semibold text-indigo-600">
                      {formatCurrency(contaData.total)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma entrada registrada em contas para este dia.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default FluxoCaixaSummary;
