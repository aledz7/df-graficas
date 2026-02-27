import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ThemeToggle from '@/components/ThemeToggle';
import AgendaAlerts from '@/components/dashboard/AgendaAlerts';
import NotificationIcon from './NotificationIcon';
import { 
  Upload, 
  Menu, 
  User, 
  LogOut, 
  Settings, 
  Bell, 
  Bug, 
  MessageSquare, 
  Package, 
  GraduationCap, 
  CheckCircle,
  Lightbulb,
  ChevronDown
} from 'lucide-react';
import '@/components/chat/ChatIcon.css';
import { useHeaderNotifications } from '@/hooks/useHeaderNotifications';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const WHATSAPP_ERRO_URL = 'https://wa.me/556192109773?text=' + encodeURIComponent('Olá! Encontrei um erro no sistema e gostaria de reportar:\n\n');

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
  onAbrirNotificacoes,
  chatUnreadCount = 0,
  onAbrirChat,
  nomeEmpresa = 'Gráfica Imagine!'
}) => {
  // Garantir que o nome da empresa sempre tenha o ícone de lâmpada
  const nomeEmpresaCompleto = nomeEmpresa.includes('💡') || nomeEmpresa.includes('!') 
    ? nomeEmpresa 
    : `${nomeEmpresa}💡`;
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { counters } = useHeaderNotifications();
  
  // Estados para dropdowns dos ícones
  const [itensProntosOpen, setItensProntosOpen] = useState(false);
  const [treinamentoOpen, setTreinamentoOpen] = useState(false);
  const [itensEntreguesOpen, setItensEntreguesOpen] = useState(false);

  // Funções para abrir dropdowns
  const handleItensProntosClick = () => {
    setItensProntosOpen(!itensProntosOpen);
    // TODO: Navegar para página de itens prontos ou abrir modal
    navigate('/operacional/ordens-servico?filtro=prontos');
  };

  const handleTreinamentoClick = () => {
    setTreinamentoOpen(!treinamentoOpen);
    // Navegar para página de treinamento interno
    navigate('/ferramentas/treinamento-interno');
  };

  const handleItensEntreguesClick = () => {
    setItensEntreguesOpen(!itensEntreguesOpen);
    // TODO: Navegar para página de itens entregues ou abrir modal
    navigate('/operacional/os-entregues');
  };

  return (
    <header
      className="flex items-center justify-between p-4 border-b sticky top-0 z-30 bg-background/80 backdrop-blur-md"
    >
      {/* Lado Esquerdo: Nome da Empresa */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
          <Menu />
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            {nomeEmpresaCompleto.replace('💡', '').trim()}
            <Lightbulb className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          </h1>
        </div>
        <AgendaAlerts clientes={clientes} />
      </div>

      {/* Lado Direito: Ícones de Notificação + Usuário */}
      <div className="flex items-center space-x-2">
        <ThemeToggle theme={theme} setTheme={setTheme} />
        
        {/* 1️⃣ NOTIFICAÇÕES GERAIS */}
        <NotificationIcon
          icon={Bell}
          count={notificacoesNaoLidas}
          onClick={onAbrirNotificacoes}
          title="Notificações Gerais"
          badgeColor="bg-red-500"
        />

        {/* 2️⃣ CHAT */}
        <NotificationIcon
          icon={MessageSquare}
          count={chatUnreadCount}
          onClick={onAbrirChat}
          title="Chat Interno"
          badgeColor="bg-green-500"
          className="chat-icon-button"
        />

        {/* 3️⃣ ITENS PRONTOS */}
        <Popover open={itensProntosOpen} onOpenChange={setItensProntosOpen}>
          <PopoverTrigger asChild>
            <div>
              <NotificationIcon
                icon={Package}
                count={counters.itensProntos}
                onClick={handleItensProntosClick}
                title="Itens Prontos"
                badgeColor="bg-blue-500"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Itens Prontos</h4>
              <p className="text-xs text-muted-foreground">
                {counters.itensProntos > 0 
                  ? `${counters.itensProntos} item(ns) pronto(s) para próxima etapa`
                  : 'Nenhum item pronto no momento'}
              </p>
              {counters.itensProntos > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => {
                    setItensProntosOpen(false);
                    navigate('/operacional/ordens-servico?filtro=prontos');
                  }}
                >
                  Ver Itens Prontos
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* 4️⃣ TREINAMENTO */}
        <Popover open={treinamentoOpen} onOpenChange={setTreinamentoOpen}>
          <PopoverTrigger asChild>
            <div>
              <NotificationIcon
                icon={GraduationCap}
                count={counters.treinamento}
                onClick={handleTreinamentoClick}
                title="Treinamento"
                badgeColor="bg-purple-500"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Treinamento</h4>
              <p className="text-xs text-muted-foreground">
                {counters.treinamento > 0 
                  ? `${counters.treinamento} treinamento(s) disponível(is) ou obrigatório(s)`
                  : 'Nenhum treinamento pendente'}
              </p>
              {counters.treinamento > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => {
                    setTreinamentoOpen(false);
                    navigate('/ferramentas/treinamento-interno');
                  }}
                >
                  Ver Treinamentos
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* 5️⃣ ITENS ENTREGUES */}
        <Popover open={itensEntreguesOpen} onOpenChange={setItensEntreguesOpen}>
          <PopoverTrigger asChild>
            <div>
              <NotificationIcon
                icon={CheckCircle}
                count={counters.itensEntregues}
                onClick={handleItensEntreguesClick}
                title="Itens Entregues"
                badgeColor="bg-green-600"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Itens Entregues</h4>
              <p className="text-xs text-muted-foreground">
                {counters.itensEntregues > 0 
                  ? `${counters.itensEntregues} item(ns) entregue(s) nas últimas 24h`
                  : 'Nenhuma entrega nas últimas 24 horas'}
              </p>
              {counters.itensEntregues > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => {
                    setItensEntreguesOpen(false);
                    navigate('/operacional/os-entregues');
                  }}
                >
                  Ver Histórico
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Botão Informar Erro - abre WhatsApp */}
        <Button
          variant="ghost"
          size="icon"
          asChild
          title="Informar Erro"
        >
          <a href={WHATSAPP_ERRO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center">
            <Bug className="h-5 w-5" />
            <span className="sr-only">Informar Erro</span>
          </a>
        </Button>

        {/* Menu do Usuário com Foto/Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-9 px-2 flex items-center gap-2 hover:bg-accent"
            >
              {user?.avatar_url || user?.foto ? (
                <img 
                  src={user.avatar_url || user.foto} 
                  alt={user?.name || 'Usuário'}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
              <span className="text-sm font-medium hidden sm:inline-block">
                {user?.name || vendedorAtual?.nome || 'Usuário'}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:inline-block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2">
                  {user?.avatar_url || user?.foto ? (
                    <img 
                      src={user.avatar_url || user.foto} 
                      alt={user?.name || 'Usuário'}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <p className="text-sm font-medium leading-none">
                      {user?.name || vendedorAtual?.nome || 'Usuário'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground mt-1">
                      {user?.email || vendedorAtual?.email || 'exemplo@email.com'}
                    </p>
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="text-primary">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={WHATSAPP_ERRO_URL} target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                <Bug className="mr-2 h-4 w-4" />
                <span>Informar Erro</span>
              </a>
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