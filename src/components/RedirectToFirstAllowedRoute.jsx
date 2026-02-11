import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Componente que redireciona para a primeira rota permitida para o usuário
 * Se o usuário não tiver permissão para o dashboard, redireciona para outra rota permitida
 */
export const RedirectToFirstAllowedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const { getFirstAllowedRoute, isOwner } = usePermissions();
  
  // Se ainda está carregando, aguardar
  if (loading) {
    return <div>Carregando...</div>;
  }
  
  // Se não está autenticado, redirecionar para login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Se for dono, sempre vai para dashboard
  if (isOwner) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Encontrar a primeira rota permitida
  const firstRoute = getFirstAllowedRoute();
  
  // Se não encontrou nenhuma rota permitida, redirecionar para dashboard
  // O ProtectedRoute vai tratar o acesso negado
  return <Navigate to={firstRoute || '/dashboard'} replace />;
};
