import React from 'react';
import { SelectItem } from '@/components/ui/select';
import { useClienteCrediarioCheck } from './ClienteCrediarioCheck';

/**
 * Componente para renderizar opções de forma de pagamento com filtro de crediário
 */
export const FormaPagamentoOptions = ({ 
  options, 
  clienteId, 
  showCrediarioDisabled = true,
  disabledClassName = "text-gray-400"
}) => {
  const { isClienteAutorizadoCrediario } = useClienteCrediarioCheck(clienteId);

  return options.map(opt => {
    if (opt === 'Crediário' && !isClienteAutorizadoCrediario) {
      if (showCrediarioDisabled) {
        return (
          <SelectItem key={opt} value={opt} disabled className={disabledClassName}>
            Crediário (Cliente não autorizado)
          </SelectItem>
        );
      }
      return null; // Não mostrar a opção se não estiver autorizado
    }
    return <SelectItem key={opt} value={opt}>{opt}</SelectItem>;
  });
};

/**
 * Hook para verificar se uma forma de pagamento é válida para o cliente
 */
export const useFormaPagamentoValidation = (clienteId) => {
  const { isClienteAutorizadoCrediario } = useClienteCrediarioCheck(clienteId);

  const isFormaPagamentoValida = (formaPagamento) => {
    if (formaPagamento === 'Crediário' && !isClienteAutorizadoCrediario) {
      return false;
    }
    return true;
  };

  const getFormaPagamentoOptions = (options) => {
    return options.filter(opt => {
      if (opt === 'Crediário' && !isClienteAutorizadoCrediario) {
        return false;
      }
      return true;
    });
  };

  return {
    isClienteAutorizadoCrediario,
    isFormaPagamentoValida,
    getFormaPagamentoOptions
  };
};

export default {
  FormaPagamentoOptions,
  useFormaPagamentoValidation
}; 