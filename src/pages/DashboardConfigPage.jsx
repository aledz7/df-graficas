import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, RotateCcw, Eye, EyeOff, Settings2, Grid3x3 } from 'lucide-react';
import { dashboardService } from '@/services/api';
import * as Icons from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';

const DashboardConfigPage = () => {
  const { toast } = useToast();
  const { hasPermission, isOwner } = usePermissions();
  const [widgetsDisponiveis, setWidgetsDisponiveis] = useState([]);
  const [configuracao, setConfiguracao] = useState(null);
  const [widgetsVisiveis, setWidgetsVisiveis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');

  // Proteger página - apenas admins podem configurar dashboard
  if (!isOwner && !hasPermission('config_sistema')) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [widgetsResponse, configResponse] = await Promise.all([
        dashboardService.getWidgetsDisponiveis(),
        dashboardService.getConfiguracao(),
      ]);

      if (widgetsResponse.success) {
        setWidgetsDisponiveis(widgetsResponse.data || []);
      }

      if (configResponse.success) {
        setConfiguracao(configResponse.data);
        setWidgetsVisiveis(configResponse.data?.widgets_visiveis || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro ao carregar configuração',
        description: 'Ocorreu um erro ao carregar a configuração do dashboard.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleWidget = (codigo) => {
    setWidgetsVisiveis(prev => {
      if (prev.includes(codigo)) {
        return prev.filter(c => c !== codigo);
      } else {
        return [...prev, codigo];
      }
    });
  };

  const handleSalvar = async () => {
    try {
      setIsSaving(true);
      
      const dados = {
        widgets_visiveis: widgetsVisiveis,
        layout: configuracao?.layout || null,
        nome_configuracao: 'Configuração Personalizada',
      };

      const response = await dashboardService.salvarConfiguracao(dados);

      if (response.success) {
        toast({
          title: 'Configuração salva',
          description: 'Sua configuração do dashboard foi salva com sucesso!',
        });
        
        // Recarregar configuração
        const configResponse = await dashboardService.getConfiguracao();
        if (configResponse.success) {
          setConfiguracao(configResponse.data);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar a configuração.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetar = async () => {
    try {
      setIsSaving(true);
      
      // Resetar para widgets padrão (primeiros 8)
      const widgetsPadrao = widgetsDisponiveis
        .slice(0, 8)
        .map(w => w.codigo);
      
      setWidgetsVisiveis(widgetsPadrao);
      
      const dados = {
        widgets_visiveis: widgetsPadrao,
        layout: null,
        nome_configuracao: 'Configuração Padrão',
      };

      await dashboardService.salvarConfiguracao(dados);
      
      toast({
        title: 'Configuração resetada',
        description: 'Dashboard resetado para configuração padrão.',
      });
      
      await loadData();
    } catch (error) {
      console.error('Erro ao resetar:', error);
      toast({
        title: 'Erro ao resetar',
        description: 'Ocorreu um erro ao resetar a configuração.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const categorias = ['todas', 'geral', 'vendas', 'operacional', 'financeiro', 'producao'];
  
  const widgetsFiltrados = categoriaFiltro === 'todas' 
    ? widgetsDisponiveis 
    : widgetsDisponiveis.filter(w => w.categoria === categoriaFiltro);

  const getCategoriaNome = (cat) => {
    const nomes = {
      todas: 'Todas',
      geral: 'Geral',
      vendas: 'Vendas',
      operacional: 'Operacional',
      financeiro: 'Financeiro',
      producao: 'Produção',
    };
    return nomes[cat] || cat;
  };

  const getCategoriaCor = (cat) => {
    const cores = {
      geral: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      vendas: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      operacional: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      financeiro: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      producao: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };
    return cores[cat] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuração do Dashboard</h1>
          <p className="text-muted-foreground">
            Personalize seu dashboard escolhendo quais informações exibir
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetar} disabled={isSaving}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Resetar
          </Button>
          <Button onClick={handleSalvar} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Widgets Selecionados</CardTitle>
          <CardDescription>
            {widgetsVisiveis.length} widget(s) selecionado(s) de {widgetsDisponiveis.length} disponíveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {widgetsVisiveis.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum widget selecionado. Selecione os widgets que deseja exibir no dashboard.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {widgetsVisiveis.map(codigo => {
                const widget = widgetsDisponiveis.find(w => w.codigo === codigo);
                if (!widget) return null;
                
                const IconComponent = widget.icone && Icons[widget.icone] ? Icons[widget.icone] : Icons.BarChart3;
                
                return (
                  <Card key={codigo} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <CardTitle className="text-sm">{widget.nome}</CardTitle>
                        </div>
                        <Badge className={getCategoriaCor(widget.categoria)}>
                          {getCategoriaNome(widget.categoria)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">{widget.descricao}</p>
                    </CardContent>
                    <div className="absolute top-2 right-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleWidget(codigo)}
                        className="h-6 w-6 p-0"
                      >
                        <EyeOff className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Widgets Disponíveis</CardTitle>
          <CardDescription>
            Selecione os widgets que deseja exibir no seu dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="todas" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              {categorias.map(cat => (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  onClick={() => setCategoriaFiltro(cat)}
                >
                  {getCategoriaNome(cat)}
                </TabsTrigger>
              ))}
            </TabsList>

            {categorias.map(cat => (
              <TabsContent key={cat} value={cat}>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {widgetsFiltrados.map(widget => {
                      const isSelected = widgetsVisiveis.includes(widget.codigo);
                      const IconComponent = widget.icone && Icons[widget.icone] ? Icons[widget.icone] : Icons.BarChart3;
                      
                      return (
                        <Card 
                          key={widget.codigo}
                          className={isSelected ? 'border-primary border-2' : ''}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleWidget(widget.codigo)}
                                />
                                <IconComponent className="h-4 w-4" />
                                <CardTitle className="text-sm">{widget.nome}</CardTitle>
                              </div>
                              <Badge className={getCategoriaCor(widget.categoria)}>
                                {getCategoriaNome(widget.categoria)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground mb-2">
                              {widget.descricao}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="outline">{widget.tipo}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardConfigPage;
