import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { funcionarioService } from '@/services/funcionarioService';
import { Settings2, Shield, Clock, Plus, X, Save, ChevronRight, ChevronDown } from 'lucide-react';
import PermissionProfileModal from './PermissionProfileModal';

const diasSemana = [
  { id: 'segunda', label: 'Segunda', shortLabel: 'Segunda' },
  { id: 'terca', label: 'Terça', shortLabel: 'Terça' },
  { id: 'quarta', label: 'Quarta', shortLabel: 'Quarta' },
  { id: 'quinta', label: 'Quinta', shortLabel: 'Quinta' },
  { id: 'sexta', label: 'Sexta', shortLabel: 'Sexta' },
  { id: 'sabado', label: 'Sábado', shortLabel: 'Sábado' },
  { id: 'domingo', label: 'Domingo', shortLabel: 'Domingo' },
];

const diasSemanaLabel = {
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

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

// Gerar lista flat de todas as permissões para compatibilidade
const allPermissions = [];
permissionGroups.forEach(group => {
  group.permissions.forEach(perm => {
    allPermissions.push({ id: perm.id, label: perm.label });
    if (perm.subPermissions) {
      perm.subPermissions.forEach(sub => {
        allPermissions.push({ id: sub.id, label: sub.label });
      });
    }
  });
});

const FuncionarioPermissions = ({ formData, setFormData }) => {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [expandedPermissions, setExpandedPermissions] = useState({});
  
  // Estado para modal de horário
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [novoHorario, setNovoHorario] = useState({
    dias: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
    hora_inicio: '',
    hora_fim: '',
  });

  // Carregar perfis de permissões ao montar o componente
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setIsLoadingProfiles(true);
      const response = await funcionarioService.getPermissionProfiles();
      const data = response.data || response || [];
      setProfiles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
      setProfiles([]);
    } finally {
      setIsLoadingProfiles(false);
    }
  };
  
  const handlePermissionChange = (permissionId, checked, isMainPermission = false, subPermissions = []) => {
    setFormData(prev => {
      const newPermissions = { ...prev.permissions, [permissionId]: checked };
      
      // Se for uma permissão principal e está sendo desmarcada, desmarcar todas as subpermissões
      if (isMainPermission && !checked && subPermissions.length > 0) {
        subPermissions.forEach(sub => {
          newPermissions[sub.id] = false;
        });
      }
      
      // Se for uma permissão principal e está sendo marcada, marcar todas as subpermissões
      if (isMainPermission && checked && subPermissions.length > 0) {
        subPermissions.forEach(sub => {
          newPermissions[sub.id] = true;
        });
      }
      
      return { ...prev, permissions: newPermissions };
    });
    // Limpar seleção de perfil quando mudar manualmente
    setSelectedProfile('');
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
    setSelectedProfile('');
  };

  const toggleExpanded = (permId) => {
    setExpandedPermissions(prev => ({
      ...prev,
      [permId]: !prev[permId]
    }));
  };

  // Verificar estado de "indeterminate" (algumas subpermissões marcadas)
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

  const handleProfileSelect = (profileId) => {
    if (!profileId || profileId === 'manual') {
      setSelectedProfile('');
      return;
    }

    const profile = profiles.find(p => p.id.toString() === profileId);
    if (profile) {
      const permissions = typeof profile.permissions === 'string' 
        ? JSON.parse(profile.permissions) 
        : (profile.permissions || {});
      
      setFormData(prev => ({
        ...prev,
        permissions: permissions
      }));
      setSelectedProfile(profileId);
    }
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
    setSelectedProfile('');
  };

  const handleDeselectAll = () => {
    setFormData(prev => ({
      ...prev,
      permissions: {}
    }));
    setSelectedProfile('');
  };

  const handleProfileModalClose = () => {
    setShowProfileModal(false);
    // Recarregar perfis após fechar o modal
    loadProfiles();
  };

  const countActivePermissions = () => {
    if (!formData.permissions) return 0;
    return Object.values(formData.permissions).filter(v => v === true).length;
  };

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

  // Funções para gerenciar horários de acesso
  const handleAddHorario = () => {
    if (!novoHorario.hora_inicio || !novoHorario.hora_fim || novoHorario.dias.length === 0) {
      return;
    }

    const horario = {
      id: `h-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dias: novoHorario.dias,
      hora_inicio: novoHorario.hora_inicio,
      hora_fim: novoHorario.hora_fim,
    };

    setFormData(prev => ({
      ...prev,
      access_schedule: [...(prev.access_schedule || []), horario]
    }));

    // Resetar modal
    setNovoHorario({
      dias: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
      hora_inicio: '',
      hora_fim: '',
    });
    setShowHorarioModal(false);
  };

  const handleRemoveHorario = (horarioId) => {
    setFormData(prev => ({
      ...prev,
      access_schedule: (prev.access_schedule || []).filter(h => h.id !== horarioId)
    }));
  };

  const handleDiaToggle = (diaId) => {
    setNovoHorario(prev => ({
      ...prev,
      dias: prev.dias.includes(diaId)
        ? prev.dias.filter(d => d !== diaId)
        : [...prev.dias, diaId]
    }));
  };

  // Organizar horários por dia da semana para exibição
  const getHorariosPorDia = () => {
    const horarios = formData.access_schedule || [];
    const porDia = {};

    diasSemana.forEach(dia => {
      porDia[dia.id] = [];
    });

    horarios.forEach(horario => {
      horario.dias.forEach(diaId => {
        if (porDia[diaId]) {
          porDia[diaId].push(horario);
        }
      });
    });

    return porDia;
  };

  const horariosPorDia = getHorariosPorDia();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permissões de Acesso
              </CardTitle>
              <CardDescription className="mt-1">
                Controle o que este funcionário pode ver e fazer no sistema. 
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProfileModal(true)}
              className="shrink-0"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Gerenciar Perfis
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de Perfil e Ações Rápidas */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block">Aplicar Perfil de Permissões</Label>
              <Select 
                value={selectedProfile} 
                onValueChange={handleProfileSelect}
                disabled={isLoadingProfiles}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    isLoadingProfiles 
                      ? "Carregando perfis..." 
                      : profiles.length === 0 
                        ? "Nenhum perfil cadastrado" 
                        : "Selecione um perfil..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">
                    <span className="text-muted-foreground">Configuração Manual</span>
                  </SelectItem>
                  {profiles.length > 0 && <Separator className="my-1" />}
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id.toString()}>
                      <div className="flex flex-col">
                        <span>{profile.nome}</span>
                        {profile.descricao && (
                          <span className="text-xs text-muted-foreground">{profile.descricao}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {profiles.length === 0 && !isLoadingProfiles && (
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em "Gerenciar Perfis" para criar perfis de permissões pré-definidos.
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Marcar Todas
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                Desmarcar Todas
              </Button>
            </div>
          </div>

          {/* Contador de permissões */}
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <span>
              {countActivePermissions()} de {countTotalPermissions()} permissões ativas
            </span>
            {selectedProfile && (
              <span className="text-primary font-medium">
                Perfil aplicado: {profiles.find(p => p.id.toString() === selectedProfile)?.nome}
              </span>
            )}
          </div>

          <Separator />

          {/* Lista de Permissões Hierárquica */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          className={`flex items-center gap-2 px-3 py-2.5 ${
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
                            id={`perm-${permission.id}`}
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
                            htmlFor={`perm-${permission.id}`}
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
                                className="flex items-center gap-2 pl-10 pr-3 py-2 hover:bg-accent/50"
                              >
                                <Checkbox
                                  id={`perm-${sub.id}`}
                                  checked={!!formData.permissions?.[sub.id]}
                                  onCheckedChange={(checked) => handleSubPermissionChange(
                                    sub.id, 
                                    checked, 
                                    permission.id,
                                    permission.subPermissions
                                  )}
                                />
                                <Label 
                                  htmlFor={`perm-${sub.id}`}
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
        </CardContent>
      </Card>

      {/* Card de Controle de Horários de Acesso */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Permissões dia/hora
              </CardTitle>
              <CardDescription className="mt-1">
                Defina em quais dias e horários este funcionário pode acessar o sistema.
              </CardDescription>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowHorarioModal(true)}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar horário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            {diasSemana.map((dia, index) => {
              const horariosNoDia = horariosPorDia[dia.id] || [];
              return (
                <div
                  key={dia.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    index !== diasSemana.length - 1 ? 'border-b' : ''
                  } ${horariosNoDia.length > 0 ? 'bg-background' : 'bg-muted/30'}`}
                >
                  <span className="font-medium text-sm">
                    {diasSemanaLabel[dia.id]}
                  </span>
                  <div className="flex items-center gap-2">
                    {horariosNoDia.length > 0 ? (
                      horariosNoDia.map(horario => (
                        <div key={horario.id} className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {horario.hora_inicio} às {horario.hora_fim}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveHorario(horario.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        Sem restrição
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {(formData.access_schedule?.length > 0) && (
            <p className="text-xs text-muted-foreground mt-3">
              O funcionário só poderá acessar o sistema nos dias e horários definidos acima.
            </p>
          )}
          {(!formData.access_schedule || formData.access_schedule.length === 0) && (
            <p className="text-xs text-muted-foreground mt-3">
              Nenhuma restrição de horário configurada. O funcionário pode acessar a qualquer momento.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modal de Gerenciamento de Perfis */}
      <PermissionProfileModal
        isOpen={showProfileModal}
        onClose={handleProfileModalClose}
      />

      {/* Modal de Adicionar Horário */}
      <Dialog open={showHorarioModal} onOpenChange={setShowHorarioModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionando horário
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Seleção de dias */}
            <div>
              <div className="flex flex-wrap gap-2">
                {diasSemana.map(dia => (
                  <label
                    key={dia.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded border cursor-pointer transition-colors ${
                      novoHorario.dias.includes(dia.id)
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-muted/50 border-border hover:bg-muted'
                    }`}
                  >
                    <Checkbox
                      checked={novoHorario.dias.includes(dia.id)}
                      onCheckedChange={() => handleDiaToggle(dia.id)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium">{dia.shortLabel}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Campos de hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hora_inicio" className="text-sm">
                  Hora de inicial:
                </Label>
                <Input
                  id="hora_inicio"
                  type="time"
                  value={novoHorario.hora_inicio}
                  onChange={(e) => setNovoHorario(prev => ({ ...prev, hora_inicio: e.target.value }))}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_fim" className="text-sm">
                  Hora de final:
                </Label>
                <Input
                  id="hora_fim"
                  type="time"
                  value={novoHorario.hora_fim}
                  onChange={(e) => setNovoHorario(prev => ({ ...prev, hora_fim: e.target.value }))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowHorarioModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddHorario}
              disabled={!novoHorario.hora_inicio || !novoHorario.hora_fim || novoHorario.dias.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FuncionarioPermissions;
