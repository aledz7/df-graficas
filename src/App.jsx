import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from "@/components/ui/use-toast";
import Sidebar from '@/components/Sidebar.jsx';
import AppHeader from '@/components/layout/AppHeader.jsx';
import CatalogoPublicoPage from '@/pages/CatalogoPublicoPage';
import CheckoutPage from '@/pages/CheckoutPage';
import { Loader2 } from 'lucide-react';
import { safeJsonParse } from '@/lib/utils';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NomeSistemaProvider } from '@/hooks/useNomeSistema.jsx';
import { OSCountProvider } from '@/contexts/OSCountContext';
import LoginPage from '@/pages/auth/LoginPage';
import SignUpPage from '@/pages/auth/SignUpPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RedirectToFirstAllowedRoute } from '@/components/RedirectToFirstAllowedRoute';
import TestApiPage from '@/pages/TestApiPage';
import ApiDebugPage from '@/pages/debug/ApiDebugPage';
import { clienteService, produtoService, dadosUsuarioService, aparenciaService } from '@/services/api';
import { carregarConfiguracoes, carregarConfiguracoesEmpresa } from '@/services/configService';
import { apiDataManager } from '@/lib/apiDataManager';
import { notificacaoService } from '@/services/notificacaoService';
import { useNotifications } from '@/hooks/useNotifications';
import NotificacoesPanel from '@/components/NotificacoesPanel';
import NotificationToast from '@/components/NotificationToast';
import { empresaService } from '@/services/api';

