import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { funcionarioService } from '@/services/funcionarioService';
import { Plus, Pencil, Trash2, Save, Loader2, Shield, X, Copy, ChevronRight, ChevronDown } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Estrutura hierárquica de permissões com grupos e subpermissões
const permissionGroups = [
  {
    id: 'dashboard',
    label: 'DASHBOARD',
    permissions: [
      { 
        id: 'acessar_dashboard', 
        label: 'Dashboard',
        subPermissions: [
          { id: 'dashboard_ver_vendas', label: 'Visualizar resumo de vendas' },
          { id: 'dashboard_ver_os', label: 'Visualizar resumo de OS' },
          { id: 'dashboard_ver_financeiro', label: 'Visualizar resumo financeiro' },
          { id: 'dashboard_ver_graficos', label: 'Visualizar gráficos' },
          { id: 'agenda_ver', label: 'Visualizar resumo da agenda' },
          { id: 'agenda_criar', label: 'Criar novos compromissos' },
          { id: 'envelopamento_ver', label: 'Visualizar resumo de envelopamento' },
        ]
      },
    ]
  },
  {
    id: 'vendas',
    label: 'VENDAS',
    permissions: [
      { 
        id: 'acessar_pdv', 
        label: 'PDV (Ponto de Venda)',
        subPermissions: [
          { id: 'pdv_criar_venda', label: 'Criar nova venda' },
          { id: 'pdv_aplicar_desconto', label: 'Aplicar desconto' },
          { id: 'pdv_cancelar_venda', label: 'Cancelar venda' },
          { id: 'pdv_alterar_preco', label: 'Alterar preço na venda' },
        ]
      },
      { 
        id: 'acessar_os', 
        label: 'Ordens de Serviço',
        subPermissions: [
          { id: 'os_criar', label: 'Criar nova OS' },
          { id: 'os_editar', label: 'Editar OS existente' },
          { id: 'os_cancelar', label: 'Cancelar OS' },
          { id: 'os_alterar_status', label: 'Alterar status da OS' },
          { id: 'os_aplicar_desconto', label: 'Aplicar desconto na OS' },
          { id: 'os_alterar_preco', label: 'Alterar preços na OS' },
          { id: 'os_excluir', label: 'Excluir OS' },
        ]
      },
      { 
        id: 'acessar_envelopamento', 
        label: 'Envelopamento',
        subPermissions: [
          { id: 'env_criar_orcamento', label: 'Criar orçamento' },
          { id: 'env_editar', label: 'Editar orçamento' },
          { id: 'env_converter_os', label: 'Converter em OS' },
        ]
      },
      { 
        id: 'acessar_marketplace', 
        label: 'Vendas Online',
        subPermissions: [
          { id: 'marketplace_ver', label: 'Visualizar pedidos' },
          { id: 'marketplace_processar', label: 'Processar pedidos' },
          { id: 'marketplace_cancelar', label: 'Cancelar pedidos' },
        ]
      },
    ]
  },
  {
    id: 'cadastros',
    label: 'CADASTROS',
    permissions: [
      { 
        id: 'gerenciar_clientes', 
        label: 'Clientes',
        subPermissions: [
          { id: 'clientes_cadastrar', label: 'Cadastrar novo cliente' },
          { id: 'clientes_editar', label: 'Alterar cadastro de cliente' },
          { id: 'clientes_ativar_desativar', label: 'Ativar e desativar clientes' },
          { id: 'clientes_alterar_senha', label: 'Alterar senha de clientes' },
          { id: 'clientes_desconto', label: 'Conceder desconto personalizado' },
          { id: 'clientes_excluir', label: 'Excluir cadastro de cliente' },
          { id: 'clientes_logar_como', label: 'Logar como o cliente no painel' },
          { id: 'clientes_exportar', label: 'Exportar lista de clientes' },
        ]
      },
      { 
        id: 'gerenciar_produtos', 
        label: 'Produtos',
        subPermissions: [
          { id: 'produtos_cadastrar', label: 'Cadastrar novo produto' },
          { id: 'produtos_editar', label: 'Editar produto' },
          { id: 'produtos_ver_custo', label: 'Visualizar custos' },
          { id: 'produtos_alterar_preco', label: 'Alterar preços' },
          { id: 'produtos_alterar_estoque', label: 'Alterar estoque manualmente' },
          { id: 'produtos_excluir', label: 'Excluir produto' },
        ]
      },
      { 
        id: 'gerenciar_fornecedores', 
        label: 'Fornecedores',
        subPermissions: [
          { id: 'fornecedores_cadastrar', label: 'Cadastrar fornecedor' },
          { id: 'fornecedores_editar', label: 'Editar fornecedor' },
          { id: 'fornecedores_excluir', label: 'Excluir fornecedor' },
        ]
      },
      { 
        id: 'acessar_entrada_estoque', 
        label: 'Entrada de Estoque',
        subPermissions: [
          { id: 'estoque_registrar_entrada', label: 'Registrar entrada' },
          { id: 'estoque_ver_historico', label: 'Ver histórico de entradas' },
          { id: 'estoque_cancelar_entrada', label: 'Cancelar entrada' },
        ]
      },
    ]
  },
  {
    id: 'producao',
    label: 'PRODUÇÃO',
    permissions: [
      { 
        id: 'acessar_feed', 
        label: 'Feed de Atividades',
        subPermissions: [
          { id: 'feed_ver', label: 'Visualizar feed' },
          { id: 'feed_atualizar_status', label: 'Atualizar status de produção' },
        ]
      },
      { 
        id: 'acessar_agenda', 
        label: 'Agenda de Produção',
        subPermissions: [
          { id: 'agenda_ver', label: 'Visualizar agenda' },
          { id: 'agenda_editar', label: 'Editar agendamentos' },
        ]
      },
    ]
  },
  {
    id: 'financeiro',
    label: 'FINANCEIRO',
    permissions: [
      { 
        id: 'acessar_financeiro', 
        label: 'Financeiro',
        subPermissions: [
          { id: 'financeiro_contas_pagar', label: 'Gerenciar contas a pagar' },
          { id: 'financeiro_contas_receber', label: 'Gerenciar contas a receber' },
          { id: 'financeiro_fluxo_caixa', label: 'Visualizar fluxo de caixa' },
          { id: 'financeiro_baixar_titulos', label: 'Baixar títulos' },
          { id: 'financeiro_estornar', label: 'Estornar pagamentos' },
        ]
      },
      { 
        id: 'gerenciar_caixa', 
        label: 'Controle de Caixa',
        subPermissions: [
          { id: 'caixa_abrir', label: 'Abrir caixa' },
          { id: 'caixa_fechar', label: 'Fechar caixa' },
          { id: 'caixa_sangria', label: 'Realizar sangria' },
          { id: 'caixa_suprimento', label: 'Realizar suprimento' },
          { id: 'caixa_ver_outros', label: 'Ver caixa de outros funcionários' },
        ]
      },
      { 
        id: 'ver_relatorios', 
        label: 'Relatórios',
        subPermissions: [
          { id: 'relatorios_vendas', label: 'Relatórios de vendas' },
          { id: 'relatorios_financeiros', label: 'Relatórios financeiros' },
          { id: 'relatorios_estoque', label: 'Relatórios de estoque' },
          { id: 'relatorios_clientes', label: 'Relatórios de clientes' },
          { id: 'relatorios_exportar', label: 'Exportar relatórios' },
        ]
      },
    ]
  },
  {
    id: 'ferramentas',
    label: 'FERRAMENTAS',
    permissions: [
      { 
        id: 'acessar_calculadora', 
        label: 'Calculadora de Custos',
        subPermissions: []
      },
      { 
        id: 'gerar_etiquetas', 
        label: 'Gerador de Etiquetas',
        subPermissions: []
      },
      { 
        id: 'gerenciar_lixeira', 
        label: 'Lixeira',
        subPermissions: [
          { id: 'lixeira_ver', label: 'Visualizar lixeira' },
          { id: 'lixeira_restaurar', label: 'Restaurar itens' },
          { id: 'lixeira_excluir_permanente', label: 'Excluir permanentemente' },
        ]
      },
    ]
  },
  {
    id: 'configuracoes',
    label: 'CONFIGURAÇÕES',
    permissions: [
      { 
        id: 'config_sistema', 
        label: 'Configurações do Sistema',
        subPermissions: [
          { id: 'config_geral', label: 'Configurações gerais' },
          { id: 'config_impostos', label: 'Configurar impostos' },
          { id: 'config_formas_pagto', label: 'Formas de pagamento' },
        ]
      },
      { 
        id: 'config_aparencia', 
        label: 'Aparência',
        subPermissions: []
      },
      { 
        id: 'config_empresa', 
        label: 'Dados da Empresa',
        subPermissions: []
      },
      { 
        id: 'config_precos_env', 
        label: 'Preços de Envelopamento',
        subPermissions: []
      },
      { 
        id: 'config_acabamentos_os', 
        label: 'Acabamentos de OS',
        subPermissions: []
      },
      { 
        id: 'gerenciar_funcionarios', 
        label: 'Funcionários',
        subPermissions: [
          { id: 'funcionarios_cadastrar', label: 'Cadastrar funcionário' },
          { id: 'funcionarios_editar', label: 'Editar funcionário' },
          { id: 'funcionarios_permissoes', label: 'Gerenciar permissões' },
          { id: 'funcionarios_excluir', label: 'Excluir funcionário' },
        ]
      },
      { 
        id: 'ver_auditoria', 
        label: 'Logs de Auditoria',
        subPermissions: []
      },
    ]
  },
];

