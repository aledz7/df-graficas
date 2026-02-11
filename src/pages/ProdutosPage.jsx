import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProdutoList from '@/components/produtos/ProdutoList';
import ProdutoForm from '@/components/produtos/ProdutoForm';
import AcoesEmMassaProdutos from '@/components/produtos/AcoesEmMassaProdutos';
import CompartilharProdutoModal from '@/components/produtos/CompartilharProdutoModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Search, Upload, Download, Trash2, Edit, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { safeJsonParse, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { exportToExcel, importFromExcel } from '@/lib/utils'; // Supondo que existam
import { produtoService, categoriaService, historicoEntradaEstoqueService } from '@/services/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PermissionGate, { useActionPermissions } from '@/components/PermissionGate';

const ProdutosPage = ({ vendedorAtual }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Verificar permissões para ações específicas
  const { canCreate, canEdit, canDelete, canChangePrice } = useActionPermissions('gerenciar_produtos', {
    create: 'produtos_cadastrar',
    edit: 'produtos_editar',
    delete: 'produtos_excluir',
    changePrice: 'produtos_alterar_preco'
  });
  
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [produtoParaCompartilhar, setProdutoParaCompartilhar] = useState(null);
  const [isCompartilharModalOpen, setIsCompartilharModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  const [isFilteringEstoqueBaixo, setIsFilteringEstoqueBaixo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalItems, setTotalItems] = useState(0);

  const [selectedProdutosIds, setSelectedProdutosIds] = useState([]);
  const [showConfirmDeleteManyModal, setShowConfirmDeleteManyModal] = useState(false);

  const confirmDeleteManyProdutos = async () => {
    if (selectedProdutosIds.length === 0) return;
    
    console.log('Tentando excluir produtos em massa:', selectedProdutosIds);
    
    try {
      const deletePromises = selectedProdutosIds.map(async (id) => {
        console.log('Excluindo produto ID:', id);
        return await produtoService.delete(id);
      });
      
      const results = await Promise.all(deletePromises);
      console.log('Resultados das exclusões:', results);
      
      // Limpar seleção e fechar modal
      setSelectedProdutosIds([]);
      setShowConfirmDeleteManyModal(false);
      
      // Recarregar dados após exclusão
      await loadData(currentPage, searchTerm);
      
      toast({
        title: "Sucesso",
        description: `${selectedProdutosIds.length} produto(s) excluído(s) com sucesso.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Erro ao excluir produtos:", error);
      console.error("Detalhes do erro:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir os produtos selecionados.",
        variant: "destructive"
      });
    }
  };

  const loadData = useCallback(async (page = 1, search = '') => {
    setIsLoading(true);
    try {
      // Construir parâmetros da API
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString()
      });
      
      // Adicionar busca se fornecida
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      const produtosResponse = await produtoService.getAll(`?${params.toString()}`);
      
      // Extrair os dados da resposta - o backend retorna dados paginados
      const responseData = produtosResponse.data || produtosResponse;
      const produtosData = responseData.data || [];
      const metaData = responseData.meta || responseData;
      
      const produtosArray = Array.isArray(produtosData) ? produtosData : [];
      
      setProdutos(produtosArray);
      // Só atualizar filteredProdutos se não estivermos filtrando por estoque baixo
      if (!isFilteringEstoqueBaixo) {
        setFilteredProdutos(produtosArray);
      }
      
      // Atualizar informações de paginação
      setCurrentPage(metaData.current_page || 1);
      setTotalPages(metaData.last_page || 1);
      setTotalItems(metaData.total || produtosArray.length);
      
      // Carregar categorias apenas na primeira vez
      if (page === 1) {
        const categoriasResponse = await categoriaService.getAll();
        
        // Extrair os dados da resposta - o backend retorna dados paginados
        const categoriasData = categoriasResponse.data?.data?.data || categoriasResponse.data?.data || categoriasResponse.data || [];
        const categoriasArray = Array.isArray(categoriasData) ? categoriasData : [];
        
        setCategorias(categoriasArray);
      }

      if ((location.state?.openModal || location.state?.openNewProductModal) && page === 1) {
        handleNovoProduto();
        navigate(location.pathname, { replace: true, state: {} }); 
      }
      if (location.state?.filterEstoqueBaixo && page === 1) {
        setIsFilteringEstoqueBaixo(true);
        try {
          // Usar API específica para estoque baixo
          const estoqueBaixoResponse = await produtoService.getEstoqueBaixo();
          setFilteredProdutos(estoqueBaixoResponse.data);
          navigate(location.pathname, { replace: true, state: {} });
        } catch (error) {
          console.error('Erro ao carregar produtos com estoque baixo:', error);
          // Fallback: usar a mesma lógica do modal para buscar produtos com estoque baixo
          const { loadData } = await import('@/lib/utils');
          const produtosLocal = await loadData('produtos', []);
          const { buscarProdutosEstoqueBaixo } = await import('@/utils/estoqueBaixoUtils');
          const produtosEstoqueBaixo = await buscarProdutosEstoqueBaixo(produtosLocal);
          setFilteredProdutos(produtosEstoqueBaixo);
          navigate(location.pathname, { replace: true, state: {} });
        }
      }

    } catch (error) {
      console.error("Erro ao carregar dados de produtos:", error);
      toast({ title: "Erro ao carregar dados", description: "Não foi possível buscar os produtos e categorias do servidor.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [perPage, toast, location.state, navigate]);

  useEffect(() => {
    loadData(1, searchTerm);
  }, [loadData]);

  // Listener para atualizações de estoque vindas do dashboard
  useEffect(() => {
    const handleEstoqueAtualizado = (event) => {
      console.log('📡 Evento de atualização de estoque recebido na página de produtos:', event.detail);
      
      // Recarregar dados se estivermos na página atual
      if (window.location.pathname === '/cadastros/produtos') {
        console.log('🔄 Recarregando dados da página de produtos...');
        loadData(currentPage, searchTerm);
      }
    };

    window.addEventListener('produtoEstoqueAtualizado', handleEstoqueAtualizado);
    
    return () => {
      window.removeEventListener('produtoEstoqueAtualizado', handleEstoqueAtualizado);
    };
  }, [loadData, currentPage, searchTerm]);

  // Effect para busca - usa debounce para evitar muitas chamadas à API
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        loadData(1, searchTerm);
      } else {
        setCurrentPage(1);
        loadData(1, searchTerm);
      }
      setSelectedProdutosIds([]); // Limpar seleção ao filtrar
    }, 500); // 500ms de debounce
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleNovoProduto = () => {
    setProdutoSelecionado(null);
    setIsModalOpen(true);
  };

  const clearEstoqueBaixoFilter = () => {
    setIsFilteringEstoqueBaixo(false);
    setFilteredProdutos(produtos);
  };

  const handleEditProduto = (produto) => {
    setProdutoSelecionado(produto);
    setIsModalOpen(true);
  };

  // Gerar código de produto único
  const gerarCodigoProduto = () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 8).toUpperCase();
    const microTime = performance.now().toString(36).replace('.', '').substr(0, 4).toUpperCase();
    return `PROD-${timestamp}${randomSuffix}${microTime}`;
  };

  const handleSaveProduto = async (produtoData, cadastrarOutro = false) => {
    try {
      const isEditing = produtos.some(p => p.id === produtoData.id);
      let response;
      
      if (isEditing) {
        // Atualizar produto existente
        response = await produtoService.update(produtoData.id, produtoData);
        toast({ title: "Produto atualizado", description: "O produto foi atualizado com sucesso." });
      } else {
        // Criar novo produto com retry em caso de código duplicado
        let tentativas = 0;
        const maxTentativas = 3;
        let sucesso = false;
        let ultimoErro = null;

        while (!sucesso && tentativas < maxTentativas) {
          try {
            response = await produtoService.create(produtoData);
            sucesso = true;
          } catch (createError) {
            ultimoErro = createError;
            const errorMsg = createError.response?.data?.message || '';
            // Se for erro de código duplicado, gerar novo código e tentar novamente
            if (errorMsg.includes('Duplicate entry') || errorMsg.includes('codigo_produto') || errorMsg.includes('código único')) {
              tentativas++;
              produtoData = { ...produtoData, codigo_produto: gerarCodigoProduto() };
              console.warn(`Código de produto duplicado, tentativa ${tentativas}/${maxTentativas} com novo código: ${produtoData.codigo_produto}`);
            } else {
              // Erro diferente, não tentar novamente
              throw createError;
            }
          }
        }

        if (!sucesso) {
          throw ultimoErro;
        }

        toast({ title: "Produto criado", description: "O produto foi criado com sucesso." });
        
        // Se o produto tem variações com estoque, criar entrada de estoque automática
        const produtoCriado = response.data;
        if (produtoCriado && produtoData.variacoes_ativa && produtoData.variacoes?.length > 0) {
          const variacoesComEstoque = produtoData.variacoes.filter(v => parseFloat(v.estoque_var) > 0);
          
          if (variacoesComEstoque.length > 0) {
            try {
              // Criar entrada de estoque automática para as variações
              const entradaAutomatica = {
                codigo_entrada: `ENT-AUTO-${Date.now()}`,
                data_entrada: new Date().toISOString().split('T')[0],
                numero_nota: null,
                data_nota: null,
                fornecedor_id: null,
                fornecedor_nome: null,
                usuario_id: vendedorAtual?.id || 2,
                usuario_nome: vendedorAtual?.nome || 'Sistema',
                itens: variacoesComEstoque.map(v => ({
                  id: produtoCriado.id,
                  nome: `${produtoData.nome} (${v.nome || v.cor || v.tamanho || 'Variação'})`,
                  quantidade: parseFloat(v.estoque_var) || 0,
                  custoUnitario: parseFloat(v.preco_var) || parseFloat(produtoData.preco_custo) || 0,
                  preco_venda_registrado: parseFloat(v.preco_var) || parseFloat(produtoData.preco_venda) || null,
                  variacao_id: v.id,
                  variacao_nome: v.nome,
                  variacao_cor: v.cor,
                  variacao_tamanho: v.tamanho
                })),
                observacoes: 'Entrada automática - Cadastro inicial de variações',
                status: 'confirmada',
                data_confirmacao: new Date().toISOString()
              };
              
              await historicoEntradaEstoqueService.create(entradaAutomatica);
              console.log('✅ Entrada de estoque automática criada para variações');
            } catch (entradaError) {
              console.error('⚠️ Erro ao criar entrada automática de estoque:', entradaError);
              // Não mostra erro para o usuário, pois o produto foi salvo com sucesso
            }
          }
        }
        
        // Se o produto principal tem estoque (sem variações), criar entrada de estoque
        if (!produtoData.variacoes_ativa && parseFloat(produtoData.estoque) > 0) {
          try {
            const entradaAutomatica = {
              codigo_entrada: `ENT-AUTO-${Date.now()}`,
              data_entrada: new Date().toISOString().split('T')[0],
              numero_nota: null,
              data_nota: null,
              fornecedor_id: null,
              fornecedor_nome: null,
              usuario_id: vendedorAtual?.id || 2,
              usuario_nome: vendedorAtual?.nome || 'Sistema',
              itens: [{
                id: produtoCriado.id,
                nome: produtoData.nome,
                quantidade: parseFloat(produtoData.estoque) || 0,
                custoUnitario: parseFloat(produtoData.preco_custo) || 0,
                preco_venda_registrado: parseFloat(produtoData.preco_venda) || null,
                variacao_id: null,
                variacao_nome: null
              }],
              observacoes: 'Entrada automática - Cadastro inicial do produto',
              status: 'confirmada',
              data_confirmacao: new Date().toISOString()
            };
            
            await historicoEntradaEstoqueService.create(entradaAutomatica);
            console.log('✅ Entrada de estoque automática criada para produto');
          } catch (entradaError) {
            console.error('⚠️ Erro ao criar entrada automática de estoque:', entradaError);
          }
        }
      }
      
      // Recarregar todos os produtos para garantir que temos os dados mais atualizados
      await loadData(currentPage, searchTerm);
    
    if (!cadastrarOutro) {
      setIsModalOpen(false);
    } else {
      setProdutoSelecionado(null);
    }
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast({ 
        title: "Erro ao salvar produto", 
        description: error.response?.data?.message || "Ocorreu um erro ao salvar o produto.", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteProduto = async (produto) => {
    console.log('handleDeleteProduto chamado com:', produto);
    
    if (!produto) {
      console.error('Produto não fornecido para exclusão');
      return;
    }

    try {
      console.log('Chamando API para excluir produto ID:', produto.id);
      const response = await produtoService.delete(produto.id);
      console.log('Resposta da API:', response);
      
      // Recarregar dados após exclusão
      await loadData(currentPage, searchTerm);

      toast({
        title: "Produto excluído",
        description: `${produto.nome} foi excluído com sucesso!`,
      });
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      toast({ 
        title: "Erro ao excluir produto", 
        description: error.response?.data?.message || "Ocorreu um erro ao excluir o produto.", 
        variant: "destructive" 
      });
    }
  };

  const handleShareProduto = (produto) => {
    setProdutoParaCompartilhar(produto);
    setIsCompartilharModalOpen(true);
  };

  const handleImportProdutos = async (file) => {
    try {
      const importedData = await importFromExcel(file);
      if (!Array.isArray(importedData) || importedData.length === 0) {
        toast({ title: 'Arquivo vazio', description: 'Nenhuma linha válida encontrada no arquivo.', variant: 'destructive' });
        return;
      }

      // Normalizar e converter tipos; manter apenas colunas aceitas pela API
      const toNumber = (v) => {
        if (v === null || v === undefined || v === '') return 0;
        const n = Number(String(v).replace(',', '.'));
        return Number.isNaN(n) ? 0 : n;
      };
      const toInt = (v) => {
        if (v === null || v === undefined || v === '') return 0;
        const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
        return Number.isNaN(n) ? 0 : n;
      };
      const toBool = (v) => {
        if (typeof v === 'boolean') return v;
        const s = String(v).trim().toLowerCase();
        return s === 'true' || s === '1' || s === 'sim';
      };
      const toDate = (v) => {
        if (!v) return null;
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 10);
      };

      const allowedKeys = new Set([
        'nome','categoria_id','subcategoria_id','codigo_barras','unidade_medida','preco_custo','preco_venda','preco_m2','margem_lucro','estoque','estoque_minimo','status','promocao_ativa','preco_promocional','promo_data_inicio','promo_data_fim','permite_comissao','percentual_comissao','codigo_produto','localizacao','descricao_curta','descricao_longa','is_composto','variacoes_ativa'
      ]);

      const sanitized = importedData.map((rowRaw) => {
        const row = Object.fromEntries(Object.entries(rowRaw).map(([k, v]) => [String(k).trim(), v]));
        const obj = {};
        for (const key of allowedKeys) {
          if (row[key] !== undefined) obj[key] = row[key];
        }
        const rawBarcode = obj.codigo_barras !== undefined && obj.codigo_barras !== null ? String(obj.codigo_barras).trim() : '';
        const generateBarcode13 = () => {
          const base = (Date.now().toString().slice(-10) + Math.floor(Math.random() * 1000).toString().padStart(3, '0')).slice(0, 12);
          // checksum simplificado para 13 dígitos (EAN-13)
          const digits = base.split('').map(n => parseInt(n, 10));
          const sum = digits.reduce((acc, d, idx) => acc + d * (idx % 2 === 0 ? 1 : 3), 0);
          const check = (10 - (sum % 10)) % 10;
          return base + String(check);
        };
        const codigo_barras = rawBarcode || generateBarcode13();
        const codigo_produto = (obj.codigo_produto && String(obj.codigo_produto).trim()) ? String(obj.codigo_produto).trim() : `PROD-${Date.now()}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`;
        return {
          ...obj,
          codigo_barras,
          codigo_produto,
          categoria_id: obj.categoria_id ? Number(obj.categoria_id) : undefined,
          subcategoria_id: obj.subcategoria_id ? Number(obj.subcategoria_id) : undefined,
          preco_custo: toNumber(obj.preco_custo),
          preco_venda: toNumber(obj.preco_venda),
          preco_m2: toNumber(obj.preco_m2),
          margem_lucro: toNumber(obj.margem_lucro),
          estoque: toNumber(obj.estoque),
          estoque_minimo: toInt(obj.estoque_minimo),
          status: obj.status !== undefined ? toBool(obj.status) : true,
          promocao_ativa: obj.promocao_ativa ? toBool(obj.promocao_ativa) : false,
          preco_promocional: toNumber(obj.preco_promocional),
          promo_data_inicio: obj.promo_data_inicio ? toDate(obj.promo_data_inicio) : null,
          promo_data_fim: obj.promo_data_fim ? toDate(obj.promo_data_fim) : null,
          permite_comissao: obj.permite_comissao ? toBool(obj.permite_comissao) : false,
          percentual_comissao: toNumber(obj.percentual_comissao),
          is_composto: obj.is_composto ? toBool(obj.is_composto) : false,
          variacoes_ativa: obj.variacoes_ativa ? toBool(obj.variacoes_ativa) : false,
        };
      });

      // Importação: criar um a um para aproveitar validações e mensagens do backend
      let sucesso = 0;
      let falhas = 0;
      for (const p of sanitized) {
        try {
          await produtoService.create(p);
          sucesso++;
        } catch (err) {
          console.error('Falha ao importar produto:', p?.nome, err?.response?.data || err);
          falhas++;
        }
      }

      await loadData(currentPage, searchTerm);
      toast({
        title: 'Importação finalizada',
        description: `${sucesso} produto(s) importado(s). ${falhas > 0 ? `${falhas} falhou(falharam).` : ''}`,
        variant: falhas > 0 ? 'default' : 'default'
      });
    } catch (error) {
      console.error('Erro ao importar produtos:', error);
      toast({
        title: "Erro na importação",
        description: error.response?.data?.message || "Não foi possível importar os produtos. Verifique o formato do arquivo.",
        variant: "destructive"
      });
    }
  };

  const handleExportExcel = () => {
    exportToExcel(produtos, 'produtos', 'Lista_Produtos.xlsx');
    toast({ title: "Exportação Iniciada", description: "O download da planilha de produtos começará em breve." });
  };
  
  const handleDownloadTemplate = () => {
    const headers = [
      'nome',
      'categoria_id',
      'preco_custo',
      'preco_venda',
      'subcategoria_id',
      'unidade_medida',
      'preco_m2',
      'margem_lucro',
      'estoque',
      'estoque_minimo',
      'status',
      'promocao_ativa',
      'preco_promocional',
      'promo_data_inicio',
      'promo_data_fim',
      'permite_comissao',
      'percentual_comissao',
      'localizacao',
      'descricao_curta',
      'descricao_longa',
      'is_composto',
      'variacoes_ativa'
    ];
    const exampleRow = {
      nome: 'Produto Exemplo',
      categoria_id: 1,
      preco_custo: 10.00,
      preco_venda: 15.90,
      subcategoria_id: '',
      unidade_medida: 'unidade',
      preco_m2: '',
      margem_lucro: 59,
      estoque: 100,
      estoque_minimo: 5,
      status: 1,
      promocao_ativa: 0,
      preco_promocional: '',
      promo_data_inicio: '',
      promo_data_fim: '',
      permite_comissao: 1,
      percentual_comissao: 5,
      localizacao: 'A1',
      descricao_curta: 'Exemplo de produto',
      descricao_longa: 'Produto de exemplo para importação',
      is_composto: 0,
      variacoes_ativa: 0
    };
    exportToExcel([exampleRow], 'template_produtos', 'Modelo_Importacao_Produtos.xlsx');
    toast({ title: 'Modelo gerado', description: 'O modelo de importação foi baixado.' });
  };
  
  const handleAdjustPriceMany = async (ajuste) => {
    try {
      // Preparar dados para envio ao backend
      const dadosAtualizacao = {
        produto_ids: selectedProdutosIds,
        ajuste: {
          tipo: ajuste.tipo, // aumento | desconto
          base: ajuste.base, // preco_venda | preco_custo
          valor_tipo: ajuste.valorTipo, // percentual | fixo
          valor: parseFloat(ajuste.valor)
        }
      };

      // Fazer chamada para o backend
      await produtoService.updatePricesInBulk(dadosAtualizacao);

      // Recarregar os produtos para refletir as mudanças
      await loadData(currentPage, searchTerm);

      toast({ 
        title: "Preços Ajustados", 
        description: `${selectedProdutosIds.length} produtos tiveram seus preços ajustados com sucesso.`
      });
      
      setSelectedProdutosIds([]);
    } catch (error) {
      console.error('Erro ao ajustar preços em massa:', error);
      toast({ 
        title: "Erro ao ajustar preços", 
        description: error.response?.data?.message || "Não foi possível ajustar os preços. Tente novamente.", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteSelectedProdutos = () => {
    setShowConfirmDeleteManyModal(true);
  };

  const handleDeleteManyProdutos = async () => {
    if (!selectedProdutosIds.length) return;

    try {
      // Deletar múltiplos produtos em sequência
      const deletePromises = selectedProdutosIds.map(id => produtoService.delete(id));
      await Promise.all(deletePromises);
      
      // Recarregar dados após exclusão
      await loadData(currentPage, searchTerm);

      toast({
        title: "Produtos excluídos",
        description: `${selectedProdutosIds.length} produtos foram excluídos com sucesso!`,
      });
    } catch (error) {
      console.error("Erro ao excluir múltiplos produtos:", error);
      toast({ 
        title: "Erro ao excluir produtos", 
        description: "Ocorreu um erro ao excluir um ou mais produtos.", 
        variant: "destructive" 
      });
    } finally {
      setSelectedProdutosIds([]);
      setShowConfirmDeleteManyModal(false);
    }
  };
  
  // Funções para controle de paginação
  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadData(page, searchTerm);
    setSelectedProdutosIds([]); // Limpar seleção ao mudar página
  };
  
  const handlePerPageChange = (newPerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
    loadData(1, searchTerm);
    setSelectedProdutosIds([]);
  };

  // Função para renderizar os números das páginas
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Se temos poucas páginas, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Lógica para mostrar páginas relevantes
      if (currentPage <= 3) {
        // Mostrar as primeiras páginas
        for (let i = 1; i <= maxVisiblePages; i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        // Mostrar as últimas páginas
        for (let i = totalPages - maxVisiblePages + 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Mostrar páginas ao redor da atual
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }
    
    return pages;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 flex flex-col h-[calc(100vh-var(--header-height,64px))]"
    >
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Produtos</h1>
          {isFilteringEstoqueBaixo && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Filtrado: Estoque Baixo
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearEstoqueBaixoFilter}
                className="text-orange-600 hover:text-orange-700 dark:text-orange-400"
              >
                Limpar Filtro
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-64 bg-white dark:bg-gray-700"
            />
          </div>
           <Button onClick={handleExportExcel} variant="outline" className="w-full md:w-auto">
            <Upload className="mr-2 h-4 w-4" /> Exportar
          </Button>
           <Button onClick={handleDownloadTemplate} variant="outline" className="w-full md:w-auto">
             <Upload className="mr-2 h-4 w-4" /> Baixar Modelo de Cad. de Produtos
           </Button>
          <Button asChild variant="outline" className="w-full md:w-auto">
            <label htmlFor="import-excel-produtos" className="cursor-pointer flex items-center justify-center w-full">
              <Download className="mr-2 h-4 w-4" /> Importar
              <input type="file" id="import-excel-produtos" accept=".xlsx, .xls" onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleImportProdutos(file);
                  e.target.value = null; // Limpar o input após o upload
                }
              }} className="hidden" />
            </label>
          </Button>
          <PermissionGate permission="produtos_cadastrar">
            <Button onClick={handleNovoProduto} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white w-full md:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" /> Novo Produto
            </Button>
          </PermissionGate>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Carregando produtos...</p>
        </div>
      ) : (
        <div className="flex-grow overflow-auto flex flex-col">
            <ProdutoList
              produtos={filteredProdutos}
              onEdit={handleEditProduto}
              onDelete={handleDeleteProduto}
              onShare={handleShareProduto}
              selectedProdutos={selectedProdutosIds}
              setSelectedProdutos={setSelectedProdutosIds}
              canEdit={canEdit}
              canDelete={canDelete}
            />
            
            {/* Componente de Paginação */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-card rounded-lg border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Mostrando {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, totalItems)} de {totalItems} produtos
                  </span>
                  <select 
                    value={perPage} 
                    onChange={(e) => handlePerPageChange(Number(e.target.value))}
                    className="ml-2 px-2 py-1 border rounded bg-background"
                  >
                    <option value={10}>10 por página</option>
                    <option value={15}>15 por página</option>
                    <option value={25}>25 por página</option>
                    <option value={50}>50 por página</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {renderPageNumbers().map((pageNumber) => (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNumber}
                      </Button>
                    ))}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="px-2">...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          className="w-8 h-8 p-0"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
        </div>
      )}
      
      <AcoesEmMassaProdutos
        selectedCount={selectedProdutosIds.length}
        onAdjustPrice={handleAdjustPriceMany}
        onDeleteSelected={handleDeleteSelectedProdutos}
        onClearSelection={() => setSelectedProdutosIds([])}
      />

      {isModalOpen && (
        <ProdutoForm
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setProdutoSelecionado(null);
          }}
          onSave={handleSaveProduto}
          produtoEmEdicao={produtoSelecionado}
          showSaveAndNewButton={true}
        />
      )}

      <CompartilharProdutoModal
        isOpen={isCompartilharModalOpen}
        onClose={() => {
          setIsCompartilharModalOpen(false);
          setProdutoParaCompartilhar(null);
        }}
        produto={produtoParaCompartilhar}
      />

      <AlertDialog open={showConfirmDeleteManyModal} onOpenChange={setShowConfirmDeleteManyModal}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir Produtos Selecionados?</AlertDialogTitle>
                <AlertDialogDescription>
                    Você tem certeza que deseja excluir os {selectedProdutosIds.length} produtos selecionados? Esta ação é irreversível.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteManyProdutos} className="bg-red-600 hover:bg-red-700">
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir Selecionados
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default ProdutosPage;