// Lazy load components
const AppRoutes = lazy(() => import('@/components/layout/AppRoutes'));
const PDVReciboPage = lazy(() => import('@/pages/PDVReciboPage').catch(() => {
  console.error('Erro ao carregar PDVReciboPage');
  return { default: () => <div>Erro ao carregar página</div> };
}));
const PDVHistoricoPage = lazy(() => import('@/pages/PDVHistoricoPage'));
const NovoProdutoPage = lazy(() => import('@/pages/NovoProdutoPage'));
const NovoClientePage = lazy(() => import('@/pages/NovoClientePage'));
const RelatorioSimplificadoPage = lazy(() => import('@/pages/RelatorioSimplificadoPage'));
const EditarOrcamentoEnvelopamentoPage = lazy(() => import('@/pages/EditarOrcamentoEnvelopamentoPage.jsx'));
const FluxoCaixaPage = lazy(() => import('@/pages/FluxoCaixaPage.jsx'));
const AberturaCaixaPage = lazy(() => import('@/pages/AberturaCaixaPage.jsx'));
const FechamentoCaixaPage = lazy(() => import('@/pages/FechamentoCaixaPage.jsx'));
const HistoricoCaixaPage = lazy(() => import('@/pages/HistoricoCaixaPage.jsx'));
const TestDataManagerPage = lazy(() => import('@/pages/TestDataManagerPage.jsx'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage.jsx'));
const ExemploPermissoesPage = lazy(() => import('./pages/ExemploPermissoesPage'));
const TesteMenuPage = lazy(() => import('./pages/TesteMenuPage'));

// Admin Pages (Sistema separado de administração de tenants)
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminTenantsPage = lazy(() => import('@/pages/AdminTenantsPage'));
import AdminProtectedRoute from '@/components/admin/AdminProtectedRoute';




const LoadingFallback = () => (
  <div className="flex flex-1 justify-center items-center h-full">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </div>
);

// Componente interno que tem acesso ao contexto de autenticação
function AppContent() {
  const { toast } = useToast();
  const [theme, setThemeState] = useState('light');
  const [logoUrl, setLogoUrl] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('Sua Empresa'); 
  const [nomeSistema, setNomeSistema] = useState('Sistema Gráficas');
  const [clientes, setClientes] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [vendedores, setVendedores] = useState([]);
  const [vendedorAtual, setVendedorAtual] = useState(null);
  const [produtosComEstoqueBaixo, setProdutosComEstoqueBaixo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [temaCarregado, setTemaCarregado] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  
  // Hook de notificações em tempo real
  const {
    notificacoes,
    notificacoesNaoLidas,
    loading: notificacoesLoading,
    toastNotification,
    carregarNotificacoes,
    verificarNovasNotificacoes,
    marcarComoLida,
    marcarTodasComoLidas,
    deletarNotificacao,
    fecharToast,
    executarVerificacoes
  } = useNotifications();
  const { isAuthenticated, loading: authLoading, token, user } = useAuth();
  
  const handleSetTheme = useCallback(async (newTheme) => {
    // Aplicar imediatamente na interface
    document.documentElement.className = newTheme; 
    setThemeState(newTheme);
    
    try {
      // Se estiver autenticado, salvar no backend
      if (isAuthenticated) {
        try {
          await aparenciaService.updateTheme(newTheme);
        } catch (error) {
          console.error('Erro ao salvar tema no backend:', error);
          // Continuar para salvar localmente como fallback
        }
      }
      
      // Salvar localmente como fallback ou para usuários não autenticados
      await apiDataManager.setData('theme', newTheme);
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
      toast({
        title: "Erro ao salvar tema",
        description: "O tema foi aplicado localmente, mas não foi salvo no servidor.",
        variant: "destructive",
      });
    }
  }, [setThemeState, toast, isAuthenticated]);
  
  const fetchVendedores = useCallback(async () => {
    try {
      const response = await clienteService.getAll();
      const vendedoresData = response.data?.data?.data || response.data?.data || response.data || [];
      const vendedoresArray = Array.isArray(vendedoresData) ? vendedoresData : [];
      setVendedores(vendedoresArray);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
      toast({
        title: "Erro ao carregar vendedores",
        description: "Não foi possível carregar a lista de vendedores.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchClientes = useCallback(async () => {
    try {
      const response = await clienteService.getAll();
      const clientesData = response.data?.data?.data || response.data?.data || response.data || [];
      const clientesArray = Array.isArray(clientesData) ? clientesData : [];
      setClientes(clientesArray);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: "Não foi possível carregar a lista de clientes.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchProdutosComEstoqueBaixo = useCallback(async () => {
    // Só verificar estoque baixo se o usuário estiver autenticado
    if (!isAuthenticated || !token) {
      setProdutosComEstoqueBaixo(0);
      return;
    }

    try {
      // Usar o endpoint específico para produtos com estoque baixo
      const response = await produtoService.getEstoqueBaixo();
      // O backend já retorna apenas os produtos com estoque baixo, então só precisamos contar
      setProdutosComEstoqueBaixo(response.data.length);
    } catch (error) {
      setProdutosComEstoqueBaixo(0);
      if (error.response?.status !== 404) {
        console.error('Erro ao verificar produtos com estoque baixo:', error);
      }
    }
  }, [isAuthenticated, token]);

  // Função para abrir notificações (mantida para compatibilidade)
  const abrirNotificacoes = () => {
    setNotificacoesAbertas(true);
  };

  const fecharNotificacoes = useCallback(() => {
    setNotificacoesAbertas(false);
    // Recarregar notificações para atualizar o contador
    carregarNotificacoes();
  }, [carregarNotificacoes]);

  const iniciarSistemaNotificacoes = useCallback(() => {
    // Só verificar estoque baixo se o usuário estiver autenticado
    if (isAuthenticated && token) {
      // Verificar estoque baixo imediatamente
      notificacaoService.verificarEstoqueBaixo();
    }

    // Estoque baixo a cada 5 minutos (só se autenticado)
    const estoqueInterval = setInterval(() => {
      if (isAuthenticated && token) {
        notificacaoService.verificarEstoqueBaixo();
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(estoqueInterval);
    };
  }, [isAuthenticated, token]);
  
  const carregarDadosIniciais = useCallback(async () => {
    setLoading(true);
    try {
      // Fazer migração automática do localStorage para API
      await apiDataManager.migrateFromLocalStorage();
      
      // Carregar dados da empresa da API
      let empresaData = null;
      try {
        const response = await empresaService.get();
        empresaData = response.data.data;
        if (empresaData) {
          setNomeEmpresa(empresaData.nome_fantasia || 'Sua Empresa');
          setNomeSistema(empresaData.nome_sistema || 'Sistema Gráficas');
          setLogoUrl(empresaData.logo_url || '');
        }
      } catch (error) {
        console.error('❌ [App.jsx] Erro ao carregar dados da empresa:', error);
        // Fallback para configurações antigas
        const configEmpresa = await carregarConfiguracoesEmpresa();
        if (configEmpresa) {
          setNomeEmpresa(configEmpresa.nomeFantasia || 'Sua Empresa');
          setNomeSistema(configEmpresa.nomeSistema || 'Sistema Gráficas');
          setLogoUrl(configEmpresa.logoUrl || '');
        }
      }
      
      // Carregar logoUrl da API se não estiver nas configurações
      if (!empresaData?.logo_url) {
        const logoUrlFromApi = await apiDataManager.getData('logoUrl', '');
        setLogoUrl(logoUrlFromApi);
      }
      
      // Carregar clientes
      await fetchClientes();
      
      // Carregar vendedores
      await fetchVendedores();
      
      // Verificar produtos com estoque baixo
      await fetchProdutosComEstoqueBaixo();
      
      // Carregar notificações não lidas
      // Notificações são carregadas automaticamente pelo hook useNotifications
      
      // Iniciar sistema de notificações
      const limparNotificacoes = iniciarSistemaNotificacoes();
      
      // Retornar função de limpeza para ser usada no useEffect
      return limparNotificacoes;
      
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Alguns dados não puderam ser carregados. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchClientes, fetchVendedores, fetchProdutosComEstoqueBaixo, iniciarSistemaNotificacoes, toast]);

  const carregarTemaInicial = useCallback(async () => {
    if (temaCarregado) {
      return;
    }
    
    try {
      // Se estiver autenticado, tentar carregar o tema do usuário do backend
      if (isAuthenticated) {
        try {
          const response = await aparenciaService.getTheme();
          const userTheme = response?.data?.theme || response?.theme;
          if (userTheme) {
            document.documentElement.className = userTheme;
            setThemeState(userTheme);
            setTemaCarregado(true);
            // Persistir localmente como fallback
            await apiDataManager.setData('theme', userTheme);
            return;
          }
        } catch (error) {
          console.error('Erro ao carregar tema do usuário do backend:', error);
          // Continuar para o fallback
        }
      }
      
      // Fallback: carregar do localStorage/API local
      const defaultTheme = await apiDataManager.getData('theme', 'light');
      document.documentElement.className = defaultTheme;
      setThemeState(defaultTheme);
      setTemaCarregado(true);
    } catch (error) {
      console.error('Erro ao carregar tema inicial:', error);
      // Usar tema padrão em caso de erro
      document.documentElement.className = 'light';
      setThemeState('light');
      setTemaCarregado(true);
    }
  }, [temaCarregado, isAuthenticated]);

  useEffect(() => {
    // Carregar tema inicial apenas uma vez
    if (!temaCarregado) {
      carregarTemaInicial();
    }
  }, [carregarTemaInicial, temaCarregado]);

  // Escutar evento de tema carregado do usuário autenticado
  useEffect(() => {
    const handleUserThemeLoaded = (event) => {
      const userTheme = event.detail;
      setThemeState(userTheme);
    };

    window.addEventListener('userThemeLoaded', handleUserThemeLoaded);
    const handleNotificacoesUpdated = () => {
      // Notificações são carregadas automaticamente pelo hook useNotifications
    };
    window.addEventListener('notificacoesUpdated', handleNotificacoesUpdated);
    
    return () => {
      window.removeEventListener('userThemeLoaded', handleUserThemeLoaded);
      window.removeEventListener('notificacoesUpdated', handleNotificacoesUpdated);
    };
  }, []);

  useEffect(() => {
    // Carregar dados iniciais da API apenas se estiver autenticado
    if (isAuthenticated && !loading) {
      let limparNotificacoes;
      
      const inicializar = async () => {
        limparNotificacoes = await carregarDadosIniciais();
        // Forçar carregamento imediato das notificações após inicialização
        setTimeout(() => {
          // Notificações são carregadas automaticamente pelo hook useNotifications
        }, 1000);
      };
      
      inicializar();
      
      // Cleanup function
      return () => {
        if (limparNotificacoes) {
          limparNotificacoes();
        }
      };
    }
  }, [carregarDadosIniciais, isAuthenticated, loading]);

  // Verificação adicional de notificações quando autenticado (otimizado)
  useEffect(() => {
    // Aguardar o auth terminar de carregar e verificar se está autenticado
    if (!authLoading && isAuthenticated && token && !loading) {
      // Verificar imediatamente ao carregar
      // Notificações são carregadas automaticamente pelo hook useNotifications
      
      // Verificar apenas uma vez adicional após 3 segundos
      const timeout = setTimeout(() => {
        // Notificações são carregadas automaticamente pelo hook useNotifications
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, authLoading, token, loading]);

  // Carregar vendedor atual após os vendedores serem carregados ou usuário logado
  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        try {
          // Se há vendedores cadastrados, tentar carregar o vendedor selecionado
          if (vendedores.length > 0) {
            const vendedorAtualId = await apiDataManager.getData('vendedorAtualId');
            if (vendedorAtualId) {
              const vendedor = vendedores.find(v => v.id === vendedorAtualId);
              if (vendedor) {
                setVendedorAtual(vendedor);
                return;
              }
            }
            // Se não encontrou vendedor selecionado, usar o primeiro vendedor
            setVendedorAtual(vendedores[0]);
          } else if (user && user.name) {
            // Se não há vendedores cadastrados, usar o usuário logado
            const vendedorUsuario = {
              id: user.id,
              nome: user.name,
              email: user.email,
              telefone: user.telefone || ''
            };
            setVendedorAtual(vendedorUsuario);
          }
        } catch(error) {
          console.error('Erro ao carregar vendedor atual:', error);
        }
      };
      
      loadData();
    }
  }, [vendedores, isAuthenticated, user]);

  // Garantir que o vendedorAtual seja definido com o usuário logado se não houver vendedores
  useEffect(() => {
    if (isAuthenticated && user && user.name && !vendedorAtual) {
      const vendedorUsuario = {
        id: user.id,
        nome: user.name,
        email: user.email,
        telefone: user.telefone || ''
      };
      setVendedorAtual(vendedorUsuario);
    }
  }, [isAuthenticated, user, vendedorAtual]);

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if(file.size > 1024 * 1024 * 2) { 
          toast({ title: "Arquivo muito grande", description: "Por favor, use uma imagem com menos de 2MB.", variant: "destructive"});
          return;
      }
      const reader = new FileReader();
      reader.onload = async (e) => {
        const url = e.target.result;
        setLogoUrl(url);
        try {
          await apiDataManager.setData('logoUrl', url);
        } catch (error) {
          console.error('Erro ao salvar logo:', error);
          toast({
            title: "Erro ao salvar logo",
            description: "O logo foi aplicado localmente, mas não foi salvo no servidor.",
            variant: "destructive",
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSetVendedorAtual = async (vendedor) => {
    setVendedorAtual(vendedor);
    try {
      if (vendedor) {
        await apiDataManager.setData('vendedorAtualId', vendedor.id);
      } else {
        await apiDataManager.removeItem('vendedorAtualId');
      }
    } catch (error) {
      console.error('Erro ao salvar vendedor atual:', error);
    }
  };
  
  const location = useLocation();
  const navigateApp = useNavigate();

  // Handler para clique em notificação de pré-venda - navega para o Histórico PDV
  const handleNotificacaoClick = useCallback((notificacao, vendaId) => {
    if (notificacao.tipo === 'pre_venda' && vendaId) {
      if (marcarComoLida) marcarComoLida(notificacao.id);
      fecharNotificacoes();
      navigateApp('/operacional/pdv-historico', { state: { openVendaId: vendaId } });
    }
  }, [navigateApp, marcarComoLida, fecharNotificacoes]);
  
  const renderWithLayout = (Component, props = {}) => (
    <ProtectedRoute>
      <OSCountProvider>
        <div className={`flex min-h-screen w-full transition-colors duration-300 bg-background`}>
          <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
          <div className="flex flex-col flex-1 w-full lg:pl-64">
                   <AppHeader 
                       isSidebarOpen={isSidebarOpen}
                       setIsSidebarOpen={setIsSidebarOpen}
                       clientes={clientes}
                       vendedorAtual={vendedorAtual}
                       setVendedorAtual={handleSetVendedorAtual}
                       vendedores={vendedores}
                       logoUrl={logoUrl}
                       handleLogoUpload={handleLogoUpload}
                       theme={theme}
                       setTheme={handleSetTheme}
                       produtosComEstoqueBaixo={produtosComEstoqueBaixo}
                       notificacoesNaoLidas={notificacoesNaoLidas}
                       onAbrirNotificacoes={abrirNotificacoes}
                    />
            <main className="flex-1 overflow-x-hidden overflow-y-auto" key={location.pathname}>
              <Suspense fallback={<LoadingFallback />}>
                <Component {...props} vendedorAtual={vendedorAtual} logoUrl={logoUrl} nomeEmpresa={nomeEmpresa} theme={theme} setTheme={handleSetTheme} setAppLogoUrl={setLogoUrl} setAppNomeEmpresa={setNomeEmpresa} setAppNomeSistema={setNomeSistema} />
              </Suspense>
            </main>
          </div>
          
          {/* Painel de Notificações */}
          <NotificacoesPanel 
            isOpen={notificacoesAbertas}
            onClose={fecharNotificacoes}
            notificacoes={notificacoes}
            loading={notificacoesLoading}
            marcarComoLida={marcarComoLida}
            marcarTodasComoLidas={marcarTodasComoLidas}
            deletarNotificacao={deletarNotificacao}
            onNotificacaoClick={handleNotificacaoClick}
            executarVerificacoes={executarVerificacoes}
          />
          
          <Toaster />
          
          {/* Toast de Notificação Personalizado */}
          {toastNotification && (
            <NotificationToast
              isVisible={toastNotification.isVisible}
              onClose={fecharToast}
              title={toastNotification.title}
              message={toastNotification.message}
              type={toastNotification.type}
            />
          )}
        </div>
      </OSCountProvider>
    </ProtectedRoute>
  );
  
  const renderWithoutLayout = (Component, props = {}) => {
    const location = useLocation();
    return (
      <Suspense fallback={<LoadingFallback />} key={location.pathname}>
        <Component {...props} logoUrl={logoUrl} nomeEmpresa={nomeEmpresa} />
      </Suspense>
    );
  };

  return (
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/catalogo-publico" element={<CatalogoPublicoPage />} />
          <Route path="/catalogo-publico/:tenantId" element={<CatalogoPublicoPage />} />
          <Route path="/catalogo-publico/produto/:produtoId" element={<CatalogoPublicoPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/:tenantId" element={<CheckoutPage />} />
          <Route path="/test-api" element={<TestApiPage />} />
          <Route path="/test-data-manager" element={renderWithLayout(TestDataManagerPage)} />
          
          {/* Admin Routes - Sistema separado de administração de tenants */}
          <Route path="/admin/login" element={
            <Suspense fallback={<LoadingFallback />}>
              <AdminLoginPage />
            </Suspense>
          } />
          <Route path="/admin/dashboard" element={
            <AdminProtectedRoute>
              <Suspense fallback={<LoadingFallback />}>
                <AdminDashboardPage />
              </Suspense>
            </AdminProtectedRoute>
          } />
          <Route path="/admin/tenants" element={
            <AdminProtectedRoute>
              <Suspense fallback={<LoadingFallback />}>
                <AdminTenantsPage />
              </Suspense>
            </AdminProtectedRoute>
          } />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/operacional/envelopamento/editar/:orcamentoId" element={renderWithoutLayout(EditarOrcamentoEnvelopamentoPage)} />
          <Route path="/configuracoes" element={renderWithLayout(SettingsPage)} />
          <Route path="/exemplo-permissoes" element={renderWithLayout(ExemploPermissoesPage)} />
          <Route path="/teste-menu" element={renderWithLayout(TesteMenuPage)} />
          
          {/* Protected Routes */}
          <Route path="/cadastros/novo-produto" element={renderWithLayout(NovoProdutoPage)} />
          <Route path="/cadastros/novo-cliente" element={renderWithLayout(NovoClientePage)} />
          <Route path="/relatorio-simplificado" element={renderWithLayout(RelatorioSimplificadoPage)} />
          <Route path="/pdv/historico" element={renderWithLayout(PDVHistoricoPage)} />
          
          {/* Rotas do Caixa */}
          <Route path="/caixa/fluxo-caixa" element={renderWithLayout(FluxoCaixaPage)} />
          <Route path="/caixa/abertura-caixa" element={renderWithLayout(AberturaCaixaPage, { vendedorAtual })} />
          <Route path="/caixa/fechamento-caixa" element={renderWithLayout(FechamentoCaixaPage, { vendedorAtual })} />
          <Route path="/caixa/historico-caixa" element={renderWithLayout(HistoricoCaixaPage)} />
          
          {/* Root route - Redirect to first allowed route */}
          <Route path="/" element={<RedirectToFirstAllowedRoute />} />
          
          {/* Catch-all route - Protected */}
          <Route path="*" element={
            <ProtectedRoute>
              <OSCountProvider>
                <div className={`flex min-h-screen w-full transition-colors duration-300 bg-background`}>
                  <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                  <div className="flex flex-col flex-1 w-full lg:pl-64">
                      <AppHeader 
                         isSidebarOpen={isSidebarOpen}
                         setIsSidebarOpen={setIsSidebarOpen}
                         clientes={clientes}
                         vendedorAtual={vendedorAtual}
                         setVendedorAtual={handleSetVendedorAtual}
                         vendedores={vendedores}
                         logoUrl={logoUrl}
                         handleLogoUpload={handleLogoUpload}
                         theme={theme}
                         setTheme={handleSetTheme}
                         produtosComEstoqueBaixo={produtosComEstoqueBaixo}
                         notificacoesNaoLidas={notificacoesNaoLidas}
                         onAbrirNotificacoes={abrirNotificacoes}
                      />
                      <main className="flex-1 overflow-x-hidden overflow-y-auto">
                        <Suspense fallback={<LoadingFallback />}>
                          <AppRoutes 
                            logoUrl={logoUrl}
                            nomeEmpresa={nomeEmpresa}
                            vendedorAtual={vendedorAtual}
                            theme={theme} 
                            setTheme={handleSetTheme} 
                            setAppLogoUrl={setLogoUrl} 
                            setAppNomeEmpresa={setNomeEmpresa} 
                            setAppNomeSistema={setNomeSistema}
                          />
                        </Suspense>
                      </main>
                    </div>
                    
                    {/* Painel de Notificações */}
                    <NotificacoesPanel 
                      isOpen={notificacoesAbertas}
                      onClose={fecharNotificacoes}
                      notificacoes={notificacoes}
                      loading={notificacoesLoading}
                      marcarComoLida={marcarComoLida}
                      marcarTodasComoLidas={marcarTodasComoLidas}
                      deletarNotificacao={deletarNotificacao}
                      onNotificacaoClick={handleNotificacaoClick}
                      executarVerificacoes={executarVerificacoes}
                    />
                    
                    <Toaster />
                    
                    {/* Toast de Notificação Personalizado */}
                    {toastNotification && (
                      <NotificationToast
                        isVisible={toastNotification.isVisible}
                        onClose={fecharToast}
                        title={toastNotification.title}
                        message={toastNotification.message}
                        type={toastNotification.type}
                      />
                    )}
                  </div>
                </OSCountProvider>
              </ProtectedRoute>
            } />
        </Routes>
  );
}

// Componente App principal que fornece o contexto
function App() {
  return (
    <AuthProvider>
      <NomeSistemaProvider>
        <AppContent />
      </NomeSistemaProvider>
    </AuthProvider>
  );
}

export default App;