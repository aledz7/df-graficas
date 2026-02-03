import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const ExemploPermissoesPage = () => {
  const { permissions, hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = usePermissions();

  const testPermissions = [
    'acessar_dashboard',
    'acessar_pdv',
    'gerenciar_produtos',
    'config_sistema'
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Sistema de Permissões</h1>
      </div>

      {/* Status do Usuário */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Usuário</CardTitle>
          <CardDescription>
            Informações sobre suas permissões no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Badge variant={isAdmin ? "default" : "secondary"}>
              {isAdmin ? "Administrador" : "Funcionário"}
            </Badge>
            {isAdmin && (
              <span className="text-sm text-muted-foreground">
                Você tem acesso total ao sistema
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {testPermissions.map(permission => (
              <div key={permission} className="flex items-center space-x-2 p-3 border rounded-lg">
                {hasPermission(permission) ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">{permission}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Testes de Permissões */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Teste de Permissões Individuais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {testPermissions.map(permission => (
              <div key={permission} className="flex items-center justify-between">
                <span className="text-sm">{permission}</span>
                <Button 
                  variant={hasPermission(permission) ? "default" : "outline"}
                  size="sm"
                  disabled={!hasPermission(permission)}
                >
                  {hasPermission(permission) ? "Acessar" : "Sem Permissão"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teste de Múltiplas Permissões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Qualquer permissão de PDV ou Produtos</span>
              <Button 
                variant={hasAnyPermission(['acessar_pdv', 'gerenciar_produtos']) ? "default" : "outline"}
                size="sm"
                disabled={!hasAnyPermission(['acessar_pdv', 'gerenciar_produtos'])}
              >
                {hasAnyPermission(['acessar_pdv', 'gerenciar_produtos']) ? "Acessar" : "Sem Permissão"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Todas as permissões básicas</span>
              <Button 
                variant={hasAllPermissions(['acessar_dashboard', 'acessar_pdv']) ? "default" : "outline"}
                size="sm"
                disabled={!hasAllPermissions(['acessar_dashboard', 'acessar_pdv'])}
              >
                {hasAllPermissions(['acessar_dashboard', 'acessar_pdv']) ? "Acessar" : "Sem Permissão"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Todas as Permissões */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Permissões</CardTitle>
          <CardDescription>
            Lista completa de permissões e seus status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(permissions).map(([permission, hasAccess]) => (
              <div key={permission} className="flex items-center space-x-2 p-2 border rounded">
                {hasAccess ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">{permission}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Como Usar */}
      <Card>
        <CardHeader>
          <CardTitle>Como Usar o Sistema de Permissões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">1. Em Componentes:</h4>
            <pre className="text-sm">
{`const { hasPermission } = usePermissions();

if (hasPermission('acessar_pdv')) {
  return <PDVComponent />;
}`}
            </pre>
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">2. Em Rotas:</h4>
            <pre className="text-sm">
{`<PermissionRoute requiredPermission="gerenciar_produtos">
  <ProdutosPage />
</PermissionRoute>`}
            </pre>
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">3. Múltiplas Permissões:</h4>
            <pre className="text-sm">
{`<PermissionRoute 
  requiredPermissions={['acessar_pdv', 'gerenciar_produtos']}
  requireAny={true}
>
  <VendasPage />
</PermissionRoute>`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExemploPermissoesPage; 