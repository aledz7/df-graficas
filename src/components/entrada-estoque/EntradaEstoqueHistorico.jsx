import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';

const EntradaEstoqueHistorico = ({ historicoEntradas, fornecedores }) => {
  
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5 text-primary" />
          Histórico de Entradas
        </CardTitle>
        <CardDescription>Últimas entradas registradas.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-180px)]">
          {historicoEntradas.length > 0 ? (
            historicoEntradas.map(entrada => (
              <div key={entrada.id} className="mb-3 p-3 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold">ID: {entrada.id ? String(entrada.id).slice(-6) : 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(entrada.data_entrada || entrada.dataEntrada).toLocaleDateString()}</p>
                </div>
                {entrada.numero_nota && <p className="text-xs">Nota: {entrada.numero_nota}</p>}
                {entrada.fornecedor_nome && <p className="text-xs">Fornecedor: {(entrada.fornecedor_nome || '').replace('xml-', '')}</p>}
                <p className="text-xs">Itens: {Array.isArray(entrada.itens) ? entrada.itens.length : 0} tipos</p>
                <p className="text-xs">Responsável: {(entrada.usuario_nome || entrada.responsavel?.nome || 'N/A')}</p>
                {entrada.status && <p className="text-xs text-green-600">Status: {entrada.status}</p>}
              </div>
            ))
          ) : (
            <p className="text-sm text-center text-muted-foreground py-8">Nenhuma entrada registrada.</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default EntradaEstoqueHistorico;