import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle } from 'lucide-react';

const PermissionRoute = ({ 
  children, 
  requiredPermission, 
  requiredPermissions = [], 
  requireAny = false,
  fallbackComponent = null 
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  let hasAccess = false;

  if (requiredPermission) {
    hasAccess = hasPermission(requiredPermission);
  } else if (requiredPermissions.length > 0) {
    if (requireAny) {
      hasAccess = hasAnyPermission(requiredPermissions);
    } else {
      hasAccess = hasAllPermissions(requiredPermissions);
    }
  } else {
    // Se não especificou permissão, permite acesso
    hasAccess = true;
  }

  if (hasAccess) {
    return children;
  }

  // Componente de fallback personalizado
  if (fallbackComponent) {
    return fallbackComponent;
  }

  // Componente padrão de acesso negado
  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-600">Acesso Negado</CardTitle>
          <CardDescription>
            Você não tem permissão para acessar esta página.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Entre em contato com o administrador do sistema para solicitar acesso.
          </p>
          <Navigate to="/" replace />
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionRoute; 