import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, X, Search } from 'lucide-react';
import { ProductAutocompleteSimple } from '@/components/ui/product-autocomplete-simple';

const AddComponenteModal = ({ 
  isOpen, 
  onClose, 
  onAddComponente, 
  allProducts, 
  currentProdutoId 
}) => {
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [quantidade, setQuantidade] = useState('1');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setProdutoSelecionado(null);
      setSearchValue('');
      setQuantidade('1');
    }
  }, [isOpen]);

  const handleAdd = () => {
    if (!produtoSelecionado || parseFloat(quantidade) <= 0) return;
    
    onAddComponente({ 
      produtoId: produtoSelecionado.id,
      nome: produtoSelecionado.nome,
      quantidade: parseFloat(quantidade) 
    });

    // Reset form after adding
    setProdutoSelecionado(null);
    setSearchValue('');
    setQuantidade('1');
    onClose();
  };

  const availableProducts = allProducts.filter(p => p.id !== currentProdutoId && !p.isComposto);

  const handleSelectProduto = (produto) => {
    setProdutoSelecionado(produto);
    setSearchValue(produto.nome);
  };

  const canAdd = produtoSelecionado && parseFloat(quantidade) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] lg:max-w-[1000px] h-[98vh] max-h-[98vh] flex flex-col p-0">
        {/* Header fixo */}
        <DialogHeader className="px-8 py-6 border-b bg-background shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Adicionar Produto Componente
          </DialogTitle>
          <DialogDescription>
            Selecione um produto e defina a quantidade para adicionar à composição do kit.
          </DialogDescription>
        </DialogHeader>

        {/* Conteúdo com rolagem */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="space-y-10">
            {/* Campo de busca do produto */}
            <div className="space-y-2">
              <Label htmlFor="modal-produto-componente" className="text-sm font-medium">
                Produto Componente *
              </Label>
              <div className="relative">
                <ProductAutocompleteSimple
                  id="modal-produto-componente"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onSelect={handleSelectProduto}
                  produtos={availableProducts}
                  placeholder="Digite o nome do produto para buscar..."
                  className="w-full"
                />
              </div>
              {searchValue && !produtoSelecionado && (
                <p className="text-xs text-muted-foreground">
                  Digite para buscar ou selecione um produto da lista
                </p>
              )}
              {produtoSelecionado && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="w-2 h-2 bg-green-500 rounded-full shrink-0"></div>
                  <span className="text-sm text-green-700 font-medium">
                    Produto selecionado: {produtoSelecionado.nome}
                  </span>
                </div>
              )}
            </div>

            {/* Campo de quantidade */}
            <div className="space-y-2">
              <Label htmlFor="modal-quantidade" className="text-sm font-medium">
                Quantidade *
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="modal-quantidade"
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  min="0.01"
                  step="0.01"
                  placeholder="1.00"
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">unidades</span>
              </div>
              {parseFloat(quantidade) <= 0 && quantidade !== '' && (
                <p className="text-xs text-red-500">
                  A quantidade deve ser maior que zero
                </p>
              )}
            </div>

            {/* Informações do produto selecionado */}
            {produtoSelecionado && (
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-base font-semibold text-blue-800 mb-4">
                  Informações do Produto
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                  <div>
                    <span className="text-blue-600 font-medium">Nome:</span>
                    <p className="text-blue-800 break-words">{produtoSelecionado.nome}</p>
                  </div>
                  {produtoSelecionado.sku && (
                    <div>
                      <span className="text-blue-600 font-medium">SKU:</span>
                      <p className="text-blue-800">{produtoSelecionado.sku}</p>
                    </div>
                  )}
                  {produtoSelecionado.preco_venda && (
                    <div>
                      <span className="text-blue-600 font-medium">Preço unitário:</span>
                      <p className="text-blue-800 font-semibold">
                        R$ {parseFloat(produtoSelecionado.preco_venda).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  )}
                  {produtoSelecionado.preco_custo && (
                    <div>
                      <span className="text-orange-600 font-medium">Custo unitário:</span>
                      <p className="text-orange-800 font-semibold">
                        R$ {parseFloat(produtoSelecionado.preco_custo).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  )}
                  {produtoSelecionado.estoque && (
                    <div>
                      <span className="text-blue-600 font-medium">Estoque disponível:</span>
                      <p className="text-blue-800 font-semibold">{produtoSelecionado.estoque} un.</p>
                    </div>
                  )}
                </div>
                
                {/* Total estimado - destaque especial */}
                {parseFloat(quantidade) > 0 && (produtoSelecionado.preco_venda || produtoSelecionado.preco_custo) && (
                  <div className="mt-6 pt-6 border-t border-blue-200 bg-blue-100/50 -mx-6 px-6 pb-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      {produtoSelecionado.preco_venda && (
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-blue-700 font-semibold text-sm">Total Venda:</span>
                            <p className="text-xl font-bold text-blue-800">
                              R$ {(parseFloat(produtoSelecionado.preco_venda) * parseFloat(quantidade)).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                          <p className="text-sm text-blue-600 mt-1">
                            {quantidade} × R$ {parseFloat(produtoSelecionado.preco_venda).toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      )}
                      {produtoSelecionado.preco_custo && (
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-orange-700 font-semibold text-sm">Total Custo:</span>
                            <p className="text-xl font-bold text-orange-800">
                              R$ {(parseFloat(produtoSelecionado.preco_custo) * parseFloat(quantidade)).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                          <p className="text-sm text-orange-600 mt-1">
                            {quantidade} × R$ {parseFloat(produtoSelecionado.preco_custo).toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer fixo */}
        <DialogFooter className="px-8 py-6 border-t bg-background shrink-0">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex items-center gap-2 flex-1 sm:flex-initial"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleAdd} 
              disabled={!canAdd}
              className="flex items-center gap-2 flex-1 sm:flex-initial"
            >
              <PlusCircle className="h-4 w-4" />
              Adicionar Componente
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddComponenteModal;
