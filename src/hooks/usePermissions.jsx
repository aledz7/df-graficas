import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export const usePermissions = () => {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user) return {};
    
    // Usar permissões do usuário que vêm do backend
    // Funcionários têm permissões específicas definidas no cadastro
    return user.permissions || {};
  }, [user]);

  const hasPermission = (permission) => {
    return !!permissions[permission];
  };

  const hasAnyPermission = (permissionList) => {
    return permissionList.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissionList) => {
    return permissionList.every(permission => hasPermission(permission));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    // isAdmin sempre false - funcionários não podem ser admin do sistema
    // A administração de tenants é feita por um sistema separado
    isAdmin: false,
  };
}; 