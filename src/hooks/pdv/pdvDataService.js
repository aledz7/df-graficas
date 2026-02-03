import { safeJsonParse } from '@/lib/utils';
import { baixarEstoqueOS } from '@/hooks/os/osDataService';
import { apiDataManager } from '@/lib/apiDataManager';
import { vendaService, produtoService, clienteService } from '@/services/api';
import { pdvService } from '@/services/pdvService';
import { pontosClienteService } from '@/services/pontosClienteService';
import api from '@/services/api';
import { formatDateForBackend } from '@/utils/dateUtils';

export const salvarDocumentoPDV = async (documento, tipoDocumento, vendasSalvas, orcamentosSalvos, setVendasSalvas, setOrcamentosSalvos, registrarAcaoCallback, vendedorAtual) => {
  if (tipoDocumento === 'venda') {
    try {
      // Caso seja conversão de orçamento para venda, primeiro remover o orçamento da lista local
      if (documento.orcamentoId || (orcamentosSalvos && Array.isArray(orcamentosSalvos) && orcamentosSalvos.find(o => o && o.id === documento.id))) {
        try {
          let orcamentosAtuais = await apiDataManager.getDataAsArray('orcamentosPDV', []);
          if (Array.isArray(orcamentosAtuais)) {
            // Remover tanto pelo orcamentoId quanto pelo ID do documento (para garantir)
            const idParaRemover = documento.orcamentoId || documento.id;
            orcamentosAtuais = orcamentosAtuais.filter(o => o && o.id !== idParaRemover);
            await apiDataManager.setItem('orcamentosPDV', orcamentosAtuais);
            if (setOrcamentosSalvos) setOrcamentosSalvos(orcamentosAtuais);
            console.log(`Orçamento ${idParaRemover} removido da lista local durante conversão para venda`);
          }
        } catch (e) {
          console.warn('Falha ao remover orçamento convertido:', e);
        }
      }

      // Para pré-vendas, sempre criar uma nova venda (não atualizar)
      // A pré-venda original será removida posteriormente no PDVPage.jsx
      console.log('🆕 CRIANDO NOVA VENDA (mesmo sendo edição de pré-venda):', {
        isEdicao: documento.isEdicao,
        preVendaId: documento.preVendaId,
        motivo: 'Pré-vendas devem ser convertidas em novas vendas, não atualizadas'
      });
      
      // Validar se há cliente selecionado
      if (!documento.cliente?.id) {
        throw new Error('Cliente é obrigatório para salvar venda na tabela vendas');
      }

      // Validar se há itens
      if (!documento.itens || documento.itens.length === 0) {
        throw new Error('Venda deve ter pelo menos um item');
      }

      // Validar se o cliente existe no banco de dados
      if (documento.cliente.id === 'null' || documento.cliente.id === null) {
        throw new Error('Cliente deve estar cadastrado no sistema para salvar venda na tabela vendas');
      }

      // Validar e obter usuario_id válido (opcional)
      let usuarioId = null;
      if (vendedorAtual?.id && !isNaN(parseInt(vendedorAtual.id))) {
        usuarioId = parseInt(vendedorAtual.id);
      } else if (documento.vendedor_id && !isNaN(parseInt(documento.vendedor_id))) {
        usuarioId = parseInt(documento.vendedor_id);
      }
      // Se não houver vendedor válido, não enviar usuario_id e deixar o backend usar o usuário autenticado
      
      // Definir vendedor_id como o mesmo do usuario_id para garantir que seja salvo
      let vendedorId = usuarioId;

      // Log para debug do cliente recebido
      console.log('🔍 Cliente recebido no PDV:', {
        cliente: documento.cliente,
        isFuncionario: documento.cliente?.isFuncionario,
        tipo_pessoa: documento.cliente?.tipo_pessoa,
        id: documento.cliente?.id,
        funcionario_id: documento.cliente?.funcionario_id
      });
      
      // Detectar funcionário por: isFuncionario, tipo_pessoa, ou formato do ID (funcionario_*)
      const isFuncionario = documento.cliente?.isFuncionario || 
                           documento.cliente?.tipo_pessoa === 'funcionario' || 
                           (documento.cliente?.id && documento.cliente.id.toString().startsWith('funcionario_'));
      
      let clienteIdNumerico = null; // Para funcionários, cliente_id será NULL
      
      if (!isFuncionario) {
        // Apenas para clientes normais, resolver o cliente_id
        try {
          clienteIdNumerico = parseInt(documento.cliente.id);
          if (Number.isNaN(clienteIdNumerico)) {
            throw new Error('ID de cliente inválido para cliente normal');
          }
        } catch (e) {
          console.error('❌ Erro ao processar cliente normal:', e);
          throw new Error('Não foi possível resolver o cliente_id para a venda.');
        }
      }

      // Extrair funcionario_id para a API
      let funcionarioIdParaAPI = null;
      if (isFuncionario) {
        funcionarioIdParaAPI = documento.cliente.funcionario_id;
        if (!funcionarioIdParaAPI && documento.cliente.id && documento.cliente.id.toString().startsWith('funcionario_')) {
          funcionarioIdParaAPI = documento.cliente.id.toString().replace('funcionario_', '');
        }
        
        // Garantir que funcionarioIdParaAPI seja um número
        if (funcionarioIdParaAPI && typeof funcionarioIdParaAPI === 'string') {
          funcionarioIdParaAPI = parseInt(funcionarioIdParaAPI);
        }
      }
      
      // Preparar dados para a API de vendas
      const vendaData = {
        cliente_id: clienteIdNumerico,
        funcionario_id: funcionarioIdParaAPI,
        cliente_nome: documento.cliente.nome || '',
        cliente_cpf_cnpj: documento.cliente.cpf_cnpj || '',
        cliente_telefone: documento.cliente.telefone || '',
        cliente_email: documento.cliente.email || '',
        ...(usuarioId && { usuario_id: usuarioId }), // Só incluir se tiver um valor válido
        ...(vendedorId && { vendedor_id: vendedorId }), // Usar o mesmo ID do usuário como vendedor
        data_emissao: documento.data_emissao || formatDateForBackend(),
        tipo_pagamento: mapearFormaPagamento(documento.pagamentos?.[0]?.metodo || 'dinheiro'),
        status: 'concluida',
        valor_subtotal: parseFloat(documento.subtotal || 0),
        valor_desconto: parseFloat(documento.desconto?.valor_aplicado || 0),
        tipo_desconto: documento.desconto?.tipo === 'percentual' || documento.desconto?.tipo === 'valor' ? documento.desconto?.tipo : (documento.desconto?.tipo === 'percent' ? 'percentual' : 'valor'),
        valor_desconto_original: parseFloat(documento.desconto?.valor || 0),
        valor_acrescimo: 0,
        valor_total: parseFloat(documento.total || 0),
        observacoes: documento.observacoes || '',
        forma_pagamento: documento.pagamentos?.[0]?.metodo || 'dinheiro',
        dados_pagamento: documento.pagamentos || [],
        vendedor_nome: documento.vendedor_nome || 'N/A',
        metadados: {
          origem: 'PDV',
          documento_id: documento.id,
          vendedor_nome: documento.vendedor_nome,
          cliente_info: documento.cliente,
          is_funcionario: isFuncionario,
          funcionario_id: funcionarioIdParaAPI,
          // Persistir dados de pontos para exibição no histórico/recibo
          dados_pontos: documento.dadosPontos || null,
        },
        itens: documento.itens.map(item => ({
          produto_id: parseInt(item.id_produto),
          produto_nome: item.nome || item.produto_nome || '',
          produto_codigo: item.codigo || item.produto_codigo || '',
          produto_unidade: item.unidadeMedida || item.produto_unidade || 'un',
          produto_descricao: item.descricao || item.produto_descricao || '',
          quantidade: parseFloat(item.quantidade),
          valor_unitario: parseFloat(item.preco_venda_unitario),
          desconto: 0,
          tipo_desconto: 'valor',
          subtotal: parseFloat(item.quantidade * item.preco_venda_unitario),
          valor_total: parseFloat(item.quantidade * item.preco_venda_unitario),
          observacoes: item.observacoes || '',
          dados_adicionais: {
            imagem_principal: item.imagem_principal || '',
            variacao: item.variacao || null,
            promocao_info: item.promocao_info || null
          }
        }))
      };

      // Log dos dados sendo enviados para debug
      console.log('📊 Dados da venda sendo enviados para API:', {
        cliente_id: vendaData.cliente_id,
        funcionario_id: vendaData.funcionario_id,
        is_funcionario: vendaData.metadados?.is_funcionario,
        metadados: vendaData.metadados,
        dados_pontos: vendaData.metadados?.dados_pontos,
        valor_desconto: vendaData.valor_desconto,
        valor_total: vendaData.valor_total
      });

      // Salvar na API de vendas
      const response = await vendaService.create(vendaData);
      
      // Atualizar o documento com o ID da venda retornado pela API
      // A resposta do BaseController tem estrutura: { success: true, message: "...", data: {...} }
      const vendaDataResponse = response.data?.data || response.data;
      if (vendaDataResponse && vendaDataResponse.id) {
        documento.venda_id = vendaDataResponse.id;
        documento.codigo_venda = vendaDataResponse.codigo;
        console.log('✅ Venda salva na API com ID:', vendaDataResponse.id, 'Código:', vendaDataResponse.codigo);
      }

      // Registrar lançamentos de fluxo de caixa
      await registrarLancamentosFluxoCaixa(documento, vendedorAtual);

      // Registrar consumo interno para funcionário, se aplicável
      // Só contabilizar consumo interno se houver pagamentos em Crediário
      const temPagamentoCrediario = documento.pagamentos?.some(pag => pag.metodo === 'Crediário');
      
      if (isFuncionario && funcionarioIdParaAPI && temPagamentoCrediario) {
        console.log('✅ Consumo interno detectado para PDV com Crediário - será registrado via API');
        // O consumo interno será registrado via API do backend, não no localStorage
      } else if (isFuncionario && funcionarioIdParaAPI && !temPagamentoCrediario) {
        console.log('ℹ️ Consumo interno detectado para PDV, mas sem Crediário - NÃO será contabilizado');
        // Não contabilizar consumo interno quando não há Crediário
      }

      // Registrar desconto de funcionário se aplicável
      if (documento.cliente?.tipo_cadastro_especial === 'Funcionário') {
        await registrarDescontoFuncionarioPDV(documento, documento.cliente, [], null);
      }

      // Atualizar pontos do cliente (apenas se não for funcionário)
      if (documento.dadosPontos && documento.cliente?.id && !documento.cliente?.isFuncionario) {
        try {
          const { pontosAcumuladosAutomaticamente, descontoPontosAplicado, isPrimeiraVenda } = documento.dadosPontos;
          
          // Sempre acumular pontos (primeira compra ou não)
          if (pontosAcumuladosAutomaticamente > 0) {
            await pontosClienteService.atualizarPontosCliente(
              documento.cliente.id,
              documento.total, // Valor total da venda para calcular pontos
              'acumular'
            );
          }
          
          // Se aplicou desconto em pontos, utilizar os pontos
          if (descontoPontosAplicado > 0) {
            await pontosClienteService.atualizarPontosCliente(
              documento.cliente.id,
              descontoPontosAplicado,
              'utilizar'
            );
          }
        } catch (error) {
          console.error('Erro ao atualizar pontos do cliente:', error);
          // Não interromper a venda por erro nos pontos
        }
      }

    } catch (error) {
      console.error('❌ Erro ao salvar venda na API:', error);
      throw new Error(`Erro ao salvar venda: ${error.message}`);
    }

  } else if (tipoDocumento === 'orcamento') {
    try {
      // Orçamentos do PDV também devem ser salvos na tabela vendas com status específico
      
      // Validar se há cliente selecionado (obrigatório para salvar na API)
      if (!documento.cliente?.id) {
        throw new Error('Cliente é obrigatório para salvar orçamento na tabela vendas');
      }

      // Validar se há itens
      if (!documento.itens || documento.itens.length === 0) {
        throw new Error('Orçamento deve ter pelo menos um item');
      }

      // Validar se o cliente existe no banco de dados
      if (documento.cliente.id === 'null' || documento.cliente.id === null) {
        throw new Error('Cliente deve estar cadastrado no sistema para salvar orçamento na tabela vendas');
      }

      // Validar e obter usuario_id válido (opcional)
      let usuarioId = null;
      if (vendedorAtual?.id && !isNaN(parseInt(vendedorAtual.id))) {
        usuarioId = parseInt(vendedorAtual.id);
      } else if (documento.vendedor_id && !isNaN(parseInt(documento.vendedor_id))) {
        usuarioId = parseInt(documento.vendedor_id);
      }
      
      let vendedorId = usuarioId;

      // Preparar dados para a API de vendas como orçamento
      const orcamentoData = {
        tipo_documento: 'orcamento',
        cliente_id: parseInt(documento.cliente.id),
        funcionario_id: documento.cliente?.isFuncionario ? (documento.cliente.funcionario_id || null) : null,
        cliente_nome: documento.cliente.nome || '',
        cliente_cpf_cnpj: documento.cliente.cpf_cnpj || '',
        cliente_telefone: documento.cliente.telefone || '',
        cliente_email: documento.cliente.email || '',
        ...(usuarioId && { usuario_id: usuarioId }),
        ...(vendedorId && { vendedor_id: vendedorId }),
        data_emissao: documento.data_emissao || new Date().toISOString(),
        // Campos obrigatórios na API: enviar valores válidos
        // Para orçamento no PDV: status pendente e tipo_documento indicado em metadados
        tipo_pagamento: 'outro',
        status: 'pendente',
        valor_subtotal: parseFloat(documento.subtotal || 0),
        valor_desconto: parseFloat(documento.desconto?.valor_aplicado || 0),
        tipo_desconto: documento.desconto?.tipo === 'percentual' || documento.desconto?.tipo === 'valor' ? documento.desconto?.tipo : (documento.desconto?.tipo === 'percent' ? 'percentual' : 'valor'),
        valor_desconto_original: parseFloat(documento.desconto?.valor || 0),
        valor_acrescimo: 0,
        valor_total: parseFloat(documento.total || 0),
        observacoes: documento.observacoes || '',
        forma_pagamento: 'outro',
        dados_pagamento: [],
        vendedor_nome: documento.vendedor_nome || 'N/A',
        data_validade: documento.data_validade || null,
        metadados: {
          origem: 'PDV',
          documento_id: documento.id,
          vendedor_nome: documento.vendedor_nome,
          cliente_info: documento.cliente,
          tipo_documento: 'orcamento'
        },
        itens: documento.itens.map(item => ({
          produto_id: parseInt(item.id_produto),
          produto_nome: item.nome || item.produto_nome || '',
          produto_codigo: item.codigo || item.produto_codigo || '',
          produto_unidade: item.unidadeMedida || item.produto_unidade || 'un',
          produto_descricao: item.descricao || item.produto_descricao || '',
          quantidade: parseFloat(item.quantidade),
          valor_unitario: parseFloat(item.preco_venda_unitario),
          desconto: 0,
          tipo_desconto: 'valor',
          subtotal: parseFloat(item.quantidade * item.preco_venda_unitario),
          valor_total: parseFloat(item.quantidade * item.preco_venda_unitario),
          observacoes: item.observacoes || '',
          dados_adicionais: {
            imagem_principal: item.imagem_principal || '',
            variacao: item.variacao || null,
            promocao_info: item.promocao_info || null
          }
        }))
      };

      // Salvar orçamento na API de vendas
      const response = await vendaService.create(orcamentoData);
      
      // Atualizar o documento com o ID da venda retornado pela API
      // A resposta do BaseController tem estrutura: { success: true, message: "...", data: {...} }
      const vendaDataResponse = response.data?.data || response.data;
      if (vendaDataResponse && vendaDataResponse.id) {
        documento.venda_id = vendaDataResponse.id;
        documento.codigo_venda = vendaDataResponse.codigo;
        console.log('✅ Orçamento PDV salvo na tabela vendas com ID:', vendaDataResponse.id, 'Código:', vendaDataResponse.codigo);
      }

    } catch (error) {
      console.error('❌ Erro ao salvar orçamento na API:', error);
      
      // Fallback: salvar no localStorage se a API falhar
      console.warn('🔄 Salvando orçamento no localStorage como fallback');
      if (!Array.isArray(orcamentosSalvos)) {
        console.warn('orcamentosSalvos não é um array válido. Inicializando como array vazio.');
        orcamentosSalvos = [];
      }
      
      const novosOrcamentos = [...orcamentosSalvos, documento];
      await apiDataManager.setItem('orcamentosPDV', novosOrcamentos);
      
      if (setOrcamentosSalvos) setOrcamentosSalvos(novosOrcamentos);
      
      // Re-throw do erro original para que o usuário saiba que houve problema
      throw new Error(`Erro ao salvar orçamento: ${error.message}`);
    }
  }

  if (registrarAcaoCallback) {
    registrarAcaoCallback(
      tipoDocumento === 'venda' ? 'finalizar_venda_pdv' : 'salvar_orcamento_pdv',
      tipoDocumento === 'venda' ? 'Venda PDV' : 'Orçamento PDV',
      documento.id,
      null,
      documento
    );
  }
  
  // Retornar o documento atualizado com venda_id e codigo_venda da API
  return documento;
};

