import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Upload } from 'lucide-react';

const EntradaEstoqueBuscaProduto = ({ searchTerm, setSearchTerm, handleImportXML }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-center">
      <div className="relative flex-grow w-full sm:w-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar produto por nome, código ou cód. barras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full"
        />
      </div>
      <Button asChild variant="outline" className="w-full sm:w-auto">
        <label htmlFor="import-xml-entrada" className="cursor-pointer flex items-center justify-center">
          <Upload className="mr-2 h-4 w-4" /> Importar XML
          <input type="file" id="import-xml-entrada" accept=".xml" onChange={handleImportXML} className="hidden" />
        </label>
      </Button>
    </div>
  );
};

export default EntradaEstoqueBuscaProduto;