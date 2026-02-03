import React from 'react';

const AcabamentoDica = () => {
  return (
    <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
      <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Dica:</h3>
      <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
        Os acabamentos cadastrados aqui e marcados como "Ativos" estarão disponíveis para seleção no módulo de Ordens de Serviço.
        Os valores de venda serão usados para calcular automaticamente os custos adicionais. Se um produto for vinculado, seu estoque será controlado e o custo ajudará na análise de lucratividade.
      </p>
    </div>
  );
};

export default AcabamentoDica;