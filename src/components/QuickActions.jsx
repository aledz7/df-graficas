import React from 'react';
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


const QuickActions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

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
    { icon: ShoppingCart, label: 'Novo PDV', color: 'bg-blue-500 hover:bg-blue-600', path: '/operacional/pdv', module: 'PDV' },
    { icon: PackagePlus, label: 'Novo Produto', color: 'bg-green-500 hover:bg-green-600', path: '/cadastros/produtos', module: 'Produtos', state: { openNewProductModal: true } },
    { icon: FilePlus2, label: 'Nova OS', color: 'bg-orange-500 hover:bg-orange-600', path: '/operacional/ordens-servico', module: 'Ordens de Serviço' },
    { icon: Palette, label: 'Novo Envelopamento', color: 'bg-purple-500 hover:bg-purple-600', path: '/operacional/envelopamento', module: 'Envelopamentos' },
    { icon: UserPlus, label: 'Novo Cliente', color: 'bg-indigo-500 hover:bg-indigo-600', path: '/cadastros/clientes', module: 'Clientes', state: { openNewClientModal: true } },
    { icon: BarChartHorizontalBig, label: 'Relatórios', color: 'bg-red-500 hover:bg-red-600', path: '/relatorios', module: 'Relatórios' }
  ];

  return (
    <Card className="h-full shadow-lg border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-foreground flex items-center"><LayoutGrid size={20} className="mr-2 text-primary"/>Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {actions.map((action, index) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleActionClick(action.path, action.module, action.state)}
              className={`${action.color} text-white p-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center space-y-1.5 text-center aspect-square`}
            >
              <action.icon className="h-6 w-6 sm:h-7 sm:w-7" />
              <span className="text-xs sm:text-sm font-medium">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;