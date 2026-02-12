import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useNomeSistema } from '@/hooks/useNomeSistema.jsx';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck, Banknote,
  Settings, BarChart3, FileText, SprayCan, Calculator,
  Palette, Boxes, BookOpen, Wrench, HardHat, FileClock, CheckCircle2, History, SlidersHorizontal, Trash2, Barcode, Store, Activity, CalendarDays, FileSpreadsheet, Box, LogIn, LogOut, PackagePlus, ListChecks, Printer, DollarSign, ShieldAlert, Ruler, Star, TrendingUp, CreditCard, Ticket, Gift, Receipt
} from 'lucide-react';
import IndiqueGanheModal from '@/components/IndiqueGanheModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, routePermissions } from '@/hooks/usePermissions';
import { useOSCountContext } from '@/contexts/OSCountContext';
import { getImageUrlEmpresa } from '@/pages/EmpresaSettingsPage';
import { empresaService } from '@/services/api';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/ferramentas/agenda', label: 'Agenda', icon: CalendarDays },
  { 
    label: 'PDV', icon: ShoppingCart,
    subItems: [
        { path: '/operacional/pdv', label: 'Novo Pedido', icon: ShoppingCart },
        { path: '/operacional/pdv-historico', label: 'Vendas e Orçamentos', icon: History },
    ]
  },
  {
    label: 'Marketplace', icon: Store,
    subItems: [
        { path: '/marketplace/vendas', label: 'Vendas Online', icon: Store },
        { path: '/marketplace/historico', label: 'Histórico de Vendas', icon: History },
    ]
  },
  {
    label: 'Calculadora', icon: Calculator,
    subItems: [
      { path: '/ferramentas/calculadora-metricas', label: 'Nova Simulação', icon: Calculator },
      { path: '/ferramentas/calculadora-servicos', label: 'Serviços Adicionais', icon: Wrench },
      { path: '/ferramentas/calculadora-historico', label: 'Orçamentos Salvos', icon: History },
    ]
  },
  {
    label: 'Cadastros', icon: Package,
    subItems: [
      { path: '/cadastros/produtos', label: 'Produtos', icon: PackagePlus },
      { path: '/cadastros/categorias', label: 'Categorias', icon: Boxes },
      // { path: '/cadastros/cores', label: 'Cores', icon: Palette },
      // { path: '/cadastros/tamanhos', label: 'Tamanhos', icon: Ruler },
      { path: '/cadastros/clientes', label: 'Clientes', icon: Users },
      { path: '/cadastros/funcionarios', label: 'Funcionários', icon: Users },
      { path: '/cadastros/fornecedores', label: 'Fornecedores', icon: Truck },
      { path: '/cadastros/maquinas-equipamentos', label: 'Máquinas', icon: Settings },
      { path: '/cadastros/maquinas-cartao', label: 'Máquinas de Cartão', icon: Settings },
      { path: '/cadastros/contas-bancarias', label: 'Contas Bancárias', icon: Banknote },
      { path: '/cadastros/formas-pagamento', label: 'Formas de Pagamento', icon: CreditCard },
      { path: '/cadastros/cupons', label: 'Cupons de Desconto', icon: Ticket },
      { path: '/operacional/entrada-estoque', label: 'Entrada de Estoque', icon: SlidersHorizontal },
    ]
  },
  {
    label: 'O.S / Pedidos', icon: FileText,
    subItems: [
      { path: '/operacional/ordens-servico', label: 'Nova OS / Pedido', icon: FileText },
      { path: '/cadastros/acabamentos-servicos', label: 'Acabamentos e Serviços', icon: Palette },
      { path: '/operacional/os-historico', label: 'Histórico de OS', icon: History },
      { path: '/operacional/os-em-producao', label: 'Em Produção', icon: HardHat },
      { path: '/operacional/os-entregar', label: 'A Serem Entregues', icon: FileClock },
      { path: '/operacional/os-entregues', label: 'Pedidos Entregues', icon: CheckCircle2 },
    ]
  },
  {
    label: 'Envelopamento', icon: SprayCan,
    subItems: [
      { path: '/operacional/envelopamento', label: 'Novo Orçamento', icon: SprayCan },
      { path: '/operacional/orcamentos-envelopamento', label: 'Histórico', icon: History },
      { path: '/operacional/envelopamento/configuracao-precos', label: 'Serviços adicionais', icon: Wrench },
    ]
  },
  {
    label: 'Financeiro', icon: Banknote,
    subItems: [
      { path: '/financeiro/contas-receber', label: 'Contas a Receber', icon: Banknote },
      { path: '/financeiro/contas-pagar', label: 'Contas a Pagar', icon: Banknote },
      { path: '/financeiro/sangria-suprimento', label: 'Sangria/Suprimento', icon: Banknote },
      { path: '/financeiro/recebimento', label: 'Recebimento', icon: TrendingUp },
    ]
  },
  {
    label: 'Caixa', icon: Box,
    subItems: [
      { path: '/caixa/fluxo-caixa', label: 'Fluxo de Caixa', icon: BarChart3 },
      { path: '/caixa/abertura-caixa', label: 'Abrir Caixa', icon: LogIn },
      { path: '/caixa/fechamento-caixa', label: 'Fechar Caixa', icon: LogOut },
      { path: '/caixa/historico-caixa', label: 'Histórico', icon: History },
    ]
  },
  {
    label: 'Relatórios', icon: BarChart3,
    subItems: [
      { path: '/relatorios', label: 'Central de Relatórios', icon: BarChart3 },
      { path: '/relatorio-simplificado', label: 'Relatório Simplificado', icon: FileSpreadsheet },
    ]
  },
  { path: '/catalogo-publico', label: 'Catálogo Público', icon: BookOpen },
  { path: '/ferramentas/feed-atividades', label: 'Feed de Atividades', icon: Activity },
  {
    label: 'Configurações', icon: Settings,
    subItems: [
      { path: '/configuracoes/empresa', label: 'Dados da Empresa', icon: Settings },
      { path: '/configuracoes/aparencia', label: 'Aparência e Tema', icon: Palette },
      { path: '/configuracoes/produtos-estoque', label: 'Produtos e Estoque', icon: Package },
      { path: '/configuracoes/nota-fiscal', label: 'Nota Fiscal', icon: Receipt },
      { path: '/configuracoes/pontos', label: 'Programa de Pontos', icon: Star },
      { path: '/operacional/gerador-etiquetas', label: 'Gerador de Etiquetas', icon: Barcode },
      { path: '/ferramentas/lixeira', label: 'Lixeira', icon: Trash2 },
      { path: '/configuracoes/admin', label: 'Admin do Sistema', icon: ShieldAlert },
    ]
  },
];

