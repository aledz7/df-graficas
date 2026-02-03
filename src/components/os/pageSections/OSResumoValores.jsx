import React from 'react';

const OSResumoValores = ({ totaisOS }) => {
  const totaisCalculados = totaisOS();
  
  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between"><span>Subtotal Serviços:</span><span>R$ {totaisCalculados.subtotalServicosM2.toFixed(2)}</span></div>
      <div className="flex justify-between"><span>Subtotal Produtos:</span><span>R$ {totaisCalculados.subtotalProdutosUnidade.toFixed(2)}</span></div>
      <div className="flex justify-between"><span>Total Acabamentos:</span><span>R$ {totaisCalculados.totalAcabamentos.toFixed(2)}</span></div>
      <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>TOTAL GERAL:</span><span>R$ {totaisCalculados.totalGeral.toFixed(2)}</span></div>
    </div>
  );
};

export default OSResumoValores;