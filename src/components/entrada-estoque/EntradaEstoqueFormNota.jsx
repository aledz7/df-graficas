import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CalendarDays, Users as FornecedorIcon } from 'lucide-react';

const EntradaEstoqueFormNota = ({ notaInfo, setNotaInfo, fornecedores }) => {
  return (
    <Card className="bg-muted/20 dark:bg-muted/10 p-4">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-lg flex items-center">
          <FileText size={20} className="mr-2 text-gray-600 dark:text-gray-400" />
          Dados da Nota Fiscal (Opcional)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="fornecedor" className="flex items-center">
            <FornecedorIcon size={14} className="mr-1 text-gray-500" />
            Fornecedor
          </Label>
          <select
            id="fornecedor"
            value={notaInfo.fornecedor}
            onChange={(e) => setNotaInfo({ ...notaInfo, fornecedor: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-background dark:bg-card"
          >
            <option value="">Selecione...</option>
            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            {notaInfo.fornecedor && !fornecedores.find(f => f.id === notaInfo.fornecedor) && notaInfo.fornecedor.startsWith('xml-') && (
              <option value={notaInfo.fornecedor} disabled>{notaInfo.fornecedor.replace('xml-', '')} (XML)</option>
            )}
          </select>
        </div>
        <div>
          <Label htmlFor="numeroNota" className="flex items-center">
            <FileText size={14} className="mr-1 text-gray-500" />
            Nº da Nota
          </Label>
          <Input id="numeroNota" value={notaInfo.numeroNota} onChange={(e) => setNotaInfo({ ...notaInfo, numeroNota: e.target.value })} placeholder="Ex: 12345" />
        </div>
        <div>
          <Label htmlFor="dataNota" className="flex items-center">
            <CalendarDays size={14} className="mr-1 text-gray-500" />
            Data da Nota
          </Label>
          <Input id="dataNota" type="date" value={notaInfo.dataNota} onChange={(e) => setNotaInfo({ ...notaInfo, dataNota: e.target.value })} />
        </div>
      </CardContent>
    </Card>
  );
};

export default EntradaEstoqueFormNota;