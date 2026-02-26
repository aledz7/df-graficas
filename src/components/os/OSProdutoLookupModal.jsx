import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Image as ImageIconPlaceholder, Ruler, Package } from 'lucide-react';
import { produtoService, calculadoraService } from '@/services/api';
import { getImageUrl } from '@/lib/imageUtils';
import { calcularEstoqueTotal } from '@/utils/estoqueUtils';

const OSProdutoLookupModal = ({ onSelectProduto, children, isOpen, setIsOpen, produtosCadastrados, onOpen }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const prevOpenRef = useRef(false);

  const openState = isOpen !== undefined ? isOpen : internalIsOpen;
  const setOpenState = setIsOpen !== undefined ? setIsOpen : setInternalIsOpen;

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = openState;

    if (!openState || wasOpen || typeof onOpen !== 'function') return;

    try {
      const resultado = onOpen();
      if (resultado && typeof resultado.then === 'function') {
        resultado.catch(error => console.error('❌ [OSProdutoLookupModal] Erro ao solicitar produtos antes da abertura:', error));
      }
    } catch (error) {
      console.error('❌ [OSProdutoLookupModal] Erro ao executar onOpen:', error);
    }
  }, [openState, onOpen]);

  useEffect(() => {
    let cancelled = false;

    const loadProdutos = async () => {
      if (!openState) return;
      setIsLoading(true);
      try {
        // Se produtosCadastrados foi fornecido e não está vazio, usar diretamente
        if (produtosCadastrados && Array.isArray(produtosCadastrados) && produtosCadastrados.length > 0) {
          // Carregar serviços adicionais da calculadora
          let servicosAdicionais = [];
          try {
            const servicosResponse = await calculadoraService.getServicosAdicionais();
            if (servicosResponse?.data?.data) {
              servicosAdicionais = servicosResponse.data.data;
            }
          } catch (servicosError) {
            console.warn('⚠️ Erro ao carregar serviços adicionais:', servicosError);
          }
          
          // Combinar produtos da prop e serviços adicionais
          const produtosComServicos = [
            ...produtosCadastrados,
            ...servicosAdicionais.map(servico => ({
              id: `servico_${servico.id}`,
              nome: servico.nome,
              preco_venda: servico.preco,
              unidadeMedida: servico.unidade || 'm²',
              tipo_produto: 'm2',
              estoque: 999999,
              codigo_produto: `SERV-${servico.id}`,
              categoria_nome: 'Serviços Adicionais',
              imagem_principal: null,
              sku: `SERV-${servico.id}`,
              descricao: servico.descricao,
              isServicoAdicional: true,
              servico_original: servico
            }))
          ];
          
          if (!cancelled) {
            setProdutos(produtosComServicos);
          }
          return;
        }

        // Caso contrário, buscar da API com todas as informações
        // Buscar todos os produtos com relacionamentos (categoria, subcategoria)
        // Usar um per_page alto para garantir que todos sejam carregados
        let allProdutos = [];
        let currentPage = 1;
        let lastPage = 1;
        let hasMore = true;
        
        while (hasMore) {
          if (cancelled) break;
          const response = await produtoService.getAll(`?per_page=1000&page=${currentPage}`);
          
          // Normalizar diferentes formatos de resposta do Laravel
          // Laravel pode retornar: { data: { data: [...], meta: {...} } } ou { data: [...], meta: {...} }
          let responseData = response;
          if (response?.data !== undefined) {
            responseData = response.data;
          }
          
          // Extrair dados e meta
          let produtosData = [];
          let metaData = {};
          
          // Se responseData tem propriedade 'data', é paginação do Laravel
          if (responseData?.data !== undefined && Array.isArray(responseData.data)) {
            produtosData = responseData.data;
            metaData = responseData.meta || {};
          } 
          // Se responseData é um array direto
          else if (Array.isArray(responseData)) {
            produtosData = responseData;
            metaData = {};
          }
          // Se responseData tem propriedade 'data' mas não é array (dados diretos)
          else if (responseData && typeof responseData === 'object') {
            produtosData = responseData.data && Array.isArray(responseData.data) ? responseData.data : [];
            metaData = responseData.meta || {};
          }
          
          const produtosArray = Array.isArray(produtosData) ? produtosData : [];
          allProdutos = [...allProdutos, ...produtosArray];
          
          // Verificar se há mais páginas
          lastPage = metaData.last_page || metaData.total_pages || 1;
          const total = metaData.total || allProdutos.length;
          
          // Continuar enquanto houver mais páginas ou enquanto trouxer produtos completos (1000)
          // Se trouxer menos que 1000, provavelmente é a última página
          if (produtosArray.length === 0) {
            hasMore = false; // Sem produtos, parar
          } else if (lastPage > 1) {
            hasMore = currentPage < lastPage; // Usar meta quando disponível
          } else {
            hasMore = produtosArray.length >= 1000; // Se não tem meta, continuar enquanto trouxer 1000
          }
          
          currentPage++;
          
          // Proteção contra loop infinito
          if (currentPage > 100) {
            console.warn('⚠️ [OSProdutoLookupModal] Limite de páginas atingido. Parando busca.');
            break;
          }
        }

        // Carregar serviços adicionais da calculadora
        let servicosAdicionais = [];
        try {
          const servicosResponse = await calculadoraService.getServicosAdicionais();
          if (servicosResponse?.data?.data) {
            servicosAdicionais = servicosResponse.data.data;
          }
        } catch (servicosError) {
          console.warn('⚠️ Erro ao carregar serviços adicionais:', servicosError);
        }
        
        // Combinar produtos e serviços adicionais
        const produtosComServicos = [
          ...allProdutos,
          ...servicosAdicionais.map(servico => ({
            id: `servico_${servico.id}`,
            nome: servico.nome,
            preco_venda: servico.preco,
            unidadeMedida: servico.unidade || 'm²',
            tipo_produto: 'm2',
            estoque: 999999,
            codigo_produto: `SERV-${servico.id}`,
            categoria_nome: 'Serviços Adicionais',
            imagem_principal: null,
            sku: `SERV-${servico.id}`,
            descricao: servico.descricao,
            isServicoAdicional: true,
            servico_original: servico
          }))
        ];
        if (!cancelled) {
          setProdutos(produtosComServicos);
        }
      } catch (error) {
        console.error('❌ [OSProdutoLookupModal] Erro ao carregar produtos:', error);
        if (!cancelled) {
          setProdutos([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    loadProdutos();

    return () => {
      cancelled = true;
    };
  }, [openState, produtosCadastrados]);

  const filteredProdutos = useMemo(() => {
    if (!Array.isArray(produtos)) return [];
    const lowerSearchTerm = (searchTerm || '').toLowerCase();
    const toLower = (val) => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') return val.toLowerCase();
      if (typeof val === 'number') return String(val);
      if (typeof val === 'object') {
        // Tentar campos comuns de categoria
        if (val.nome) return String(val.nome).toLowerCase();
        return JSON.stringify(val).toLowerCase();
      }
      return String(val).toLowerCase();
    };
    return produtos.filter(p => {
      const nome = toLower(p.nome);
      const codigo = toLower(p.codigo_produto);
      // Normalizar categoria - pode vir como objeto ou string
      const categoriaObj = p.categoria || {};
      const categoriaNome = typeof categoriaObj === 'object' ? categoriaObj.nome : categoriaObj;
      const categoria = toLower(p.categoria_nome || categoriaNome);
      const tipo = toLower(p.tipo_produto);
      const descricao = toLower(p.descricao || p.descricao_curta || p.descricao_longa);
      const sku = toLower(p.sku || p.codigo_barras);
      return (
        nome.includes(lowerSearchTerm) ||
        codigo.includes(lowerSearchTerm) ||
        categoria.includes(lowerSearchTerm) ||
        tipo.includes(lowerSearchTerm) ||
        descricao.includes(lowerSearchTerm) ||
        sku.includes(lowerSearchTerm)
      );
    });
  }, [produtos, searchTerm]);

  const handleSelect = (produto) => {
    const estoqueDisponivel = calcularEstoqueTotal(produto);
    const isDigital = produto.is_digital === true || produto.is_digital === 1 || produto.is_digital === '1';
    if (!isDigital && estoqueDisponivel <= 0 && produto.tipo_produto === 'unidade') {
        alert(`Estoque zerado para o produto ${produto.nome}.`);
        return;
    }
    onSelectProduto(produto);
    setOpenState(false);
    setSearchTerm('');
  };

  return (
    <Dialog open={openState} onOpenChange={setOpenState}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-3xl p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Selecionar Produto</DialogTitle>
          <DialogDescription className="sr-only">
            Busque e selecione um produto para adicionar na ordem de servico.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome, código, categoria ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>
        <ScrollArea className="h-[60vh]">
          {isLoading ? (
            <div className="text-center p-10 text-muted-foreground">
              Carregando produtos...
            </div>
          ) : filteredProdutos.length === 0 ? (
            <div className="text-center p-10 text-muted-foreground">
              Nenhum produto encontrado com os termos da busca.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
              {filteredProdutos.map(produto => (
                <Card key={produto.id} className="flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="p-3">
                    {produto.imagem_principal ? (
                      <img src={getImageUrl(produto.imagem_principal)} alt={produto.nome} className="w-full h-32 object-cover rounded-md" />
                    ) : (
                      <div className="w-full h-32 bg-muted rounded-md flex items-center justify-center">
                        <ImageIconPlaceholder className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-3 flex-grow">
                    <CardTitle className="text-sm font-semibold mb-1 truncate" title={produto.nome}>{produto.nome}</CardTitle>
                    <p className="text-xs text-muted-foreground">Cód: {produto.codigo_produto || 'N/A'}</p>
                    {(() => {
                      const categoriaObj = produto.categoria || {};
                      const categoriaNome = typeof categoriaObj === 'object' ? categoriaObj.nome : categoriaObj;
                      const categoriaDisplay = produto.categoria_nome || categoriaNome;
                      return categoriaDisplay ? (
                        <p className="text-xs text-muted-foreground">Categoria: {categoriaDisplay}</p>
                      ) : null;
                    })()}
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      {produto.isServicoAdicional ? (
                        <>
                          <Ruler size={12} className="mr-1 text-blue-500"/>
                          <span className="text-blue-600 font-medium">Serviço Adicional</span>
                        </>
                      ) : produto.tipo_produto === 'm2' ? (
                        <>
                          <Ruler size={12} className="mr-1 text-blue-500"/>
                          <span>Tipo: Metro²</span>
                        </>
                      ) : (
                        <>
                          <Package size={12} className="mr-1 text-green-500"/>
                          <span>Tipo: {produto.unidade_medida || produto.unidadeMedida || 'Unidade'}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Estoque: {(() => {
                      const est = calcularEstoqueTotal(produto);
                      return est % 1 === 0 ? est : est.toFixed(2);
                    })()} {produto.unidade_medida || produto.unidadeMedida}</p>
                    <p className="text-sm font-bold text-primary mt-1">
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
                        } else {
                          preco = parseFloat(produto.preco_venda || 0);
                        }
                        if (!sufixo && produto.tipo_produto === 'm2') sufixo = '/m²';
                        return <>R$ {preco.toFixed(2)}{sufixo && <span className="text-xs text-muted-foreground"> {sufixo}</span>}</>;
                      })()}
                    </p>
                  </CardContent>
                  <CardFooter className="p-3 border-t">
                    <Button 
                      onClick={() => handleSelect(produto)} 
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs"
                      size="sm"
                    >
                      Selecionar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="p-4 border-t">
            <DialogClose asChild>
                <Button variant="outline">Fechar</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OSProdutoLookupModal;