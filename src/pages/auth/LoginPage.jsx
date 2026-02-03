import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, EyeOff, Clock, AlertTriangle } from 'lucide-react';
import TwoFactorLoginModal from '@/components/TwoFactorLoginModal';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorUser, setTwoFactorUser] = useState(null);
  const { login, completeTwoFactorLogin } = useAuth();
  const location = useLocation();

  // Forçar tema claro imediatamente
  if (typeof document !== 'undefined') {
    document.documentElement.className = 'light';
  }

  useEffect(() => {
    // Salvar o tema atual
    const currentTheme = document.documentElement.className;
    
    // Forçar tema claro
    document.documentElement.className = 'light';
    
    // Adicionar script no head para garantir que o tema seja aplicado
    const script = document.createElement('script');
    script.innerHTML = `
      document.documentElement.className = 'light';
    `;
    document.head.appendChild(script);
    
    // Restaurar o tema original quando sair da página
    return () => {
      document.documentElement.className = currentTheme;
      // Remover o script
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const reason = urlParams.get('reason');
    
    if (reason === 'session_timeout') {
      setSessionMessage('Sua sessão expirou por inatividade. Faça login novamente.');
    } else if (reason === 'token_expired') {
      setSessionMessage('Sua sessão expirou. Faça login novamente.');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(email, password, rememberMe);
      if (result.success) {
        if (result.requiresTwoFactor) {
          // Mostrar modal de 2FA
          setTwoFactorUser(result.user);
          setShowTwoFactorModal(true);
        }
        // Se não requer 2FA, o login já foi completado no AuthContext
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSuccess = async (response) => {
    try {
      // Chamar o completeTwoFactorLogin do AuthContext
      const result = await completeTwoFactorLogin(response.user.email, response.code);
      
      if (result.success) {
        setShowTwoFactorModal(false);
        setTwoFactorUser(null);
      } else {
        setError(result.message || 'Erro ao completar autenticação de dois fatores');
      }
    } catch (error) {
      setError('Erro inesperado ao completar autenticação de dois fatores');
    }
  };

  const handleTwoFactorClose = () => {
    setShowTwoFactorModal(false);
    setTwoFactorUser(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
            <CardDescription className="text-center">
              Entre com suas credenciais para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {sessionMessage && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  {sessionMessage}
                </div>
              )}
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked)}
                />
                <Label htmlFor="remember" className="text-sm font-normal">
                  Lembrar de mim
                </Label>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>

              <div className="text-center text-sm">
                <a href="/signup" className="text-primary hover:underline">
                  Não tem uma conta? Cadastre-se
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Verificação 2FA */}
      <TwoFactorLoginModal
        isOpen={showTwoFactorModal}
        onClose={handleTwoFactorClose}
        userEmail={twoFactorUser?.email}
        onSuccess={handleTwoFactorSuccess}
      />
    </div>
  );
};

export default LoginPage;
