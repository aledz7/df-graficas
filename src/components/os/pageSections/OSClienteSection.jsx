import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, UserCheck, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const OSClienteSection = ({
  clienteSelecionado,
  ordemServico,
  setOrdemServico,
  handleOpenClienteModal,
  handleClearCliente,
  isSaving,
  viewOnly,
}) => {
  const handleNomeManualChange = (e) => {
    setOrdemServico(prev => ({ ...prev, cliente_nome_manual: e.target.value, cliente_info: null }));
  };

  const clienteParaMostrar = clienteSelecionado || ordemServico?.cliente_info || null;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-sky-900/30 dark:via-gray-800/50 dark:to-blue-900/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold text-gray-700 dark:text-gray-200">
          Cliente da Ordem de Serviço
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {clienteParaMostrar ? (
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
            <div className="flex items-center space-x-3">
              <UserCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">{clienteParaMostrar.nome || clienteParaMostrar.nome_completo}</h3>
                <p className="text-sm text-green-600 dark:text-green-300">
                  {clienteParaMostrar.email && `${clienteParaMostrar.email} • `}
                  {clienteParaMostrar.telefone_principal || 'Sem telefone'}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClearCliente}
              disabled={isSaving || viewOnly}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <UserX className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Nome do cliente (opcional)"
                value={ordemServico.cliente_nome_manual || ''}
                onChange={handleNomeManualChange}
                disabled={isSaving || viewOnly}
                className="flex-1"
              />
              <Button 
                onClick={handleOpenClienteModal} 
                variant="outline"
                disabled={isSaving || viewOnly}
                className="whitespace-nowrap"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Selecionar Cliente
              </Button>
            </div>
            {ordemServico.cliente_nome_manual && (
              <p className="text-sm text-muted-foreground">
                Cliente avulso: {ordemServico.cliente_nome_manual}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OSClienteSection;