import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

const TesteMenuPage = () => {
  const { permissions, hasPermission, isAdmin } = usePermissions();
  const { user } = useAuth();

  const testPermissions = [
    'gerenciar_produtos',
    'gerenciar_clientes',
    'gerenciar_fornecedores',
    'gerenciar_funcionarios',
    'config_sistema',
    'acessar_entrada_estoque'
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Teste do Menu de Cadastros</CardTitle>
          <CardDescription>
            Verificando permissões e status do usuário
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold">Status do Usuário</h3>
              <p>Nome: {user?.name}</p>
              <p>Email: {user?.email}</p>
              <p>É Admin: {isAdmin ? 'SIM' : 'NÃO'}</p>
            </div>
            <div>
              <h3 className="font-semibold">Permissões de Cadastros</h3>
              {testPermissions.map(permission => (
                <div key={permission} className="flex items-center space-x-2">
                  <span className={hasPermission(permission) ? 'text-green-600' : 'text-red-600'}>
                    {hasPermission(permission) ? '✅' : '❌'}
                  </span>
                  <span className="text-sm">{permission}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Todas as Permissões</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {Object.entries(permissions).map(([permission, hasAccess]) => (
                <div key={permission} className="flex items-center space-x-1">
                  <span className={hasAccess ? 'text-green-600' : 'text-red-600'}>
                    {hasAccess ? '●' : '○'}
                  </span>
                  <span>{permission}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TesteMenuPage; 