// Calcular total de permissões
const countTotalPermissions = () => {
  let count = 0;
  permissionGroups.forEach(group => {
    group.permissions.forEach(perm => {
      count++;
      if (perm.subPermissions) {
        count += perm.subPermissions.length;
      }
    });
  });
  return count;
};

const PermissionProfileModal = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedPermissions, setExpandedPermissions] = useState({});
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    permissions: {}
  });

  // Carregar perfis ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      const response = await funcionarioService.getPermissionProfiles();
      const data = response.data || response || [];
      setProfiles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os perfis de permissões.',
        variant: 'destructive'
      });
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewProfile = () => {
    setEditingProfile(null);
    setFormData({
      nome: '',
      descricao: '',
      permissions: {}
    });
    setShowForm(true);
  };

  const handleEditProfile = (profile) => {
    setEditingProfile(profile);
    setFormData({
      nome: profile.nome,
      descricao: profile.descricao || '',
      permissions: typeof profile.permissions === 'string' 
        ? JSON.parse(profile.permissions) 
        : (profile.permissions || {})
    });
    setShowForm(true);
  };

  const handleDuplicateProfile = (profile) => {
    setEditingProfile(null);
    const permissions = typeof profile.permissions === 'string' 
      ? JSON.parse(profile.permissions) 
      : (profile.permissions || {});
    setFormData({
      nome: `${profile.nome} (Cópia)`,
      descricao: profile.descricao || '',
      permissions: permissions
    });
    setShowForm(true);
  };

  const handleDeleteProfile = async () => {
    if (!deleteConfirm) return;
    
    try {
      setIsSaving(true);
      await funcionarioService.deletePermissionProfile(deleteConfirm.id);
      toast({
        title: 'Sucesso!',
        description: 'Perfil excluído com sucesso.'
      });
      setDeleteConfirm(null);
      loadProfiles();
    } catch (error) {
      console.error('Erro ao excluir perfil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o perfil.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermissionChange = (permissionId, checked, isMainPermission = false, subPermissions = []) => {
    setFormData(prev => {
      const newPermissions = { ...prev.permissions, [permissionId]: checked };
      
      // Se for uma permissão principal, marcar/desmarcar todas as subpermissões
      if (isMainPermission && subPermissions.length > 0) {
        subPermissions.forEach(sub => {
          newPermissions[sub.id] = checked;
        });
      }
      
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSubPermissionChange = (subPermId, checked, mainPermId, allSubPermissions) => {
    setFormData(prev => {
      const newPermissions = { ...prev.permissions, [subPermId]: checked };
      
      // Se pelo menos uma subpermissão está marcada, marcar a principal
      const hasAnySub = allSubPermissions.some(sub => 
        sub.id === subPermId ? checked : prev.permissions?.[sub.id]
      );
      
      if (hasAnySub) {
        newPermissions[mainPermId] = true;
      }
      
      return { ...prev, permissions: newPermissions };
    });
  };

  const toggleExpanded = (permId) => {
    setExpandedPermissions(prev => ({
      ...prev,
      [permId]: !prev[permId]
    }));
  };

  const getPermissionState = (permission) => {
    if (!permission.subPermissions || permission.subPermissions.length === 0) {
      return {
        checked: !!formData.permissions?.[permission.id],
        indeterminate: false
      };
    }
    
    const mainChecked = !!formData.permissions?.[permission.id];
    const subCheckedCount = permission.subPermissions.filter(
      sub => !!formData.permissions?.[sub.id]
    ).length;
    
    if (subCheckedCount === 0 && !mainChecked) {
      return { checked: false, indeterminate: false };
    }
    if (subCheckedCount === permission.subPermissions.length) {
      return { checked: true, indeterminate: false };
    }
    return { checked: mainChecked, indeterminate: subCheckedCount > 0 };
  };

  const handleSelectAll = () => {
    const newPermissions = {};
    permissionGroups.forEach(group => {
      group.permissions.forEach(perm => {
        newPermissions[perm.id] = true;
        if (perm.subPermissions) {
          perm.subPermissions.forEach(sub => {
            newPermissions[sub.id] = true;
          });
        }
      });
    });
    setFormData(prev => ({
      ...prev,
      permissions: newPermissions
    }));
  };

  const handleDeselectAll = () => {
    setFormData(prev => ({
      ...prev,
      permissions: {}
    }));
  };

  const handleSaveProfile = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: 'Atenção',
        description: 'O nome do perfil é obrigatório.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSaving(true);
      const dataToSave = {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim(),
        permissions: formData.permissions
      };

      if (editingProfile) {
        await funcionarioService.updatePermissionProfile(editingProfile.id, dataToSave);
        toast({
          title: 'Sucesso!',
          description: 'Perfil atualizado com sucesso.'
        });
      } else {
        await funcionarioService.createPermissionProfile(dataToSave);
        toast({
          title: 'Sucesso!',
          description: 'Perfil criado com sucesso.'
        });
      }

      setShowForm(false);
      loadProfiles();
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o perfil.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const countActivePermissions = (permissions) => {
    if (!permissions) return 0;
    const perms = typeof permissions === 'string' ? JSON.parse(permissions) : permissions;
    return Object.values(perms).filter(v => v === true).length;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Gerenciar Perfis de Permissões
            </DialogTitle>
            <DialogDescription>
              Crie e gerencie perfis de permissões pré-definidos para aplicar rapidamente em novos funcionários.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden p-6">
            {!showForm ? (
              // Lista de perfis
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    Perfis Cadastrados ({profiles.length})
                  </h3>
                  <Button onClick={handleNewProfile}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Perfil
                  </Button>
                </div>

                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : profiles.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <Shield className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhum perfil cadastrado</p>
                    <p className="text-sm">Clique em "Novo Perfil" para criar o primeiro.</p>
                  </div>
                ) : (
                  <ScrollArea className="flex-1">
                    <div className="grid gap-4">
                      {profiles.map(profile => (
                        <Card key={profile.id} className="hover:bg-accent/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-base">{profile.nome}</h4>
                                {profile.descricao && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {profile.descricao}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {countActivePermissions(profile.permissions)} permissões ativas
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDuplicateProfile(profile)}
                                  title="Duplicar perfil"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditProfile(profile)}
                                  title="Editar perfil"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteConfirm(profile)}
                                  title="Excluir perfil"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            ) : (
              // Formulário de criação/edição
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingProfile ? 'Editar Perfil' : 'Novo Perfil'}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome do Perfil *</Label>
                      <Input
                        id="nome"
                        placeholder="Ex: Vendedor, Gerente, Produção..."
                        value={formData.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Input
                        id="descricao"
                        placeholder="Descrição opcional do perfil"
                        value={formData.descricao}
                        onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <Card className="flex-1 flex flex-col overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Permissões</CardTitle>
                        <CardDescription>
                          Selecione as permissões que este perfil terá.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleSelectAll}>
                          Marcar Todas
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                          Desmarcar Todas
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full px-6 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {permissionGroups.map(group => (
                          <div key={group.id} className="space-y-2">
                            <h4 className="text-xs font-bold text-muted-foreground tracking-wider uppercase px-2">
                              {group.label}
                            </h4>
                            <div className="border rounded-lg divide-y">
                              {group.permissions.map(permission => {
                                const { checked, indeterminate } = getPermissionState(permission);
                                const hasSubPermissions = permission.subPermissions && permission.subPermissions.length > 0;
                                const isExpanded = expandedPermissions[permission.id];
                                
                                return (
                                  <div key={permission.id}>
                                    <div 
                                      className={`flex items-center gap-2 px-3 py-2 ${
                                        hasSubPermissions ? 'cursor-pointer hover:bg-accent/50' : ''
                                      } ${checked ? 'bg-primary/5' : ''}`}
                                      onClick={() => hasSubPermissions && toggleExpanded(permission.id)}
                                    >
                                      {hasSubPermissions && (
                                        <div className="text-muted-foreground">
                                          {isExpanded ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                        </div>
                                      )}
                                      {!hasSubPermissions && <div className="w-4" />}
                                      <Checkbox
                                        id={`profile-perm-${permission.id}`}
                                        checked={checked}
                                        ref={(el) => {
                                          if (el) {
                                            el.indeterminate = indeterminate;
                                          }
                                        }}
                                        onCheckedChange={(checked) => handlePermissionChange(
                                          permission.id, 
                                          checked, 
                                          true, 
                                          permission.subPermissions || []
                                        )}
                                        onClick={(e) => e.stopPropagation()}
                                        className={indeterminate ? 'opacity-70' : ''}
                                      />
                                      <Label 
                                        htmlFor={`profile-perm-${permission.id}`}
                                        className="flex-1 font-medium text-sm cursor-pointer"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {permission.label}
                                      </Label>
                                      {hasSubPermissions && (
                                        <span className="text-xs text-muted-foreground">
                                          {permission.subPermissions.filter(s => formData.permissions?.[s.id]).length}/{permission.subPermissions.length}
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Subpermissões */}
                                    {hasSubPermissions && isExpanded && (
                                      <div className="bg-muted/30 border-t">
                                        {permission.subPermissions.map(sub => (
                                          <div 
                                            key={sub.id}
                                            className="flex items-center gap-2 pl-10 pr-3 py-1.5 hover:bg-accent/50"
                                          >
                                            <Checkbox
                                              id={`profile-perm-${sub.id}`}
                                              checked={!!formData.permissions?.[sub.id]}
                                              onCheckedChange={(checked) => handleSubPermissionChange(
                                                sub.id, 
                                                checked, 
                                                permission.id,
                                                permission.subPermissions
                                              )}
                                            />
                                            <Label 
                                              htmlFor={`profile-perm-${sub.id}`}
                                              className="text-sm cursor-pointer text-muted-foreground hover:text-foreground"
                                            >
                                              {sub.label}
                                            </Label>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowForm(false)} disabled={isSaving}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {editingProfile ? 'Atualizar' : 'Salvar'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!showForm && (
            <DialogFooter className="p-6 pt-0">
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Perfil</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o perfil "{deleteConfirm?.nome}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProfile}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PermissionProfileModal;
