import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Sun, Moon, Monitor as MonitorIcon, Palette, Save, Droplet, Leaf, Zap, Sparkles, Sunrise, Paintbrush, Star, Wind, Flower2, CloudRain, Candy, Rocket, Coffee, Music, Feather, Gem, LayoutDashboard, RotateCcw, ShoppingCart, ClipboardList, Archive, PackagePlus, FilePlus2, UserPlus, BarChartHorizontalBig, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import { aparenciaService } from '@/services/api';

const AparenciaSettingsPage = ({ theme: currentGlobalTheme, setTheme: applyGlobalTheme }) => {
  const { toast } = useToast();
  
  const [selectedTheme, setSelectedTheme] = useState(currentGlobalTheme || 'light');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedFromBackend, setHasLoadedFromBackend] = useState(false);
  
  // Estados para cores do dashboard
  const [dashboardColors, setDashboardColors] = useState({
    vendasDia: 'green',
    osAberto: 'indigo',
    orcEnvelopamento: 'purple',
    estoqueBaixo: 'orange',
  });
  const [isSavingColors, setIsSavingColors] = useState(false);
  
  // Estados para cores das Ações Rápidas
  const [quickActionsColors, setQuickActionsColors] = useState({
    novoPdv: 'blue',
    novoProduto: 'green',
    novaOs: 'orange',
    novoEnvelopamento: 'purple',
    novoCliente: 'indigo',
    relatorios: 'red',
  });
  const [isSavingQuickActions, setIsSavingQuickActions] = useState(false);

  const themeOptionsList = [
    { value: 'light', label: 'Claro (Neutro)', icon: Sun, description: "Um tema claro e limpo, ideal para ambientes bem iluminados." },
    { value: 'dark', label: 'Escuro (Neutro)', icon: Moon, description: "Um tema escuro elegante, confortável para visualização noturna." },
  ];

  // Lista de cores disponíveis
  const availableColors = [
    { value: 'green', label: 'Verde', hex: '#22c55e' },
    { value: 'blue', label: 'Azul', hex: '#3b82f6' },
    { value: 'indigo', label: 'Índigo', hex: '#6366f1' },
    { value: 'purple', label: 'Roxo', hex: '#a855f7' },
    { value: 'pink', label: 'Rosa', hex: '#ec4899' },
    { value: 'red', label: 'Vermelho', hex: '#ef4444' },
    { value: 'orange', label: 'Laranja', hex: '#f97316' },
    { value: 'amber', label: 'Âmbar', hex: '#f59e0b' },
    { value: 'yellow', label: 'Amarelo', hex: '#eab308' },
    { value: 'lime', label: 'Lima', hex: '#84cc16' },
    { value: 'emerald', label: 'Esmeralda', hex: '#10b981' },
    { value: 'teal', label: 'Teal', hex: '#14b8a6' },
    { value: 'cyan', label: 'Ciano', hex: '#06b6d4' },
    { value: 'sky', label: 'Céu', hex: '#0ea5e9' },
    { value: 'violet', label: 'Violeta', hex: '#8b5cf6' },
    { value: 'fuchsia', label: 'Fúcsia', hex: '#d946ef' },
    { value: 'rose', label: 'Rosê', hex: '#f43f5e' },
    { value: 'slate', label: 'Ardósia', hex: '#64748b' },
    { value: 'gray', label: 'Cinza', hex: '#6b7280' },
    { value: 'zinc', label: 'Zinco', hex: '#71717a' },
    { value: 'black', label: 'Preto', hex: '#18181b' },
  ];

  // Cards do dashboard com seus ícones
  const dashboardCards = [
    { key: 'vendasDia', label: 'Vendas do Dia', icon: ShoppingCart },
    { key: 'osAberto', label: 'OS em Aberto', icon: ClipboardList },
    { key: 'orcEnvelopamento', label: 'Orç. Envelopamento', icon: Palette },
    { key: 'estoqueBaixo', label: 'Estoque Baixo', icon: Archive },
  ];

  // Botões de Ações Rápidas com seus ícones
  const quickActionsButtons = [
    { key: 'novoPdv', label: 'Novo PDV', icon: ShoppingCart },
    { key: 'novoProduto', label: 'Novo Produto', icon: PackagePlus },
    { key: 'novaOs', label: 'Nova OS', icon: FilePlus2 },
    { key: 'novoEnvelopamento', label: 'Novo Envelopamento', icon: Palette },
    { key: 'novoCliente', label: 'Novo Cliente', icon: UserPlus },
    { key: 'relatorios', label: 'Relatórios', icon: BarChartHorizontalBig },
  ];

  // Carregar tema e cores do usuário do backend apenas uma vez na inicialização
  useEffect(() => {
    const loadUserSettings = async () => {
      if (hasLoadedFromBackend) return;
      
      try {
        setIsLoading(true);
        
        // Carregar tema
        const themeResponse = await aparenciaService.getTheme();
        if (themeResponse.success && themeResponse.data?.theme) {
          const userTheme = themeResponse.data.theme;
          setSelectedTheme(userTheme);
          if (applyGlobalTheme) {
            applyGlobalTheme(userTheme);
          }
        }
        
        // Carregar cores do dashboard
        const colorsResponse = await aparenciaService.getDashboardColors();
        if (colorsResponse.success && colorsResponse.data?.colors) {
          setDashboardColors(colorsResponse.data.colors);
        }
        
        // Carregar cores das Ações Rápidas
        const quickActionsResponse = await aparenciaService.getQuickActionsColors();
        if (quickActionsResponse.success && quickActionsResponse.data?.colors) {
          setQuickActionsColors(quickActionsResponse.data.colors);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações do usuário:', error);
        // Se não conseguir carregar do backend, usar o tema global ou padrão
        if (currentGlobalTheme) {
          setSelectedTheme(currentGlobalTheme);
        }
      } finally {
        setIsLoading(false);
        setHasLoadedFromBackend(true);
      }
    };

    loadUserSettings();
  }, [currentGlobalTheme, applyGlobalTheme, hasLoadedFromBackend]);

  const handleThemeChange = (newTheme) => {
    setSelectedTheme(newTheme);
    if (applyGlobalTheme) {
      applyGlobalTheme(newTheme); 
    }
  };

  const handleColorChange = (cardKey, newColor) => {
    setDashboardColors(prev => ({
      ...prev,
      [cardKey]: newColor
    }));
  };

  const handleSaveColors = async () => {
    try {
      setIsSavingColors(true);
      const response = await aparenciaService.updateDashboardColors(dashboardColors);
      
      if (response.success) {
        toast({
          title: 'Cores Salvas!',
          description: 'As cores dos cards do dashboard foram atualizadas com sucesso.',
          className: 'bg-green-500 text-white',
        });
      } else {
        throw new Error(response.message || 'Erro ao salvar cores');
      }
    } catch (error) {
      console.error('Erro ao salvar cores:', error);
      toast({
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar as cores. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingColors(false);
    }
  };

  const handleResetColors = async () => {
    try {
      setIsSavingColors(true);
      const response = await aparenciaService.resetDashboardColors();
      
      if (response.success) {
        setDashboardColors(response.data.colors);
        toast({
          title: 'Cores Resetadas!',
          description: 'As cores voltaram ao padrão original.',
          className: 'bg-blue-500 text-white',
        });
      } else {
        throw new Error(response.message || 'Erro ao resetar cores');
      }
    } catch (error) {
      console.error('Erro ao resetar cores:', error);
      toast({
        title: 'Erro ao Resetar',
        description: 'Não foi possível resetar as cores. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingColors(false);
    }
  };

  const handleQuickActionsColorChange = (buttonKey, newColor) => {
    setQuickActionsColors(prev => ({
      ...prev,
      [buttonKey]: newColor
    }));
  };

  const handleSaveQuickActionsColors = async () => {
    try {
      setIsSavingQuickActions(true);
      const response = await aparenciaService.updateQuickActionsColors(quickActionsColors);
      
      if (response.success) {
        toast({
          title: 'Cores Salvas!',
          description: 'As cores dos botões de Ações Rápidas foram atualizadas com sucesso.',
          className: 'bg-green-500 text-white',
        });
      } else {
        throw new Error(response.message || 'Erro ao salvar cores');
      }
    } catch (error) {
      console.error('Erro ao salvar cores das ações rápidas:', error);
      toast({
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar as cores. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingQuickActions(false);
    }
  };

  const handleResetQuickActionsColors = async () => {
    try {
      setIsSavingQuickActions(true);
      const response = await aparenciaService.resetQuickActionsColors();
      
      if (response.success) {
        setQuickActionsColors(response.data.colors);
        toast({
          title: 'Cores Resetadas!',
          description: 'As cores das Ações Rápidas voltaram ao padrão original.',
          className: 'bg-blue-500 text-white',
        });
      } else {
        throw new Error(response.message || 'Erro ao resetar cores');
      }
    } catch (error) {
      console.error('Erro ao resetar cores das ações rápidas:', error);
      toast({
        title: 'Erro ao Resetar',
        description: 'Não foi possível resetar as cores. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingQuickActions(false);
    }
  };
  
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      
      // Salvar no backend
      const response = await aparenciaService.updateTheme(selectedTheme);
      
      if (response.success) {
        // Aplicar tema global
        if (applyGlobalTheme) {
          applyGlobalTheme(selectedTheme);
        }

        toast({
          title: 'Aparência Salva!',
          description: 'Seu tema preferido foi salvo no banco de dados e será mantido em futuros acessos.',
          className: 'bg-green-500 text-white',
        });
      } else {
        throw new Error(response.message || 'Erro ao salvar tema');
      }
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
      toast({
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar sua preferência de tema. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const currentSelectedThemeDetails = themeOptionsList.find(t => t.value === selectedTheme) || themeOptionsList.find(t => t.value === 'light');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-8"
    >
      <Card className="shadow-xl">
        <CardHeader className="border-b">
          <div className="flex items-center space-x-4">
            <Palette className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold">Aparência e Tema</CardTitle>
              <CardDescription>
                Personalize o visual do sistema para uma experiência mais agradável. Suas preferências serão salvas no banco de dados.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          {/* Seção de Tema */}
          <div className="space-y-4 p-6 border rounded-lg shadow-sm bg-card">
            <Label htmlFor="theme-select" className="text-lg font-semibold">Tema do Sistema</Label>
            <Select value={selectedTheme} onValueChange={handleThemeChange} disabled={isLoading}>
              <SelectTrigger id="theme-select" className="w-full md:w-[320px] h-12 text-base">
                <div className="flex items-center">
                  {currentSelectedThemeDetails.icon && <currentSelectedThemeDetails.icon className="mr-2 h-5 w-5" />}
                  <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione um tema"} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {themeOptionsList.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-base py-3">
                    <div className="flex items-center">
                      {opt.icon && <opt.icon className="mr-2 h-5 w-5" />}
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {currentSelectedThemeDetails.description || "Escolha seu tema visual preferido. A mudança é aplicada instantaneamente."}
            </p>
          </div>

          {/* Seção de Cores do Dashboard */}
          <div className="space-y-4 p-6 border rounded-lg shadow-sm bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                <Label className="text-lg font-semibold">Cores dos Cards do Dashboard</Label>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResetColors}
                disabled={isSavingColors || isLoading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar Padrão
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Personalize as cores de fundo dos cards de estatísticas na página inicial.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardCards.map(card => {
                const selectedColor = availableColors.find(c => c.value === dashboardColors[card.key]);
                const CardIcon = card.icon;
                
                return (
                  <div key={card.key} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md transition-all"
                      style={{ backgroundColor: selectedColor?.hex || '#6b7280' }}
                    >
                      <CardIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{card.label}</Label>
                      <Select 
                        value={dashboardColors[card.key]} 
                        onValueChange={(value) => handleColorChange(card.key, value)}
                        disabled={isLoading || isSavingColors}
                      >
                        <SelectTrigger className="w-full mt-1 h-10">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: selectedColor?.hex || '#6b7280' }}
                            />
                            <SelectValue placeholder="Selecione uma cor" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {availableColors.map(color => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full border"
                                  style={{ backgroundColor: color.hex }}
                                />
                                {color.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSaveColors} 
                disabled={isSavingColors || isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                <Save size={18} className="mr-2" />
                {isSavingColors ? 'Salvando...' : 'Salvar Cores'}
              </Button>
            </div>
          </div>

          {/* Seção de Cores das Ações Rápidas */}
          <div className="space-y-4 p-6 border rounded-lg shadow-sm bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                <Label className="text-lg font-semibold">Cores dos Botões de Ações Rápidas</Label>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResetQuickActionsColors}
                disabled={isSavingQuickActions || isLoading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar Padrão
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Personalize as cores dos botões de ações rápidas na página inicial do dashboard.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActionsButtons.map(button => {
                const selectedColor = availableColors.find(c => c.value === quickActionsColors[button.key]);
                const ButtonIcon = button.icon;
                
                return (
                  <div key={button.key} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md transition-all"
                      style={{ backgroundColor: selectedColor?.hex || '#6b7280' }}
                    >
                      <ButtonIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{button.label}</Label>
                      <Select 
                        value={quickActionsColors[button.key]} 
                        onValueChange={(value) => handleQuickActionsColorChange(button.key, value)}
                        disabled={isLoading || isSavingQuickActions}
                      >
                        <SelectTrigger className="w-full mt-1 h-10">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: selectedColor?.hex || '#6b7280' }}
                            />
                            <SelectValue placeholder="Selecione uma cor" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {availableColors.map(color => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full border"
                                  style={{ backgroundColor: color.hex }}
                                />
                                {color.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSaveQuickActionsColors} 
                disabled={isSavingQuickActions || isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                <Save size={18} className="mr-2" />
                {isSavingQuickActions ? 'Salvando...' : 'Salvar Cores'}
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 flex justify-end">
          <Button 
            onClick={handleSaveSettings} 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg"
            disabled={isSaving || isLoading}
          >
            <Save size={20} className="mr-2" /> 
            {isSaving ? 'Salvando...' : 'Salvar Aparência'}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default AparenciaSettingsPage;