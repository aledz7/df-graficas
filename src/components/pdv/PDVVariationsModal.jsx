import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Check } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';

const PDVVariationsModal = ({ isOpen, setIsOpen, produto, selectedVariacaoDetails, setSelectedVariacaoDetails, addProdutoAoCarrinho, getNomeVariacao, carrinho = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVariacoes, setSelectedVariacoes] = useState([]);
  
  // Limpar seleções quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedVariacoes([]);
    }
  }, [isOpen]);
  
  // Função para calcular estoque disponível considerando o carrinho
  const calcularEstoqueDisponivel = useCallback((variacao) => {
    if (!variacao || !produto) return 0;
    
    const estoqueOriginal = parseFloat(variacao.estoque_var || 0);
    // Considerar ambos os campos de ID da variação (id e id_variacao)
    const variacaoId1 = String(variacao.id || '');
    const variacaoId2 = String(variacao.id_variacao || '');
    const produtoId = String(produto.id || '');
    
    // Calcular quantidade no carrinho para esta variação específica
    let quantidadeNoCarrinho = 0;
    
    carrinho.forEach((item, index) => {
      const itemProdutoId = String(item.id_produto || '');
      const itemVariacaoId = String(item.variacao?.id_variacao || '');
      const itemQuantidade = parseFloat(String(item.quantidade || 0).replace(',', '.'));
      
      // Verificar se o produto corresponde
      if (itemProdutoId === produtoId && itemVariacaoId !== '') {
        // Comparar IDs - pode ser id ou id_variacao
        const idsCorrespondem = itemVariacaoId === variacaoId1 || itemVariacaoId === variacaoId2;
        
        if (idsCorrespondem) {
          quantidadeNoCarrinho += itemQuantidade;
        }
      }
    });
    
    const estoqueDisponivel = Math.max(0, estoqueOriginal - quantidadeNoCarrinho);
    
    return estoqueDisponivel;
  }, [carrinho, produto]);
  
  // Função para alternar seleção de variação
  const toggleVariacaoSelection = (variacao) => {
    const variacaoId = variacao.id || variacao.id_variacao;
    const isAlreadySelected = selectedVariacoes.some(v => (v.id || v.id_variacao) === variacaoId);
    
    if (isAlreadySelected) {
      setSelectedVariacoes(selectedVariacoes.filter(v => (v.id || v.id_variacao) !== variacaoId));
    } else {
      setSelectedVariacoes([...selectedVariacoes, variacao]);
    }
  };

  const getTamanhosPersonalizados = useCallback((variacao) => {
    if (!Array.isArray(variacao?.tamanhos_personalizados)) return [];
    return variacao.tamanhos_personalizados
      .map((tamanho) => String(tamanho || '').trim())
      .filter(Boolean);
  }, []);
  
  // Filtrar variações baseado no termo de busca
  const filteredVariacoes = useMemo(() => {
    if (!produto?.variacoes || !Array.isArray(produto.variacoes)) {
      return [];
    }
    
    // Mostrar todas as variações (incluindo as sem estoque para permitir visualização)
    const variacoesParaMostrar = produto.variacoes;
    
    if (!searchTerm.trim()) return variacoesParaMostrar;
    
    return variacoesParaMostrar.filter(variacao => {
      const nomeVariacao = variacao.nome || '';
      const nomeCor = getNomeVariacao(variacao.cor, 'cor') || '';
      const nomeTamanho = getNomeVariacao(variacao.tamanho, 'tamanho') || '';
      const tamanhosCustom = getTamanhosPersonalizados(variacao).join(' ');
      const codigoBarras = variacao.codigo_barras || '';
      const sku = variacao.sku || '';
      
      // Busca mais abrangente: nome, cor, tamanho, código de barras, SKU
      const textoCompleto = `${nomeVariacao} ${nomeCor} ${nomeTamanho} ${tamanhosCustom} ${codigoBarras} ${sku}`.toLowerCase();
      const termoBusca = searchTerm.toLowerCase().trim();
      
      return textoCompleto.includes(termoBusca);
    });
  }, [produto?.variacoes, searchTerm, getNomeVariacao, getTamanhosPersonalizados]);

  if (!produto) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] p-4 sm:p-6 flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl">Selecione as Variações</DialogTitle>
          <DialogDescription className="text-sm break-words">
            {produto.nome}
            {selectedVariacoes.length > 0 && (
              <span className="ml-2 text-orange-600 font-semibold">
                • {selectedVariacoes.length} selecionada{selectedVariacoes.length > 1 ? 's' : ''}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {/* Campo de busca */}
        <div className="relative flex-shrink-0 mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por cor, tamanho, nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Container com scroll para as variações */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden max-h-[45vh] pr-2">
          <div className="space-y-3 py-2">
          {filteredVariacoes.map(variacao => {
            const variacaoId = variacao.id || variacao.id_variacao;
            const isSelected = selectedVariacoes.some(v => (v.id || v.id_variacao) === variacaoId);
            const estoqueDisponivel = calcularEstoqueDisponivel(variacao);
            const estoqueOriginal = parseFloat(variacao.estoque_var || 0);
            const quantidadeNoCarrinho = estoqueOriginal - estoqueDisponivel;
            const semEstoque = estoqueDisponivel === 0;
            const tamanhosPersonalizados = getTamanhosPersonalizados(variacao);
            const temTamanhoCustom = tamanhosPersonalizados.length > 0;
            const nomeCor = getNomeVariacao(variacao.cor, 'cor');
            const nomeTamanho = !temTamanhoCustom ? getNomeVariacao(variacao.tamanho, 'tamanho') : '';
            const tituloVariacao = variacao.nome || nomeCor || nomeTamanho || 'Variação';
            
            return (
            <Card 
              key={variacao.id || variacao.id_variacao} 
              onClick={() => !semEstoque && toggleVariacaoSelection(variacao)}
              className={`p-2 sm:p-3 transition-all duration-200 border-2 relative ${
                semEstoque 
                  ? 'opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50' 
                  : isSelected 
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20 ring-2 ring-orange-500 shadow-lg cursor-pointer hover:shadow-xl' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 cursor-pointer hover:shadow-lg'
              }`}
            >
              {/* Ícone de Check para variação selecionada */}
              {isSelected && (
                <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full p-1 shadow-md">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={3} />
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  {/* Imagem da variação */}
                  <div className="flex-shrink-0 relative">
                      <img 
                          src={getImageUrl(variacao.imagem_url || produto.imagem_url_preview) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiAzNkMzNC4yMDkxIDM2IDM2IDM0LjIwOTEgMzYgMzJDMzYgMjkuNzkwOSAzNC4yMDkxIDI4IDMyIDI4QzI5Ljc5MDkgMjggMjggMjkuNzkwOSAyOCAzMkMyOCAzNC4yMDkxIDI5Ljc5MDkgMzYgMzIgMzZaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0zMiA0MEMzNi40MTgzIDQwIDQwIDM2LjQxODMgNDAgMzJDNDAgMjcuNTgxNyAzNi40MTgzIDI0IDMyIDI0QzI3LjU4MTcgMjQgMjQgMjcuNTgxNyAyNCAzMkMyNCAzNi40MTgzIDI3LjU4MTcgMjQgMzIgMjRaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo='} 
                          alt={tituloVariacao}
                          className={`w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md border-2 transition-all ${
                            isSelected 
                              ? 'border-orange-500 shadow-md' 
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                      />
                  </div>
                 
                 {/* Informações da variação */}
                 <div className="flex-1 min-w-0">
                     <p className={`font-medium text-sm sm:text-base break-words ${
                       isSelected ? 'text-orange-700 dark:text-orange-400' : ''
                     }`}>
                       {tituloVariacao}
                     </p>
                     <div className="text-xs text-muted-foreground space-y-0.5">
                       <p className={semEstoque ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                         Estoque: {estoqueDisponivel}
                         {quantidadeNoCarrinho > 0 && (
                           <span className="text-gray-500 dark:text-gray-400 ml-1">
                             (no carrinho: {quantidadeNoCarrinho})
                           </span>
                         )}
                         {semEstoque && estoqueOriginal > 0 && (
                           <span className="text-red-600 dark:text-red-400 ml-1 font-semibold">
                             • Esgotado
                           </span>
                         )}
                       </p>
                       {variacao.cor && (
                         <p>Cor: {nomeCor}</p>
                       )}
                       {temTamanhoCustom ? (
                         <div className="flex flex-wrap items-center gap-1 pt-0.5">
                           <span className="text-xs text-muted-foreground mr-1">Tamanhos:</span>
                           {tamanhosPersonalizados.map((tamanho) => (
                             <Badge key={`${variacaoId}-${tamanho}`} variant="secondary" className="text-[10px] px-1.5 py-0">
                               {tamanho}
                             </Badge>
                           ))}
                         </div>
                       ) : variacao.tamanho ? (
                         <p>Tamanho: {nomeTamanho}</p>
                       ) : null}
                       {variacao.tamanho_tipo === 'personalizado' && !temTamanhoCustom && (
                         <p>Tamanhos personalizados não informados</p>
                       )}
                       {variacao.sku && (
                         <p className="truncate">SKU: {variacao.sku}</p>
                       )}
                     </div>
                 </div>
                 
                 {/* Preço - Fica à direita no desktop, abaixo no mobile */}
                 <div className="flex-shrink-0 self-end sm:self-auto">
                     <p className={`font-bold text-base sm:text-lg whitespace-nowrap ${
                       isSelected ? 'text-orange-700 dark:text-orange-500' : 'text-orange-600'
                     }`}>
                       R$ {parseFloat(
                         // Se o produto está em promoção e a variação não tem preço específico, usar o preço promocional do produto
                         produto.promocao_ativa && parseFloat(produto.preco_promocional || 0) > 0 && !variacao.preco_var
                             ? produto.preco_promocional
                             : variacao.preco_var || produto.preco_venda
                       ).toFixed(2)}
                     </p>
                 </div>
                </div>
              </div>
            </Card>
            );
          })}
          {filteredVariacoes.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-4">
                {searchTerm.trim() ? 'Nenhuma variação encontrada para sua busca.' : 'Nenhuma variação com estoque disponível.'}
              </p>
          )}
          </div>
        </div>
        
        <DialogFooter className="flex-shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 mt-4">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
              onClick={() => {
                if (selectedVariacoes.length > 0) {
                  // Adicionar cada variação selecionada ao carrinho
                  selectedVariacoes.forEach(variacao => {
                    addProdutoAoCarrinho(produto, 1, variacao);
                  });
                  setIsOpen(false);
                  setSelectedVariacoes([]);
                }
              }} 
              disabled={selectedVariacoes.length === 0}
              className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto"
          >
              Adicionar ao Carrinho {selectedVariacoes.length > 0 && `(${selectedVariacoes.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PDVVariationsModal;