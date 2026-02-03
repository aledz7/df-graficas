import React from 'react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

const RelatorioFluxoCaixa = React.forwardRef(({ lancamentos, data, totais, totaisPorFormaPagamento, empresa = {}, logoUrl }, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans w-[780px]">
      <header className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-16 mb-2 object-contain"/>}
          <h1 className="text-2xl font-bold">{empresa.nomeFantasia || 'Relatório de Fluxo de Caixa'}</h1>
          <p className="text-sm text-gray-600">{empresa.razaoSocial || ''}</p>
          <p className="text-xs text-gray-500">{empresa.enderecoCompleto || ''}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">Relatório do Dia: {data ? format(data, 'dd/MM/yyyy') : 'Data não informada'}</p>
          <p className="text-xs text-gray-500">Gerado em: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Resumo Financeiro do Dia</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-green-100 rounded-lg">
            <p className="text-sm font-medium text-green-800">Total de Entradas</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totais?.totalEntradas)}</p>
          </div>
          <div className="p-4 bg-red-100 rounded-lg">
            <p className="text-sm font-medium text-red-800">Total de Saídas</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totais?.totalSaidas)}</p>
          </div>
          <div className={`p-4 rounded-lg ${totais?.saldoDoDia >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
            <p className={`text-sm font-medium ${totais?.saldoDoDia >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>Saldo do Dia</p>
            <p className={`text-2xl font-bold ${totais?.saldoDoDia >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(totais?.saldoDoDia)}</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Entradas por Forma de Pagamento</h2>
        {Object.keys(totaisPorFormaPagamento || {}).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {Object.entries(totaisPorFormaPagamento).map(([forma, total]) => (
              <div key={forma} className="flex justify-between p-2 bg-gray-100 rounded">
                <span className="font-medium">{forma}:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nenhuma entrada registrada neste dia.</p>
        )}
      </section>

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
            {(lancamentos || []).map(l => (
              <tr key={l.id} className="border-b">
                <td className="py-2 px-2">{format(parseISO(l.data), 'HH:mm')}</td>
                <td className="py-2 px-2">{l.descricao}</td>
                <td className="py-2 px-2">{l.categoriaNome}</td>
                <td className="py-2 px-2">{l.formaPagamento || '-'}</td>
                <td className="py-2 px-2 text-right text-green-600 font-medium">
                  {l.tipo === 'entrada' ? formatCurrency(l.valor) : '-'}
                </td>
                <td className="py-2 px-2 text-right text-red-600 font-medium">
                  {l.tipo === 'saida' ? formatCurrency(l.valor) : '-'}
                </td>
              </tr>
            ))}
             {(lancamentos || []).length === 0 && (
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