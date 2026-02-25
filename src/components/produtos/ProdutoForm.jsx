import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProdutoFormTabs from './ProdutoFormTabs';
import imageCompression from 'browser-image-compression';
import { safeJsonParse } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';
import { categoriaService, produtoService, corService, tamanhoService, uploadService, subcategoriaService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';

const defaultProduto = {
    id: '',
    codigo_produto: '',
    nome: '',
    status: true,
    venda_pdv: true,
    venda_marketplace: true,
    uso_interno: false,
    unidadeMedida: 'unidade',
    categoria: '',
    subcategoriaId: '',
    descricao_curta: '',
    descricao_longa: '',
    localizacao: '',
    codigo_barras: '',
    imagem_principal: '',
    galeria_urls: [],
    preco_custo: '0',
    preco_m2: '0',
    medida_chapa_largura_cm: '',
    medida_chapa_altura_cm: '',
    valor_chapa: '',
    margem_lucro: '0',
    preco_venda: '0',
    promocao_ativa: false,
    preco_promocional: '0',
    promo_data_inicio: null,
    promo_data_fim: null,
    permite_comissao: false,
    percentual_comissao: '0',
    estoque: '0',
    estoque_minimo: '1',
    variacoes_ativa: false,
    variacao_obrigatoria: true,
    variacoes_usa_preco_base: true,
    variacoes: [],
    isComposto: false,
    composicao: [],
};

// Função utilitária para formatar datas para yyyy-mm-dd
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  // Se já estiver no formato yyyy-mm-dd, retorna direto
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Se vier com hora, pega só a parte da data
  if (typeof dateStr === 'string' && dateStr.includes(' ')) return dateStr.split(' ')[0];
  // Se vier como Date ou outro formato, tenta converter
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toISOString().slice(0, 10);
};

