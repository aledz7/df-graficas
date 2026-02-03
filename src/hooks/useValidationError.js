import { useToast } from '@/components/ui/use-toast';
import { isValidationError, extractValidationErrors, createErrorComponent } from '@/lib/errorUtils.jsx';

/**
 * Hook personalizado para tratamento de erros de validação
 * @returns {Object} - Funções para tratar erros
 */
export const useValidationError = () => {
  const { toast } = useToast();

  /**
   * Exibe um toast com erros de validação formatados
   * @param {Error} error - Objeto de erro
   * @param {string} defaultMessage - Mensagem padrão para outros tipos de erro
   * @param {number} validationDuration - Duração do toast para erros de validação (ms)
   * @param {number} errorDuration - Duração do toast para outros erros (ms)
   */
  const showError = (error, defaultMessage = 'Ocorreu um erro.', validationDuration = 10000, errorDuration = 5000) => {
    console.error('Erro capturado:', error);
    
    // Verificar se é um erro de validação
    if (isValidationError(error)) {
      const validationErrors = extractValidationErrors(error);
      
      toast({
        title: 'Erro de validação',
        description: createErrorComponent(validationErrors),
        variant: 'destructive',
        duration: validationDuration
      });
    } else {
      // Para outros erros, exibir a mensagem genérica
      toast({
        title: 'Erro',
        description: error.message || defaultMessage,
        variant: 'destructive',
        duration: errorDuration
      });
    }
  };

  /**
   * Exibe apenas erros de validação (ignora outros tipos de erro)
   * @param {Error} error - Objeto de erro
   * @param {number} duration - Duração do toast (ms)
   */
  const showValidationError = (error, duration = 10000) => {
    if (isValidationError(error)) {
      const validationErrors = extractValidationErrors(error);
      
      toast({
        title: 'Erro de validação',
        description: createErrorComponent(validationErrors),
        variant: 'destructive',
        duration: duration
      });
    }
  };

  /**
   * Exibe apenas outros tipos de erro (ignora erros de validação)
   * @param {Error} error - Objeto de erro
   * @param {string} defaultMessage - Mensagem padrão
   * @param {number} duration - Duração do toast (ms)
   */
  const showGenericError = (error, defaultMessage = 'Ocorreu um erro.', duration = 5000) => {
    if (!isValidationError(error)) {
      toast({
        title: 'Erro',
        description: error.message || defaultMessage,
        variant: 'destructive',
        duration: duration
      });
    }
  };

  return {
    showError,
    showValidationError,
    showGenericError,
    isValidationError,
    extractValidationErrors,
    createErrorComponent
  };
};
