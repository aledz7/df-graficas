import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Edit, Trash2, PlusCircle, ImageOff, Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getImageUrl } from '@/lib/imageUtils';

const PartesModalManageView = ({
  partes,
  handleEditParte,
  handleDeleteParte,
  setView,
  setCurrentParte,
  setImagemPreview,
  initialParteState,
  getDisplayImage,
  manageModeOnly,
  loading
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar partes baseado no termo de busca
  const filteredPartes = useMemo(() => {
    if (!searchTerm.trim()) return partes;
    
    const term = searchTerm.toLowerCase();
    return partes.filter(parte => 
      parte.nome?.toLowerCase().includes(term) ||
      parte.descricao?.toLowerCase().includes(term) ||
      parte.altura?.toString().includes(term) ||
      parte.largura?.toString().includes(term)
    );
  }, [partes, searchTerm]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Gerenciar Partes do Catálogo</DialogTitle>
      </DialogHeader>
      
      {/* Ferramenta de Busca */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, descrição, altura ou largura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-muted-foreground">
            {filteredPartes.length} de {partes.length} partes encontradas
          </div>
        )}
      </div>

      <ScrollArea className="h-[400px] my-4 pr-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Imagem</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Altura (m)</TableHead>
              <TableHead className="text-center">Largura (m)</TableHead>
              <TableHead className="text-right w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    <span className="ml-2">Carregando...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredPartes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  {searchTerm ? 'Nenhuma parte encontrada para sua busca.' : 'Nenhuma parte cadastrada no catálogo.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPartes.map((p) => {
                const alturaMLista = p.altura ? parseFloat(p.altura).toFixed(2) : 'N/A';
                const larguraMLista = p.largura ? parseFloat(p.largura).toFixed(2) : 'N/A';
                const displayImageSrc = getDisplayImage(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      {displayImageSrc ? (
                        <img alt={p.nome} className="w-10 h-10 object-cover rounded-sm" src={displayImageSrc} />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-sm flex items-center justify-center text-gray-500">
                          <ImageOff size={18}/>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-center">{alturaMLista}</TableCell>
                    <TableCell className="text-center">{larguraMLista}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEditParte(p)} 
                        className="text-blue-500 hover:text-blue-600"
                        disabled={loading}
                      >
                        <Edit size={16}/>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteParte(p.id)} 
                        className="text-red-500 hover:text-red-600"
                        disabled={loading}
                      >
                        <Trash2 size={16}/>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>
      <DialogFooter className="mt-2 pt-4 border-t">
        {!manageModeOnly && (
          <Button 
            variant="outline" 
            onClick={() => setView('search')}
            disabled={loading}
          >
            Voltar para Busca
          </Button>
        )}
        <DialogClose asChild>
          <Button 
            variant="ghost" 
            className={manageModeOnly ? "flex-1" : ""}
            disabled={loading}
          >
            Fechar
          </Button>
        </DialogClose>
        <Button 
          onClick={() => { 
            setCurrentParte(initialParteState); 
            setImagemPreview(null); 
            setView('form'); 
          }} 
          className="bg-orange-500 hover:bg-orange-600 text-white"
          disabled={loading}
        >
          <PlusCircle size={18} className="mr-2" /> Nova Parte para Catálogo
        </Button>
      </DialogFooter>
    </>
  );
};

export default PartesModalManageView;