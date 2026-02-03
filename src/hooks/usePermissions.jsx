import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export const usePermissions = () => {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user) return {};
    
    // Se for administrador, tem todas as permissões
    if (user.is_admin) {
      return {
        acessar_dashboard: true,
        acessar_pdv: true,
        acessar_os: true,
        acessar_envelopamento: true,
        acessar_calculadora: true,
        acessar_marketplace: true,
        acessar_feed: true,
        acessar_agenda: true,
        gerenciar_produtos: true,
        acessar_entrada_estoque: true,
        gerenciar_clientes: true,
        gerenciar_fornecedores: true,
        acessar_financeiro: true,
        ver_relatorios: true,
        config_sistema: true,
        config_aparencia: true,
        config_empresa: true,
        config_precos_env: true,
        config_acabamentos_os: true,
        gerar_etiquetas: true,
        gerenciar_lixeira: true,
        gerenciar_funcionarios: true,
        gerenciar_caixa: true,
        ver_auditoria: true,
      };
    }

    // Usar permissões do usuário que vêm do backend
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
    isAdmin: user?.is_admin || false,
  };
}; 