import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ClipboardList } from 'lucide-react';

const OSEmProducaoHeader = ({ totalOS, searchTerm, setSearchTerm }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-3">
            <ClipboardList size={28} className="text-primary"/>
            <div>
              <CardTitle className="text-2xl">Ordens de Serviço em Produção</CardTitle>
              <CardDescription>
                Exibindo somente OS com status "Em Produção".
                {totalOS > 0 && <span className="ml-2 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{totalOS} {totalOS === 1 ? 'ordem' : 'ordens'}</span>}
              </CardDescription>
            </div>
          </div>
          <div className="relative w-full md:w-[360px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por Nº OS ou Cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

export default OSEmProducaoHeader;