import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const DashboardWidget = ({ 
  widget, 
  dados, 
  onClick,
  className,
  isLoading = false 
}) => {
  const navigate = useNavigate();
  
  // Obter ícone dinamicamente
  const IconComponent = widget?.icone && Icons[widget.icone] ? Icons[widget.icone] : Icons.BarChart3;
  
  // Cores padrão por categoria
  const coresPorCategoria = {
    vendas: 'blue',
    operacional: 'indigo',
    financeiro: 'green',
    producao: 'yellow',
    geral: 'purple',
  };
  
  const cor = widget?.cor_padrao || coresPorCategoria[widget?.categoria] || 'blue';
  
  // Classes de cor
  const corClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    indigo: 'bg-indigo-500 text-white',
    purple: 'bg-purple-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    orange: 'bg-orange-500 text-white',
    red: 'bg-red-500 text-white',
  };
  
  const handleClick = () => {
    if (onClick) {
      onClick(widget, dados);
    } else if (widget?.configuracao_padrao?.action) {
      // Ações padrão baseadas no código do widget
      const actions = {
        'vendas_dia_qtd': () => navigate('/operacional/pdv-historico'),
        'vendas_dia_valor': () => navigate('/operacional/pdv-historico'),
        'os_aberto': () => navigate('/operacional/os-historico'),
        'os_em_producao': () => navigate('/operacional/os-em-producao'),
        'envelopamentos_orcados': () => navigate('/operacional/orcamentos-envelopamento'),
        'estoque_baixo': () => navigate('/cadastros/produtos'),
        'total_clientes': () => navigate('/cadastros/clientes'),
        'total_receber': () => navigate('/financeiro/contas-receber'),
        'total_pagar': () => navigate('/financeiro/contas-pagar'),
        'ticket_medio': () => navigate('/relatorios/operacional/vendas-gerais'),
        'novos_clientes_mes': () => navigate('/cadastros/clientes'),
        'vendas_mes': () => navigate('/relatorios/operacional/vendas-gerais'),
        'faturamento_mes': () => navigate('/relatorios/financeiro/faturamento-detalhado'),
        'producao_trabalhos': () => navigate('/relatorios/operacional/producao'),
        'producao_concluidos': () => navigate('/relatorios/operacional/producao'),
        'producao_atrasados': () => navigate('/relatorios/operacional/producao'),
      };
      
      if (actions[widget.codigo]) {
        actions[widget.codigo]();
      }
    }
  };
  
  const valor = dados?.dados?.valor || '0';
  const tipo = dados?.dados?.tipo || 'numero';
  const subtexto = dados?.dados?.subtexto || widget?.descricao;
  
  // Formatar valor baseado no tipo
  const formatarValor = (val, tipo) => {
    if (tipo === 'moeda') {
      return typeof val === 'string' ? val : `R$ ${parseFloat(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (tipo === 'numero') {
      return typeof val === 'string' ? val : parseInt(val || 0).toLocaleString('pt-BR');
    }
    return val;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("h-full", className)}
    >
      <Card 
        className={cn(
          "h-full cursor-pointer transition-all hover:shadow-lg",
          onClick || widget?.configuracao_padrao?.action ? "hover:scale-105" : ""
        )}
        onClick={handleClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {widget?.nome || 'Widget'}
            </CardTitle>
            <div className={cn("p-2 rounded-md", corClasses[cor] || corClasses.blue)}>
              <IconComponent className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold">
                {formatarValor(valor, tipo)}
              </div>
              {subtexto && (
                <p className="text-xs text-muted-foreground mt-1">
                  {subtexto}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DashboardWidget;
