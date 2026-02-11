import { useAuth } from '@/contexts/AuthContext';
import { useMemo, useCallback } from 'react';

// Mapeamento de rotas para permissões
export const routePermissions = {
  '/dashboard': ['acessar_dashboard'],
  '/ferramentas/agenda': ['acessar_agenda'],
  '/operacional/pdv': ['acessar_pdv'],
  '/operacional/pdv-historico': ['acessar_pdv'],
  '/marketplace/vendas': ['acessar_marketplace'],
  '/marketplace/historico': ['acessar_marketplace'],
  '/ferramentas/calculadora-metricas': ['acessar_calculadora'],
  '/ferramentas/calculadora-servicos': ['acessar_calculadora'],
  '/ferramentas/calculadora-historico': ['acessar_calculadora'],
  '/cadastros/produtos': ['gerenciar_produtos'],
  '/cadastros/novo-produto': ['gerenciar_produtos', 'produtos_cadastrar'],
  '/cadastros/categorias': ['gerenciar_produtos'],
  '/cadastros/cores': ['gerenciar_produtos'],
  '/cadastros/tamanhos': ['gerenciar_produtos'],
  '/cadastros/clientes': ['gerenciar_clientes'],
  '/cadastros/novo-cliente': ['gerenciar_clientes', 'clientes_cadastrar'],
  '/cadastros/fornecedores': ['gerenciar_fornecedores'],
  '/cadastros/funcionarios': ['gerenciar_funcionarios'],
  '/cadastros/maquinas-equipamentos': ['config_sistema'],
  '/cadastros/maquinas-cartao': ['config_sistema'],
  '/cadastros/contas-bancarias': ['config_sistema'],
  '/operacional/entrada-estoque': ['acessar_entrada_estoque'],
  '/operacional/ordens-servico': ['acessar_os'],
  '/cadastros/acabamentos-servicos': ['config_acabamentos_os'],
  '/operacional/os-historico': ['acessar_os'],
  '/operacional/os-em-producao': ['acessar_os'],
  '/operacional/os-entregar': ['acessar_os'],
  '/operacional/os-entregues': ['acessar_os'],
  '/operacional/envelopamento': ['acessar_envelopamento'],
  '/operacional/orcamentos-envelopamento': ['acessar_envelopamento'],
  '/operacional/envelopamento/configuracao-precos': ['config_precos_env'],
  '/financeiro/contas-receber': ['acessar_financeiro', 'financeiro_contas_receber'],
  '/financeiro/contas-pagar': ['acessar_financeiro', 'financeiro_contas_pagar'],
  '/financeiro/recebimento': ['acessar_financeiro'],
  '/financeiro/sangria-suprimento': ['acessar_financeiro'],
  '/caixa/fluxo-caixa': ['gerenciar_caixa', 'financeiro_fluxo_caixa'],
  '/caixa/abertura-caixa': ['gerenciar_caixa', 'caixa_abrir'],
  '/caixa/fechamento-caixa': ['gerenciar_caixa', 'caixa_fechar'],
  '/caixa/historico-caixa': ['gerenciar_caixa'],
  '/relatorios': ['ver_relatorios'],
  '/relatorio-simplificado': ['ver_relatorios'],
  '/ferramentas/feed-atividades': ['acessar_feed'],
  '/configuracoes/empresa': ['config_empresa'],
  '/configuracoes/aparencia': ['config_aparencia'],
  '/configuracoes/produtos-estoque': ['gerenciar_produtos'],
  '/configuracoes/pontos': ['config_sistema'],
  '/operacional/gerador-etiquetas': ['gerar_etiquetas'],
  '/ferramentas/lixeira': ['gerenciar_lixeira'],
  '/ferramentas/auditoria': ['ver_auditoria'],
  '/configuracoes/admin': ['config_sistema'],
};

export const usePermissions = () => {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user) return {};
    
    // Usar permissões do usuário que vêm do backend
    // Funcionários têm permissões específicas definidas no cadastro
    return user.permissions || {};
  }, [user]);

  // Verifica se o usuário é o dono da conta (não é funcionário)
  const isOwner = useMemo(() => {
    return user?.is_owner === true || user?.role === 'owner';
  }, [user]);

  const hasPermission = useCallback((permission) => {
    // Donos da conta têm todas as permissões
    if (isOwner) return true;
    return !!permissions[permission];
  }, [permissions, isOwner]);

  const hasAnyPermission = useCallback((permissionList) => {
    if (isOwner) return true;
    if (!permissionList || permissionList.length === 0) return true;
    return permissionList.some(permission => !!permissions[permission]);
  }, [permissions, isOwner]);

  const hasAllPermissions = useCallback((permissionList) => {
    if (isOwner) return true;
    if (!permissionList || permissionList.length === 0) return true;
    return permissionList.every(permission => !!permissions[permission]);
  }, [permissions, isOwner]);

  // Verifica se tem permissão para acessar uma rota específica
  const canAccessRoute = useCallback((path) => {
    if (isOwner) return true;
    
    // Encontrar a rota correspondente (pode ser parcial)
    const routeKey = Object.keys(routePermissions).find(route => 
      path === route || path.startsWith(route + '/')
    );
    
    if (!routeKey) return true; // Rota sem restrição
    
    const requiredPermissions = routePermissions[routeKey];
    // Precisa ter PELO MENOS UMA das permissões listadas
    return hasAnyPermission(requiredPermissions);
  }, [isOwner, hasAnyPermission]);

  // Verifica permissão de ação específica (criar, editar, excluir, etc.)
  const canPerformAction = useCallback((mainPermission, actionPermission) => {
    if (isOwner) return true;
    
    // Precisa ter a permissão principal E a permissão da ação
    if (!hasPermission(mainPermission)) return false;
    if (!actionPermission) return true;
    return hasPermission(actionPermission);
  }, [isOwner, hasPermission]);

  // Encontra a primeira rota permitida para o usuário
  const getFirstAllowedRoute = useCallback(() => {
    // Donos sempre vão para o dashboard
    if (isOwner) return '/dashboard';
    
    // Ordem de prioridade das rotas (mais importantes primeiro)
    const routePriority = [
      '/dashboard',
      '/ferramentas/agenda',
      '/operacional/pdv',
      '/operacional/ordens-servico',
      '/operacional/envelopamento',
      '/cadastros/clientes',
      '/cadastros/produtos',
      '/financeiro/contas-receber',
      '/caixa/fluxo-caixa',
      '/relatorios',
      '/ferramentas/feed-atividades',
    ];
    
    // Verificar rotas na ordem de prioridade
    for (const route of routePriority) {
      if (canAccessRoute(route)) {
        return route;
      }
    }
    
    // Se não encontrou nenhuma rota prioritária, procurar qualquer rota permitida
    for (const route of Object.keys(routePermissions)) {
      if (canAccessRoute(route)) {
        return route;
      }
    }
    
    // Se não encontrou nenhuma rota permitida, retornar null
    // O componente que chama deve tratar isso
    return null;
  }, [isOwner, canAccessRoute]);

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRoute,
    canPerformAction,
    getFirstAllowedRoute,
    isOwner,
    // isAdmin sempre false - funcionários não podem ser admin do sistema
    // A administração de tenants é feita por um sistema separado
    isAdmin: false,
  };
}; 