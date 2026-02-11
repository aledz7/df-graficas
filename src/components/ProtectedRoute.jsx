import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

// Componente para exibir quando não tem permissão
// Redireciona automaticamente para a primeira rota permitida
const AccessDenied = () => {
  const { getFirstAllowedRoute, isOwner } = usePermissions();
  const { user, loading: authLoading } = useAuth();
  const [redirectTo, setRedirectTo] = useState(null);

  useEffect(() => {
    // Aguardar até que as permissões estejam carregadas
    if (authLoading || !user) {
      return;
    }

    // Se for dono, não deveria chegar aqui, mas por segurança redireciona para dashboard
    if (isOwner) {
      setRedirectTo('/dashboard');
      return;
    }

    // Aguardar um pouco para garantir que as permissões estejam disponíveis
    const timer = setTimeout(() => {
      // Encontrar a primeira rota permitida
      const firstRoute = getFirstAllowedRoute();
      
      // Se encontrou uma rota permitida, redirecionar
      if (firstRoute) {
        setRedirectTo(firstRoute);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [getFirstAllowedRoute, isOwner, user, authLoading]);

  // Se encontrou uma rota para redirecionar, redirecionar
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  // Se ainda está processando, mostrar loading
  if (authLoading || !user) {
    return <div className="flex items-center justify-center min-h-[60vh]">Carregando...</div>;
  }

  // Fallback: mostrar mensagem de erro (não deveria chegar aqui)
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="bg-destructive/10 p-6 rounded-full mb-6">
        <AlertTriangle className="h-16 w-16 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Você não tem permissão para acessar esta página. 
        Entre em contato com o administrador se acredita que isso é um erro.
      </p>
      <Button onClick={() => window.history.back()} variant="outline">
        Voltar
      </Button>
    </div>
  );
};

export default function ProtectedRoute({ children, requiredPermissions }) {
  const { isAuthenticated, loading } = useAuth();
  const { canAccessRoute, hasAnyPermission, isOwner } = usePermissions();
  const location = useLocation();

  // Verificar também o localStorage como fallback
  const hasTokenInStorage = !!localStorage.getItem('auth_token');

  if (loading) {
    return <div>Carregando...</div>;
  }

  // Se não está autenticado no contexto mas tem token no storage, aguardar um pouco
  if (!isAuthenticated && hasTokenInStorage) {
    return <div>Verificando autenticação...</div>;
  }

  if (!isAuthenticated && !hasTokenInStorage) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar permissões de rota
  // Donos têm acesso total
  if (!isOwner) {
    // Se foram passadas permissões específicas, verificar
    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!hasAnyPermission(requiredPermissions)) {
        return <AccessDenied />;
      }
    } else {
      // Verificar pela rota atual
      if (!canAccessRoute(location.pathname)) {
        return <AccessDenied />;
      }
    }
  }

  return children;
}
