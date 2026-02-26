import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { aparenciaService, quickActionService } from '@/services/api';
import * as Icons from 'lucide-react';

// Mapeamento de cores para classes Tailwind
const colorClassMap = {
  green: 'bg-green-500 hover:bg-green-600',
  blue: 'bg-blue-500 hover:bg-blue-600',
  indigo: 'bg-indigo-500 hover:bg-indigo-600',
  purple: 'bg-purple-500 hover:bg-purple-600',
  pink: 'bg-pink-500 hover:bg-pink-600',
  red: 'bg-red-500 hover:bg-red-600',
  orange: 'bg-orange-500 hover:bg-orange-600',
  amber: 'bg-amber-500 hover:bg-amber-600',
  yellow: 'bg-yellow-500 hover:bg-yellow-600',
  lime: 'bg-lime-500 hover:bg-lime-600',
  emerald: 'bg-emerald-500 hover:bg-emerald-600',
  teal: 'bg-teal-500 hover:bg-teal-600',
  cyan: 'bg-cyan-500 hover:bg-cyan-600',
  sky: 'bg-sky-500 hover:bg-sky-600',
  violet: 'bg-violet-500 hover:bg-violet-600',
  fuchsia: 'bg-fuchsia-500 hover:bg-fuchsia-600',
  rose: 'bg-rose-500 hover:bg-rose-600',
  slate: 'bg-slate-500 hover:bg-slate-600',
  gray: 'bg-gray-500 hover:bg-gray-600',
  zinc: 'bg-zinc-500 hover:bg-zinc-600',
  black: 'bg-zinc-900 hover:bg-black',
};

// Verifica se é uma cor hex personalizada
const isHexColor = (c) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(c);

// Função para escurecer uma cor hex (para o hover)
const darkenColor = (hex, percent = 10) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
  const B = Math.max((num & 0x0000FF) - amt, 0);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
};

const QuickActions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [actions, setActions] = useState([]);
  const [colors, setColors] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Carregar ações rápidas do backend
  const loadActions = async () => {
    try {
      setIsLoading(true);
      const response = await quickActionService.getActionsDisponiveis();
      if (response.success && response.data) {
        setActions(Array.isArray(response.data) ? response.data : []);
      } else {
        setActions([]);
      }
    } catch (error) {
      console.error('Erro ao carregar ações rápidas:', error);
      setActions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar cores personalizadas
  const loadColors = async () => {
    try {
      const response = await aparenciaService.getQuickActionsColors();
      if (response.success && response.data?.colors) {
        setColors(response.data.colors);
      }
    } catch (error) {
      console.warn('Não foi possível carregar cores personalizadas, usando padrão:', error);
    }
  };

  useEffect(() => {
    loadActions();
    loadColors();
    
    // Escutar evento de atualização
    const handleUpdated = () => {
      loadActions();
      loadColors();
    };
    
    window.addEventListener('quickActionsUpdated', handleUpdated);
    
    return () => {
      window.removeEventListener('quickActionsUpdated', handleUpdated);
    };
  }, []);

  const handleActionClick = (action) => {
    if (action.rota) {
      navigate(action.rota, { state: action.estado || {} });
    } else {
      toast({
        title: "Em Construção!",
        description: `O módulo de ${action.nome} será implementado em breve.`,
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full shadow-lg border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground flex items-center">
            <LayoutGrid size={20} className="mr-2 text-primary"/>Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return (
      <Card className="h-full shadow-lg border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground flex items-center">
            <LayoutGrid size={20} className="mr-2 text-primary"/>Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma ação rápida disponível.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full shadow-lg border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-foreground flex items-center">
          <LayoutGrid size={20} className="mr-2 text-primary"/>Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {actions.map((action, index) => {
            const colorKey = action.codigo;
            const colorValue = colors[colorKey] || action.cor_padrao || 'gray';
            const isCustomHex = isHexColor(colorValue);
            const colorClass = !isCustomHex ? (colorClassMap[colorValue] || colorClassMap.gray) : '';
            
            // Obter ícone
            const IconComponent = action.icone && Icons[action.icone] 
              ? Icons[action.icone] 
              : Icons.LayoutGrid;
            
            // Estilo inline para cores hex personalizadas
            const customStyle = isCustomHex ? {
              backgroundColor: colorValue,
              '--hover-bg': darkenColor(colorValue, 15),
            } : {};
            
            return (
              <motion.button
                key={action.codigo}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleActionClick(action)}
                className={`${colorClass} text-white p-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center space-y-1.5 text-center aspect-square`}
                style={customStyle}
                onMouseEnter={(e) => {
                  if (isCustomHex) {
                    e.currentTarget.style.backgroundColor = darkenColor(colorValue, 15);
                  }
                }}
                onMouseLeave={(e) => {
                  if (isCustomHex) {
                    e.currentTarget.style.backgroundColor = colorValue;
                  }
                }}
              >
                <IconComponent className="h-6 w-6 sm:h-7 sm:w-7" />
                <span className="text-xs sm:text-sm font-medium">{action.nome}</span>
              </motion.button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
