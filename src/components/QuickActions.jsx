import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ShoppingCart, 
  PackagePlus, 
  FilePlus2, 
  Palette, 
  UserPlus, 
  BarChartHorizontalBig,
  LayoutGrid
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { aparenciaService } from '@/services/api';

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
  
  // Estado para cores personalizadas
  const [colors, setColors] = useState({
    novoPdv: 'blue',
    novoProduto: 'green',
    novaOs: 'orange',
    novoEnvelopamento: 'purple',
    novoCliente: 'indigo',
    relatorios: 'red',
  });

  // Carregar cores do backend
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
    loadColors();
    
    // Escutar evento de atualização de cores
    const handleColorsUpdated = () => {
      loadColors();
    };
    
    window.addEventListener('quickActionsColorsUpdated', handleColorsUpdated);
    
    return () => {
      window.removeEventListener('quickActionsColorsUpdated', handleColorsUpdated);
    };
  }, []);

  const handleActionClick = (path, moduleName, state = {}) => {
    if (path) {
      navigate(path, { state });
    } else {
      toast({
        title: "Em Construção!",
        description: `O módulo de ${moduleName} será implementado em breve.`,
      });
    }
  };
  
  const actions = [
    { icon: ShoppingCart, label: 'Novo PDV', colorKey: 'novoPdv', path: '/operacional/pdv', module: 'PDV' },
    { icon: PackagePlus, label: 'Novo Produto', colorKey: 'novoProduto', path: '/cadastros/novo-produto', module: 'Produtos' },
    { icon: FilePlus2, label: 'Nova OS', colorKey: 'novaOs', path: '/operacional/ordens-servico', module: 'Ordens de Serviço' },
    { icon: Palette, label: 'Novo Envelopamento', colorKey: 'novoEnvelopamento', path: '/operacional/envelopamento', module: 'Envelopamentos' },
    { icon: UserPlus, label: 'Novo Cliente', colorKey: 'novoCliente', path: '/cadastros/clientes', module: 'Clientes', state: { openNewClientModal: true } },
    { icon: BarChartHorizontalBig, label: 'Relatórios', colorKey: 'relatorios', path: '/relatorios', module: 'Relatórios' }
  ];

  return (
    <Card className="h-full shadow-lg border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-foreground flex items-center"><LayoutGrid size={20} className="mr-2 text-primary"/>Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {actions.map((action, index) => {
            const colorValue = colors[action.colorKey] || 'gray';
            const isCustomHex = isHexColor(colorValue);
            const colorClass = !isCustomHex ? (colorClassMap[colorValue] || colorClassMap.gray) : '';
            
            // Estilo inline para cores hex personalizadas
            const customStyle = isCustomHex ? {
              backgroundColor: colorValue,
              '--hover-bg': darkenColor(colorValue, 15),
            } : {};
            
            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleActionClick(action.path, action.module, action.state)}
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
                <action.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                <span className="text-xs sm:text-sm font-medium">{action.label}</span>
              </motion.button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;