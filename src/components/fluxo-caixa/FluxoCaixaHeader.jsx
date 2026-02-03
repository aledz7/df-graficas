import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const FluxoCaixaHeader = ({ onNovoLancamento }) => {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Fluxo de Caixa</h1>
        <p className="text-muted-foreground">Acompanhe suas entradas, saídas e saldo financeiro do dia.</p>
      </div>
      <Button onClick={onNovoLancamento} size="lg">
        <PlusCircle className="mr-2 h-5 w-5" /> Novo Lançamento Manual
      </Button>
    </header>
  );
};

export default FluxoCaixaHeader;