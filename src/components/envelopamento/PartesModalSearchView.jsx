import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare, PlusCircle, ImageOff } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';

const PartesModalSearchView = ({
  filteredPartes,
  searchTermPartes,
  setSearchTermPartes,
  allowMultipleSelection,
  selectedPecasMap,
  setSelectedPecasMap, // Adicionado
  toggleParteSelection,
  handleConfirmSelection,
  view, // Adicionado
  setView,
  setCurrentParte,
  setImagemPreview,
  initialParteState,
  getDisplayImage,
  onOpenChange
}) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Buscar e Selecionar Peças do Catálogo</DialogTitle>
      </DialogHeader>
      <div className="flex space-x-2 my-4">
        <Input 
          type="text" 
          placeholder="Buscar por nome, altura (m) ou largura (m)..." 
          value={searchTermPartes}
          onChange={(e) => setSearchTermPartes(e.target.value)}
          className="flex-grow"
        />
      </div>
      <ScrollArea className="h-[350px] pr-3">
        <Table>
          <TableHeader>
            <TableRow>
              {allowMultipleSelection && <TableHead className="w-[50px]">Sel.</TableHead>}
              <TableHead className="w-[60px]">IMG</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Altura (m)</TableHead>
              <TableHead className="text-center">Largura (m)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {filteredPartes.length === 0 && (
              <TableRow>
                <TableCell colSpan={allowMultipleSelection ? 5: 4} className="text-center h-24 text-muted-foreground">Nenhuma parte encontrada com os termos da busca.</TableCell>
              </TableRow>
            )}
            {filteredPartes.map((p) => {
              const alturaMBusca = p.altura ? parseFloat(p.altura).toFixed(2) : 'N/A';
              const larguraMBusca = p.largura ? parseFloat(p.largura).toFixed(2) : 'N/A';
              const displayImageSrc = getDisplayImage(p);
              return (
                  <TableRow 
                    key={p.id} 
                    onClick={() => toggleParteSelection(p)} 
                    className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedPecasMap[p.id] ? 'bg-orange-100 dark:bg-orange-800/30' : ''}`}
                  >
                    {allowMultipleSelection && (
                      <TableCell className="text-center">
                         <Checkbox checked={!!selectedPecasMap[p.id]} id={`select-parte-${p.id}`} className="border-gray-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"/>
                      </TableCell>
                    )}
                    <TableCell>
                      {displayImageSrc ? (
                        <img 
                          src={displayImageSrc} 
                          alt={p.nome} 
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500">
                          <ImageOff size={24}/>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-base">{p.nome}</TableCell>
                    <TableCell className="text-center text-base">{alturaMBusca}</TableCell>
                    <TableCell className="text-center text-base">{larguraMBusca}</TableCell>
                  </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
      <DialogFooter className="mt-4 pt-4 border-t justify-between items-center">
        <Button variant="outline" onClick={() => setView('manage')}>Gerenciar Catálogo</Button>
        <div className="flex items-center space-x-2">
           <DialogClose asChild>
              <Button variant="ghost" onClick={()=> {setSelectedPecasMap({}); onOpenChange(false); }}>Cancelar</Button>
            </DialogClose>
          {allowMultipleSelection && (
            <Button onClick={handleConfirmSelection} className="bg-orange-500 hover:bg-orange-600 text-white">
              <CheckSquare size={18} className="mr-2" /> Confirmar Seleção ({Object.values(selectedPecasMap).filter(Boolean).length})
            </Button>
          )}
        </div>
      </DialogFooter>
       { (allowMultipleSelection || view === 'search') &&  ( 
          <Button onClick={() => { setCurrentParte(initialParteState); setImagemPreview(null); setView('form'); }} className="w-full mt-3 bg-blue-500 hover:bg-blue-600 text-white">
            <PlusCircle size={18} className="mr-2" /> Criar Nova Peça para Catálogo
          </Button>
      )}
    </>
  );
};

export default PartesModalSearchView;