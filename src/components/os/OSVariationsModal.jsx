import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';

const OSVariationsModal = ({ 
  isOpen, 
  onClose, 
  variations = [], 
  onSelectVariacao, 
  productName = '' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  
  // Filtrar variações baseado no termo de busca
  const filteredVariacoes = useMemo(() => {
    if (!Array.isArray(variations)) return [];
    
    
    const variacoesComEstoque = variations.filter(v => parseFloat(v.estoque_var || 0) > 0);
    
    if (!searchTerm.trim()) return variacoesComEstoque;
    
    return variacoesComEstoque.filter(variacao => {
      const nomeVariacao = variacao.nome || '';
      const nomeCor = variacao.cor || '';
      const nomeTamanho = variacao.tamanho || '';
      const nomeCompleto = `${nomeVariacao} ${nomeCor} ${nomeTamanho}`.toLowerCase();
      
      return nomeCompleto.includes(searchTerm.toLowerCase());
    });
  }, [variations, searchTerm]);

  const handleSelectVariacao = (variacao) => {
    if (onSelectVariacao) {
      onSelectVariacao(variacao);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Selecione a Variação</DialogTitle>
          <DialogDescription className="text-sm break-words">{productName}</DialogDescription>
        </DialogHeader>
        
        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar variação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <ScrollArea className="max-h-[60vh]">

          <div className="space-y-3 py-2">
            {filteredVariacoes.map((variacao, index) => (
              <Card 
                key={variacao.id_variacao || index} 
                onClick={() => handleSelectVariacao(variacao)}
                className="p-2 sm:p-3 cursor-pointer hover:shadow-md transition-shadow border-2 border-gray-200 dark:border-gray-700 hover:border-orange-500"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    {/* Imagem da variação */}
                    <div className="flex-shrink-0">
                      <img 
                        src={variacao.imagem_url_preview || getImageUrl(variacao.imagem_url) || getImageUrl(variacao.imagem_var) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiAzNkMzNC4yMDkxIDM2IDM2IDM0LjIwOTEgMzYgMzJDMzYgMjkuNzkwOSAzNC4yMDkxIDI4IDMyIDI4QzI5Ljc5MDkgMjggMjggMjkuNzkwOSAyOCAzMkMyOCAzNC4yMDkxIDI5Ljc5MDkgMzYgMzIgMzZaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0zMiA0MEMzNi40MTgzIDQwIDQwIDM2LjQxODMgNDAgMzJDNDAgMjcuNTgxNyAzNi40MTgzIDI0IDMyIDI0QzI3LjU4MTcgMjQgMjQgMjcuNTgxNyAyNCAzMkMyNCAzNi40MTgzIDI3LjU4MTcgMjQgMzIgMjRaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo='} 
                        alt={variacao.nome || `${variacao.cor || ''} / ${variacao.tamanho || ''}`}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md border border-gray-200 dark:border-gray-700"
                        onError={(e) => {
                          // Fallback para imagem padrão se houver erro no carregamento
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiAzNkMzNC4yMDkxIDM2IDM2IDM0LjIwOTEgMzYgMzJDMzYgMjkuNzkwOSAzNC4yMDkxIDI4IDMyIDI4QzI5Ljc5MDkgMjggMjggMjkuNzkwOSAyOCAzMkMyOCAzNC4yMDkxIDI5Ljc5MDkgMzYgMzIgMzZaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0zMiA0MEMzNi40MTgzIDQwIDQwIDM2LjQxODMgNDAgMzJDNDAgMjcuNTgxNyAzNi40MTgzIDI0IDMyIDI0QzI3LjU4MTcgMjQgMjQgMjcuNTgxNyAyNCAzMkMyNCAzNi40MTgzIDI3LjU4MTcgMjQgMzIgMjRaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo=';
                        }}
                      />
                    </div>
                    
                    {/* Informações da variação */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base break-words">
                        {variacao.nome || `${variacao.cor || ''} / ${variacao.tamanho || ''}`}
                      </p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Estoque: {parseFloat(variacao.estoque_var || 0)}</p>
                        {variacao.sku && (
                          <p className="truncate">SKU: {variacao.sku}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Preço - Fica à direita no desktop, abaixo no mobile */}
                    <div className="flex-shrink-0 self-end sm:self-auto">
                      <p className="font-bold text-base sm:text-lg text-orange-600 whitespace-nowrap">
                        R$ {parseFloat(variacao.preco_var || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {filteredVariacoes.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-4">
                {searchTerm.trim() ? 'Nenhuma variação encontrada para sua busca.' : 'Nenhuma variação com estoque disponível.'}
              </p>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OSVariationsModal;
