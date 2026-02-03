/**
 * Utilitários para cálculo de estoque de produtos
 */

/**
 * Calcula o estoque total de um produto considerando variações
 * @param {Object} produto - Objeto do produto
 * @returns {number} - Estoque total calculado
 */
export const calcularEstoqueTotal = (produto) => {
  if (!produto) return 0;
  
  // Se o produto tem variações ativas, soma o estoque de todas as variações
  if (produto.variacoes_ativa && Array.isArray(produto.variacoes) && produto.variacoes.length > 0) {
    const estoqueVariacoes = produto.variacoes.reduce((acc, variacao) => {
      return acc + parseFloat(variacao.estoque_var || 0);
    }, 0);
    return estoqueVariacoes; // Mantém valores fracionados
  }
  
  // Se não tem variações, retorna o estoque principal
  return parseFloat(produto.estoque || 0); // Mantém valores fracionados
};

/**
 * Verifica se um produto tem estoque disponível
 * @param {Object} produto - Objeto do produto
 * @returns {boolean} - True se tem estoque, false caso contrário
 */
export const temEstoqueDisponivel = (produto) => {
  return calcularEstoqueTotal(produto) > 0;
};

/**
 * Retorna o texto de disponibilidade do estoque
 * @param {Object} produto - Objeto do produto
 * @returns {string} - Texto de disponibilidade
 */
export const getTextoDisponibilidadeEstoque = (produto) => {
  const estoqueTotal = calcularEstoqueTotal(produto);
  return estoqueTotal > 0 ? `Em estoque (${estoqueTotal})` : 'Sem estoque';
};

/**
 * Verifica se o estoque está no limite mínimo
 * @param {Object} produto - Objeto do produto
 * @returns {boolean} - True se está no limite mínimo, false caso contrário
 */
export const isEstoqueNoLimiteMinimo = (produto) => {
  if (!produto) return false;
  
  const estoqueTotal = calcularEstoqueTotal(produto);
  const estoqueMinimo = parseFloat(produto.estoque_minimo || 0);
  
  return estoqueTotal <= estoqueMinimo;
};

/**
 * Verifica se pode consumir estoque do produto
 * @param {Object} produto - Objeto do produto
 * @param {number} quantidade - Quantidade a consumir
 * @returns {boolean} - True se pode consumir, false caso contrário
 */
export const podeConsumirEstoque = (produto, quantidade = 1) => {
  if (!produto) return false;
  
  const estoqueTotal = calcularEstoqueTotal(produto);
  return estoqueTotal >= quantidade;
};

/**
 * Verifica se pode consumir área de estoque (para produtos em m²)
 * @param {Object} produto - Objeto do produto
 * @param {number} area - Área a consumir
 * @returns {boolean} - True se pode consumir, false caso contrário
 */
export const podeConsumirAreaEstoque = (produto, area = 0) => {
  if (!produto) return false;
  
  // Para produtos em m², verifica se tem estoque suficiente
  if (produto.tipo_produto === 'm2') {
    const estoqueTotal = calcularEstoqueTotal(produto);
    return estoqueTotal >= area;
  }
  
  // Para produtos normais, usa a função padrão
  return podeConsumirEstoque(produto, area);
};