// Função para mapear forma de pagamento do PDV para o formato da API
const mapearFormaPagamento = (formaPagamento) => {
  const mapeamento = {
    'Dinheiro': 'dinheiro',
    'Cartão Crédito': 'cartao_credito',
    'Cartão Débito': 'cartao_debito',
    'Pix': 'pix',
    'Transferência Bancária': 'transferencia',
    'Crediário': 'outro',
    'Outro': 'outro'
  };
  
  return mapeamento[formaPagamento] || 'dinheiro';
};

// Função para registrar lançamentos de fluxo de caixa
const registrarLancamentosFluxoCaixa = async (documento, vendedorAtual) => {
      let lancamentosFluxo = await apiDataManager.getDataAsArray('lancamentosFluxoCaixa', []);
    let categoriasFluxo = await apiDataManager.getDataAsArray('categoriasFluxoCaixa', []);
  
  if (!Array.isArray(lancamentosFluxo)) {
    console.warn('lancamentosFluxo não é um array válido. Inicializando como array vazio.');
    lancamentosFluxo = [];
  }
  
  if (!Array.isArray(categoriasFluxo)) {
    console.warn('categoriasFluxo não é um array válido. Inicializando como array vazio.');
    categoriasFluxo = [];
  }
  
  const categoriaVendaProduto = categoriasFluxo.find(cat => cat.nome.toLowerCase().includes('venda de produtos'));
  
  documento.pagamentos.forEach(pag => {
    const novoLancamento = {
      id: `fluxo-pdv-${documento.id}-${pag.metodo.replace(/\s+/g, '-')}-${Date.now()}`,
      data: new Date().toISOString(),
                          descricao: `Venda PDV #${documento.id ? String(documento.id).slice(-6) : 'N/A'} (${pag.metodo}${pag.parcelas ? ` ${pag.parcelas}x` : ''})`,
      valor: parseFloat(pag.valorFinal || pag.valor),
      tipo: 'entrada',
      categoria_id: categoriaVendaProduto ? categoriaVendaProduto.id : '',
      conta_bancaria_id: pag.conta_destino_id || '', 
      cliente_fornecedor_id: documento.cliente?.id || '',
      origem_id: documento.id,
      origem_tipo: 'PDV',
      vendedor_id: vendedorAtual?.id,
      forma_pagamento: pag.metodo,
      detalhes_pagamento: {
        parcelas: pag.parcelas,
        maquinaInfo: pag.maquinaInfo,
        taxaInfo: pag.taxaInfo,
        valorOriginal: pag.valorOriginal,
      }
    };
    lancamentosFluxo.push(novoLancamento);
  });
  
  await apiDataManager.setItem('lancamentosFluxoCaixa', lancamentosFluxo);
};

