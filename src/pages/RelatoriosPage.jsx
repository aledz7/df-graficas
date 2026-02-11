import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, BarChart2, PieChart, Users, ShoppingBag, Package, TrendingUp, CreditCard, DollarSign, Printer, Box, Wallet, ArrowDownUp, Award, Target, Gift, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from "@/components/ui/use-toast";

const reportCategories = [
  {
    title: 'Financeiros',
    icon: BarChart2,
    reports: [
      { id: 'faturamento', title: 'Faturamento Detalhado', description: 'Análise completa de receitas e despesas.', icon: TrendingUp, path: '/relatorios/financeiro/faturamento-detalhado' },
      { id: 'fluxo_caixa', title: 'Fluxo de Caixa', description: 'Entradas e saídas diárias/período.', icon: DollarSign, path: '/relatorios/financeiro/fluxo-caixa' },
      { id: 'contas_receber', title: 'Contas a Receber', description: 'Valores pendentes de clientes.', icon: CreditCard, path: '/relatorios/financeiro/contas-a-receber' },
      { id: 'contas_pagar', title: 'Contas a Pagar', description: 'Despesas e pagamentos a fornecedores.', icon: CreditCard, path: '/relatorios/financeiro/contas-a-pagar' },
      { id: 'mov_bancarias', title: 'Movimentações Bancárias', description: 'Entradas em contas (exceto dinheiro).', icon: Wallet, path: '/relatorios/financeiro/movimentacoes-bancarias' },
      { id: 'pagamentos_recebidos', title: 'Pagamentos Recebidos', description: 'Total por forma de pagamento.', icon: DollarSign, path: '/relatorios/financeiro/pagamentos-recebidos' },
      { id: 'sangrias_suprimentos', title: 'Sangrias e Suprimentos', description: 'Movimentações manuais de caixa.', icon: ArrowDownUp, path: '/relatorios/financeiro/sangrias-suprimentos' },
      { id: 'geral_recebimentos', title: 'Geral de Recebimentos', description: 'Todas as entradas de valor.', icon: TrendingUp, path: '/relatorios/financeiro/geral-recebimentos' },
    ]
  },
  {
    title: 'Operacionais',
    icon: FileText,
    reports: [
      { id: 'vendas', title: 'Vendas Gerais', description: 'Performance de vendas por período, produto.', icon: ShoppingBag, path: '/relatorios/operacional/vendas-gerais' },
      { id: 'os', title: 'Ordens de Serviço', description: 'Status e resumo das OS.', icon: Printer, path: '/relatorios/operacional/ordens-de-servico' },
      { id: 'envelopamento', title: 'Envelopamentos', description: 'Relatório de serviços de envelopamento.', icon: Box, path: '/relatorios/operacional/envelopamentos' },
      { id: 'produtos', title: 'Produtos e Estoque', description: 'Giro de estoque, produtos mais vendidos.', icon: Package, path: '/relatorios/operacional/produtos-e-estoque' },
      { id: 'lucratividade_produtos', title: 'Lucratividade por Produto', description: 'Análise de margens e lucro de cada produto.', icon: TrendingUp, path: '/relatorios/operacional/lucratividade-por-produto' },
      { id: 'analitico', title: 'Relatório Analítico Completo', description: 'Faturamento, ticket médio, curva ABC, clientes ativos/inativos e mais.', icon: BarChart2, path: '/relatorios/operacional/analitico' },
      { id: 'vendas_metas', title: 'Vendas com Metas', description: 'Acompanhamento de vendas com metas da empresa e vendedores.', icon: Target, path: '/relatorios/operacional/vendas-com-metas' },
    ]
  },
  {
    title: 'Gerenciais',
    icon: PieChart,
    reports: [
      { id: 'comissoes', title: 'Comissões de Vendedores', description: 'Cálculo de comissões por vendas.', icon: Award, path: '/relatorios/gerencial/comissoes' },
      { id: 'desempenho_vendedor', title: 'Desempenho por Vendedor', description: 'Vendas e metas por vendedor.', icon: Users, path: '/relatorios/gerencial/desempenho-por-vendedor' },
      { id: 'dividas_clientes', title: 'Dívidas de Clientes', description: 'Clientes com pagamentos em aberto.', icon: Users, path: '/relatorios/gerencial/dividas-de-clientes' },
      { id: 'recebimentos_clientes', title: 'Recebimentos por Cliente', description: 'Total recebido de cada cliente.', icon: Users, path: '/relatorios/gerencial/recebimentos-por-cliente' },
      { id: 'aniversariantes', title: 'Aniversariantes do Mês', description: 'Clientes que fazem aniversário no mês selecionado.', icon: Gift, path: '/relatorios/gerencial/aniversariantes-mes' },
      { id: 'clientes_mais_compraram', title: 'Clientes que Mais Compraram', description: 'Ranking dos clientes que mais compraram no ano por valor.', icon: Trophy, path: '/relatorios/gerencial/clientes-que-mais-compraram' },
    ]
  }
];

const RelatoriosPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleReportNavigation = (path) => {
    const knownPaths = reportCategories.flatMap(cat => cat.reports.map(r => r.path));
    
    // Todos os relatórios listados agora têm uma rota e um componente (mesmo que seja placeholder)
    const isImplemented = true; 

    if (path === '/relatorios/simplificado') { 
        navigate(path);
        return;
    }

    if (knownPaths.includes(path) && isImplemented) {
      navigate(path);
    } else if (knownPaths.includes(path) && !isImplemented) { // Esta condição não será mais atingida se todos tiverem placeholder
       toast({
        title: "🚧 Relatório em Desenvolvimento 🚧",
        description: "Este relatório específico ainda está sendo construído. Fique de olho nas próximas atualizações! 🚀",
        variant: "default",
        duration: 4000,
      });
    }
     else {
      toast({
        title: "Ops! Caminho Desconhecido",
        description: "Este relatório não foi encontrado. Verifique o caminho ou aguarde futuras atualizações.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6"
    >
      <header className="mb-8">
        <div className="flex items-center space-x-3">
          <BarChart2 size={36} className="text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Central de Relatórios</h1>
            <p className="text-muted-foreground">Acesse diversos relatórios para análise e tomada de decisão.</p>
          </div>
        </div>
         <Button 
            onClick={() => handleReportNavigation('/relatorios/simplificado')} 
            className="mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
          >
            <FileText size={18} className="mr-2" />
            Relatório Simplificado (Vendas/OS)
          </Button>
      </header>

      <div className="space-y-8">
        {reportCategories.map((category, catIndex) => (
          <motion.section 
            key={category.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: catIndex * 0.1 }}
          >
            <div className="flex items-center mb-4">
              <category.icon size={24} className="mr-3 text-primary" />
              <h2 className="text-2xl font-semibold">{category.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {category.reports.map((report, reportIndex) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: (catIndex * 0.1) + (reportIndex * 0.05) }}
                >
                  <Card 
                    className="hover:shadow-xl hover:border-primary/50 transition-all duration-300 cursor-pointer h-full flex flex-col dark:bg-gray-800"
                    onClick={() => handleReportNavigation(report.path)}
                  >
                    <CardHeader className="flex-row items-center gap-3 pb-3">
                      <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                        <report.icon size={24} />
                      </div>
                      <CardTitle className="text-md leading-tight">{report.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <CardDescription className="text-xs">{report.description}</CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </motion.div>
  );
};

export default RelatoriosPage;