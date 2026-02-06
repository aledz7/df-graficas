import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  ArrowRight,
  Clock,
  Package,
  ShoppingCart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminTenantService } from '@/services/adminTenantService';
import AdminLayout from '@/components/admin/AdminLayout';

const StatCard = ({ title, value, icon: Icon, description, trend, loading }) => (
  <Card className="bg-slate-800 border-slate-700">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
      <Icon className="h-4 w-4 text-slate-400" />
    </CardHeader>
    <CardContent>
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      ) : (
        <>
          <div className="text-2xl font-bold text-white">{value}</div>
          {description && (
            <p className="text-xs text-slate-400 mt-1">{description}</p>
          )}
          {trend && (
            <div className="flex items-center text-xs text-green-400 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend}
            </div>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

const AdminDashboardPage = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalTenants: 0,
    tenantsAtivos: 0,
    tenantsBloqueados: 0,
    totalUsuarios: 0,
    totalClientes: 0,
    totalVendas: 0,
  });
  const [recentTenants, setRecentTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carregar todos os tenants para estatísticas
      const response = await adminTenantService.getTenants({ per_page: 100 });
      
      if (response.success && response.data) {
        const tenants = Array.isArray(response.data.data) ? response.data.data : [];
        
        // Calcular estatísticas
        const ativos = tenants.filter(t => t.ativo);
        const bloqueados = tenants.filter(t => !t.ativo);
        const totalUsuarios = tenants.reduce((sum, t) => sum + (t.users_count || 0), 0);
        const totalClientes = tenants.reduce((sum, t) => sum + (t.clientes_count || 0), 0);
        const totalVendas = tenants.reduce((sum, t) => sum + (t.vendas_count || 0), 0);
        
        setStats({
          totalTenants: response.data.total || tenants.length,
          tenantsAtivos: ativos.length,
          tenantsBloqueados: bloqueados.length,
          totalUsuarios,
          totalClientes,
          totalVendas,
        });
        
        // Pegar os 5 tenants mais recentes
        const sorted = [...tenants].sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        setRecentTenants(sorted.slice(0, 5));
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do dashboard.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard Administrativo</h1>
            <p className="text-slate-400">Visão geral do sistema de tenants</p>
          </div>
          <Button asChild>
            <Link to="/admin/tenants">
              Gerenciar Tenants
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Total de Tenants"
            value={stats.totalTenants}
            icon={Building2}
            loading={loading}
          />
          <StatCard
            title="Tenants Ativos"
            value={stats.tenantsAtivos}
            icon={CheckCircle2}
            description="Com acesso liberado"
            loading={loading}
          />
          <StatCard
            title="Tenants Bloqueados"
            value={stats.tenantsBloqueados}
            icon={AlertCircle}
            description="Acesso suspenso"
            loading={loading}
          />
          <StatCard
            title="Total de Usuários"
            value={stats.totalUsuarios}
            icon={Users}
            loading={loading}
          />
          <StatCard
            title="Total de Clientes"
            value={stats.totalClientes}
            icon={Package}
            loading={loading}
          />
          <StatCard
            title="Total de Vendas"
            value={stats.totalVendas}
            icon={ShoppingCart}
            loading={loading}
          />
        </div>

        {/* Recent Tenants */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tenants Recentes
            </CardTitle>
            <CardDescription className="text-slate-400">
              Últimos tenants cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : recentTenants.length === 0 ? (
              <p className="text-center text-slate-400 py-8">Nenhum tenant cadastrado.</p>
            ) : (
              <div className="space-y-4">
                {recentTenants.map((tenant) => (
                  <div 
                    key={tenant.id} 
                    className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{tenant.nome}</p>
                        <p className="text-sm text-slate-400">{tenant.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge variant={tenant.ativo ? 'default' : 'secondary'}>
                          {tenant.ativo ? 'Ativo' : 'Bloqueado'}
                        </Badge>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDate(tenant.created_at)}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-slate-300">{tenant.users_count || 0} usuários</p>
                        <p className="text-slate-400">{tenant.clientes_count || 0} clientes</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 text-center">
                  <Button variant="outline" asChild className="border-slate-600 text-slate-300 hover:bg-slate-700">
                    <Link to="/admin/tenants">
                      Ver todos os tenants
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-700"
              asChild
            >
              <Link to="/admin/tenants">
                <Building2 className="h-6 w-6" />
                <span>Gerenciar Tenants</span>
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={loadDashboardData}
            >
              <TrendingUp className="h-6 w-6" />
              <span>Atualizar Estatísticas</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-700"
              asChild
            >
              <a href="/dashboard">
                <Users className="h-6 w-6" />
                <span>Ir para Sistema</span>
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