export const baixarEstoquePDV = async (carrinho, setProdutosCallback, registrarAcaoCallback, documentoId) => {
      let produtosAtualizados = await apiDataManager.getDataAsArray('produtos', []);
  
  // Garantir que produtosAtualizados seja sempre um array
  if (!Array.isArray(produtosAtualizados)) {
    console.error('Produtos não é um array válido. Inicializando como array vazio.');
    produtosAtualizados = [];
  }

  // Debug: verificar produtos compostos
  const produtosCompostos = produtosAtualizados.filter(p => p.isComposto || p.is_composto);
  produtosCompostos.forEach(p => {
    console.log('🔧 [baixarEstoquePDV] Produto composto:', {
      id: p.id,
      nome: p.nome,
      isComposto: p.isComposto,
      is_composto: p.is_composto,
      composicao: p.composicao
    });
  });

  let modificouEstoque = false;
  const produtosAntes = JSON.parse(JSON.stringify(produtosAtualizados));
  carrinho.forEach(itemNoCarrinho => {

    const produtoIndex = produtosAtualizados.findIndex(p => p.id === itemNoCarrinho.id_produto);
    
    if (produtoIndex > -1) {
      const produtoOriginal = JSON.parse(JSON.stringify(produtosAtualizados[produtoIndex]));
      let estoqueModificadoParaItem = false;
      const quantidade = parseFloat(itemNoCarrinho.quantidade) || 0;
      
      
      
      // Verificar se o produto é composto
      const isComposto = produtoOriginal.isComposto || produtoOriginal.is_composto;
      
      if (isComposto && produtoOriginal.composicao && Array.isArray(produtoOriginal.composicao)) {
        
        // Verificar se a composição tem dados válidos
        if (produtoOriginal.composicao.length === 0) {
          console.warn('⚠️ [baixarEstoquePDV] Produto composto sem componentes na composição!');
        }
        
        // Para produtos compostos, baixar estoque dos componentes
        produtoOriginal.composicao.forEach((componente, index) => {
          
          
          const componenteIndex = produtosAtualizados.findIndex(p => p.id === componente.produtoId);
          
          // Debug: verificar se o produtoId está correto
          
          
          if (componenteIndex > -1) {
            const quantidadeComponente = parseFloat(componente.quantidade) * quantidade;
            const estoqueAtualComponente = parseFloat(produtosAtualizados[componenteIndex].estoque) || 0;
            const novoEstoque = estoqueAtualComponente - quantidadeComponente;
            
            
            
            produtosAtualizados[componenteIndex].estoque = novoEstoque;
            modificouEstoque = true;
            
            // Verificar se o estoque não ficou negativo
            if (novoEstoque < 0) {
              console.warn(`⚠️ [baixarEstoquePDV] Estoque negativo detectado para ${produtosAtualizados[componenteIndex].nome}! Estoque: ${novoEstoque}`);
            }
            
            // Registrar auditoria para cada componente
            if (registrarAcaoCallback) {
              registrarAcaoCallback(
                'baixa_estoque_componente_pdv',
                'Produto Componente',
                produtosAtualizados[componenteIndex].id,
                { estoque_anterior: estoqueAtualComponente },
                { estoque_atual: produtosAtualizados[componenteIndex].estoque },
                `Baixa de estoque do componente ${produtosAtualizados[componenteIndex].nome} para produto composto ${produtoOriginal.nome} - Venda PDV ${documentoId}`
              );
            }
          } else {
            console.error(`❌ [baixarEstoquePDV] Componente não encontrado! ID: ${componente.produtoId}, Nome: ${componente.nome}`);
            
            // Tentar encontrar o componente por nome como fallback
            const componentePorNome = produtosAtualizados.find(p => p.nome === componente.nome);
            if (componentePorNome) {
              
            }
          }
        });
      } else if (itemNoCarrinho.variacao) {
        // Produto com variação
        const variacoesArr = Array.isArray(produtosAtualizados[produtoIndex].variacoes) ? produtosAtualizados[produtoIndex].variacoes : [];
        const variacaoIndex = variacoesArr.findIndex(v => String(v.id_variacao ?? v.id) === String(itemNoCarrinho.variacao.id_variacao ?? itemNoCarrinho.variacao.id));
        if (variacaoIndex > -1) {
          const estoqueVarAtual = parseFloat(variacoesArr[variacaoIndex].estoque_var) || 0;
          variacoesArr[variacaoIndex].estoque_var = estoqueVarAtual - quantidade;
          modificouEstoque = true;
          estoqueModificadoParaItem = true;
        }
      } else {
        // Produto normal
        const estoqueAtual = parseFloat(produtosAtualizados[produtoIndex].estoque) || 0;
        produtosAtualizados[produtoIndex].estoque = estoqueAtual - quantidade;
        modificouEstoque = true;
        estoqueModificadoParaItem = true;
      }
      
      if (estoqueModificadoParaItem && registrarAcaoCallback) {
        registrarAcaoCallback(
            'baixa_estoque_pdv',
            'Produto',
            produtoOriginal.id,
            { estoque_anterior: produtoOriginal.estoque, variacao_anterior: itemNoCarrinho.variacao ? produtoOriginal.variacoes.find(v => v.id === itemNoCarrinho.variacao.id)?.estoque_var : undefined },
            { estoque_atual: produtosAtualizados[produtoIndex].estoque, variacao_atual: itemNoCarrinho.variacao ? produtosAtualizados[produtoIndex].variacoes.find(v => v.id === itemNoCarrinho.variacao.id)?.estoque_var : undefined },
            `Baixa de estoque para Venda PDV ${documentoId}`
        );
      }
    }
  });

  
  
  if (modificouEstoque) {
    
    await apiDataManager.setItem('produtos', produtosAtualizados);
    if (setProdutosCallback) {
      
      setProdutosCallback(produtosAtualizados.filter(p => p.status === true));
    }
    // Sincronizar alterações de estoque com o backend (API Laravel)
    try {
      const produtosDepois = produtosAtualizados;

      const mudouVariacoes = (antes = [], depois = []) => {
        if (!Array.isArray(antes) && !Array.isArray(depois)) return false;
        const mapAntes = new Map((antes || []).map(v => [String(v.id_variacao ?? v.id), String(v.estoque_var)]));
        const mapDepois = new Map((depois || []).map(v => [String(v.id_variacao ?? v.id), String(v.estoque_var)]));
        if (mapAntes.size !== mapDepois.size) return true;
        for (const [id, est] of mapDepois.entries()) {
          if (mapAntes.get(id) !== est) return true;
        }
        return false;
      };

      const produtosParaAtualizar = [];
      for (const pDepois of produtosDepois) {
        const pAntes = produtosAntes.find(p => p.id === pDepois.id);
        if (!pAntes) continue;
        const estoqueAntes = String(pAntes.estoque ?? '0');
        const estoqueDepois = String(pDepois.estoque ?? '0');
        const variacoesAlteradas = mudouVariacoes(pAntes.variacoes, pDepois.variacoes);
        if (estoqueAntes !== estoqueDepois || variacoesAlteradas) {
          produtosParaAtualizar.push({
            id: pDepois.id,
            data: {
              estoque: pDepois.estoque,
              variacoes: Array.isArray(pDepois.variacoes) ? pDepois.variacoes : undefined,
            }
          });
        }
      }

      await Promise.all(
        produtosParaAtualizar.map(pu => produtoService.update(pu.id, pu.data).catch(err => {
          console.error('[PDV] Falha ao sincronizar estoque do produto', pu.id, err);
        }))
      );
    } catch (syncError) {
      console.error('[PDV] Erro ao sincronizar estoque com API', syncError);
    }
  } else {
    
  }
  
  
  return true; // Retorna true indicando que a operação foi bem-sucedida
};