const NavItem = ({ item, closeSidebar, notificationCount, productionCount }) => {
    const location = useLocation();
    const isActive = item.subItems 
      ? item.subItems.some(sub => location.pathname === sub.path || (sub.path !== '/' && location.pathname.startsWith(sub.path) && sub.path.length > 1 && sub.path !== '/dashboard'))
      : location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path) && item.path.length > 1 && item.path !== '/dashboard');



  if (item.subItems) {
    return (
      <AccordionItem value={item.label} className="border-b-0">
        <AccordionTrigger 
          className={cn(
            "flex items-center p-3 rounded-lg text-sm font-medium w-full justify-between hover:bg-muted",
            isActive && "bg-muted text-primary"
          )}
        >
          <div className="flex items-center">
            <item.icon className="h-5 w-5 mr-3" />
            {item.label}
            {/* Mostrar contador total no item principal "Ordem de Serviço" */}
            {item.label === 'Ordem de Serviço' && (productionCount > 0 || notificationCount > 0) && (
              <span className="ml-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {(productionCount + notificationCount) > 99 ? '99+' : (productionCount + notificationCount)}
              </span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pl-6">
          {item.subItems.map(subItem => {
            // Verificar se é o item "A Serem Entregues" para passar a notificação
            const isEntregaItem = subItem.path === '/operacional/os-entregar';
            // Verificar se é o item "Em Produção" para passar o contador de produção
            const isProducaoItem = subItem.path === '/operacional/os-em-producao';
            return (
              <NavItem 
                key={subItem.path || subItem.label} 
                item={subItem} 
                closeSidebar={closeSidebar}
                notificationCount={isEntregaItem ? notificationCount : undefined}
                productionCount={isProducaoItem ? productionCount : undefined}
              />
            );
          })}
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <NavLink
      to={item.path}
      onClick={closeSidebar}
      className={({ isActive: navIsActive }) =>
        cn(
          'flex items-center p-3 rounded-lg text-sm font-medium hover:bg-muted',
          navIsActive ? 'bg-primary text-primary-foreground dark:bg-orange-600 dark:text-white' : 'text-foreground'
        )
      }
    >
      <item.icon className="h-5 w-5 mr-3" />
      {item.label}
      {/* Só mostrar contador se for maior que 0 */}
      {notificationCount > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
          {notificationCount > 99 ? '99+' : notificationCount}
        </span>
      )}
      {/* Só mostrar contador se for maior que 0 */}
      {productionCount > 0 && (
        <span className="ml-auto bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
          {productionCount > 99 ? '99+' : productionCount}
        </span>
      )}
    </NavLink>
  );
};


const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const { nomeSistema } = useNomeSistema();
  const [logoUrl, setLogoUrl] = useState('');
  const [loadingLogo, setLoadingLogo] = useState(true);
  const [indiqueGanheOpen, setIndiqueGanheOpen] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);
  const { logout, user } = useAuth();
  const { hasAnyPermission, isOwner } = usePermissions();
  const { count: osCount, productionCount } = useOSCountContext();

  // Buscar logo da empresa baseada no tenant_id do usuário
  useEffect(() => {
    const fetchEmpresaLogo = async () => {
      if (!user?.tenant_id) {
        setLoadingLogo(false);
        return;
      }

      try {
        setLoadingLogo(true);
        const response = await empresaService.getByTenant(user.tenant_id);
        const empresaData = response.data?.data;
        
        if (empresaData?.logo_url) {
          setLogoUrl(empresaData.logo_url);
        }
      } catch (error) {
        console.error('Erro ao carregar logo da empresa:', error);
        // Em caso de erro, manter logoUrl vazio
      } finally {
        setLoadingLogo(false);
      }
    };

    fetchEmpresaLogo();
  }, [user?.tenant_id]);

  // Criar menuItems dinâmico com tenant_id do usuário
  const dynamicMenuItems = menuItems.map(item => {
    if (item.path === '/catalogo-publico' && user?.tenant_id) {
      return {
        ...item,
        path: `/catalogo-publico/${user.tenant_id}`
      };
    }
    return item;
  });

  const filteredMenuItems = dynamicMenuItems.filter(item => {
    // Donos têm acesso a tudo
    if (isOwner) return true;
    
    if (item.subItems) {
      // Para itens com subitens, verifica se pelo menos um subitem tem permissão
      const visibleSubItems = item.subItems.filter(subItem => {
        const requiredPermissions = routePermissions[subItem.path];
        // Sem restrição de permissão ou tem alguma das permissões necessárias
        const hasAccess = !requiredPermissions || hasAnyPermission(requiredPermissions);
        return hasAccess;
      });
      
      // Se há subitens visíveis, retorna o item com apenas os subitens permitidos
      if (visibleSubItems.length > 0) {
        item.subItems = visibleSubItems;
        return true;
      }
      return false;
    }
    
    // Para itens simples, verifica a permissão
    const requiredPermissions = routePermissions[item.path];
    return !requiredPermissions || hasAnyPermission(requiredPermissions);
  });

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeSidebar}
      />
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-card border-r flex flex-col transition-transform transform',
          'lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-center p-4 border-b h-16">
          {logoUrl ? (
            <img src={getImageUrlEmpresa(logoUrl)} alt="Logo" className="h-8 w-auto object-contain max-w-full" />
          ) : (
            <h1 className="text-lg font-bold text-primary truncate text-center">{nomeSistema}</h1>
          )}
        </div>
        <ScrollArea className="flex-1">
          <nav className="p-4 space-y-2 flex flex-col h-full">
            <Accordion type="multiple" className="w-full flex-1">
              {filteredMenuItems.map(item => (
                <NavItem 
                  key={item.path || item.label} 
                  item={item} 
                  closeSidebar={closeSidebar}
                  notificationCount={item.label === 'Ordem de Serviço' ? osCount : undefined}
                  productionCount={item.label === 'Ordem de Serviço' ? productionCount : undefined}
                />
              ))}
            </Accordion>
            <div className="pt-4 border-t space-y-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIndiqueGanheOpen(true);
                  closeSidebar();
                }} 
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white hover:!text-white border-0"
              >
                <Gift className="h-4 w-4 mr-2" />
                Indique e Ganhe
              </Button>
              <Button 
                variant="destructive" 
                onClick={logout} 
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair do Sistema
              </Button>
            </div>
          </nav>
        </ScrollArea>
      </aside>
      
      {/* Modal Indique e Ganhe */}
      <IndiqueGanheModal 
        open={indiqueGanheOpen} 
        onOpenChange={setIndiqueGanheOpen} 
      />
    </>
  );
};

export default Sidebar;