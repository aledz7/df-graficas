import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
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

  return children;
}
