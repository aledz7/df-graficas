import React from 'react';
import OSPagamentoModal from '@/components/os/OSPagamentoModal';

const EnvelopamentoPagamentoModal = ({ open, onOpenChange, totalOrcamento, onConfirmPagamento, clienteId, vendedorAtual }) => {
  return (
    <OSPagamentoModal
      open={open}
      onOpenChange={onOpenChange}
      totalOS={Number(totalOrcamento) || 0}
      onConfirmPagamento={onConfirmPagamento}
      osId={null}
      clienteId={clienteId}
      vendedorAtual={vendedorAtual || null}
    />
  );
};

export default EnvelopamentoPagamentoModal;