import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Image as ImageIcon, Package, Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';

const ProductAutocompleteSimple = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Digite o nome do produto...", 
  disabled = false,
  produtos = [],
  className = "",
  autoOpenOnFocus = false,
  tipoProduto = 'all', // 'all', 'm2', 'unidade' - filtro de tipo de produto
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

  // Filtrar produtos baseado no termo de busca
  const filteredProducts = useMemo(() => {
    const term = debouncedSearchTerm ? debouncedSearchTerm.toLowerCase() : '';
    
    // Primeiro filtrar por tipo de produto
    let produtosFiltradosPorTipo = produtos;
    
    if (tipoProduto === 'm2') {
      // Para m²: incluir produtos m², metro linear, serviços adicionais e produtos que não sejam unidade
      produtosFiltradosPorTipo = produtos.filter(produto => {
        const unidade = (produto.unidade_medida || produto.unidadeMedida || '').toLowerCase();
        const tipoPrecif = (produto.tipo_precificacao || '').toLowerCase();
        return produto.isServicoAdicional || 
               tipoPrecif === 'm2_cm2' ||
               tipoPrecif === 'm2_cm2_tabelado' ||
               tipoPrecif === 'metro_linear' ||
               unidade === 'm²' || 
               unidade === 'm2' || 
               unidade === 'metro_quadrado' ||
               (unidade !== 'unidade' && unidade !== 'metro_linear');
      });
    } else if (tipoProduto === 'unidade') {
      // Para unidade: incluir apenas produtos por unidade
      produtosFiltradosPorTipo = produtos.filter(produto => {
        const unidade = (produto.unidade_medida || produto.unidadeMedida || '').toLowerCase();
        const tipoPrecif = (produto.tipo_precificacao || '').toLowerCase();
        return unidade === 'unidade' || tipoPrecif === 'unidade' || tipoPrecif === 'quantidade_definida' || tipoPrecif === 'faixa_quantidade';
      });
    }
    // Se tipoProduto === 'all', não filtrar por tipo
    
    // Depois filtrar por termo de busca
    if (!term || term.length < 1) {
      // Quando não há termo, limitar a 50 primeiros produtos para não sobrecarregar
      // Mas se tiver menos que 50, mostrar todos
      return produtosFiltradosPorTipo.slice(0, 50);
    }

    // Se há termo de busca, filtrar (sem limite de resultados para busca específica)
    const filtered = produtosFiltradosPorTipo.filter(produto => 
      produto.nome && 
      produto.nome.toLowerCase().includes(term)
    );
    
    return filtered;
  }, [produtos, debouncedSearchTerm, tipoProduto]);

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

    // Abrir lista quando houver texto ou se autoOpenOnFocus estiver habilitado
    if (newValue.length > 0 || autoOpenOnFocus) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelectProduct = (produto) => {
    setSearchTerm(produto.nome);
    setIsOpen(false);
    setHighlightedIndex(-1);
    
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
    // Só abrir lista ao focar se autoOpenOnFocus estiver habilitado OU se houver texto no input
    if (autoOpenOnFocus || searchTerm.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = (e) => {
    // Desabilitado para evitar interferências com rolagem
    // O fechamento do dropdown é controlado apenas pelo handleClickOutside
    return;
  };

  // Scroll para o item destacado
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        const container = highlightedElement.closest('.overflow-y-auto');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const elementRect = highlightedElement.getBoundingClientRect();
          
          // Verificar se o elemento está visível
          const isVisible = elementRect.top >= containerRect.top && 
                           elementRect.bottom <= containerRect.bottom;
          
          if (!isVisible) {
            // Usar scrollIntoView com opções mais robustas
            highlightedElement.scrollIntoView({
              block: 'center',
              behavior: 'smooth',
              inline: 'nearest'
            });
          }
        }
      }
    }
  }, [highlightedIndex]);

  // Fechar lista quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Verificar se o clique foi dentro do container
      if (containerRef.current && containerRef.current.contains(event.target)) {
        return; // Não fazer nada se o clique foi dentro do componente
      }
      
      // Verificar se o clique foi em elementos que devem ser ignorados
      const target = event.target;
      const isModal = target.closest('[role="dialog"]') || target.closest('.fixed');
      const isScrollbar = target === document.documentElement || target === document.body;
      const isOverlay = target.classList && target.classList.contains('fixed');
      
      // Só fechar se não for em modal, scrollbar ou overlay
      if (!isModal && !isScrollbar && !isOverlay) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
      return () => document.removeEventListener('mousedown', handleClickOutside, true);
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
        <div className="absolute z-[99999] w-full mt-1 bg-popover border rounded-md shadow-xl">
          {filteredProducts.length > 0 ? (
            <div>
              {/* Contador de produtos encontrados */}
              <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/30">
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                {debouncedSearchTerm && (
                  <span> para "{debouncedSearchTerm}"</span>
                )}
              </div>
            <div 
              className="max-h-[500px] overflow-y-auto scroll-smooth"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 #f1f5f9',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth'
              }}
            >
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
                      e.stopPropagation();
                    }}
                    onMouseEnter={() => {
                      // Destacar item ao passar o mouse
                      setHighlightedIndex(index);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        {/* Imagem do produto */}
                        <div className="flex-shrink-0 relative">
                          {(() => {
                            // Verificar se tem imagem válida
                            const imagemPrincipal = produto.imagem_principal;
                            const temImagem = imagemPrincipal && 
                                            imagemPrincipal !== 'NULL' && 
                                            imagemPrincipal !== null && 
                                            imagemPrincipal !== '' &&
                                            imagemPrincipal !== undefined &&
                                            typeof imagemPrincipal === 'string' &&
                                            imagemPrincipal.trim() !== '';
                            
                            if (temImagem) {
                              const imageUrl = getImageUrl(imagemPrincipal);
                              return (
                                <img
                                  src={imageUrl}
                                  alt={produto.nome}
                                  className="w-12 h-12 rounded-md object-cover border"
                                  onError={(e) => {
                                    // Se der erro ao carregar, mostrar ícone
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              );
                            }
                            
                            return null;
                          })()}
                          
                          {/* Ícone de placeholder - sempre presente mas só visível quando não há imagem */}
                          <div 
                            className="w-12 h-12 rounded-md bg-muted flex items-center justify-center border"
                            style={{ 
                              display: (() => {
                                const imagemPrincipal = produto.imagem_principal;
                                const temImagem = imagemPrincipal && 
                                                imagemPrincipal !== 'NULL' && 
                                                imagemPrincipal !== null && 
                                                imagemPrincipal !== '' &&
                                                imagemPrincipal !== undefined &&
                                                typeof imagemPrincipal === 'string' &&
                                                imagemPrincipal.trim() !== '';
                                return temImagem ? 'none' : 'flex';
                              })()
                            }}
                          >
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        </div>
                        
                        {/* Informações do produto */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            {produto.isServicoAdicional ? (
                              <Ruler className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            ) : (
                              <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <p className="text-sm font-medium text-foreground truncate">
                              {produto.nome}
                            </p>
                            {produto.isServicoAdicional && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Serviço
                              </span>
                            )}
                          </div>
                          
                          {(() => {
                            const tipo = (produto.tipo_precificacao || '').toLowerCase();
                            let preco = 0;
                            let sufixo = '';
                            if ((tipo === 'm2_cm2' || tipo === 'm2_cm2_tabelado') && parseFloat(produto.preco_m2 || 0) > 0) {
                              preco = parseFloat(produto.preco_m2);
                              sufixo = '/m²';
                            } else if (tipo === 'metro_linear' && parseFloat(produto.preco_metro_linear || 0) > 0) {
                              preco = parseFloat(produto.preco_metro_linear);
                              sufixo = '/m';
                            } else if (parseFloat(produto.preco_m2 || 0) > 0) {
                              preco = parseFloat(produto.preco_m2);
                              sufixo = '/m²';
                            } else if (parseFloat(produto.preco_metro_linear || 0) > 0) {
                              preco = parseFloat(produto.preco_metro_linear);
                              sufixo = '/m';
                            } else if (parseFloat(produto.preco_venda || 0) > 0) {
                              preco = parseFloat(produto.preco_venda);
                            }
                            if (produto.isServicoAdicional && !sufixo) sufixo = '/m²';
                            return preco > 0 ? (
                              <p className="text-xs text-muted-foreground mt-1">
                                R$ {preco.toFixed(2).replace('.', ',')}
                                {sufixo && <span className="text-blue-600"> {sufixo}</span>}
                              </p>
                            ) : null;
                          })()}
                          
                          {produto.sku && (
                            <p className="text-xs text-muted-foreground">
                              {produto.isServicoAdicional ? 'Código' : 'SKU'}: {produto.sku}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            </div>
          ) : debouncedSearchTerm && debouncedSearchTerm.length >= 1 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado para "{debouncedSearchTerm}"
            </div>
          ) : produtos.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum produto cadastrado
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export { ProductAutocompleteSimple };
