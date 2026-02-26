import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, Plus, Trash2, Edit2, Settings2, Grid3x3 } from 'lucide-react';
import { quickActionService } from '@/services/api';
import * as Icons from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

const QuickActionsConfigPage = () => {
  const { toast } = useToast();
  const { hasPermission, isOwner } = usePermissions();
  const [actions, setActions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionEditando, setActionEditando] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    categoria: 'geral',
    icone: 'LayoutGrid',
    cor_padrao: 'blue',
    rota: '',
    estado: '',
    ordem: 0,
    permissao_codigo: '',
    ativo: true,
  });

  // Proteger página - apenas admins podem configurar
  if (!isOwner && !hasPermission('config_sistema')) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    try {
      setIsLoading(true);
      const response = await quickActionService.getAllActions();
      if (response.success) {
        setActions(response.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar ações rápidas:', error);
      toast({
        title: 'Erro ao carregar ações rápidas',
        description: 'Ocorreu um erro ao carregar as ações rápidas.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (action = null) => {
    if (action) {
      setActionEditando(action);
      setFormData({
        codigo: action.codigo,
        nome: action.nome,
        descricao: action.descricao || '',
        categoria: action.categoria || 'geral',
        icone: action.icone || 'LayoutGrid',
        cor_padrao: action.cor_padrao || 'blue',
        rota: action.rota || '',
        estado: action.estado ? JSON.stringify(action.estado, null, 2) : '',
        ordem: action.ordem || 0,
        permissao_codigo: action.permissao_codigo || '',
        ativo: action.ativo !== false,
      });
    } else {
      setActionEditando(null);
      setFormData({
        codigo: '',
        nome: '',
        descricao: '',
        categoria: 'geral',
        icone: 'LayoutGrid',
        cor_padrao: 'blue',
        rota: '',
        estado: '',
        ordem: actions.length,
        permissao_codigo: '',
        ativo: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActionEditando(null);
  };

  const handleSaveAction = async () => {
    try {
      setIsSaving(true);
      
      const dados = {
        ...formData,
        estado: formData.estado ? JSON.parse(formData.estado) : null,
        ordem: parseInt(formData.ordem) || 0,
      };

      if (actionEditando) {
        await quickActionService.atualizarAction(actionEditando.id, dados);
        toast({
          title: 'Ação rápida atualizada',
          description: 'A ação rápida foi atualizada com sucesso!',
        });
      } else {
        await quickActionService.criarAction(dados);
        toast({
          title: 'Ação rápida criada',
          description: 'A ação rápida foi criada com sucesso!',
        });
      }

      handleCloseModal();
      await loadActions();
      
      // Disparar evento para atualizar QuickActions
      window.dispatchEvent(new CustomEvent('quickActionsUpdated'));
    } catch (error) {
      console.error('Erro ao salvar ação rápida:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.response?.data?.message || 'Ocorreu um erro ao salvar a ação rápida.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAction = async (id) => {
    if (!confirm('Tem certeza que deseja deletar esta ação rápida?')) {
      return;
    }

    try {
      await quickActionService.deletarAction(id);
      toast({
        title: 'Ação rápida deletada',
        description: 'A ação rápida foi deletada com sucesso!',
      });
      await loadActions();
      window.dispatchEvent(new CustomEvent('quickActionsUpdated'));
    } catch (error) {
      console.error('Erro ao deletar ação rápida:', error);
      toast({
        title: 'Erro ao deletar',
        description: 'Ocorreu um erro ao deletar a ação rápida.',
        variant: 'destructive',
      });
    }
  };

  const categorias = ['todas', 'geral', 'vendas', 'operacional', 'financeiro', 'cadastros', 'ferramentas'];
  
  const actionsFiltradas = categoriaFiltro === 'todas' 
    ? actions 
    : actions.filter(a => a.categoria === categoriaFiltro);

  const getCategoriaNome = (cat) => {
    const nomes = {
      todas: 'Todas',
      geral: 'Geral',
      vendas: 'Vendas',
      operacional: 'Operacional',
      financeiro: 'Financeiro',
      cadastros: 'Cadastros',
      ferramentas: 'Ferramentas',
    };
    return nomes[cat] || cat;
  };

  const getCategoriaCor = (cat) => {
    const cores = {
      geral: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      vendas: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      operacional: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      financeiro: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      cadastros: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      ferramentas: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    };
    return cores[cat] || 'bg-gray-100 text-gray-800';
  };

  // Ícones disponíveis (alguns do lucide-react)
  const iconesDisponiveis = [
    'LayoutGrid', 'ShoppingCart', 'PackagePlus', 'FilePlus2', 'Palette', 'UserPlus',
    'BarChartHorizontalBig', 'ShoppingBag', 'GraduationCap', 'MinusCircle', 'PlusCircle',
    'Settings', 'Home', 'Users', 'DollarSign', 'Calendar', 'Clock', 'CheckCircle',
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuração de Ações Rápidas</h1>
          <p className="text-muted-foreground">
            Gerencie as ações rápidas disponíveis no dashboard
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Ação Rápida
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            {actions.length} ação(ões) cadastrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="todas" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              {categorias.map(cat => (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  onClick={() => setCategoriaFiltro(cat)}
                >
                  {getCategoriaNome(cat)}
                </TabsTrigger>
              ))}
            </TabsList>

            {categorias.map(cat => (
              <TabsContent key={cat} value={cat}>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {actionsFiltradas.map(action => {
                      const IconComponent = action.icone && Icons[action.icone] 
                        ? Icons[action.icone] 
                        : Icons.LayoutGrid;
                      
                      return (
                        <Card key={action.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                <CardTitle className="text-sm">{action.nome}</CardTitle>
                              </div>
                              <Badge className={getCategoriaCor(action.categoria)}>
                                {getCategoriaNome(action.categoria)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground mb-2">
                              {action.descricao || 'Sem descrição'}
                            </p>
                            <div className="flex items-center gap-2 text-xs mb-2">
                              <Badge variant="outline">{action.codigo}</Badge>
                              {action.ativo ? (
                                <Badge variant="default">Ativo</Badge>
                              ) : (
                                <Badge variant="secondary">Inativo</Badge>
                              )}
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenModal(action)}
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteAction(action.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Deletar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de Edição/Criação */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {actionEditando ? 'Editar Ação Rápida' : 'Nova Ação Rápida'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  disabled={!!actionEditando}
                  placeholder="ex: novo_pedido"
                />
              </div>
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="ex: Novo Pedido"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da ação rápida"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.filter(c => c !== 'todas').map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {getCategoriaNome(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="icone">Ícone</Label>
                <Select
                  value={formData.icone}
                  onValueChange={(value) => setFormData({ ...formData, icone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconesDisponiveis.map(icon => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cor_padrao">Cor Padrão</Label>
                <Input
                  id="cor_padrao"
                  value={formData.cor_padrao}
                  onChange={(e) => setFormData({ ...formData, cor_padrao: e.target.value })}
                  placeholder="blue, green, #FF0000, etc"
                />
              </div>
              <div>
                <Label htmlFor="ordem">Ordem</Label>
                <Input
                  id="ordem"
                  type="number"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="rota">Rota</Label>
              <Input
                id="rota"
                value={formData.rota}
                onChange={(e) => setFormData({ ...formData, rota: e.target.value })}
                placeholder="/operacional/pdv"
              />
            </div>

            <div>
              <Label htmlFor="estado">Estado (JSON)</Label>
              <Textarea
                id="estado"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                placeholder='{"openNewClientModal": true}'
              />
            </div>

            <div>
              <Label htmlFor="permissao_codigo">Código da Permissão</Label>
              <Input
                id="permissao_codigo"
                value={formData.permissao_codigo}
                onChange={(e) => setFormData({ ...formData, permissao_codigo: e.target.value })}
                placeholder="ex: pdv_criar"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label htmlFor="ativo">Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAction} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuickActionsConfigPage;