const ProdutoForm = ({ isOpen, onClose, onSave, produtoEmEdicao, showSaveAndNewButton = false }) => {
    const { toast } = useToast();
    const [currentProduto, setCurrentProduto] = useState(defaultProduto);
    const [imagemPreview, setImagemPreview] = useState('');
    const [galeriaPreviews, setGaleriaPreviews] = useState([]);
    const [categories, setCategories] = useState([]);
    const [allSubcategories, setAllSubcategories] = useState([]);
    const [filteredSubcategories, setFilteredSubcategories] = useState([]);
    const [productColors, setProductColors] = useState([]);
    const [productSizes, setProductSizes] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [activeTab, setActiveTab] = useState('dadosGerais');
    const [produtoConfig, setProdutoConfig] = useState({
        unidadeMedidaPadrao: 'unidade',
        geracaoCodigoAutomatica: true,
        prefixoCodigo: 'PROD-',
        notificarEstoqueBaixoPercentual: '20',
        permitirEstoqueNegativo: false,
    });
    
    // Extrair todas as subcategorias das categorias quando as categorias forem carregadas
    useEffect(() => {
        if (categories.length > 0) {
            const allSubs = [];
            categories.forEach(cat => {
                if (Array.isArray(cat.subcategorias)) {
                    allSubs.push(...cat.subcategorias);
                }
            });
            setAllSubcategories(allSubs);
            
            // Se já tiver uma categoria selecionada, filtrar as subcategorias
            if (currentProduto.categoria) {
                const selectedCategory = categories.find(cat => cat.id == currentProduto.categoria);
                const subcategoriasDaCategoria = selectedCategory?.subcategorias || [];
                setFilteredSubcategories(subcategoriasDaCategoria);
            }
        }
    }, [categories, currentProduto.categoria]);

    // Carregar configurações globais de produtos
    useEffect(() => {
        const loadProdutoConfig = async () => {
            try {
                const configData = await apiDataManager.getItem('produtoConfigGlobal');
                const loadedConfig = safeJsonParse(configData, {});
                if (Object.keys(loadedConfig).length > 0) {
                    setProdutoConfig(prev => ({ ...prev, ...loadedConfig }));
                }
            } catch (error) {
                console.error('Erro ao carregar configurações de produtos:', error);
            }
        };
        
        if (isOpen) {
            loadProdutoConfig();
        }
    }, [isOpen]);

    // Função para gerar código de produto único
    const gerarCodigoProduto = useCallback((prefixo = 'PROD-') => {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substr(2, 8).toUpperCase();
        const microTime = performance.now().toString(36).replace('.', '').substr(0, 4).toUpperCase();
        return `${prefixo}${timestamp}${randomSuffix}${microTime}`;
    }, []);

    const resetForm = useCallback(() => {
        const newId = `prod-${Date.now()}`;
        let codigoProduto = newId;
        
        // Aplicar configuração de código automático se estiver habilitada
        if (produtoConfig.geracaoCodigoAutomatica && produtoConfig.prefixoCodigo) {
            codigoProduto = gerarCodigoProduto(produtoConfig.prefixoCodigo);
        }
        
        setCurrentProduto({ 
            ...defaultProduto, 
            id: newId, 
            codigo_produto: codigoProduto,
            unidadeMedida: produtoConfig.unidadeMedidaPadrao || 'unidade'
        });
        setImagemPreview('');
        setGaleriaPreviews([]);
        setActiveTab('dadosGerais');
    }, [produtoConfig]);



    // useEffect para carregar dados do produto em edição
    useEffect(() => {
        if (produtoEmEdicao && isOpen) {
            // Garantir que composicao seja sempre um array
            let composicaoArr = [];
            if (produtoEmEdicao.composicao) {
              if (typeof produtoEmEdicao.composicao === 'string') {
                try {
                  composicaoArr = JSON.parse(produtoEmEdicao.composicao);
                } catch {
                  composicaoArr = [];
                }
              } else if (Array.isArray(produtoEmEdicao.composicao)) {
                composicaoArr = produtoEmEdicao.composicao;
              }
            }
            // Garantir que isComposto seja booleano
            let isCompostoBool = false;
            if (typeof produtoEmEdicao.isComposto !== 'undefined') {
              isCompostoBool = produtoEmEdicao.isComposto === true || produtoEmEdicao.isComposto === 1 || produtoEmEdicao.isComposto === '1';
            } else if (typeof produtoEmEdicao.is_composto !== 'undefined') {
              isCompostoBool = produtoEmEdicao.is_composto === true || produtoEmEdicao.is_composto === 1 || produtoEmEdicao.is_composto === '1';
            }
            // Converter dados do produto para o formato do formulário
            const produtoParaEdicao = {
                ...produtoEmEdicao,
                // Ajustar campos que podem ter nomes diferentes
                categoria: produtoEmEdicao.categoria_id || produtoEmEdicao.categoria || '',
                subcategoriaId: produtoEmEdicao.subcategoria_id || produtoEmEdicao.subcategoriaId || '',
                unidadeMedida: produtoEmEdicao.unidade_medida || produtoEmEdicao.unidadeMedida || 'unidade',
                // Campos de visibilidade (com valores padrão se não existirem)
                venda_pdv: produtoEmEdicao.venda_pdv !== undefined ? (produtoEmEdicao.venda_pdv === true || produtoEmEdicao.venda_pdv === 1 || produtoEmEdicao.venda_pdv === '1') : true,
                venda_marketplace: produtoEmEdicao.venda_marketplace !== undefined ? (produtoEmEdicao.venda_marketplace === true || produtoEmEdicao.venda_marketplace === 1 || produtoEmEdicao.venda_marketplace === '1') : true,
                uso_interno: produtoEmEdicao.uso_interno === true || produtoEmEdicao.uso_interno === 1 || produtoEmEdicao.uso_interno === '1',
                // Garantir que campos numéricos sejam strings para os inputs
                preco_custo: String(produtoEmEdicao.preco_custo || '0'),
                preco_m2: String(produtoEmEdicao.preco_m2 || '0'),
                margem_lucro: String(produtoEmEdicao.margem_lucro || '0'),
                preco_venda: String(produtoEmEdicao.preco_venda || '0'),
                preco_promocional: String(produtoEmEdicao.preco_promocional || '0'),
                medida_chapa_largura_cm: String(produtoEmEdicao.medida_chapa_largura_cm || ''),
                medida_chapa_altura_cm: String(produtoEmEdicao.medida_chapa_altura_cm || ''),
                valor_chapa: String(produtoEmEdicao.valor_chapa || ''),
                percentual_comissao: String(produtoEmEdicao.percentual_comissao || '0'),
                estoque: String(produtoEmEdicao.estoque || '0'),
                estoque_minimo: String(produtoEmEdicao.estoque_minimo || '1'),
                variacao_obrigatoria:
                    typeof produtoEmEdicao.variacao_obrigatoria === 'boolean'
                        ? produtoEmEdicao.variacao_obrigatoria
                        : typeof produtoEmEdicao.variacao_obrigatoria === 'undefined' ||
                          produtoEmEdicao.variacao_obrigatoria === null
                            ? true
                        : produtoEmEdicao.variacao_obrigatoria === 1 ||
                          produtoEmEdicao.variacao_obrigatoria === '1' ||
                          produtoEmEdicao.variacao_obrigatoria === 'true',
                // Garantir que arrays existam e configurar variações com imagens
                galeria_urls: produtoEmEdicao.galeria_urls || [],
                variacoes: (produtoEmEdicao.variacoes || []).map((variacao, index) => {
                    // Gerar código de barras único se não existir
                    let codigoBarras = variacao.codigo_barras;
                    if (!codigoBarras) {
                        const timestamp = Date.now();
                        const randomSuffix = Math.random().toString(36).substr(2, 6).toUpperCase();
                        codigoBarras = `${produtoEmEdicao.codigo_produto || 'VAR'}-${timestamp}-${index}-${randomSuffix}`;
                    }
                    
                    return {
                        ...variacao,
                        // Garantir que campos numéricos das variações sejam strings
                        estoque_var: String(variacao.estoque_var || '0'),
                        preco_var: String(variacao.preco_var || '0'),
                        tamanho_tipo: variacao.tamanho_tipo || 'padrao',
                        tamanhos_personalizados: Array.isArray(variacao.tamanhos_personalizados) ? variacao.tamanhos_personalizados : [],
                        // Configurar preview da imagem da variação se existir
                        imagem_url_preview: variacao.imagem_url ? getImageUrl(variacao.imagem_url) : null,
                        // Garantir código de barras único
                        codigo_barras: codigoBarras
                    };
                }),
                composicao: composicaoArr.map(comp => ({
                  ...comp,
                  quantidade: String(comp.quantidade || '0')
                })),
                isComposto: isCompostoBool,
                // Corrigir datas para o formato do input type=date
                promo_data_inicio: formatDate(produtoEmEdicao.promo_data_inicio),
                promo_data_fim: formatDate(produtoEmEdicao.promo_data_fim),
            };
            
            setCurrentProduto(produtoParaEdicao);
            
            // Configurar preview da imagem principal
            if (produtoEmEdicao.imagem_principal) {
                setImagemPreview(getImageUrl(produtoEmEdicao.imagem_principal));
            } else {
                setImagemPreview('');
            }
            
            // Configurar previews da galeria
            if (produtoEmEdicao.galeria_urls && produtoEmEdicao.galeria_urls.length > 0) {
                const galeriaPreviews = produtoEmEdicao.galeria_urls.map(url => getImageUrl(url));
                setGaleriaPreviews(galeriaPreviews);
            } else {
                setGaleriaPreviews([]);
            }
        } else if (!produtoEmEdicao && isOpen) {
            // Se não há produto em edição, resetar o formulário
            resetForm();
        }
    }, [produtoEmEdicao, isOpen, resetForm]);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Carregar categorias
                const categoriesResponse = await categoriaService.getAll();
                
                // O backend retorna dados paginados: { success: true, message: "...", data: { data: [...], current_page: 1, ... } }
                const categoriesData = categoriesResponse.data?.data?.data || categoriesResponse.data?.data || categoriesResponse.data || [];
                const categoriesArray = Array.isArray(categoriesData) ? categoriesData : [];
                
                setCategories(categoriesArray);
                
                // Se não houver categorias, logar um aviso
                if (categoriesArray.length === 0) {
                    console.warn('Nenhuma categoria encontrada na resposta da API');
                }

                // Carregar cores da tabela cors
                const coresResponse = await corService.getAll();
                
                // O backend retorna dados paginados: { success: true, message: "...", data: { data: [...], current_page: 1, ... } }
                const coresData = coresResponse.data?.data?.data || coresResponse.data?.data || coresResponse.data || [];
                const coresArray = Array.isArray(coresData) ? coresData : [];
                
                setProductColors(coresArray);
                
                // Se não houver cores, logar um aviso
                if (coresArray.length === 0) {
                    console.warn('Nenhuma cor encontrada na resposta da API');
                }

                // Carregar tamanhos
                const tamanhosResponse = await tamanhoService.getAll();
                
                // O backend retorna dados paginados: { success: true, message: "...", data: { data: [...], current_page: 1, ... } }
                const tamanhosData = tamanhosResponse.data?.data?.data || tamanhosResponse.data?.data || tamanhosResponse.data || [];
                const tamanhosArray = Array.isArray(tamanhosData) ? tamanhosData : [];
                
                setProductSizes(tamanhosArray);
                
                // Se não houver tamanhos, logar um aviso
                if (tamanhosArray.length === 0) {
                    console.warn('Nenhum tamanho encontrado na resposta da API');
                }
                
            } catch(error) {
                console.error('Erro ao carregar dados:', error);
                toast({ 
                    title: 'Erro ao carregar dados', 
                    description: 'Não foi possível carregar categorias, cores ou tamanhos do servidor.', 
                    variant: 'destructive' 
                });
            }
        };
        
        loadData();
    }, [isOpen]);

    // Carregar todos os produtos para a composição
    useEffect(() => {
        if (!isOpen) return;
        const loadAllProducts = async () => {
            try {
                const response = await produtoService.getAll('?per_page=1000');
                // O backend pode retornar paginado, então trate os possíveis formatos
                const produtosData = response.data?.data?.data || response.data?.data || response.data || [];
                setAllProducts(Array.isArray(produtosData) ? produtosData : []);
            } catch (error) {
                setAllProducts([]);
                toast({ title: 'Erro ao carregar produtos', description: 'Não foi possível carregar a lista de produtos para composição.', variant: 'destructive' });
            }
        };
        loadAllProducts();
    }, [isOpen]);

    // Callback para quando uma nova categoria é criada
    const handleCategoriaCreated = useCallback(async (novaCategoria) => {
        try {
            // Recarregar todas as categorias para ter a lista atualizada
            const categoriesResponse = await categoriaService.getAll();
            const categoriesData = categoriesResponse.data?.data?.data || categoriesResponse.data?.data || categoriesResponse.data || [];
            const categoriesArray = Array.isArray(categoriesData) ? categoriesData : [];
            setCategories(categoriesArray);
            
            // Retornar a categoria criada para seleção automática
            return novaCategoria;
        } catch (error) {
            console.error('Erro ao recarregar categorias:', error);
        }
    }, []);

    // Callback para quando uma nova subcategoria é criada
    const handleSubcategoriaCreated = useCallback(async (novaSubcategoria) => {
        try {
            // Recarregar todas as categorias (que incluem subcategorias)
            const categoriesResponse = await categoriaService.getAll();
            const categoriesData = categoriesResponse.data?.data?.data || categoriesResponse.data?.data || categoriesResponse.data || [];
            const categoriesArray = Array.isArray(categoriesData) ? categoriesData : [];
            setCategories(categoriesArray);
            
            // Atualizar as subcategorias filtradas para a categoria atual
            if (currentProduto.categoria) {
                const selectedCategory = categoriesArray.find(cat => String(cat.id) === String(currentProduto.categoria));
                const subcategoriasDaCategoria = selectedCategory?.subcategorias || [];
                setFilteredSubcategories(subcategoriasDaCategoria);
            }
            
            return novaSubcategoria;
        } catch (error) {
            console.error('Erro ao recarregar subcategorias:', error);
        }
    }, [currentProduto.categoria]);

    // Garantir que o preço do kit seja sempre a soma dos componentes
    useEffect(() => {
        if (currentProduto.isComposto && currentProduto.composicao && currentProduto.composicao.length > 0) {
            const precoCalculado = recalcularPrecoKit(currentProduto.composicao);
            const precoAtual = parseFloat(currentProduto.preco_venda) || 0;
            const precoCalculadoNum = parseFloat(precoCalculado);
            
            // Se o preço atual não bate com o calculado, atualizar
            if (Math.abs(precoAtual - precoCalculadoNum) > 0.01) {
                console.log('Kit - Corrigindo preço:', {
                    precoAtual,
                    precoCalculado,
                    diferenca: Math.abs(precoAtual - precoCalculadoNum)
                });
                
                setCurrentProduto(prev => ({
                    ...prev,
                    preco_venda: precoCalculado
                }));
            }
        }
    }, [currentProduto.isComposto, currentProduto.composicao]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setCurrentProduto(prev => {
            let updatedProduto = { ...prev, [name]: val };

            if (name === 'is_digital' && checked) {
                updatedProduto.estoque = '0';
                updatedProduto.estoque_minimo = '0';
                updatedProduto.controlar_estoque_manual = false;
                if (Array.isArray(updatedProduto.variacoes)) {
                    updatedProduto.variacoes = updatedProduto.variacoes.map((variacao) => ({
                        ...variacao,
                        estoque_var: '0',
                    }));
                }
            }

            // Atualizar preco_venda automaticamente ao alterar preco_custo ou margem_lucro
            if (name === 'preco_custo' || name === 'margem_lucro') {
                const precoCusto = parseFloat(name === 'preco_custo' ? val : updatedProduto.preco_custo) || 0;
                const margemLucro = parseFloat(name === 'margem_lucro' ? val : updatedProduto.margem_lucro) || 0;
                const precoVenda = precoCusto + (precoCusto * margemLucro / 100);
                updatedProduto.preco_venda = precoVenda.toFixed(2);
            }
            return updatedProduto;
        });
    };

    const handleSelectChange = (field, value) => {
        setCurrentProduto(prev => {
            const updatedProduto = {
                ...prev,
                [field]: value
            };

            // Se a categoria foi alterada, atualizar as subcategorias disponíveis
            if (field === 'categoria') {
                const selectedCategory = categories.find(cat => cat.id == value);
                const subcategoriasDaCategoria = selectedCategory?.subcategorias || [];
                setFilteredSubcategories(subcategoriasDaCategoria);
                
                // Limpar a subcategoria selecionada se não for mais válida
                if (prev.subcategoriaId && !subcategoriasDaCategoria.some(sub => sub.id == prev.subcategoriaId)) {
                    updatedProduto.subcategoriaId = '';
                }
            }

            return updatedProduto;
        });
    };
    
    const handleDateChange = (name, value) => {
        setCurrentProduto(prev => ({...prev, [name]: value}))
    }

    const compressImage = async (file) => {
        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
        };
        try {
            const compressedFile = await imageCompression(file, options);
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(compressedFile);
                reader.onloadend = () => {
                    resolve(reader.result);
                };
            });
        } catch (error) {
            toast({ title: "Erro de Imagem", description: "Falha ao comprimir imagem.", variant: "destructive" });
            return null;
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                // Mostrar preview local para melhor UX
                const localPreview = URL.createObjectURL(file);
                setImagemPreview(localPreview);

                // Fazer upload da imagem para o servidor
                const response = await uploadService.uploadImagem(file);
                
                if (response.data && response.data.success) {
                    // Armazenar o caminho da imagem no banco de dados (não a URL completa)
                    const imagePath = response.data.path;
                    
                    setCurrentProduto(prev => {
                        const updated = { ...prev, imagem_principal: imagePath };
                        return updated;
                    });
                    
                    toast({
                        title: "Upload concluído",
                        description: "Imagem enviada com sucesso",
                        variant: "default"
                    });
                }
            } catch (error) {
                console.error('Erro ao fazer upload da imagem:', error);
                toast({
                    title: "Erro no upload",
                    description: "Não foi possível enviar a imagem. Tente novamente.",
                    variant: "destructive"
                });
            }
        }
    };
    
    const handleVariacaoImageUpload = async (e, index) => {
        const file = e.target.files[0];
        if (file) {
            try {
                // Mostrar preview local para melhor UX
                const localPreview = URL.createObjectURL(file);
                updateVariacao(index, 'imagem_url_preview', localPreview);
                
                // Fazer upload da imagem para o servidor
                const response = await uploadService.uploadImagem(file);
                if (response.data && response.data.success) {
                    // Armazenar o caminho da imagem no banco de dados (não a URL completa)
                    updateVariacao(index, 'imagem_url', response.data.path);
                }
            } catch (error) {
                console.error('Erro ao fazer upload da imagem da variação:', error);
                toast({
                    title: "Erro no upload",
                    description: "Não foi possível enviar a imagem da variação. Tente novamente.",
                    variant: "destructive"
                });
            }
        }
    };

    const handleVariacoesBulkUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        // Limpar o valor do input para permitir novo upload com mesmos arquivos se necessário
        e.target.value = '';
        if (files.length === 0) return;

        // 1) Criar variações localmente com preview e nome baseado no arquivo
        const novasVariacoes = files.map((file) => {
            const id = uuidv4();
            const nomeBase = file.name.replace(/\.[^/.]+$/, '');
            const preview = URL.createObjectURL(file);
            return {
                id,
                nome: nomeBase,
                cor: '',
                tamanho: '',
                tamanho_tipo: 'padrao',
                tamanhos_personalizados: [],
                estoque_var: '',
                preco_var: '',
                imagem_url: '',
                imagem_url_preview: preview,
            };
        });

        setCurrentProduto((prev) => ({
            ...prev,
            variacoes: [...(prev.variacoes || []), ...novasVariacoes],
            variacoes_ativa: true, // Ativar variações automaticamente quando imagens são carregadas
        }));

        // 2) Fazer upload de cada imagem e atualizar a variação correspondente com o caminho retornado
        await Promise.all(
            files.map(async (file, idx) => {
                try {
                    const response = await uploadService.uploadImagem(file);
                    if (response.data && response.data.success) {
                        const path = response.data.path;
                        const addedId = novasVariacoes[idx].id;
                        setCurrentProduto((prev) => {
                            const updated = [...(prev.variacoes || [])];
                            const i = updated.findIndex((v) => v.id === addedId);
                            if (i !== -1) {
                                updated[i] = { ...updated[i], imagem_url: path };
                                return { ...prev, variacoes: updated };
                            }
                            return prev;
                        });
                    }
                } catch (error) {
                    console.error('Erro ao fazer upload da imagem da variação (lote):', error);
                }
            })
        );
    };

    const handleGaleriaImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length > 0) {
            try {
                // Mostrar previews locais para melhor UX
                const localPreviews = files.map(file => URL.createObjectURL(file));
                setGaleriaPreviews(prev => [...prev, ...localPreviews]);
                
                // Criar FormData para debug
                const debugFormData = new FormData();
                files.forEach((file, index) => {
                    debugFormData.append('imagens[]', file);
                });
                
                // Fazer upload das imagens para o servidor
                const response = await uploadService.uploadGaleria(files);
                
                if (response.data && response.data.success) {
                    // Adicionar URLs das imagens enviadas à galeria
                    const novasUrls = response.data.urls || [];
                    setCurrentProduto(prev => ({
                        ...prev,
                        galeria_urls: [...(prev.galeria_urls || []), ...novasUrls]
                    }));
                    
                    toast({ title: "Sucesso", description: "Imagens da galeria enviadas com sucesso!" });
                } else {
                    console.error('Erro no upload da galeria:', response.data);
                    toast({ 
                        title: "Erro", 
                        description: response.data?.message || "Erro ao enviar imagens da galeria", 
                        variant: "destructive" 
                    });
                }
            } catch (error) {
                console.error('Erro ao fazer upload da galeria:', error);
                toast({ 
                    title: "Erro", 
                    description: "Erro ao enviar imagens da galeria", 
                    variant: "destructive" 
                });
            }
        }
    };
    
    const removeGaleriaImage = (index) => {
        // Calcular quantas imagens existentes temos
        const imagensExistentes = currentProduto?.galeria_urls || [];
        const totalImagens = imagensExistentes.length + galeriaPreviews.length;
        
        if (index < imagensExistentes.length) {
            // Remover imagem existente
            setCurrentProduto(prev => ({
                ...prev,
                galeria_urls: prev.galeria_urls.filter((_, i) => i !== index)
            }));
        } else {
            // Remover preview local
            const previewIndex = index - imagensExistentes.length;
            setGaleriaPreviews(prev => prev.filter((_, i) => i !== previewIndex));
        }
    };

    // Função para calcular o estoque total das variações
    const calcularEstoqueTotal = (variacoes) => {
        if (!variacoes || variacoes.length === 0) return 0;
        
        return variacoes.reduce((total, variacao) => {
            const estoqueVariacao = parseFloat(variacao.estoque_var) || 0;
            return total + estoqueVariacao;
        }, 0);
    };

    const addVariacao = () => {
        // Gerar código de barras único para a variação
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substr(2, 6).toUpperCase();
        const codigoBarrasVariacao = `${currentProduto.codigo_produto || 'VAR'}-${timestamp}-${randomSuffix}`;
        
        const novasVariacoes = [...(currentProduto.variacoes || []), { 
            id: uuidv4(), 
            cor: '', 
            tamanho: '', 
            tamanho_tipo: 'padrao',
            tamanhos_personalizados: [],
            estoque_var: '', 
            preco_var: '', 
            imagem_url: '',
            codigo_barras: codigoBarrasVariacao
        }];
        
        // Calcular o novo estoque total
        const estoqueTotal = calcularEstoqueTotal(novasVariacoes);
        
        setCurrentProduto(prev => ({
            ...prev,
            variacoes: novasVariacoes,
            estoque: estoqueTotal.toString()
        }));
    };

    const updateVariacao = (index, field, value) => {
        const novasVariacoes = [...currentProduto.variacoes];
        novasVariacoes[index][field] = value;
        
        // Se o campo alterado for estoque_var, recalcular o estoque total
        if (field === 'estoque_var') {
            const estoqueTotal = calcularEstoqueTotal(novasVariacoes);
            setCurrentProduto(prev => ({ 
                ...prev, 
                variacoes: novasVariacoes,
                estoque: estoqueTotal.toString()
            }));
        } else {
            setCurrentProduto(prev => ({ ...prev, variacoes: novasVariacoes }));
        }
    };

    const removeVariacao = (index) => {
        const novasVariacoes = currentProduto.variacoes.filter((_, i) => i !== index);
        const estoqueTotal = calcularEstoqueTotal(novasVariacoes);
        
        setCurrentProduto(prev => ({
            ...prev,
            variacoes: novasVariacoes,
            estoque: estoqueTotal.toString()
        }));
    };

    const addComponente = (componente) => {
        if (!componente.produtoId || !componente.quantidade) {
            toast({ title: 'Componente inválido', description: 'Selecione um produto e defina uma quantidade.', variant: 'destructive' });
            return;
        }

        // Encontrar o produto selecionado para obter o preço
        const produtoSelecionado = allProducts.find(p => p.id === componente.produtoId);
        if (!produtoSelecionado) {
            toast({ title: 'Produto não encontrado', description: 'Não foi possível encontrar o produto selecionado.', variant: 'destructive' });
            return;
        }

        // Adicionar preço e custo do componente
        const componenteComPreco = {
            ...componente,
            preco_unitario: parseFloat(produtoSelecionado.preco_venda) || 0,
            preco_total: (parseFloat(produtoSelecionado.preco_venda) || 0) * parseFloat(componente.quantidade),
            custo_unitario: parseFloat(produtoSelecionado.preco_custo) || 0,
            custo_total: (parseFloat(produtoSelecionado.preco_custo) || 0) * parseFloat(componente.quantidade)
        };

        setCurrentProduto(prev => {
            const novaComposicao = [...(prev.composicao || []), componenteComPreco];
            
            // Recalcular o preço total e custo total do kit
            const novosPrecos = recalcularPrecoKit(novaComposicao);
            
            console.log('Kit - Adicionando componente:', {
                componente: componenteComPreco,
                novoPrecoVenda: novosPrecos.precoVenda,
                novoPrecoCusto: novosPrecos.precoCusto,
                totalComponentes: novaComposicao.length
            });
            
            return {
                ...prev,
                composicao: novaComposicao,
                preco_venda: novosPrecos.precoVenda,
                preco_custo: novosPrecos.precoCusto
            };
        });
    };

    const removeComponente = (index) => {
        setCurrentProduto(prev => {
            const novaComposicao = prev.composicao.filter((_, i) => i !== index);
            
            // Recalcular o preço total e custo total do kit
            const novosPrecos = recalcularPrecoKit(novaComposicao);
            
            console.log('Kit - Removendo componente:', {
                novoPrecoVenda: novosPrecos.precoVenda,
                novoPrecoCusto: novosPrecos.precoCusto,
                totalComponentes: novaComposicao.length
            });
            
            return {
                ...prev,
                composicao: novaComposicao,
                preco_venda: novosPrecos.precoVenda,
                preco_custo: novosPrecos.precoCusto
            };
        });
    };

    // Função para recalcular o preço total do kit baseado na composição
    const recalcularPrecoKit = (composicao) => {
        if (!composicao || composicao.length === 0) return { precoVenda: '0.00', precoCusto: '0.00' };
        
        const precoVendaTotal = composicao.reduce((total, comp) => {
            const precoTotalComponente = comp.preco_total || 0;
            return total + precoTotalComponente;
        }, 0);
        
        const precoCustoTotal = composicao.reduce((total, comp) => {
            const custoTotalComponente = comp.custo_total || 0;
            return total + custoTotalComponente;
        }, 0);
        
        return {
            precoVenda: precoVendaTotal.toFixed(2),
            precoCusto: precoCustoTotal.toFixed(2)
        };
    };

    const updateComponenteQuantidade = (index, novaQuantidade) => {
        if (parseFloat(novaQuantidade) <= 0) return;
        
        setCurrentProduto(prev => {
            const novaComposicao = [...prev.composicao];
            const componente = novaComposicao[index];
            
            if (componente) {
                componente.quantidade = parseFloat(novaQuantidade);
                componente.preco_total = (componente.preco_unitario || 0) * parseFloat(novaQuantidade);
                componente.custo_total = (componente.custo_unitario || 0) * parseFloat(novaQuantidade);
            }
            
            // Recalcular o preço total e custo total do kit
            const novosPrecos = recalcularPrecoKit(novaComposicao);
            
            console.log('Kit - Atualizando quantidade:', {
                componente: componente,
                novoPrecoVenda: novosPrecos.precoVenda,
                novoPrecoCusto: novosPrecos.precoCusto,
                totalComponentes: novaComposicao.length
            });
            
            return {
                ...prev,
                composicao: novaComposicao,
                preco_venda: novosPrecos.precoVenda,
                preco_custo: novosPrecos.precoCusto
            };
        });
    };

    const handleSave = (cadastrarOutro = false) => {
        if (!currentProduto.nome || !currentProduto.categoria) {
            toast({ title: "Campos Obrigatórios", description: "Nome e Categoria são obrigatórios.", variant: "destructive" });
            setActiveTab('dadosGerais');
            return;
        }
        
        // Extrair os campos que precisam ser renomeados para o formato esperado pela API
        const { categoria, subcategoriaId, unidadeMedida, isComposto, ...rest } = currentProduto;
        
        // Converter campos numéricos para números inteiros ou decimais conforme necessário
        // Converter campos de medida de chapa: string vazia vira null, valores válidos são parseados
        const parseFloatOrNull = (value) => {
            if (value === '' || value === null || value === undefined) return null;
            const parsed = parseFloat(value);
            return isNaN(parsed) ? null : parsed;
        };

        const produtoFinal = {
            ...rest,
            categoria_id: Number(categoria),  // Converter para número
            subcategoria_id: subcategoriaId ? Number(subcategoriaId) : null,  // Converter para número ou null
            unidade_medida: unidadeMedida || 'unidade', // Mapear para o nome do campo esperado pela API
            is_composto: Boolean(isComposto), // Mapear isComposto para is_composto
            preco_custo: parseFloat(rest.preco_custo) || 0,
            margem_lucro: parseFloat(rest.margem_lucro) || 0,
            preco_venda: parseFloat(rest.preco_venda) || 0,
            preco_m2: parseFloatOrNull(rest.preco_m2), // Permitir null para preco_m2
            preco_promocional: parseFloat(rest.preco_promocional) || 0,
            percentual_comissao: parseFloat(rest.percentual_comissao) || 0,
            estoque: parseFloat(rest.estoque) || 0,
            estoque_minimo: parseFloat(rest.estoque_minimo) || 0,  // Aceita valores fracionados
            variacao_obrigatoria: Boolean(rest.variacao_obrigatoria),
            variacoes_usa_preco_base: Boolean(rest.variacoes_usa_preco_base !== false),
            tipo_visualizacao: rest.tipo_visualizacao || 'vendas',
            prazo_producao: rest.prazo_producao || null,
            prazo_criacao_arte: rest.prazo_criacao_arte || null,
            // Campos de medida de chapa - garantir que sejam enviados
            medida_chapa_largura_cm: parseFloatOrNull(rest.medida_chapa_largura_cm),
            medida_chapa_altura_cm: parseFloatOrNull(rest.medida_chapa_altura_cm),
            valor_chapa: parseFloatOrNull(rest.valor_chapa),
            variacoes: (rest.variacoes || []).map(v => ({
                ...v,
                estoque_var: parseFloat(v.estoque_var) || 0,
                preco_var: parseFloat(v.preco_var) || 0,
                codigo_barras: v.codigo_barras || '',
                tamanho_tipo: v.tamanho_tipo || 'padrao',
                tamanhos_personalizados: Array.isArray(v.tamanhos_personalizados)
                    ? v.tamanhos_personalizados.map((tamanho) => String(tamanho || '').trim()).filter(Boolean)
                    : []
            })),
            composicao: (rest.composicao || []).map(c => ({
                ...c,
                quantidade: parseFloat(c.quantidade) || 0
            }))
        };

        if (produtoFinal.is_digital) {
            produtoFinal.estoque = 0;
            produtoFinal.estoque_minimo = 0;
            produtoFinal.controlar_estoque_manual = false;
            produtoFinal.variacoes = (produtoFinal.variacoes || []).map((v) => ({
                ...v,
                estoque_var: 0,
            }));
        }
        
        console.log('📦 [ProdutoForm] Dados do produto sendo salvos:', {
            preco_m2: produtoFinal.preco_m2,
            valor_chapa: produtoFinal.valor_chapa,
            medida_chapa_largura_cm: produtoFinal.medida_chapa_largura_cm,
            medida_chapa_altura_cm: produtoFinal.medida_chapa_altura_cm,
            preco_venda: produtoFinal.preco_venda
        });
        
        onSave(produtoFinal, cadastrarOutro);
    };

    if(!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if(!open) onClose(); }}>
            <DialogContent className="max-w-4xl max-h-[95vh] h-auto flex flex-col">
                <DialogHeader>
                    <DialogTitle>{produtoEmEdicao ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                    <DialogDescription>
                        {produtoEmEdicao ? `Editando "${produtoEmEdicao.nome}"` : 'Preencha os dados para cadastrar um novo produto.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto max-h-[80vh] pr-6">
                    <ProdutoFormTabs
                        currentProduto={currentProduto}
                        handleInputChange={handleInputChange}
                        handleSelectChange={handleSelectChange}
                        handleDateChange={handleDateChange}
                        imagemPreview={imagemPreview}
                        handleImageUpload={handleImageUpload}
                        galeriaPreviews={galeriaPreviews}
                        handleGaleriaImageUpload={handleGaleriaImageUpload}
                        removeGaleriaImage={removeGaleriaImage}
                        categories={categories}
                        subcategories={filteredSubcategories}
                        productColors={productColors}
                        productSizes={productSizes}
                        addVariacao={addVariacao}
                        updateVariacao={updateVariacao}
                        removeVariacao={removeVariacao}
                        handleVariacaoImageUpload={handleVariacaoImageUpload}
                        handleVariacoesBulkUpload={handleVariacoesBulkUpload}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        allProducts={allProducts}
                        addComponente={addComponente}
                        removeComponente={removeComponente}
                        updateComponenteQuantidade={updateComponenteQuantidade}
                        onCategoriaCreated={handleCategoriaCreated}
                        onSubcategoriaCreated={handleSubcategoriaCreated}
                    />
                </div>
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                     {showSaveAndNewButton && !produtoEmEdicao && (
                        <Button onClick={() => handleSave(true)}>Salvar e Cadastrar Novo</Button>
                    )}
                    <Button onClick={() => handleSave(false)}>{produtoEmEdicao ? 'Salvar Alterações' : 'Salvar Produto'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProdutoForm;