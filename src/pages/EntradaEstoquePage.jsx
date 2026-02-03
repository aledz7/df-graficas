import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { PackageSearch } from 'lucide-react';
import { motion } from 'framer-motion';
import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';
import { produtoService, historicoEntradaEstoqueService, dadosUsuarioService } from '@/services/api';

import EntradaEstoqueFormNota from '@/components/entrada-estoque/EntradaEstoqueFormNota';
import EntradaEstoqueBuscaProduto from '@/components/entrada-estoque/EntradaEstoqueBuscaProduto';
import EntradaEstoqueListaProdutosDisponiveis from '@/components/entrada-estoque/EntradaEstoqueListaProdutosDisponiveis';
import EntradaEstoqueItensParaEntrada from '@/components/entrada-estoque/EntradaEstoqueItensParaEntrada';
import EntradaEstoqueHistorico from '@/components/entrada-estoque/EntradaEstoqueHistorico';

const EntradaEstoquePage = ({ vendedorAtual }) => {
  const { toast } = useToast();
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [itensEntrada, setItensEntrada] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  const [historicoEntradas, setHistoricoEntradas] = useState([]);
  const [notaInfo, setNotaInfo] = useState({ fornecedor: '', numeroNota: '', dataNota: new Date().toISOString().split('T')[0] });
  const [fornecedores, setFornecedores] = useState([]);

  const loadData = useCallback(async () => {
    try {
      // Verificar autenticação primeiro
      const token = apiDataManager.getToken();

      // Carregar produtos da API usando produtoService
      let produtosArray = [];
      try {
        const produtosResponse = await produtoService.getAll();
        produtosArray = produtosResponse.data || [];
      } catch (produtosError) {
        console.error('Erro ao carregar produtos da API:', produtosError);
        // Fallback para apiDataManager
        const storedProdutos = safeJsonParse(await apiDataManager.getItem('produtos', false, true), []);
        produtosArray = Array.isArray(storedProdutos) ? storedProdutos : [];
      }

      const produtosAtivos = produtosArray.filter(p => p.status !== false); // Inclui produtos sem status definido
      setProdutosDisponiveis(produtosAtivos);
      setFilteredProdutos(produtosAtivos); // Inicializa com todos os produtos

      // Carregar histórico de entradas (usando fallback por enquanto)
      let historicoArray = [];
      try {
        // Tentar carregar da API primeiro
        const historicoResponse = await historicoEntradaEstoqueService.getAll({ per_page: 100 });

        // Verificar diferentes estruturas possíveis da resposta
        let dadosHistorico = [];
        if (Array.isArray(historicoResponse.data)) {
          dadosHistorico = historicoResponse.data;
        } else if (Array.isArray(historicoResponse.data?.data)) {
          dadosHistorico = historicoResponse.data.data;
        } else if (Array.isArray(historicoResponse)) {
          dadosHistorico = historicoResponse;
        } else {
          console.warn('⚠️ Estrutura de resposta inesperada:', historicoResponse);
          dadosHistorico = [];
        }

        historicoArray = dadosHistorico;
      } catch (apiError) {
        console.warn('⚠️ Erro ao carregar histórico da API, usando localStorage:', apiError);
        // Fallback para localStorage
        const storedHistorico = safeJsonParse(await apiDataManager.getItem('historico_entrada_estoque', false, true), []);
        historicoArray = Array.isArray(storedHistorico) ? storedHistorico : [];
      }

      // Garantir que historicoArray seja sempre um array antes de usar .sort()
      const historicoArrayFinal = Array.isArray(historicoArray) ? historicoArray : [];
      const historicoOrdenado = historicoArrayFinal.sort((a, b) => new Date(b.data_entrada || b.dataEntrada) - new Date(a.data_entrada || a.dataEntrada));
      setHistoricoEntradas(historicoOrdenado);

      // Carregar fornecedores usando o serviço específico
      try {
        const fornecedoresResponse = await dadosUsuarioService.getFornecedores();
        const fornecedoresArray = Array.isArray(fornecedoresResponse.data) ? fornecedoresResponse.data : [];
        setFornecedores(fornecedoresArray);
      } catch (error) {
        // Fallback para apiDataManager
        const storedFornecedores = safeJsonParse(await apiDataManager.getItem('fornecedores', false, true), []);
        const fornecedoresArray = Array.isArray(storedFornecedores) ? storedFornecedores : [];
        setFornecedores(fornecedoresArray);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da API:', error);
      // Fallback para localStorage em caso de erro
      const storedProdutos = safeJsonParse(await apiDataManager.getItem('produtos'), []);
      const produtosArray = Array.isArray(storedProdutos) ? storedProdutos : [];
      const produtosAtivos = produtosArray.filter(p => p.status !== false);
      setProdutosDisponiveis(produtosAtivos);
      setFilteredProdutos(produtosAtivos);

      const storedHistorico = safeJsonParse(await apiDataManager.getItem('historico_entrada_estoque'), []);
      const historicoArray = Array.isArray(storedHistorico) ? storedHistorico : [];
      // Garantir que historicoArray seja sempre um array antes de usar .sort()
      const historicoArrayFinal = Array.isArray(historicoArray) ? historicoArray : [];
      const historicoOrdenado = historicoArrayFinal.sort((a, b) => new Date(b.data_entrada || b.dataEntrada) - new Date(a.data_entrada || a.dataEntrada));
      setHistoricoEntradas(historicoOrdenado);

      // Fallback para fornecedores
      try {
        const fornecedoresResponse = await dadosUsuarioService.getFornecedores();
        const fornecedoresArray = Array.isArray(fornecedoresResponse.data) ? fornecedoresResponse.data : [];
        setFornecedores(fornecedoresArray);
      } catch (error) {
        console.error('Erro ao carregar fornecedores no fallback:', error);
        const storedFornecedores = safeJsonParse(await apiDataManager.getItem('fornecedores'), []);
        const fornecedoresArray = Array.isArray(storedFornecedores) ? storedFornecedores : [];
        setFornecedores(fornecedoresArray);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    // Garantir que produtosDisponiveis seja sempre um array antes de usar .filter()
    const produtosDisponiveisArray = Array.isArray(produtosDisponiveis) ? produtosDisponiveis : [];

    // Se não há termo de busca, mostrar todos os produtos
    if (!lowerSearchTerm) {
      setFilteredProdutos(produtosDisponiveisArray);
      return;
    }

    const produtosFiltrados = produtosDisponiveisArray.filter(produto => {
      const nome = (produto.nome || '').toLowerCase();
      const codigo = (produto.codigo_produto || '').toLowerCase();
      const codigoBarras = (produto.codigo_barras || '').toLowerCase();

      return nome.includes(lowerSearchTerm) ||
        codigo.includes(lowerSearchTerm) ||
        codigoBarras.includes(lowerSearchTerm);
    });

    setFilteredProdutos(produtosFiltrados);
  }, [searchTerm, produtosDisponiveis]);

  const handleAddItem = (produto) => {
    // Garantir que itensEntrada seja sempre um array antes de usar .find()
    const itensEntradaArray1 = Array.isArray(itensEntrada) ? itensEntrada : [];
    const itemExistente = itensEntradaArray1.find(item => item.id === produto.id);
    if (itemExistente) {
      setItensEntrada(itensEntradaArray1.map(item =>
        item.id === produto.id ? { ...item, quantidade: (parseFloat(item.quantidade) || 0) + 1 } : item
      ));
    } else {
      // Garantir que itensEntrada seja sempre um array antes de usar spread operator
      const itensEntradaArray2 = Array.isArray(itensEntrada) ? itensEntrada : [];
      setItensEntrada([...itensEntradaArray2, {
        ...produto,
        quantidade: 1,
        custoUnitario: produto.preco_custo || '0',
        preco_venda: produto.preco_venda || ''
      }]);
    }
  };

  const handleUpdateItem = (id, field, value) => {
    // Garantir que itensEntrada seja sempre um array antes de usar .map()
    const itensEntradaArray3 = Array.isArray(itensEntrada) ? itensEntrada : [];
    setItensEntrada(itensEntradaArray3.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleRemoveItem = (id) => {
    // Garantir que itensEntrada seja sempre um array antes de usar .filter()
    const itensEntradaArray4 = Array.isArray(itensEntrada) ? itensEntrada : [];
    setItensEntrada(itensEntradaArray4.filter(item => item.id !== id));
  };

  const testarAPI = async () => {
    try {
      const token = apiDataManager.getToken();

      // Teste simples com um valor pequeno
      await apiDataManager.setItem('teste_api', { teste: 'funcionando', timestamp: new Date().toISOString() }, true);
      toast({ title: "API Funcionando", description: "A API está respondendo corretamente.", variant: "success" });
    } catch (error) {
      console.error('Erro no teste da API:', error);
      toast({ title: "Erro na API", description: "A API não está respondendo corretamente.", variant: "destructive" });
    }
  };

  const testarHistorico = async () => {
    try {

      // Testar API
      try {
        const historicoResponse = await historicoEntradaEstoqueService.getAll();
      } catch (apiError) {
        console.error('🧪 Erro na API:', apiError);
        toast({ title: "Erro na API", description: "Falha ao carregar da API.", variant: "destructive" });
      }

      // Testar localStorage
      try {
        const storedHistorico = await apiDataManager.getItem('historico_entrada_estoque', false, true);
      } catch (localError) {
        console.error('🧪 Erro no localStorage:', localError);
        toast({ title: "Erro no LocalStorage", description: "Falha ao carregar do localStorage.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Erro no teste do histórico:', error);
    }
  };

  const handleFinalizarEntrada = async () => {
    // Verificar se há token de autenticação
    const token = apiDataManager.getToken();

    // Garantir que itensEntrada seja sempre um array antes de verificar .length
    const itensEntradaArrayForLength = Array.isArray(itensEntrada) ? itensEntrada : [];
    if (itensEntradaArrayForLength.length === 0) {
      toast({ title: "Nenhum item adicionado", description: "Adicione produtos para registrar a entrada.", variant: "destructive" });
      return;
    }

    // Carregar produtos da API
    let todosProdutos = [];
    try {
      const produtosResponse = await produtoService.getAll();
      todosProdutos = Array.isArray(produtosResponse.data) ? produtosResponse.data : [];
    } catch (error) {
      console.error('Erro ao carregar produtos da API:', error);
      // Fallback para apiDataManager
      const storedProdutos = safeJsonParse(await apiDataManager.getItem('produtos', false, true), []);
      todosProdutos = Array.isArray(storedProdutos) ? storedProdutos : [];
    }

    // Garantir que itensEntrada seja sempre um array antes de usar .forEach()
    const itensEntradaArray5 = Array.isArray(itensEntrada) ? itensEntrada : [];
    itensEntradaArray5.forEach(itemEntrada => {
      const produtoIndexOriginal = todosProdutos.findIndex(p => p.id === itemEntrada.id);
      if (produtoIndexOriginal !== -1) { // Produto existente
        // NÃO somar o estoque aqui - apenas atualizar preços
        // O estoque será atualizado no backend usando o método atualizarEstoque
        if (parseFloat(itemEntrada.custoUnitario) > 0 && todosProdutos[produtoIndexOriginal].preco_custo !== itemEntrada.custoUnitario) {
          todosProdutos[produtoIndexOriginal].preco_custo = itemEntrada.custoUnitario;
        }
        if (itemEntrada.preco_venda && parseFloat(itemEntrada.preco_venda) > 0) {
          todosProdutos[produtoIndexOriginal].preco_venda = itemEntrada.preco_venda;
        }

      } else if (itemEntrada.isNovoDoXml) { // Produto novo do XML
        const precoVendaCalculado = itemEntrada.preco_venda && parseFloat(itemEntrada.preco_venda) > 0
          ? itemEntrada.preco_venda
          : (parseFloat(itemEntrada.custoUnitario) * 1.5).toFixed(2); // Margem padrão se não definido

        const novoProdutoDoXml = {
          id: itemEntrada.id,
          nome: itemEntrada.nome,
          codigo_produto: itemEntrada.codigo_produto,
          preco_custo: itemEntrada.custoUnitario,
          preco_venda: precoVendaCalculado,
          estoque: itemEntrada.quantidade,
          unidade_medida: itemEntrada.unidade_medida || 'UN',
          status: true,
          categoria: itemEntrada.categoria || 'Importado XML',
          data_cadastro: new Date().toISOString(),
        };
        todosProdutos.push(novoProdutoDoXml);
        toast({ title: "Novo Produto Cadastrado", description: `Produto "${novoProdutoDoXml.nome}" foi adicionado ao catálogo.`, variant: "success", duration: 5000 });
      }
    });

    // Atualizar produtos na API usando produtoService
    try {
      for (const produto of todosProdutos) {
        // Verificar se o produto tem ID válido
        if (!produto.id) {
          continue;
        }

        const produtoId = String(produto.id);

        // Verificar se é um produto novo do XML (ID temporário)
        if (produtoId.startsWith('xml-')) {
          try {
            // Remover o prefixo xml- e criar novo produto
            const novoProduto = { ...produto };
            delete novoProduto.id; // Remover ID temporário para criar novo

            // Limpar e validar dados antes de enviar
            const produtoLimpo = limparDadosProduto(novoProduto);
            await produtoService.create(produtoLimpo);
          } catch (createError) {
            console.error('Erro ao criar novo produto:', createError);
          }
          continue;
        }

        // Verificar se é um ID numérico válido (produto existente)
        if (isNaN(produtoId)) {
          continue;
        }

        // Para produtos existentes, primeiro atualizar preços se necessário
        const produtoLimpo = limparDadosProduto(produto);
        // Remover o campo estoque para não sobrescrever
        delete produtoLimpo.estoque;
        await produtoService.update(produto.id, produtoLimpo);
      }

      // Agora atualizar o estoque dos produtos existentes usando o método específico
      for (const itemEntrada of itensEntradaArray5) {
        const produtoId = String(itemEntrada.id);

        // Pular produtos novos do XML (já foram criados acima)
        if (produtoId.startsWith('xml-') || isNaN(produtoId)) {
          continue;
        }

        // Atualizar estoque usando o método específico
        try {
          await produtoService.atualizarEstoque(itemEntrada.id, {
            quantidade: parseFloat(itemEntrada.quantidade) || 0,
            tipo: 'entrada',
            observacao: `Entrada de estoque - Nota: ${notaInfo.numeroNota || 'N/A'}`
          });
        } catch (estoqueError) {
          console.error('Erro ao atualizar estoque do produto:', estoqueError);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar produtos na API:', error);
      // Fallback para apiDataManager
      await apiDataManager.setItem('produtos', todosProdutos, true);
    }

    // Preparar dados da entrada para a nova API
    const entradaRegistrada = {
      codigo_entrada: `ENT-${Date.now()}`,
      data_entrada: new Date().toISOString().split('T')[0],
      numero_nota: notaInfo.numeroNota || null,
      data_nota: notaInfo.dataNota || null,
      fornecedor_id: notaInfo.fornecedor || null,
      fornecedor_nome: fornecedores.find(f => f.id === notaInfo.fornecedor)?.nome || null,
      usuario_id: vendedorAtual ? vendedorAtual.id : 2, // ID padrão se não houver vendedor
      usuario_nome: vendedorAtual ? vendedorAtual.nome : 'Admin', // Nome padrão se não houver vendedor
      itens: (Array.isArray(itensEntrada) ? itensEntrada : []).map(i => ({
        id: i.id,
        nome: i.nome,
        quantidade: parseFloat(i.quantidade) || 0,
        custoUnitario: parseFloat(i.custoUnitario) || 0,
        preco_venda_registrado: i.preco_venda || null
      })),
      observacoes: `Entrada registrada por ${vendedorAtual ? vendedorAtual.nome : 'Sistema'}`,
      status: 'confirmada',
      data_confirmacao: new Date().toISOString()
    };

    try {
      // Salvar na nova API de histórico
      const response = await historicoEntradaEstoqueService.create(entradaRegistrada);

      // Atualizar lista local
      const novaEntrada = response.data;
      const historicoEntradasArray = Array.isArray(historicoEntradas) ? historicoEntradas : [];
      const novoHistorico = [novaEntrada, ...historicoEntradasArray];
      setHistoricoEntradas(novoHistorico);

    } catch (error) {
      console.error('Erro ao salvar entrada na API:', error);

      // Fallback para apiDataManager (formato antigo)
      const entradaAntiga = {
        id: `ENT-${Date.now()}`,
        dataEntrada: new Date().toISOString(),
        ...notaInfo,
        itens: (Array.isArray(itensEntrada) ? itensEntrada : []).map(i => ({
          id: i.id,
          nome: i.nome,
          quantidade: i.quantidade,
          custoUnitario: i.custoUnitario,
          preco_venda_registrado: i.preco_venda
        })),
        responsavel: vendedorAtual ? { id: vendedorAtual.id, nome: vendedorAtual.nome } : { id: 'sistema', nome: 'Sistema' }
      };

      const historicoEntradasArray = Array.isArray(historicoEntradas) ? historicoEntradas : [];
      const novoHistorico = [entradaAntiga, ...historicoEntradasArray];
      await apiDataManager.setItem('historico_entrada_estoque', novoHistorico, true);
      setHistoricoEntradas(novoHistorico);
    }
    setItensEntrada([]);
    setNotaInfo({ fornecedor: '', numeroNota: '', dataNota: new Date().toISOString().split('T')[0] });
    loadData();

    toast({ title: "Entrada Registrada!", description: "O estoque dos produtos foi atualizado.", className: "bg-green-500 text-white" });
  };

  const getTextContent = (node, tagName) => {
    const element = node.getElementsByTagName(tagName)[0];
    return element ? element.textContent : null;
  };

  const limparDadosProduto = (produto) => {
    const produtoLimpo = { ...produto };

    // Converter campos numéricos (aceita valores fracionados)
    if (produtoLimpo.estoque !== undefined && produtoLimpo.estoque !== null && produtoLimpo.estoque !== '') {
      produtoLimpo.estoque = parseFloat(produtoLimpo.estoque) || 0;
    } else {
      produtoLimpo.estoque = 0; // Valor padrão
    }

    if (produtoLimpo.estoque_minimo !== undefined && produtoLimpo.estoque_minimo !== null && produtoLimpo.estoque_minimo !== '') {
      produtoLimpo.estoque_minimo = parseFloat(produtoLimpo.estoque_minimo) || 0;
    } else {
      produtoLimpo.estoque_minimo = 0; // Valor padrão
    }

    if (produtoLimpo.estoque_maximo !== undefined && produtoLimpo.estoque_maximo !== null && produtoLimpo.estoque_maximo !== '') {
      produtoLimpo.estoque_maximo = parseFloat(produtoLimpo.estoque_maximo) || 0;
    } else {
      produtoLimpo.estoque_maximo = 0; // Valor padrão
    }

    // Converter campos de preço para números
    if (produtoLimpo.preco_custo !== undefined) {
      produtoLimpo.preco_custo = parseFloat(produtoLimpo.preco_custo) || 0;
    }

    if (produtoLimpo.preco_venda !== undefined) {
      produtoLimpo.preco_venda = parseFloat(produtoLimpo.preco_venda) || 0;
    }

    // Garantir que status seja booleano
    if (produtoLimpo.status !== undefined) {
      produtoLimpo.status = Boolean(produtoLimpo.status);
    }

    // Garantir que categoria_id seja sempre definido
    if (!produtoLimpo.categoria_id || produtoLimpo.categoria_id === '' || produtoLimpo.categoria_id === null) {
      // Se não tem categoria_id, verificar se tem categoria
      if (produtoLimpo.categoria && produtoLimpo.categoria !== '' && produtoLimpo.categoria !== null) {
        produtoLimpo.categoria_id = parseInt(produtoLimpo.categoria) || 1;
        delete produtoLimpo.categoria; // Remover campo antigo
      } else {
        produtoLimpo.categoria_id = 1; // Categoria padrão (geral)
      }
    } else {
      // Converter para número se for string
      produtoLimpo.categoria_id = parseInt(produtoLimpo.categoria_id) || 1;
    }

    // Remover campos vazios ou undefined (exceto categoria_id)
    Object.keys(produtoLimpo).forEach(key => {
      if (key !== 'categoria_id' && (produtoLimpo[key] === undefined || produtoLimpo[key] === null || produtoLimpo[key] === '')) {
        delete produtoLimpo[key];
      }
    });

    return produtoLimpo;
  };

  const handleImportXML = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlString = e.target.result;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        const errorNode = xmlDoc.getElementsByTagName("parsererror")[0];
        if (errorNode) {
          console.error("Erro de parsing XML:", errorNode.textContent);
          toast({ title: "Erro de Parsing XML", description: "O arquivo XML parece estar malformado. Verifique o console para detalhes.", variant: "destructive", duration: 7000 });
          return;
        }

        const produtosNota = [];

        // Tentar diferentes formatos de XML
        let detElements = xmlDoc.getElementsByTagName("det");
        let produtoElements = xmlDoc.getElementsByTagName("produto");

        if (detElements.length > 0) {
          // Formato NFe (Nota Fiscal Eletrônica)
          for (let i = 0; i < detElements.length; i++) {
            const det = detElements[i];
            const prodNode = det.getElementsByTagName("prod")[0];
            if (!prodNode) continue;

            const codigo = getTextContent(prodNode, "cProd") || `temp-${Date.now()}-${i}`;
            const nome = getTextContent(prodNode, "xProd") || 'Produto Desconhecido';
            const qCom = getTextContent(prodNode, "qCom");
            const vUnCom = getTextContent(prodNode, "vUnCom");
            const uCom = getTextContent(prodNode, "uCom");

            const quantidade = qCom ? parseFloat(qCom) : 1;
            const custo = vUnCom ? parseFloat(vUnCom).toFixed(2) : '0.00';
            const unidade = uCom || 'UN';

            produtosNota.push({ codigo, nome, quantidade, custo, unidade });
          }
        } else if (produtoElements.length > 0) {
          // Formato de lista de produtos personalizada
          for (let i = 0; i < produtoElements.length; i++) {
            const produto = produtoElements[i];

            const codigo = getTextContent(produto, "codigo") || `temp-${Date.now()}-${i}`;
            const nome = getTextContent(produto, "nome") || 'Produto Desconhecido';
            const quantidade = getTextContent(produto, "quantidade") ? parseFloat(getTextContent(produto, "quantidade")) : 1;
            const preco = getTextContent(produto, "preco") ? parseFloat(getTextContent(produto, "preco")).toFixed(2) : '0.00';
            const unidade = getTextContent(produto, "unidade") || 'UN';
            const fornecedor = getTextContent(produto, "fornecedor") || '';

            produtosNota.push({
              codigo,
              nome,
              quantidade,
              custo: preco,
              unidade,
              fornecedor
            });
          }
        } else {
          toast({
            title: "XML Inválido",
            description: "Nenhum produto encontrado no XML. Formatos suportados: NFe (tag <det>) ou lista de produtos (tag <produto>).",
            variant: "destructive"
          });
          return;
        }

        // Definir fornecedor se não foi definido pelo NFe
        if (produtoElements.length > 0 && produtosNota.length > 0) {
          // Para XML de lista de produtos, usar o fornecedor do primeiro produto
          const primeiroProduto = produtosNota[0];
          if (primeiroProduto.fornecedor) {
            const fornecedoresArray2 = Array.isArray(fornecedores) ? fornecedores : [];
            const fornecedorExistente = fornecedoresArray2.find(f => (f.nome || '').toLowerCase() === (primeiroProduto.fornecedor || '').toLowerCase());
            if (fornecedorExistente) {
              setNotaInfo(prev => ({ ...prev, fornecedor: fornecedorExistente.id }));
            } else {
              setNotaInfo(prev => ({ ...prev, fornecedor: `xml-${primeiroProduto.fornecedor}` }));
              toast({
                title: "Fornecedor não cadastrado",
                description: `O fornecedor "${primeiroProduto.fornecedor}" não foi encontrado. Considere cadastrá-lo.`,
                variant: "warning",
                duration: 7000
              });
            }
          }
        }

        const nfeNode = xmlDoc.getElementsByTagName("NFe")[0] || xmlDoc.getElementsByTagName("nfeProc")[0]?.getElementsByTagName("NFe")[0];
        if (nfeNode) {
          const ide = nfeNode.getElementsByTagName("ide")[0];
          if (ide) {
            const nNF = getTextContent(ide, "nNF");
            const dhEmi = getTextContent(ide, "dhEmi") || getTextContent(ide, "dEmi");
            if (nNF) setNotaInfo(prev => ({ ...prev, numeroNota: nNF }));
            if (dhEmi) setNotaInfo(prev => ({ ...prev, dataNota: new Date(dhEmi).toISOString().split('T')[0] }));
          }
          const emit = nfeNode.getElementsByTagName("emit")[0];
          if (emit) {
            const xNome = getTextContent(emit, "xNome");
            if (xNome) {
              const nomeFornecedorXml = xNome;
              // Garantir que fornecedores seja sempre um array antes de usar .find()
              const fornecedoresArray2 = Array.isArray(fornecedores) ? fornecedores : [];
              const fornecedorExistente = fornecedoresArray2.find(f => (f.nome || '').toLowerCase() === (nomeFornecedorXml || '').toLowerCase());
              if (fornecedorExistente) {
                setNotaInfo(prev => ({ ...prev, fornecedor: fornecedorExistente.id }));
              } else {
                setNotaInfo(prev => ({ ...prev, fornecedor: `xml-${nomeFornecedorXml}` }));
                toast({ title: "Fornecedor não cadastrado", description: `O fornecedor "${nomeFornecedorXml}" não foi encontrado. Considere cadastrá-lo.`, variant: "warning", duration: 7000 });
              }
            }
          }
        }

        const novosItensEntrada = produtosNota.map(pNota => {
          // Garantir que produtosDisponiveis seja sempre um array antes de usar .find()
          const produtosDisponiveisArray2 = Array.isArray(produtosDisponiveis) ? produtosDisponiveis : [];
          const produtoExistente = produtosDisponiveisArray2.find(pDisp => pDisp.codigo_produto === pNota.codigo || (pDisp.nome || '').toLowerCase() === (pNota.nome || '').toLowerCase());
          if (produtoExistente) {
            return {
              ...produtoExistente,
              quantidade: pNota.quantidade,
              custoUnitario: pNota.custo,
              preco_venda: produtoExistente.preco_venda || '', // Mantém preço de venda se já existir
              isNovoDoXml: false
            };
          }
          // Para novos produtos, o preço de venda será calculado com margem padrão ou pelo markup global.
          // Inicialmente deixamos em branco para o markup funcionar.
          return {
            id: `xml-${pNota.codigo}-${Date.now()}`,
            codigo_produto: pNota.codigo,
            nome: pNota.nome,
            quantidade: pNota.quantidade,
            custoUnitario: pNota.custo,
            preco_custo: pNota.custo,
            preco_venda: '', // Preço de venda será definido pelo markup ou padrão ao finalizar
            unidade_medida: pNota.unidade,
            categoria_id: 1, // Categoria padrão (geral)
            isNovoDoXml: true
          };
        });

        setItensEntrada(prevItens => {
          // Garantir que prevItens seja sempre um array antes de usar spread operator
          const prevItensArray = Array.isArray(prevItens) ? prevItens : [];
          const itensCombinados = [...prevItensArray];
          novosItensEntrada.forEach(ni => {
            const idxExistente = itensCombinados.findIndex(pi => pi.id === ni.id || (pi.codigo_produto === ni.codigo_produto && pi.nome === ni.nome));
            if (idxExistente > -1) {
              // Se já existe na lista, soma a quantidade e atualiza o custo se o novo for diferente
              itensCombinados[idxExistente].quantidade = (parseFloat(itensCombinados[idxExistente].quantidade) || 0) + parseFloat(ni.quantidade);
              if (itensCombinados[idxExistente].custoUnitario !== ni.custoUnitario) {
                itensCombinados[idxExistente].custoUnitario = ni.custoUnitario;
                // Se o custo mudou, o preço de venda também pode precisar ser recalculado pelo markup
                itensCombinados[idxExistente].preco_venda = '';
              }
            } else {
              itensCombinados.push(ni);
            }
          });
          return itensCombinados;
        });

        const formatoDetectado = detElements.length > 0 ? 'NFe' : 'Lista de Produtos';
        toast({
          title: "XML Importado com Sucesso!",
          description: `${produtosNota.length} tipos de produtos carregados (formato: ${formatoDetectado}). Verifique e ajuste preços de venda.`,
          duration: 7000,
          className: "bg-green-500 text-white"
        });

      } catch (error) {
        console.error("Erro ao processar XML:", error);
        toast({ title: "Erro ao Ler XML", description: "Não foi possível processar o arquivo. Verifique o formato e a estrutura do XML. Detalhes no console.", variant: "destructive", duration: 10000 });
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <PackageSearch className="mr-2 h-6 w-6 text-primary" />
                Registrar Entrada de Estoque
              </div>
              <div className="flex gap-2">
                <button
                  onClick={testarAPI}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Testar API
                </button>
                <button
                  onClick={testarHistorico}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Testar Histórico
                </button>
              </div>
            </CardTitle>
            <CardDescription>Adicione produtos e suas quantidades recebidas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <EntradaEstoqueFormNota notaInfo={notaInfo} setNotaInfo={setNotaInfo} fornecedores={fornecedores} />
            <EntradaEstoqueBuscaProduto searchTerm={searchTerm} setSearchTerm={setSearchTerm} handleImportXML={handleImportXML} />
            <EntradaEstoqueListaProdutosDisponiveis filteredProdutos={filteredProdutos} handleAddItem={handleAddItem} />
          </CardContent>
        </Card>

        <EntradaEstoqueItensParaEntrada
          itensEntrada={itensEntrada}
          setItensEntrada={setItensEntrada}
          handleUpdateItem={handleUpdateItem}
          handleRemoveItem={handleRemoveItem}
          handleFinalizarEntrada={handleFinalizarEntrada}
        />
      </div>

      <EntradaEstoqueHistorico historicoEntradas={historicoEntradas} fornecedores={fornecedores} />
    </motion.div>
  );
};

export default EntradaEstoquePage;