export const registrarDescontoFuncionarioPDV = async (documento, clienteInfo, funcionarios, toast) => {
  if (clienteInfo?.tipo_cadastro_especial === 'Funcionário' && clienteInfo.funcionario_id_associado) {
    const funcionarioAssociado = funcionarios.find(f => f.id === clienteInfo.funcionario_id_associado);
    if (funcionarioAssociado?.permite_desconto_consumo_interno) {
        let descontosFuncionarios = await apiDataManager.getDataAsArray('descontos_funcionarios', []);
        
        // Garantir que descontosFuncionarios seja um array
        if (!Array.isArray(descontosFuncionarios)) {
          console.warn('descontosFuncionarios não é um array válido. Inicializando como array vazio.');
          descontosFuncionarios = [];
        }
        
        const novoDesconto = {
            id: `desc-pdv-${documento.id}-${Date.now()}`,
            funcionario_id: funcionarioAssociado.id,
            origem_id: documento.id,
            tipo_origem: 'PDV',
            data: new Date().toISOString(),
            valor_desconto: documento.total,
                            observacao_desconto: `Compra no PDV #${documento.id ? String(documento.id).slice(-6) : 'N/A'}`,
        };
        descontosFuncionarios.push(novoDesconto);
        await apiDataManager.setItem('descontos_funcionarios', descontosFuncionarios);
        if (toast) toast({ title: "Desconto Registrado", description: `Desconto de R$ ${documento.total.toFixed(2)} para ${funcionarioAssociado.nome}.` });
    }
  }
};

export const moverParaLixeiraPDV = async (venda, justificativa, deletedBy, registrarAcaoCallback) => {
      let lixeira = await apiDataManager.getDataAsArray('lixeira', []);
  
  // Garantir que lixeira seja um array
  if (!Array.isArray(lixeira)) {
    console.warn('lixeira não é um array válido. Inicializando como array vazio.');
    lixeira = [];
  }
  
  const itemParaLixeira = {
    type: venda.tipo, 
    data: venda,
    deletedAt: new Date().toISOString(),
    justification: justificativa,
    deletedBy: deletedBy?.nome || 'N/A',
  };
  lixeira.push(itemParaLixeira);
  await apiDataManager.setItem('lixeira', lixeira);

  // Venda concluída no PDV ou Pré-venda proveniente do catálogo (ambas persistidas em vendas)
  if (venda.tipo === 'Venda PDV' || venda.tipo === 'Pré-venda Catálogo') {
    // Verificar se a venda já está na tabela vendas do banco de dados
    // Se estiver, não precisamos salvar no localStorage nem no backend
    if (venda.id && !venda.id.toString().startsWith('local-')) {
      
      try {
        // Chamar a API para fazer soft delete da venda
        await api.delete(`/api/vendas/${venda.id}`, {
          data: {
            justificativa_exclusao: justificativa
          }
        });

      } catch (error) {
        console.error('Erro ao excluir venda via API:', error);
        throw new Error(`Erro ao excluir venda: ${error.response?.data?.message || error.message}`);
      }
      
      // Se o callback for fornecido, passa os dados atualizados e o tipo de documento
      if (registrarAcaoCallback && typeof registrarAcaoCallback === 'function') {
        // Mantém "Venda PDV" para compatibilidade com quem espera esse tipo para sincronizar históricos locais
        registrarAcaoCallback([], 'Venda PDV');
      }
    } else {
      // Venda local - salvar no localStorage e backend
      let vendasSalvas = await apiDataManager.getDataAsArray('historico_vendas_pdv', []);
      
      // Garantir que vendasSalvas seja um array
      if (!Array.isArray(vendasSalvas)) {
        console.warn('vendasSalvas não é um array válido. Inicializando como array vazio.');
        vendasSalvas = [];
      }
      
      const novasVendas = vendasSalvas.filter(v => v.id !== venda.id);
      
      // Salvar no backend apenas se houver vendas restantes
      if (novasVendas.length > 0) {
        try {
          await pdvService.salvarHistoricoVendas(novasVendas);
        } catch (error) {
          console.error('Erro ao atualizar histórico de vendas no backend após exclusão:', error);
          throw error; // Re-throw para que o erro seja tratado pelo chamador
        }
      } else {
        // Se não há vendas restantes, remover completamente do backend
        try {
          await apiDataManager.removeItem('historico_vendas_pdv');
        } catch (error) {
          console.error('Erro ao limpar histórico de vendas no backend após exclusão:', error);
          throw error; // Re-throw para que o erro seja tratado pelo chamador
        }
      }
      
      // Se o callback for fornecido, passa os dados atualizados e o tipo de documento
      if (registrarAcaoCallback && typeof registrarAcaoCallback === 'function') {
        registrarAcaoCallback(novasVendas, 'Venda PDV');
      }
    }
    
    if (venda.status === 'Finalizado' || venda.status === 'Finalizado (Editada)') {
      const itensPDVParaEstoque = venda.itens.map(item => ({
        id_produto: item.id_produto,
        quantidade: item.quantidade,
        variacao_selecionada: item.variacao ? { id: item.variacao.id_variacao, id_variacao: item.variacao.id_variacao } : null,
        tipo_item: item.unidadeMedida === 'm2' ? 'm2' : 'unidade',
        id_produto_principal: item.unidadeMedida === 'm2' ? item.id_produto : null,
        largura_item_final: item.unidadeMedida === 'm2' ? (item.largura || 1) : 0, 
        altura_item_final: item.unidadeMedida === 'm2' ? (item.altura || 1) : 0,  
      }));
      baixarEstoqueOS(itensPDVParaEstoque, true, registrarAcaoCallback, `Devolução por exclusão PDV ${venda.id}`); 
    }

  } else if (venda.tipo === 'Orçamento PDV') {
    let orcamentosSalvos = await apiDataManager.getDataAsArray('orcamentosPDV', []);
    
    // Garantir que orcamentosSalvos seja um array
    if (!Array.isArray(orcamentosSalvos)) {
      console.warn('orcamentosSalvos não é um array válido. Inicializando como array vazio.');
      orcamentosSalvos = [];
    }
    
    const novosOrcamentos = orcamentosSalvos.filter(o => o.id !== venda.id);
    
    // Salvar no backend apenas se houver orçamentos restantes
    if (novosOrcamentos.length > 0) {
      try {
        await pdvService.salvarHistoricoOrcamentos(novosOrcamentos);
      } catch (error) {
        console.error('Erro ao atualizar histórico de orçamentos no backend após exclusão:', error);
        throw error; // Re-throw para que o erro seja tratado pelo chamador
      }
    } else {
      // Se não há orçamentos restantes, remover completamente do backend
      try {
        await apiDataManager.removeItem('orcamentosPDV');
      } catch (error) {
        console.error('Erro ao limpar histórico de orçamentos no backend após exclusão:', error);
        throw error; // Re-throw para que o erro seja tratado pelo chamador
      }
    }
    
    // Se o callback for fornecido, passa os dados atualizados e o tipo de documento
    if (registrarAcaoCallback && typeof registrarAcaoCallback === 'function') {
      registrarAcaoCallback(novosOrcamentos, 'Orçamento PDV');
    }
  }
  
  if (registrarAcaoCallback) {
    registrarAcaoCallback('excluir_para_lixeira', venda.tipo, venda.id, venda, null, justificativa);
  }
};

// Função para atualizar uma venda existente (pré-venda ou orçamento) quando finalizada
const atualizarVendaExistente = async (documento, vendedorAtual, registrarAcaoCallback) => {
  try {
    
    // Determinar o ID da venda a ser atualizada
    // Se temos o ID numérico da venda, usar ele, senão buscar pelo código
    let vendaId = documento.preVendaId || documento.orcamentoId || documento.id;
    
    if (!vendaId) {
      throw new Error('ID da venda não encontrado para atualização');
    }
    
    // Se o vendaId é um código (começa com VEN), precisamos buscar o ID numérico
    if (typeof vendaId === 'string' && vendaId.startsWith('VEN')) {
      try {
        // Buscar na lista de vendas e filtrar pelo código
        const response = await api.get(`/api/vendas`, {
          params: {
            per_page: 1000 // Buscar muitas vendas para encontrar a que queremos
          }
        });
        
        const vendas = response.data?.data?.data || [];
        const vendaEncontrada = vendas.find(v => v.codigo === vendaId);
        
        if (vendaEncontrada) {
          vendaId = vendaEncontrada.id;
        } else {
          throw new Error(`Venda com código ${vendaId} não encontrada`);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar ID da venda:', error);
        throw new Error(`Erro ao buscar venda: ${error.message}`);
      }
    }
    
    // Validar se há cliente selecionado
    if (!documento.cliente?.id) {
      throw new Error('Cliente é obrigatório para atualizar venda');
    }

    // Validar se há itens
    if (!documento.itens || documento.itens.length === 0) {
      throw new Error('Venda deve ter pelo menos um item');
    }

    // Validar e obter usuario_id válido
    let usuarioId = null;
    if (vendedorAtual?.id && !isNaN(parseInt(vendedorAtual.id))) {
      usuarioId = parseInt(vendedorAtual.id);
    } else if (documento.vendedor_id && !isNaN(parseInt(documento.vendedor_id))) {
      usuarioId = parseInt(documento.vendedor_id);
    }
    
    let vendedorId = usuarioId;

    // Preparar dados para atualização
    const updateData = {
      cliente_id: parseInt(documento.cliente.id),
      funcionario_id: documento.cliente?.isFuncionario ? (documento.cliente.funcionario_id || null) : null,
      cliente_nome: documento.cliente.nome || '',
      cliente_cpf_cnpj: documento.cliente.cpf_cnpj || '',
      cliente_telefone: documento.cliente.telefone || '',
      cliente_email: documento.cliente.email || '',
      ...(usuarioId && { usuario_id: usuarioId }),
      ...(vendedorId && { vendedor_id: vendedorId }),
      // Atualizar a data da venda para a data atual quando for uma edição
      data_emissao: formatDateForBackend(),
      tipo_pagamento: mapearFormaPagamento(documento.pagamentos?.[0]?.metodo || 'dinheiro'),
      status: 'concluida', // Atualizar status para concluída
      valor_subtotal: parseFloat(documento.subtotal || 0),
      valor_desconto: parseFloat(documento.desconto?.valor_aplicado || 0),
      valor_acrescimo: 0,
      valor_total: parseFloat(documento.total || 0),
      observacoes: documento.observacoes || '',
      forma_pagamento: documento.pagamentos?.[0]?.metodo || 'dinheiro',
      dados_pagamento: documento.pagamentos || [],
      vendedor_nome: documento.vendedor_nome || 'N/A',
      metadados: {
        origem: documento.metadados?.origem || 'PDV',
        documento_id: documento.id,
        vendedor_nome: documento.vendedor_nome,
        cliente_info: documento.cliente,
        atualizado_em: new Date().toISOString(),
        tipo_atualizacao: 'finalizacao_pagamento',
        // Garantir que dados de pontos persistam em atualizações
        dados_pontos: documento.dadosPontos || documento.metadados?.dados_pontos || null,
      },
      itens: documento.itens.map(item => ({
        produto_id: parseInt(item.id_produto),
        produto_nome: item.nome || item.produto_nome || '',
        produto_codigo: item.codigo || item.produto_codigo || '',
        produto_unidade: item.unidadeMedida || item.produto_unidade || 'un',
        produto_descricao: item.descricao || item.produto_descricao || '',
        quantidade: parseFloat(item.quantidade),
        valor_unitario: parseFloat(item.preco_venda_unitario),
        desconto: 0,
        tipo_desconto: 'valor',
        subtotal: parseFloat(item.quantidade * item.preco_venda_unitario),
        valor_total: parseFloat(item.quantidade * item.preco_venda_unitario),
        observacoes: item.observacoes || '',
        dados_adicionais: {
          imagem_principal: item.imagem_principal || '',
          variacao: item.variacao || null,
          promocao_info: item.promocao_info || null
        }
      }))
    };

    // Log dos dados sendo enviados para atualização
    console.log('📝 Dados da venda sendo atualizados na API:', {
      venda_id: vendaId,
      metadados: updateData.metadados,
      dados_pontos: updateData.metadados?.dados_pontos,
      valor_desconto: updateData.valor_desconto,
      valor_total: updateData.valor_total
    });

    // Atualizar a venda na API
    const response = await vendaService.update(vendaId, updateData);

    // Registrar lançamentos de fluxo de caixa
    await registrarLancamentosFluxoCaixa(documento, vendedorAtual);

    // Registrar desconto de funcionário se aplicável
    if (documento.cliente?.tipo_cadastro_especial === 'Funcionário') {
      await registrarDescontoFuncionarioPDV(documento, documento.cliente, [], null);
    }

    
    // Registrar ação se callback fornecido
    if (registrarAcaoCallback) {
      registrarAcaoCallback(
        'atualizar_venda_existente',
        'Venda PDV',
        vendaId,
        null,
        documento
      );
    }
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Erro ao atualizar venda existente:', error);
    throw new Error(`Erro ao atualizar venda: ${error.message}`);
  }
};