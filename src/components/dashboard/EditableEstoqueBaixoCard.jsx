import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Edit3, Check, X, Save, Loader2, Package, AlertTriangle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { produtoService } from '@/services/api';
import { cn } from '@/lib/utils';

const EditableEstoqueBaixoCard = ({ produto, onUpdate, onError }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingVariacao, setEditingVariacao] = useState(null);
  const [editValues, setEditValues] = useState({
    estoque: produto.estoque || 0,
    estoque_minimo: produto.estoque_minimo || 0
  });
  const [variacaoEditValues, setVariacaoEditValues] = useState({});
  const { toast } = useToast();

  // Função para verificar se o produto tem variações com estoque baixo
  const getVariacoesComEstoqueBaixo = () => {
    if (!produto.variacoes_ativa || !Array.isArray(produto.variacoes)) {
      return [];
    }

    return produto.variacoes.filter(variacao => {
      const estoqueVar = parseFloat(variacao.estoque_var || 0);
      const estoqueMinimo = parseFloat(produto.estoque_minimo || 0);
      // Mostrar variações com estoque menor ou igual ao mínimo (não apenas <)
      return estoqueVar <= estoqueMinimo && estoqueMinimo > 0;
    });
  };

  // Função para obter nome da variação
  const getNomeVariacao = (variacao) => {
    if (variacao.nome) return variacao.nome;
    
    const partes = [];
    if (variacao.cor) partes.push(variacao.cor);
    if (variacao.tamanho) partes.push(variacao.tamanho);
    
    return partes.length > 0 ? partes.join(' / ') : 'Variação sem nome';
  };

  const getStatusEstoque = (estoque, estoqueMinimo) => {
    const estoqueAtual = parseFloat(estoque);
    const minimo = parseFloat(estoqueMinimo);
    
    if (estoqueAtual <= 0) {
      return { label: 'Sem Estoque', variant: 'destructive' };
    } else if (estoqueAtual <= minimo * 0.5) {
      return { label: 'Crítico', variant: 'destructive' };
    } else if (estoqueAtual <= minimo) {
      return { label: 'Baixo', variant: 'secondary' };
    }
    return { label: 'Normal', variant: 'default' };
  };

  const formatarEstoque = (estoque) => {
    const numero = parseFloat(estoque);
    return isNaN(numero) ? '0' : numero.toString();
  };

  const handleEdit = () => {
    setEditValues({
      estoque: produto.estoque || 0,
      estoque_minimo: produto.estoque_minimo || 0
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValues({
      estoque: produto.estoque || 0,
      estoque_minimo: produto.estoque_minimo || 0
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validações básicas
      const novoEstoque = parseFloat(editValues.estoque);
      const novoEstoqueMinimo = parseFloat(editValues.estoque_minimo);

      if (isNaN(novoEstoque) || novoEstoque < 0) {
        toast({
          title: "Erro de Validação",
          description: "O estoque deve ser um número válido maior ou igual a zero.",
          variant: "destructive",
        });
        return;
      }

      if (isNaN(novoEstoqueMinimo) || novoEstoqueMinimo < 0) {
        toast({
          title: "Erro de Validação", 
          description: "O estoque mínimo deve ser um número válido maior ou igual a zero.",
          variant: "destructive",
        });
        return;
      }

      // Preparar dados para atualização
      const updateData = {
        estoque: novoEstoque,
        estoque_minimo: novoEstoqueMinimo
      };

      // Chamar API para atualizar o produto
      console.log('🔄 Atualizando produto:', produto.id, updateData);
      const response = await produtoService.update(produto.id, updateData);
      console.log('✅ Produto atualizado:', response.data);

      // Atualizar produto localmente
      const produtoAtualizado = {
        ...produto,
        estoque: novoEstoque,
        estoque_minimo: novoEstoqueMinimo
      };

      // Chamar callback de atualização se fornecido
      if (onUpdate) {
        onUpdate(produtoAtualizado);
      }

      toast({
        title: "Produto Atualizado",
        description: `${produto.nome} foi atualizado com sucesso.`,
        variant: "default",
      });

      setIsEditing(false);

    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Não foi possível atualizar o produto.';
      
      toast({
        title: "Erro ao Atualizar",
        description: errorMessage,
        variant: "destructive",
      });

      if (onError) {
        onError(error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVariacaoEdit = (variacaoIndex) => {
    const variacao = variacoesComEstoqueBaixo[variacaoIndex];
    setVariacaoEditValues({
      estoque_var: variacao.estoque_var || 0
    });
    setEditingVariacao(variacaoIndex);
  };

  const handleVariacaoCancel = () => {
    setEditingVariacao(null);
    setVariacaoEditValues({});
  };

  const handleVariacaoSave = async (variacaoIndex) => {
    setIsSaving(true);
    try {
      const variacao = variacoesComEstoqueBaixo[variacaoIndex];
      const novoEstoque = parseFloat(variacaoEditValues.estoque_var);

      if (isNaN(novoEstoque) || novoEstoque < 0) {
        toast({
          title: "Erro de Validação",
          description: "O estoque deve ser um número válido maior ou igual a zero.",
          variant: "destructive",
        });
        return;
      }

      // Encontrar o índice real da variação no array completo usando identificadores únicos
      let indiceReal = -1;
      
      // Primeiro, tentar por identificadores únicos mais confiáveis
      if (variacao.sku) {
        indiceReal = produto.variacoes.findIndex(v => v.sku === variacao.sku);
        if (indiceReal !== -1) {
          console.log('✅ Variação encontrada por SKU:', variacao.sku);
        }
      }
      
      if (indiceReal === -1 && variacao.codigo_barras) {
        indiceReal = produto.variacoes.findIndex(v => v.codigo_barras === variacao.codigo_barras);
        if (indiceReal !== -1) {
          console.log('✅ Variação encontrada por código de barras:', variacao.codigo_barras);
        }
      }
      
      if (indiceReal === -1 && variacao.id) {
        indiceReal = produto.variacoes.findIndex(v => v.id === variacao.id);
        if (indiceReal !== -1) {
          console.log('✅ Variação encontrada por ID:', variacao.id);
        }
      }
      
      // Fallback: tentar por nome e estoque atual
      if (indiceReal === -1) {
        indiceReal = produto.variacoes.findIndex(v => 
          v.nome === variacao.nome && v.estoque_var === variacao.estoque_var
        );
        if (indiceReal !== -1) {
          console.log('✅ Variação encontrada por nome e estoque:', variacao.nome, variacao.estoque_var);
        }
      }
      
      // Último fallback: apenas por nome
      if (indiceReal === -1) {
        indiceReal = produto.variacoes.findIndex(v => v.nome === variacao.nome);
        if (indiceReal !== -1) {
          console.log('⚠️ Variação encontrada apenas por nome (menos confiável):', variacao.nome);
        }
      }
      
      if (indiceReal === -1) {
        console.error('❌ Não foi possível encontrar o índice real da variação:', variacao);
        toast({
          title: "Erro",
          description: "Não foi possível localizar a variação para atualização.",
          variant: "destructive",
        });
        return;
      }

      // Chamar API para atualizar o estoque da variação
      console.log('🔄 Atualizando estoque da variação:', {
        produtoId: produto.id,
        variacaoIndex: indiceReal,
        novoEstoque,
        variacaoOriginal: variacao,
        identificadores: {
          id: variacao.id,
          sku: variacao.sku,
          codigo_barras: variacao.codigo_barras,
          nome: variacao.nome
        },
        variacaoEncontrada: produto.variacoes[indiceReal]
      });

      const response = await produtoService.atualizarEstoqueVariacao(produto.id, {
        variacao_index: indiceReal,
        estoque_var: novoEstoque
      });

      console.log('✅ Estoque da variação atualizado:', response.data);

      // Atualizar produto localmente
      const produtoAtualizado = {
        ...produto,
        variacoes: produto.variacoes.map((v, index) => 
          index === indiceReal 
            ? { ...v, estoque_var: novoEstoque }
            : v
        )
      };

      console.log('🔄 Produto atualizado localmente:', produtoAtualizado);

      // Chamar callback de atualização se fornecido
      if (onUpdate) {
        onUpdate(produtoAtualizado);
      }

      toast({
        title: "Variação Atualizada",
        description: `Estoque da variação "${getNomeVariacao(variacao)}" foi atualizado com sucesso.`,
        variant: "default",
      });

      setEditingVariacao(null);
      setVariacaoEditValues({});

    } catch (error) {
      console.error('Erro ao atualizar estoque da variação:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Não foi possível atualizar o estoque da variação.';
      
      toast({
        title: "Erro ao Atualizar",
        description: errorMessage,
        variant: "destructive",
      });

      if (onError) {
        onError(error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleVariacaoInputChange = (value) => {
    setVariacaoEditValues(prev => ({
      ...prev,
      estoque_var: value
    }));
  };

  const statusEstoque = getStatusEstoque(
    isEditing ? editValues.estoque : produto.estoque, 
    isEditing ? editValues.estoque_minimo : produto.estoque_minimo
  );

  const variacoesComEstoqueBaixo = getVariacoesComEstoqueBaixo();
  const temVariacoes = produto.variacoes_ativa && variacoesComEstoqueBaixo.length > 0;

  return (
    <div className={cn(
      "border rounded-lg p-4 transition-all duration-200",
      isEditing 
        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600" 
        : "hover:bg-gray-50 dark:hover:bg-gray-800"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              {temVariacoes && <Package className="h-4 w-4 text-orange-500" />}
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {produto.nome || 'Produto sem nome'}
              </h3>
            </div>
            <Badge variant={statusEstoque.variant}>
              {statusEstoque.label}
            </Badge>
            {temVariacoes && (
              <Badge variant="outline" className="text-xs">
                {variacoesComEstoqueBaixo.length} variação(ões)
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Estoque Atual:</span>
              {isEditing ? (
                <div className="mt-1">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={editValues.estoque}
                    onChange={(e) => handleInputChange('estoque', e.target.value)}
                    className="h-8 text-sm"
                    disabled={isSaving}
                  />
                </div>
              ) : (
                <span className="ml-2 font-medium">
                  {formatarEstoque(produto.estoque)} unidades
                </span>
              )}
            </div>
            
            <div>
              <span className="text-gray-500">Estoque Mínimo:</span>
              {isEditing ? (
                <div className="mt-1">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={editValues.estoque_minimo}
                    onChange={(e) => handleInputChange('estoque_minimo', e.target.value)}
                    className="h-8 text-sm"
                    disabled={isSaving}
                  />
                </div>
              ) : (
                <span className="ml-2 font-medium">
                  {formatarEstoque(produto.estoque_minimo)} unidades
                </span>
              )}
            </div>
            
            <div>
              <span className="text-gray-500">Código:</span>
              <span className="ml-2 font-medium">
                {produto.codigo || produto.codigo_barras || 'N/A'}
              </span>
            </div>
          </div>
          
          {produto.descricao && (
            <div className="mt-2">
              <span className="text-gray-500 text-sm">Descrição:</span>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {produto.descricao}
              </p>
            </div>
          )}

          {/* Seção de Variações com Estoque Baixo */}
          {temVariacoes && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Variações com Estoque Baixo
                </span>
              </div>
              <div className="space-y-2">
                {variacoesComEstoqueBaixo.map((variacao, index) => (
                  <Card key={index} className={cn(
                    "p-3 border transition-all duration-200",
                    editingVariacao === index 
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600" 
                      : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {getNomeVariacao(variacao)}
                          </span>
                          <Badge 
                            variant={parseFloat(variacao.estoque_var || 0) <= 0 ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {parseFloat(variacao.estoque_var || 0) <= 0 ? "Sem Estoque" : "Baixo"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                          <span>
                            Estoque: 
                            {editingVariacao === index ? (
                              <div className="mt-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={variacaoEditValues.estoque_var || 0}
                                  onChange={(e) => handleVariacaoInputChange(e.target.value)}
                                  className="h-6 text-xs w-20"
                                  disabled={isSaving}
                                />
                              </div>
                            ) : (
                              <strong className="ml-1">{parseFloat(variacao.estoque_var || 0)}</strong>
                            )}
                          </span>
                          {variacao.sku && (
                            <span>
                              SKU: <strong>{variacao.sku}</strong>
                            </span>
                          )}
                          {variacao.codigo_barras && (
                            <span>
                              Código: <strong>{variacao.codigo_barras}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {variacao.preco_var && (
                          <div className="text-sm font-medium text-green-600 dark:text-green-400">
                            R$ {parseFloat(variacao.preco_var).toFixed(2)}
                          </div>
                        )}
                        {editingVariacao === index ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleVariacaoCancel}
                              disabled={isSaving}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleVariacaoSave(index)}
                              disabled={isSaving}
                              className="h-6 w-6 p-0"
                            >
                              {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVariacaoEdit(index)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Botões de ação */}
        <div className="flex items-center gap-2 ml-4">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 w-8 p-0"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleEdit}
              className="h-8 w-8 p-0"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditableEstoqueBaixoCard;
