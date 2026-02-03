import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { User, Shield, Bell, Palette, Key, Settings, LogOut } from 'lucide-react';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import TwoFactorAuthModal from '@/components/TwoFactorAuthModal';
import userNotificationPreferencesService from '@/services/userNotificationPreferencesService';
import { aparenciaService } from '@/services/api';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  
  // Estados para as preferências de notificação
  const [notificationPreferences, setNotificationPreferences] = useState({
    email_notifications: true,
    system_alerts: true
  });
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  
  // Estados para o tema
  const [currentTheme, setCurrentTheme] = useState('light');
  const [loadingTheme, setLoadingTheme] = useState(false);

  // Carregar preferências de notificação e tema ao montar o componente
  useEffect(() => {
    loadNotificationPreferences();
    loadCurrentTheme();
  }, []);

  const loadNotificationPreferences = async () => {
    try {
      setLoadingPreferences(true);
      const response = await userNotificationPreferencesService.getPreferences();
      setNotificationPreferences(response.data);
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as preferências de notificação.",
        variant: "destructive",
      });
    } finally {
      setLoadingPreferences(false);
    }
  };

  const handleNotificationPreferenceChange = async (key, value) => {
    try {
      setLoadingPreferences(true);
      await userNotificationPreferencesService.updatePreference(key, value);
      setNotificationPreferences(prev => ({
        ...prev,
        [key]: value
      }));
      toast({
        title: "Sucesso",
        description: "Preferência de notificação atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar preferência:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a preferência de notificação.",
        variant: "destructive",
      });
    } finally {
      setLoadingPreferences(false);
    }
  };

  const loadCurrentTheme = async () => {
    try {
      setLoadingTheme(true);
      const response = await aparenciaService.getTheme();
      const theme = response.data?.theme || 'light';
      setCurrentTheme(theme);
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
      // Usar tema padrão em caso de erro
      setCurrentTheme('light');
    } finally {
      setLoadingTheme(false);
    }
  };

  const handleThemeChange = async (isDark) => {
    try {
      setLoadingTheme(true);
      const newTheme = isDark ? 'dark' : 'light';
      
      // Atualizar no backend
      await aparenciaService.updateTheme(newTheme);
      
      // Atualizar estado local
      setCurrentTheme(newTheme);
      
      // Aplicar tema no documento
      document.documentElement.className = newTheme;
      
      // Disparar evento para outros componentes
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
      
      toast({
        title: "Sucesso",
        description: `Tema alterado para ${isDark ? 'escuro' : 'claro'}.`,
      });
    } catch (error) {
      console.error('Erro ao atualizar tema:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o tema.",
        variant: "destructive",
      });
    } finally {
      setLoadingTheme(false);
    }
  };

  const handleLogout = () => {
    toast({
      title: "Saindo do sistema",
      description: "Você será redirecionado para a tela de login.",
    });
    logout();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações do Usuário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Informações do Usuário</span>
            </CardTitle>
            <CardDescription>
              Suas informações pessoais e de conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={user?.name || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="admin" checked={user?.is_admin || false} disabled />
              <Label htmlFor="admin">Administrador do Sistema</Label>
            </div>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Segurança</span>
            </CardTitle>
            <CardDescription>
              Configurações de segurança da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowChangePasswordModal(true)}
            >
              <Key className="mr-2 h-4 w-4" />
              Alterar Senha
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowTwoFactorModal(true)}
            >
              <Shield className="mr-2 h-4 w-4" />
              Autenticação de Dois Fatores
            </Button>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notificações</span>
            </CardTitle>
            <CardDescription>
              Configure suas preferências de notificação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações por Email</Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificações importantes por email
                </p>
              </div>
              <Switch 
                checked={notificationPreferences.email_notifications}
                onCheckedChange={(checked) => 
                  handleNotificationPreferenceChange('email_notifications', checked)
                }
                disabled={loadingPreferences}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas do Sistema</Label>
                <p className="text-sm text-muted-foreground">
                  Receber alertas sobre estoque baixo e compromissos
                </p>
              </div>
              <Switch 
                checked={notificationPreferences.system_alerts}
                onCheckedChange={(checked) => 
                  handleNotificationPreferenceChange('system_alerts', checked)
                }
                disabled={loadingPreferences}
              />
            </div>
          </CardContent>
        </Card>

        {/* Aparência */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <span>Aparência</span>
            </CardTitle>
            <CardDescription>
              Personalize a aparência do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo Escuro</Label>
                <p className="text-sm text-muted-foreground">
                  Alternar entre tema claro e escuro
                </p>
              </div>
              <Switch 
                checked={currentTheme === 'dark'}
                onCheckedChange={handleThemeChange}
                disabled={loadingTheme}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Sessão */}
      <Card>
        <CardHeader>
          <CardTitle>Sessão</CardTitle>
          <CardDescription>
            Gerencie sua sessão atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sessão Ativa</p>
              <p className="text-sm text-muted-foreground">
                Você está logado como {user?.name || 'Usuário'}
              </p>
            </div>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair do Sistema
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Alteração de Senha */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {/* Modal de Autenticação de Dois Fatores */}
      <TwoFactorAuthModal
        isOpen={showTwoFactorModal}
        onClose={() => setShowTwoFactorModal(false)}
      />
    </div>
  );
};

export default SettingsPage; 