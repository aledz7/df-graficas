import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, aparenciaService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';
import { buildApiUrl } from '@/lib/apiUrlUtils';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Hook para gerenciar timeout de sessão (4 horas de inatividade)
  const { extendSession } = useSessionTimeout(240);

  // Load initial token from cache local
  useEffect(() => {
    const loadInitialToken = async () => {
      try {
        // Primeira tentativa: verificar localStorage diretamente
        const directToken = localStorage.getItem('auth_token');
        const directRememberMe = localStorage.getItem('remember_me');
        
        // Se há token no localStorage, definir imediatamente (independente do remember_me)
        if (directToken) {
          setToken(directToken);
          
          // Forçar o apiDataManager a carregar o token com a preferência correta
          const rememberMe = directRememberMe === 'true';
          apiDataManager.setToken(directToken, rememberMe);
          return;
        }
        
        // Aguardar e verificar se o apiDataManager está inicializado
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verificar se o apiDataManager está inicializado
          if (apiDataManager && typeof apiDataManager.getToken === 'function') {
            break;
          }
          
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          setLoading(false);
          return;
        }
        
        const storedToken = apiDataManager.getToken();
        
        if (storedToken) {
          setToken(storedToken);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading token:', error);
        setLoading(false);
      }
    };
    loadInitialToken();
  }, []);

  // Listener para token expirado
  useEffect(() => {
    const handleTokenExpired = (event) => {
      setToken(null);
      setUser(null);
      
      // Resetar tema para o padrão
      document.documentElement.className = 'light';
      
      // Redirecionar para login
      navigate('/login', { 
        replace: true,
        state: { message: event.detail?.message || 'Sua sessão expirou. Faça login novamente.' }
      });
    };

    window.addEventListener('tokenExpired', handleTokenExpired);
    
    return () => {
      window.removeEventListener('tokenExpired', handleTokenExpired);
    };
  }, [navigate]);
  
  // Listener para timeout de sessão por inatividade
  useEffect(() => {
    const handleSessionTimeout = (event) => {
      setToken(null);
      setUser(null);
      
      // Resetar tema para o padrão
      document.documentElement.className = 'light';
      
      // Redirecionar para login com mensagem específica de inatividade
      navigate('/login', { 
        replace: true,
        state: { 
          message: event.detail?.message || 'Sua sessão expirou por inatividade.',
          type: 'timeout'
        }
      });
    };

    window.addEventListener('sessionTimeout', handleSessionTimeout);
    
    return () => {
      window.removeEventListener('sessionTimeout', handleSessionTimeout);
    };
  }, [navigate]);

  // Set up user data on initial load
  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUser = useCallback(async () => {
    try {
      const userData = await authService.checkAuth();
      setUser(userData);
      
      // Carregar tema do usuário após verificar autenticação
      await loadUserTheme();
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      // O interceptor em api.js já lida com erros 401 e remove o token
      setToken(null);
      setUser(null);
      // Não redirecionamos para login aqui para evitar loops infinitos
      // O redirecionamento será feito pelo ProtectedRoute se necessário
    } finally {
      setLoading(false);
    }
  }, [setUser, setToken, setLoading]);

  const loadUserTheme = async () => {
    try {
      // 1) Tentar obter do backend o tema associado ao usuário
      try {
        const response = await aparenciaService.getTheme();
        const backendTheme = response?.data?.theme || response?.theme;
        if (backendTheme) {
          document.documentElement.className = backendTheme;
          window.dispatchEvent(new CustomEvent('userThemeLoaded', { detail: backendTheme }));
          // Persistir como fallback local
          await apiDataManager.setData('theme', backendTheme);
          return;
        }
      } catch (e) {
        console.warn('Não foi possível obter o tema do backend, usando fallback local:', e);
      }

      // 2) Fallback: usar tema salvo localmente
      const savedTheme = await apiDataManager.getData('theme', 'light');
      document.documentElement.className = savedTheme;
      window.dispatchEvent(new CustomEvent('userThemeLoaded', { detail: savedTheme }));
    } catch (error) {
      console.error('Erro ao carregar tema do usuário:', error);
      document.documentElement.className = 'light';
      window.dispatchEvent(new CustomEvent('userThemeLoaded', { detail: 'light' }));
    }
  };

  const login = useCallback(async (email, password, rememberMe = false) => {
    try {
      const response = await authService.login({ email, password });
      
      // Verificar se requer 2FA
      if (response.requires_two_factor) {
        return { 
          success: true, 
          requiresTwoFactor: true, 
          user: response.user,
          message: response.message 
        };
      }
      
      // Login normal (sem 2FA)
      setToken(response.access_token);
      setUser(response.user);
      
      // Salvar token com a preferência de lembrar
      apiDataManager.setToken(response.access_token, rememberMe);
      
      // Estender/reiniciar a sessão após login bem-sucedido
      extendSession();
      
      // Carregar tema do usuário após login bem-sucedido
      await loadUserTheme();
      
      // Encontrar a primeira rota permitida para o usuário
      // Importar dinamicamente para evitar dependência circular
      const { routePermissions } = await import('@/hooks/usePermissions');
      
      // Verificar permissões do usuário
      const userPermissions = response.user?.permissions || {};
      const isOwner = response.user?.is_owner === true || response.user?.role === 'owner';
      
      let redirectRoute = '/dashboard'; // Rota padrão
      
      if (!isOwner) {
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
        
        // Função auxiliar para verificar se tem permissão
        const hasAnyPermission = (permissionList) => {
          if (!permissionList || permissionList.length === 0) return true;
          return permissionList.some(permission => !!userPermissions[permission]);
        };
        
        // Função auxiliar para verificar acesso à rota
        const canAccessRoute = (path) => {
          const routeKey = Object.keys(routePermissions).find(route => 
            path === route || path.startsWith(route + '/')
          );
          
          if (!routeKey) return true; // Rota sem restrição
          
          const requiredPermissions = routePermissions[routeKey];
          return hasAnyPermission(requiredPermissions);
        };
        
        // Verificar rotas na ordem de prioridade
        for (const route of routePriority) {
          if (canAccessRoute(route)) {
            redirectRoute = route;
            break;
          }
        }
        
        // Se não encontrou nenhuma rota prioritária, procurar qualquer rota permitida
        if (redirectRoute === '/dashboard' && !canAccessRoute('/dashboard')) {
          for (const route of Object.keys(routePermissions)) {
            if (canAccessRoute(route)) {
              redirectRoute = route;
              break;
            }
          }
        }
      }
      
      // Redirect to first allowed route
      navigate(redirectRoute, { replace: true });
      
      return { success: true };
    } catch (error) {
      console.error('Erro no login:', error.response?.data || error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Falha no login. Verifique suas credenciais.' 
      };
    }
  }, [navigate, extendSession]);

  const completeTwoFactorLogin = useCallback(async (email, code) => {
    try {
      const response = await authService.completeTwoFactorLogin(email, code);
      
      if (response.success) {
        setToken(response.access_token);
        setUser(response.user);
        
        // Salvar token
        apiDataManager.setToken(response.access_token, false);
        localStorage.setItem('auth_token', response.access_token);
        
        // Estender/reiniciar a sessão após login bem-sucedido
        extendSession();
        
        // Carregar tema do usuário após login bem-sucedido
        await loadUserTheme();
        
        // Aguardar um pouco para garantir que o estado seja atualizado
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar se o token foi salvo corretamente antes de redirecionar
        const finalToken = apiDataManager.getToken();
        
        if (!finalToken) {
          return { success: false, message: 'Erro ao salvar token de autenticação' };
        }
        
        // Encontrar a primeira rota permitida para o usuário
        const { routePermissions } = await import('@/hooks/usePermissions');
        
        // Verificar permissões do usuário
        const userPermissions = response.user?.permissions || {};
        const isOwner = response.user?.is_owner === true || response.user?.role === 'owner';
        
        let redirectRoute = '/dashboard'; // Rota padrão
        
        if (!isOwner) {
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
          
          // Função auxiliar para verificar se tem permissão
          const hasAnyPermission = (permissionList) => {
            if (!permissionList || permissionList.length === 0) return true;
            return permissionList.some(permission => !!userPermissions[permission]);
          };
          
          // Função auxiliar para verificar acesso à rota
          const canAccessRoute = (path) => {
            const routeKey = Object.keys(routePermissions).find(route => 
              path === route || path.startsWith(route + '/')
            );
            
            if (!routeKey) return true; // Rota sem restrição
            
            const requiredPermissions = routePermissions[routeKey];
            return hasAnyPermission(requiredPermissions);
          };
          
          // Verificar rotas na ordem de prioridade
          for (const route of routePriority) {
            if (canAccessRoute(route)) {
              redirectRoute = route;
              break;
            }
          }
          
          // Se não encontrou nenhuma rota prioritária, procurar qualquer rota permitida
          if (redirectRoute === '/dashboard' && !canAccessRoute('/dashboard')) {
            for (const route of Object.keys(routePermissions)) {
              if (canAccessRoute(route)) {
                redirectRoute = route;
                break;
              }
            }
          }
        }
        
        // Redirect to first allowed route
        navigate(redirectRoute, { replace: true });
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.message || 'Falha na verificação do código.' 
        };
      }
    } catch (error) {
      console.error('Erro na verificação 2FA:', error.response?.data || error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Falha na verificação do código.' 
      };
    }
  }, [navigate, extendSession]);

  const register = async (name, email, password, password_confirmation) => {
    try {
      const response = await fetch(buildApiUrl('/api/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          password_confirmation // Este é o campo que o Laravel espera
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw {
          response: {
            data: data,
            status: response.status
          }
        };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response?.data) {
        return { 
          success: false, 
          error: error.response.data.message || 'Falha no registro. Tente novamente.' 
        };
      }
      return { 
        success: false, 
        error: error.message || 'Falha no registro. Tente novamente.' 
      };
    }
  };

  const logout = useCallback(() => {
    authService.logout()
      .catch(error => {
        console.error('Logout error:', error);
      })
      .finally(() => {
        // authService.logout já remove o token do localStorage
        setToken(null);
        setUser(null);
        
        // Resetar tema para o padrão ao fazer logout
        document.documentElement.className = 'light';
        window.dispatchEvent(new CustomEvent('userThemeLoaded', { detail: 'light' }));
        
        navigate('/login');
      });
  }, [navigate]);

  const value = {
    user,
    token,
    loading,
    login,
    completeTwoFactorLogin,
    register,
    logout,
    isAuthenticated: !!token
  };
  


  return (
    <AuthContext.Provider value={value}>
      {loading ? <div>Carregando...</div> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext;