import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Image as ImageIcon, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';

const ProductAutocomplete = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Digite o nome do produto...", 
  disabled = false,
  produtos = [],
  className = "",
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Debounce da busca
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtrar produtos baseado no termo de busca
  const filteredProducts = useMemo(() => {
    if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) {
      return [];
    }

    const term = debouncedSearchTerm.toLowerCase();
    return produtos.filter(produto => 
      produto.nome && 
      produto.nome.toLowerCase().includes(term) &&
      ((produto.unidade_medida || produto.unidadeMedida) === 'unidade' || ((produto.unidade_medida || produto.unidadeMedida) !== 'm2' && (produto.unidade_medida || produto.unidadeMedida) !== 'metro_linear'))
    ).slice(0, 10); // Limitar a 10 resultados
  }, [produtos, debouncedSearchTerm]);

  // Atualizar o valor do input quando o valor externo mudar
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setHighlightedIndex(-1);
    
    // Criar um evento sintético com o nome correto para o onChange
    const syntheticEvent = {
      target: {
        name: 'nome_produto',
        value: newValue
      }
    };
    
    if (onChange) {
      onChange(syntheticEvent);
    }

    // Abrir popover se há texto e fechar se estiver vazio
    if (newValue.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelectProduct = (produto) => {
    setSearchTerm(produto.nome);
    setIsOpen(false);
    setHighlightedIndex(-1);
    
    // Manter o foco no input após seleção
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    
    if (onSelect) {
      onSelect(produto);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen || filteredProducts.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredProducts.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
          handleSelectProduct(filteredProducts[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    if (searchTerm.length >= 2) {
      setIsOpen(true);
    }
    // Garantir que o input mantenha o foco
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleBlur = (e) => {
    // Delay para permitir cliques nos itens da lista
    setTimeout(() => {
      // Verificar se o foco ainda está no input ou em elementos relacionados
      const activeElement = document.activeElement;
      const isInputFocused = activeElement === inputRef.current;
      const isPopoverFocused = activeElement && activeElement.closest('[data-radix-popper-content-wrapper]');
      
      if (!isInputFocused && !isPopoverFocused) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, 150);
  };

  // Scroll para o item destacado
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pl-10", className)}
          {...props}
        />
      </div>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverContent 
          className="w-[400px] p-0" 
          align="start"
          side="bottom"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {filteredProducts.length > 0 ? (
            <ScrollArea className="max-h-[300px]">
              <div ref={listRef} className="p-2 space-y-1">
                {filteredProducts.map((produto, index) => (
                  <Card
                    key={produto.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-accent",
                      highlightedIndex === index && "bg-accent"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectProduct(produto);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        {/* Imagem do produto */}
                        <div className="flex-shrink-0">
                          {produto.imagem_principal ? (
                            <img
                              src={getImageUrl(produto.imagem_principal)}
                              alt={produto.nome}
                              className="w-12 h-12 rounded-md object-cover border"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-12 h-12 rounded-md bg-muted flex items-center justify-center border"
                            style={{ display: produto.imagem_principal ? 'none' : 'flex' }}
                          >
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        </div>
                        
                        {/* Informações do produto */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <p className="text-sm font-medium text-foreground truncate">
                              {produto.nome}
                            </p>
                          </div>
                          
                          {produto.preco_venda && (
                            <p className="text-xs text-muted-foreground mt-1">
                              R$ {parseFloat(produto.preco_venda).toFixed(2).replace('.', ',')}
                            </p>
                          )}
                          
                          {produto.sku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {produto.sku}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : debouncedSearchTerm.length >= 2 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado para "{debouncedSearchTerm}"
            </div>
          ) : produtos.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum produto cadastrado
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export { ProductAutocomplete };
