import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Trash2, PackagePlus, Settings2, AlertTriangle, ImageOff, Plus, Minus, PackageSearch, Edit3, Copy, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getImageUrl } from '@/lib/imageUtils';
import api from '@/config/axios';

const EnvelopamentoFormRight = ({ orcamento, adminSettings = {}, onUpdatePecaQuantidade, onRemovePeca, onOpenPartesModal, onUpdatePecaServicosAdicionais, onUpdatePecaProduto, onUpdatePecaMedidas, onUpdatePecaProdutoDireto }) => {
  const [servicosAdicionais, setServicosAdicionais] = useState([]);
  const [loadingServicos, setLoadingServicos] = useState(true);
  const [errorServicos, setErrorServicos] = useState(null);
  const [editingMedidas, setEditingMedidas] = useState({});
  const [tempMedidas, setTempMedidas] = useState({});
  const [showCopyServices, setShowCopyServices] = useState(null);
  const [selectedServices, setSelectedServices] = useState({});
  const [copyProduct, setCopyProduct] = useState(false);

  // Pré-selecionar serviços quando o modal de cópia for aberto
  useEffect(() => {
    if (showCopyServices) {
      const pecaOrigem = orcamento.selectedPecas.find(p => p.id === showCopyServices);
      const servicosPreSelecionados = {};
      
      if (pecaOrigem?.servicosAdicionais) {
        Object.entries(pecaOrigem.servicosAdicionais).forEach(([servicoKey, checked]) => {
          if (checked) {
            servicosPreSelecionados[servicoKey] = true;
          }
        });
      }
      
      setSelectedServices(servicosPreSelecionados);
    }
  }, [showCopyServices, orcamento.selectedPecas]);

  // Buscar serviços adicionais ativos do banco
  useEffect(() => {
    const buscarServicosAdicionais = async () => {
      try {
        setLoadingServicos(true);
        setErrorServicos(null);
        
        // Obter token do localStorage
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setErrorServicos('Token de autenticação não encontrado');
          return;
        }

        // Usar o api configurado em vez de axios direto
        const response = await api.get('/api/servicos-adicionais');
        
        if (response.data.success) {
          // Filtrar apenas serviços ativos do tipo envelopamento e ordenar por categoria e ordem
          const servicosAtivos = response.data.data
            .filter(servico => servico.ativo && servico.tipo === 'envelopamento')
            .sort((a, b) => {
              // Primeiro por categoria, depois por ordem, depois por nome
              if (a.categoria !== b.categoria) {
                return a.categoria.localeCompare(b.categoria);
              }
              if (a.ordem !== b.ordem) {
                return a.ordem - b.ordem;
              }
              return a.nome.localeCompare(b.nome);
            });
          
          setServicosAdicionais(servicosAtivos);
        } else {
          setErrorServicos(response.data.message || 'Erro ao buscar serviços');
        }
      } catch (error) {
        console.error('Erro ao buscar serviços adicionais:', error);
        
        // Log detalhado para debug
        console.log('Detalhes do erro:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            baseURL: error.config?.baseURL,
            headers: error.config?.headers
          }
        });
        
        // Mensagem de erro mais específica
        let errorMessage = 'Erro ao conectar com o servidor';
        
        if (error.response) {
          // Erro de resposta do servidor
          if (error.response.status === 401) {
            errorMessage = 'Erro de autenticação. Faça login novamente.';
          } else if (error.response.status === 404) {
            errorMessage = 'API não encontrada. Verifique a configuração da URL.';
          } else if (error.response.status === 500) {
            errorMessage = 'Erro interno do servidor.';
          } else if (error.response.data?.message) {
            errorMessage = error.response.data.message;
          }
        } else if (error.request) {
          // Erro de rede
          errorMessage = 'Erro de conexão. Verifique sua internet ou a configuração da API.';
        } else if (error.message) {
          // Erro de configuração
          errorMessage = `Erro de configuração: ${error.message}`;
        }
        
        setErrorServicos(errorMessage);
      } finally {
        setLoadingServicos(false);
      }
    };

    buscarServicosAdicionais();
  }, []);

  // Função para obter o label da categoria
  const getCategoriaLabel = (categoria) => {
    const labels = {
      'aplicacao': 'Aplicação',
      'protecao': 'Proteção',
      'acabamento': 'Acabamento',
      'outros': 'Outros'
    };
    return labels[categoria] || categoria;
  };

  // Função para obter a cor da categoria
  const getCategoriaColor = (categoria) => {
    const colors = {
      'aplicacao': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'protecao': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'acabamento': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'outros': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return colors[categoria] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  const getDisplayImage = (parte) => {
    if (parte.imagem) return getImageUrl(parte.imagem);
    if (parte.imagem_url_externa) return parte.imagem_url_externa;
    return null;
  };

  // Função para calcular o custo total dos serviços adicionais de uma peça específica
  const calcularCustoServicosPeca = (item) => {
    let custoTotal = 0;
    if (item.servicosAdicionais && typeof item.servicosAdicionais === 'object') {
      Object.entries(item.servicosAdicionais).forEach(([servicoKey, checked]) => {
        if (checked) {
          // Buscar o serviço no array de serviços adicionais
          const servico = servicosAdicionais.find(s => s.id.toString() === servicoKey);
          if (servico) {
            const valorServico = parseFloat(servico.preco) || 0;
            const alturaM = parseFloat(String(item.parte?.altura || '0').replace(',', '.')) || 0;
            const larguraM = parseFloat(String(item.parte?.largura || '0').replace(',', '.')) || 0;
            const quantidade = parseInt(item.quantidade, 10) || 0;
            const areaPeca = alturaM * larguraM * quantidade;
            
            let custoServico = 0;
            
            // Calcular baseado na unidade do serviço
            if (servico.unidade === 'm²' || servico.unidade === 'm2') {
              // Serviços por m²: multiplicar pela área da peça (só se não for produto sem medidas)
              if (item.parte?.isProdutoSemMedidas) {
                custoServico = 0; // Não aplicar serviços por m² para produtos sem medidas
              } else {
                custoServico = valorServico * areaPeca;
              }
            } else if (servico.unidade === 'unidade' || servico.unidade === 'un') {
              // Serviços por unidade: multiplicar pela quantidade
              custoServico = valorServico * quantidade;
            } else {
              // Para outras unidades, assumir por m² como padrão (só se não for produto sem medidas)
              if (item.parte?.isProdutoSemMedidas) {
                custoServico = 0;
              } else {
                custoServico = valorServico * areaPeca;
              }
            }
            
            custoTotal += custoServico;
          }
        }
      });
    }
    
    return custoTotal;
  };

  // Calcular o custo total dos serviços adicionais para todas as peças
  const calcularCustoTotalServicos = () => {
    let custoTotal = 0;
    orcamento.selectedPecas.forEach(item => {
      custoTotal += calcularCustoServicosPeca(item);
    });
    return custoTotal;
  };

  // Calcular o custo total do orçamento (material + serviços)
  const calcularTotalOrcamento = () => {
    const custoMaterial = orcamento.custoTotalMaterial || 0;
    const custoServicos = calcularCustoTotalServicos();
    return custoMaterial + custoServicos;
  };

  // Funções para edição de medidas
  const iniciarEdicaoMedidas = (itemId) => {
    const item = orcamento.selectedPecas.find(p => p.id === itemId);
    if (item) {
      setEditingMedidas(prev => ({ ...prev, [itemId]: true }));
      setTempMedidas(prev => ({
        ...prev,
        [itemId]: {
          largura: String(item.parte.largura || '0').replace('.', ','),
          altura: String(item.parte.altura || '0').replace('.', ',')
        }
      }));
    }
  };

  const cancelarEdicaoMedidas = (itemId) => {
    setEditingMedidas(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
    setTempMedidas(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  };

  const salvarMedidas = (itemId) => {
    const medidas = tempMedidas[itemId];
    if (medidas && onUpdatePecaMedidas) {
      const larguraNum = parseFloat(medidas.largura.replace(',', '.'));
      const alturaNum = parseFloat(medidas.altura.replace(',', '.'));
      
      if (!isNaN(larguraNum) && !isNaN(alturaNum) && larguraNum > 0 && alturaNum > 0) {
        onUpdatePecaMedidas(itemId, larguraNum, alturaNum);
        cancelarEdicaoMedidas(itemId);
      }
    }
  };

  const atualizarTempMedidas = (itemId, campo, valor) => {
    setTempMedidas(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [campo]: valor
      }
    }));
  };

  // Funções para cópia de serviços
  const iniciarCopiarServicos = (itemId) => {
    setShowCopyServices(itemId);
    setCopyProduct(false);
  };

  const cancelarCopiarServicos = () => {
    setShowCopyServices(null);
    setSelectedServices({});
    setCopyProduct(false);
  };

  const toggleServicoSelecionado = (servicoId) => {
    setSelectedServices(prev => ({
      ...prev,
      [servicoId]: !prev[servicoId]
    }));
  };

  const copiarServicos = () => {
    if (!showCopyServices) return;
    
    const servicosParaCopiar = Object.keys(selectedServices).filter(id => selectedServices[id]);
    const pecaOrigem = orcamento.selectedPecas.find(p => p.id === showCopyServices);
    
    if (servicosParaCopiar.length === 0 && !copyProduct) return;

    // Aplicar os serviços selecionados e/ou produto para todas as outras peças
    orcamento.selectedPecas.forEach(item => {
      if (item.id !== showCopyServices) {
        // Copiar serviços - preservar o nome se já estiver salvo
        servicosParaCopiar.forEach(servicoId => {
          if (onUpdatePecaServicosAdicionais) {
            // Verificar se o serviço na peça origem já tem nome salvo
            const servicoOrigem = pecaOrigem?.servicosAdicionais?.[servicoId];
            if (typeof servicoOrigem === 'object' && servicoOrigem?.nome) {
              // Se já tem nome, usar o mesmo objeto
              onUpdatePecaServicosAdicionais(item.id, servicoId, servicoOrigem);
            } else {
              // Se não tem nome, usar true (a função handleUpdatePecaServicosAdicionais vai buscar o nome)
              onUpdatePecaServicosAdicionais(item.id, servicoId, true);
            }
          }
        });
        
        // Copiar produto se selecionado
        if (copyProduct && pecaOrigem?.produto && onUpdatePecaProdutoDireto) {
          onUpdatePecaProdutoDireto(item.id, pecaOrigem.produto);
        }
      }
    });

    cancelarCopiarServicos();
  };

  return (
    <div className="h-full flex flex-col space-y-4 bg-white dark:bg-gray-900 p-2 sm:p-4 rounded-lg">
      <CardHeader className="pb-2 pt-0 px-0">
        <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">VISUALIZAÇÃO DO ORÇAMENTO</CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground">Revise os itens e o total do seu orçamento.</CardDescription>
      </CardHeader>
      
      <div className="flex flex-col sm:flex-row gap-2 mb-0">
         <Button onClick={() => onOpenPartesModal('form', false, false)} variant="outline" className="flex-1 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white text-xs sm:text-sm">
            <PackagePlus size={16} className="sm:mr-2" /> 
            <span className="hidden sm:inline">Nova Peça (Catálogo)</span>
            <span className="sm:hidden">Nova Peça</span>
          </Button>
          <Button onClick={() => onOpenPartesModal('manage', true, false)} variant="outline" className="flex-1 text-xs sm:text-sm">
            <Settings2 size={16} className="sm:mr-2" /> 
            <span className="hidden sm:inline">Gerenciar Peças (Catálogo)</span>
            <span className="sm:hidden">Gerenciar</span>
          </Button>
      </div>



             <div className="flex-grow overflow-hidden bg-white dark:bg-gray-900">
         <ScrollArea className="h-full pr-2 bg-white dark:bg-gray-900"> 
           <Card className="shadow-lg border-border bg-white dark:bg-gray-800">
            <CardHeader className="border-b">
                <CardTitle className="text-lg">Itens do Orçamento ({orcamento.selectedPecas.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {orcamento.selectedPecas.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-lg font-medium">Nenhuma peça adicionada.</p>
                  <p className="text-sm">Use os botões acima ou o painel à esquerda para adicionar peças.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orcamento.selectedPecas.map((item) => {
                    const alturaNum = parseFloat(String(item.parte.altura || '0').replace(',', '.'));
                    const larguraNum = parseFloat(String(item.parte.largura || '0').replace(',', '.'));
                    const quantidadeNum = parseInt(item.quantidade, 10) || 0;
                    
                    const areaItemCalculada = (alturaNum * larguraNum * quantidadeNum);
                    const areaItemFormatada = isNaN(areaItemCalculada) ? '0.000' : areaItemCalculada.toFixed(3);
                    const alturaFormatada = isNaN(alturaNum) ? '0.00' : alturaNum.toFixed(2);
                    const larguraFormatada = isNaN(larguraNum) ? '0.00' : larguraNum.toFixed(2);
                    
                    const displayImageSrc = getDisplayImage(item.parte);
                    
                    return (
                      <Card key={item.id} className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col space-y-4">
                            {/* Linha 1: Imagem + Nome + Quantidade (Mobile) / Desktop Layout */}
                            <div className="flex gap-3 sm:gap-4 items-start">
                              {/* Imagem */}
                              <div className="shrink-0">
                                {displayImageSrc ? (
                                  <img alt={item.parte.nome} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg shadow-sm border" src={displayImageSrc} />
                                ) : (
                                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center text-gray-400 border">
                                    <ImageOff size={20} className="sm:w-6 sm:h-6"/>
                                  </div>
                                )}
                              </div>
                              
                              {/* Nome + Info */}
                              <div className="flex-grow min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                                  <h3 className="font-semibold text-sm sm:text-lg text-foreground break-words">
                                    {item.parte.nome}
                                  </h3>
                                  {item.parte.isAvulsa && (
                                    <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full whitespace-nowrap self-start">
                                      Avulsa
                                    </span>
                                  )}
                                </div>
                                
                                {item.parte?.isProdutoSemMedidas ? (
                                  <div className="text-xs sm:text-sm mb-2">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <span className="text-muted-foreground text-xs">Tipo:</span>
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full text-xs font-medium">
                                        Produto sem medidas
                                      </span>
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                      Este produto não requer medidas específicas
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm mb-2">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="text-muted-foreground text-xs">Medidas:</span>
                                        {!editingMedidas[item.id] && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => iniciarEdicaoMedidas(item.id)}
                                            className="h-5 px-2 text-xs text-blue-600 hover:text-blue-800"
                                          >
                                            <Edit3 size={10} className="mr-1" />
                                            Editar
                                          </Button>
                                        )}
                                      </div>
                                      {editingMedidas[item.id] ? (
                                        <div className="space-y-2">
                                          <div className="flex gap-1 sm:gap-2">
                                            <div className="flex-1">
                                              <Input
                                                type="text"
                                                placeholder="Largura"
                                                value={tempMedidas[item.id]?.largura || ''}
                                                onChange={(e) => atualizarTempMedidas(item.id, 'largura', e.target.value)}
                                                className="h-7 sm:h-8 text-xs"
                                              />
                                            </div>
                                            <div className="flex-1">
                                              <Input
                                                type="text"
                                                placeholder="Altura"
                                                value={tempMedidas[item.id]?.altura || ''}
                                                onChange={(e) => atualizarTempMedidas(item.id, 'altura', e.target.value)}
                                                className="h-7 sm:h-8 text-xs"
                                              />
                                            </div>
                                          </div>
                                          <div className="flex gap-1">
                                            <Button
                                              size="sm"
                                              onClick={() => salvarMedidas(item.id)}
                                              className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                                            >
                                              <Check size={10} className="mr-1" />
                                              Salvar
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => cancelarEdicaoMedidas(item.id)}
                                              className="h-6 px-2 text-xs"
                                            >
                                              Cancelar
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="font-medium text-xs sm:text-sm">{`${larguraFormatada}m x ${alturaFormatada}m`}</div>
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground text-xs">Área:</span>
                                      <div className="font-medium text-xs sm:text-sm">{areaItemFormatada} m²</div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Quantidade (Desktop inline) */}
                              <div className="hidden sm:flex items-center">
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground mb-1">Quantidade</div>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantidade}
                                    onChange={(e) => onUpdatePecaQuantidade(item.id, e.target.value)}
                                    className="w-16 sm:w-20 h-8 sm:h-9 text-center text-sm border-input focus:ring-primary focus:border-primary"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Linha 2: Produto */}
                            <div className="space-y-2">
                              <div className="text-xs sm:text-sm text-muted-foreground">Produto:</div>
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                <div className="flex-grow min-w-0 w-full sm:w-auto">
                                  {item.produto ? (
                                    <div className="flex items-start">
                                      <PackageSearch size={14} className="mr-2 text-green-600 shrink-0 mt-0.5"/>
                                      <div className="min-w-0 flex-grow">
                                        <div className="font-medium text-xs sm:text-sm break-words">
                                          {item.produto.nome} 
                                          {item.produto.cor_opcional ? ` (${item.produto.cor_opcional})` : ''}
                                        </div>
                                        {item.produto.promocao_ativa && item.produto.preco_promocional ? (
                                          <div className="text-xs">
                                            <span className="text-orange-600 font-semibold">R$ {parseFloat(item.produto.preco_promocional).toFixed(2)}/m²</span>
                                            {item.produto.preco_original && (
                                              <span className="text-gray-400 line-through ml-1">R$ {parseFloat(item.produto.preco_original).toFixed(2)}</span>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-muted-foreground">R$ {parseFloat(item.produto.valorMetroQuadrado || 0).toFixed(2)}/m²</div>
                                        )}
                                      </div>
                                    </div>
                                  ) : orcamento.produto ? (
                                    <div className="flex items-start">
                                      <PackageSearch size={14} className="mr-2 text-green-600 shrink-0 mt-0.5"/>
                                      <div className="min-w-0 flex-grow">
                                        <div className="font-medium text-xs sm:text-sm break-words">
                                          {orcamento.produto.nome} 
                                          {orcamento.produto.cor_opcional ? ` (${orcamento.produto.cor_opcional})` : ''}
                                        </div>
                                        {orcamento.produto.promocao_ativa && orcamento.produto.preco_promocional ? (
                                          <div className="text-xs">
                                            <span className="text-orange-600 font-semibold">R$ {parseFloat(orcamento.produto.preco_promocional).toFixed(2)}/m²</span>
                                            {orcamento.produto.preco_original && (
                                              <span className="text-gray-400 line-through ml-1">R$ {parseFloat(orcamento.produto.preco_original).toFixed(2)}</span>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-muted-foreground">R$ {parseFloat(orcamento.produto.valorMetroQuadrado || 0).toFixed(2)}/m²</div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground italic text-xs sm:text-sm">N/A</span>
                                  )}
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => onUpdatePecaProduto && onUpdatePecaProduto(item.id)}
                                  className="shrink-0 h-7 sm:h-8 px-2 sm:px-3 text-xs w-full sm:w-auto"
                                >
                                  <PackageSearch size={12} className="mr-1" /> 
                                  {item.produto ? 'Alterar' : 'Selecionar'}
                                </Button>
                              </div>
                            </div>

                            {/* Quantidade (Mobile) */}
                            <div className="sm:hidden flex items-center justify-between border-t pt-2">
                              <span className="text-xs text-muted-foreground">Quantidade:</span>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantidade}
                                onChange={(e) => onUpdatePecaQuantidade(item.id, e.target.value)}
                                className="w-20 h-8 text-center text-sm border-input focus:ring-primary focus:border-primary"
                              />
                            </div>
                          </div>

                          {/* Serviços Adicionais */}
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                              <div className="text-xs sm:text-sm text-muted-foreground font-medium">Serviços Adicionais:</div>
                              {orcamento.selectedPecas.length > 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => iniciarCopiarServicos(item.id)}
                                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800 w-full sm:w-auto"
                                >
                                  <Copy size={12} className="mr-1" />
                                  Copiar para outras peças
                                </Button>
                              )}
                            </div>
                            {item.parte?.isProdutoSemMedidas && (
                              <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                                  <strong>Nota:</strong> Para produtos sem medidas, apenas serviços por unidade estão disponíveis.
                                </div>
                              </div>
                            )}
                            {loadingServicos ? (
                              <div className="text-xs sm:text-sm text-muted-foreground">Carregando serviços...</div>
                            ) : errorServicos ? (
                              <div className="text-xs sm:text-sm text-red-500 text-center py-4">
                                {errorServicos}
                              </div>
                            ) : servicosAdicionais.length === 0 ? (
                              <div className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                                Nenhum serviço adicional disponível no momento.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                                {servicosAdicionais
                                  .filter(servico => {
                                    // Para produtos sem medidas, mostrar apenas serviços por unidade
                                    if (item.parte?.isProdutoSemMedidas) {
                                      return servico.unidade === 'unidade' || servico.unidade === 'un';
                                    }
                                    // Para produtos com medidas, mostrar todos os serviços
                                    return true;
                                  })
                                  .map((servico) => {
                                  const servicoKey = servico.id.toString();
                                  const isChecked = item.servicosAdicionais?.[servicoKey] || false;
                                  
                                  return (
                                    <div key={servicoKey} className="flex items-start space-x-2">
                                      <Checkbox 
                                        id={`${item.id}-${servicoKey}`}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => onUpdatePecaServicosAdicionais(item.id, servicoKey, checked)}
                                        className="h-4 w-4 mt-0.5 shrink-0"
                                      />
                                      <Label htmlFor={`${item.id}-${servicoKey}`} className="text-xs cursor-pointer flex-grow">
                                        <div className="flex flex-wrap items-center gap-1 mb-1">
                                          <span className="font-medium break-words">{servico.nome}</span>
                                          <span className={`px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap ${getCategoriaColor(servico.categoria)}`}>
                                            {getCategoriaLabel(servico.categoria)}
                                          </span>
                                        </div>
                                        <div className="text-green-600 font-medium text-xs">
                                          R$ {parseFloat(servico.preco).toFixed(2)} / {servico.unidade}
                                        </div>
                                        {servico.descricao && (
                                          <div className="text-xs text-muted-foreground mt-1 break-words">
                                            {servico.descricao}
                                          </div>
                                        )}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {calcularCustoServicosPeca(item) > 0 && (
                              <div className="text-xs sm:text-sm text-green-600 font-semibold mt-3 text-right">
                                Total Serviços: +R$ {calcularCustoServicosPeca(item).toFixed(2)}
                              </div>
                            )}
                          </div>

                          {/* Modal de Cópia de Serviços */}
                          {showCopyServices === item.id && (
                            <div className="mt-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                              <div className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
                                Selecionar itens para copiar para outras peças:
                              </div>
                              
                              {/* Opção para copiar produto */}
                              {item.produto && (
                                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-600">
                                  <div className="flex items-start space-x-2">
                                    <Checkbox 
                                      id={`copy-product-${item.id}`}
                                      checked={copyProduct}
                                      onCheckedChange={setCopyProduct}
                                      className="h-4 w-4 mt-0.5 shrink-0"
                                    />
                                    <Label htmlFor={`copy-product-${item.id}`} className="text-xs sm:text-sm cursor-pointer flex-grow">
                                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                        <PackageSearch size={14} className="text-green-600 shrink-0" />
                                        <span className="font-medium">Copiar Produto:</span>
                                        <span className="text-green-600 font-medium break-words">
                                          {item.produto.nome} 
                                          {item.produto.cor_opcional ? ` (${item.produto.cor_opcional})` : ''}
                                        </span>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                          - R$ {parseFloat(item.produto.valorMetroQuadrado || 0).toFixed(2)}/m²
                                        </span>
                                      </div>
                                    </Label>
                                  </div>
                                </div>
                              )}
                              
                              <div className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
                                Selecionar serviços para copiar:
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3 sm:mb-4">
                                {servicosAdicionais.map((servico) => {
                                  const servicoKey = servico.id.toString();
                                  const isChecked = selectedServices[servicoKey] || false;
                                  
                                  return (
                                    <div key={servicoKey} className="flex items-start space-x-2">
                                      <Checkbox 
                                        id={`copy-${item.id}-${servicoKey}`}
                                        checked={isChecked}
                                        onCheckedChange={() => toggleServicoSelecionado(servicoKey)}
                                        className="h-4 w-4 mt-0.5 shrink-0"
                                      />
                                      <Label htmlFor={`copy-${item.id}-${servicoKey}`} className="text-xs cursor-pointer flex-grow">
                                        <div className="flex flex-wrap items-center gap-1">
                                          <span className="font-medium break-words">{servico.nome}</span>
                                          <span className={`px-1.5 py-0.5 rounded-full text-xs whitespace-nowrap ${getCategoriaColor(servico.categoria)}`}>
                                            {getCategoriaLabel(servico.categoria)}
                                          </span>
                                        </div>
                                        <div className="text-green-600 font-medium text-xs">
                                          R$ {parseFloat(servico.preco).toFixed(2)} / {servico.unidade}
                                        </div>
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  size="sm"
                                  onClick={copiarServicos}
                                  className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                                >
                                  <Copy size={12} className="mr-1" />
                                  <span className="break-words">
                                    {copyProduct || Object.keys(selectedServices).some(id => selectedServices[id]) 
                                      ? 'Copiar Selecionados' 
                                      : 'Nada selecionado'}
                                  </span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelarCopiarServicos}
                                  className="h-8 px-3 text-xs w-full sm:w-auto"
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Ações */}
                          <div className="flex justify-end mt-3 sm:mt-4">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => onRemovePeca(item.id)} 
                              className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-800/50 h-8 px-3 text-xs"
                            >
                              <Trash2 size={14} className="mr-1" />
                              Remover
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {calcularCustoTotalServicos() > 0 && (
            <Card className="mt-4 shadow-lg border-border bg-white dark:bg-gray-800">
                <CardHeader className="border-b p-3 sm:p-4">
                    <CardTitle className="text-sm sm:text-lg">Custos dos Serviços Adicionais</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 space-y-2">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                      Serviços aplicados individualmente por peça
                    </div>
                     <div className="flex justify-between items-center text-xs sm:text-sm font-semibold pt-2 border-t">
                        <span className="text-foreground">Total Adicionais:</span>
                        <span className="text-foreground">R$ {calcularCustoTotalServicos().toFixed(2)}</span>
                    </div>
                </CardContent>
            </Card>
          )}

        </ScrollArea>
      </div>

       <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-orange-50 dark:bg-gray-800 border border-orange-200 dark:border-orange-600 rounded-lg flex items-start space-x-2 sm:space-x-3">
        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
        <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-orange-800 dark:text-orange-200">Nota sobre Estoque:</h3>
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1 break-words">
            A verificação de estoque é simulada. Ao salvar um orçamento com produto insuficiente, um alerta será exibido.
            Em um sistema real com Supabase, o estoque seria gerenciado no banco de dados.
            Múltiplas peças usando o mesmo produto terão sua área total somada para o cálculo de consumo.
            </p>
        </div>
      </div>
    </div>
  );
};

export default EnvelopamentoFormRight;