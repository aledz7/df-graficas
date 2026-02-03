import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

const CategoryAutocomplete = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Digite o nome da categoria...", 
  disabled = false,
  categories = [],
  className = "",
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  // Debounce da busca
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtrar categorias baseado no termo de busca
  const filteredCategories = useMemo(() => {
    const term = debouncedSearchTerm ? debouncedSearchTerm.toLowerCase() : '';
    
    // Se não há termo de busca, mostrar todas as categorias
    if (!term || term.length < 1) {
      return categories;
    }

    // Se há termo de busca, filtrar
    const filtered = categories.filter(categoria => 
      categoria.nome && 
      categoria.nome.toLowerCase().includes(term)
    );
    
    return filtered;
  }, [categories, debouncedSearchTerm]);

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
        name: 'categoria',
        value: newValue
      }
    };
    
    if (onChange) {
      onChange(syntheticEvent);
    }

    // Abrir lista sempre que há mudança no input
    if (newValue.length >= 0) {
      setIsOpen(true);
    }
  };

  const handleSelectCategory = (categoria) => {
    setSearchTerm(categoria.nome);
    setIsOpen(false);
    setHighlightedIndex(-1);
    
    if (onSelect) {
      onSelect(categoria);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen || filteredCategories.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredCategories.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCategories.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredCategories.length) {
          handleSelectCategory(filteredCategories[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    // Sempre abrir a lista ao focar, mesmo sem texto
    setIsOpen(true);
  };

  const handleBlur = (e) => {
    // Delay para permitir cliques nos itens da lista
    setTimeout(() => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement === inputRef.current;
      const isListFocused = activeElement && containerRef.current && containerRef.current.contains(activeElement);
      
      if (!isInputFocused && !isListFocused) {
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

  // Fechar lista quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
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
      
      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-popover border rounded-md shadow-lg">
          {filteredCategories.length > 0 ? (
            <div className="max-h-[800px] overflow-y-auto">
              <div ref={listRef} className="p-2 space-y-1">
                {filteredCategories.map((categoria, index) => (
                  <Card
                    key={categoria.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-accent",
                      highlightedIndex === index && "bg-accent"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectCategory(categoria);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {categoria.nome}
                          </p>
                          {categoria.descricao && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {categoria.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : debouncedSearchTerm && debouncedSearchTerm.length >= 1 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma categoria encontrada para "{debouncedSearchTerm}"
            </div>
          ) : categories.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma categoria cadastrada
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export { CategoryAutocomplete };
