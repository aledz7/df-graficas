import React from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Tag, Package, ImageIcon } from 'lucide-react';
import { isPromocaoAtiva } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';

const PDVProductGrid = ({ produtos, searchTerm, setSearchTerm, handleProdutoClick, categorias }) => {
  
  const filteredProdutos = produtos.filter(p => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    // Busca por nome do produto
    if (p.nome && p.nome.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Busca por código do produto
    if (p.codigo_produto && String(p.codigo_produto).toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Busca por código de barras do produto
    if (p.codigo_barras && String(p.codigo_barras).toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Busca por código de barras nas variações
    if (p.variacoes_ativa && Array.isArray(p.variacoes) && p.variacoes.length > 0) {
      const temVariacaoComCodigo = p.variacoes.some(v => {
        const codigoBarrasVar = v.codigo_barras || '';
        return String(codigoBarrasVar).toLowerCase().includes(searchLower);
      });
      if (temVariacaoComCodigo) {
        return true;
      }
    }
    
    // Busca por categoria
    if (categorias && Array.isArray(categorias)) {
      const categoriaProduto = categorias.find(cat => cat.id === p.categoria_id || cat.id === p.categoria);
      if (categoriaProduto && categoriaProduto.nome && categoriaProduto.nome.toLowerCase().includes(searchLower)) {
        return true;
      }
    }
    
    // Busca por subcategoria
    if (categorias && Array.isArray(categorias)) {
      const subcategoriaProduto = categorias.find(cat => cat.id === p.subcategoria_id);
      if (subcategoriaProduto && subcategoriaProduto.nome && subcategoriaProduto.nome.toLowerCase().includes(searchLower)) {
        return true;
      }
    }
    
    // Busca por tipo de produto
    if (p.tipo_produto && p.tipo_produto.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Busca por unidade de medida
    if (p.unidade_medida && p.unidade_medida.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Busca por descrição curta
    if (p.descricao_curta && p.descricao_curta.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Busca por descrição longa
    if (p.descricao_longa && p.descricao_longa.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    return false;
  });

  const checkPromocao = (produto) => isPromocaoAtiva(produto);

  const handleImageError = (e) => {
    if (e.target.dataset.errorHandled) return;
    e.target.dataset.errorHandled = 'true';
    e.target.onerror = null;
    e.target.style.display = 'none';
    const iconContainer = e.target.nextElementSibling;
    if (iconContainer && iconContainer.classList.contains('fallback-icon')) {
      iconContainer.style.display = 'flex';
    }
  };

  return (
    <div className="w-full flex-1 p-3 sm:p-4 flex flex-col lg:border-r border-gray-300 dark:border-gray-700">
      <div className="mb-3 sm:mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 sm:pl-10 text-sm sm:text-base bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-orange-500 focus:border-orange-500"
        />
        {/* Indicador de produtos */}
        <div className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          {searchTerm ? (
            <span>
              {filteredProdutos.length} de {produtos.length} produtos
              {filteredProdutos.length !== produtos.length && (
                <span className="text-orange-600 dark:text-orange-400 ml-1 sm:ml-2">
                  (filtrados)
                </span>
              )}
            </span>
          ) : (
            <>
              <span className="hidden sm:inline">Total de {produtos.length} produtos disponíveis</span>
              <span className="sm:hidden">{produtos.length} produtos</span>
            </>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredProdutos.length === 0 && searchTerm && (
           <div className="text-center py-10 text-muted-foreground">
             <Search size={40} className="sm:w-12 sm:h-12 mx-auto mb-2"/>
             <p className="text-sm sm:text-base">Nenhum produto encontrado</p>
             <p className="text-xs sm:text-sm">para "{searchTerm}"</p>
           </div>
        )}
         {filteredProdutos.length === 0 && !searchTerm && (
           <div className="text-center py-10 text-muted-foreground">
             <Package size={40} className="sm:w-12 sm:h-12 mx-auto mb-2"/>
             <p className="text-sm sm:text-base">Nenhum produto disponível</p>
             <p className="text-xs sm:text-sm">Verifique o cadastro de produtos.</p>
           </div>
        )}
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
          <AnimatePresence>
            {filteredProdutos.map(produto => {
              const temPromo = checkPromocao(produto);
              const estoqueAtual = parseFloat(produto.estoque || 0);
              const estoqueVariacoes = produto.variacoes_ativa ? produto.variacoes.reduce((acc, v) => acc + parseFloat(v.estoque_var || 0), 0) : 0;
              const estoqueTotal = produto.variacoes_ativa ? estoqueVariacoes : estoqueAtual;
              const estoqueMinimo = parseFloat(produto.estoque_minimo || 0);
              const isComposto = produto.isComposto || produto.is_composto;
              
              // Produtos compostos não são bloqueados por estoque próprio
              // Produtos com variações são bloqueados apenas se não tiverem variações com estoque
              // Produtos normais são bloqueados se estoque total <= estoque mínimo
              // Verificação mais robusta de variações com estoque
              let temVariacoesComEstoque = false;
              if (produto.variacoes_ativa && Array.isArray(produto.variacoes) && produto.variacoes.length > 0) {
                const variacoesComEstoqueCount = produto.variacoes.filter(v => {
                  const estoque = parseFloat(v.estoque_var || 0);
                  return estoque > 0;
                }).length;
                temVariacoesComEstoque = variacoesComEstoqueCount > 0;
              }
              // Lógica de bloqueio corrigida
              let bloqueado = false;
              if (isComposto) {
                bloqueado = false; // Produtos compostos nunca são bloqueados
              } else if (produto.variacoes_ativa) {
                // Para produtos com variação, só bloqueia se não tiver variações com estoque
                bloqueado = !temVariacoesComEstoque;
              } else {
                bloqueado = estoqueTotal <= estoqueMinimo; // Produtos normais bloqueados por estoque baixo
              }
              
              
              
              const imagemUrl = getImageUrl(produto.imagem_principal);

              return (
                <motion.div
                  layout
                  key={produto.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  onClick={() => !bloqueado ? handleProdutoClick(produto) : null}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow p-2 sm:p-3 flex flex-col items-center text-center border border-gray-200 dark:border-gray-700 relative overflow-hidden ${bloqueado ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {temPromo && (
                    <div className="absolute top-0 left-0 bg-orange-500 text-white text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-br-lg z-10">
                      <Tag size={10} className="sm:w-3 sm:h-3 inline mr-0.5 sm:mr-1"/>
                      <span className="hidden sm:inline">PROMO</span>
                      <span className="sm:hidden">%</span>
                    </div>
                  )}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mb-1 sm:mb-2 relative flex items-center justify-center border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700">
                    {imagemUrl ? (
                      <>
                        <img  
                          src={imagemUrl} 
                          alt={produto.nome || 'Imagem do Produto'} 
                          className="w-full h-full object-contain rounded" 
                          onError={handleImageError}
                        />
                        <div className="fallback-icon absolute inset-0 items-center justify-center bg-gray-100 dark:bg-gray-600 rounded" style={{ display: 'none' }}>
                          <ImageIcon size={24} className="sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                      </>
                    ) : (
                      <ImageIcon size={24} className="sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold h-8 sm:h-10 leading-tight overflow-hidden line-clamp-2">{produto.nome || 'Produto Sem Nome'}</h3>
                  {produto.codigo_produto && <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">Cód: {produto.codigo_produto}</p>}
                  {isComposto ? (
                    <p className="text-xs text-blue-600 dark:text-blue-400">Kit/Serviço</p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="hidden sm:inline">Estoque: </span>
                      {estoqueTotal % 1 === 0 ? estoqueTotal : estoqueTotal.toFixed(2)} {produto.unidade_medida || produto.unidadeMedida || 'un'}
                    </p>
                  )}
                  
                  <p className={`text-sm sm:text-base md:text-lg font-bold mt-1 ${temPromo ? 'text-orange-500' : 'text-green-600 dark:text-green-400'}`}>
                    R$ {parseFloat(temPromo ? produto.preco_promocional : produto.preco_venda || 0).toFixed(2)}
                  </p>
                  {temPromo && parseFloat(produto.preco_venda || 0) > 0 && (
                     <p className="text-xs line-through text-gray-400 dark:text-gray-500">R$ {parseFloat(produto.preco_venda).toFixed(2)}</p>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      </ScrollArea>
    </div>
  );
};

export default PDVProductGrid;