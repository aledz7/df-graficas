import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Eye, Edit, EyeOff } from 'lucide-react';

const OSHeader = ({ ordemServicoId, viewOnly, toggleViewMode }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl">
                Ordem de Serviço / Orçamento 
                {ordemServicoId && !ordemServicoId.toString().includes('OS-') && !ordemServicoId.toString().includes('Date') ? ` #${String(ordemServicoId)}` : ''}
              </CardTitle>
              {/* {viewOnly && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <Eye className="mr-1 h-3 w-3" />
                  Modo Visualização
                </Badge>
              )} */}
            </div>
            {/* <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">OS: {ordemServicoId}</span>
              {toggleViewMode && (
                <Button
                  variant={viewOnly ? "default" : "secondary"}
                  size="sm"
                  onClick={toggleViewMode}
                  className="min-w-[120px]"
                >
                  {viewOnly ? (
                    <>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </>
                  ) : (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Visualizar
                    </>
                  )}
                </Button>
              )}
            </div> */}
          </div>
          <CardDescription>
            {viewOnly 
              ? "Visualizando ordem de serviço em modo somente leitura. Clique em 'Editar' para modificar."
              : "Crie e gerencie ordens de serviço e orçamentos detalhados."
            }
          </CardDescription>
        </CardHeader>
      </Card>
    </motion.div>
  );
};

export default OSHeader;