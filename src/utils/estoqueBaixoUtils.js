import api from '@/services/api';

/**
 * Função compartilhada para buscar produtos com estoque baixo
 * Garante que dashboard e modal usem exatamente a mesma lógica
 */
export const buscarProdutosEstoqueBaixo = async (produtosFallback = []) => {
  const timestamp = new Date().toISOString();
  console.log(`🕐 EstoqueBaixoUtils - Iniciando busca às ${timestamp}`);
  
  try {
    // Tentar buscar da API primeiro
    try {
      // Adicionar timestamp para evitar cache
      const response = await api.get('/api/produtos/estoque-baixo', {
        params: { _t: Date.now() }
      });
      
      if (response.data && response.data.success !== false) {
        const data = response.data;
        const produtosData = data.data || data || [];
        console.log(`✅ EstoqueBaixoUtils - Produtos carregados da API: ${produtosData.length} às ${timestamp}`);
        console.log('🔍 Produtos da API:', produtosData.map(p => ({ nome: p.nome, id: p.id })));
        return produtosData;
      } else {
        console.error('❌ EstoqueBaixoUtils - Erro na API:', response.data);
        throw new Error('Erro na API');
      }
    } catch (apiError) {
      console.warn(`⚠️ EstoqueBaixoUtils - Erro ao carregar produtos da API, usando fallback às ${timestamp}:`, apiError);
      
      // Fallback para localStorage - LÓGICA MELHORADA
      const produtosData = produtosFallback.filter(p => {
        // Verificar estoque principal
        const estoquePrincipal = parseFloat(p.estoque || 0);
        const estoqueMinimo = parseFloat(p.estoque_minimo || 0);
        
        if (estoqueMinimo > 0 && estoquePrincipal <= estoqueMinimo) {
          return true;
        }
        
        // Verificar variações se existirem
        if (p.variacoes_ativa && Array.isArray(p.variacoes)) {
          for (const variacao of p.variacoes) {
            const estoqueVar = parseFloat(variacao.estoque_var || 0);
            if (estoqueMinimo > 0 && estoqueVar <= estoqueMinimo) {
              return true;
            }
          }
        }
        
        return false;
      });
      
      console.log(`🔍 EstoqueBaixoUtils - Produtos filtrados localmente: ${produtosData.length} às ${timestamp}`);
      return produtosData;
    }
  } catch (error) {
    console.error('Erro ao carregar produtos com estoque baixo:', error);
    return [];
  }
};
