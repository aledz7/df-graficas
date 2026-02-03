import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ThemeToggle from '@/components/ThemeToggle';
import AgendaAlerts from '@/components/dashboard/AgendaAlerts';
import NotificationSystem from '@/components/NotificationSystem';
import { Upload, Menu, User, LogOut, Settings, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const VendedorSelector = ({ vendedorAtual, setVendedorAtual, vendedores }) => {
  if (!vendedores || !Array.isArray(vendedores) || vendedores.length === 0) return null;

  const handleSelectVendedor = (vendedorId) => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    if (vendedor) {
      setVendedorAtual(vendedor);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <User className="h-5 w-5 text-muted-foreground" />
      <Select onValueChange={handleSelectVendedor} value={vendedorAtual?.id || ''}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Selecionar Vendedor" />
        </SelectTrigger>
        <SelectContent>
          {vendedores.map(v => (
            <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const AppHeader = ({
  setIsSidebarOpen,
  clientes,
  vendedorAtual,
  setVendedorAtual,
  vendedores,
  logoUrl,
  handleLogoUpload,
  theme,
  setTheme,
  notificacoesNaoLidas = 0,
  onAbrirNotificacoes
}) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      className="flex items-center justify-between p-4 border-b sticky top-0 z-30 bg-background/80 backdrop-blur-md"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
          <Menu />
        </Button>
        <AgendaAlerts clientes={clientes} />
      </div>
      <div className="flex items-center space-x-3">
        <ThemeToggle theme={theme} setTheme={setTheme} />
        
        {/* Botão de Notificações */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onAbrirNotificacoes}
          className="relative"
          title="Notificações"
        >
          <Bell className="h-5 w-5" />
          {notificacoesNaoLidas > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notificacoesNaoLidas > 99 ? '99+' : notificacoesNaoLidas}
            </span>
          )}
        </Button>
        
        {/* Botão de Logout - Sempre Visível */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={logout}
          className="flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
          title="Sair do sistema"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Sair</span>
        </Button>
        
        {/* Menu do Usuário - Opcional */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <User className="h-4 w-4" />
              <span className="sr-only">Menu do usuário</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name || vendedorAtual?.nome || 'Usuário'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || vendedorAtual?.email || 'exemplo@email.com'}
                </p>
                {user?.is_admin && (
                  <p className="text-xs leading-none text-primary font-medium">
                    Administrador
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="text-primary">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair do Sistema</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AppHeader;