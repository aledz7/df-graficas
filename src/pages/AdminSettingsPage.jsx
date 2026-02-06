import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Settings, Save, Upload, Download, DatabaseBackup, AlertTriangle, KeyRound, Eye, EyeOff, Hash, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { safeJsonParse } from '@/lib/utils';
import { adminConfigService } from '@/services/adminConfigService';
import SenhaMasterModal from '@/components/SenhaMasterModal';

const AdminSettingsPage = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    nome_sistema: 'Sistema Gráficas',
  });
  const [empresaSettings, setEmpresaSettings] = useState({});
  const [senhaMaster, setSenhaMaster] = useState('');
  const [confirmSenhaMaster, setConfirmSenhaMaster] = useState('');
  const [showSenhaMaster, setShowSenhaMaster] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSenhaMasterModal, setShowSenhaMasterModal] = useState(false);
  const [operacaoPendente, setOperacaoPendente] = useState(null);
  
  // Estado para numeração de OS
  const [numeracaoOS, setNumeracaoOS] = useState({
    numeracao_inicial_os: 1,
    ultimo_numero_os: null,
    proximo_numero_os: 1,
    pode_alterar: true
  });
  const [novaNumeracaoOS, setNovaNumeracaoOS] = useState('');
  const [savingNumeracao, setSavingNumeracao] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Carregar configurações gerais
        const response = await adminConfigService.getConfiguracoes();
        
        if (response.success) {
          setConfig(response.data);
          // Manter compatibilidade com o nome antigo
          if (response.data.nome_sistema) {
            setConfig(prev => ({ ...prev, nomeSistema: response.data.nome_sistema }));
          }
        }
        
        // Carregar configuração de numeração de OS
        try {
          const numeracaoResponse = await adminConfigService.getConfiguracaoNumeracaoOS();
          if (numeracaoResponse.success) {
            setNumeracaoOS(numeracaoResponse.data);
            setNovaNumeracaoOS(numeracaoResponse.data.numeracao_inicial_os?.toString() || '1');
          }
        } catch (err) {
          console.error('Erro ao carregar configuração de numeração:', err);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        toast({ 
          title: "Erro", 
          description: "Erro ao carregar configurações administrativas.", 
          variant: "destructive" 
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      const response = await adminConfigService.setNomeSistema(config.nomeSistema);
      
      if (response.success) {
        toast({ title: "Configurações Salvas!", description: "As configurações administrativas foram atualizadas." });
        // Atualizar o estado local
        setConfig(prev => ({ ...prev, nome_sistema: config.nomeSistema }));
      } else {
        toast({ title: "Erro", description: response.message || "Erro ao salvar configurações.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({ title: "Erro", description: "Erro ao salvar configurações administrativas.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSenhaMaster = async () => {
    // Verificar se há senha master configurada
    const temSenha = await adminConfigService.temSenhaMaster();
    
    if (temSenha) {
      // Se há senha master, solicitar confirmação
      setOperacaoPendente('salvar_senha_master');
      setShowSenhaMasterModal(true);
      return;
    }
    
    // Se não há senha master, executar diretamente
    await executarSalvarSenhaMaster();
  };

  const executarSalvarSenhaMaster = async () => {
    try {
      setSaving(true);
      
      if (!senhaMaster) {
        // Remover senha master
        const response = await adminConfigService.removerSenhaMaster();
        
        if (response.success) {
          toast({ title: "Senha Master Removida!", description: "A senha master global foi removida." });
          setConfirmSenhaMaster('');
        } else {
          toast({ title: "Erro", description: response.message || "Erro ao remover senha master.", variant: "destructive" });
        }
        return;
      }
      
      if (senhaMaster !== confirmSenhaMaster) {
        toast({ title: "Erro", description: "As senhas master não coincidem.", variant: "destructive" });
        return;
      }
      
      // Atualizar senha master
      const response = await adminConfigService.updateConfiguracao('senha_master', senhaMaster);
      
      if (response.success) {
        toast({ title: "Senha Master Salva!", description: "A senha master global foi configurada com sucesso." });
        setSenhaMaster('');
        setConfirmSenhaMaster('');
      } else {
        toast({ title: "Erro", description: response.message || "Erro ao salvar senha master.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Erro ao salvar senha master:', error);
      toast({ title: "Erro", description: "Erro ao salvar senha master.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSenhaMasterConfirmada = (senhaConfirmada) => {
    if (operacaoPendente === 'salvar_senha_master') {
      executarSalvarSenhaMaster();
    }
    setOperacaoPendente(null);
  };

  const handleSaveNumeracaoOS = async () => {
    try {
      setSavingNumeracao(true);
      
      const numero = parseInt(novaNumeracaoOS, 10);
      
      if (isNaN(numero) || numero < 1) {
        toast({ 
          title: "Erro", 
          description: "O número deve ser maior que zero.", 
          variant: "destructive" 
        });
        return;
      }
      
      const response = await adminConfigService.setConfiguracaoNumeracaoOS(numero);
      
      if (response.success) {
        toast({ 
          title: "Configuração Salva!", 
          description: "A numeração inicial de OS foi configurada com sucesso." 
        });
        
        // Atualizar o estado local
        setNumeracaoOS(prev => ({
          ...prev,
          numeracao_inicial_os: numero,
          proximo_numero_os: response.data?.proximo_numero_os || numero
        }));
      } else {
        toast({ 
          title: "Erro", 
          description: response.message || "Erro ao salvar configuração.", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Erro ao salvar numeração:', error);
      const errorMessage = error.response?.data?.message || "Erro ao salvar configuração de numeração.";
      toast({ 
        title: "Erro", 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setSavingNumeracao(false);
    }
  };

  const exportData = async () => {
    const allData = {};
    // Usar lista de chaves conhecidas ao invés de localStorage
    const knownKeys = [
      'adminConfig', 'empresaSettings', 'senhaMasterGlobal', 'produtos', 
      'ordens_servico_salvas', 'historico_vendas_pdv', 'envelopamentosOrcamentos',
      'contasReceber', 'contasPagar', 'maquinasCartao', 'agenda_compromissos'
    ];
    
    for (const key of knownKeys) {
      try {
        // Aqui você pode implementar a exportação via API se necessário
        // Por enquanto, mantemos a funcionalidade de backup local
        const value = localStorage.getItem(key);
        if (value !== null) {
          allData[key] = safeJsonParse(value);
        }
      } catch (e) {
        console.warn(`Erro ao exportar ${key}:`, e);
      }
    }
    
    // Adicionar configurações administrativas
    try {
      const adminConfig = await adminConfigService.getConfiguracoes();
      if (adminConfig.success) {
        allData['adminConfiguracoes'] = adminConfig.data;
      }
    } catch (e) {
      console.warn('Erro ao exportar configurações administrativas:', e);
    }
    
    const dataStr = JSON.stringify(allData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `backup_graficapro_${new Date().toISOString().slice(0,10)}.json`;
    
    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast({ title: "Backup Exportado!", description: "Todos os dados do sistema foram baixados." });
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          
          // Importar configurações administrativas se existirem
          if (importedData.adminConfiguracoes) {
            try {
              await adminConfigService.updateConfiguracoes(importedData.adminConfiguracoes);
            } catch (error) {
              console.error('Erro ao importar configurações administrativas:', error);
            }
          }
          
          // Limpar dados existentes e importar novos (localStorage)
          for (const key in importedData) {
            if (importedData.hasOwnProperty(key) && key !== 'adminConfiguracoes') {
                const value = importedData[key];
                localStorage.setItem(key, JSON.stringify(value));
            }
          }
          
          toast({ title: "Backup Importado!", description: "Dados restaurados com sucesso. Recarregue a página." });
          setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
          console.error("Erro ao importar dados:", err);
          toast({ title: "Erro na Importação", description: "O arquivo de backup parece estar corrompido ou inválido.", variant: "destructive" });
        }
      };
      reader.readAsText(file);
      event.target.value = null; 
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6"
    >
      <Card className="shadow-xl max-w-3xl mx-auto">
        <CardHeader className="border-b">
          <div className="flex items-center space-x-4">
            <Settings className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold">Configurações Administrativas Gerais</CardTitle>
              <CardDescription>Gerencie as configurações globais do sistema.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          <div className="space-y-4 p-6 border rounded-lg shadow-sm bg-card">
            <CardTitle className="text-xl font-semibold">Configurações Gerais do Sistema</CardTitle>
            <div className="space-y-2">
              <Label htmlFor="nomeSistema">Nome do Sistema (Exibido no Topo)</Label>
              <Input 
                id="nomeSistema" 
                name="nomeSistema" 
                value={config.nomeSistema} 
                onChange={handleChange} 
              />
            </div>
             <Button onClick={handleSaveConfig} size="sm" className="mt-3" disabled={saving}>
                <Save size={16} className="mr-2" /> 
                {saving ? 'Salvando...' : 'Salvar Nome do Sistema'}
            </Button>
          </div>

          <div className="space-y-4 p-6 border rounded-lg shadow-sm bg-card">
            <CardTitle className="text-xl font-semibold flex items-center">
              <KeyRound className="mr-2 text-primary" /> Senha Master Global
            </CardTitle>
            <CardDescription>
              Defina uma senha master para ações críticas ou recuperação. Deixe em branco para remover.
            </CardDescription>
            <div className="space-y-2">
              <Label htmlFor="senhaMaster">Nova Senha Master</Label>
              <div className="relative">
                <Input 
                  id="senhaMaster" 
                  name="senhaMaster"
                  type={showSenhaMaster ? 'text' : 'password'}
                  value={senhaMaster} 
                  onChange={(e) => setSenhaMaster(e.target.value)} 
                  placeholder="Deixe em branco para remover"
                />
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 h-full px-3"
                    onClick={() => setShowSenhaMaster(!showSenhaMaster)}
                >
                    {showSenhaMaster ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmSenhaMaster">Confirmar Nova Senha Master</Label>
              <Input 
                id="confirmSenhaMaster" 
                name="confirmSenhaMaster"
                type={showSenhaMaster ? 'text' : 'password'}
                value={confirmSenhaMaster} 
                onChange={(e) => setConfirmSenhaMaster(e.target.value)} 
                placeholder="Confirme a senha master"
              />
            </div>
             <Button onClick={handleSaveSenhaMaster} size="sm" className="mt-3" disabled={saving}>
                <Save size={16} className="mr-2" /> 
                {saving ? 'Salvando...' : 'Salvar Senha Master'}
            </Button>
          </div>

          <div className="space-y-4 p-6 border rounded-lg shadow-sm bg-card">
            <CardTitle className="text-xl font-semibold flex items-center">
              <Hash className="mr-2 text-primary" /> Numeração de Ordens de Serviço
            </CardTitle>
            <CardDescription>
              Configure a numeração inicial das Ordens de Serviço. Útil para empresas que estão migrando de outro sistema e desejam continuar a numeração.
            </CardDescription>
            
            <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p><strong>Status atual:</strong></p>
                  <ul className="list-disc ml-4 mt-1 space-y-1">
                    <li>Numeração inicial configurada: <strong>{numeracaoOS.numeracao_inicial_os}</strong></li>
                    {numeracaoOS.ultimo_numero_os !== null && (
                      <li>Último número utilizado: <strong>{numeracaoOS.ultimo_numero_os}</strong></li>
                    )}
                    <li>Próximo número a ser gerado: <strong>{numeracaoOS.proximo_numero_os}</strong></li>
                  </ul>
                  {!numeracaoOS.pode_alterar && numeracaoOS.ultimo_numero_os !== null && (
                    <p className="mt-2 text-yellow-600 dark:text-yellow-400">
                      <strong>Atenção:</strong> Como já existem OSs cadastradas, a nova numeração deve ser maior que {numeracaoOS.ultimo_numero_os}.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeracaoOS">Numeração Inicial</Label>
              <div className="flex gap-2">
                <Input 
                  id="numeracaoOS" 
                  name="numeracaoOS"
                  type="number"
                  min="1"
                  max="999999999"
                  value={novaNumeracaoOS} 
                  onChange={(e) => setNovaNumeracaoOS(e.target.value)} 
                  placeholder="Ex: 1000"
                  className="max-w-xs"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Digite o número a partir do qual as novas OSs serão numeradas. Ex: se digitar 1000, a primeira OS criada será OS-1000.
              </p>
            </div>
            
            <Button onClick={handleSaveNumeracaoOS} size="sm" className="mt-3" disabled={savingNumeracao}>
              <Save size={16} className="mr-2" /> 
              {savingNumeracao ? 'Salvando...' : 'Salvar Numeração'}
            </Button>
          </div>

          <div className="space-y-4 p-6 border rounded-lg shadow-sm bg-card">
            <CardTitle className="text-xl font-semibold flex items-center">
              <DatabaseBackup className="mr-2 text-primary" /> Backup e Restauração de Dados (Local)
            </CardTitle>
            <CardDescription>
              Exporte todos os dados do sistema para um arquivo ou importe de um backup anterior. Use com cautela.
            </CardDescription>
            <div className="mt-1 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-200">Atenção:</h3>
                  <p className="text-xs text-yellow-600 dark:text-yellow-300">
                    A importação de dados substituirá TODOS os dados atuais do sistema. Esta ação é irreversível. 
                    Faça um backup dos dados atuais antes de importar, se necessário.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0">
              <Button onClick={exportData} variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" /> Exportar Todos os Dados
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Label htmlFor="importFile" className="cursor-pointer flex items-center justify-center">
                  <Upload className="mr-2 h-4 w-4" /> Importar Dados de Backup
                  <Input id="importFile" type="file" accept=".json" onChange={importData} className="hidden" />
                </Label>
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 flex justify-end">
          <p className="text-xs text-muted-foreground">Lembre-se de salvar as alterações em cada seção individualmente, se aplicável.</p>
        </CardFooter>
      </Card>
      
      <SenhaMasterModal
        isOpen={showSenhaMasterModal}
        onClose={() => {
          setShowSenhaMasterModal(false);
          setOperacaoPendente(null);
        }}
        onSuccess={handleSenhaMasterConfirmada}
        title="Confirmar Senha Master"
        description="Para alterar a senha master, você deve confirmar a senha atual."
      />
    </motion.div>
  );
};

export default AdminSettingsPage;