import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { clienteService } from '@/services/api';

/**
 * Hook personalizado para verificar autorização de crediário do cliente
 */
export const useClienteCrediarioCheck = (clienteId) => {
  const [clienteInfo, setClienteInfo] = useState(null);
  const [isClienteAutorizadoCrediario, setIsClienteAutorizadoCrediario] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Função auxiliar para verificar se cliente está autorizado para crediário
    const verificarAutorizacaoCrediario = (cliente) => {
      if (!cliente || cliente.autorizado_prazo === undefined || cliente.autorizado_prazo === null) {
        return false;
      }
      
      // Tratar diferentes tipos de valores possíveis
      const valor = cliente.autorizado_prazo;
      
      // Casos: true, 1
      if (valor === true || valor === 1) {
        return true;
      }
      
      // Casos de string
      if (typeof valor === 'string') {
        const valorLower = valor.toLowerCase().trim();
        return valorLower === 'true' || valorLower === '1' || valorLower === 'sim';
      }
      
      return false;
    };
    
    if (clienteId && clienteId !== 'null' && clienteId !== null) {
      let cancelled = false; // Flag para evitar race conditions
      
      setIsLoading(true);
      setError(null);
      
      const carregarClienteInfo = async () => {
        try {
          const response = await clienteService.getById(clienteId);
          
          if (cancelled) return;
          
          console.log('🔍 ClienteCrediarioCheck - Resposta completa da API:', response);
          
          // Tentar diferentes estruturas de resposta
          let cliente = null;
          if (response) {
            if (response.data) {
              // Caso 1: response.data é o objeto cliente diretamente
              if (response.data.id || response.data.nome || response.data.nome_completo) {
                cliente = response.data;
              }
              // Caso 2: response.data.data contém o cliente
              else if (response.data.data && (response.data.data.id || response.data.data.nome || response.data.data.nome_completo)) {
                cliente = response.data.data;
              }
            }
            // Caso 3: response.success e response.data
            if (!cliente && response.success && response.data) {
              if (response.data.id || response.data.nome || response.data.nome_completo) {
                cliente = response.data;
              } else if (response.data.data && (response.data.data.id || response.data.data.nome || response.data.data.nome_completo)) {
                cliente = response.data.data;
              }
            }
          }
          
          if (cancelled) return;
          
          if (cliente) {
            console.log('📋 ClienteCrediarioCheck - Dados do cliente extraídos:', cliente);
            console.log('🔐 ClienteCrediarioCheck - autorizado_prazo:', cliente.autorizado_prazo);
            console.log('🔐 ClienteCrediarioCheck - tipo autorizado_prazo:', typeof cliente.autorizado_prazo);
            
            setClienteInfo(cliente);
            
            // Verificar autorização com função auxiliar robusta
            const isAutorizado = verificarAutorizacaoCrediario(cliente);
            console.log('✅ ClienteCrediarioCheck - Cliente autorizado para crediário:', isAutorizado);
            
            if (!cancelled) {
              setIsClienteAutorizadoCrediario(isAutorizado);
            }
          } else {
            console.warn('⚠️ ClienteCrediarioCheck - Não foi possível extrair dados do cliente da resposta:', response);
            if (!cancelled) {
              setIsClienteAutorizadoCrediario(false);
            }
          }
        } catch (error) {
          console.error('Erro ao carregar informações do cliente:', error);
          if (!cancelled) {
            setError('Erro ao carregar informações do cliente');
            setIsClienteAutorizadoCrediario(false);
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };
      
      carregarClienteInfo();
      
      // Cleanup function para evitar race conditions
      return () => {
        cancelled = true;
      };
    } else {
      setClienteInfo(null);
      setIsClienteAutorizadoCrediario(false);
      setIsLoading(false);
      setError(null);
    }
  }, [clienteId]);

  return {
    clienteInfo,
    isClienteAutorizadoCrediario,
    isLoading,
    error
  };
};

/**
 * Componente para exibir informações sobre autorização de crediário
 */
export const ClienteCrediarioInfo = ({ clienteId, showDetails = true }) => {
  const { clienteInfo, isClienteAutorizadoCrediario, isLoading, error } = useClienteCrediarioCheck(clienteId);

  if (isLoading) {
    return (
      <div className="mt-2 p-3 border border-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md text-sm text-blue-700 dark:text-blue-300 flex items-center">
        <Info size={20} className="mr-2 flex-shrink-0" />
        <span>Carregando informações do cliente...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 p-3 border border-red-400 bg-red-50 dark:bg-red-900/30 rounded-md text-sm text-red-700 dark:text-red-300 flex items-center">
        <AlertTriangle size={20} className="mr-2 flex-shrink-0" />
        <span>Erro ao carregar informações do cliente</span>
      </div>
    );
  }

  if (!clienteInfo) {
    return null;
  }

  return (
    <div className="mt-2 p-3 border border-purple-400 bg-purple-50 dark:bg-purple-900/30 rounded-md text-sm text-purple-700 dark:text-purple-300 flex items-center">
      <Info size={20} className="mr-2 flex-shrink-0" />
      <span>
        {showDetails ? (
          <>
            Cliente {clienteInfo.nome} - 
            {isClienteAutorizadoCrediario ? ' Autorizado a comprar a prazo' : ' Não autorizado a comprar a prazo'}
            {clienteInfo.classificacao_cliente === 'Terceirizado' && clienteInfo.desconto_fixo_os_terceirizado && (
              <span className="block mt-1">
                Cliente terceirizado com desconto fixo de {clienteInfo.desconto_fixo_os_terceirizado}%
              </span>
            )}
          </>
        ) : (
          <>
            {isClienteAutorizadoCrediario ? 'Cliente autorizado a comprar a prazo' : 'Cliente não autorizado a comprar a prazo'}
          </>
        )}
      </span>
    </div>
  );
};

/**
 * Componente para exibir aviso quando crediário não é autorizado
 */
export const CrediarioNaoAutorizadoAviso = ({ clienteId, metodoPagamento }) => {
  const { isClienteAutorizadoCrediario } = useClienteCrediarioCheck(clienteId);

  if (metodoPagamento === 'Crediário' && !isClienteAutorizadoCrediario) {
    return (
      <div className="mt-2 p-3 border border-red-400 bg-red-50 dark:bg-red-900/30 rounded-md text-sm text-red-700 dark:text-red-300 flex items-center">
        <AlertTriangle size={20} className="mr-2 flex-shrink-0"/>
        <span>⚠️ Este cliente não está autorizado a comprar a prazo/crediário. Verifique as configurações do cliente.</span>
      </div>
    );
  }

  return null;
};

export default {
  useClienteCrediarioCheck,
  ClienteCrediarioInfo,
  CrediarioNaoAutorizadoAviso
}; 