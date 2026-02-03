import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Search } from 'lucide-react';
import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';
import { acabamentoService } from '@/services/api';
import AcabamentoForm from '@/components/configuracoes/acabamentos/AcabamentoForm';
import AcabamentosTable from '@/components/configuracoes/acabamentos/AcabamentosTable';
import AcabamentoDica from '@/components/configuracoes/acabamentos/AcabamentoDica';
import OSProdutoLookupModal from '@/components/os/OSProdutoLookupModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const initialAcabamentoState = {
  id: '',
  nome_acabamento: '',
  valor_m2: '', 
  valor_un: '', 
  tipo_aplicacao: 'area_total', 
  ativo: true,
  produto_vinculado_id: null,
  produto_vinculado_nome: '',
  produto_vinculado_custo: '0.00',
  produto_vinculado_unidade_medida: '',
  produto_vinculado_estoque_no_momento_do_cadastro: 0,
  quantidade_produto_por_unidade_acabamento: '1',
  observacoes: '',
  cor_fundo: '#ffffff',
};

const ConfiguracaoAcabamentosPage = () => {
  const { toast } = useToast();
  const [acabamentos, setAcabamentos] = useState([]);
  const [currentAcabamento, setCurrentAcabamento] = useState(initialAcabamentoState);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [produtosCadastrados, setProdutosCadastrados] = useState([]);
  const [isProdutoModalOpen, setIsProdutoModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Tentar carregar do backend primeiro
        const response = await acabamentoService.getAll();
        const acabamentosArray = response.data || [];
        const storedProdutos = await apiDataManager.getItem('produtos');
        const produtosArray = safeJsonParse(storedProdutos, []);
        
        setAcabamentos(acabamentosArray.map(a => ({...initialAcabamentoState, ...a})));
        setProdutosCadastrados(produtosArray);
        
        // Atualizar também o cache local para uso offline
        await apiDataManager.setItem('acabamentos_config', acabamentosArray);
      } catch (error) {
        console.error('Erro ao carregar acabamentos da API:', error);
        // Fallback para dados locais em caso de erro
        const storedAcabamentos = await apiDataManager.getItem('acabamentos_config');
        const storedProdutos = await apiDataManager.getItem('produtos');
        
        // Garantir que storedAcabamentos seja sempre um array
        const acabamentosArray = safeJsonParse(storedAcabamentos, []);
        const produtosArray = safeJsonParse(storedProdutos, []);
        
        setAcabamentos(acabamentosArray.map(a => ({...initialAcabamentoState, ...a})));
        setProdutosCadastrados(produtosArray);
        
        toast({
          title: "Aviso",
          description: "Usando dados locais. Conexão com o servidor não disponível.",
          variant: "warning"
        });
      }
    };
    
    loadData();
  }, [toast]);

  const saveAcabamentos = useCallback(async (updatedAcabamentos) => {
    try {
      // Salvar no backend
      for (const acabamento of updatedAcabamentos) {
        if (acabamento.id.startsWith('acab-')) {
          // É um acabamento novo ou local, precisa criar no backend
          await acabamentoService.create(acabamento);
        } else {
          // É um acabamento existente, precisa atualizar no backend
          await acabamentoService.update(acabamento.id, acabamento);
        }
      }
      
      // Atualizar o cache local
      await apiDataManager.setItem('acabamentos_config', updatedAcabamentos);
    } catch (error) {
      console.error('Erro ao salvar acabamentos:', error);
      // Salvar apenas localmente em caso de erro
      await apiDataManager.setItem('acabamentos_config', updatedAcabamentos);
      toast({
        title: "Aviso",
        description: "Dados salvos apenas localmente. Conexão com o servidor não disponível.",
        variant: "warning"
      });
    }
  }, [toast]);

  const resetForm = useCallback(() => {
    setCurrentAcabamento(initialAcabamentoState);
    setIsEditing(false);
  }, []);

  const handleProdutoSelecionadoModal = useCallback((produto) => {
    if (produto) {
      setCurrentAcabamento(prev => ({
        ...prev,
        produto_vinculado_id: produto.id,
        produto_vinculado_nome: produto.nome,
        produto_vinculado_custo: produto.preco_custo || '0.00',
        produto_vinculado_unidade_medida: produto.unidade_medida || produto.unidadeMedida,
        produto_vinculado_estoque_no_momento_do_cadastro: parseFloat(produto.estoque || 0),
      }));
      toast({ title: "Produto Vinculado", description: `${produto.nome} selecionado como base para este acabamento.` });
    }
    setIsProdutoModalOpen(false);
  }, [toast]);

  const handleSubmit = useCallback(async (acabamentoData) => {
    try {
      let updatedAcabamentos;
      
      if (isEditing) {
        // Atualizar no backend
        await acabamentoService.update(acabamentoData.id, acabamentoData);
        updatedAcabamentos = acabamentos.map(acab => acab.id === acabamentoData.id ? acabamentoData : acab);
        toast({ title: "Sucesso!", description: "Acabamento atualizado." });
      } else {
        // Criar no backend
        const response = await acabamentoService.create(acabamentoData);
        const novoAcabamento = response.data || { ...acabamentoData, id: `acab-${Date.now()}` };
        updatedAcabamentos = [...acabamentos, novoAcabamento];
        toast({ title: "Sucesso!", description: "Novo acabamento adicionado." });
      }
      
      setAcabamentos(updatedAcabamentos);
      // Atualizar também o cache local
      await apiDataManager.setItem('acabamentos_config', updatedAcabamentos);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar acabamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o acabamento. Tente novamente.",
        variant: "destructive"
      });
    }
  }, [acabamentos, isEditing, resetForm, toast]);

  const handleEdit = useCallback((acabamento) => {
    setCurrentAcabamento(acabamento);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  const handleToggleActive = useCallback(async (id) => {
    try {
      const acabamentoToUpdate = acabamentos.find(acab => acab.id === id);
      if (!acabamentoToUpdate) return;
      
      const updatedAcabamento = { ...acabamentoToUpdate, ativo: !acabamentoToUpdate.ativo };
      
      // Atualizar no backend
      await acabamentoService.update(id, updatedAcabamento);
      
      const updatedAcabamentos = acabamentos.map(acab =>
        acab.id === id ? updatedAcabamento : acab
      );
      
      setAcabamentos(updatedAcabamentos);
      // Atualizar também o cache local
      await apiDataManager.setItem('acabamentos_config', updatedAcabamentos);
      toast({ title: "Status Alterado", description: `O acabamento foi ${updatedAcabamento.ativo ? 'ativado' : 'desativado'}.` });
    } catch (error) {
      console.error('Erro ao alterar status do acabamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do acabamento. Tente novamente.",
        variant: "destructive"
      });
    }
  }, [acabamentos, toast]);

  const handleDelete = useCallback(async (id) => {
    try {
      // Excluir do backend
      await acabamentoService.delete(id);
      
      const updatedAcabamentos = acabamentos.filter(acab => acab.id !== id);
      setAcabamentos(updatedAcabamentos);
      // Atualizar também o cache local
      await apiDataManager.setItem('acabamentos_config', updatedAcabamentos);
      toast({ title: "Excluído!", description: "Acabamento removido com sucesso.", variant: "destructive" });
    } catch (error) {
      console.error('Erro ao excluir acabamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o acabamento. Tente novamente.",
        variant: "destructive"
      });
    }
  }, [acabamentos, toast]);

  const filteredAcabamentos = useMemo(() => 
    acabamentos.filter(acab =>
      acab.nome_acabamento.toLowerCase().includes(searchTerm.toLowerCase())
    ), [acabamentos, searchTerm]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4 md:p-6"
    >
      <header className="mb-8">
        <div className="flex items-center space-x-3">
          <Settings size={36} className="text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Configuração de Acabamentos</h1>
            <p className="text-muted-foreground">Adicione, edite ou desative os tipos de acabamentos para Ordens de Serviço.</p>
          </div>
        </div>
      </header>

      <AcabamentoForm
        currentAcabamento={currentAcabamento}
        setCurrentAcabamento={setCurrentAcabamento}
        isEditing={isEditing}
        onSubmit={handleSubmit}
        onCancelEdit={resetForm}
        onOpenProdutoModal={() => setIsProdutoModalOpen(true)}
        initialAcabamentoState={initialAcabamentoState}
      />

      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle>Lista de Acabamentos Cadastrados</CardTitle>
          <CardDescription>Gerencie os acabamentos disponíveis.</CardDescription>
          <div className="mt-4 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar acabamento por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          <AcabamentosTable
            acabamentos={filteredAcabamentos}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        </CardContent>
      </Card>
      
      <AcabamentoDica />

      <OSProdutoLookupModal
        produtosCadastrados={produtosCadastrados}
        onSelectProduto={handleProdutoSelecionadoModal}
        isOpen={isProdutoModalOpen} 
        setIsOpen={setIsProdutoModalOpen}
      >
        <></>
      </OSProdutoLookupModal>
    </motion.div>
  );
};

export default ConfiguracaoAcabamentosPage;