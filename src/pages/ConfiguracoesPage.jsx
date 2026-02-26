import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Building, Palette, Package, CreditCard, Barcode, Trash2, SlidersHorizontal, Download, Upload, ShieldAlert, Loader2, Star, Receipt, LayoutDashboard, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from "@/components/ui/use-toast";
import { safeJsonParse } from '@/lib/utils';
import { criarBackup, restaurarBackup, criarBackupLocal, restaurarBackupLocal } from '@/services/backupService';
import { carregarConfiguracoesEmpresa } from '@/services/configService';
import { usePermissions } from '@/hooks/usePermissions';
import PermissionGate from '@/components/PermissionGate';

const settingsOptionsBase = [
  { id: 'empresa', title: 'Dados da Empresa', description: 'Configure nome, CNPJ, endereço e logo.', icon: Building, path: '/configuracoes/empresa' },
  { id: 'aparencia', title: 'Aparência e Tema', description: 'Personalize cores e temas do sistema.', icon: Palette, path: '/configuracoes/aparencia' },
  { id: 'personalizacoes', title: 'Personalizações', description: 'Defina comportamentos padrão do sistema.', icon: SlidersHorizontal, path: '/configuracoes/personalizacoes' },
  { id: 'dashboard', title: 'Dashboard', description: 'Configure widgets e layout do dashboard.', icon: LayoutDashboard, path: '/configuracoes/dashboard' },
  { id: 'acoes_rapidas', title: 'Ações Rápidas', description: 'Configure as ações rápidas do dashboard.', icon: Zap, path: '/configuracoes/acoes-rapidas' },
  { id: 'produtos_conf', title: 'Produtos e Estoque (Conf.)', description: 'Defina padrões para produtos e estoque.', icon: Package, path: '/configuracoes/produtos-estoque' },
  { id: 'financeiro_conf', title: 'Financeiro (Conf.)', description: 'Contas bancárias, formas de pagamento.', icon: CreditCard, path: '/configuracoes/financeiro' },
  { id: 'pontos', title: 'Programa de Pontos', description: 'Configure o programa de fidelidade e pontos.', icon: Star, path: '/configuracoes/pontos' },
  { id: 'nota_fiscal', title: 'Nota Fiscal', description: 'Configure token, ambiente e parâmetros fiscais.', icon: Receipt, path: '/configuracoes/nota-fiscal' },
  { id: 'etiquetas', title: 'Gerador de Etiquetas', description: 'Crie e imprima etiquetas de produtos.', icon: Barcode, path: '/operacional/gerador-etiquetas' },
  { id: 'lixeira', title: 'Lixeira', description: 'Recupere itens excluídos.', icon: Trash2, path: '/ferramentas/lixeira' },
  { id: 'acabamentos', title: 'Acabamentos e Serviços', description: 'Gerencie tipos de acabamentos e serviços.', icon: SlidersHorizontal, path: '/cadastros/acabamentos-servicos' },
  { id: 'admin_sistema', title: 'Admin do Sistema', description: 'Configurações avançadas e de sistema.', icon: ShieldAlert, path: '/configuracoes/admin' },
];

const ConfiguracoesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission, isOwner } = usePermissions();
  const [isLoading, setIsLoading] = useState(false);
  
  // Filtrar opções baseado em permissões
  const settingsOptions = settingsOptionsBase.filter(option => {
    // Dashboard e Ações Rápidas só para quem tem permissão de config_sistema
    if (option.id === 'dashboard' || option.id === 'acoes_rapidas') {
      return isOwner || hasPermission('config_sistema');
    }
    // Outras opções podem ter suas próprias verificações no futuro
    return true;
  });

  const handleNavigation = (path) => {
    const knownPaths = settingsOptionsBase.map(opt => opt.path);

    if (knownPaths.includes(path)) {
      navigate(path);
    } else {
       toast({
          title: "Ops! Em Construção 🚧",
          description: "Esta seção de configurações ainda está sendo preparada com carinho para você!",
          variant: "default",
          duration: 3000
      });
    }
  };

  const handleBackup = async () => {
    setIsLoading(true);
    try {
      // Tentar usar a API para criar o backup
      let backupData;
      let nomeEmpresa = 'sistema';
      
      try {
        // Obter dados da empresa para o nome do arquivo
        const configEmpresa = await carregarConfiguracoesEmpresa();
        if (configEmpresa && configEmpresa.nomeFantasia) {
          nomeEmpresa = configEmpresa.nomeFantasia;
        }
        
        // Obter backup da API
        backupData = await criarBackup();
      } catch (apiError) {
        console.warn('Não foi possível criar backup via API, usando método local:', apiError);
        // Fallback para backup local se a API falhar
        backupData = criarBackupLocal();
      }
      
      // Criar e baixar o arquivo
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      const date = new Date().toISOString().slice(0, 10);
      link.download = `backup-${nomeEmpresa.toLowerCase().replace(/\s+/g, '-')}-${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
      
      toast({ title: "Backup Completo Realizado!", description: "O arquivo JSON com seus dados foi baixado." });
    } catch (error) {
      console.error("Erro ao gerar backup:", error);
      toast({ title: "Erro no Backup", description: "Não foi possível gerar o arquivo de backup.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = e.target.result;
        const dataToRestore = safeJsonParse(json, null);

        if (!dataToRestore || typeof dataToRestore !== 'object') {
          throw new Error("Arquivo de backup inválido ou corrompido.");
        }
        
        try {
          // Tentar restaurar via API
          await restaurarBackup(dataToRestore);
        } catch (apiError) {
          console.warn('Não foi possível restaurar backup via API, usando método local:', apiError);
          // Fallback para restauração local
          restaurarBackupLocal(dataToRestore);
        }
        
        toast({ title: "Backup Restaurado com Sucesso!", description: "Os dados foram carregados. A página será recarregada." });
        setTimeout(() => window.location.reload(), 2000);
      } catch (error) {
        console.error("Erro ao restaurar backup:", error);
        toast({ title: "Erro ao Restaurar Backup", description: `Falha ao processar o arquivo: ${error.message}`, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
    event.target.value = null; 
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
          <Settings size={36} className="text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
            <p className="text-muted-foreground">Gerencie e personalize todos os aspectos do sistema.</p>
          </div>
        </div>
      </header>

       <Card className="mb-6 border-blue-500 border-2 shadow-blue-200/50 dark:shadow-blue-800/50">
        <CardHeader>
          <CardTitle className="text-xl text-blue-700 dark:text-blue-400">Backup e Restauração de Dados (Local)</CardTitle>
          <CardDescription>
            Faça o download de todos os dados do sistema para um arquivo local ou restaure a partir de um backup.
            Mantenha seus backups em local seguro. A restauração substituirá todos os dados atuais.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={handleBackup} 
            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
            Fazer Backup Completo
          </Button>
          <Button 
            asChild 
            variant="outline" 
            className="w-full sm:w-auto border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            disabled={isLoading}
          >
            <label htmlFor="restore-backup-input">
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
              Restaurar Backup
              <input type="file" id="restore-backup-input" accept=".json" onChange={handleRestore} className="hidden" />
            </label>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {settingsOptions.map((option, index) => (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card 
              className="hover:shadow-xl hover:border-primary/50 transition-all duration-300 cursor-pointer h-full flex flex-col dark:bg-card"
              onClick={() => handleNavigation(option.path)}
            >
              <CardHeader className="flex-row items-center gap-4 pb-3">
                <div className="p-3 bg-primary/10 text-primary rounded-lg">
                  <option.icon size={28} />
                </div>
                <CardTitle className="text-lg leading-tight">{option.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription>{option.description}</CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ConfiguracoesPage;