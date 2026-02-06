import React from 'react';
import { format, parseISO } from 'date-fns';

const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toFixed(2).replace('.', ',')}`;

const RelatorioFluxoCaixa = React.forwardRef(({ lancamentos = [], data, totais = {}, totaisPorFormaPagamento = {}, totaisPorConta = {}, empresa = {}, logoUrl }, ref) => {
  // Garantir que lancamentos seja sempre um array
  const lancamentosArray = Array.isArray(lancamentos) ? lancamentos : [];
  
  // Garantir que os objetos sejam válidos
  const totaisSeguros = {
    totalEntradas: totais?.totalEntradas || 0,
    totalSaidas: totais?.totalSaidas || 0,
    saldoDoDia: totais?.saldoDoDia || 0
  };

  const formasPagamento = totaisPorFormaPagamento && typeof totaisPorFormaPagamento === 'object' ? totaisPorFormaPagamento : {};
  const contas = totaisPorConta && typeof totaisPorConta === 'object' ? totaisPorConta : {};

  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans">
      <header className="flex justify-between items-start mb-8 border-b pb-4">
        <div className="flex items-center">
          {logoUrl && <img-replace src={logoUrl} alt="Logo da Empresa" className="h-16 w-auto mr-4"/>}
          <div>
            <h1 className="text-2xl font-bold">{empresa?.nomeFantasia || 'Relatório de Fluxo de Caixa'}</h1>
            <p className="text-sm text-gray-600">{empresa?.razaoSocial}</p>
            <p className="text-xs text-gray-500">{empresa?.enderecoCompleto}</p>
            <p className="text-xs text-gray-500">CNPJ: {empresa?.cnpj} | Contato: {empresa?.telefone || empresa?.email}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">Relatório do Dia: {format(data, 'dd/MM/yyyy')}</p>
          <p className="text-xs text-gray-500">Gerado em: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Resumo Financeiro do Dia</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-green-100 rounded-lg">
            <p className="text-sm font-medium text-green-800">Total de Entradas</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totaisSeguros.totalEntradas)}</p>
          </div>
          <div className="p-4 bg-red-100 rounded-lg">
            <p className="text-sm font-medium text-red-800">Total de Saídas</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totaisSeguros.totalSaidas)}</p>
          </div>
          <div className={`p-4 rounded-lg ${totaisSeguros.saldoDoDia >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
            <p className={`text-sm font-medium ${totaisSeguros.saldoDoDia >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>Saldo do Dia</p>
            <p className={`text-2xl font-bold ${totaisSeguros.saldoDoDia >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(totaisSeguros.saldoDoDia)}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <section>
          <h2 className="text-lg font-semibold mb-3 border-b pb-2">Entradas por Forma de Pagamento</h2>
          {Object.keys(formasPagamento).length > 0 ? (
            <div className="grid grid-cols-1 gap-2 text-sm">
              {Object.entries(formasPagamento).map(([forma, total]) => (
                <div key={forma} className="flex justify-between p-2 bg-gray-100 rounded">
                  <span className="font-medium capitalize">{forma.replace(/_/g, ' ')}:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhuma entrada registrada neste dia.</p>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 border-b pb-2">Entradas por Saldo em Conta</h2>
          {Object.keys(contas).length > 0 ? (
            <div className="grid grid-cols-1 gap-2 text-sm">
              {Object.entries(contas).map(([contaId, contaData]) => (
                <div key={contaId} className="flex justify-between p-2 bg-indigo-50 rounded">
                  <span className="font-medium">{contaData.nome}:</span>
                  <span className="text-indigo-700 font-semibold">{formatCurrency(contaData.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhuma entrada em contas neste dia.</p>
          )}
        </section>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Lançamentos Detalhados</h2>
        <table className="w-full text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-2 text-left">Hora</th>
              <th className="py-2 px-2 text-left">Descrição</th>
              <th className="py-2 px-2 text-left">Categoria</th>
              <th className="py-2 px-2 text-left">Forma Pag.</th>
              <th className="py-2 px-2 text-right">Entrada</th>
              <th className="py-2 px-2 text-right">Saída</th>
            </tr>
          </thead>
          <tbody>
            {lancamentosArray.map(l => (
              <tr key={l.id} className="border-b">
                <td className="py-2 px-2">
                  {l.data_operacao && !isNaN(Date.parse(l.data_operacao))
                    ? format(parseISO(l.data_operacao), 'HH:mm')
                    : '-'}
                </td>
                <td className="py-2 px-2">{l.descricao}</td>
                <td className="py-2 px-2">{l.categoria_nome || l.categoriaNome || '-'}</td>
                <td className="py-2 px-2">{l.forma_pagamento || l.formaPagamento || '-'}</td>
                <td className="py-2 px-2 text-right text-green-600 font-medium">
                  {l.tipo === 'entrada' ? formatCurrency(l.valor) : '-'}
                </td>
                <td className="py-2 px-2 text-right text-red-600 font-medium">
                  {l.tipo === 'saida' ? formatCurrency(l.valor) : '-'}
                </td>
              </tr>
            ))}
             {lancamentosArray.length === 0 && (
                <tr>
                    <td colSpan="6" className="text-center py-4 text-gray-500">Nenhum lançamento para este dia.</td>
                </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
});

export default RelatorioFluxoCaixa;