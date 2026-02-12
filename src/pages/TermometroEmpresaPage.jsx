import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Thermometer, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  Users, 
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Settings,
  Shield
} from 'lucide-react';
import { termometroService } from '@/services/api';
import { userService } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TermometroEmpresaPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [configForm, setConfigForm] = useState({
    todos_usuarios: false,
    apenas_admin: true,
    usuarios_permitidos: [],
  });

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await termometroService.getStatus();
      if (response.data.success) {
        setStatus(response.data.data);
      } else {
        toast({
          title: "Erro",
          description: response.data.message || "Não foi possível carregar o termômetro",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao carregar termômetro:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o termômetro da empresa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchConfig = useCallback(async () => {
    if (!user?.is_admin) return;
    
    try {
      const response = await termometroService.getConfig();
      if (response.data.success) {
        const configData = response.data.data;
        setConfig(configData);
        setConfigForm({
          todos_usuarios: configData.todos_usuarios || false,
          apenas_admin: configData.apenas_admin !== undefined ? configData.apenas_admin : true,
          usuarios_permitidos: configData.usuarios_permitidos || [],
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  }, [user]);

  const fetchUsuarios = useCallback(async () => {
    if (!user?.is_admin) return;
    
    try {
      const response = await userService.getAll();
      if (response.data) {
        const usuariosList = Array.isArray(response.data) 
          ? response.data 
          : (response.data.data || []);
        setUsuarios(usuariosList);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchStatus();
    if (user?.is_admin) {
      fetchConfig();
      fetchUsuarios();
    }
  }, [fetchStatus, fetchConfig, fetchUsuarios, user]);

  const handleSaveConfig = async () => {
    try {
      const response = await termometroService.updateConfig(configForm);
      if (response.data.success) {
        toast({
          title: "Sucesso",
          description: "Configuração salva com sucesso",
        });
        setIsConfigDialogOpen(false);
        fetchConfig();
        fetchStatus(); // Recarregar status para verificar permissões
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível salvar a configuração",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (statusType) => {
    const colors = {
      verde: {
        bg: 'bg-green-500',
        text: 'text-green-600',
        border: 'border-green-500',
        light: 'bg-green-50',
        dark: 'bg-green-900/20',
      },
      amarelo: {
        bg: 'bg-yellow-500',
        text: 'text-yellow-600',
        border: 'border-yellow-500',
        light: 'bg-yellow-50',
        dark: 'bg-yellow-900/20',
      },
      vermelho: {
        bg: 'bg-red-500',
        text: 'text-red-600',
        border: 'border-red-500',
        light: 'bg-red-50',
        dark: 'bg-red-900/20',
      },
    };
    return colors[statusType] || colors.amarelo;
  };

  const getStatusIcon = (statusType) => {
    switch (statusType) {
      case 'verde':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'amarelo':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      case 'vermelho':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      default:
        return <AlertCircle className="h-6 w-6" />;
    }
  };

  const getStatusMessage = (statusType) => {
    const messages = {
      verde: 'Tudo OK! A empresa está saudável',
      amarelo: 'Atenção necessária em alguns indicadores',
      vermelho: 'Problemas detectados - ação imediata recomendada',
    };
    return messages[statusType] || messages.amarelo;
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!status || !status.pode_ver) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              {status?.mensagem || 'Você não tem permissão para visualizar o termômetro da empresa'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusGeral = status.status;
  const cores = getStatusColor(statusGeral);

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Thermometer className="h-8 w-8" style={{ color: cores.bg.replace('bg-', '#') }} />
            Termômetro da Empresa
          </h1>
          <p className="text-muted-foreground mt-1">
            Indicador simples de saúde do negócio - entenda tudo em 5 segundos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchStatus}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          {user?.is_admin && (
            <Button variant="outline" onClick={() => setIsConfigDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          )}
        </div>
      </div>

      {/* Termômetro Principal */}
      <Card className={`mb-6 border-2 ${cores.border}`}>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <div className={`mb-6 ${cores.bg} rounded-full p-8`}>
              <Thermometer className="h-24 w-24 text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-2" style={{ color: cores.bg.replace('bg-', '#') }}>
              {statusGeral.toUpperCase()}
            </h2>
            <p className="text-xl text-muted-foreground mb-4">
              {getStatusMessage(statusGeral)}
            </p>
            <div className="flex items-center gap-2">
              {getStatusIcon(statusGeral)}
              <span className="text-lg font-semibold">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores Detalhados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vendas */}
        <Card className={getStatusColor(status.indicadores.vendas.status).light}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Vendas
              </CardTitle>
              <Badge variant={status.indicadores.vendas.status === 'verde' ? 'default' : status.indicadores.vendas.status === 'amarelo' ? 'secondary' : 'destructive'}>
                {status.indicadores.vendas.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Mês Atual</span>
                <span className="font-semibold">{formatarMoeda(status.indicadores.vendas.valor)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Mês Anterior</span>
                <span className="font-semibold">{formatarMoeda(status.indicadores.vendas.mes_anterior)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Variação</span>
                <div className="flex items-center gap-2">
                  {status.indicadores.vendas.percentual_variacao >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`font-semibold ${status.indicadores.vendas.percentual_variacao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {status.indicadores.vendas.percentual_variacao >= 0 ? '+' : ''}
                    {status.indicadores.vendas.percentual_variacao.toFixed(2)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {status.indicadores.vendas.descricao}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metas */}
        <Card className={getStatusColor(status.indicadores.metas.status).light}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Metas
              </CardTitle>
              <Badge variant={status.indicadores.metas.status === 'verde' ? 'default' : status.indicadores.metas.status === 'amarelo' ? 'secondary' : 'destructive'}>
                {status.indicadores.metas.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Metas Batidas</span>
                <span className="font-semibold">{status.indicadores.metas.batidas} / {status.indicadores.metas.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Percentual</span>
                <span className="font-semibold">{status.indicadores.metas.percentual.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full ${getStatusColor(status.indicadores.metas.status).bg}`}
                  style={{ width: `${Math.min(100, status.indicadores.metas.percentual)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {status.indicadores.metas.descricao}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Atrasos */}
        <Card className={getStatusColor(status.indicadores.atrasos.status).light}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Atrasos
              </CardTitle>
              <Badge variant={status.indicadores.atrasos.status === 'verde' ? 'default' : status.indicadores.atrasos.status === 'amarelo' ? 'secondary' : 'destructive'}>
                {status.indicadores.atrasos.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor Atrasado</span>
                <span className="font-semibold text-red-600">{formatarMoeda(status.indicadores.atrasos.valor_atrasado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Pendente</span>
                <span className="font-semibold">{formatarMoeda(status.indicadores.atrasos.valor_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Percentual</span>
                <span className="font-semibold">{status.indicadores.atrasos.percentual.toFixed(1)}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {status.indicadores.atrasos.descricao}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Clientes Inativos */}
        <Card className={getStatusColor(status.indicadores.clientes_inativos.status).light}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clientes Inativos
              </CardTitle>
              <Badge variant={status.indicadores.clientes_inativos.status === 'verde' ? 'default' : status.indicadores.clientes_inativos.status === 'amarelo' ? 'secondary' : 'destructive'}>
                {status.indicadores.clientes_inativos.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Clientes Inativos</span>
                <span className="font-semibold">{status.indicadores.clientes_inativos.quantidade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total de Clientes</span>
                <span className="font-semibold">{status.indicadores.clientes_inativos.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Percentual</span>
                <span className="font-semibold">{status.indicadores.clientes_inativos.percentual.toFixed(1)}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {status.indicadores.clientes_inativos.descricao}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Configuração (Apenas Admin) */}
      {user?.is_admin && (
        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configurações de Permissão do Termômetro</DialogTitle>
              <DialogDescription>
                Configure quem pode visualizar o termômetro da empresa
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="todos_usuarios">Todos os Usuários</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir que todos os usuários vejam o termômetro
                  </p>
                </div>
                <Switch
                  id="todos_usuarios"
                  checked={configForm.todos_usuarios}
                  onCheckedChange={(checked) => {
                    setConfigForm({
                      ...configForm,
                      todos_usuarios: checked,
                      apenas_admin: checked ? false : configForm.apenas_admin,
                    });
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="apenas_admin">Apenas Administradores</Label>
                  <p className="text-sm text-muted-foreground">
                    Restringir visualização apenas para administradores
                  </p>
                </div>
                <Switch
                  id="apenas_admin"
                  checked={configForm.apenas_admin}
                  onCheckedChange={(checked) => {
                    setConfigForm({
                      ...configForm,
                      apenas_admin: checked,
                      todos_usuarios: checked ? false : configForm.todos_usuarios,
                    });
                  }}
                  disabled={configForm.todos_usuarios}
                />
              </div>

              {!configForm.todos_usuarios && !configForm.apenas_admin && (
                <div>
                  <Label>Usuários Permitidos</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Selecione quais usuários podem visualizar o termômetro
                  </p>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      const userId = parseInt(value);
                      if (!configForm.usuarios_permitidos.includes(userId)) {
                        setConfigForm({
                          ...configForm,
                          usuarios_permitidos: [...configForm.usuarios_permitidos, userId],
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário para adicionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios
                        .filter(u => !configForm.usuarios_permitidos.includes(u.id))
                        .map((usuario) => (
                          <SelectItem key={usuario.id} value={usuario.id.toString()}>
                            {usuario.name} {usuario.is_admin ? '(Admin)' : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {configForm.usuarios_permitidos.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {configForm.usuarios_permitidos.map((userId) => {
                        const usuario = usuarios.find(u => u.id === userId);
                        if (!usuario) return null;
                        return (
                          <div key={userId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span>{usuario.name} {usuario.is_admin ? '(Admin)' : ''}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setConfigForm({
                                  ...configForm,
                                  usuarios_permitidos: configForm.usuarios_permitidos.filter(id => id !== userId),
                                });
                              }}
                            >
                              Remover
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveConfig}>
                Salvar Configuração
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TermometroEmpresaPage;
