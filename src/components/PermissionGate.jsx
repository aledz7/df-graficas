import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * Componente para controle de permissões em elementos da UI
 * 
 * @param {Object} props
 * @param {string|string[]} props.permission - Permissão ou lista de permissões necessárias
 * @param {boolean} props.requireAll - Se true, exige TODAS as permissões. Se false (padrão), exige PELO MENOS UMA
 * @param {React.ReactNode} props.children - Conteúdo a ser exibido se tiver permissão
 * @param {React.ReactNode} props.fallback - Conteúdo alternativo se não tiver permissão (opcional)
 * @param {boolean} props.disabled - Se true, renderiza children mas desabilitado (para botões)
 * 
 * Exemplos de uso:
 * 
 * // Oculta completamente se não tem permissão
 * <PermissionGate permission="clientes_cadastrar">
 *   <Button>Novo Cliente</Button>
 * </PermissionGate>
 * 
 * // Exige múltiplas permissões (qualquer uma)
 * <PermissionGate permission={['clientes_editar', 'clientes_cadastrar']}>
 *   <Button>Salvar</Button>
 * </PermissionGate>
 * 
 * // Exige TODAS as permissões
 * <PermissionGate permission={['gerenciar_clientes', 'clientes_excluir']} requireAll>
 *   <Button>Excluir Cliente</Button>
 * </PermissionGate>
 * 
 * // Mostra fallback se não tem permissão
 * <PermissionGate permission="acessar_financeiro" fallback={<p>Sem acesso</p>}>
 *   <FinanceiroComponent />
 * </PermissionGate>
 */
const PermissionGate = ({ 
  permission, 
  requireAll = false, 
  children, 
  fallback = null,
  disabled = false 
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isOwner } = usePermissions();

  // Donos têm acesso total
  if (isOwner) {
    return children;
  }

  // Normalizar permissões para array
  const permissionList = Array.isArray(permission) ? permission : [permission];
  
  // Verificar permissões
  const hasAccess = requireAll 
    ? hasAllPermissions(permissionList)
    : hasAnyPermission(permissionList);

  if (hasAccess) {
    return children;
  }

  // Se disabled=true, renderiza children mas clona e adiciona prop disabled
  if (disabled && React.isValidElement(children)) {
    return React.cloneElement(children, { 
      disabled: true,
      title: 'Você não tem permissão para esta ação'
    });
  }

  return fallback;
};

/**
 * Hook para verificar permissões de forma imperativa
 * Útil para lógica condicional fora de JSX
 * 
 * Exemplo:
 * const { canCreate, canEdit, canDelete } = useActionPermissions('gerenciar_clientes', {
 *   create: 'clientes_cadastrar',
 *   edit: 'clientes_editar',
 *   delete: 'clientes_excluir'
 * });
 * 
 * if (canCreate) { ... }
 */
export const useActionPermissions = (mainPermission, actions = {}) => {
  const { hasPermission, isOwner, canPerformAction } = usePermissions();
  
  const result = {
    canAccess: isOwner || hasPermission(mainPermission),
  };
  
  // Adicionar verificação para cada ação
  Object.entries(actions).forEach(([actionName, actionPermission]) => {
    const capitalizedName = actionName.charAt(0).toUpperCase() + actionName.slice(1);
    result[`can${capitalizedName}`] = canPerformAction(mainPermission, actionPermission);
  });
  
  return result;
};

export default PermissionGate;
