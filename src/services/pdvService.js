import api from './api';

export const pdvService = {
  // Histórico de vendas PDV - agora busca da tabela vendas
  getHistoricoVendas: async (params = {}) => {
    try {
      // Preparar parâmetros de busca
      const queryParams = {
        with: 'cliente,itens.produto',
        ...params
      };
      
      // Buscar vendas da API de vendas (PDV e pré-venda)
      const response = await api.get('/api/vendas', {
        params: queryParams
      });
      
      
      // Transformar os dados para o formato esperado pelo frontend
      // A API retorna dados paginados, então precisamos acessar response.data.data.data
      
      
      const vendas = response.data?.data?.data || [];
      
      // Verificar se vendas é um array
      if (!Array.isArray(vendas)) {
        console.error('Dados de vendas não são um array:', vendas);
        return [];
      }
      
      
      
      return vendas.map(venda => {
        // Determinar o tipo baseado na origem
        let tipo = 'Venda PDV';
        if (venda.metadados?.origem === 'catalogo_publico') {
          tipo = 'Pré-venda Catálogo';
        }
        
                return {
          id: venda.id,
          codigo: venda.codigo,
          tipo: tipo,
          data_emissao: venda.data_emissao,
          cliente_id: venda.cliente_id,
          cliente: {
            id: venda.cliente_id,
            nome: venda.cliente_nome,
            cpf_cnpj: venda.cliente_cpf_cnpj,
            telefone: venda.cliente_telefone,
            email: venda.cliente_email
          },
          cliente_nome: venda.cliente_nome,
          total: venda.valor_total,
          subtotal: venda.subtotal,
          desconto: venda.desconto,
          status: venda.status,
          forma_pagamento: venda.forma_pagamento,
          dados_pagamento: venda.dados_pagamento,
          observacoes: venda.observacoes,
          vendedor_nome: venda.vendedor_nome,
          pagamentos: venda.dados_pagamento || [],
          itens: venda.itens?.map(item => ({
            id_produto: item.produto_id,
            nome: item.produto_nome,
            codigo_produto: item.produto_codigo,
            quantidade: item.quantidade,
            preco_venda_unitario: item.valor_unitario,
            subtotal: item.subtotal,
            unidadeMedida: item.produto_unidade,
            imagem_principal: item.produto?.imagem_principal || item.dados_adicionais?.imagem_principal || '',
            variacao: item.dados_adicionais?.variacao || null,
            promocao_info: item.dados_adicionais?.promocao_info || null
          })) || [],
          metadados: venda.metadados
        };
      });
    } catch (error) {
      console.error('Erro ao buscar histórico de vendas PDV:', error);
      return [];
    }
  },
  
  salvarHistoricoVendas: async (dados) => {
    try {
      // Se não há dados, não fazer a requisição
      if (!dados || dados.length === 0) {
        return { success: true, message: 'Nenhum dado para salvar' };
      }
      
      const response = await api.post('/api/pdv/historico-vendas', { dados });
      return response.data;
    } catch (error) {
      console.error('Erro ao salvar histórico de vendas PDV:', error);
      throw error;
    }
  },
  
  // Histórico de orçamentos PDV
  getHistoricoOrcamentos: async () => {
    try {
      const response = await api.get('/api/pdv/historico-orcamentos');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar histórico de orçamentos PDV:', error);
      return [];
    }
  },
  
  salvarHistoricoOrcamentos: async (dados) => {
    try {
      // Se não há dados, não fazer a requisição
      if (!dados || dados.length === 0) {
        return { success: true, message: 'Nenhum dado para salvar' };
      }
      
      const response = await api.post('/api/pdv/historico-orcamentos', { dados });
      return response.data;
    } catch (error) {
      console.error('Erro ao salvar histórico de orçamentos PDV:', error);
      throw error;
    }
  }
};

export default pdvService;
