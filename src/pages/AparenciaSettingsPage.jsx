import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Sun, Moon, Monitor as MonitorIcon, Palette, Save, Droplet, Leaf, Zap, Sparkles, Sunrise, Paintbrush, Star, Wind, Flower2, CloudRain, Candy, Rocket, Coffee, Music, Feather, Gem } from 'lucide-react';
import { motion } from 'framer-motion';
import { aparenciaService } from '@/services/api';

const AparenciaSettingsPage = ({ theme: currentGlobalTheme, setTheme: applyGlobalTheme }) => {
  const { toast } = useToast();
  
  const [selectedTheme, setSelectedTheme] = useState(currentGlobalTheme || 'light');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedFromBackend, setHasLoadedFromBackend] = useState(false);

  const themeOptionsList = [
    { value: 'light', label: 'Claro (Neutro)', icon: Sun, description: "Um tema claro e limpo, ideal para ambientes bem iluminados." },
    { value: 'dark', label: 'Escuro (Neutro)', icon: Moon, description: "Um tema escuro elegante, confortável para visualização noturna." },
  ];

  // Carregar tema do usuário do backend apenas uma vez na inicialização
  useEffect(() => {
    const loadUserTheme = async () => {
      if (hasLoadedFromBackend) return;
      
      try {
        setIsLoading(true);
        const response = await aparenciaService.getTheme();
        if (response.success && response.data?.theme) {
          const userTheme = response.data.theme;
          setSelectedTheme(userTheme);
          if (applyGlobalTheme) {
            applyGlobalTheme(userTheme);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar tema do usuário:', error);
        // Se não conseguir carregar do backend, usar o tema global ou padrão
        if (currentGlobalTheme) {
          setSelectedTheme(currentGlobalTheme);
        }
      } finally {
        setIsLoading(false);
        setHasLoadedFromBackend(true);
      }
    };

    loadUserTheme();
  }, [currentGlobalTheme, applyGlobalTheme, hasLoadedFromBackend]);

  const handleThemeChange = (newTheme) => {
    setSelectedTheme(newTheme);
    if (applyGlobalTheme) {
      applyGlobalTheme(newTheme); 
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