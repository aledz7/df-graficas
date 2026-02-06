import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Componente para exibir quando não tem permissão
const AccessDenied = () => {
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
