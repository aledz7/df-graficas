import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';
import { Loader2, Shield } from 'lucide-react';

/**
 * Componente que protege rotas administrativas.
 * Verifica se o usuário está autenticado E se é um administrador (is_admin = true).
 */
const AdminProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const token = apiDataManager.getToken();
        
        if (!token) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Verificar se o usuário é admin
        const userData = await authService.checkAuth();
        
        if (userData && userData.is_admin) {
          setIsAuthenticated(true);
          setIsAdmin(true);
        } else {
          setIsAuthenticated(true);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação admin:', error);
        setIsAuthenticated(false);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAuth();
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <Shield className="h-12 w-12 text-primary mb-4" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-slate-400">Verificando permissões...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Não autenticado - redirecionar para login admin
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // Autenticado mas não é admin - mostrar mensagem de acesso negado
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 px-4">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Negado</h1>
          <p className="text-slate-400 mb-6">
            Você não tem permissão para acessar esta área.<br />
            Esta seção é restrita a administradores do sistema.
          </p>
          <div className="space-x-4">
            <a 
              href="/dashboard" 
              className="inline-flex items-center px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
            >
              Voltar ao Sistema
            </a>
            <a 
              href="/admin/login" 
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition"
            >
              Login Admin
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Autenticado e é admin - renderizar conteúdo
  return children;
};

export default AdminProtectedRoute;
