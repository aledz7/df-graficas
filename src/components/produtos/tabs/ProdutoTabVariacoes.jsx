import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Upload, ImagePlus, Settings, X, RefreshCw, Plus, Edit, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import AdicionarQuantidadeValorModal from '../modals/AdicionarQuantidadeValorModal';

const TIPOS_PRECIFICACAO = [
  { value: 'unidade', label: 'Por Unidade', descricao: 'Preço fixo por unidade vendida' },
  { value: 'quantidade_definida', label: 'Por Quantidade Definidas', descricao: 'Preços específicos para quantidades exatas' },
  { value: 'm2_cm2', label: 'Por M²/CM²', descricao: 'Preço calculado pela área em metros ou centímetros quadrados' },
  { value: 'm2_cm2_tabelado', label: 'Por M²/CM² Tabelado', descricao: 'Tabela de preços por faixas de área' },
  { value: 'metro_linear', label: 'Por Metro Linear', descricao: 'Preço calculado pelo comprimento em metros' },
  { value: 'faixa_quantidade', label: 'Por Faixa de Quantidades', descricao: 'Preços escalonados por intervalos de quantidade' },
];

const ProdutoTabVariacoes = ({
  currentProduto,
  handleInputChange,
  productColors,
  productSizes,
  addVariacao,
  updateVariacao,
  removeVariacao,
  handleVariacaoImageUpload,
  handleVariacoesBulkUpload,
}) => {
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkPreco, setBulkPreco] = useState('');
  const [bulkEstoque, setBulkEstoque] = useState('');
  const [novoTamanhoPersonalizado, setNovoTamanhoPersonalizado] = useState({});
  const [modalTabelaPrecos, setModalTabelaPrecos] = useState({ isOpen: false, variacaoIndex: null, itemEditando: null });
  const SIZE_MODE_DEFAULT = 'padrao';
  const SIZE_MODE_CUSTOM = 'personalizado';
  const sizeModeOptions = useMemo(() => ([
    { value: SIZE_MODE_DEFAULT, label: 'Tabela de tamanhos' },
    { value: SIZE_MODE_CUSTOM, label: 'Tamanhos personalizados' },
  ]), []);

  const getTamanhosPersonalizados = (variacao) => {
    if (Array.isArray(variacao?.tamanhos_personalizados)) {
      return variacao.tamanhos_personalizados;
    }
    return [];
  };

  const adicionarTamanhoPersonalizado = (index) => {
    const valor = (novoTamanhoPersonalizado[index] || '').trim();
    if (!valor) return;

    const variacao = currentProduto.variacoes?.[index];
    const tamanhosAtuais = getTamanhosPersonalizados(variacao);
    const jaExiste = tamanhosAtuais.some((tamanho) => tamanho.toLowerCase() === valor.toLowerCase());
    if (jaExiste) return;

    const novosTamanhos = [...tamanhosAtuais, valor];
    updateVariacao(index, 'tamanhos_personalizados', novosTamanhos);
    updateVariacao(index, 'tamanho', novosTamanhos.join(', '));

    setNovoTamanhoPersonalizado((prev) => ({
      ...prev,
      [index]: '',
    }));
  };

  const removerTamanhoPersonalizado = (index, tamanhoRemover) => {
    const variacao = currentProduto.variacoes?.[index];
    const tamanhosAtuais = getTamanhosPersonalizados(variacao);
    const novosTamanhos = tamanhosAtuais.filter((tamanho) => tamanho !== tamanhoRemover);
    updateVariacao(index, 'tamanhos_personalizados', novosTamanhos);
    updateVariacao(index, 'tamanho', novosTamanhos.join(', '));
  };
  // Função para obter a URL completa da imagem
  const getImageUrl = (path) => {
    if (!path) return null;
    
    // Se já for uma URL completa ou um data:image, retornar como está
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
      return path;
    }
    
    // Para compatibilidade com dados antigos que possam ter apenas o caminho relativo
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    
    // Se o caminho já começar com /storage, não adicionar novamente
    if (path.startsWith('/storage')) {
      return `${apiBaseUrl}${path}`;
    }
    
    return `${apiBaseUrl}/storage/${path}`;
  };

  // Funções para edição em massa
  const aplicarPrecoEmMassa = () => {
    if (!bulkPreco || isNaN(parseFloat(bulkPreco))) return;
    
    const novoPreco = parseFloat(bulkPreco);
    currentProduto.variacoes.forEach((_, index) => {
      updateVariacao(index, 'preco_var', novoPreco.toString());
    });
    setBulkPreco('');
  };

  const aplicarEstoqueEmMassa = () => {
    if (!bulkEstoque || isNaN(parseFloat(bulkEstoque))) return;
    
    const novoEstoque = parseFloat(bulkEstoque);
    currentProduto.variacoes.forEach((_, index) => {
      updateVariacao(index, 'estoque_var', novoEstoque.toString());
    });
    setBulkEstoque('');
  };

  const limparCamposBulk = () => {
    setBulkPreco('');
    setBulkEstoque('');
  };

  // Função para gerar novo código de barras para uma variação
  const gerarNovoCodigoBarras = (index) => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 6).toUpperCase();
    const codigoBarrasVariacao = `${currentProduto.codigo_produto || 'VAR'}-${timestamp}-${index}-${randomSuffix}`;
    updateVariacao(index, 'codigo_barras', codigoBarrasVariacao);
  };

  // Funções para gerenciar tabela de preços da variação
  const handleAddFaixaVariacao = (variacaoIndex) => {
    setModalTabelaPrecos({ isOpen: true, variacaoIndex, itemEditando: null });
  };

  const handleEditFaixaVariacao = (variacaoIndex, faixaIndex) => {
    const variacao = currentProduto.variacoes[variacaoIndex];
    const tabelaPrecos = variacao.tabela_precos || [];
    setModalTabelaPrecos({ isOpen: true, variacaoIndex, itemEditando: { ...tabelaPrecos[faixaIndex], _index: faixaIndex } });
  };

  const handleSaveModalVariacao = (dados) => {
    const { variacaoIndex, itemEditando } = modalTabelaPrecos;
    const variacao = currentProduto.variacoes[variacaoIndex];
    let novaTabela = [...(variacao.tabela_precos || [])];
    
    const { _index, index, ...dadosLimpos } = dados;
    const indiceEdicao = itemEditando?._index ?? itemEditando?.index;
    
    if (indiceEdicao !== undefined && indiceEdicao !== null) {
      novaTabela[indiceEdicao] = dadosLimpos;
    } else {
      novaTabela.push(dadosLimpos);
    }
    
    updateVariacao(variacaoIndex, 'tabela_precos', novaTabela);
    setModalTabelaPrecos({ isOpen: false, variacaoIndex: null, itemEditando: null });
  };

  const handleRemoveFaixaVariacao = (variacaoIndex, faixaIndex) => {
    const variacao = currentProduto.variacoes[variacaoIndex];
    const novaTabela = (variacao.tabela_precos || []).filter((_, i) => i !== faixaIndex);
    updateVariacao(variacaoIndex, 'tabela_precos', novaTabela);
  };

  // Função para renderizar campos de precificação específicos da variação
  const renderCamposPrecificacaoVariacao = (variacao, index) => {
    // Sempre usar 'unidade' como padrão se não estiver definido
    const tipoPrecificacao = variacao.tipo_precificacao || 'unidade';
    const tabelaPrecos = Array.isArray(variacao.tabela_precos) ? variacao.tabela_precos : [];

    switch (tipoPrecificacao) {
      case 'unidade':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`var-preco-custo-${index}`}>Preço de Custo (R$)</Label>
              <Input
                id={`var-preco-custo-${index}`}
                type="number"
                step="0.01"
                value={variacao.preco_custo_var || ''}
                onChange={(e) => updateVariacao(index, 'preco_custo_var', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor={`var-preco-venda-${index}`}>Preço de Venda (R$)</Label>
              <Input
                id={`var-preco-venda-${index}`}
                type="number"
                step="0.01"
                value={variacao.preco_venda_var || variacao.preco_var || ''}
                onChange={(e) => {
                  updateVariacao(index, 'preco_venda_var', e.target.value);
                  updateVariacao(index, 'preco_var', e.target.value);
                }}
                placeholder="0.00"
              />
            </div>
          </div>
        );

      case 'm2_cm2':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`var-preco-custo-m2-${index}`}>Preço de Custo por m² (R$)</Label>
              <Input
                id={`var-preco-custo-m2-${index}`}
                type="number"
                step="0.01"
                value={variacao.preco_custo_var || ''}
                onChange={(e) => updateVariacao(index, 'preco_custo_var', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor={`var-preco-m2-${index}`}>Preço de Venda por m² (R$)</Label>
              <Input
                id={`var-preco-m2-${index}`}
                type="number"
                step="0.01"
                value={variacao.preco_m2_var || ''}
                onChange={(e) => updateVariacao(index, 'preco_m2_var', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        );

      case 'metro_linear':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`var-preco-custo-metro-${index}`}>Preço de Custo por Metro (R$)</Label>
              <Input
                id={`var-preco-custo-metro-${index}`}
                type="number"
                step="0.01"
                value={variacao.preco_custo_var || ''}
                onChange={(e) => updateVariacao(index, 'preco_custo_var', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor={`var-preco-metro-${index}`}>Preço de Venda por Metro (R$)</Label>
              <Input
                id={`var-preco-metro-${index}`}
                type="number"
                step="0.01"
                value={variacao.preco_metro_linear_var || ''}
                onChange={(e) => updateVariacao(index, 'preco_metro_linear_var', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        );

      case 'quantidade_definida':
      case 'm2_cm2_tabelado':
      case 'faixa_quantidade':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Tabela de Preços</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddFaixaVariacao(index)}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Plus size={16} className="mr-1" /> Adicionar
              </Button>
            </div>
            {tabelaPrecos.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhuma entrada na tabela. Clique em "Adicionar" para começar.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {tabelaPrecos.map((faixa, faixaIndex) => (
                  <div key={faixaIndex} className="flex items-center justify-between p-2 bg-muted rounded-md text-xs">
                    <div className="flex-1">
                      {tipoPrecificacao === 'quantidade_definida' && (
                        <span className="font-medium">{faixa.quantidade || '-'} unid.</span>
                      )}
                      {tipoPrecificacao === 'm2_cm2_tabelado' && (
                        <span className="font-medium">{faixa.area_min || '0'} - {faixa.area_max || '0'} m²</span>
                      )}
                      {tipoPrecificacao === 'faixa_quantidade' && (
                        <span className="font-medium">{faixa.quantidade_min || '1'} - {faixa.quantidade_max || '∞'}</span>
                      )}
                      <span className="ml-2 text-muted-foreground">
                        R$ {parseFloat(faixa.valor_cliente_final || faixa.preco || 0).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditFaixaVariacao(index, faixaIndex)}
                        className="h-6 w-6 text-blue-500"
                        title="Editar"
                      >
                        <Edit size={12} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFaixaVariacao(index, faixaIndex)}
                        className="h-6 w-6 text-red-500"
                        title="Excluir"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Variações do Produto</CardTitle>
            <CardDescription>Configure cores, tamanhos e outras variações com estoque e preço individual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
                <Checkbox id="variacoes_ativa" name="variacoes_ativa" checked={currentProduto.variacoes_ativa} onCheckedChange={(checked) => handleInputChange({ target: { name: 'variacoes_ativa', checked, type: 'checkbox' }})}/>
                <Label htmlFor="variacoes_ativa">Ativar Variações para este Produto?</Label>
            </div>

            {currentProduto.variacoes_ativa && (
                <div className="space-y-3 pt-3 border-t max-h-80 overflow-y-auto">
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2 rounded-md border p-3 bg-muted/20">
                            <Checkbox
                                id="variacao_obrigatoria"
                                name="variacao_obrigatoria"
                                checked={currentProduto.variacao_obrigatoria !== false}
                                onCheckedChange={(checked) =>
                                    handleInputChange({
                                        target: {
                                            name: 'variacao_obrigatoria',
                                            checked: Boolean(checked),
                                            type: 'checkbox'
                                        }
                                    })
                                }
                            />
                            <div className="space-y-0.5">
                                <Label htmlFor="variacao_obrigatoria">Seleção de variação obrigatória</Label>
                                <p className="text-xs text-muted-foreground">
                                    Quando marcado, o vendedor/cliente precisa escolher uma variação antes de adicionar ao carrinho.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 rounded-md border p-3 bg-muted/20">
                            <Checkbox
                                id="variacoes_usa_preco_base"
                                name="variacoes_usa_preco_base"
                                checked={currentProduto.variacoes_usa_preco_base !== false}
                                onCheckedChange={(checked) => {
                                    handleInputChange({
                                        target: {
                                            name: 'variacoes_usa_preco_base',
                                            checked: Boolean(checked),
                                            type: 'checkbox'
                                        }
                                    });
                                    // Se marcar para usar preço base, limpar preços específicos das variações
                                    if (checked && currentProduto.variacoes) {
                                        currentProduto.variacoes.forEach((_, index) => {
                                            updateVariacao(index, 'preco_var', '0');
                                        });
                                    }
                                }}
                            />
                            <div className="space-y-0.5">
                                <Label htmlFor="variacoes_usa_preco_base">Variações usam o mesmo preço do produto</Label>
                                <p className="text-xs text-muted-foreground">
                                    Quando marcado, todas as variações usarão o preço base do produto. Desmarque para definir preços específicos por variação.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Upload em massa para criar variações a partir de imagens */}
                    <div className="p-3 border rounded-md bg-muted/30">
                        <Label className="text-sm mb-2 block">Adicionar várias variações por imagens</Label>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline">
                                <label htmlFor="variacoes-bulk-upload" className="cursor-pointer">
                                    <Upload size={16} className="mr-2" /> Selecionar Imagens
                                    <input id="variacoes-bulk-upload" type="file" className="sr-only" accept="image/*" multiple onChange={handleVariacoesBulkUpload} />
                                </label>
                            </Button>
                            <span className="text-xs text-muted-foreground">Cada imagem vira uma variação com o nome do arquivo.</span>
                        </div>
                    </div>

                    {/* Controles de Edição em Massa */}
                    {currentProduto.variacoes && currentProduto.variacoes.length > 1 && (
                        <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-950/20">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Settings size={16} className="text-blue-600" />
                                    <h4 className="font-medium text-sm text-blue-800 dark:text-blue-200">
                                        Edição em Massa ({currentProduto.variacoes.length} variações)
                                    </h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => setShowBulkEdit(!showBulkEdit)}
                                        className="text-blue-600 hover:text-blue-700"
                                    >
                                        {showBulkEdit ? 'Ocultar' : 'Mostrar'}
                                    </Button>
                                    {showBulkEdit && (
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={limparCamposBulk}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <X size={14} />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            
                            {showBulkEdit && (
                                <div className="space-y-3">
                                    <Separator />
                                    
                                    {/* Definir Preço e Estoque lado a lado */}
                                    {!currentProduto.variacoes_usa_preco_base && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                                    Definir Preço para Todas (R$)
                                                </Label>
                                                <div className="flex gap-2 mt-1">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={bulkPreco}
                                                        onChange={(e) => setBulkPreco(e.target.value)}
                                                        placeholder="0.00"
                                                        className="text-sm"
                                                    />
                                                    <Button 
                                                        type="button" 
                                                        size="sm"
                                                        onClick={aplicarPrecoEmMassa}
                                                        disabled={!bulkPreco || isNaN(parseFloat(bulkPreco))}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    >
                                                        Aplicar
                                                    </Button>
                                                </div>
                                            </div>
                                        
                                        <div>
                                            <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                                Definir Estoque para Todas
                                            </Label>
                                            <div className="flex gap-2 mt-1">
                                                <Input
                                                    type="number"
                                                    value={bulkEstoque}
                                                    onChange={(e) => setBulkEstoque(e.target.value)}
                                                    placeholder="0"
                                                    className="text-sm"
                                                />
                                                <Button 
                                                    type="button" 
                                                    size="sm"
                                                    onClick={aplicarEstoqueEmMassa}
                                                    disabled={!bulkEstoque || isNaN(parseFloat(bulkEstoque))}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                    Aplicar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Botão para gerar códigos de barras para todas as variações que não têm */}
                    {currentProduto.variacoes && currentProduto.variacoes.length > 0 && (
                        <div className="mb-3">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                    currentProduto.variacoes.forEach((variacao, index) => {
                                        if (!variacao.codigo_barras) {
                                            gerarNovoCodigoBarras(index);
                                        }
                                    });
                                }}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                                <RefreshCw size={14} className="mr-2" />
                                Gerar códigos faltantes
                            </Button>
                        </div>
                    )}
                    
                    {currentProduto.variacoes?.map((variacao, index) => (
                        <motion.div 
                            key={variacao.id} 
                            className="p-3 border rounded-md space-y-3 bg-muted/50"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    {variacao.imagem_url ? (
                                        <img 
                                            src={variacao.imagem_url_preview || getImageUrl(variacao.imagem_url)} 
                                            alt="Variação" 
                                            className="h-10 w-10 object-cover rounded-sm"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 bg-gray-200 rounded-sm flex items-center justify-center">
                                            <ImagePlus size={20} className="text-gray-400"/>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <Label htmlFor={`var-nome-${index}`} className="text-sm text-muted-foreground">Nome da Variação</Label>
                                        <Input 
                                            id={`var-nome-${index}`}
                                            type="text"
                                            value={variacao.nome || ''}
                                            onChange={(e) => updateVariacao(index, 'nome', e.target.value)}
                                            placeholder={`Variação ${index + 1}`}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeVariacao(index)} className="text-destructive">
                                    <Trash2 size={16}/>
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                    <Label htmlFor={`var-cor-${index}`}>Cor (opcional)</Label>
                                    <Select value={variacao.cor} onValueChange={(value) => updateVariacao(index, 'cor', value)}>
                                        <SelectTrigger id={`var-cor-${index}`}><SelectValue placeholder="Cor"/></SelectTrigger>
                                        <SelectContent>
                                            {productColors.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor={`var-tamanho-${index}`}>Tamanho (opcional)</Label>
                                    <Select
                                        value={variacao.tamanho_tipo || SIZE_MODE_DEFAULT}
                                        onValueChange={(value) => {
                                            updateVariacao(index, 'tamanho_tipo', value);
                                            if (value === SIZE_MODE_DEFAULT) {
                                                updateVariacao(index, 'tamanhos_personalizados', []);
                                                updateVariacao(index, 'tamanho', '');
                                            } else {
                                                const tamanhosPersonalizados = getTamanhosPersonalizados(variacao);
                                                updateVariacao(index, 'tamanho', tamanhosPersonalizados.join(', '));
                                            }
                                        }}
                                    >
                                        <SelectTrigger id={`var-tamanho-${index}`}>
                                            <SelectValue placeholder="Tipo de tamanho" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sizeModeOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {(variacao.tamanho_tipo || SIZE_MODE_DEFAULT) === SIZE_MODE_DEFAULT && (
                                    <div>
                                        <Label htmlFor={`var-tamanho-padrao-${index}`}>Tamanho da Tabela</Label>
                                        <Select value={variacao.tamanho} onValueChange={(value) => updateVariacao(index, 'tamanho', value)}>
                                            <SelectTrigger id={`var-tamanho-padrao-${index}`}><SelectValue placeholder="Selecione o tamanho" /></SelectTrigger>
                                            <SelectContent>
                                                {productSizes.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            {(variacao.tamanho_tipo || SIZE_MODE_DEFAULT) === SIZE_MODE_CUSTOM && (
                                <div className="space-y-2">
                                    <Label htmlFor={`var-tamanho-custom-input-${index}`}>Tamanhos Personalizados</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id={`var-tamanho-custom-input-${index}`}
                                            type="text"
                                            value={novoTamanhoPersonalizado[index] || ''}
                                            onChange={(e) => setNovoTamanhoPersonalizado((prev) => ({ ...prev, [index]: e.target.value }))}
                                            placeholder="Ex.: 38, G1, 2XL, Sob medida"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    adicionarTamanhoPersonalizado(index);
                                                }
                                            }}
                                        />
                                        <Button type="button" variant="outline" onClick={() => adicionarTamanhoPersonalizado(index)}>
                                            Adicionar
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {getTamanhosPersonalizados(variacao).map((tamanhoCustom) => (
                                            <Button
                                                key={`${variacao.id}-${tamanhoCustom}`}
                                                type="button"
                                                variant="secondary"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => removerTamanhoPersonalizado(index, tamanhoCustom)}
                                            >
                                                {tamanhoCustom} <X size={12} className="ml-1" />
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                                <div className="lg:col-span-2">
                                    <Label htmlFor={`var-codigo-barras-${index}`}>Código de Barras</Label>
                                    <div className="flex gap-1">
                                        <Input 
                                            id={`var-codigo-barras-${index}`} 
                                            type="text" 
                                            value={variacao.codigo_barras || ''} 
                                            onChange={(e) => updateVariacao(index, 'codigo_barras', e.target.value)} 
                                            placeholder="Código único da variação"
                                            className="font-mono text-xs flex-1"
                                        />
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="icon"
                                            onClick={() => gerarNovoCodigoBarras(index)}
                                            title="Gerar novo código"
                                            className="h-8 w-8"
                                        >
                                            <RefreshCw size={14} />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-end">
                                    <Label htmlFor={`var-img-${index}`} className="text-transparent select-none">.</Label>
                                    <Button asChild variant="outline">
                                        <label htmlFor={`var-img-upload-${index}`}>
                                            <Upload size={16} className="mr-2"/> Imagem
                                            <input id={`var-img-upload-${index}`} type="file" className="sr-only" onChange={(e) => handleVariacaoImageUpload(e, index)} accept="image/*" />
                                        </label>
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                <div>
                                    <Label htmlFor={`var-estoque_var-${index}`}>Estoque (opcional)</Label>
                                    <Input id={`var-estoque_var-${index}`} type="number" value={variacao.estoque_var} onChange={(e) => updateVariacao(index, 'estoque_var', e.target.value)} placeholder="0"/>
                                </div>
                                {/* Mostrar campos de preço simples apenas se não tiver tipo de precificação definido */}
                                {!variacao.tipo_precificacao && !currentProduto.variacoes_usa_preco_base && (
                                    <div>
                                        <Label htmlFor={`var-preco_var-${index}`}>Preço Específico (R$)</Label>
                                        <Input 
                                            id={`var-preco_var-${index}`} 
                                            type="number" 
                                            step="0.01" 
                                            value={variacao.preco_var || ''} 
                                            onChange={(e) => updateVariacao(index, 'preco_var', e.target.value)} 
                                            placeholder="0.00"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Deixe vazio ou 0 para usar o preço base do produto
                                        </p>
                                    </div>
                                )}
                                {!variacao.tipo_precificacao && currentProduto.variacoes_usa_preco_base && (
                                    <div>
                                        <Label htmlFor={`var-preco_var-${index}`}>Preço (R$)</Label>
                                        <Input 
                                            id={`var-preco_var-${index}`} 
                                            type="text" 
                                            value={`Usa preço base: R$ ${parseFloat(currentProduto.preco_venda || 0).toFixed(2).replace('.', ',')}`} 
                                            disabled
                                            className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Usando o preço base do produto
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Campo de Tipo de Precificação */}
                            <Separator className="my-3" />
                            <div className="space-y-3">
                                <div>
                                    <Label htmlFor={`var-tipo-precificacao-${index}`} className="text-sm font-semibold">Tipo de Precificação</Label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Escolha como o preço desta variação será calculado
                                    </p>
                                    <Select
                                        value={variacao.tipo_precificacao || 'unidade'}
                                        onValueChange={(value) => {
                                            updateVariacao(index, 'tipo_precificacao', value);
                                            // Limpar tabela de preços ao mudar o tipo (exceto se voltar para unidade)
                                            if (value && value !== 'unidade') {
                                                updateVariacao(index, 'tabela_precos', []);
                                            }
                                        }}
                                    >
                                        <SelectTrigger id={`var-tipo-precificacao-${index}`}>
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TIPOS_PRECIFICACAO.map((tipo) => (
                                                <SelectItem key={tipo.value} value={tipo.value}>
                                                    {tipo.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md mt-2">
                                        <Info size={14} className="mt-0.5 flex-shrink-0" />
                                        <p>{TIPOS_PRECIFICACAO.find(t => t.value === (variacao.tipo_precificacao || 'unidade'))?.descricao}</p>
                                    </div>
                                </div>

                                {/* Campos dinâmicos baseados no tipo de precificação - sempre visível com padrão 'unidade' */}
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900/50">
                                    {renderCamposPrecificacaoVariacao(variacao, index)}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    <Button type="button" variant="outline" onClick={addVariacao} className="w-full mb-4">
                        <PlusCircle size={16} className="mr-2"/> Adicionar Variação
                    </Button>
                </div>
            )}

            {/* Modal para gerenciar tabela de preços da variação */}
            {modalTabelaPrecos.isOpen && modalTabelaPrecos.variacaoIndex !== null && (
                <AdicionarQuantidadeValorModal
                    isOpen={modalTabelaPrecos.isOpen}
                    onClose={() => setModalTabelaPrecos({ isOpen: false, variacaoIndex: null, itemEditando: null })}
                    onSave={handleSaveModalVariacao}
                    tipoPrecificacao={currentProduto.variacoes[modalTabelaPrecos.variacaoIndex]?.tipo_precificacao || 'unidade'}
                    itemExistente={modalTabelaPrecos.itemEditando}
                />
            )}
        </CardContent>
    </Card>
  );
};

export default ProdutoTabVariacoes;