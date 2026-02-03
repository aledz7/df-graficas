import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const allPermissions = [
  { id: 'acessar_dashboard', label: 'Acessar Dashboard', description: 'Permite visualizar a tela inicial com resumos.' },
  { id: 'acessar_pdv', label: 'Acessar PDV', description: 'Permite operar o Ponto de Venda.' },
  { id: 'acessar_os', label: 'Acessar Ordens de Serviço', description: 'Permite criar e gerenciar OS.' },
  { id: 'acessar_envelopamento', label: 'Acessar Envelopamento', description: 'Permite criar orçamentos de envelopamento.' },
  { id: 'acessar_calculadora', label: 'Acessar Calculadora', description: 'Permite usar a calculadora de custos.' },
  { id: 'acessar_marketplace', label: 'Acessar Vendas Online', description: 'Permite gerenciar vendas do marketplace.' },
  { id: 'acessar_feed', label: 'Acessar Feed de Atividades', description: 'Permite ver o feed de produção do dia.' },
  { id: 'acessar_agenda', label: 'Acessar Agenda', description: 'Permite ver a agenda de produção.' },
  { id: 'gerenciar_produtos', label: 'Gerenciar Produtos', description: 'Permite criar, editar e remover produtos.' },
  { id: 'acessar_entrada_estoque', label: 'Acessar Entrada de Estoque', description: 'Permite registrar entrada de produtos no estoque.' },
  { id: 'gerenciar_clientes', label: 'Gerenciar Clientes', description: 'Permite criar, editar e remover clientes.' },
  { id: 'gerenciar_fornecedores', label: 'Gerenciar Fornecedores', description: 'Permite gerenciar o cadastro de fornecedores.' },
  { id: 'acessar_financeiro', label: 'Acessar Financeiro', description: 'Permite ver e gerenciar Contas a Pagar/Receber e Fluxo de Caixa.' },
  { id: 'ver_relatorios', label: 'Ver Relatórios', description: 'Permite visualizar todos os relatórios.' },
  { id: 'config_sistema', label: 'Configurações Gerais do Sistema', description: 'Permite alterar configurações da empresa, aparências, etc.' },
  { id: 'config_aparencia', label: 'Configurar Aparência', description: 'Permite alterar o tema visual do sistema.' },
  { id: 'config_empresa', label: 'Configurar Dados da Empresa', description: 'Permite alterar nome, logo e outras informações da empresa.' },
  { id: 'config_precos_env', label: 'Configurar Preços de Envelopamento', description: 'Permite definir os preços base para serviços de envelopamento.' },
  { id: 'config_acabamentos_os', label: 'Configurar Acabamentos de OS', description: 'Permite gerenciar os tipos de acabamentos para Ordens de Serviço.' },
  { id: 'gerar_etiquetas', label: 'Gerar Etiquetas de Cód. de Barras', description: 'Permite acessar e usar o gerador de etiquetas.' },
  { id: 'gerenciar_lixeira', label: 'Gerenciar Lixeira', description: 'Permite ver e restaurar itens da lixeira.' },
  { id: 'gerenciar_funcionarios', label: 'Gerenciar Funcionários', description: 'Permite criar, editar e remover outros funcionários e suas permissões.' },
  { id: 'gerenciar_caixa', label: 'Gerenciar Caixa (Abrir/Fechar/Movimentar)', description: 'Permite abrir, fechar caixa e realizar sangrias/suprimentos.' },
  { id: 'ver_auditoria', label: 'Ver Logs de Auditoria', description: 'Permite visualizar os registros de ações importantes no sistema.' },
];

const FuncionarioPermissions = ({ formData, setFormData }) => {
  
  const handlePermissionChange = (permissionId, checked) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionId]: checked,
      }
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissões de Acesso</CardTitle>
        <CardDescription>
          Controle o que este funcionário pode ver e fazer no sistema. 
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {allPermissions.map(permission => (
            <div key={permission.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent/50">
                <Checkbox
                id={`perm-${permission.id}`}
                checked={!!formData.permissions?.[permission.id]}
                onCheckedChange={(checked) => handlePermissionChange(permission.id, checked)}
                className="mt-1"
                />
                <div className="grid gap-0.5 leading-tight">
                <Label htmlFor={`perm-${permission.id}`} className="font-medium cursor-pointer text-sm">
                    {permission.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                    {permission.description}
                </p>
                </div>
            </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FuncionarioPermissions;